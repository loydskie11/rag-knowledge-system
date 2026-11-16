from permissions import (is_governance_evidence, document_scope, can_read_document, can_manage_document, accessible_programs, PROGRAM_COLLEGES, ROLES, ASSIGNMENT_TYPES, ASSIGNMENT_SCOPE_TYPES, assignments_of, assigned_offices, role_of, is_system_admin, is_reviewer, require_system_admin, require_reviewer, require_campus_reviewer, require_office, require_program, can_access_program, filter_office_records, filter_survey_records, can_access_office, office_key, permissions_for)
import base64
import urllib.request
from urllib.parse import unquote, urlparse

import os
import io
import json
import csv
import zipfile
import hashlib
import math
import secrets
import time
import uuid
from datetime import date, datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

# Third-party imports
from dotenv import load_dotenv
from fastapi import FastAPI, Depends, HTTPException, status, File, UploadFile, Form, Body, Request, Response, Query, BackgroundTasks, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
from sqlalchemy.orm import Session
from sqlalchemy import text, or_, func
from sqlalchemy.exc import IntegrityError
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from openai import OpenAI
from groq import Groq
from supabase import create_client, Client
import PyPDF2
import groq
import time
import re
from rate_limiter import limiter
from sanitizer import sanitize_user_input, check_prompt_injection
from rag_evaluation import evidence_support
import traceback
import asyncio
import logging
import contextvars
from concurrent.futures import ThreadPoolExecutor
import numpy as np
from PIL import Image as PILImage

# Dedicated thread pool for CPU-bound OCR and embedding tasks
# This prevents PaddleOCR from saturating the FastAPI event loop / default threadpool
_bg_executor = ThreadPoolExecutor(max_workers=2, thread_name_prefix="doc_worker")
_request_id = contextvars.ContextVar("request_id", default="-")
_processing_status = {}
_log = logging.getLogger("rag_governance")

def utc_now() -> datetime:
    """Return a naive UTC datetime for compatibility with existing DB columns."""
    return datetime.now(timezone.utc).replace(tzinfo=None)

MAX_UPLOAD_BYTES = 50 * 1024 * 1024
ALLOWED_UPLOAD_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg", ".txt", ".docx", ".html", ".htm"}
STUDENT_HIDDEN_CATEGORIES = {
    "form / template",
    "forms / templates",
    "branding asset",
    "branding assets",
}
PRIVATE_FILE_URL_TTL_SECONDS = 15 * 60

def is_student_hidden_category(category: str | None) -> bool:
    return (category or "").strip().lower() in STUDENT_HIDDEN_CATEGORIES


def create_private_file_url(path: str, expires_in: int = PRIVATE_FILE_URL_TTL_SECONDS) -> str:
    """Return a short-lived URL for the private documents bucket."""
    storage_path = get_private_storage_path(path)
    if not supabase or not storage_path:
        return ""
    result = supabase.storage.from_("documents").create_signed_url(storage_path, expires_in)
    if isinstance(result, dict):
        return result.get("signedURL") or result.get("signedUrl") or result.get("signed_url") or ""
    return (
        getattr(result, "signed_url", None)
        or getattr(result, "signedURL", None)
        or getattr(result, "signedUrl", None)
        or ""
    )

def get_private_storage_path(value: str | None) -> str:
    """Extract a documents-bucket object path from a stored path or Supabase URL."""
    if not value:
        return ""

    parsed = urlparse(value)
    if not parsed.scheme:
        candidate = unquote(value).split("?", 1)[0].lstrip("/")
        if not candidate or any(part == ".." for part in candidate.split("/")):
            return ""
        return candidate

    decoded_path = unquote(parsed.path)
    for marker in (
        "/storage/v1/object/sign/documents/",
        "/storage/v1/object/public/documents/",
        "/storage/v1/object/authenticated/documents/",
    ):
        if marker in decoded_path:
            candidate = decoded_path.split(marker, 1)[1].lstrip("/")
            if any(part == ".." for part in candidate.split("/")):
                return ""
            return candidate
    return ""


def get_fresh_private_file_url(value: str | None = None, storage_path: str | None = None) -> str:
    """Resolve a stored object path or legacy Storage URL into a new signed URL."""
    path = get_private_storage_path(storage_path) or get_private_storage_path(value)
    if not path:
        # Preserve legacy/manual links that do not point at the documents bucket.
        return value or ""
    return create_private_file_url(path)


def require_private_storage_reference(value: str | None = None, storage_path: str | None = None) -> str:
    """Accept only references that resolve to this application's private bucket."""
    path = get_private_storage_path(storage_path) or get_private_storage_path(value)
    if (value or storage_path) and not path:
        raise HTTPException(status_code=400, detail="Invalid private file reference.")
    return path


def serialize_paper_trail_record(record) -> dict:
    data = schemas.PaperTrailRecordResponse.model_validate(record).model_dump()
    data["file_url"] = get_fresh_private_file_url(
        getattr(record, "file_url", None),
        getattr(record, "storage_path", None),
    ) or None
    return data


def serialize_iso_requirement(requirement) -> dict:
    data = schemas.ISORequirementResponse.model_validate(requirement).model_dump()
    by_id = {str(item.id): item for item in getattr(requirement, "evidences", [])}
    for evidence in data.get("evidences", []):
        source = by_id.get(str(evidence.get("id")))
        if source:
            evidence["file_url"] = get_fresh_private_file_url(
                getattr(source, "file_url", None),
                getattr(source, "storage_path", None),
            )
    return data


def serialize_qms_action_plan(plan) -> dict:
    data = schemas.QMSActionPlanResponse.model_validate(plan).model_dump()
    by_id = {str(item.id): item for item in getattr(plan, "evidences", [])}
    for evidence in data.get("evidences", []) or []:
        source = by_id.get(str(evidence.get("id")))
        if source:
            evidence["file_url"] = get_fresh_private_file_url(
                getattr(source, "file_url", None),
                getattr(source, "storage_path", None),
            )
    return data


def serialize_program_accreditation(accreditation) -> dict:
    data = schemas.ProgramAccreditationResponse.model_validate(accreditation).model_dump()
    by_id = {str(item.id): item for item in getattr(accreditation, "history", [])}
    for history in data.get("history", []):
        source = by_id.get(str(history.get("id")))
        if source:
            history["certificate_url"] = get_fresh_private_file_url(
                getattr(source, "certificate_url", None),
                getattr(source, "certificate_storage_path", None),
            ) or None
    return data


def parse_accreditation_date(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Date must use YYYY-MM-DD format.") from exc


def get_active_accreditation_cycle(db: Session, program_id) -> Optional["models.AccreditationCycle"]:
    return (
        db.query(models.AccreditationCycle)
        .filter(
            models.AccreditationCycle.program_id == program_id,
            models.AccreditationCycle.status == "ACTIVE",
        )
        .first()
    )


def create_accreditation_cycle(
    db: Session,
    accreditation: "models.ProgramAccreditation",
    level_name: str,
    actor_email: str,
    source: str,
    valid_until: Optional[datetime] = None,
    label_prefix: Optional[str] = None,
) -> "models.AccreditationCycle":
    next_attempt = (
        db.query(func.coalesce(func.max(models.AccreditationCycle.attempt_number), 0))
        .filter(
            models.AccreditationCycle.program_id == accreditation.id,
            models.AccreditationCycle.level_name == level_name,
        )
        .scalar()
        + 1
    )
    prefix = label_prefix or ("Current Cycle" if source == "LEVEL_TRANSITION" else "Administrative Baseline")
    cycle = models.AccreditationCycle(
        program_id=accreditation.id,
        level_name=level_name,
        attempt_number=next_attempt,
        cycle_label=f"{prefix} - {level_name} (Attempt {next_attempt})",
        status="ACTIVE",
        source=source,
        opened_at=utc_now(),
        valid_until=valid_until,
        created_by=actor_email,
    )
    db.add(cycle)
    db.flush()
    return cycle


def ensure_active_accreditation_cycle(
    db: Session,
    accreditation: "models.ProgramAccreditation",
    actor_email: str,
) -> "models.AccreditationCycle":
    active_cycle = get_active_accreditation_cycle(db, accreditation.id)
    if active_cycle:
        return active_cycle
    return create_accreditation_cycle(
        db,
        accreditation,
        accreditation.current_level or "Candidate Status",
        actor_email,
        "ADMINISTRATIVE_BASELINE",
        accreditation.valid_until,
        "Current Baseline",
    )


def close_accreditation_cycle(cycle: "models.AccreditationCycle", actor_email: str) -> None:
    cycle.status = "CLOSED"
    cycle.closed_at = utc_now()
    cycle.closed_by = actor_email
    cycle.updated_at = utc_now()


def serialize_iso_audit_result(result) -> dict:
    cycle = getattr(result, "cycle", None)
    return {
        "id": result.id,
        "cycle_id": result.cycle_id,
        "cycle_name": getattr(cycle, "name", ""),
        "standard_version": getattr(cycle, "standard_version", "ISO 9001:2015"),
        "result_type": result.result_type,
        "audit_start_date": result.audit_start_date,
        "audit_end_date": result.audit_end_date,
        "auditor_or_certification_body": result.auditor_or_certification_body,
        "conclusion": result.conclusion,
        "certification_status": result.certification_status,
        "major_nonconformities": result.major_nonconformities,
        "minor_nonconformities": result.minor_nonconformities,
        "observations": result.observations,
        "opportunities_for_improvement": result.opportunities_for_improvement,
        "summary": result.summary,
        "report_url": get_fresh_private_file_url(storage_path=result.report_storage_path) or None,
        "report_original_filename": result.report_original_filename,
        "certificate_url": get_fresh_private_file_url(storage_path=result.certificate_storage_path) or None,
        "certificate_original_filename": result.certificate_original_filename,
        "record_status": result.record_status,
        "created_by": result.created_by,
        "finalized_by": result.finalized_by,
        "finalized_at": result.finalized_at,
        "created_at": result.created_at,
        "updated_at": result.updated_at,
    }

def get_original_ched_file_name(evidence) -> str:
    """Return the original upload name, including for records created before file_name existed."""
    if getattr(evidence, "file_name", None):
        return os.path.basename(evidence.file_name)

    storage_path = getattr(evidence, "storage_path", None) or get_private_storage_path(evidence.file_url)
    stored_name = os.path.basename(storage_path)
    return re.sub(r"^ched_\d+_", "", stored_name) or evidence.document_name

def get_fresh_ched_file_url(evidence) -> str:
    """Refresh a CHED evidence URL without making the requirement list fail on legacy data."""
    storage_path = getattr(evidence, "storage_path", None) or get_private_storage_path(evidence.file_url)
    if not storage_path:
        return evidence.file_url
    try:
        return create_private_file_url(storage_path)
    except Exception:
        return ""

async def read_upload_limited(file: UploadFile) -> bytes:
    """Read an upload with a hard size limit and basic content-signature validation."""
    filename = (file.filename or "").lower()
    extension = os.path.splitext(filename)[1]
    if extension not in ALLOWED_UPLOAD_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Unsupported file format.")

    contents = await file.read(MAX_UPLOAD_BYTES + 1)
    if len(contents) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="Uploaded file exceeds the 50 MiB limit.")

    valid_signature = (
        (extension == ".pdf" and contents.startswith(b"%PDF-"))
        or (extension == ".png" and contents.startswith(b"\x89PNG\r\n\x1a\n"))
        or (extension in {".jpg", ".jpeg"} and contents.startswith(b"\xff\xd8\xff"))
        or (extension == ".docx" and contents.startswith(b"PK\x03\x04"))
        or (extension in {".txt", ".html", ".htm"} and bool(contents))
    )
    if not valid_signature:
        raise HTTPException(status_code=400, detail="File content does not match its extension.")
    return contents


def normalize_document_identity(value: str | None) -> str:
    """Normalize user-facing names for deterministic duplicate comparisons."""
    return re.sub(r"\s+", " ", (value or "").strip()).casefold()


def normalize_scope_identity(value: str | None) -> str:
    return re.sub(r"[^a-z0-9]", "", str(value or "").casefold())


def document_scope_key(
    office: str | None,
    program: str | None,
    scope_type: str | None = None,
    scope_code: str | None = None,
) -> str:
    explicit_type = str(scope_type or "").strip().upper()
    explicit_code = str(scope_code or "").strip()
    if explicit_type == "CAMPUS":
        return "campus|argao"
    if explicit_type in {"OFFICE", "PROGRAM"} and explicit_code:
        return f"{explicit_type.casefold()}|{normalize_scope_identity(explicit_code)}"
    return f"{normalize_document_identity(office)}|{normalize_document_identity(program or 'GLOBAL')}"


def resolve_repository_scope(scope_type: str, scope_code: str | None) -> tuple[str, str, str, str]:
    """Canonicalize scope fields and their legacy office/program projections."""
    resolved_type = str(scope_type or "").strip().upper()
    resolved_code = str(scope_code or "").strip()
    if resolved_type == "CAMPUS":
        return "CAMPUS", "ARGAO", "Campus-wide", "GLOBAL"
    if resolved_type == "OFFICE" and resolved_code:
        return "OFFICE", resolved_code, resolved_code, "GLOBAL"
    if resolved_type == "PROGRAM" and resolved_code in PROGRAM_COLLEGES:
        return "PROGRAM", resolved_code, PROGRAM_COLLEGES[resolved_code], resolved_code
    raise HTTPException(400, "Select a valid campus, office, or academic program scope.")


def require_general_repository_category(category: str) -> None:
    if normalize_document_identity(category) == "accreditation evidence":
        raise HTTPException(
            400,
            "Upload AACCUP evidence through Accreditation Support so its program, area, and requirement are recorded.",
        )


def authorize_repository_scope(db: Session, user, scope_type: str, scope_code: str | None) -> tuple[str, str, str, str]:
    resolved_type, resolved_code, office, program = resolve_repository_scope(scope_type, scope_code)
    if resolved_type == "OFFICE":
        exists = db.query(models.OrganizationalUnit).filter(
            models.OrganizationalUnit.unit_type == "OFFICE",
            models.OrganizationalUnit.is_active.is_(True),
            models.OrganizationalUnit.name == resolved_code,
        ).first()
        if not exists:
            raise HTTPException(400, "The selected office is not an active campus office.")
    elif resolved_type == "PROGRAM":
        exists = db.query(models.AcademicProgram).filter(
            models.AcademicProgram.code == resolved_code,
            models.AcademicProgram.is_active.is_(True),
        ).first()
        if not exists:
            raise HTTPException(400, "The selected academic program is not active.")

    metadata = {"scope_type": resolved_type, "scope_code": resolved_code, "office": office, "program": program}
    if not can_manage_document(user, metadata):
        raise HTTPException(403, "You can only manage documents in your assigned campus, office, or academic program scope.")
    return resolved_type, resolved_code, office, program


def _safe_duplicate_record(row: dict | None) -> dict | None:
    if not row:
        return None
    return {
        "id": row.get("id"),
        "document_name": row.get("document_name"),
        "original_filename": row.get("original_filename"),
        "office": row.get("office"),
        "program": row.get("program") or "GLOBAL",
        "scope_type": row.get("scope_type"),
        "scope_code": row.get("scope_code"),
        "version": row.get("version"),
        "status": row.get("status"),
        "created_at": row.get("created_at"),
    }


def classify_document_duplicate(
    file_sha256: str,
    document_name: str,
    office: str,
    program: str,
    upload_mode: str = "NEW_DOCUMENT",
    scope_type: str | None = None,
    scope_code: str | None = None,
) -> dict:
    """Classify a file without exposing Storage paths or uploader identities."""
    scope_key = document_scope_key(office, program, scope_type, scope_code)
    hash_rows = (
        supabase.table("document_uploads")
        .select("id, document_name, original_filename, office, program, scope_type, scope_code, version, status, scope_key, created_at")
        .eq("file_sha256", file_sha256)
        .neq("status", "FAILED")
        .order("created_at", desc=True)
        .execute()
    ).data or []

    same_scope_hash = next((row for row in hash_rows if row.get("scope_key") == scope_key), None)
    if same_scope_hash:
        return {
            "code": "EXACT_DUPLICATE",
            "message": "This exact file has already been uploaded in the selected repository scope.",
            "existing_document": _safe_duplicate_record(same_scope_hash),
        }

    if upload_mode == "NEW_DOCUMENT":
        name_rows = (
            supabase.table("document_uploads")
            .select("id, document_name, original_filename, office, program, scope_type, scope_code, version, status, scope_key, created_at")
            .eq("normalized_name", normalize_document_identity(document_name))
            .eq("scope_key", scope_key)
            .neq("status", "FAILED")
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        ).data or []
        if name_rows:
            return {
                "code": "POSSIBLE_NEW_VERSION",
                "message": "A document with this name already exists in the selected scope, but the file contents are different.",
                "existing_document": _safe_duplicate_record(name_rows[0]),
            }

    if hash_rows:
        return {
            "code": "CROSS_SCOPE_DUPLICATE",
            "message": "This exact file already exists in another office or academic scope.",
            "existing_document": _safe_duplicate_record(hash_rows[0]),
        }

    return {"code": "NEW_DOCUMENT", "message": "No duplicate file was found.", "existing_document": None}


def duplicate_http_exception(result: dict) -> HTTPException:
    status_code = 409 if result.get("code") != "NEW_DOCUMENT" else 400
    return HTTPException(status_code=status_code, detail=result)


def duplicate_result_for_user(result: dict, user) -> dict:
    """Do not disclose another scope's repository metadata to scoped users."""
    if (
        result.get("code") == "CROSS_SCOPE_DUPLICATE"
        and not permissions_for(user).get("governance.cross_office")
    ):
        return {**result, "existing_document": None}
    return result


def reserve_document_upload(
    *,
    file_sha256: str,
    file_size: int,
    original_filename: str,
    document_name: str,
    category: str,
    office: str,
    program: str,
    scope_type: str,
    scope_code: str,
    version: str,
    upload_mode: str,
    uploaded_by: str,
) -> str:
    """Create the race-safe registry reservation before writing to Storage."""
    scope_key = document_scope_key(office, program, scope_type, scope_code)
    payload = {
        "file_sha256": file_sha256,
        "file_size": file_size,
        "original_filename": os.path.basename(original_filename),
        "document_name": document_name.strip(),
        "normalized_name": normalize_document_identity(document_name),
        "category": category,
        "office": office,
        "program": program or "GLOBAL",
        "scope_type": scope_type,
        "scope_code": scope_code,
        "scope_key": scope_key,
        "version": version,
        "upload_mode": upload_mode,
        "status": "PROCESSING",
        "uploaded_by": uploaded_by,
    }
    try:
        response = supabase.table("document_uploads").insert(payload).execute()
        if not response.data:
            raise RuntimeError("The upload reservation was not created.")
        return str(response.data[0]["id"])
    except HTTPException:
        raise
    except Exception as exc:
        # A concurrent request may have won the unique hash/scope race.
        result = classify_document_duplicate(
            file_sha256, document_name, office, program, upload_mode, scope_type, scope_code
        )
        if result.get("code") != "NEW_DOCUMENT":
            raise duplicate_http_exception(result) from exc
        raise


def update_document_upload_registry(registry_id: str | None, status: str, **fields) -> None:
    if not registry_id:
        return
    payload = {"status": status, "updated_at": utc_now().isoformat(), **fields}
    try:
        supabase.table("document_uploads").update(payload).eq("id", registry_id).execute()
    except Exception:
        _log.exception("document_upload_registry_update_failed", extra={"registry_id": registry_id, "status": status})


def supersede_previous_document_versions(metadata: dict) -> None:
    """Supersede only the active document in the same scope after replacement succeeds."""
    if not metadata.get("supersede_previous_version"):
        return
    document_name = metadata.get("name")
    office = metadata.get("office")
    program = metadata.get("program") or "GLOBAL"
    current_job_id = metadata.get("job_id")
    rows = (
        supabase.table("document_sections")
        .select("id, metadata")
        .eq("metadata->>name", document_name)
        .execute()
    ).data or []
    for row in rows:
        row_metadata = row.get("metadata") or {}
        if row_metadata.get("job_id") == current_job_id:
            continue
        row_scope_type, row_scope_code = document_scope(row_metadata)
        current_scope_type, current_scope_code = document_scope(metadata)
        if document_scope_key(row_metadata.get("office"), row_metadata.get("program") or "GLOBAL", row_scope_type, row_scope_code) != document_scope_key(office, program, current_scope_type, current_scope_code):
            continue
        if row_metadata.get("status") != "Active":
            continue
        row_metadata["status"] = "Superseded"
        supabase.table("document_sections").update({"metadata": row_metadata}).eq("id", row["id"]).execute()

    registry_id = metadata.get("upload_registry_id")
    query = (
        supabase.table("document_uploads")
        .update({"status": "SUPERSEDED", "updated_at": utc_now().isoformat()})
        .eq("normalized_name", normalize_document_identity(document_name))
        .eq("scope_key", document_scope_key(office, program, *document_scope(metadata)))
        .eq("status", "ACTIVE")
    )
    if registry_id:
        query = query.neq("id", registry_id)
    query.execute()

# Lazy-load PaddleOCR to avoid blocking at startup
_ocr_instance = None

def get_ocr():
    global _ocr_instance
    if _ocr_instance is None:
        import logging
        logging.getLogger("ppocr").setLevel(logging.INFO)
        from paddleocr import PaddleOCR
        _ocr_instance = PaddleOCR(use_angle_cls=True, lang='en', show_log=False)
    return _ocr_instance

def run_ocr(ocr_instance, img_array):
    """Run OCR and extract text lines. Compatible with PaddleOCR 2.x."""
    extracted = ""
    result = ocr_instance.ocr(img_array, cls=True)
    if result and result[0]:
        for line in result[0]:
            if line and len(line) >= 2:
                extracted += line[1][0] + "\n"
    return extracted

# Minimum characters per page from PyPDF2 before we OCR that page.
# Pages with tables/images embedded as images usually yield < 50 chars.
OCR_FALLBACK_THRESHOLD = 50

def is_complex_ocr_garbage(text: str) -> bool:
    text_stripped = text.strip()
    if not text_stripped: return True
    letters = sum(c.isalpha() for c in text_stripped)
    total = len(text_stripped)
    if total > 0 and (letters / total) < 0.4: return True
    lines = [l.strip() for l in text_stripped.split('\n') if l.strip()]
    if len(lines) > 5:
        if (sum(len(l) < 15 for l in lines) / len(lines)) > 0.7: return True
    return False

def extract_with_vision(img_array) -> str:
    import base64
    from io import BytesIO
    from PIL import Image
    try:
        img = Image.fromarray(img_array)
        buffered = BytesIO()
        img.save(buffered, format="JPEG")
        img_str = base64.b64encode(buffered.getvalue()).decode()
        from ollama import Client
        client = Client(host='http://localhost:11434')
        response = client.chat(model="llama3.2-vision", messages=[{"role": "user", "content": "Extract the text and describe any tables or charts.", "images": [img_str]}])
        return response['message']['content']
    except Exception as e:
        return ""

def extract_pdf_text(contents: bytes) -> str:
    """
    Fast, robust PDF text extraction with PyMuPDF (fitz) and selective OCR fallback.
    Prevents long OCR delays on multi-page PDFs with mixed text/graphic pages.
    """
    import pymupdf as fitz

    extracted_text = ""
    pdf_document = fitz.open(stream=contents, filetype="pdf")

    # 1. Fast text extraction using PyMuPDF across all pages
    for page in pdf_document:
        text = page.get_text() or ""
        if text.strip():
            extracted_text += text + "\n"

    # 2. If document contains sufficient text (>100 chars), return immediately! (0.1s processing time)
    if len(extracted_text.strip()) > 100:
        pdf_document.close()
        return extracted_text

    # 3. Fallback: If entire document yields < 100 chars (scanned document), run OCR on scanned pages
    ocr_text = ""
    ocr_instance = None
    max_ocr_pages = min(len(pdf_document), 30)  # Safety cap at 30 pages for OCR scans

    for page_num in range(max_ocr_pages):
        page_text = pdf_document[page_num].get_text() or ""
        if len(page_text.strip()) < 30:
            if ocr_instance is None:
                ocr_instance = get_ocr()
            fitz_page = pdf_document.load_page(page_num)
            pix = fitz_page.get_pixmap(dpi=120)
            img_array = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, pix.n)
            if pix.n == 4:
                img_array = img_array[:, :, :3]
            page_ocr = run_ocr(ocr_instance, img_array)
            if is_complex_ocr_garbage(page_ocr):
                vision_text = extract_with_vision(img_array)
                if vision_text.strip(): page_ocr = vision_text
            ocr_text += (page_ocr if page_ocr.strip() else page_text) + "\n"
        else:
            ocr_text += page_text + "\n"

    pdf_document.close()
    return ocr_text if ocr_text.strip() else extracted_text


def clean_ocr_text_offline(raw_text: str) -> str:
    """A lightning-fast, offline heuristic cleaner for OCR artifacts."""
    if not raw_text:
        return ""

    text = raw_text
    
    # 1. Fix words broken by newlines (e.g., "tech-\nnology" -> "technology")
    text = re.sub(r'([a-zA-Z]+)-\n([a-zA-Z]+)', r'\1\2', text)
    
    # 2. Hardcoded dictionary for critical domain-specific OCR failures
    # (These are common mistakes PaddleOCR makes on stylized fonts like the VMGO PDF)
    ocr_fixes = {
        "TECHNOERBIGAN": "TECHNOLOGICAL",
        "SAMPUL": "CEBU",
        "TECIINOLOGICAL": "TECHNOLOGICAL",
        "VNIVERSITY": "UNIVERSITY",
        "UNIVERGITY": "UNIVERSITY",
        "V M G O": "VMGO"
    }
    
    for wrong, right in ocr_fixes.items():
        # Case-insensitive replacement
        pattern = re.compile(re.escape(wrong), re.IGNORECASE)
        text = pattern.sub(right, text)

    # 3. Remove non-ASCII garbage characters often generated by image noise
    text = re.sub(r'[^\x00-\x7F]+', ' ', text)
    
    # 4. Normalize excessive whitespaces and newlines
    text = re.sub(r'[ \t]+', ' ', text)
    text = re.sub(r'\n{3,}', '\n\n', text)
    
    return text.strip()


def process_document_background(
    contents: bytes,
    filename: str,
    content_type: str,
    metadata: dict,
    notify_role_action: str = None,
    notify_all_admins_action: str = None,
    is_ched_evidence: bool = False,
    is_iso_evidence: bool = False,
    ched_req_id: str = None,
    iso_req_id: str = None,
):
    """
    Background worker: handles heavy OCR + vector embedding after the HTTP response
    has already been sent. Also logs audit events so the request cycle stays fast.
    """
    job_id = metadata.get("job_id") or str(uuid.uuid4())
    registry_id = metadata.get("upload_registry_id")
    metadata["job_id"] = job_id
    _processing_status[job_id] = {"job_id": job_id, "office": metadata.get("office"), "name": metadata.get("name", filename), "status": "extracting", "message": "Reading document content.", "updated_at": utc_now().isoformat()}
    try:
        extracted_text = ""
        filename_lower = filename.lower()

        # ── Text extraction ──────────────────────────────────────────────────
        category = metadata.get("category", "")
        if is_non_rag_category(category):
            print(f"[BG] Category '{category}' is template-only. OCR and vector indexing bypassed.")
            
            # For HTML templates (like MRC Form 2), store the full content_html directly in metadata
            if filename_lower.endswith((".html", ".htm")):
                try:
                    metadata["content_html"] = contents.decode("utf-8", errors="ignore")
                except Exception as h_err:
                    print(f"[BG] HTML decode warning: {h_err}")
            elif filename_lower.endswith(".pdf"):
                try:
                    metadata["content_html"] = pdf_to_html(contents)
                except Exception:
                    pass

            if category in {"Form / Template", "Forms / Templates"}:
                if metadata.get("content_html"):
                    validate_safe_generated_html(metadata["content_html"])
                metadata["status"] = "Draft"
                metadata["template_management_required"] = True

            # Still log the audit event
            try:
                from vector_store import supabase as db_supabase
                # Non-RAG files still need one repository row so they remain
                # visible, versionable, and linked to the upload registry.
                existing_placeholder = (
                    db_supabase.table("document_sections")
                    .select("id")
                    .eq("metadata->>job_id", job_id)
                    .limit(1)
                    .execute()
                ).data or []
                if not existing_placeholder:
                    db_supabase.table("document_sections").insert({
                        "content": "",
                        "metadata": metadata,
                        "embedding": None,
                    }).execute()
                event_type = "Document Upload"
                if is_ched_evidence: event_type = "CHED Evidence Upload"
                elif is_iso_evidence: event_type = "ISO Evidence Upload"
                
                db_supabase.table("system_events_logs").insert({
                    "user_email": metadata.get("uploaded_by", "system"),
                    "event_type": event_type,
                    "description": f"Template '{metadata.get('name', filename)}' uploaded successfully (AI indexing bypassed for {category})."
                }).execute()
            except Exception as audit_err:
                print(f"[BG] Template audit warning: {audit_err}")
            _processing_status[job_id].update(
                status="completed",
                message="Document is ready.",
                chunks=0,
                updated_at=utc_now().isoformat(),
            )
            supersede_previous_document_versions(metadata)
            update_document_upload_registry(registry_id, "ACTIVE", failure_reason=None)
            return
        elif filename_lower.endswith(".pdf"):
            extracted_text = extract_pdf_text(contents)
        elif filename_lower.endswith((".png", ".jpg", ".jpeg")):
            img = PILImage.open(io.BytesIO(contents)).convert("RGB")
            img_array = np.array(img)
            ocr = get_ocr()
            extracted_text = run_ocr(ocr, img_array)
            if is_complex_ocr_garbage(extracted_text):
                vision_text = extract_with_vision(img_array)
                if vision_text.strip(): extracted_text = vision_text
        elif filename_lower.endswith((".txt", ".html")):
            extracted_text = contents.decode("utf-8", errors="ignore")
        elif filename_lower.endswith(".docx"):
            import docx
            doc = docx.Document(io.BytesIO(contents))
            parts = []
            for block in _iter_block_items(doc):
                if hasattr(block, "text"):
                    parts.append(block.text)
                elif hasattr(block, "rows"):
                    for row in block.rows:
                        for cell in row.cells:
                            parts.append(cell.text)
            extracted_text = "\n".join(parts)

        if not extracted_text.strip():
            _processing_status[job_id].update(status="failed", message="No readable text could be extracted from this file.", chunks=0, updated_at=utc_now().isoformat())
            update_document_upload_registry(registry_id, "FAILED", failure_reason="No readable text could be extracted.")
            print(f"[BG] No text extracted from '{filename}' — skipping embedding.")
            return

        # ── Offline OCR cleaner ──────────────────────────────────────────────
        extracted_text = clean_ocr_text_offline(extracted_text)

        # ── Vector embedding ─────────────────────────────────────────────────
        _processing_status[job_id].update(status="embedding", message="Preparing searchable content.", updated_at=utc_now().isoformat())
        chunks_count = vector_store.add_to_vector_db(extracted_text, metadata)
        if not chunks_count:
            _processing_status[job_id].update(status="failed", message="Text was extracted, but no searchable chunks were created.", chunks=0, updated_at=utc_now().isoformat())
            update_document_upload_registry(registry_id, "FAILED", failure_reason="No searchable chunks were created.")
            return
        supersede_previous_document_versions(metadata)
        _processing_status[job_id].update(status="completed", message="Document is ready and searchable.", chunks=chunks_count, updated_at=utc_now().isoformat())
        update_document_upload_registry(registry_id, "ACTIVE", failure_reason=None)
        print(f"[BG] '{filename}' embedded: {chunks_count} chunks.")

        # ── Audit log ────────────────────────────────────────────────────────
        try:
            from vector_store import supabase as db_supabase
            event_type = "Document Upload"
            if is_ched_evidence:
                event_type = "CHED Evidence Upload"
            elif is_iso_evidence:
                event_type = "ISO Evidence Upload"

            db_supabase.table("system_events_logs").insert({
                "user_email": metadata.get("uploaded_by", "system"),
                "event_type": event_type,
                "description": (
                    f"Background processing complete for '{metadata.get('name', filename)}' — "
                    f"{chunks_count} vector chunks embedded."
                )
            }).execute()
        except Exception as audit_err:
            print(f"[BG] Audit log warning: {audit_err}")

    except Exception as e:
        _processing_status[job_id].update(status="failed", message="Background processing failed. Check the request ID in server logs.", error=str(e), updated_at=utc_now().isoformat())
        update_document_upload_registry(registry_id, "FAILED", failure_reason=str(e)[:1000])
        _log.exception("background_document_processing_failed", extra={"request_id": _request_id.get(), "job_id": job_id, "filename": filename})
        print(f"[BG] process_document_background error for '{filename}': {e}")
        import traceback as _tb
        _tb.print_exc()


def queue_document_processing(*args, **kwargs):
    """Submits the heavy document processing task to a dedicated thread pool."""
    _bg_executor.submit(process_document_background, *args, **kwargs)


def supabase_query_with_retry(query_fn, retries=3, delay=1):
    """Retry a Supabase query on connection drops."""
    for attempt in range(retries):
        try:
            return query_fn()
        except Exception as e:
            if attempt < retries - 1 and "disconnect" in str(e).lower():
                time.sleep(delay)
                continue
            raise

# Local module imports
import models
import schemas
import utils
import vector_store
from rag_policy import is_non_rag_category, is_rag_active_status, normalize_category
from database import engine, get_db, SessionLocal


load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
AI_API_KEY = os.getenv("AI_API_KEY", "ollama")
AI_BASE_URL = os.getenv("AI_BASE_URL", "http://localhost:11434/v1")

# Initialize clients — single instances used throughout the file
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
# We use OpenAI client pointing to the local Ollama server (OpenAI compatible endpoint)
local_ai_client = OpenAI(api_key=AI_API_KEY, base_url=AI_BASE_URL)


class AIProviderUnavailable(RuntimeError):
    """Raised when the configured answer-generation provider cannot be used."""


def _groq_ai_client():
    api_key = (os.getenv("GROQ_API_KEY") or "").strip()
    if not api_key:
        raise AIProviderUnavailable(
            "Groq is not configured. Add GROQ_API_KEY to the backend environment or select Local only."
        )
    return Groq(api_key=api_key)


def run_ai_chat(*, messages, local_model, groq_model, provider_mode, temperature=0.0, max_tokens=600, response_format=None):
    """Run one chat request without changing retrieval, authorization, or grounding."""
    mode = provider_mode if provider_mode in {"local", "automatic", "groq"} else "local"
    failures = []
    request_options = {
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }
    if response_format is not None:
        request_options["response_format"] = response_format

    if mode in {"local", "automatic"}:
        try:
            response = local_ai_client.chat.completions.create(
                model=local_model,
                **request_options,
            )
            return response, "local"
        except Exception as exc:
            failures.append(f"Local AI: {type(exc).__name__}")
            if mode == "local":
                raise AIProviderUnavailable("Local AI is unavailable. Make sure Ollama is running.") from exc

    try:
        response = _groq_ai_client().chat.completions.create(
            model=groq_model,
            **request_options,
        )
        return response, "groq"
    except Exception as exc:
        failures.append(f"Groq: {type(exc).__name__}")
        _log.warning("ai_provider_unavailable", extra={"provider_mode": mode, "failures": failures})
        if mode == "automatic":
            raise AIProviderUnavailable("Both local AI and the configured cloud fallback are unavailable.") from exc
        raise AIProviderUnavailable("Groq is unavailable. Check the internet connection and backend API key.") from exc


def clean_ai_answer(text: str) -> str:
    """Remove model protocol/role labels that must never be shown to users."""
    cleaned = (text or "").strip()
    role_prefix = re.compile(
        r"^(?:(?:<\|im_start\|>\s*)?(?:assistant|ai assistant|system)\s*:?(?:<\|im_end\|>)?\s*(?:\r?\n)+)+",
        flags=re.IGNORECASE,
    )
    return role_prefix.sub("", cleaned).strip()

SMTP_USER     = os.getenv("EMAIL_ADDRESS")
SMTP_PASSWORD = os.getenv("EMAIL_APP_PASSWORD")


# ─────────────────────────────────────────────────────────────────────────────
# NOTIFICATION HELPERS
# ─────────────────────────────────────────────────────────────────────────────

VALID_NOTIF_TYPES = {"info", "success", "warning", "error"}


def _send_notification(user_email: str, n_type: str, title: str, message: str) -> bool:
    """
    Insert one notification row for a specific user.
    Silent on failure — never blocks the main request.
    """
    if n_type not in VALID_NOTIF_TYPES:
        n_type = "info"
    try:
        supabase.table("notifications").insert({
            "user_email": user_email,
            "type":       n_type,
            "title":      title,
            "message":    message,
            "is_read":    False,
        }).execute()
        return True
    except Exception as exc:
        print(f"[_send_notification] silent failure — {exc}")
        return False


def _notify_all_admins(db: Session, n_type: str, title: str, message: str) -> None:
    """
    Send the same notification to every active ADMIN in the system.
    Only ADMINs receive this — faculty and students are excluded.
    """
    try:
        admins = (
            db.query(models.User)
            .filter(models.User.role == "SYSTEM_ADMIN", models.User.status != "Disabled")
            .all()
        )
        for admin in admins:
            _send_notification(admin.email, n_type, title, message)
    except Exception as exc:
        print(f"[_notify_all_admins] silent failure — {exc}")


def _notify_role(db: Session, role: str, n_type: str, title: str, message: str) -> None:
    """
    Send the same notification to every active user of a given role.
    role: 'STUDENT' | 'FACULTY' | 'ADMIN'
    """
    try:
        role = "PERSONNEL" if role.upper() == "FACULTY" else role.upper()
        users = (
            db.query(models.User)
            .filter(models.User.role == role, models.User.status != "Disabled")
            .all()
        )
        for user in users:
            _send_notification(user.email, n_type, title, message)
    except Exception as exc:
        print(f"[_notify_role:{role}] silent failure — {exc}")


def _notify_office(db: Session, office_name: str, n_type: str, title: str, message: str) -> None:
    """
    Broadcasts a notification to every active user whose administrative_office or department matches office_name.
    """
    if not office_name:
        return
    try:
        office = db.query(models.OrganizationalUnit).filter(
            models.OrganizationalUnit.unit_type == "OFFICE",
            models.OrganizationalUnit.name == office_name,
        ).first()
        assignment_user_ids = db.query(models.UserAssignment.user_id).filter(
            models.UserAssignment.scope_type == "OFFICE",
            models.UserAssignment.scope_id == office.id,
            models.UserAssignment.is_active.is_(True),
        ) if office else []
        office_users = db.query(models.User).filter(
            models.User.status != "Disabled",
            or_(models.User.id.in_(assignment_user_ids), models.User.administrative_office == office_name),
        ).all()
        for u in office_users:
            if u.email:
                _send_notification(u.email, n_type, title, message)
    except Exception as exc:
        print(f"[_notify_office] silent failure — {exc}")


def _notify_non_admin(db: Session, n_type: str, title: str, message: str) -> None:
    """
    Send to all active FACULTY and STUDENT users — excludes ADMINs.
    Used for document and announcement notifications.
    """
    try:
        users = (
            db.query(models.User)
            .filter(
                models.User.role.in_(["PERSONNEL", "STUDENT"]),
                models.User.status != "Disabled"
            )
            .all()
        )
        for user in users:
            _send_notification(user.email, n_type, title, message)
    except Exception as exc:
        print(f"[_notify_non_admin] silent failure — {exc}")


# ─────────────────────────────────────────────────────────────────────────────
# PYDANTIC SCHEMAS (request / response models)
# ─────────────────────────────────────────────────────────────────────────────

class ChatHistoryItem(BaseModel):
    role: str # "user" or "assistant" / "ai"
    content: str

class QuestionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    question: str
    history: List[ChatHistoryItem] = Field(default_factory=list)

class FeedbackRequest(BaseModel):
    response_id: int
    is_helpful: Optional[bool] = None

class UpdateDocumentRequest(BaseModel):
    old_name:         str
    old_scope_type:   str
    old_scope_code:   str
    new_name:         str
    category:         str
    office:           str
    program:          Optional[str] = "GLOBAL"
    scope_type:       str
    scope_code:       Optional[str] = None
    version:          str
    effectivity_date: str


class DuplicateDocumentCheckRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    file_sha256: str = Field(pattern=r"^[0-9a-fA-F]{64}$")
    file_size: int = Field(ge=0, le=MAX_UPLOAD_BYTES)
    original_filename: str = Field(min_length=1, max_length=500)
    document_name: str = Field(min_length=1, max_length=500)
    category: str = Field(min_length=1, max_length=255)
    office: str = Field(min_length=1, max_length=255)
    program: str = Field(default="GLOBAL", max_length=255)
    scope_type: str = Field(pattern=r"^(CAMPUS|OFFICE|PROGRAM)$")
    scope_code: Optional[str] = Field(default=None, max_length=255)
    upload_mode: str = Field(default="NEW_DOCUMENT", pattern=r"^(NEW_DOCUMENT|NEW_VERSION)$")

class AccreditationUploadRequest(BaseModel):
    document_name: str
    program:       str
    area_code:     str
    category:      str = "Accreditation Evidence"

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class UpdatePasswordRequest(BaseModel):
    email:        EmailStr
    reset_token:  str
    new_password: str

class VerifyPasswordResetCodeRequest(BaseModel):
    email:    EmailStr
    otp_code: str

class PersonnelAssignmentRequest(BaseModel):
    assignment_type: str
    scope_type: str
    scope_id: Optional[str] = None
    is_primary: bool = False


class UserCreateRequest(BaseModel):
    department: Optional[str] = None
    full_name: str
    email:     str
    role:      str
    password:  str
    administrative_office: Optional[str] = None
    is_iqa_auditor: Optional[bool] = False
    assignments: List[PersonnelAssignmentRequest] = Field(default_factory=list)

class UserUpdateRequest(BaseModel):
    role: Optional[str] = None
    administrative_office: Optional[str] = None
    is_iqa_auditor: Optional[bool] = False
    designation: Optional[str] = None
    designation_entity: Optional[str] = None
    email: Optional[str] = None
    full_name: Optional[str] = None
    assignments: Optional[List[PersonnelAssignmentRequest]] = None

class ISOEvidenceReviewRequest(BaseModel):
    status: str
    feedback: Optional[str] = ""

class ChangePasswordRequest(BaseModel):
    email: str
    current_password: str
    new_password: str

class UpdateProfileRequest(BaseModel):
    email: str       # The current email (to find them in the database)
    new_email: str   # The new email they want to change to
    full_name: str
    program: str
    otp_code: Optional[str] = None

class AccessLogRequest(BaseModel):
    document_name: str
    action_type:   str
    user_email:    str
    user_role:     str

# Notification schemas
class NotificationCreate(BaseModel):
    user_email: str
    type:       str
    title:      str
    message:    str

class NotificationOut(BaseModel):
    id:         int
    user_email: str
    type:       str
    title:      str
    message:    str
    is_read:    bool
    created_at: str

# ── FIXED BroadcastRequest ───────────────────────────────────────
# target_role = "ALL" | "STUDENT" | "FACULTY"
# Admin is excluded from mass broadcasts — they manage the system.
class BroadcastRequest(BaseModel):
    title:       str
    message:     str
    target_role: str = "ALL"   # default: send to everyone (non-admin)
    sender_email: str = ""


# ─────────────────────────────────────────────────────────────────────────────
# APP SETUP
# ─────────────────────────────────────────────────────────────────────────────

class SendOTPRequest(BaseModel):
    email: EmailStr

class VerifyOTPRequest(BaseModel):
    email: EmailStr
    otp_code: str

class AccreditationReviewRequest(BaseModel):
    evidence_id: uuid.UUID
    status: str = Field(pattern=r"^(Approved|Needs Revision)$")
    feedback: str = Field(default="", max_length=4000)


# --- SETTINGS SCHEMAS ---
class SettingsSchema(BaseModel):
    platform_name: str
    campus: str
    admin_email: str
    jwt_expiration: int
    otp_expiration: int
    ai_provider: str = Field(default="local", pattern=r"^(local|automatic|groq)$")
    ai_model: str
    groq_model: str = Field(default="qwen/qwen3.8-27b", min_length=3, max_length=100)
    ai_temperature: float
    ai_system_prompt: str
    rag_max_chunks: int


class OrganizationalUnitSettingsPayload(BaseModel):
    code: str = Field(min_length=2, max_length=80, pattern=r"^[A-Z][A-Z0-9_]*$")
    name: str = Field(min_length=2, max_length=255)
    unit_type: str = Field(pattern=r"^(OFFICE|COLLEGE)$")
    is_active: bool = True


class AcademicProgramSettingsPayload(BaseModel):
    code: str = Field(min_length=2, max_length=50, pattern=r"^[A-Z][A-Z0-9_]*$")
    name: str = Field(min_length=2, max_length=255)
    college_unit_id: uuid.UUID
    is_active: bool = True


class ISOOfficeMappingSettingsPayload(BaseModel):
    process_group_ids: List[uuid.UUID] = Field(default_factory=list, max_length=32)


class CARClassificationRulePayload(BaseModel):
    requires_car: bool
    is_active: bool = True


class CARReopenPayload(BaseModel):
    reason: str = Field(min_length=10, max_length=4000)

_DB_IS_AVAILABLE = False
try:
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
        _DB_IS_AVAILABLE = True
        models.Base.metadata.create_all(bind=engine)
        conn.execute(text("ALTER TABLE iso_requirements ADD COLUMN IF NOT EXISTS cycle_year VARCHAR(50) DEFAULT '2025 Surveillance';"))
        conn.execute(text("ALTER TABLE iqa_day_schedules ADD COLUMN IF NOT EXISTS cycle_year VARCHAR(50) DEFAULT '2025 Surveillance';"))
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS administrative_office VARCHAR(255);"))
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_iqa_auditor BOOLEAN DEFAULT FALSE;"))
        conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS uq_active_document_controller ON user_assignments (assignment_type) WHERE assignment_type = 'DOCUMENT_CONTROLLER' AND is_active;"))
        conn.execute(text("ALTER TABLE paper_trail_records ADD COLUMN IF NOT EXISTS origin_office VARCHAR(255);"))
        conn.execute(text("ALTER TABLE paper_trail_records ADD COLUMN IF NOT EXISTS origin_person VARCHAR(255);"))
        conn.execute(text("ALTER TABLE paper_trail_records ADD COLUMN IF NOT EXISTS current_location VARCHAR(255);"))
        conn.execute(text("ALTER TABLE paper_trail_records ADD COLUMN IF NOT EXISTS transaction_type VARCHAR(50) DEFAULT 'Submission';"))
        conn.execute(text("ALTER TABLE paper_trail_records ADD COLUMN IF NOT EXISTS is_controlled_document BOOLEAN DEFAULT FALSE;"))
        conn.execute(text("ALTER TABLE paper_trail_records ADD COLUMN IF NOT EXISTS storage_path TEXT;"))
        conn.execute(text("ALTER TABLE qms_action_plans ADD COLUMN IF NOT EXISTS assessment_date VARCHAR(50);"))
        conn.execute(text("ALTER TABLE qms_action_plans ADD COLUMN IF NOT EXISTS assessment_notes TEXT;"))
        conn.execute(text("ALTER TABLE iso_evidences ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Approved';"))
        conn.execute(text("ALTER TABLE iso_evidences ADD COLUMN IF NOT EXISTS admin_feedback TEXT;"))
        conn.execute(text("ALTER TABLE iso_evidences ADD COLUMN IF NOT EXISTS storage_path TEXT;"))
        conn.execute(text("ALTER TABLE qms_evidences ADD COLUMN IF NOT EXISTS storage_path TEXT;"))
        conn.execute(text("ALTER TABLE ched_evidences ADD COLUMN IF NOT EXISTS file_name VARCHAR(255);"))
        conn.execute(text("ALTER TABLE ched_evidences ADD COLUMN IF NOT EXISTS storage_path TEXT;"))
        conn.execute(text("ALTER TABLE ched_evidences ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Pending Verification';"))
        conn.execute(text("ALTER TABLE program_accreditations ADD COLUMN IF NOT EXISTS active_areas TEXT DEFAULT 'Area I,Area II,Area III,Area IV,Area V,Area VI,Area VII,Area VIII,Area IX,Area X';"))
        conn.execute(text("ALTER TABLE accreditation_history ADD COLUMN IF NOT EXISTS certificate_storage_path TEXT;"))
        conn.execute(text("UPDATE car_forms SET status = 'Issued' WHERE status IS NULL OR status IN ('Open', 'OPEN');"))
        conn.execute(text("UPDATE car_forms SET status = 'Awaiting Verification' WHERE status IN ('Under Review', 'UNDER REVIEW');"))
        conn.execute(text("UPDATE car_forms SET status = 'In Progress' WHERE status IN ('Pending', 'Active');"))
        conn.execute(text("ALTER TABLE car_forms ALTER COLUMN status SET DEFAULT 'Issued';"))
        
        # Check if aaccup_requirements is empty, then seed
        res_aaccup = conn.execute(text("SELECT COUNT(*) FROM aaccup_requirements")).scalar()
        if res_aaccup == 0:
            seed_data = [
                ("Area I", "Vision, Mission, Goals and Objectives", "Approved Board Resolution of VMGO"),
                ("Area I", "Vision, Mission, Goals and Objectives", "Dissemination Evidence (Photos, Memos)"),
                ("Area I", "Vision, Mission, Goals and Objectives", "Stakeholder Awareness Survey Rating"),
                ("Area II", "Faculty", "Faculty Manual"),
                ("Area II", "Faculty", "201 Files / Credentials of Faculty"),
                ("Area II", "Faculty", "Faculty Development Plan"),
                ("Area II", "Faculty", "Summary of Faculty Workload and Loading"),
                ("Area III", "Curriculum and Instruction", "CMO / Syllabi for all subjects"),
                ("Area III", "Curriculum and Instruction", "Curriculum Map"),
                ("Area III", "Curriculum and Instruction", "Sample Exams and Rubrics"),
                ("Area IV", "Support to Students", "Student Handbook"),
                ("Area IV", "Support to Students", "Guidance and Counseling Reports"),
                ("Area IV", "Support to Students", "Student Organization Activities"),
                ("Area V", "Research", "Institutional Research Agenda"),
                ("Area V", "Research", "Published Research Papers"),
                ("Area V", "Research", "Research Incentives Memo"),
                ("Area VI", "Extension and Community Involvement", "Extension Program Plan"),
                ("Area VI", "Extension and Community Involvement", "MOA/MOU with Partner Communities"),
                ("Area VI", "Extension and Community Involvement", "Impact Assessment Report"),
                ("Area VII", "Library", "Library Manual"),
                ("Area VII", "Library", "Inventory of Books and Journals"),
                ("Area VII", "Library", "Library Utilization Reports"),
                ("Area VIII", "Physical Plant and Facilities", "Campus Development Plan"),
                ("Area VIII", "Physical Plant and Facilities", "Building Permits and Fire Safety Certs"),
                ("Area VIII", "Physical Plant and Facilities", "Maintenance Logs"),
                ("Area IX", "Laboratories", "Laboratory Manuals"),
                ("Area IX", "Laboratories", "Inventory of Equipment"),
                ("Area IX", "Laboratories", "Safety and Hazard Protocols"),
                ("Area X", "Administration", "Organizational Chart"),
                ("Area X", "Administration", "Strategic Plan"),
                ("Area X", "Administration", "Financial Audit Reports"),
            ]
            for code, title, desc in seed_data:
                conn.execute(text("INSERT INTO aaccup_requirements (id, area_code, area_title, description, created_at) VALUES (gen_random_uuid(), :code, :title, :desc, now())"), {"code": code, "title": title, "desc": desc})
            conn.commit()
            import time
            time.sleep(0.2)  # Allow DB transaction to finalize before math routes run
        else:
            conn.commit()
except Exception as _mig_err:
    _DB_IS_AVAILABLE = False
    print(f"[Supabase Info] PostgreSQL port 5432 unavailable on local network. Running in high-availability Supabase REST mode (HTTPS).")

app = FastAPI(
    title="CTU Institutional Knowledge System API",
    description="Backend for the RAG-Powered Quality Assurance System"
)

# ─────────────────────────────────────────────────────────────────────────────
# SECURITY HARDENING: CORS & HEADERS MIDDLEWARE
# ─────────────────────────────────────────────────────────────────────────────
allowed_origins_env = os.getenv("ALLOWED_ORIGINS")
if allowed_origins_env:
    allowed_origins = [origin.strip() for origin in allowed_origins_env.split(",") if origin.strip()]
else:
    allowed_origins = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost",
        "http://127.0.0.1",
        "http://localhost:80",
        "http://127.0.0.1:80"
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Accept", "Content-Type", "Authorization", "X-Requested-With"],
)

@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    """Applies Security Headers to defeat Clickjacking, MIME sniffing, and XSS attacks."""
    request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
    _request_id.set(request_id)
    if request.method in {"POST", "PUT", "PATCH", "DELETE"} and request.cookies.get("access_token"):
        csrf_exempt_paths = {"/login", "/logout", "/auth/send-otp", "/auth/verify-otp", "/register", "/send-reset-email", "/verify-reset-code", "/update-password"}
        if request.url.path not in csrf_exempt_paths:
            csrf_cookie = request.cookies.get("csrf_token")
            csrf_header = request.headers.get("X-CSRF-Token")
            origin = request.headers.get("Origin")
            origin_allowed = bool(origin and origin in allowed_origins)
            csrf_valid = bool(csrf_cookie and csrf_header and secrets.compare_digest(csrf_cookie, csrf_header))
            if not csrf_valid and not origin_allowed:
                return Response(content='{"detail":"CSRF validation failed."}', status_code=403, media_type="application/json")
    try:
        response = await call_next(request)
    except Exception:
        _log.exception("request_failed", extra={"request_id": request_id, "method": request.method, "path": request.url.path})
        raise
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response


# ─────────────────────────────────────────────────────────────────────────────
# MODULAR ROUTERS
# ─────────────────────────────────────────────────────────────────────────────
from routers import health, survey, announcements

app.include_router(health.router)
app.include_router(survey.router)
app.include_router(announcements.router)


# ─────────────────────────────────────────────────────────────────────────────
# AUTHENTICATION DEPENDENCIES (JWT VALIDATION)
# ─────────────────────────────────────────────────────────────────────────────
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login", auto_error=False)

def _extract_token_from_request(request: Request, bearer_token: Optional[str] = None) -> Optional[str]:
    """Helper to extract token from Bearer header OR HttpOnly cookie."""
    if bearer_token and bearer_token.strip() not in ("null", "undefined", ""):
        return bearer_token.strip()
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        parts = auth_header.split(" ")
        if len(parts) > 1:
            token_val = parts[1].strip()
            if token_val and token_val not in ("null", "undefined", ""):
                return token_val
    cookie_token = request.cookies.get("access_token")
    if cookie_token:
        cookie_clean = cookie_token.replace("Bearer ", "").strip()
        if cookie_clean and cookie_clean not in ("null", "undefined", ""):
            return cookie_clean
    return None

def _get_user_by_email(email: str, db: Session):
    """Retrieve user via DB session with fast fallback to Supabase REST client (port 443) if port 5432 is blocked/timing out."""
    global _DB_IS_AVAILABLE
    if _DB_IS_AVAILABLE:
        try:
            user = db.query(models.User).filter(models.User.email == email).first()
            if user:
                return user
        except Exception:
            _DB_IS_AVAILABLE = False

    try:
        res = supabase.table("users").select("*").eq("email", email).execute()
        if res.data and len(res.data) > 0:
            from types import SimpleNamespace
            row = dict(res.data[0])
            row.setdefault("student_profile", None)
            row.setdefault("department", "Unassigned")
            row.setdefault("administrative_office", "")
            row.setdefault("is_iqa_auditor", False)
            row.setdefault("is_verified", True)
            row.setdefault("status", "Active")
            return SimpleNamespace(**row)
    except Exception as sb_err:
        print(f"[Supabase REST Warning] Failed to query user by email: {sb_err}")
    return None


def _load_effective_assignments(user, db: Session):
    """Load assignment scopes from trusted database records for authorization."""
    normalized = []
    iso_processes = []
    try:
        rows = db.query(models.UserAssignment).filter(
            models.UserAssignment.user_id == user.id,
            models.UserAssignment.is_active.is_(True),
        ).all()
        unit_ids = {a.scope_id for a in rows if a.scope_type in {"OFFICE", "COLLEGE"} and a.scope_id}
        program_ids = {a.scope_id for a in rows if a.scope_type == "PROGRAM" and a.scope_id}
        units = {str(x.id): x for x in db.query(models.OrganizationalUnit).filter(models.OrganizationalUnit.id.in_(unit_ids)).all()} if unit_ids else {}
        programs = {str(x.id): x for x in db.query(models.AcademicProgram).filter(models.AcademicProgram.id.in_(program_ids)).all()} if program_ids else {}
        for assignment in rows:
            scope = units.get(str(assignment.scope_id)) or programs.get(str(assignment.scope_id))
            normalized.append({
                "id": str(assignment.id), "assignment_type": assignment.assignment_type,
                "scope_type": assignment.scope_type,
                "scope_id": str(assignment.scope_id) if assignment.scope_id else None,
                "scope_code": getattr(scope, "code", "ARGAO" if assignment.scope_type == "CAMPUS" else ""),
                "scope_name": getattr(scope, "name", "CTU Argao Campus" if assignment.scope_type == "CAMPUS" else ""),
                "is_primary": bool(assignment.is_primary), "is_active": bool(assignment.is_active),
            })
        office_scope_ids = {a.scope_id for a in rows if a.scope_type == "OFFICE" and a.scope_id}
        if office_scope_ids:
            mapped_processes = db.query(models.ISOProcessGroup.id, models.ISOProcessGroup.name).join(
                models.ISOProcessUnitMapping,
                models.ISOProcessUnitMapping.process_group_id == models.ISOProcessGroup.id,
            ).filter(models.ISOProcessUnitMapping.organizational_unit_id.in_(office_scope_ids)).distinct().all()
            process_ids = [item[0] for item in mapped_processes]
            iso_processes = [item[1] for item in mapped_processes]
            iso_processes.extend(alias for (alias,) in db.query(models.ISOProcessAlias.alias).filter(models.ISOProcessAlias.process_group_id.in_(process_ids)).all())
    except Exception:
        try:
            result = supabase.table("user_assignments").select("*").eq("user_id", str(user.id)).eq("is_active", True).execute()
            for assignment in result.data or []:
                scope_code = "ARGAO" if assignment.get("scope_type") == "CAMPUS" else ""
                scope_name = "CTU Argao Campus" if assignment.get("scope_type") == "CAMPUS" else ""
                scope_id = assignment.get("scope_id")
                if scope_id and assignment.get("scope_type") in {"OFFICE", "COLLEGE"}:
                    scope_result = supabase.table("organizational_units").select("code,name").eq("id", scope_id).limit(1).execute()
                    if scope_result.data:
                        scope_code, scope_name = scope_result.data[0]["code"], scope_result.data[0]["name"]
                elif scope_id and assignment.get("scope_type") == "PROGRAM":
                    scope_result = supabase.table("academic_programs").select("code,name").eq("id", scope_id).limit(1).execute()
                    if scope_result.data:
                        scope_code, scope_name = scope_result.data[0]["code"], scope_result.data[0]["name"]
                normalized.append({**assignment, "scope_code": scope_code, "scope_name": scope_name})
            office_scope_ids = [a.get("scope_id") for a in normalized if a.get("scope_type") == "OFFICE" and a.get("scope_id")]
            if office_scope_ids:
                mapping_result = supabase.table("iso_process_unit_mappings").select("process_group_id").in_("organizational_unit_id", office_scope_ids).execute()
                process_ids = list({row["process_group_id"] for row in (mapping_result.data or [])})
                if process_ids:
                    process_result = supabase.table("iso_process_groups").select("name").in_("id", process_ids).execute()
                    iso_processes = [row["name"] for row in (process_result.data or [])]
                    alias_result = supabase.table("iso_process_aliases").select("alias").in_("process_group_id", process_ids).execute()
                    iso_processes.extend(row["alias"] for row in (alias_result.data or []))
        except Exception:
            normalized = []
    setattr(user, "_effective_assignments", normalized if normalized else None)
    setattr(user, "_accessible_iso_processes", iso_processes)
    return user

def get_current_user(
    request: Request,
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> models.User:
    """Enforces user authentication across Header and Cookie strategies with Supabase REST fallback."""
    extracted_token = _extract_token_from_request(request, token)
    if not extracted_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Missing Bearer access token or auth cookie.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        payload = utils.decode_access_token(extracted_token)
        email: str = payload.get("sub")
        if not email:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token claims.",
                headers={"WWW-Authenticate": "Bearer"},
            )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Access token has expired or is invalid.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = _get_user_by_email(email, db)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User account not found.")

    if user.status != "Active":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User account is disabled.")

    return _load_effective_assignments(user, db)

def get_optional_user(
    request: Request,
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> Optional[models.User]:
    """Optional user resolution supporting both Header and Cookie auth."""
    extracted_token = _extract_token_from_request(request, token)
    if not extracted_token:
        return None
    try:
        payload = utils.decode_access_token(extracted_token)
        email = payload.get("sub")
        if email:
            resolved = _get_user_by_email(email, db)
            return _load_effective_assignments(resolved, db) if resolved and resolved.status == "Active" else None
    except Exception:
        pass
    return None

def get_current_admin(current_user: models.User = Depends(get_current_user)) -> models.User:
    require_system_admin(current_user)
    return current_user

def get_governance_manager(current_user: models.User = Depends(get_current_user)) -> models.User:
    if not permissions_for(current_user)["governance.manage"]:
        raise HTTPException(403, "Governance management permission required.")
    return current_user


def get_governance_reader(current_user: models.User = Depends(get_current_user)) -> models.User:
    if not permissions_for(current_user)["governance.access"]:
        raise HTTPException(403, "Governance access permission required.")
    return current_user


def get_accreditation_reader(current_user: models.User = Depends(get_current_user)) -> models.User:
    """Allow academic assignees and campus reviewers to read AACCUP configuration."""
    if not (
        is_system_admin(current_user)
        or is_reviewer(current_user)
        or bool(accessible_programs(current_user))
    ):
        raise HTTPException(403, "Accreditation access permission required.")
    return current_user


def get_governance_reviewer(current_user: models.User = Depends(get_current_user)) -> models.User:
    require_reviewer(current_user)
    return current_user


def get_campus_governance_reviewer(current_user: models.User = Depends(get_current_user)) -> models.User:
    require_campus_reviewer(current_user)
    return current_user


def get_document_manager(current_user: models.User = Depends(get_current_user)) -> models.User:
    if not permissions_for(current_user)["documents.manage"]:
        raise HTTPException(403, "Document management permission required.")
    return current_user


def require_document_office(user, office):
    if not is_system_admin(user):
        require_office(user, office)


def require_document_name_access(user, name):
    rows = supabase.table("document_sections").select("metadata").eq("metadata->>name", name).execute().data or []
    if not rows:
        raise HTTPException(404, "Document not found.")
    for row in rows:
        meta = row.get("metadata") or {}
        if not can_read_document(user, meta) or not can_manage_document(user, meta):
            raise HTTPException(403, "This document is outside your assigned governance scope.")


def protect_last_system_admin(db, user):
    # Lock the same set in a stable order so concurrent demotions cannot remove both administrators.
    admins = db.query(models.User).filter(models.User.role == "SYSTEM_ADMIN", models.User.status == "Active").order_by(models.User.id).with_for_update().all()
    if is_system_admin(user) and user.status == "Active" and len(admins) <= 1:
        raise HTTPException(409, "Assign another active System Administrator before removing this administrator.")


def _validate_and_normalize_assignments(db, assignments):
    normalized = []
    seen = set()
    for item in assignments or []:
        assignment_type = str(item.assignment_type or "").upper()
        scope_type = str(item.scope_type or "").upper()
        if assignment_type not in ASSIGNMENT_TYPES:
            raise HTTPException(400, f"Invalid personnel assignment: {assignment_type}.")
        if scope_type not in ASSIGNMENT_SCOPE_TYPES[assignment_type]:
            raise HTTPException(400, f"{assignment_type.replace('_', ' ').title()} cannot use a {scope_type.lower()} scope.")
        scope_id = None
        if scope_type != "CAMPUS":
            if not item.scope_id:
                raise HTTPException(400, "Select a scope for every personnel assignment.")
            try:
                scope_id = uuid.UUID(str(item.scope_id))
            except ValueError:
                raise HTTPException(400, "Invalid assignment scope.")
            if scope_type in {"OFFICE", "COLLEGE"}:
                scope = db.query(models.OrganizationalUnit).filter(
                    models.OrganizationalUnit.id == scope_id,
                    models.OrganizationalUnit.unit_type == scope_type,
                    models.OrganizationalUnit.is_active.is_(True),
                ).first()
            else:
                scope = db.query(models.AcademicProgram).filter(
                    models.AcademicProgram.id == scope_id,
                    models.AcademicProgram.is_active.is_(True),
                ).first()
            if not scope:
                raise HTTPException(400, "The selected assignment scope is unavailable.")
        key = (assignment_type, scope_type, str(scope_id or "CAMPUS"))
        if key in seen:
            raise HTTPException(400, "Duplicate personnel assignment.")
        seen.add(key)
        normalized.append({
            "assignment_type": assignment_type, "scope_type": scope_type,
            "scope_id": scope_id, "is_primary": bool(item.is_primary),
        })
    if sum(1 for item in normalized if item["is_primary"]) > 1:
        raise HTTPException(400, "Only one personnel assignment can be primary.")
    return normalized


def _replace_user_assignments(db, user, assignments):
    normalized = _validate_and_normalize_assignments(db, assignments)
    if any(item["assignment_type"] == "DOCUMENT_CONTROLLER" for item in normalized):
        existing = db.query(models.UserAssignment).filter(
            models.UserAssignment.assignment_type == "DOCUMENT_CONTROLLER",
            models.UserAssignment.is_active.is_(True),
            models.UserAssignment.user_id != user.id,
        ).first()
        if existing:
            raise HTTPException(409, "A Document Controller is already assigned.")
    db.query(models.UserAssignment).filter(models.UserAssignment.user_id == user.id).delete(synchronize_session=False)
    has_primary = any(x["is_primary"] for x in normalized)
    for index, item in enumerate(normalized):
        db.add(models.UserAssignment(
            user_id=user.id,
            assignment_type=item["assignment_type"], scope_type=item["scope_type"], scope_id=item["scope_id"],
            is_primary=item["is_primary"] or (index == 0 and not has_primary),
            is_active=True,
        ))
    db.flush()
    _load_effective_assignments(user, db)
    primary_office = next((a for a in assignments_of(user) if a.get("scope_type") == "OFFICE" and a.get("is_primary")), None)
    primary_academic = next((a for a in assignments_of(user) if a.get("scope_type") in {"PROGRAM", "COLLEGE"} and a.get("is_primary")), None)
    user.administrative_office = (primary_office or next((a for a in assignments_of(user) if a.get("scope_type") == "OFFICE"), {})).get("scope_name") or None
    user.department = (primary_academic or next((a for a in assignments_of(user) if a.get("scope_type") in {"PROGRAM", "COLLEGE"}), {})).get("scope_code") or None
    user.is_iqa_auditor = any(a.get("assignment_type") == "IQA_AUDITOR" for a in assignments_of(user))


def _serialize_user(user, db):
    _load_effective_assignments(user, db)
    return {
        "id": str(user.id), "full_name": user.full_name, "email": user.email,
        "role": role_of(user), "department": user.department,
        "administrative_office": user.administrative_office,
        "is_iqa_auditor": bool(user.is_iqa_auditor), "is_verified": bool(user.is_verified),
        "created_by_admin": bool(user.created_by_admin), "email_changed": bool(user.email_changed),
        "status": user.status, "created_at": user.created_at,
        "assignments": assignments_of(user),
    }


@app.get("/authorization/reference-data")
def get_authorization_reference_data(
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_admin),
):
    try:
        units = db.query(models.OrganizationalUnit).filter(models.OrganizationalUnit.is_active.is_(True)).order_by(models.OrganizationalUnit.name).all()
        programs = db.query(models.AcademicProgram).filter(models.AcademicProgram.is_active.is_(True)).order_by(models.AcademicProgram.name).all()
    except Exception:
        units_result = supabase.table("organizational_units").select("id,code,name,unit_type").eq("is_active", True).order("name").execute()
        programs_result = supabase.table("academic_programs").select("id,code,name,college_unit_id").eq("is_active", True).order("name").execute()
        from types import SimpleNamespace
        units = [SimpleNamespace(**row) for row in (units_result.data or [])]
        programs = [SimpleNamespace(**row) for row in (programs_result.data or [])]
    return {
        "offices": [{"id": str(x.id), "code": x.code, "name": x.name} for x in units if x.unit_type == "OFFICE"],
        "colleges": [{"id": str(x.id), "code": x.code, "name": x.name} for x in units if x.unit_type == "COLLEGE"],
        "programs": [{"id": str(x.id), "code": x.code, "name": x.name, "college_unit_id": str(x.college_unit_id)} for x in programs],
        "assignment_types": sorted(ASSIGNMENT_TYPES),
    }


@app.get("/public/reference-data")
def get_public_reference_data():
    """Active non-sensitive reference values used by public and authenticated dropdowns."""
    units = supabase.table("organizational_units").select("id,code,name,unit_type").eq("is_active", True).order("name").execute().data or []
    programs = supabase.table("academic_programs").select("id,code,name,college_unit_id").eq("is_active", True).order("name").execute().data or []
    process_groups = supabase.table("iso_process_groups").select("id,code,name").eq("is_active", True).order("name").execute().data or []
    colleges_by_id = {str(item["id"]): item["name"] for item in units if item.get("unit_type") == "COLLEGE"}
    return {
        "offices": [{"id": str(x["id"]), "code": x["code"], "name": x["name"]} for x in units if x.get("unit_type") == "OFFICE"],
        "colleges": [{"id": str(x["id"]), "code": x["code"], "name": x["name"]} for x in units if x.get("unit_type") == "COLLEGE"],
        "programs": [{**x, "id": str(x["id"]), "college_unit_id": str(x["college_unit_id"]), "college_name": colleges_by_id.get(str(x["college_unit_id"]), "")} for x in programs],
        "iso_process_groups": [{"id": str(x["id"]), "code": x["code"], "name": x["name"]} for x in process_groups],
    }


@app.get("/auth/me")
def get_auth_profile(current_user: models.User = Depends(get_current_user)):
    offices = assigned_offices(current_user)
    return {"id": str(current_user.id), "role": role_of(current_user), "email": current_user.email,
            "full_name": getattr(current_user, "full_name", None) or "CTU User",
            "administrative_office": offices[0] if offices else getattr(current_user, "administrative_office", None),
            "department": getattr(current_user, "department", None),
            "is_iqa_auditor": bool(getattr(current_user, "is_iqa_auditor", False)),
            "created_by_admin": bool(getattr(current_user, "created_by_admin", False)),
            "email_changed": bool(getattr(current_user, "email_changed", False)),
            "allowed_programs": accessible_programs(current_user),
            "allowed_iso_processes": getattr(current_user, "_accessible_iso_processes", []),
            "assignments": assignments_of(current_user),
            "permissions": permissions_for(current_user)}


@app.get("/dashboard/personnel")
def get_personnel_dashboard(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Return independently calculated, assignment-scoped Personnel dashboard modules."""
    if role_of(current_user) != "PERSONNEL":
        raise HTTPException(status_code=403, detail="This dashboard is available to Personnel accounts.")

    user_assignments = assignments_of(current_user)
    assignment_types = {str(item.get("assignment_type") or "").upper() for item in user_assignments}
    permissions = permissions_for(current_user)
    errors = []

    summary = {"documents": 0, "queries": 0, "access_events": 0, "open_documents": 0}
    recent_activity = []

    try:
        visible_documents = set()
        page_size = 1000
        offset = 0
        while True:
            docs_response = (supabase.table("document_sections").select("metadata")
                             .range(offset, offset + page_size - 1).execute())
            rows = docs_response.data or []
            for row in rows:
                metadata = row.get("metadata") or {}
                if isinstance(metadata, str):
                    try:
                        metadata = json.loads(metadata)
                    except Exception:
                        metadata = {}
                if not can_read_document(current_user, metadata):
                    continue
                if str(metadata.get("status", "Active")).lower() == "archived":
                    continue
                name = (metadata.get("document_name") or metadata.get("title") or
                        metadata.get("name") or metadata.get("file_name") or metadata.get("source"))
                if name:
                    visible_documents.add(name)
            if len(rows) < page_size:
                break
            offset += page_size
        summary["documents"] = len(visible_documents)
    except Exception:
        errors.append("documents")

    try:
        query_response = (supabase.table("chat_history").select("id")
                          .eq("user_email", current_user.email).eq("role", "user").execute())
        summary["queries"] = len(query_response.data or [])
    except Exception:
        errors.append("queries")

    try:
        access_response = (supabase.table("document_access_logs").select("*")
                           .eq("user_email", current_user.email).limit(100).execute())
        access_rows = access_response.data or []
        access_rows.sort(key=lambda item: item.get("accessed_at") or item.get("created_at") or "", reverse=True)
        summary["access_events"] = len(access_rows)
        recent_activity = [{
            "id": str(item.get("id") or index),
            "title": item.get("document_name") or "Institutional document",
            "action": item.get("action_type") or "Viewed",
            "timestamp": item.get("accessed_at") or item.get("created_at"),
        } for index, item in enumerate(access_rows[:5])]
    except Exception:
        errors.append("activity")

    modules = {}

    academic_types = {"COLLEGE_DEAN", "COLLEGE_SECRETARY", "PROGRAM_CHAIR", "FACULTY_MEMBER"}
    if assignment_types & academic_types:
        program_codes = set()
        for assignment in user_assignments:
            kind = str(assignment.get("assignment_type") or "").upper()
            scope_type = str(assignment.get("scope_type") or "").upper()
            scope_code = str(assignment.get("scope_code") or "").strip()
            scope_name = str(assignment.get("scope_name") or "").strip()
            if kind not in academic_types:
                continue
            if scope_type == "PROGRAM" and scope_code in PROGRAM_COLLEGES:
                program_codes.add(scope_code)
            elif scope_type == "COLLEGE":
                college_key = office_key(scope_name or scope_code)
                program_codes.update(code for code, college in PROGRAM_COLLEGES.items()
                                     if office_key(college) == college_key)

        programs = []
        for code in sorted(program_codes):
            try:
                status_data = get_accreditation_status(code, db, current_user)
                programs.append({
                    "code": code,
                    "college": PROGRAM_COLLEGES.get(code),
                    "overall": status_data.get("overall", 0),
                    "gaps": status_data.get("gaps", 0),
                    "evidence": status_data.get("evidence", 0),
                    "level": status_data.get("level"),
                })
            except Exception:
                programs.append({"code": code, "college": PROGRAM_COLLEGES.get(code), "unavailable": True})
        modules["accreditation"] = {"programs": programs}

    governance_types = {"OFFICE_HEAD", "OFFICE_MEMBER", "QA_HEAD", "IQA_AUDITOR"}
    if permissions.get("governance.access") and assignment_types & governance_types:
        try:
            plans = filter_office_records(current_user, db.query(models.QMSActionPlan).all())
            modules["governance"] = {
                "offices": assigned_offices(current_user),
                "iso_processes": list(getattr(current_user, "_accessible_iso_processes", []) or []),
                "action_plans": len(plans),
                "pending": sum(1 for plan in plans if str(plan.status or "").lower() not in {"completed", "closed"}),
                "overdue": sum(1 for plan in plans if str(plan.status or "").lower() == "overdue"),
            }
        except Exception:
            errors.append("governance")
            modules["governance"] = {"unavailable": True}

    survey_types = {"OFFICE_HEAD", "QA_HEAD", "IQA_AUDITOR", "SURVEY_ANALYST"}
    if permissions.get("survey.analytics") and assignment_types & survey_types:
        try:
            responses = filter_survey_records(current_user, db.query(models.CssResponse).all(), "office_visited")
            modules["survey"] = {
                "responses": len(responses),
                "scope": "Campus-wide" if permissions.get("survey.cross_office") else ", ".join(
                    assigned_offices(current_user, {"OFFICE_HEAD", "SURVEY_ANALYST", "IQA_AUDITOR"})
                ) or "Assigned office",
            }
        except Exception:
            errors.append("survey")
            modules["survey"] = {"unavailable": True}

    try:
        paper_records = [record for record in db.query(models.PaperTrailRecord).all()
                         if _paper_trail_visible(record, current_user)]
        open_statuses = {"pending receiving", "under review", "pending request", "needs revision"}
        open_records = [record for record in paper_records if str(record.status or "").lower() in open_statuses]
        summary["open_documents"] = len(open_records)
        modules["document_tracking"] = {
            "open": len(open_records),
            "total": len(paper_records),
            "controller": "DOCUMENT_CONTROLLER" in assignment_types,
        }
    except Exception:
        errors.append("document_tracking")

    attention = []
    accreditation = modules.get("accreditation", {})
    accreditation_gaps = sum(item.get("gaps", 0) for item in accreditation.get("programs", []) if not item.get("unavailable"))
    if accreditation_gaps:
        attention.append({"kind": "accreditation", "count": accreditation_gaps,
                          "message": "Accreditation evidence items still need attention.",
                          "path": "/app/accreditation-support"})
    governance = modules.get("governance", {})
    if governance.get("overdue"):
        attention.append({"kind": "governance", "count": governance["overdue"],
                          "message": "QMS action plans are overdue.", "path": "/app/accreditation-support"})
    if summary["open_documents"]:
        attention.append({"kind": "documents", "count": summary["open_documents"],
                          "message": "Tracked documents are awaiting action.", "path": "/app/paper-trail"})
    if not user_assignments:
        attention.append({"kind": "assignment", "count": 0,
                          "message": "No personnel assignment has been configured for this account.", "path": None})

    return {
        "profile": {
            "full_name": current_user.full_name or "CTU Personnel",
            "email": current_user.email,
            "assignments": user_assignments,
        },
        "summary": summary,
        "attention": attention,
        "recent_activity": recent_activity,
        "modules": modules,
        "partial_errors": errors,
    }


def get_current_faculty_or_admin(current_user: models.User = Depends(get_current_user)) -> models.User:
    """Enforces Faculty or Admin role requirement."""
    if role_of(current_user) not in {"PERSONNEL", "SYSTEM_ADMIN"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted to Faculty and Administrator roles."
        )
    return current_user

def get_current_paper_trail_reader(current_user: models.User = Depends(get_current_user)) -> models.User:
    """Allows campus personnel to view Paper Trail while reserving mutations for its custodian."""
    if role_of(current_user) not in {"PERSONNEL", "SYSTEM_ADMIN"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted to authorized campus personnel."
        )
    return current_user

def get_current_document_controller(current_user: models.User = Depends(get_current_user)) -> models.User:
    """Enforces sole operational custody of campus document-tracking records."""
    if not permissions_for(current_user)["paper_trail.control"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Document control permission is required."
        )
    return current_user



# ─────────────────────────────────────────────────────────────────────────────
# HEALTH
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/")
def read_root():
    return {"message": "Welcome to the CTU Knowledge System API! The server is running perfectly."}

@app.get("/test-db")
def test_db_connection(
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_admin),
):
    """Administrator-only connectivity check without database details."""
    try:
        db.execute(text("SELECT 1"))
        return {"status": "ok"}
    except Exception:
        raise HTTPException(status_code=503, detail="Database connectivity check failed.")
    
@app.post("/auth/send-otp")
def send_otp(request: Request, req: SendOTPRequest, db: Session = Depends(get_db)):
    # Rate Limit Enforcement: Max 3 OTP requests per 5 minutes per IP
    limiter.check(request, key_name="send_otp", max_requests=3, window_seconds=300)

    # 1. Check if email is already taken
    existing_user = db.query(models.User).filter(models.User.email == req.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="This email is already registered.")

    # 2. Generate OTP and Expiration
    otp = utils.generate_otp()
    expiration = utc_now() + timedelta(minutes=10)

    # 3. Update or create OTP record
    record = db.query(models.OTPVerification).filter(models.OTPVerification.email == req.email).first()
    if record:
        record.otp_code = otp
        record.expires_at = expiration
    else:
        record = models.OTPVerification(email=req.email, otp_code=otp, expires_at=expiration)
        db.add(record)
    db.commit()

    # 4. Send Email
    try:
        utils.send_otp_email(req.email, otp)
        return {"message": "Verification code sent to email."}
    except Exception as e:
        print(f"SMTP Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to send verification email. Please try again.")

@app.post("/auth/verify-otp")
def verify_otp(req: VerifyOTPRequest, db: Session = Depends(get_db)):
    record = db.query(models.OTPVerification).filter(models.OTPVerification.email == req.email).first()
    
    if not record or record.otp_code != req.otp_code:
        raise HTTPException(status_code=400, detail="Invalid verification code.")
    
    if utc_now() > record.expires_at:
        raise HTTPException(status_code=400, detail="This verification code has expired. Please request a new one.")

    return {"message": "Email verified successfully!"}
    

# ─────────────────────────────────────────────────────────────────────────────
# AUTH — REGISTER
# ─────────────────────────────────────────────────────────────────────────────

@app.post("/register", status_code=status.HTTP_201_CREATED)
def register_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    # 1. Duplicate check
    requested_role = "PERSONNEL" if user.role.upper() == "FACULTY" else user.role.upper()
    if requested_role not in {"STUDENT", "PERSONNEL"} or user.is_iqa_auditor or user.administrative_office:
        raise HTTPException(403, "Privileged roles and office assignments require a System Administrator.")
    existing_user = db.query(models.User).filter(models.User.email == user.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    # 2. Hash password — students are auto-verified, faculty require admin approval
    hashed_pwd  = utils.hash_password(user.password)
    auto_verify = requested_role == "STUDENT"

    # 3. Persist user
    new_user = models.User(
        email=user.email,
        full_name=user.full_name,
        hashed_password=hashed_pwd,
        role=requested_role, department=None, administrative_office=None, is_iqa_auditor=False,
        is_verified=auto_verify
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # 4. Student profile
    if requested_role == "STUDENT":
        new_student_profile = models.StudentProfile(
            user_id=new_user.id,
            course=user.course,
            year_level=user.year
        )
        db.add(new_student_profile)
        db.commit()
    elif user.department:
        program = db.query(models.AcademicProgram).filter(models.AcademicProgram.code == user.department).first()
        if program:
            db.add(models.UserAssignment(
                user_id=new_user.id, assignment_type="FACULTY_MEMBER", scope_type="PROGRAM",
                scope_id=program.id, is_primary=True, is_active=True,
            ))
            db.commit()

    # 5. Audit log
    try:
        supabase.table("system_events_logs").insert({
            "user_email":  new_user.email,
            "event_type":  "Account Creation",
            "description": f"New {new_user.role} account registered: {new_user.full_name}"
        }).execute()
    except Exception as exc:
        print(f"[register] audit log failed: {exc}")

    # 6. Notifications — role-specific, correct recipients only
    role_upper = new_user.role

    if role_upper == "PERSONNEL":
        # ── Tell the registering faculty member their status ──
        _send_notification(
            user_email=new_user.email,
            n_type="info",
            title="Account Pending Verification",
            message=(
                f"Hi {new_user.full_name or 'there'}! Your personnel account has been registered "
                "and is awaiting administrator verification. You'll be notified once approved."
            ),
        )
        # ── Notify ONLY admins (NOT other faculty, NOT students) ──
        _notify_all_admins(
            db=db,
            n_type="warning",
            title="New Personnel Account Awaiting Verification",
            message=(
                f"{new_user.full_name} ({new_user.email}) has registered as Personnel "
                "and is pending your verification. Go to Users & Roles to accept or decline."
            ),
        )

    elif role_upper == "STUDENT":
        # ── Welcome the student ──
        _send_notification(
            user_email=new_user.email,
            n_type="success",
            title="Welcome to CTU Argao KMS!",
            message=(
                f"Hi {new_user.full_name or 'there'}! Your student account is active. "
                "You can now access the Knowledge Repository, Ask Policy, and more."
            ),
        )
        # ── Notify ONLY admins (NOT faculty, NOT other students) ──
        _notify_all_admins(
            db=db,
            n_type="info",
            title="New Student Registered",
            message=(
                f"{new_user.full_name} ({new_user.email}) has created a new student account."
            ),
        )

    return _serialize_user(new_user, db)


# ─────────────────────────────────────────────────────────────────────────────
# AUTH — LOGIN
# ─────────────────────────────────────────────────────────────────────────────

@app.post("/login", response_model=schemas.Token)
def login_user(
    request: Request,
    response: Response,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    # Anti-Brute-Force Rate Limiting: Max 5 login attempts per minute per IP
    limiter.check(request, key_name="login_attempt", max_requests=5, window_seconds=60)

    user = _get_user_by_email(form_data.username, db)

    if not user or not utils.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if user.status == "Disabled":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been disabled. Please contact the system administrator."
        )

    if not user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your Personnel account is currently pending System Administrator verification."
        )

    access_token = utils.create_access_token(data={"sub": user.email, "role": user.role})

    # Set HttpOnly, SameSite cookie so browser handles authentication securely without JS access
    response.set_cookie(
        key="access_token",
        value=f"Bearer {access_token}",
        httponly=True,
        max_age=60 * 60 * 8, # 8 hours
        samesite="lax",
        # The presentation container is normally reached over HTTP via the
        # host's hotspot IP. Secure cookies are opt-in so browsers do not
        # silently drop the session on that HTTP connection. Set
        # COOKIE_SECURE=true when the app is served over HTTPS.
        secure=os.getenv("COOKIE_SECURE", "false").lower() == "true",
    )
    response.set_cookie(
        key="csrf_token",
        value=secrets.token_urlsafe(32),
        httponly=False,
        max_age=60 * 60 * 8,
        samesite="lax",
        secure=os.getenv("COOKIE_SECURE", "false").lower() == "true",
    )

    # Audit log
    try:
        supabase.table("system_events_logs").insert({
            "user_email":  user.email,
            "event_type":  "Authentication",
            "description": "User successfully logged in"
        }).execute()
    except Exception as exc:
        print(f"[login] audit log failed: {exc}")

    user_dept = getattr(user, "department", None)
    student_profile = getattr(user, "student_profile", None)
    if getattr(user, "role", "") == "STUDENT" and student_profile:
        user_dept = getattr(student_profile, "course", user_dept)
    if not user_dept:
        user_dept = "ADMIN" if getattr(user, "role", "") == "ADMIN" else "Unassigned"

    return {
        "token_type":   "bearer",
        "full_name":    getattr(user, "full_name", None) or "CTU User",
        "email":        getattr(user, "email", form_data.username),
        "role":         role_of(user),
        "department":   user_dept,
        "administrative_office": getattr(user, "administrative_office", "") or "",
        "is_iqa_auditor": bool(getattr(user, "is_iqa_auditor", False)),
        "created_by_admin": bool(getattr(user, "created_by_admin", False)),
        "email_changed": bool(getattr(user, "email_changed", False)),
    }


@app.post("/logout")
def logout_user(response: Response):
    """Clears HttpOnly auth cookie on logout."""
    response.delete_cookie(key="access_token", samesite="lax")
    response.delete_cookie(key="csrf_token", samesite="lax")
    return {"message": "Successfully logged out."}



# ─────────────────────────────────────────────────────────────────────────────
# PASSWORD RESET
# ─────────────────────────────────────────────────────────────────────────────

@app.post("/send-reset-email")
def send_reset_email(
    payload: ForgotPasswordRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    limiter.check(request, key_name="password_reset", max_requests=3, window_seconds=300)
    user = db.query(models.User).filter(models.User.email == payload.email).first()

    # Avoid disclosing whether an account exists to unauthenticated callers.
    response = {"message": "If that email is registered, a verification code has been sent."}
    if not user:
        return response

    otp = utils.generate_otp()
    expiration = utc_now() + timedelta(minutes=10)
    record = db.query(models.OTPVerification).filter(models.OTPVerification.email == user.email).first()
    if record:
        record.otp_code = otp
        record.expires_at = expiration
    else:
        db.add(models.OTPVerification(email=user.email, otp_code=otp, expires_at=expiration))
    db.commit()

    try:
        utils.send_forgot_password_email(user.email, otp)
    except Exception:
        raise HTTPException(status_code=500, detail="Unable to send the verification code. Please try again later.")
    return response


@app.post("/update-password")
def update_password(request: UpdatePasswordRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == request.email).first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired verification code")

    try:
        reset_claims = utils.decode_password_reset_token(request.reset_token, str(request.email))
    except Exception:
        raise HTTPException(status_code=400, detail="Your verified reset session has expired. Request a new code.")

    try:
        utils.enforce_password_policy(request.new_password)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    record = db.query(models.OTPVerification).filter(models.OTPVerification.email == user.email).first()
    if (
        not record
        or utc_now() > record.expires_at
        or not utils.password_reset_token_matches_code(reset_claims, record.otp_code)
    ):
        raise HTTPException(status_code=400, detail="Invalid or expired verification code")

    try:
        user.hashed_password = utils.hash_password(request.new_password)
        db.delete(record)
        db.add(user)
        db.commit()
        db.refresh(user)

        _send_notification(
            user_email=request.email,
            n_type="warning",
            title="Password Changed",
            message=(
                "Your account password was recently changed. "
                "If you did not do this, contact the administrator immediately."
            ),
        )

        return {"message": "Password updated successfully!"}
    except Exception as e:
        db.rollback()
        print(f"CRITICAL DB ERROR: {str(e)}")
        raise HTTPException(status_code=500, detail="Could not update database")


@app.post("/verify-reset-code")
def verify_password_reset_code(
    payload: VerifyPasswordResetCodeRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    """Verify the emailed code before showing the new-password step."""
    limiter.check(request, key_name="verify_password_reset", max_requests=5, window_seconds=300)
    user = db.query(models.User).filter(models.User.email == payload.email).first()
    record = db.query(models.OTPVerification).filter(
        models.OTPVerification.email == payload.email
    ).first()
    if (
        not user
        or not record
        or utc_now() > record.expires_at
        or not secrets.compare_digest(record.otp_code, payload.otp_code)
    ):
        raise HTTPException(status_code=400, detail="Invalid or expired verification code")

    return {
        "message": "Verification code confirmed.",
        "reset_token": utils.create_password_reset_token(user.email, record.otp_code),
    }


# ─────────────────────────────────────────────────────────────────────────────
# USER MANAGEMENT
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/users")
def get_all_users(
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_admin)
):
    if _DB_IS_AVAILABLE:
        try:
            return [_serialize_user(user, db) for user in db.query(models.User).order_by(models.User.created_at.desc()).all()]
        except Exception:
            pass
    try:
        res = supabase.table("users").select("*").execute()
        from types import SimpleNamespace
        result = []
        for row in res.data or []:
            data = dict(row)
            data.setdefault("department", None); data.setdefault("administrative_office", None)
            data.setdefault("is_iqa_auditor", False); data.setdefault("created_by_admin", False)
            data.setdefault("email_changed", False); data.setdefault("is_verified", False)
            data.setdefault("status", "Active"); data.setdefault("created_at", None)
            result.append(_serialize_user(SimpleNamespace(**data), db))
        return result
    except Exception as sb_err:
        print(f"[Users Error]: {sb_err}")
        return []


@app.post("/users", status_code=status.HTTP_201_CREATED)
def create_user(
    payload: UserCreateRequest,
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_admin),
):
    email = payload.email.strip().lower()
    if db.query(models.User).filter(models.User.email == email).first():
        raise HTTPException(status_code=409, detail="A user with this email already exists.")
    requested_role = payload.role.upper()
    if requested_role not in ROLES:
        raise HTTPException(status_code=400, detail="Invalid user role.")
    if requested_role != "PERSONNEL" and payload.assignments:
        raise HTTPException(400, "Only Personnel accounts can receive scoped assignments.")
    normalized_assignments = _validate_and_normalize_assignments(db, payload.assignments) if requested_role == "PERSONNEL" else []
    user = models.User(
        full_name=payload.full_name.strip(), email=email,
        hashed_password=utils.hash_password(payload.password),
        role=requested_role,
        department=None, administrative_office=None, is_iqa_auditor=False,
        is_verified=True, created_by_admin=True, status="Active",
    )
    db.add(user)
    db.flush()
    if normalized_assignments:
        _replace_user_assignments(db, user, payload.assignments)
    db.commit()
    db.refresh(user)
    return _serialize_user(user, db)


@app.put("/users/{user_id}/verify")
def verify_user(
    user_id: str,
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_admin)
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.is_verified = True
    db.commit()

    # Notify the faculty member — their account is now active
    _send_notification(
        user_email=user.email,
        n_type="success",
        title="Account Verified — You Can Now Log In",
        message=(
            "Your faculty account has been verified by the administrator. "
            "You now have full access to the CTU Argao Knowledge Management System."
        ),
    )

    return {"message": "User approved successfully!"}


@app.delete("/users/{user_id}")
def delete_user(
    user_id: str,
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_admin)
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    protect_last_system_admin(db, user)
    db.delete(user)
    db.commit()
    return {"message": "User rejected and removed successfully!"}


@app.put("/users/{user_id}/disable")
def disable_user(
    user_id: str,
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_admin)
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    protect_last_system_admin(db, user)
    user.status = "Disabled"
    db.commit()

    _send_notification(
        user_email=user.email,
        n_type="error",
        title="Account Disabled",
        message=(
            "Your account has been disabled by the system administrator. "
            "Please contact admin@ctu.edu.ph for assistance."
        ),
    )

    return {"message": f"Account for {user.full_name or user.email} has been disabled!"}


@app.put("/users/{user_id}/enable")
def enable_user(
    user_id: str,
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_admin)
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.status = "Active"
    db.commit()

    _send_notification(
        user_email=user.email,
        n_type="success",
        title="Account Re-enabled",
        message=(
            "Your account has been re-enabled by the administrator. "
            "You can now log in to the system."
        ),
    )

    return {"message": f"Account for {user.full_name or user.email} has been re-enabled!"}




@app.put("/users/{user_id}/details")
def update_user_details(
    user_id: str,
    payload: UserUpdateRequest,
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_admin),
):
    """Updates user administrative office and IQA Auditor role designation."""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    requested_role = (payload.role or role_of(user)).upper()
    if payload.role:
        if requested_role not in ROLES:
            raise HTTPException(status_code=400, detail="Invalid user role.")
        if requested_role != "SYSTEM_ADMIN" and is_system_admin(user):
            protect_last_system_admin(db, user)
        user.role = requested_role
    if requested_role != "PERSONNEL" and payload.assignments:
        raise HTTPException(400, "Only Personnel accounts can receive scoped assignments.")
    if requested_role != "PERSONNEL":
        _replace_user_assignments(db, user, [])
    elif payload.assignments is not None:
        _replace_user_assignments(db, user, payload.assignments if requested_role == "PERSONNEL" else [])
    if payload.email:
        existing = db.query(models.User).filter(models.User.email == payload.email, models.User.id != user_id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email already in use by another account.")
        user.email = payload.email
    if payload.full_name is not None:
        full_name = payload.full_name.strip()
        if not full_name:
            raise HTTPException(status_code=400, detail="Full name cannot be empty.")
        user.full_name = full_name
    db.commit()
    db.refresh(user)
    return {
        "message": "User administrative details updated successfully!",
        "user": {
            "id": str(user.id),
            "full_name": user.full_name,
            "email": user.email,
            "role": role_of(user),
            "department": user.department, "administrative_office": user.administrative_office,
            "is_iqa_auditor": bool(user.is_iqa_auditor), "assignments": assignments_of(_load_effective_assignments(user, db)),
        },
    }


# ─────────────────────────────────────────────────────────────────────────────
# DOCUMENTS — UPLOAD
# ─────────────────────────────────────────────────────────────────────────────

@app.post("/documents/check-duplicate")
def check_document_duplicate(
    request: DuplicateDocumentCheckRequest,
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_document_manager),
):
    require_general_repository_category(request.category)
    scope_type, scope_code, office, program = authorize_repository_scope(
        db, admin, request.scope_type, request.scope_code
    )
    result = classify_document_duplicate(
        request.file_sha256.lower(),
        request.document_name,
        office,
        program,
        request.upload_mode,
        scope_type,
        scope_code,
    )
    return duplicate_result_for_user(result, admin)


@app.post("/documents/check-duplicate-file")
async def check_document_duplicate_file(
    file: UploadFile = File(...),
    document_name: str = Form(...),
    category: str = Form(...),
    office: str = Form(...),
    program: str = Form("GLOBAL"),
    scope_type: str = Form(...),
    scope_code: Optional[str] = Form(None),
    upload_mode: str = Form("NEW_DOCUMENT"),
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_document_manager),
):
    """Fallback preflight for browsers where Web Crypto is unavailable."""
    if upload_mode not in {"NEW_DOCUMENT", "NEW_VERSION"}:
        raise HTTPException(400, "Invalid upload mode.")
    require_general_repository_category(category)
    resolved_type, resolved_code, resolved_office, resolved_program = authorize_repository_scope(
        db, admin, scope_type, scope_code
    )
    contents = await read_upload_limited(file)
    result = classify_document_duplicate(
        hashlib.sha256(contents).hexdigest(),
        document_name,
        resolved_office,
        resolved_program,
        upload_mode,
        resolved_type,
        resolved_code,
    )
    return duplicate_result_for_user(result, admin)

@app.post("/upload-document")
async def upload_document(
    background_tasks: BackgroundTasks,
    file:             UploadFile = File(...),
    name:             str = Form(...),
    category:         str = Form(...),
    office:           str = Form(...),
    program:          str = Form("GLOBAL"),
    scope_type:       str = Form(...),
    scope_code:       Optional[str] = Form(None),
    version:          str = Form(...),
    effectivity_date: str = Form(...),
    allow_cross_scope_duplicate: bool = Form(False),
    uploaded_by:      str = Form(None),   # pass userEmail from the frontend
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_document_manager),
):
    require_general_repository_category(category)
    scope_type, scope_code, office, program = authorize_repository_scope(
        db, admin, scope_type, scope_code
    )
    uploaded_by = admin.email
    registry_id = None
    stored_file_reference = None
    processing_queued = False
    try:
        # Validate file type early (before reading)
        filename_lower = file.filename.lower()
        if not filename_lower.endswith((".pdf", ".png", ".jpg", ".jpeg", ".txt", ".docx", ".html")):
            raise HTTPException(status_code=400, detail="Unsupported file format. Please upload PDF, DOCX, TXT, HTML, or Image.")

        contents = await read_upload_limited(file)

        file_sha256 = hashlib.sha256(contents).hexdigest()
        duplicate = classify_document_duplicate(
            file_sha256, name, office, program, "NEW_DOCUMENT", scope_type, scope_code
        )
        if duplicate["code"] in {"EXACT_DUPLICATE", "POSSIBLE_NEW_VERSION"}:
            raise duplicate_http_exception(duplicate_result_for_user(duplicate, admin))
        if duplicate["code"] == "CROSS_SCOPE_DUPLICATE" and not allow_cross_scope_duplicate:
            raise duplicate_http_exception(duplicate_result_for_user(duplicate, admin))

        registry_id = reserve_document_upload(
            file_sha256=file_sha256,
            file_size=len(contents),
            original_filename=file.filename,
            document_name=name,
            category=category,
            office=office,
            program=program,
            scope_type=scope_type,
            scope_code=scope_code,
            version=version,
            upload_mode="NEW_DOCUMENT",
            uploaded_by=uploaded_by,
        )

        # ── 1. Upload file to Supabase Storage immediately (synchronous) ──
        safe_filename = re.sub(r"[^A-Za-z0-9._-]+", "_", os.path.basename(file.filename))
        unique_filename = f"repository/{uuid.uuid4()}_{safe_filename}"

        supabase.storage.from_("documents").upload(
            file=contents,
            path=unique_filename,
            file_options={"content-type": file.content_type or "application/pdf"}
        )
        stored_file_reference = unique_filename
        evidence_id = uuid.uuid4()

        metadata = {
            "name":             name,
            "category":         category,
            "office":           office,
            "program":          program or "GLOBAL",
            "scope_type":       scope_type,
            "scope_code":       scope_code,
            "version":          version,
            "effectivity_date": effectivity_date,
            "upload_date":      datetime.now().isoformat(),
            "storage_path":     unique_filename,
            "file_url":         stored_file_reference,
            "status":           "Active",
            "uploaded_by":      uploaded_by or "Unknown",
            "file_sha256":      file_sha256,
            "file_size":        len(contents),
            "original_filename": os.path.basename(file.filename),
            "upload_registry_id": registry_id,
        }
        job_id = str(uuid.uuid4())
        metadata["job_id"] = job_id
        update_document_upload_registry(
            registry_id,
            "PROCESSING",
            storage_path=stored_file_reference,
            job_id=job_id,
        )
        _processing_status[job_id] = {"job_id": job_id, "office": office, "name": name, "status": "queued", "message": "Upload queued for background processing.", "updated_at": utc_now().isoformat()}

        # ── 2. Defer OCR + vector embedding to dedicated worker pool ─────
        background_tasks.add_task(
            queue_document_processing,
            contents=contents,
            filename=file.filename,
            content_type=file.content_type or "application/pdf",
            metadata=metadata,
        )
        processing_queued = True

        # ── 3. Send notifications synchronously (fast DB writes) ──────────
        _notify_all_admins(
            db=db,
            n_type="info",
            title="New Document Added to Repository",
            message=f"'{name}' (v{version}) was uploaded under {office} — {category}.",
        )

        _notify_non_admin(
            db=db,
            n_type="info",
            title="New Document Available",
            message=(
                f"A new document '{name}' (v{version}) has been added to the "
                f"Knowledge Repository under {category}. Check it out now."
            ),
        )

        # ── 4. Return immediately — OCR/embedding runs in background ─────
        return {
            "job_id": job_id,
            "status": "queued",
            "message": f"'{name}' uploaded successfully! Text extraction and indexing are running in the background.",
            "details": f"File saved to Storage. Vector embedding is processing asynchronously."
        }

    except HTTPException:
        if registry_id and not processing_queued:
            update_document_upload_registry(registry_id, "FAILED", failure_reason="Upload was not completed.")
            if stored_file_reference:
                try:
                    supabase.storage.from_("documents").remove([stored_file_reference])
                except Exception:
                    _log.exception("duplicate_upload_storage_cleanup_failed", extra={"storage_path": stored_file_reference})
        raise
    except Exception as e:
        if registry_id and not processing_queued:
            update_document_upload_registry(registry_id, "FAILED", failure_reason="Storage upload or queueing failed.")
            if stored_file_reference:
                try:
                    supabase.storage.from_("documents").remove([stored_file_reference])
                except Exception:
                    _log.exception("document_upload_storage_cleanup_failed", extra={"storage_path": stored_file_reference})
        _log.exception("document_upload_failed", extra={"request_id": _request_id.get(), "filename": file.filename, "name": name})
        raise HTTPException(status_code=500, detail=f"Document upload failed. Request ID: {_request_id.get()}") from e


@app.get("/documents/processing-status")
def get_document_processing_status(
    job_id: Optional[str] = Query(None),
    admin: models.User = Depends(get_document_manager),
):
    """Return recent upload states, optionally narrowed to one upload job."""
    cutoff = utc_now().timestamp() - 3600
    recent = []
    for item in _processing_status.values():
        if not is_system_admin(admin) and not can_access_office(admin, item.get("office")):
            continue
        if job_id and item.get("job_id") != job_id:
            continue
        try:
            if datetime.fromisoformat(item.get("updated_at", "").replace("Z", "+00:00")).timestamp() < cutoff:
                continue
        except Exception:
            pass
        recent.append(item)
    return sorted(recent, key=lambda item: item.get("updated_at", ""), reverse=True)


@app.post("/upload-new-version")
async def upload_new_version(
    background_tasks: BackgroundTasks,
    file:                 UploadFile = File(...),
    old_document_name:    str = Form(...),
    new_version:          str = Form(...),
    new_effectivity_date: str = Form(...),
    office:               Optional[str] = Form(None),
    program:              Optional[str] = Form(None),
    allow_cross_scope_duplicate: bool = Form(False),
    uploaded_by:          str = Form(None),
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_document_manager),
):
    uploaded_by = admin.email
    registry_id = None
    stored_file_reference = None
    processing_queued = False
    require_document_name_access(admin, old_document_name)
    try:
        # ── 1. Validate file type early ───────────────────────────────────
        filename_lower = file.filename.lower()
        if not filename_lower.endswith((".pdf", ".png", ".jpg", ".jpeg", ".txt", ".docx", ".html")):
            raise HTTPException(status_code=400, detail="Unsupported file format.")

        # ── 2. Resolve the active document in the requested scope ─────────
        rows = (
            supabase.table("document_sections")
            .select("metadata")
            .eq("metadata->>name", old_document_name)
            .execute()
        ).data or []
        candidates = []
        for row in rows:
            metadata = row.get("metadata") or {}
            if metadata.get("status") != "Active":
                continue
            if office and normalize_document_identity(metadata.get("office")) != normalize_document_identity(office):
                continue
            if program and normalize_document_identity(metadata.get("program") or "GLOBAL") != normalize_document_identity(program):
                continue
            candidates.append(metadata)
        if not candidates:
            raise HTTPException(status_code=404, detail="Old document not found in database.")

        old_metadata = candidates[0]
        if not can_manage_document(admin, old_metadata):
            raise HTTPException(403, "You can only update documents in your assigned office, college, or program.")
        category = old_metadata.get("category", "Policy")
        require_general_repository_category(category)
        resolved_office = old_metadata.get("office", "Academic Affairs")
        resolved_program = old_metadata.get("program") or "GLOBAL"
        resolved_scope_type, resolved_scope_code = document_scope(old_metadata)

        # ── 3. Hash and reserve before Storage or version state changes ───
        contents = await read_upload_limited(file)
        file_sha256 = hashlib.sha256(contents).hexdigest()
        duplicate = classify_document_duplicate(
            file_sha256,
            old_document_name,
            resolved_office,
            resolved_program,
            "NEW_VERSION",
            resolved_scope_type,
            resolved_scope_code,
        )
        if duplicate["code"] == "EXACT_DUPLICATE":
            raise duplicate_http_exception(duplicate_result_for_user(duplicate, admin))
        if duplicate["code"] == "CROSS_SCOPE_DUPLICATE" and not allow_cross_scope_duplicate:
            raise duplicate_http_exception(duplicate_result_for_user(duplicate, admin))

        registry_id = reserve_document_upload(
            file_sha256=file_sha256,
            file_size=len(contents),
            original_filename=file.filename,
            document_name=old_document_name,
            category=category,
            office=resolved_office,
            program=resolved_program,
            scope_type=resolved_scope_type,
            scope_code=resolved_scope_code,
            version=new_version,
            upload_mode="NEW_VERSION",
            uploaded_by=uploaded_by,
        )

        # ── 4. Store the replacement without overwriting the old object ───
        safe_filename = re.sub(r"[^A-Za-z0-9._-]+", "_", os.path.basename(file.filename))
        unique_filename = f"repository/{uuid.uuid4()}_{safe_filename}"

        supabase.storage.from_("documents").upload(
            file=contents,
            path=unique_filename,
            file_options={"content-type": file.content_type or "application/pdf"}
        )
        stored_file_reference = unique_filename
        job_id = str(uuid.uuid4())

        new_metadata = dict(old_metadata)
        new_metadata.update({
            "name":             old_document_name,
            "category":         category,
            "office":           resolved_office,
            "program":          resolved_program,
            "scope_type":       resolved_scope_type,
            "scope_code":       resolved_scope_code,
            "version":          new_version,
            "effectivity_date": new_effectivity_date,
            "upload_date":      datetime.now().isoformat(),
            "storage_path":     unique_filename,
            "file_url":         stored_file_reference,
            "job_id":           job_id,
            "status":           "Active",
            "uploaded_by":      uploaded_by or "Unknown",
            "file_sha256":      file_sha256,
            "file_size":        len(contents),
            "original_filename": os.path.basename(file.filename),
            "upload_registry_id": registry_id,
            "supersede_previous_version": True,
        })

        update_document_upload_registry(
            registry_id,
            "PROCESSING",
            storage_path=stored_file_reference,
            job_id=job_id,
        )

        # ── 5. Defer OCR + vector embedding to dedicated worker pool ─────
        background_tasks.add_task(
            queue_document_processing,
            contents=contents,
            filename=file.filename,
            content_type=file.content_type or "application/pdf",
            metadata=new_metadata,
        )
        processing_queued = True

        # ── 6. Notifications synchronously ────────────────────────────────
        _notify_all_admins(
            db=db,
            n_type="info",
            title="Document Version Update Started",
            message=(
                f"Version {new_version} of '{old_document_name}' is being prepared. "
                "The current version will remain available until processing succeeds."
            ),
        )

        _notify_role(
            db=db,
            role="FACULTY",
            n_type="info",
            title="Document Version Update Started",
            message=(
                f"Version {new_version} of '{old_document_name}' is being prepared. "
                "It will replace the current version after processing succeeds."
            ),
        )

        # ── 7. Return immediately ─────────────────────────────────────────
        return {
            "job_id": job_id,
            "status": "queued",
            "message": "New version uploaded successfully and is being prepared in the background.",
        }

    except HTTPException:
        if registry_id and not processing_queued:
            update_document_upload_registry(registry_id, "FAILED", failure_reason="Version upload was not completed.")
            if stored_file_reference:
                try:
                    supabase.storage.from_("documents").remove([stored_file_reference])
                except Exception:
                    _log.exception("version_upload_storage_cleanup_failed", extra={"storage_path": stored_file_reference})
        raise
    except Exception as e:
        if registry_id and not processing_queued:
            update_document_upload_registry(registry_id, "FAILED", failure_reason="Version Storage upload or queueing failed.")
            if stored_file_reference:
                try:
                    supabase.storage.from_("documents").remove([stored_file_reference])
                except Exception:
                    _log.exception("version_upload_storage_cleanup_failed", extra={"storage_path": stored_file_reference})
        _log.exception("document_version_upload_failed", extra={"request_id": _request_id.get(), "filename": file.filename, "name": old_document_name})
        raise HTTPException(status_code=500, detail=f"Version upload failed. Request ID: {_request_id.get()}") from e

# ─────────────────────────────────────────────────────────────────────────────
# DOCUMENTS — LIST
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/documents")
def get_documents(
    category: Optional[str] = None,
    status: Optional[str] = None,
    current_user: models.User = Depends(get_current_user),
):
    try:
        all_rows = []
        for i in range(10):
            res = supabase.table("document_sections").select("metadata").order("id", desc=True).range(i*1000, (i+1)*1000 - 1).execute()
            if not res.data: break
            all_rows.extend(res.data)

        unique_docs = {}
        for row in all_rows:
            meta = row.get("metadata", {})
            if isinstance(meta, str):
                try:    meta = json.loads(meta)
                except: meta = {}

            if not can_read_document(current_user, meta):
                continue
            name = meta.get("name")
            scope_type, scope_code = document_scope(meta)
            document_key = (name, scope_type, scope_code)
            if not name or document_key in unique_docs:
                continue

            if current_user.role.upper() == "STUDENT" and is_student_hidden_category(meta.get("category")):
                continue
            if current_user.role.upper() == "STUDENT" and str(meta.get("status") or "Active").lower() not in {"active", "approved", "published"}:
                continue
            if meta.get("category") == "Forms / Templates" and str(meta.get("status") or "Active").lower() != "active" and not can_manage_templates(current_user):
                continue

            if category and meta.get("category") != category: continue
            if status and meta.get("status") != status: continue

            unique_docs[document_key] = {
                "can_manage": not is_governance_evidence(meta) and can_read_document(current_user, meta) and can_manage_document(current_user, meta),
                "id":               meta.get("id") or f"doc_{len(unique_docs) + 1}",
                "name":             name,
                "category":         meta.get("category",         ""),
                "office":           meta.get("office",           ""),
                "program":          meta.get("program",          "GLOBAL"),
                "scope_type":       scope_type,
                "scope_code":       scope_code,
                "version":          meta.get("version",          "1.0"),
                "effectivity_date": meta.get("effectivity_date", ""),
                "status":           meta.get("status",           "Active"),
                "approved_by":      meta.get("approved_by",      ""),
                "approved_at":      meta.get("approved_at",      ""),
                "admin_feedback":   meta.get("admin_feedback",   ""),
                "file_url":         get_fresh_private_file_url(
                    meta.get("file_url"), meta.get("storage_path")
                ),
                "upload_date":      meta.get("upload_date",      ""),
                "uploaded_by":      meta.get("uploaded_by",      "Unknown"),
                "template_code":    meta.get("template_code"),
                "template_revision": meta.get("template_revision"),
                "page_size":        meta.get("page_size"),
                "orientation":      meta.get("orientation"),
                "field_schema":     meta.get("field_schema"),
            }
        return list(unique_docs.values())
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
        raise HTTPException(status_code=500, detail="Failed to fetch documents")


@app.get("/documents/file-url")
def get_document_file_url(
    document_name: str = Query(..., min_length=1),
    version: Optional[str] = Query(None),
    scope_type: Optional[str] = Query(None),
    scope_code: Optional[str] = Query(None),
    current_user: models.User = Depends(get_current_user),
):
    """Return a fresh authorized signed URL for a repository document.

    Stored Supabase signed URLs expire after a short period, so callers must
    resolve the storage path from metadata and request a new URL at open time.
    """
    try:
        response = (
            supabase.table("document_sections")
            .select("metadata")
            .eq("metadata->>name", document_name.strip())
            .limit(100)
            .execute()
        )
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Document storage is temporarily unavailable.") from exc

    candidates = []
    for row in response.data or []:
        metadata = row.get("metadata") or {}
        if isinstance(metadata, str):
            try:
                metadata = json.loads(metadata)
            except Exception:
                metadata = {}
        if metadata.get("name") != document_name.strip():
            continue
        if version and str(metadata.get("version", "")) != str(version):
            continue
        metadata_scope = document_scope(metadata)
        if scope_type and metadata_scope[0] != scope_type.upper():
            continue
        if scope_code and metadata_scope[1] != scope_code:
            continue
        if current_user.role.upper() == "STUDENT":
            if is_student_hidden_category(metadata.get("category")):
                continue
            if str(metadata.get("status") or "Active").strip().lower() not in {"active", "approved", "published"}:
                continue
        if can_read_document(current_user, metadata):
            candidates.append(metadata)

    if not candidates:
        raise HTTPException(status_code=404, detail="Document not found or access is not permitted.")

    # Prefer an active/current record when several chunk rows contain metadata.
    candidates.sort(
        key=lambda item: (
            str(item.get("status", "")).strip().lower() in {"active", "approved", "published"},
            str(item.get("upload_date", "")),
        ),
        reverse=True,
    )
    metadata = candidates[0]
    storage_path = metadata.get("storage_path") or get_private_storage_path(metadata.get("file_url"))
    if not storage_path:
        raise HTTPException(status_code=404, detail="Document storage path is missing.")

    fresh_url = create_private_file_url(storage_path)
    if not fresh_url:
        raise HTTPException(status_code=503, detail="Could not create a temporary document URL.")

    return {
        "file_url": fresh_url,
        "name": metadata.get("name", document_name.strip()),
        "version": metadata.get("version", "1.0"),
    }



# ─────────────────────────────────────────────────────────────────────────────
# DOCUMENTS — UPDATE METADATA
# ─────────────────────────────────────────────────────────────────────────────

@app.put("/documents/update")
def update_document(
    request: UpdateDocumentRequest,
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_document_manager),
):
    require_document_name_access(admin, request.old_name)
    try:
        res = supabase.table("document_sections").select("id, metadata").eq("metadata->>name", request.old_name).execute()
        matching_rows = [
            row for row in (res.data or [])
            if document_scope(row.get("metadata") or {}) == (request.old_scope_type.upper(), request.old_scope_code)
        ]
        if not matching_rows:
            raise HTTPException(status_code=404, detail="Document not found")

        base_metadata = matching_rows[0]['metadata']
        if not can_manage_document(admin, base_metadata):
            raise HTTPException(403, "You cannot edit a document outside your assigned scope.")
        require_general_repository_category(request.category)
        scope_type, scope_code, office, program = authorize_repository_scope(
            db, admin, request.scope_type, request.scope_code
        )

        base_metadata["name"]             = request.new_name
        base_metadata["category"]         = request.category
        base_metadata["office"]           = office
        base_metadata["program"]          = program
        base_metadata["scope_type"]       = scope_type
        base_metadata["scope_code"]       = scope_code
        base_metadata["version"]          = request.version
        base_metadata["effectivity_date"] = request.effectivity_date

        registry_id = base_metadata.get("upload_registry_id")
        if registry_id:
            supabase.table("document_uploads").update({
                "document_name": request.new_name.strip(),
                "normalized_name": normalize_document_identity(request.new_name),
                "category": request.category,
                "office": office,
                "program": program,
                "scope_type": scope_type,
                "scope_code": scope_code,
                "scope_key": document_scope_key(office, program, scope_type, scope_code),
                "version": request.version,
                "updated_at": utc_now().isoformat(),
            }).eq("id", registry_id).execute()

        for row in matching_rows:
            row_metadata = dict(row.get("metadata") or {})
            row_metadata.update(base_metadata)
            supabase.table("document_sections").update({"metadata": row_metadata}).eq("id", row["id"]).execute()

        # ── Notify faculty and admins of the edit ──
        if request.old_name != request.new_name:
            doc_label = f"'{request.old_name}' (renamed to '{request.new_name}')"
        else:
            doc_label = f"'{request.new_name}'"

        _notify_role(
            db=db,
            role="FACULTY",
            n_type="info",
            title="Document Information Updated",
            message=(
                f"{doc_label} has been updated in the Knowledge Repository. "
                "The latest details are now available."
            ),
        )
        _notify_all_admins(
            db=db,
            n_type="info",
            title="Document Information Updated",
            message=(
                f"{doc_label} has been updated in the Knowledge Repository. "
                "The latest details are now available."
            ),
        )

        return {"message": "Document metadata updated successfully!"}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Update error: {e}")
        raise HTTPException(status_code=500, detail="Failed to update document")


# ─────────────────────────────────────────────────────────────────────────────
# DOCUMENTS — ARCHIVE / DELETE
# ─────────────────────────────────────────────────────────────────────────────

@app.post("/documents/{doc_name}/approve")
def approve_document(
    doc_name: str,
    scope_type: str = Query(...),
    scope_code: str = Query(...),
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_document_manager),
):
    """Publish all chunks for a document after administrator review."""
    require_document_name_access(admin, doc_name)
    try:
        chunks = supabase.table("document_sections").select("id, metadata").eq("metadata->>name", doc_name).execute()
        scoped_chunks = [chunk for chunk in (chunks.data or []) if document_scope(chunk.get("metadata") or {}) == (scope_type.upper(), scope_code)]
        if not scoped_chunks:
            raise HTTPException(status_code=404, detail="Document not found in the knowledge repository.")
        for chunk in scoped_chunks:
            if not can_manage_document(admin, chunk.get("metadata") or {}):
                raise HTTPException(403, "This document is outside your assigned repository scope.")
        for chunk in scoped_chunks:
            metadata = chunk.get("metadata") or {}
            metadata["status"] = "Approved"
            metadata["approved_by"] = admin.email
            metadata["approved_at"] = datetime.now().isoformat()
            supabase.table("document_sections").update({"metadata": metadata}).eq("id", chunk["id"]).execute()
        return {"message": f"Document '{doc_name}' approved and published to the RAG index."}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Document approval error: {e}")
        raise HTTPException(status_code=500, detail="Failed to approve document.")

@app.delete("/documents/{doc_name}")
def archive_document(
    doc_name: str,
    scope_type: str = Query(...),
    scope_code: str = Query(...),
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_document_manager)
):
    require_document_name_access(admin, doc_name)
    try:
        # 1. Archive vector chunks in document_sections
        chunks_res = supabase.table("document_sections").select("id, metadata").eq("metadata->>name", doc_name).execute()
        scoped_chunks = [chunk for chunk in (chunks_res.data or []) if document_scope(chunk.get("metadata") or {}) == (scope_type.upper(), scope_code)]
        has_chunks = bool(scoped_chunks)
        for chunk in scoped_chunks:
            if not can_manage_document(admin, chunk.get("metadata") or {}):
                raise HTTPException(403, "This document is outside your assigned governance scope.")
            if is_governance_evidence(chunk.get("metadata") or {}):
                raise HTTPException(400, "Archive accreditation or ISO evidence from its Accreditation Support workflow.")

        if not has_chunks:
            raise HTTPException(status_code=404, detail="Document not found in the database.")

        if has_chunks:
            registry_ids = set()
            for chunk in scoped_chunks:
                chunk_meta = chunk.get('metadata') or {}
                chunk_meta['status'] = "Archived"
                if chunk_meta.get("upload_registry_id"):
                    registry_ids.add(str(chunk_meta["upload_registry_id"]))
                supabase.table("document_sections").update({"metadata": chunk_meta}).eq("id", chunk['id']).execute()
            for registry_id in registry_ids:
                update_document_upload_registry(registry_id, "ARCHIVED")

        db.commit()

        # 5. Notify faculty and admins of archive (students do not receive repository removals)
        _notify_role(
            db=db,
            role="FACULTY",
            n_type="warning",
            title="Document Removed from Repository",
            message=(
                f"'{doc_name}' has been archived and removed from active compliance."
            ),
        )
        _notify_all_admins(
            db=db,
            n_type="warning",
            title="Document Removed from Repository",
            message=(
                f"'{doc_name}' has been archived and removed from active compliance."
            ),
        )

        return {"message": f"Document '{doc_name}' successfully archived and linked QA compliance records re-evaluated!"}

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        print(f"Archive error: {e}")
        raise HTTPException(status_code=500, detail="Failed to archive document and sync QA records.")


# ─────────────────────────────────────────────────────────────────────────────
# ASK POLICY
# ─────────────────────────────────────────────────────────────────────────────

@app.post("/ask-policy")
def ask_policy(
    req: Request,
    request: QuestionRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    request_started_at = time.perf_counter()
    # RAG Query Rate Limiting: Max 15 questions per 1 minute per IP to prevent vector database scraping
    limiter.check(req, key_name="ask_policy", max_requests=15, window_seconds=60)

    raw_question = request.question or ""
    
    # 1000-character input limit guardrail
    if len(raw_question.strip()) > 1000:
        return {
            "answer": (
                f"⚠️ **Character Limit Exceeded**: Your query contains **{len(raw_question.strip())} characters**, "
                "which exceeds the maximum limit of **1000 characters**. "
                "Please shorten your question to focus on a specific policy or procedure and try again."
            ),
            "sources": [],
            "follow_ups": [],
            "restricted": False,
            "is_error": True
        }

    # SECURITY HARDENING: Sanitize input and detect prompt injection attempts
    question = sanitize_user_input(raw_question)
    is_injection, reason = check_prompt_injection(question)
    if is_injection:
        return {
            "answer": (
                "🛡️ **Security Guardrail Triggered**: Your query contains pattern signatures associated with "
                "prompt manipulation, system instruction override, or role bypass attempts. "
                "Please rephrase your question to ask directly about institutional policies."
            ),
            "sources": [],
            "restricted": False
        }

    # Identity and authorization always come from the verified server-side
    # account. The request body cannot select an email address or role.
    user_email = current_user.email
    user_role = role_of(current_user)

    # ==========================================
    # ROLE-BASED ACCESS CONFIGURATION
    # ==========================================
    # Define which document categories are restricted per role.
    # STUDENT → cannot access Accreditation Evidence (confidential).
    # FACULTY and ADMIN → full access to all categories.
    STUDENT_RESTRICTED_CATEGORIES = ["Accreditation Evidence"]

    # These categories are operational assets, not policy evidence. They are
    # excluded for every role and are never eligible for answer citations.
    NON_RAG_CATEGORIES = [
        "Form / Template", "Forms / Templates", "Branding Asset", "Branding Assets"
    ]
    excluded_categories = NON_RAG_CATEGORIES.copy()
    if user_role == "STUDENT":
        excluded_categories.extend(STUDENT_RESTRICTED_CATEGORIES)

    # Keywords that strongly indicate a query about restricted content.
    # Used to detect when a student is asking about a restricted topic
    # so we can return a clear explanation instead of a generic 'not found'.
    RESTRICTED_TOPIC_KEYWORDS = [
        "accreditation", "aaccup", "accredit", "self-survey",
        "survey instrument", "accreditation evidence",
        "area i", "area ii", "area iii", "area iv", "area v",
        "area vi", "area vii", "area viii", "area ix", "area x",
        "accreditation standard", "accreditor"
    ]

    # ==========================================
    # 1. FETCH DYNAMIC SETTINGS
    # ==========================================
    settings = db.query(models.SystemSettings).filter(models.SystemSettings.id == 1).first()
    
    # Provider choice affects generation only. Retrieval and access filtering
    # always run locally before any evidence can be sent to a cloud model.
    ai_provider = getattr(settings, "ai_provider", "local") if settings else "local"
    raw_model = getattr(settings, "ai_model", "llama3.1") if settings else "llama3.1"
    ai_model = "llama3.1" if raw_model in ["qwen-2.5-32b", "qwen-2.5-7b-instruct", "llama-3.1-8b-instant", "llama-3.3-70b-versatile", "openai/gpt-oss-120b", "qwen/qwen3-32b"] else raw_model
    groq_model = getattr(settings, "groq_model", "qwen/qwen3.8-27b") if settings else "qwen/qwen3.8-27b"
    ai_temp = getattr(settings, "ai_temperature", 0.3) if settings else 0.3
    base_prompt = getattr(settings, "ai_system_prompt", "") if settings else ""
    if not base_prompt:
        base_prompt = "You are the friendly and professional AskPolicy AI Assistant for Cebu Technological University (CTU) Argao Campus."

    # ==========================================
    # 2. FAST-PATH: GREETING DETECTOR
    # ==========================================
    q_lower = question.strip().lower()
    chat_pattern = r'^(hi|hello|hey|good morning|good afternoon|good evening|greetings)[.!?,]*$'
    
    if re.match(chat_pattern, q_lower):
        greeting_prompt = f"""{base_prompt}
        YOUR PERSONALITY: Warm, welcoming, and helpful.
        The user just said: "{question}"
        Respond with a brief, warm greeting and ask how you can help them with university policies today.
        
        FORMATTING RULE:
        You must separate your main answer from the follow-up questions using exactly this string: |FOLLOWUPS|
        Everything after |FOLLOWUPS| must be written from the STUDENT'S or USER'S point of view — questions
        THEY might type next to the assistant (e.g. "What is the deadline for adding subjects?").
        NEVER use this section to ask the user a clarifying question yourself. If you genuinely need more
        information to answer well, put that clarifying question inside your main answer instead, and leave
        the |FOLLOWUPS| section empty.
        Put each follow-up question on a new line. Do not number them.
        """
        
        try:
            response, provider_used = run_ai_chat(
                messages=[
                    {'role': 'system', 'content': greeting_prompt},
                    {'role': 'user', 'content': question},
                ],
                local_model=ai_model,
                groq_model=groq_model,
                provider_mode=ai_provider,
                temperature=0.5,
                max_tokens=180,
            )
            raw_answer = response.choices[0].message.content
            parts = raw_answer.split("|FOLLOWUPS|")
            answer = clean_ai_answer(parts[0])
            follow_ups = []
            if len(parts) > 1:
                follow_ups = [q.strip().lstrip('1234567890.- ') for q in parts[1].strip().split('\n') if q.strip()]
            
            # Save Chat History for Greeting
            from vector_store import supabase
            supabase.table("chat_history").insert({"user_email": user_email, "role": "user", "content": question}).execute()
            saved_response = supabase.table("chat_history").insert({"user_email": user_email, "role": "ai", "content": answer}).execute()
            response_id = saved_response.data[0]["id"] if saved_response.data else None
            
            return {"answer": answer, "sources": [], "follow_ups": follow_ups[:3], "response_id": response_id, "ai_provider": provider_used}
        except Exception as e:
            print(f"Greeting Error: {e}")

    # ==========================================
    # 3. ORIGINAL TOPIC CATEGORIZATION
    # ==========================================
    try:
        from vector_store import supabase
        topic = "General"
        if len(question.split()) <= 2 or any(w in q_lower for w in ["test", "asdf"]):
            topic = "Ignored"
        elif "grade" in q_lower or "pass" in q_lower or "fail" in q_lower or "unit" in q_lower: topic = "Grading"
        elif "research" in q_lower or "publish" in q_lower or "incentive" in q_lower: topic = "Research"
        elif "faculty" in q_lower or "teacher" in q_lower or "leave" in q_lower: topic = "Faculty"
        elif "admission" in q_lower or "enroll" in q_lower or "shift" in q_lower: topic = "Admissions"
        elif "uniform" in q_lower or "dress" in q_lower or "id" in q_lower: topic = "Dress Code"

        supabase.table("query_logs").insert({
            "query_text": question,
            "topic_category": topic
        }).execute()
    except Exception as e:
        print(f"Failed to log query: {e}")

    history = request.history or []
    recent_history = [h for h in history if h.content and h.content.strip()][-6:]

    # ==========================================
    # 4. CONVERSATIONAL QUERY EXPANSION & SPELL CHECK
    # ==========================================
    rewrite_started_at = time.perf_counter()
    if recent_history:
        history_summary = "\n".join([f"{'User' if h.role == 'user' else 'Assistant'}: {h.content}" for h in recent_history[-4:]])
        rewrite_prompt = f"""You are a search query optimizer for an institutional knowledge retrieval system.
Given the recent conversation history and a follow-up question, rephrase the follow-up question into a single, standalone, grammatically correct search query for a vector database.
Resolve any ambiguous pronouns or references (e.g. "it", "that", "the requirements", "the deadline", "how about that?") to the specific topic discussed.
Fix all typos.
Do NOT answer the question. ONLY output the optimized standalone search string.

Conversation History:
{history_summary}

Follow-up Question: "{question}"
Standalone Search Query:"""
        try:
            rewrite_response = local_ai_client.chat.completions.create(
                messages=[{'role': 'user', 'content': rewrite_prompt}],
                model=ai_model,
                temperature=0.0,
                max_tokens=120,
            )
            optimized_query = rewrite_response.choices[0].message.content.strip().strip('"')
        except Exception:
            optimized_query = question
    else:
        # A standalone question is already a valid retrieval query. Avoiding
        # an extra LLM rewrite call removes one full local inference step from
        # the common first-turn path and reduces timeout risk.
        optimized_query = question.strip()

    rewrite_elapsed_ms = round((time.perf_counter() - rewrite_started_at) * 1000)

    # ==========================================
    # 5. ROLE-AWARE RAG RETRIEVAL
    # ==========================================
    # Pass excluded_categories so the vector search itself skips restricted
    # documents — we don't waste retrieval slots and never leak context to the AI.
    retrieval_started_at = time.perf_counter()
    relevant_chunks = vector_store.search_knowledge(
        optimized_query, excluded_categories=excluded_categories
    )
    relevant_chunks = [chunk for chunk in relevant_chunks if can_read_document(current_user, chunk.get("metadata") or {})]
    retrieval_elapsed_ms = round((time.perf_counter() - retrieval_started_at) * 1000)

    # Do not spend an LLM call, or risk a guess, when retrieval evidence is
    # weak. The score is the hybrid semantic/lexical score from vector_store.
    best_score = max(
        (float(chunk.get('confidence_score') or 0.0) for chunk in relevant_chunks),
        default=0.0,
    )
    if relevant_chunks and best_score < 0.38:
        return {
            "answer": "I do not have enough verified evidence in the knowledge repository to answer that confidently. Please rephrase the question or ask the responsible office.",
            "sources": [],
            "follow_ups": [],
            "retrieval": {"best_score": round(best_score, 4), "answerable": False},
        }

    # Early exit: student is asking about a restricted topic.
    # Check this BEFORE the generic 'not found' so they get a clear reason.
    if user_role == "STUDENT" and excluded_categories:
        q_lower_check = (question + " " + optimized_query).strip().lower()
        is_restricted_query = any(kw in q_lower_check for kw in RESTRICTED_TOPIC_KEYWORDS)
        if is_restricted_query:
            return {
                "answer": "This information is restricted to faculty and administrators only. Accreditation documents are confidential and cannot be shared with students.",
                "sources": [],
                "follow_ups": [],
                "restricted": True
            }

    if not relevant_chunks:
        return {
            "answer": "I am sorry, but the specific document or policy regarding this matter is currently not available in our institutional knowledge repository.",
            "sources": [],
            "follow_ups": []
        }

    # Final safety net: only current, approved chunks may reach the answer
    # model or source cards. This protects against stale/legacy retrieval rows
    # and keeps displayed sources identical to the evidence used for generation.
    safe_chunks = []
    excluded_category_names = {normalize_category(value) for value in excluded_categories}
    for chunk in relevant_chunks:
        meta = chunk.get('metadata') or {}
        if isinstance(meta, str):
            import json
            try: meta = json.loads(meta)
            except: meta = {}
            
        status = meta.get('status')
        cat = normalize_category(meta.get('category'))
        
        if not is_rag_active_status(status):
            continue
        if is_non_rag_category(cat):
            continue
        if cat in excluded_category_names:
            continue
            
        safe_chunks.append(chunk)

    relevant_chunks = safe_chunks

    if not relevant_chunks:
        return {
            "answer": "I do not have enough verified evidence in the knowledge repository to answer that confidently. Please rephrase the question or consult the responsible office.",
            "sources": [],
            "follow_ups": [],
            "retrieval": {"best_score": 0.0, "answerable": False},
        }

    def _clean_chunk_text(text: str) -> str:
        if not text: return ""
        cleaned = re.sub(r'(?:\n|\r\n?)\s*\d+\s*(?:\n|\r\n?)', ' ', text)
        cleaned = re.sub(r'^\s*\d+\s*(?:\n|\r\n?)', '', cleaned)
        cleaned = re.sub(r'[ \t]+', ' ', cleaned)
        cleaned = re.sub(r'\n{3,}', '\n\n', cleaned)
        return cleaned.strip()

    def _extract_exact_relevant_snippet(chunk_content: str, q: str, max_chars: int = 280) -> str:
        cleaned = _clean_chunk_text(chunk_content)
        sentences = re.split(r'(?<=[.?!])\s+|\n+', cleaned)
        sentences = [s.strip() for s in sentences if len(s.strip()) > 15]
        if not sentences:
            return cleaned[:max_chars] + ("..." if len(cleaned) > max_chars else "")

        stop_words = {"what", "when", "where", "which", "who", "whom", "this", "that", "these", "those", "have", "from", "with", "about", "does", "the", "for", "and", "are", "how"}
        q_words = [w.lower() for w in re.findall(r'[A-Za-z0-9]{3,}', q) if w.lower() not in stop_words]

        scored_sentences = []
        for s in sentences:
            s_lower = s.lower()
            score = sum(1 for w in q_words if w in s_lower)
            scored_sentences.append((score, s))

        scored_sentences.sort(key=lambda x: x[0], reverse=True)
        if scored_sentences and scored_sentences[0][0] > 0:
            best = scored_sentences[0][1]
            return best[:max_chars] + ("..." if len(best) > max_chars else "")
        return sentences[0][:max_chars] + ("..." if len(sentences[0]) > max_chars else "")

    # Keep source metadata available for disambiguation (for example, a year
    # present in a filename but absent from the extracted body), while making
    # it explicit that metadata must never be echoed as answer prose.
    formatted_snippets = []
    for idx, chunk in enumerate(relevant_chunks, 1):
        cleaned_body = _clean_chunk_text(chunk['content'])
        chunk_meta = chunk.get('metadata') or {}
        source_hint = str(chunk_meta.get('name') or 'Institutional document')
        formatted_snippets.append(
            f"--- EVIDENCE {idx} (internal source hint: {source_hint}) ---\n{cleaned_body}\n"
        )
    context_text = "\n\n".join(formatted_snippets)

    # ==========================================
    # 6. ROLE-AWARE SYSTEM PROMPT (STRICTLY GROUNDED & ANTI-HALLUCINATION)
    # ==========================================
    role_context = {
        "STUDENT": (
            "The user is a STUDENT. Answer using verified public institutional documents "
            "such as the Student Handbook, academic catalog, grading guidelines, and general procedures. "
            "Accreditation evidence materials are confidential and must not be disclosed."
        ),
        "PERSONNEL": (
            "The user is CAMPUS PERSONNEL. Reference authorized institutional documents including "
            "the Faculty Manual, research policies, syllabus guidelines, and curriculum standards."
        ),
        "SYSTEM_ADMIN": (
            "The user is a SYSTEM ADMINISTRATOR. You have access to all verified institutional policies "
            "and administrative quality standards."
        ),
    }.get(user_role, "The user's role is unknown. Answer conservatively using only general public policies.")

    system_prompt = f"""You are the official AskPolicy AI Assistant for CTU Argao Campus. You are highly conversational, warm, and helpful, but you are strictly bound to the facts provided in the SOURCE DOCUMENTS.

USER ROLE: {role_context}

═══════════════════════════════════════════════════════════
CRITICAL RULES — NO EXCEPTIONS:
═══════════════════════════════════════════════════════════

RULE 1 — ZERO HALLUCINATION (STRICT GROUNDING).
Your answer must be derived EXCLUSIVELY from the SOURCE DOCUMENTS provided below. You must NEVER invent, assume, or pull from general outside knowledge. If only part of a multi-part question is supported, answer the supported parts and identify only the unsupported part. Do not refuse the entire question just because one requested detail is missing.

RULE 1A — NO INFERENCE OR SUBSTITUTE EVIDENCE.
Answer only what the retrieved source explicitly states. Do not infer a specific program objective from general university goals, infer mission values from a handbook, or use a related document as a substitute for the document requested by the user. Do not use phrases such as "we can infer," "may align," "likely," "probably," or "can be deduced" to fill missing evidence. If the requested fact is not explicitly stated, say that the evidence does not provide it.

RULE 2 — THE ERRATUM RULE (RESOLVE CONFLICTS BY EFFECTIVITY & CONTEXT).
If the SOURCE DOCUMENTS contain conflicting information about the same topic (e.g., an older 2024 Student Handbook vs. a 2026 VMGO Memo), you MUST evaluate the timeline logically. 
Use only the policy text in the evidence. If the evidence conflicts, explain the conflict cautiously and do not invent a date or version. Never use "According to" as a generic preface.

RULE 3 — EXACT METRICS & QUOTES.
When stating dates, percentages, grades, requirements, or deadlines, output them exactly as written in the latest source.

RULE 3A — CONTEXT AND FILENAME DISAMBIGUATION.
Internal source hints may contain a document name or year that helps identify which uploaded document the evidence came from. You may use that metadata to resolve the user's reference, such as treating "VMGO 2026" as the uploaded 2026 VMGO document even when the body text does not repeat the year. Do not present the filename, source hint, version, office, or effectivity date in the answer unless the user explicitly asks for source details. Never use metadata to invent facts that are absent from the evidence.

RULE 4 — FORMATTING.
- Begin immediately with the requested information. Omit introductions such as "can be found in the provided evidence" and comments about snippets or the answering process.
- For named statements such as Vision and Mission, use a short Markdown heading (### Vision, ### Mission), a blank line, then the exact statement as a paragraph. Preserve the official wording without paraphrasing or adding interpretation.
- Use numbered lists for procedures, bullets for requirements, and paragraphs for explanations. Avoid tables unless the user requests a comparison.
- Start with the direct answer. Do not start with "According to", a document header, or a long evidence summary.
- Use short paragraphs or bullets for steps and lists.
- For requests containing several items, answer each supported item in a clear bullet list.
- If evidence supports Vision, Mission, Goals, or Outcomes separately, provide each available section instead of returning a blanket "not enough evidence" response.
- Do not repeat title, office, version, effectivity date, or other document metadata unless the user asks for it or it is necessary to resolve a conflict.
- Do not add a references section. The interface supplies source cards from the exact evidence chunks used.
- If the evidence does not answer the question, say so clearly and do not guess.

RULE 5 — FOLLOW-UP QUESTIONS FORMAT.
After your main answer, add the separator |FOLLOWUPS| on its own line, then list up to 3 related questions a user might want to ask next (one per line, written from the user's perspective). Do not number them.

═══════════════════════════════════════════════════════════
SOURCE DOCUMENTS:
═══════════════════════════════════════════════════════════
{context_text}
═══════════════════════════════════════════════════════════
"""

    # ==========================================
    # 7. AI CALL WITH MULTI-TURN CONVERSATION PAYLOAD
    # ==========================================
    messages_payload = [{'role': 'system', 'content': system_prompt}]
    
    # Append recent conversation history so the LLM understands conversation context
    for msg in recent_history:
        msg_role = 'user' if msg.role == 'user' else 'assistant'
        messages_payload.append({'role': msg_role, 'content': msg.content})
        
    # Append latest user question
    messages_payload.append({'role': 'user', 'content': question})

    # Grounded temperature: 0.0 for strictly factual, deterministic answers
    grounded_temp = 0.0

    generation_started_at = time.perf_counter()
    try:
        response, provider_used = run_ai_chat(
            messages=messages_payload,
            local_model=ai_model,
            groq_model=groq_model,
            provider_mode=ai_provider,
            temperature=grounded_temp,
            max_tokens=600,
        )

        raw_answer = response.choices[0].message.content
        parts = raw_answer.split("|FOLLOWUPS|")
        answer = clean_ai_answer(parts[0])
        # Defensive cleanup for older/local models that still echo the former
        # source-header format despite the answer-format instructions.
        answer = re.sub(
            r"^\s*(?:according to\s+)?source document\s+\d+\s*\|.*?\|\s*office\s*:\s*[^,\n]+,\s*",
            "",
            answer,
            count=1,
            flags=re.IGNORECASE | re.DOTALL,
        ).strip()

        follow_ups = []
        if len(parts) > 1:
            raw_questions = parts[1].strip().split('\n')
            for q in raw_questions:
                clean_q = q.strip().lstrip('1234567890.- ')
                if clean_q:
                    follow_ups.append(clean_q)
                if len(follow_ups) == 3: break

        # Local models can still produce plausible speculation despite the
        # grounding prompt. Block common inference language unless the answer
        # is explicitly saying that the evidence is insufficient.
        speculation_markers = (
            "we can infer",
            "i can infer",
            "some inferences",
            "may align",
            "might align",
            "can be inferred",
            "can be deduced",
            "may be inferred",
            "likely",
            "probably",
            "presumably",
            "it appears that",
            "this suggests",
            "the evidence suggests",
        )
        explicit_uncertainty = (
            "not provided",
            "not stated",
            "not explicitly",
            "does not provide",
            "do not have enough",
            "cannot determine",
            "cannot answer",
            "insufficient evidence",
        )
        answer_lower = answer.lower()
        if (
            any(marker in answer_lower for marker in speculation_markers)
        ):
            _log.warning(
                "ask_policy_speculation_blocked",
                extra={"request_id": _request_id.get(), "model": ai_model},
            )
            answer = "I do not have enough verified evidence in the retrieved policy text to answer that confidently. The available documents do not explicitly state the requested fact, so I will not infer or substitute information from a related document."
            follow_ups = []

        # A deterministic post-generation grounding check catches responses
        # that sound fluent but are not materially supported by retrieved text.
        support_score = evidence_support(answer, [chunk.get("content", "") for chunk in relevant_chunks])
        if support_score < 0.20:
            answer = "I do not have enough verified evidence in the retrieved policy text to answer that confidently. Please rephrase the question or consult the responsible office."
            follow_ups = []

        generation_elapsed_ms = round((time.perf_counter() - generation_started_at) * 1000)
        _log.info(
            "ask_policy_timing",
            extra={
                "request_id": _request_id.get(),
                "rewrite_ms": rewrite_elapsed_ms,
                "retrieval_ms": retrieval_elapsed_ms,
                "generation_ms": generation_elapsed_ms,
                "total_ms": round((time.perf_counter() - request_started_at) * 1000),
                "model": ai_model,
                "ai_provider": provider_used,
                "source_count": len(relevant_chunks),
            },
        )
    except AIProviderUnavailable as e:
        _log.warning(
            "ask_policy_generation_failed",
            extra={
                "request_id": _request_id.get(),
                "rewrite_ms": rewrite_elapsed_ms,
                "retrieval_ms": retrieval_elapsed_ms,
                "generation_ms": round((time.perf_counter() - generation_started_at) * 1000),
                "total_ms": round((time.perf_counter() - request_started_at) * 1000),
                "model": ai_model,
            },
        )
        return {
            "answer": str(e),
            "sources": [],
            "follow_ups": [],
            "is_error": True,
            "ai_provider": "unavailable",
        }
    except Exception:
        _log.exception(
            "ask_policy_generation_processing_failed",
            extra={"request_id": _request_id.get(), "provider_mode": ai_provider},
        )
        return {
            "answer": "The AI response could not be processed. Please try again.",
            "sources": [],
            "follow_ups": [],
            "is_error": True,
            "ai_provider": "unavailable",
        }

    # ==========================================
    # 7. ORIGINAL SOURCE FORMATTING & SNIPPET EXTRACTION
    # ==========================================
    unique_sources = {}
    for chunk in relevant_chunks:
        meta = chunk.get('metadata') or {}
        source_name = f"{meta.get('name', 'Institutional Policy Document')} (v{meta.get('version', '1.0')}) - {meta.get('office', 'CTU Argao Office')}"
        try:
            raw_similarity = float(chunk.get('confidence_score', chunk.get('similarity', 0.0)))
            if not math.isfinite(raw_similarity):
                raw_similarity = 0.0
        except (ValueError, TypeError):
            raw_similarity = 0.0
        # Retrieval scores are cosine similarities in [0, 1]. Do not floor or
        # cap the value: a displayed percentage must reflect the actual score.
        relevance_percentage = round(max(0.0, min(1.0, raw_similarity)) * 100)
        existing = unique_sources.get(source_name)
        if existing is None or raw_similarity > existing["_score"]:
            unique_sources[source_name] = {
                "name": source_name,
                "snippet": _extract_exact_relevant_snippet(chunk.get('content', ''), question),
                "relevance": relevance_percentage,
                "_score": raw_similarity,
            }

    sources = [
        {key: value for key, value in source.items() if key != "_score"}
        for source in unique_sources.values()
    ]
    uncertainty_response = "I do not have enough verified evidence" in answer
    final_sources = sources if not uncertainty_response and "I am sorry" not in answer and "I'm sorry" not in answer and len(context_text) > 10 else []

    # ==========================================
    # 8. ORIGINAL CHAT HISTORY SAVING
    # ==========================================
    response_id = None
    try:
        supabase.table("chat_history").insert({"user_email": user_email, "role": "user", "content": question}).execute()
        saved_response = supabase.table("chat_history").insert({"user_email": user_email, "role": "ai", "content": answer}).execute()
        response_id = saved_response.data[0]["id"] if saved_response.data else None
    except Exception as e:
        print(f"Failed to save chat history: {e}")

    return {
        "answer": answer,
        "sources": final_sources,
        "follow_ups": follow_ups,
        "response_id": response_id,
        "ai_provider": provider_used,
        "retrieval": {
            "best_score": round(best_score, 4),
            "answerable": bool(final_sources),
            "source_count": len(final_sources),
            "evidence_support": round(evidence_support(answer, [chunk.get("content", "") for chunk in relevant_chunks]), 4),
        },
    }


# ─────────────────────────────────────────────────────────────────────────────
# BROADCAST ANNOUNCEMENT  ← FIXED
# ─────────────────────────────────────────────────────────────────────────────

@app.post("/admin/broadcast")
def broadcast_notification(
    request: BroadcastRequest,
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_admin),
):
    """
    Send an announcement notification to users by role.
    target_role = "ALL"     → FACULTY + STUDENT (not admins)
    target_role = "STUDENT" → students only
    target_role = "FACULTY" → faculty only

    Admins are deliberately excluded — they are the senders, not receivers.
    The admin who sends it gets a confirmation notification instead.
    """
    try:
        sent = 0

        target_role = "PERSONNEL" if request.target_role.upper() == "FACULTY" else request.target_role.upper()
        if target_role in ("ALL", "EVERYONE"):
            # Personnel + Students
            users = (
                db.query(models.User)
                .filter(
                    models.User.role.in_(["PERSONNEL", "STUDENT"]),
                    models.User.status != "Disabled"
                )
                .all()
            )
        else:
            users = (
                db.query(models.User)
                .filter(
                    models.User.role == target_role,
                    models.User.status != "Disabled"
                )
                .all()
            )

        for user in users:
            _send_notification(
                user_email=user.email,
                n_type="info",
                title=f"📢 {request.title}",
                message=request.message,
            )
            sent += 1

        # ── Confirm back to the sending admin ──
        if request.sender_email:
            _send_notification(
                user_email=request.sender_email,
                n_type="success",
                title="Announcement Sent",
                message=(
                    f"Your announcement '{request.title}' was successfully "
                    f"delivered to {sent} user(s)."
                ),
            )

        # ── Log the broadcast ──
        try:
            supabase.table("system_events_logs").insert({
                "user_email":  request.sender_email or "admin",
                "event_type":  "Broadcast Announcement",
                "description": f"Announcement '{request.title}' sent to {sent} {request.target_role} user(s)."
            }).execute()
        except Exception as exc:
            print(f"[broadcast] audit log failed: {exc}")

        return {
            "message": f"Broadcast sent to {sent} {request.target_role} user(s).",
            "sent":    sent
        }

    except Exception as e:
        print(f"[broadcast] error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────────────────────────────────────────
# SYSTEM STATS
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/public-stats")
def get_public_stats():
    """Safe aggregate counts for the unauthenticated landing page."""
    try:
        document_rows = supabase.table("document_sections").select("metadata").limit(10000).execute().data or []
        document_names = set()
        for row in document_rows:
            metadata = row.get("metadata") or {}
            if isinstance(metadata, str):
                try:
                    metadata = json.loads(metadata)
                except Exception:
                    metadata = {}
            if (
                metadata.get("name")
                and str(metadata.get("status") or "Active").lower() != "archived"
                and not is_student_hidden_category(metadata.get("category"))
            ):
                document_names.add(metadata["name"])

        query_rows = (
            supabase.table("chat_history")
            .select("id", count="exact")
            .eq("role", "user")
            .limit(1)
            .execute()
        )
        helpful_rows = (
            supabase.table("feedback_logs")
            .select("id", count="exact")
            .eq("is_helpful", True)
            .limit(1)
            .execute()
        )
        user_rows = supabase.table("users").select("id", count="exact").eq("status", "Active").limit(1).execute()
        return {
            "documents": len(document_names),
            "queries": query_rows.count or 0,
            "helpful_answers": helpful_rows.count or 0,
            "users": user_rows.count or 0,
            "available": True,
        }
    except Exception as exc:
        _log.exception("public_stats_failed", extra={"request_id": _request_id.get()})
        # The landing page should remain usable when an optional metric service
        # is unavailable; do not expose database details to anonymous clients.
        return {"documents": 0, "queries": 0, "helpful_answers": 0, "users": 0, "available": False}


@app.get("/system-stats")
def get_system_stats(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    role = role_of(current_user)
    is_admin = is_system_admin(current_user)
    has_governance_access = permissions_for(current_user)["governance.access"]
    import json

    total_docs     = 0
    total_users    = 0
    total_queries  = 0
    qms_total      = 0
    qms_overdue    = 0
    aaccup_pending = 0
    iso_pending    = 0
    iso_compliance = 0

    if is_admin and _DB_IS_AVAILABLE:
        try:
            total_users = db.query(models.User).count()
        except Exception:
            total_users = 0
    if is_admin and not total_users:
        try:
            u_res = supabase.table("users").select("id").execute()
            total_users = len(u_res.data) if u_res.data else 0
        except Exception:
            pass

    try:
        docs_response  = supabase.table("document_sections").select("metadata").execute()
        unique_docs    = set()
        unique_pending = set()
        if docs_response.data:
            for row in docs_response.data:
                meta = row.get("metadata", {})

                if isinstance(meta, str):
                    try:    meta = json.loads(meta)
                    except: meta = {}

                if not can_read_document(current_user, meta):
                    continue
                doc_name = meta.get("document_name") or meta.get("title") or meta.get("name") or meta.get("file_name") or meta.get("source")
                category = meta.get("category", "")
                status   = meta.get("status", "Active")

                if doc_name:
                    if str(status).lower() == "archived":
                        continue
                    # Students only see public institutional policies/handbooks, not internal accreditation evidence
                    if role.upper() == "STUDENT" and category == "Accreditation Evidence":
                        continue
                    unique_docs.add(doc_name)

                if category == "Accreditation Evidence" and str(status).lower() == "pending" and doc_name:
                    unique_pending.add(doc_name)

        # For ADMIN: include total records across repository, paper trail, and QA evidences
        if is_system_admin(current_user):
            if _DB_IS_AVAILABLE:
                try:
                    ched_ev = db.query(models.ChedEvidence.file_name).all()
                    for (cf,) in ched_ev:
                        if cf: unique_docs.add(cf)
                    
                    iso_ev = db.query(models.ISOEvidence.file_name).all()
                    for (isf,) in iso_ev:
                        if isf: unique_docs.add(isf)

                    pt_records = db.query(models.PaperTrailRecord.title).all()
                    for (pt,) in pt_records:
                        if pt: unique_docs.add(pt)

                    qms_ev = db.query(models.QMSEvidence.file_name).all()
                    for (qf,) in qms_ev:
                        if qf: unique_docs.add(qf)
                except Exception:
                    pass

        total_docs = len(unique_docs)
        aaccup_pending = len(unique_pending)
    except Exception as e:
        print(f"Document count error: {e}")

    try:
        query = supabase.table("chat_history").select("id").eq("role", "user")
        if not is_admin:
            query = query.eq("user_email", current_user.email)
        query_response = query.execute()
        total_queries  = len(query_response.data) if query_response.data else 0
    except Exception as e:
        print(f"Chat count error: {e}")

    # QMS Action Plans (Form 6)
    qms_processed = False
    if has_governance_access and _DB_IS_AVAILABLE:
        try:
            qms_plans = filter_office_records(current_user, db.query(models.QMSActionPlan).all())
            qms_total = len(qms_plans)
            overdue_count = 0
            now_date_str = utc_now().strftime("%Y-%m-%d")
            for p in qms_plans:
                if p.status == "Overdue":
                    overdue_count += 1
                elif p.status != "Completed" and p.target_date and str(p.target_date) < now_date_str:
                    overdue_count += 1
            qms_overdue = overdue_count
            qms_processed = True
        except Exception:
            qms_processed = False

    if has_governance_access and not qms_processed:
        try:
            q_res = supabase.table("qms_action_plans").select("*").execute()
            q_res.data = filter_office_records(current_user, q_res.data or [])
            if q_res.data:
                qms_total = len(q_res.data)
                now_date_str = utc_now().strftime("%Y-%m-%d")
                qms_overdue = sum(1 for p in q_res.data if p.get("status") == "Overdue" or (p.get("status") != "Completed" and p.get("target_date") and str(p.get("target_date")) < now_date_str))
        except Exception:
            pass

    # ISO Requirements & Campus Compliance
    iso_processed = False
    if has_governance_access and _DB_IS_AVAILABLE:
        try:
            iso_pending = db.query(models.ISORequirement).filter(models.ISORequirement.status == "Pending").count()
            iso_reqs = db.query(models.ISORequirement).filter(models.ISORequirement.cycle_year.ilike("%2026%")).all()
            if not iso_reqs:
                iso_reqs = db.query(models.ISORequirement).all()
            iso_reqs = filter_office_records(current_user, iso_reqs)
            iso_pending = sum(1 for r in iso_reqs if r.status == "Pending")
            total_iso = len(iso_reqs)
            compliant_iso = len([r for r in iso_reqs if r.status == "Compliant"])
            iso_compliance = int((compliant_iso / total_iso) * 100) if total_iso > 0 else 0
            iso_processed = True
        except Exception:
            iso_processed = False

    if has_governance_access and not iso_processed:
        try:
            i_res = supabase.table("iso_requirements").select("*").execute()
            i_res.data = filter_office_records(current_user, i_res.data or [])
            if i_res.data:
                iso_pending = sum(1 for r in i_res.data if r.get("status") == "Pending")
                total_iso = len(i_res.data)
                compliant_iso = sum(1 for r in i_res.data if r.get("status") == "Compliant")
                iso_compliance = int((compliant_iso / total_iso) * 100) if total_iso > 0 else 0
        except Exception:
            pass

    return {
        "documents":      total_docs,
        "users":          total_users,
        "queries":        total_queries,
        "qms_total":      qms_total,
        "qms_overdue":    qms_overdue,
        "aaccup_pending": aaccup_pending,
        "iso_pending":    iso_pending,
        "iso_compliance": iso_compliance,
        "qmsTotal":       qms_total,
        "qmsOverdue":     qms_overdue,
        "aaccupPending":  aaccup_pending,
        "isoPending":     iso_pending,
        "isoCompliance":  iso_compliance,
        "scope":          "global" if is_admin else ("assigned" if has_governance_access else "personal"),
    }


# ─────────────────────────────────────────────────────────────────────────────
# FEEDBACK
# ─────────────────────────────────────────────────────────────────────────────

@app.post("/feedback")
def submit_feedback(
    request: FeedbackRequest,
    current_user: models.User = Depends(get_current_user),
):
    try:
        response_result = (
            supabase.table("chat_history")
            .select("id,user_email,role,content,created_at")
            .eq("id", request.response_id)
            .limit(1)
            .execute()
        )
        if not response_result.data:
            raise HTTPException(status_code=404, detail="AI response not found.")

        ai_response = response_result.data[0]
        if (
            ai_response.get("role") != "ai"
            or str(ai_response.get("user_email", "")).lower() != current_user.email.lower()
        ):
            raise HTTPException(status_code=403, detail="You may only rate your own AI responses.")

        if request.is_helpful is None:
            (
                supabase.table("feedback_logs")
                .delete()
                .eq("response_id", request.response_id)
                .eq("user_email", current_user.email)
                .execute()
            )
            return {"status": "success", "feedback": None}

        question_result = (
            supabase.table("chat_history")
            .select("content")
            .eq("user_email", current_user.email)
            .eq("role", "user")
            .lte("created_at", ai_response["created_at"])
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        question_text = question_result.data[0]["content"] if question_result.data else ""

        (
            supabase.table("feedback_logs")
            .upsert(
                {
                    "user_email": current_user.email,
                    "response_id": request.response_id,
                    "question_text": question_text,
                    "ai_response": ai_response.get("content", ""),
                    "is_helpful": request.is_helpful,
                    "is_verified_rating": True,
                    "updated_at": datetime.now().isoformat(),
                },
                on_conflict="user_email,response_id",
            )
            .execute()
        )
        return {
            "status": "success",
            "feedback": "helpful" if request.is_helpful else "not-helpful",
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Failed to log feedback: {e}")
        raise HTTPException(status_code=500, detail="Feedback could not be saved.")


# ─────────────────────────────────────────────────────────────────────────────
# CHAT HISTORY
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/chat-history")
def get_chat_history(
    email: Optional[str] = None,
    current_user: models.User = Depends(get_current_user),
):
    target_email = (email or current_user.email).strip().lower()
    if target_email != current_user.email.lower() and not is_system_admin(current_user):
        raise HTTPException(status_code=403, detail="You may only access your own chat history.")
    seven_days_ago = (datetime.now() - timedelta(days=7)).isoformat()

    try:
        response = supabase.table("chat_history")\
            .select("*")\
            .eq("user_email", target_email)\
            .gte("created_at", seven_days_ago)\
            .order("created_at", desc=False)\
            .execute()
        rows = response.data or []
        feedback_response = (
            supabase.table("feedback_logs")
            .select("response_id,is_helpful")
            .eq("user_email", target_email)
            .execute()
        )
        feedback_by_response = {
            int(item["response_id"]): "helpful" if item["is_helpful"] else "not-helpful"
            for item in (feedback_response.data or [])
            if item.get("response_id") is not None
        }
        for row in rows:
            if row.get("role") == "ai":
                row["feedback"] = feedback_by_response.get(int(row["id"]))
        return rows
    except Exception as e:
        print(f"Error fetching history: {e}")
        return []



# ─────────────────────────────────────────────────────────────────────────────
# ACCREDITATION
# ─────────────────────────────────────────────────────────────────────────────

def resolve_accreditation_cycle(
    db: Session,
    program_code: str,
    cycle_id: Optional[str] = None,
) -> tuple[models.ProgramAccreditation, models.AccreditationCycle]:
    accreditation = db.query(models.ProgramAccreditation).filter(
        models.ProgramAccreditation.program_code == program_code
    ).first()
    if not accreditation:
        raise HTTPException(status_code=404, detail="Program accreditation record not found.")

    query = db.query(models.AccreditationCycle).filter(
        models.AccreditationCycle.program_id == accreditation.id
    )
    if cycle_id:
        try:
            normalized_cycle_id = uuid.UUID(str(cycle_id))
        except ValueError as exc:
            raise HTTPException(status_code=400, detail="Invalid accreditation cycle ID.") from exc
        cycle = query.filter(models.AccreditationCycle.id == normalized_cycle_id).first()
    else:
        cycle = query.filter(models.AccreditationCycle.status == "ACTIVE").first()
    if not cycle:
        raise HTTPException(status_code=404, detail="Accreditation cycle not found for this program.")
    return accreditation, cycle


def load_aaccup_evidence_chunks(evidence_id: uuid.UUID) -> list[dict]:
    response = (
        supabase.table("document_sections")
        .select("id, metadata")
        .eq("metadata->>category", "Accreditation Evidence")
        .eq("metadata->>accreditation_evidence_id", str(evidence_id))
        .execute()
    )
    return response.data or []


def aaccup_evidence_from_metadata(metadata: dict) -> dict:
    return {
        "evidence_id": metadata.get("accreditation_evidence_id"),
        "cycle_id": metadata.get("accreditation_cycle_id"),
        "program": metadata.get("program", ""),
        "name": metadata.get("name", "Untitled evidence"),
        "area_code": metadata.get("area_code", ""),
        "requirement_target": metadata.get("requirement_target", "Uncategorized"),
        "status": metadata.get("status", "Pending"),
        "admin_feedback": metadata.get("admin_feedback", ""),
        "uploaded_by": metadata.get("uploaded_by"),
        "upload_date": metadata.get("upload_date"),
        "original_filename": metadata.get("original_filename"),
    }


def require_active_aaccup_evidence(db: Session, metadata: dict) -> models.AccreditationCycle:
    program_code = metadata.get("program")
    cycle_id = metadata.get("accreditation_cycle_id")
    if not program_code or not cycle_id:
        raise HTTPException(status_code=409, detail="This evidence is not linked to an accreditation cycle.")
    _, cycle = resolve_accreditation_cycle(db, program_code, cycle_id)
    if cycle.status != "ACTIVE":
        raise HTTPException(status_code=409, detail="Previous accreditation cycles are read-only.")
    return cycle

@app.post("/upload-accreditation-evidence")
async def upload_accreditation_evidence(
    file:                UploadFile = File(...),
    document_name:       str = Form(...),
    program:             str = Form(...),
    area_code:           str = Form(...),
    requirement_target:  str = Form(...),
    uploaded_by:         str = Form(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_faculty_or_admin),
):
    uploaded_by = current_user.email
    require_program(current_user, program)
    import time, io, PyPDF2
    from datetime import datetime
    evidence_id = uuid.uuid4()
    stored_file_reference: Optional[str] = None

    try:
        contents       = await read_upload_limited(file)
        extracted_text = ""
        filename_lower = file.filename.lower()

        if filename_lower.endswith(".pdf"):
            pdf_reader = PyPDF2.PdfReader(io.BytesIO(contents))
            for page in pdf_reader.pages:
                text = page.extract_text()
                if text: extracted_text += text + "\n"
        elif filename_lower.endswith((".txt", ".html")):
            extracted_text = contents.decode("utf-8", errors="ignore")
        elif filename_lower.endswith(".docx"):
            import docx
            doc = docx.Document(io.BytesIO(contents))
            parts = []
            for block in _iter_block_items(doc):
                if hasattr(block, "text"):
                    parts.append(block.text)
                elif hasattr(block, "rows"):
                    for row in block.rows:
                        for cell in row.cells:
                            parts.append(cell.text)
            extracted_text = "\n".join(parts)
        else:
            raise HTTPException(status_code=400, detail="Unsupported file format.")

        if not extracted_text.strip():
            raise HTTPException(status_code=400, detail="Could not extract text.")

        accreditation = (
            db.query(models.ProgramAccreditation)
            .filter(models.ProgramAccreditation.program_code == program)
            .with_for_update()
            .first()
        )
        if not accreditation:
            accreditation = models.ProgramAccreditation(
                program_code=program,
                current_level="Candidate Status",
                status="Active",
            )
            db.add(accreditation)
            db.flush()
        active_cycle = ensure_active_accreditation_cycle(db, accreditation, uploaded_by)
        db.commit()

        # --- OFFLINE OCR PIPELINE: Clean artifacts before embedding ---
        extracted_text = clean_ocr_text_offline(extracted_text)
        # --------------------------------------------------------------

        safe_filename   = file.filename.replace(" ", "_")
        unique_filename = f"evid_{int(time.time())}_{safe_filename}"

        supabase.storage.from_("documents").upload(
            file=contents, path=unique_filename, file_options={"content-type": file.content_type}
        )
        stored_file_reference = unique_filename

        metadata = {
            "name": document_name,
            "category": "Accreditation Evidence",
            "office": "Quality Assurance",
            "version": "1.0",
            "status": "Pending", 
            "program": program,
            "scope_type": "PROGRAM",
            "scope_code": program,
            "area_code": area_code,
            "requirement_target": requirement_target, 
            "accreditation_evidence_id": str(evidence_id),
            "accreditation_cycle_id": str(active_cycle.id),
            "accreditation_cycle_label": active_cycle.cycle_label,
            "accreditation_level": active_cycle.level_name,
            "accreditation_attempt": active_cycle.attempt_number,
            "uploaded_by": uploaded_by, 
            "admin_feedback": "",
            "upload_date": datetime.now().isoformat(),
            "original_filename": file.filename,
            "storage_path": unique_filename,
            "file_url": stored_file_reference
        }

        chunks_count = vector_store.add_to_vector_db(extracted_text, metadata)
        if chunks_count <= 0:
            raise RuntimeError("The evidence text could not be indexed.")

        # --- SILENT AUDIT LOG ---
        try:
            # FIX: Using the global supabase client instead of importing it locally
            supabase.table("system_events_logs").insert({
                "user_email": uploaded_by, 
                "event_type": "Accreditation Upload",
                "description": f"Uploaded '{document_name}' for {program} ({area_code}) - Pending Review"
            }).execute()
        except Exception as e:
            print(f"Failed to log accreditation upload: {e}")
        # ------------------------

        return {"message": "Evidence uploaded to the current accreditation cycle and is pending review."}

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        # Keep Storage and vector records consistent when extraction, embedding,
        # or insertion fails after the file has already been uploaded.
        try:
            supabase.table("document_sections").delete().eq(
                "metadata->>accreditation_evidence_id", str(evidence_id)
            ).execute()
        except Exception:
            _log.exception(
                "aaccup_evidence_chunk_cleanup_failed",
                extra={"evidence_id": str(evidence_id)},
            )
        if stored_file_reference:
            try:
                supabase.storage.from_("documents").remove([stored_file_reference])
            except Exception:
                _log.exception(
                    "aaccup_evidence_storage_cleanup_failed",
                    extra={"storage_path": stored_file_reference},
                )
        _log.exception(
            "aaccup_evidence_upload_failed",
            extra={"evidence_id": str(evidence_id), "program": program, "area_code": area_code},
        )
        raise HTTPException(
            status_code=500,
            detail="The evidence file could not be processed and indexed. No partial upload was kept.",
        ) from e

# --- NEW: ADMIN REVIEW QUEUE ROUTE ---
@app.get("/admin/accreditation-pending")
def get_pending_accreditation(
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_governance_reviewer),
):
    try:
        res = supabase.table("document_sections").select("metadata").eq("metadata->>category", "Accreditation Evidence").eq("metadata->>status", "Pending").execute()

        active_cycle_ids = {
            str(cycle.id)
            for cycle in db.query(models.AccreditationCycle).filter(
                models.AccreditationCycle.status == "ACTIVE"
            ).all()
        }
        unique_docs = {}
        if res.data:
            for item in res.data:
                meta = item.get('metadata', {})
                evidence_id = meta.get("accreditation_evidence_id")
                if not evidence_id or meta.get("accreditation_cycle_id") not in active_cycle_ids:
                    continue
                if not can_access_program(admin, meta.get('program')):
                    continue
                if evidence_id not in unique_docs:
                    unique_docs[evidence_id] = {
                        "evidence_id": evidence_id,
                        "cycle_id": meta.get("accreditation_cycle_id"),
                        "name": meta.get('name'),
                        "program": meta.get('program', 'Unknown'),
                        "area_code": meta.get('area_code', 'Unknown'),
                        "target": meta.get('requirement_target', 'Unknown'),
                        "uploaded_by": meta.get('uploaded_by', 'Faculty Member'),
                        "date": meta.get('upload_date', '').split('T')[0],
                        "uploaded_at": meta.get('upload_date', ''),
                        "url": get_fresh_private_file_url(
                            meta.get('file_url'), meta.get('storage_path')
                        )
                    }
        return sorted(
            unique_docs.values(),
            key=lambda item: item.get("uploaded_at") or "",
            reverse=True,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to fetch pending queue")

# --- NEW: ADMIN APPROVAL/REJECTION ROUTE ---
@app.post("/admin/accreditation-review")
def review_accreditation(
    req: AccreditationReviewRequest,
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_governance_reviewer),
):
    try:
        chunks = load_aaccup_evidence_chunks(req.evidence_id)
        if not chunks:
            raise HTTPException(status_code=404, detail="Accreditation evidence not found.")

        canonical_metadata = chunks[0].get("metadata") or {}
        require_program(admin, canonical_metadata.get("program"))
        require_active_aaccup_evidence(db, canonical_metadata)
        for chunk in chunks:
            chunk_meta = chunk.get("metadata") or {}
            if chunk_meta.get('category') != "Accreditation Evidence":
                raise HTTPException(status_code=400, detail="This document is not accreditation evidence.")
            if (
                chunk_meta.get("program") != canonical_metadata.get("program")
                or chunk_meta.get("accreditation_cycle_id") != canonical_metadata.get("accreditation_cycle_id")
            ):
                raise HTTPException(status_code=409, detail="Evidence chunks have inconsistent accreditation scope.")

        for chunk in chunks:
            chunk_meta = chunk['metadata']
            chunk_meta['status'] = req.status
            chunk_meta['admin_feedback'] = req.feedback
            
            supabase.table("document_sections").update({"metadata": chunk_meta}).eq("id", chunk['id']).execute()

        # --- SILENT AUDIT LOG ---
        try:
            document_name = canonical_metadata.get("name", "Accreditation evidence")
            action_desc = f"Reviewer marked '{document_name}' as {req.status}."
            if req.status == "Needs Revision":
                action_desc += f" Feedback: {req.feedback}"
                
            supabase.table("system_events_logs").insert({
                "user_email": admin.email,
                "event_type": "QA Review",
                "description": action_desc
            }).execute()
        except Exception as e:
            print(f"Failed to log QA Review: {e}")
        # ------------------------

        return {"message": f"Evidence successfully marked as {req.status}."}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to process review")

# 2. THE UPDATED STATUS ROUTE (Database-driven AACCUP requirements)
@app.get("/accreditation-status/{program}")
def get_accreditation_status(
    program: str,
    cycle_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_faculty_or_admin),
):
    require_program(current_user, program)
    try:
        prog_acc, selected_cycle = resolve_accreditation_cycle(db, program, cycle_id)
        active_areas_set = None
        if prog_acc and prog_acc.active_areas:
            active_areas_set = set(a.strip() for a in prog_acc.active_areas.split(",") if a.strip())

        res = (
            supabase.table("document_sections")
            .select("metadata")
            .eq("metadata->>category", "Accreditation Evidence")
            .eq("metadata->>program", program)
            .eq("metadata->>accreditation_cycle_id", str(selected_cycle.id))
            .eq("metadata->>status", "Approved")
            .execute()
        )
        
        fulfilled_reqs = {}
        if res.data:
            for item in res.data:
                meta = item.get('metadata', {})
                area = meta.get('area_code')
                req_target = meta.get('requirement_target')
                
                if area and req_target:
                    if area not in fulfilled_reqs:
                        fulfilled_reqs[area] = set()
                    fulfilled_reqs[area].add(req_target)

        # Query database requirements
        db_reqs = db.query(models.AaccupRequirement).all()
        area_groups = {}
        for r in db_reqs:
            if r.area_code not in area_groups:
                area_groups[r.area_code] = {"title": r.area_title, "reqs": []}
            area_groups[r.area_code]["reqs"].append(r.description)

        # Order areas logically Areas I to X
        sorted_codes = sorted(area_groups.keys())

        areas_list = []
        total_req  = 0
        total_ev   = 0

        for code in sorted_codes:
            if active_areas_set is not None and code not in active_areas_set:
                continue

            reqs = area_groups[code]["reqs"]
            title = area_groups[code]["title"]
            required_count = len(reqs)
            ev_count       = len(fulfilled_reqs.get(code, set()))
            capped_ev      = min(ev_count, required_count)
            total_req     += required_count
            total_ev      += capped_ev
            comp           = int((capped_ev / required_count) * 100) if required_count > 0 else 0

            areas_list.append({
                "id":            code.replace(" ", ""),
                "code":          code,
                "title":         title,
                "compliance":    comp,
                "required":      required_count,
                "evidenceCount": ev_count,
                "gaps":          max(0, required_count - ev_count),
            })

        overall = int((total_ev / total_req) * 100) if total_req > 0 else 0

        return {
            "level":    selected_cycle.level_name,
            "cycle_id": str(selected_cycle.id),
            "cycle_label": selected_cycle.cycle_label,
            "cycle_status": selected_cycle.status,
            "read_only": selected_cycle.status == "CLOSED",
            "overall":  overall,
            "gaps":     total_req - total_ev,
            "evidence": total_ev,
            "areas":    areas_list,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to calculate status")


@app.get("/accreditation-details/{program}/{area_code}")
def get_accreditation_details(
    program: str,
    area_code: str,
    cycle_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_faculty_or_admin),
):
    require_program(current_user, program)
    try:
        _, selected_cycle = resolve_accreditation_cycle(db, program, cycle_id)
        response = supabase.table("document_sections")\
            .select("metadata")\
            .eq("metadata->>category", "Accreditation Evidence")\
            .eq("metadata->>program",  program)\
            .eq("metadata->>accreditation_cycle_id", str(selected_cycle.id))\
            .eq("metadata->>area_code", area_code)\
            .execute()

        unique_docs       = {}
        fulfilled_targets = set()

        if response.data:
            for item in response.data:
                meta = item.get('metadata', {})
                if meta.get('status') == "Archived": continue
                
                evidence_id = meta.get("accreditation_evidence_id")
                doc_name = meta.get('name')
                req_target = meta.get('requirement_target') 
                doc_status = meta.get('status', 'Pending')
                
                if req_target and doc_status == "Approved":
                    fulfilled_targets.add(req_target) 
                
                if evidence_id and evidence_id not in unique_docs:
                    unique_docs[evidence_id] = {
                        "evidence_id": evidence_id,
                        "cycle_id": str(selected_cycle.id),
                        "name": doc_name,
                        "date": meta.get('upload_date', '').split('T')[0] if 'upload_date' in meta else 'Recently',
                        "target": req_target or "Uncategorized",
                        "requirement_target": req_target or "Uncategorized",
                        "status": doc_status,
                        "feedback": meta.get('admin_feedback', ''),
                        "uploaded_by": meta.get("uploaded_by"),
                        "original_filename": meta.get("original_filename"),
                    }

        uploaded_files = list(unique_docs.values())

        db_reqs = db.query(models.AaccupRequirement).filter(models.AaccupRequirement.area_code == area_code).all()
        requirements  = []
        for req in db_reqs:
            requirements.append({
                "id":     str(req.id),
                "text":   req.description,
                "area_title": req.area_title,
                "is_met": req.description in fulfilled_targets,
            })

        return {
            "cycle": schemas.AccreditationCycleResponse.model_validate(selected_cycle).model_dump(),
            "read_only": selected_cycle.status == "CLOSED",
            "requirements":  requirements,
            "uploadedFiles": sorted(uploaded_files, key=lambda x: x['date'], reverse=True),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to fetch details")


@app.get(
    "/accreditation/program/{program_code}/cycles/{cycle_id}/evidence",
    response_model=List[schemas.AaccupEvidenceResponse],
)
def list_cycle_aaccup_evidence(
    program_code: str,
    cycle_id: str,
    area_code: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_faculty_or_admin),
):
    require_program(current_user, program_code)
    _, cycle = resolve_accreditation_cycle(db, program_code, cycle_id)
    query = (
        supabase.table("document_sections")
        .select("metadata")
        .eq("metadata->>category", "Accreditation Evidence")
        .eq("metadata->>program", program_code)
        .eq("metadata->>accreditation_cycle_id", str(cycle.id))
    )
    if area_code:
        query = query.eq("metadata->>area_code", area_code)
    rows = query.execute().data or []
    evidence_by_id = {}
    for row in rows:
        metadata = row.get("metadata") or {}
        evidence_id = metadata.get("accreditation_evidence_id")
        if evidence_id and metadata.get("status") != "Archived":
            evidence_by_id.setdefault(evidence_id, aaccup_evidence_from_metadata(metadata))
    return sorted(
        evidence_by_id.values(),
        key=lambda item: item.get("upload_date") or "",
        reverse=True,
    )


@app.get("/accreditation/evidence/{evidence_id}/access-url")
def get_aaccup_evidence_access_url(
    evidence_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_faculty_or_admin),
):
    chunks = load_aaccup_evidence_chunks(evidence_id)
    if not chunks:
        raise HTTPException(status_code=404, detail="Accreditation evidence not found.")
    metadata = chunks[0].get("metadata") or {}
    require_program(current_user, metadata.get("program"))
    resolve_accreditation_cycle(db, metadata.get("program"), metadata.get("accreditation_cycle_id"))
    storage_path = metadata.get("storage_path") or get_private_storage_path(metadata.get("file_url"))
    if not storage_path:
        raise HTTPException(status_code=404, detail="Evidence storage path is missing.")
    fresh_url = create_private_file_url(storage_path)
    if not fresh_url:
        raise HTTPException(status_code=503, detail="Could not create a temporary evidence URL.")
    return {
        "file_url": fresh_url,
        "name": metadata.get("name", "Accreditation evidence"),
        "original_filename": metadata.get("original_filename"),
    }


@app.delete("/accreditation/evidence/{evidence_id}")
def archive_aaccup_evidence(
    evidence_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_faculty_or_admin),
):
    chunks = load_aaccup_evidence_chunks(evidence_id)
    if not chunks:
        raise HTTPException(status_code=404, detail="Accreditation evidence not found.")
    metadata = chunks[0].get("metadata") or {}
    require_program(current_user, metadata.get("program"))
    if not permissions_for(current_user).get("documents.manage"):
        raise HTTPException(status_code=403, detail="Program document management permission required.")
    require_active_aaccup_evidence(db, metadata)
    for chunk in chunks:
        chunk_metadata = chunk.get("metadata") or {}
        if (
            chunk_metadata.get("program") != metadata.get("program")
            or chunk_metadata.get("accreditation_cycle_id") != metadata.get("accreditation_cycle_id")
        ):
            raise HTTPException(status_code=409, detail="Evidence chunks have inconsistent accreditation scope.")
        chunk_metadata["status"] = "Archived"
        chunk_metadata["archived_by"] = current_user.email
        chunk_metadata["archived_at"] = utc_now().isoformat()
        supabase.table("document_sections").update({"metadata": chunk_metadata}).eq("id", chunk["id"]).execute()
    try:
        supabase.table("system_events_logs").insert({
            "user_email": current_user.email,
            "event_type": "Accreditation Evidence Archived",
            "description": f"Archived '{metadata.get('name', 'Accreditation evidence')}' from the active {metadata.get('program')} cycle.",
        }).execute()
    except Exception:
        pass
    return {"message": "Evidence archived from the active accreditation cycle."}


# --- AACCUP REQUIREMENTS CRUD ENDPOINTS ---
@app.get("/aaccup/requirements", response_model=List[schemas.AaccupRequirementResponse])
def get_aaccup_requirements(
    area_code: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_accreditation_reader),
):
    query = db.query(models.AaccupRequirement)
    if area_code:
        query = query.filter(models.AaccupRequirement.area_code == area_code)
    return query.order_by(models.AaccupRequirement.area_code.asc(), models.AaccupRequirement.created_at.asc()).all()


@app.post("/aaccup/requirements", response_model=schemas.AaccupRequirementResponse, status_code=status.HTTP_201_CREATED)
def create_aaccup_requirement(
    req: schemas.AaccupRequirementCreate,
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_campus_governance_reviewer),
):
    item = models.AaccupRequirement(**req.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@app.put("/aaccup/requirements/{req_id}", response_model=schemas.AaccupRequirementResponse)
def update_aaccup_requirement(
    req_id: str,
    req: schemas.AaccupRequirementCreate,
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_campus_governance_reviewer),
):
    db_req = db.query(models.AaccupRequirement).filter(models.AaccupRequirement.id == req_id).first()
    if not db_req:
        raise HTTPException(status_code=404, detail="Requirement not found")
    db_req.area_code = req.area_code
    db_req.area_title = req.area_title
    db_req.description = req.description
    db.commit()
    db.refresh(db_req)
    return db_req


@app.delete("/aaccup/requirements/{req_id}")
def delete_aaccup_requirement(req_id: str, db: Session = Depends(get_db), admin: models.User = Depends(get_campus_governance_reviewer)):
    item = db.query(models.AaccupRequirement).filter(models.AaccupRequirement.id == req_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Requirement not found")
    db.delete(item)
    db.commit()
    return {"message": "Requirement deleted"}



# ─────────────────────────────────────────────────────────────────────────────
# ANALYTICS
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/analytics/recent")
def get_recent_questions(current_user: models.User = Depends(get_current_admin)):
    """Return recent user queries, aggressively filtering out greetings and small talk."""
    try:
        from vector_store import supabase
        
        # Fetch a large batch so we have enough left after the aggressive filtering
        response = supabase.table("chat_history").select("content").eq("role", "user").order("created_at", desc=True).limit(40).execute()

        valid_recent_questions = []
        
        # The ultimate blacklist of small talk (no punctuation needed here)
        chitchat_blacklist = [
            "hi", "hello", "hey", "good morning", "good afternoon", "good evening", "greetings",
            "how are you", "good morning how are you", "hello how are you", "hi how are you",
            "how are you doing", "what is up", "sup", "hello there", "hi there",
            "thank you", "thanks", "thank you very much", "thanks for the help", 
            "ok", "okay", "yes", "no", "bye", "goodbye"
        ]

        if response.data:
            for row in response.data:
                raw_question = (row.get("content") or "").strip()
                
                # 1. NORMALIZE: Convert to lowercase and completely remove commas, ?, !, and periods
                # "Good morning, how are you?"  -> becomes -> "good morning how are you"
                normalized_q = re.sub(r'[^a-z0-9\s]', '', raw_question.lower()).strip()

                # FILTER 1: Is the normalized text in our small-talk blacklist?
                if normalized_q in chitchat_blacklist:
                    continue
                
                # FILTER 2: Does it start with a greeting but is still very short? 
                # (Catches random things like "hi askpolicy" or "hello chatbot")
                if normalized_q.startswith(("hi ", "hello ", "good morning", "hey ")) and len(normalized_q.split()) <= 4:
                    continue
                    
                # FILTER 3: Is it just one single word? (e.g. "what", "policy", "test")
                if len(normalized_q.split()) < 2:
                    continue
                
                # FILTER 4: Prevent exact duplicates from showing up in the UI
                if raw_question not in valid_recent_questions:
                    valid_recent_questions.append(raw_question)

                # Stop once we have exactly 5 high-quality policy questions
                if len(valid_recent_questions) >= 5:
                    break

        # Fallback if the database has no real questions yet
        if not valid_recent_questions:
            return [
                "What is the grading system?",
                "How do I apply for a scholarship?",
                "What are the requirements for enrollment?"
            ]

        return valid_recent_questions

    except Exception as e:
        print(f"[get_recent_questions] error: {e}")
        return [
            "What is the grading system?",
            "How do I apply for a scholarship?"
        ]


@app.get("/analytics/popular")
def get_popular_topics(current_user: models.User = Depends(get_current_admin)):
    """Return the top recurring topics from chat history to power the Popular Topics panel."""
    try:
        response = supabase_query_with_retry(lambda: supabase.table("chat_history").select("content").eq("role", "user").execute())

        keyword_map = {
            "enrollment":   ("Enrollment",   "blue"),
            "grade":        ("Grading",      "emerald"),
            "scholarship":  ("Scholarship",  "purple"),
            "attendance":   ("Attendance",   "blue"),
            "graduation":   ("Graduation",   "emerald"),
            "discipline":   ("Discipline",   "purple"),
            "thesis":       ("Thesis",       "blue"),
            "ojt":          ("OJT",          "emerald"),
            "tuition":      ("Tuition",      "purple"),
            "examination":  ("Examination",  "blue"),
            "accreditation":("Accreditation","emerald"),
            "leave":        ("Leave",        "purple"),
        }

        counts = {k: 0 for k in keyword_map}
        if response.data:
            for row in response.data:
                text = (row.get("content") or "").lower()
                for keyword in keyword_map:
                    if keyword in text:
                        counts[keyword] += 1

        # Sort by frequency, return top 6
        sorted_topics = sorted(counts.items(), key=lambda x: x[1], reverse=True)
        top_topics = [
            {"label": keyword_map[k][0], "color": keyword_map[k][1]}
            for k, v in sorted_topics if v > 0
        ][:6]

        # Fallback defaults if no chat history yet
        if not top_topics:
            top_topics = [
                {"label": "Enrollment",  "color": "blue"},
                {"label": "Grading",     "color": "emerald"},
                {"label": "Scholarship", "color": "purple"},
                {"label": "Attendance",  "color": "blue"},
                {"label": "Graduation",  "color": "emerald"},
                {"label": "Discipline",  "color": "purple"},
            ]

        return top_topics

    except Exception as e:
        print(f"[get_popular_topics] error: {e}")
        return [
            {"label": "Enrollment",  "color": "blue"},
            {"label": "Grading",     "color": "emerald"},
            {"label": "Scholarship", "color": "purple"},
        ]


@app.get("/analytics/me/monthly")
def get_my_monthly_query_activity(current_user: models.User = Depends(get_current_user)):
    """Return monthly counts for the signed-in user without exposing question text."""
    today = utc_now()
    month_starts = []
    year, month = today.year, today.month
    for offset in range(5, -1, -1):
        target_month = month - offset
        target_year = year
        while target_month <= 0:
            target_month += 12
            target_year -= 1
        month_starts.append(datetime(target_year, target_month, 1))

    first_month = month_starts[0].isoformat()
    counts = {start.strftime("%Y-%m"): 0 for start in month_starts}
    try:
        response = (
            supabase.table("chat_history")
            .select("created_at")
            .eq("role", "user")
            .eq("user_email", current_user.email)
            .gte("created_at", first_month)
            .execute()
        )
        for row in response.data or []:
            key = str(row.get("created_at") or "")[:7]
            if key in counts:
                counts[key] += 1
    except Exception:
        pass

    return [
        {"month": start.strftime("%b"), "year": start.year, "queries": counts[start.strftime("%Y-%m")]}
        for start in month_starts
    ]


# ─────────────────────────────────────────────────────────────────────────────
# AUDIT TRAIL
# ─────────────────────────────────────────────────────────────────────────────

def format_ph_time(raw_date: str) -> str:
    """Helper to convert UTC ISO strings to Philippine Standard Time (UTC+8)."""
    if not raw_date:
        return "Unknown Date"
    try:
        from datetime import datetime, timezone, timedelta
        # Parse the UTC time
        dt = datetime.fromisoformat(raw_date.replace("Z", "+00:00"))
        
        # Convert to Philippine Time (UTC+8)
        ph_tz = timezone(timedelta(hours=8))
        dt_ph = dt.astimezone(ph_tz)
        
        return dt_ph.strftime("%B %d, %Y - %I:%M %p")
    except Exception:
        return str(raw_date).split("T")[0]


@app.get("/audit/queries")
def get_query_logs(admin: models.User = Depends(get_current_admin)):
    try:
        response = supabase_query_with_retry(lambda: supabase.table("chat_history").select("*").eq("role", "user").order("created_at", desc=True).limit(100).execute())

        logs = []
        if response.data:
            for index, item in enumerate(response.data):
                logs.append({
                    "id":        item.get("id", index),
                    "user":      item.get("user_email", "Unknown User"),
                    "role":      item.get("user_role",  item.get("role", "User")),
                    "query":     item.get("content",    ""),
                    "timestamp": format_ph_time(item.get("created_at", "")),
                    "status":    "Answered",
                })

        return logs
    except Exception as e:
        print(f"Audit log error: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch query logs")


@app.post("/audit/access")
def log_document_access(log: AccessLogRequest, current_user: models.User = Depends(get_current_user)):
    try:
        supabase.table("document_access_logs").insert({
            "document_name": log.document_name,
            "action_type":   log.action_type,
            # Audit identity must always come from the verified session, never
            # from browser-supplied fields.
            "user_email":    current_user.email,
            "user_role":     role_of(current_user),
        }).execute()
        return {"message": "Access successfully logged"}
    except Exception as e:
        print(f"Failed to log access: {e}")
        return {"message": "Silent failure - do not disrupt user experience"}


@app.get("/audit/access")
def get_document_access_logs(current_user: models.User = Depends(get_current_user)):
    """Return recent document access events for the administrator audit view."""
    try:
        is_admin = is_system_admin(current_user)
        query = supabase.table("document_access_logs").select("*")
        if not is_admin:
            query = query.eq("user_email", current_user.email)
        response = supabase_query_with_retry(
            lambda: query.limit(500).execute()
        )
        # The deployed table uses `accessed_at`; older installations may use
        # `created_at`. Sort after retrieval so either schema remains readable.
        rows = response.data or []
        rows.sort(key=lambda item: item.get("accessed_at") or item.get("created_at") or "", reverse=True)
        return [
            {
                "id": item.get("id", index),
                "user": item.get("user_email", "Unknown User"),
                "role": item.get("user_role", "Unknown"),
                "document": item.get("document_name", "Unknown Document"),
                "action": item.get("action_type", "View"),
                "timestamp": format_ph_time(item.get("accessed_at") or item.get("created_at", "")),
            }
            for index, item in enumerate(rows)
        ]
    except Exception as e:
        print(f"[get_document_access_logs] error: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch document access logs")




@app.get("/audit/versions")
def get_version_history(admin: models.User = Depends(get_current_admin)):
    try:
        response  = supabase_query_with_retry(lambda: supabase.table("document_sections").select("metadata").execute())
        raw_logs  = []

        if response.data:
            for item in response.data:
                meta     = item.get("metadata", {})
                doc_name = meta.get("name")
                version  = meta.get("version", "1.0")

                if doc_name:
                    raw_date = meta.get("upload_date", "")
                    raw_logs.append({
                        "document":  doc_name,
                        "version":   version,
                        "user":      meta.get("uploaded_by", "System Admin"),
                        "status":    meta.get("status", "Active"),
                        "timestamp": format_ph_time(raw_date),
                        "raw_date":  raw_date,
                    })

        raw_logs.sort(key=lambda x: x["raw_date"], reverse=True)

        unique_logs = []
        seen        = set()
        for idx, log in enumerate(raw_logs):
            identifier = f"{log['document']}_v{log['version']}"
            if identifier not in seen:
                seen.add(identifier)
                log["id"] = f"ver_{idx}"
                unique_logs.append(log)

        return unique_logs[:100]

    except Exception as e:
        print(f"Version log fetch error: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch version history")


@app.get("/audit/system")
def get_system_events(admin: models.User = Depends(get_current_admin)):
    try:
        response = supabase_query_with_retry(lambda: supabase.table("system_events_logs").select("*").order("event_date", desc=True).limit(100).execute())

        logs = []
        if response.data:
            for item in response.data:
                logs.append({
                    "id":          item.get("id"),
                    "user":        item.get("user_email",  "Unknown"),
                    "type":        item.get("event_type",  "System Event"),
                    "description": item.get("description", ""),
                    "timestamp":   format_ph_time(item.get("event_date", "")),
                })
        return logs
    except Exception as e:
        print(f"System log fetch error: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch system events")

# ─────────────────────────────────────────────────────────────────────────────
# GRADE EVALUATION
# ─────────────────────────────────────────────────────────────────────────────


# ─────────────────────────────────────────────────────────────────────────────
# CTU GRADE EVALUATION ENGINE
# ─────────────────────────────────────────────────────────────────────────────

def parse_grade_slip_universal(content_bytes: bytes) -> List[dict]:
    """
    Universal, high-precision parser for official CTU Student Information System (SIS)
    grade slips, Certificate of Grades (COG), and multi-column academic transcripts.
    Uses PyMuPDF table geometry analysis (find_tables) to dynamically discover column layouts
    across any program, college, or campus.
    """
    import pymupdf as fitz
    import re

    try:
        doc = fitz.open(stream=content_bytes, filetype="pdf")
    except Exception as e:
        print(f"[parse_grade_slip_universal] PDF read error: {e}")
        return []

    semesters = []
    current_semester = None

    sem_header_pattern = re.compile(
        r'^(?:(?:AY|SY|A\.?Y\.?|S\.?Y\.?)?\s*\d{4}-\d{4}\s+)?(1st|2nd|3rd|Midyear|Summer)\s+(?:Semester|Sem|Term)?(?:\s+(?:SY|A\.?Y\.?|AY)?\s*\d{4}-\d{4})?',
        re.IGNORECASE
    )
    unit_pattern = re.compile(r'^(\d+(?:\.\d+)?)$')
    grade_pattern = re.compile(r'^(1\.[0-9]{1,2}|2\.[0-9]{1,2}|3\.[0-9]{1,2}|4\.[0-9]{1,2}|5\.0{1,2}|INC|DRP|Passed|Failed)$', re.IGNORECASE)

    # 1. First, search for structured tables across all pages
    all_table_rows = []
    has_tables = False

    for page in doc:
        tabs = page.find_tables()
        if tabs.tables:
            has_tables = True
            page_words = page.get_text("words")
            for tab in tabs.tables:
                for table_row in tab.rows:
                    cleaned_row = []
                    for cell in table_row.cells:
                        if not cell:
                            cleaned_row.append("")
                            continue

                        # Table.extract() can corrupt character order in some
                        # official SIS PDFs (3.00 -> "300 .") and concatenate
                        # words. Rebuild each cell from positioned PDF words so
                        # decimal grades and human-readable labels are retained.
                        rect = fitz.Rect(cell)
                        cell_words = [
                            word for word in page_words
                            if rect.contains(fitz.Point(
                                (word[0] + word[2]) / 2,
                                (word[1] + word[3]) / 2,
                            ))
                        ]
                        cell_words.sort(key=lambda word: (word[5], word[6], word[7]))
                        cleaned_row.append(" ".join(word[4] for word in cell_words).strip())

                    # Keep empty cells: the CTU template has distinct columns
                    # for Midterm, Final Term, and Final Grade. Removing blanks
                    # shifts later values into the wrong grade column.
                    if any(cleaned_row):
                        all_table_rows.append(cleaned_row)

    if has_tables and len(all_table_rows) > 3:
        for row in all_table_rows:
            joined_row = " ".join(row).strip()

            # Table extraction may place a semester header across several
            # cells. Match the complete row text instead of requiring one or
            # two cells, otherwise all academic years get merged together.
            if sem_header_pattern.search(joined_row) and not unit_pattern.match(row[0] if row else ""):
                if current_semester and current_semester["subjects_scratchpad"]:
                    semesters.append(current_semester)
                current_semester = {
                    "semester_name": joined_row,
                    "subjects_scratchpad": [],
                    "has_missing_grades": False
                }
                continue

            # Skip header or totals
            if any(h in joined_row.upper() for h in ["MIDTERM", "FINAL GRADE", "COMPLETION", "SUBJECT", "DESCRIPTION"]):
                continue
            if joined_row.upper().startswith("TOTAL UNITS") or joined_row.upper().startswith("TOTAL"):
                continue

            # Identify subject row: locate the Unit column
            if len(row) >= 3:
                unit_val = 3.0
                unit_idx = -1
                for idx, col in enumerate(row):
                    if unit_pattern.match(col):
                        try:
                            val = float(col)
                            if 0.5 <= val <= 12.0:
                                unit_val = val
                                unit_idx = idx
                                break
                        except ValueError:
                            pass

                if unit_idx == -1:
                    continue

                if unit_idx == 1:
                    subject_code = row[0]
                    description = ""
                elif unit_idx == 2:
                    subject_code = row[0]
                    description = row[1]
                else:
                    subject_code = row[1]
                    description = " ".join(row[2:unit_idx])

                full_title = f"{subject_code} - {description}".strip(" -")
                if not full_title:
                    full_title = row[0]

                # Extract grades from the remaining columns after units
                trailing_cols = row[unit_idx + 1:]

                def grade_from_cell(value):
                    for part in value.split():
                        if grade_pattern.match(part):
                            return part
                    return ""

                # In the official template, the final four columns are
                # Midterm, Final Term, Final Grade, and Completion. Preserve
                # their positions so a blank midterm/final-term does not make
                # the final grade appear to be a term grade.
                positioned_grades = []
                if len(row) >= 4:
                    positioned_grades = [grade_from_cell(c) for c in row[-4:-1]]
                if len(positioned_grades) != 3 or not any(positioned_grades):
                    row_grades = [grade_from_cell(c) for c in trailing_cols]
                    row_grades = [g for g in row_grades if g]
                else:
                    row_grades = positioned_grades

                midterm_grade = None
                final_term_grade = None
                final_grade = 0.0

                # CTU 3-Column Architecture:
                # - 3 grades: [Midterm Grade (1st Term), Final Term (2nd Term), FINAL GRADE]
                # - 2 grades: [Midterm Grade, FINAL GRADE]
                # - 1 grade: Teacher omitted periodic marks and entered only FINAL GRADE
                if len(row_grades) == 3:
                    midterm_grade = row_grades[0] or None
                    final_term_grade = row_grades[1] or None
                    last_g = row_grades[2].upper()
                elif len(row_grades) == 2:
                    # Legacy/non-tabular fallback only. The official table
                    # path above always supplies three positional cells.
                    midterm_grade = row_grades[0]
                    last_g = row_grades[1].upper()
                elif len(row_grades) == 1:
                    last_g = row_grades[0].upper()
                else:
                    last_g = ""

                is_missing = False
                if last_g:
                    if last_g in ["INC", "DRP", "FAILED"]:
                        final_grade = 5.0 if last_g == "FAILED" else 0.0
                        is_missing = True
                    elif last_g == "PASSED":
                        final_grade = 1.0
                    else:
                        try:
                            final_grade = float(last_g)
                        except ValueError:
                            final_grade = 0.0
                            is_missing = True
                else:
                    is_missing = True

                if current_semester is None:
                    current_semester = {
                        "semester_name": "General Curriculum",
                        "subjects_scratchpad": [],
                        "has_missing_grades": False
                    }

                if is_missing:
                    current_semester["has_missing_grades"] = True

                weighted = round(unit_val * final_grade, 2)
                current_semester["subjects_scratchpad"].append({
                    "subject": full_title,
                    "units": unit_val,
                    "grade": final_grade,  # Strictly the FINAL GRADE
                    "midterm_grade": float(midterm_grade) if midterm_grade and midterm_grade.replace('.', '', 1).isdigit() else None,
                    "final_term_grade": float(final_term_grade) if final_term_grade and final_term_grade.replace('.', '', 1).isdigit() else None,
                    "weighted_score": weighted
                })

        if current_semester and current_semester["subjects_scratchpad"]:
            semesters.append(current_semester)

    return semesters


def build_ctu_evaluation_result(semesters: List[dict]) -> dict:
    """Computes instant, deterministic GWA, honors status, and recommendations."""
    total_units = 0.0
    total_weighted = 0.0
    has_failed = False
    completed_semesters = 0

    for sem in semesters:
        sem_units = 0.0
        sem_weighted = 0.0
        sem_has_grades = False
        for sub in sem.get("subjects_scratchpad", []):
            g = float(sub.get("grade", 0.0))
            u = float(sub.get("units", 0.0))
            if 0.0 < g <= 5.0:
                sem_units += u
                sem_weighted += (u * g)
                sem_has_grades = True
                if g > 3.0:
                    has_failed = True
        if sem_has_grades:
            completed_semesters += 1
            total_units += sem_units
            total_weighted += sem_weighted

    cumulative_gwa = round(total_weighted / total_units, 2) if total_units > 0 else 0.0

    if cumulative_gwa > 0 and cumulative_gwa <= 1.75 and not has_failed:
        standing = "Dean's Lister (First Honors Candidate)"
    elif cumulative_gwa > 0 and cumulative_gwa <= 2.0 and not has_failed:
        standing = "Dean's Lister Candidate"
    elif cumulative_gwa > 0 and cumulative_gwa <= 3.0 and not has_failed:
        standing = "Regular Academic Standing in Good Standing"
    elif has_failed:
        standing = "Academic Probation / Conditional (Has Deficiencies)"
    else:
        standing = "Under Ongoing Evaluation"

    summary = (
        f"You have completed {total_units:.1f} total academic units across {completed_semesters} graded semesters "
        f"with a cumulative Grade Point Average (GWA) of {cumulative_gwa:.2f}. "
        f"Your current academic qualification is {standing}, demonstrating consistent subject mastery under CTU curricular standards."
    )

    recommendations = [
        f"Maintain consistent performance with your remaining senior courses to preserve your cumulative GWA of {cumulative_gwa:.2f}.",
        "Verify with the campus Registrar that all prerequisite course credits and laboratory completions are reconciled before official graduation filing.",
        "Prepare documentation and professional credentials early for your upcoming On-the-Job Training (OJT) and senior industry placement."
    ]

    return {
        "semesters": semesters,
        "summary": summary,
        "recommendations": recommendations
    }


@app.post("/evaluate-grades")
async def evaluate_grades(
    file: UploadFile = File(...),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Evaluates CTU grade slip PDFs.
    Uses universal PyMuPDF table geometry analysis (find_tables) for structured PDFs across all programs,
    and falls back to PyMuPDF + PaddleOCR + ultra-fast LLM extraction for scanned or non-standard documents.
    """
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Please upload a valid PDF file.")

    try:
        content = await read_upload_limited(file)
        if not content:
            raise HTTPException(status_code=400, detail="Uploaded PDF file is empty.")

        # 1. Universal Table Extraction (Fast, works for any program/campus with tabular layout)
        parsed_semesters = parse_grade_slip_universal(content)
        if parsed_semesters and any(len(s.get("subjects_scratchpad", [])) > 0 for s in parsed_semesters):
            return build_ctu_evaluation_result(parsed_semesters)

        # 2. Fallback: Robust PyMuPDF (fitz) with automatic PaddleOCR scan fallback
        raw_text = extract_pdf_text(content)
        if not raw_text.strip():
            raise HTTPException(status_code=422, detail="Could not extract readable text or OCR content from this PDF.")

        system_prompt = """
        You are a meticulous Academic Data Extractor for Cebu Technological University (CTU).
        Your job is to parse scrambled PDF text and extract subjects, units, and grades into a clean JSON structure.

        CRITICAL CTU GRADING COLUMN ARCHITECTURE:
        1. In CTU, each semester consists of 2 terms:
           - 1st term grade is in the "Midterm Grade" column.
           - 2nd term grade is in the "Final Term" column.
           - The official final grade / GWA for that subject is in the "FINAL GRADE" column.
        2. TEACHERS OFTEN LEAVE Midterm Grade or Final Term grades BLANK, entering ONLY the "FINAL GRADE".
           - DO NOT assume or mark a subject as "N/A" or "incomplete" just because Midterm Grade or Final Term grade is empty!
           - If a subject has a valid "FINAL GRADE" (between 1.0 and 5.0, or Passed), that subject is COMPLETE and NOT N/A.
           - ALWAYS take the "FINAL GRADE" as the subject's grade for calculation and weighted score.
        3. When multiple grades appear for a subject (e.g. 1.2, 1.4, 1.3), the LAST number is the FINAL GRADE.
        4. UNITS are typically integers or decimals like 2.00, 3.00, or 5.00.
        5. Mark grade as 0 and 'has_missing_grades' as true ONLY if the FINAL GRADE itself is missing, blank, INC, or DRP.

        You MUST respond with a pure JSON object in this EXACT format:
        {
          "semesters": [
            {
              "semester_name": "1st Semester SY 2023-2024",
              "subjects_scratchpad": [
                {"subject": "CS46 FUNCTIONAL ENGLISH", "units": 3.0, "grade": 1.6, "midterm_grade": 1.4, "final_term_grade": 1.7, "weighted_score": 4.8},
                {"subject": "CS47 ART APP", "units": 3.0, "grade": 0, "midterm_grade": null, "final_term_grade": null, "weighted_score": 0}
              ],
              "has_missing_grades": true
            }
          ],
          "summary": "2-3 sentences summarizing performance. Be direct using 'You'.",
          "recommendations": ["Recommendation 1", "Recommendation 2", "Recommendation 3"]
        }
        """

        # Use the same administrator-controlled provider selection as Ask Policy.
        # Automatic mode tries local Ollama first, then Groq only when local
        # generation is unavailable.
        settings = db.query(models.SystemSettings).filter(models.SystemSettings.id == 1).first()
        provider_mode = getattr(settings, "ai_provider", "local") if settings else "local"
        local_model = getattr(settings, "ai_model", "llama3.1") if settings else "llama3.1"
        groq_model = getattr(settings, "groq_model", "qwen/qwen3.8-27b") if settings else "qwen/qwen3.8-27b"

        response, _provider_used = run_ai_chat(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user",   "content": f"Here is the raw text from the grade slip:\n\n{raw_text[:8000]}"}
            ],
            local_model=local_model,
            groq_model=groq_model,
            provider_mode=provider_mode,
            temperature=0.1,
            max_tokens=1800,
            response_format={"type": "json_object"}
        )

        result_raw = response.choices[0].message.content.strip()
        if result_raw.startswith("```"):
            result_raw = re.sub(r"^```(?:json)?", "", result_raw, flags=re.IGNORECASE)
            result_raw = re.sub(r"```$", "", result_raw).strip()

        try:
            return json.loads(result_raw)
        except Exception:
            m = re.search(r"\{.*\}", result_raw, re.DOTALL)
            if m:
                return json.loads(m.group(0))
            raise

    except HTTPException:
        raise
    except AIProviderUnavailable as e:
        _log.warning("grade_evaluation_ai_unavailable", extra={"request_id": _request_id.get()})
        raise HTTPException(status_code=503, detail=str(e))
    except Exception:
        _log.exception("grade_evaluation_failed", extra={"request_id": _request_id.get()})
        raise HTTPException(
            status_code=500,
            detail="The grade slip could not be evaluated. Verify that it is a readable CTU PDF and try again.",
        )



# ─────────────────────────────────────────────────────────────────────────────

# -----------------------------------------------------------------------------------------------------------------------

# -----------------------------------------------------------------------------------------------------------------------
# CAR FORMS (Form 1) CRUD
# -----------------------------------------------------------------------------------------------------------------------

CAR_STATUS_TRANSITIONS = {
    "Draft": {"Issued", "Void"},
    "Issued": {"Acknowledged", "Void"},
    "Acknowledged": {"Response Submitted", "Void"},
    "Response Submitted": {"In Progress", "Void"},
    "In Progress": {"Awaiting Verification", "Void"},
    "Awaiting Verification": {"Returned", "Closed", "Void"},
    "Returned": {"Response Submitted", "In Progress", "Void"},
    "Closed": set(),
    "Void": set(),
}


def validate_car_status_transition(current_status, requested_status):
    current = str(current_status or "Issued")
    requested = str(requested_status or current)
    if requested == current:
        return
    allowed = CAR_STATUS_TRANSITIONS.get(current, set())
    if requested not in allowed:
        allowed_text = ", ".join(sorted(allowed)) or "none (terminal state)"
        raise HTTPException(
            status_code=409,
            detail=f"Invalid CAR status transition from '{current}' to '{requested}'. Allowed next status: {allowed_text}.",
        )


def generate_controlled_car_number(db, cycle):
    """Allocate one concurrency-safe sequence number per audit cycle."""
    db.execute(
        text("INSERT INTO car_number_counters (cycle_id, next_number) VALUES (:cycle_id, 1) ON CONFLICT (cycle_id) DO NOTHING"),
        {"cycle_id": cycle.id},
    )
    counter = (
        db.query(models.CARNumberCounter)
        .filter(models.CARNumberCounter.cycle_id == cycle.id)
        .with_for_update()
        .one()
    )
    sequence = counter.next_number
    counter.next_number = sequence + 1
    year_match = re.search(r"\b(20\d{2})\b", cycle.name or "")
    year = year_match.group(1) if year_match else str(utc_now().year)
    return f"CTU-CAR-{year}-{sequence:04d}"


def history_json_value(value):
    if isinstance(value, (datetime, date, uuid.UUID)):
        return value.isoformat() if hasattr(value, "isoformat") else str(value)
    if isinstance(value, (dict, list, str, int, float, bool)) or value is None:
        return value
    return str(value)


def record_car_status_history(db, car, from_status, to_status, actor_id, reason=None):
    db.add(models.CARStatusHistory(
        car_id=car.id,
        from_status=from_status,
        to_status=to_status,
        reason=(reason or "").strip() or None,
        changed_by_id=actor_id,
    ))


def apply_car_lifecycle_timestamp(car, status_name, timestamp=None):
    timestamp = timestamp or utc_now()
    field_by_status = {
        "Issued": "issued_at",
        "Acknowledged": "acknowledged_at",
        "In Progress": "in_progress_at",
        "Awaiting Verification": "awaiting_verification_at",
        "Returned": "returned_at",
        "Closed": "closed_at",
        "Void": "voided_at",
    }
    field = field_by_status.get(status_name)
    if field:
        setattr(car, field, timestamp)


def car_notification_recipients(db, car, include_office=False, include_reviewers=False, include_assignee=True):
    recipients = {}
    if include_assignee and car.assigned_to_user and car.assigned_to_user.status == "Active":
        recipients[car.assigned_to_user.email.casefold()] = car.assigned_to_user
    query = db.query(models.User).filter(models.User.status == "Active")
    for user in query.all():
        _load_effective_assignments(user, db)
        assignment_types = car_assignment_types(user)
        if include_reviewers and assignment_types & {"QA_HEAD", "IQA_AUDITOR"}:
            recipients[user.email.casefold()] = user
        if include_office and assignment_types & {"OFFICE_HEAD", "OFFICE_MEMBER"} and can_access_office(user, car.responsible_office):
            recipients[user.email.casefold()] = user
    return list(recipients.values())


def send_car_notification_once(db, car, event_key, recipients, n_type, title, message):
    sent = 0
    for recipient in recipients:
        email = recipient.email.casefold()
        exists = db.query(models.CARNotificationEvent.id).filter(
            models.CARNotificationEvent.car_id == car.id,
            models.CARNotificationEvent.event_key == event_key,
            models.CARNotificationEvent.recipient_email == email,
        ).first()
        if exists:
            continue
        if _send_notification(email, n_type, title, message):
            db.add(models.CARNotificationEvent(car_id=car.id, event_key=event_key, recipient_email=email))
            sent += 1
    if sent:
        db.commit()
    return sent


def run_car_monitoring(db, cars=None):
    today = utc_now().date()
    cars = cars if cars is not None else db.query(models.CARForm).all()
    summary = {"reviewed": len(cars), "reminders_sent": 0, "overdue_sent": 0, "major_escalations_sent": 0}
    for car in cars:
        if car.status in {"Closed", "Void"} or not car.target_date:
            continue
        try:
            target = datetime.strptime(car.target_date, "%Y-%m-%d").date()
        except (TypeError, ValueError):
            continue
        days_until = (target - today).days
        office_recipients = car_notification_recipients(db, car, include_office=True)
        if days_until in {7, 3, 1, 0}:
            summary["reminders_sent"] += send_car_notification_once(
                db, car, f"deadline-{target.isoformat()}-{days_until}", office_recipients,
                "warning", f"CAR {car.car_no or 'pending'} deadline reminder",
                f"The corrective response for {car.responsible_office} is due {target.isoformat()} ({days_until} day(s) remaining).",
            )
        if days_until < 0:
            overdue_days = abs(days_until)
            summary["overdue_sent"] += send_car_notification_once(
                db, car, f"overdue-{today.isoformat()}", office_recipients,
                "error", f"CAR {car.car_no or 'pending'} is overdue",
                f"The corrective response is {overdue_days} day(s) overdue. Please update the action and evidence.",
            )
            if car.finding_category == "MAJOR":
                reviewers = car_notification_recipients(db, car, include_reviewers=True, include_assignee=False)
                summary["major_escalations_sent"] += send_car_notification_once(
                    db, car, f"major-escalation-{today.isoformat()}", reviewers,
                    "error", f"Major CAR escalation: {car.car_no or 'pending'}",
                    f"A Major finding for {car.responsible_office} is {overdue_days} day(s) overdue and requires QA attention.",
                )
    return summary


async def car_monitoring_loop():
    await asyncio.sleep(30)
    while True:
        db = SessionLocal()
        try:
            run_car_monitoring(db)
        except Exception:
            db.rollback()
            _log.exception("car_monitoring_cycle_failed")
        finally:
            db.close()
        await asyncio.sleep(6 * 60 * 60)


@app.on_event("startup")
async def start_car_monitoring_loop():
    asyncio.create_task(car_monitoring_loop())


CAR_AUDITOR_FIELDS = {
    "car_no", "date_issued", "revision", "finding_category", "type_of_non_conformity",
    "auditor_name", "initiator", "campus", "area", "findings", "requirement_reference",
    "objective_evidence", "nonconformity_statement",
}
CAR_RESPONSE_FIELDS = {
    "root_cause", "root_cause_method", "root_cause_analysis", "immediate_action", "corrective_measure", "measures_proposed_by", "target_date",
}
CAR_ACKNOWLEDGEMENT_FIELDS = {"acknowledged_by"}
CAR_VERIFICATION_FIELDS = {
    "follow_up_result", "follow_up_date", "comments_remarks", "non_conformity_closed", "effectiveness_outcome",
}


def car_assignment_types(user):
    return {str(item.get("assignment_type") or "").upper() for item in assignments_of(user)}


def is_car_reviewer(user):
    return role_of(user) == "PERSONNEL" and bool(car_assignment_types(user) & {"QA_HEAD", "IQA_AUDITOR"})


def is_car_office_head(user, car):
    return (
        role_of(user) == "PERSONNEL"
        and "OFFICE_HEAD" in car_assignment_types(user)
        and can_access_office(user, car.responsible_office)
    )


def is_car_office_participant(user, car):
    if role_of(user) != "PERSONNEL":
        return False
    if car.assigned_to_id and str(car.assigned_to_id) == str(user.id):
        return True
    if car.assigned_to_id:
        return is_car_office_head(user, car)
    return bool(
        car_assignment_types(user) & {"OFFICE_HEAD", "OFFICE_MEMBER"}
        and can_access_office(user, car.responsible_office)
    )


def require_car_reviewer(user):
    if not is_car_reviewer(user):
        raise HTTPException(403, "A QA Head or IQA Auditor assignment is required for this CAR action.")


CAR_ISSUABLE_CATEGORIES = {"MAJOR", "MINOR", "OBSERVATION", "OPPORTUNITY_FOR_IMPROVEMENT"}


def get_car_classification_rule(db, category):
    normalized = str(category or "").strip().upper()
    return db.execute(text(
        "SELECT category, display_name, requires_car, is_active, sort_order "
        "FROM car_classification_rules WHERE category = :category"
    ), {"category": normalized}).mappings().first()


def validate_car_issuance(db, category, requirement_reference, objective_evidence, statement):
    normalized = str(category or "").strip().upper()
    if normalized not in CAR_ISSUABLE_CATEGORIES:
        raise HTTPException(422, "Select a valid finding classification before issuing the CAR.")
    rule = get_car_classification_rule(db, normalized)
    if not rule or not rule["is_active"]:
        raise HTTPException(422, "This finding classification is not active.")
    if not rule["requires_car"]:
        raise HTTPException(409, f"{rule['display_name']} is configured not to require a CAR.")
    missing = []
    if not str(requirement_reference or "").strip(): missing.append("requirement or clause")
    if not str(objective_evidence or "").strip(): missing.append("objective evidence")
    if not str(statement or "").strip(): missing.append("statement of nonconformity")
    if missing:
        raise HTTPException(422, "Complete the structured finding before issuance: " + ", ".join(missing) + ".")


def validate_car_source_integrity(source_path, source_hash, human_verified):
    normalized_path = str(source_path or "")
    if not normalized_path.startswith("car-source/") or ".." in normalized_path.split("/"):
        raise HTTPException(422, "Attach and review the original CAR Form 1 scan before issuance.")
    if not re.fullmatch(r"[0-9a-f]{64}", str(source_hash or "")):
        raise HTTPException(422, "The source document integrity hash is missing or invalid.")
    try:
        source_bytes = supabase.storage.from_("documents").download(normalized_path)
    except Exception as exc:
        raise HTTPException(422, "The preserved source scan could not be retrieved.") from exc
    if hashlib.sha256(source_bytes).hexdigest() != source_hash:
        raise HTTPException(409, "The source scan no longer matches its recorded integrity hash.")
    if not human_verified:
        raise HTTPException(422, "Confirm that a human reviewer compared the extracted fields with the original scan.")


def validate_root_cause_response(method, analysis, narrative):
    method = str(method or "").upper()
    analysis = analysis or {}
    if method == "FIVE_WHYS":
        whys = [str(item).strip() for item in analysis.get("whys", []) if str(item).strip()]
        if len(whys) < 3:
            raise HTTPException(422, "Five Whys analysis requires at least three completed why statements.")
    elif method == "FISHBONE":
        categories = analysis.get("categories", {})
        if not isinstance(categories, dict) or not any(str(value).strip() for value in categories.values()):
            raise HTTPException(422, "Fishbone analysis requires at least one documented cause category.")
    elif method == "FREE_FORM":
        if not str(analysis.get("narrative") or narrative or "").strip():
            raise HTTPException(422, "Enter the free-form root-cause analysis.")
    else:
        raise HTTPException(422, "Select Five Whys, Fishbone, or Free-form root-cause analysis.")


def validate_car_verification_decision(car, requested_status, outcome, follow_up_date, comments):
    actions = list(car.action_plan or [])
    if requested_status == "Closed":
        if outcome != "EFFECTIVE":
            raise HTTPException(422, "Only an Effective verification outcome may close a CAR.")
        if not car.verification_evidences:
            raise HTTPException(422, "Attach QA verification evidence before closing the CAR.")
        if not follow_up_date or not str(comments or "").strip():
            raise HTTPException(422, "Follow-up date and verification remarks are required for closure.")
        if not actions or any(action.status != "Completed" for action in actions):
            raise HTTPException(422, "Every corrective action must be completed before closure.")
        if any(not action.evidences for action in actions):
            raise HTTPException(422, "Every corrective action must have implementation evidence before closure.")
    elif requested_status == "Returned":
        if outcome not in {"PARTIALLY_EFFECTIVE", "INEFFECTIVE", "ADDITIONAL_EVIDENCE_REQUIRED"}:
            raise HTTPException(422, "Select Partially Effective, Ineffective, or Additional Evidence Required when returning a CAR.")
        if not str(comments or "").strip():
            raise HTTPException(422, "Explain why the response is being returned.")


def validate_car_assignee(db, user_id, responsible_office):
    if not user_id:
        return None
    assignee = db.query(models.User).filter(models.User.id == user_id, models.User.status == "Active").first()
    if not assignee:
        raise HTTPException(400, "The designated responsible person is unavailable.")
    _load_effective_assignments(assignee, db)
    if not (
        role_of(assignee) == "PERSONNEL"
        and car_assignment_types(assignee) & {"OFFICE_HEAD", "OFFICE_MEMBER"}
        and can_access_office(assignee, responsible_office)
    ):
        raise HTTPException(400, "The designated person must be an active member or head of the responsible office.")
    return assignee


def authorize_car_status_transition(user, car, requested_status, requested_assignee_id=None):
    if requested_status in {"Issued", "Returned", "Closed", "Void"}:
        require_car_reviewer(user)
    elif requested_status == "Acknowledged":
        effective_assignee_id = requested_assignee_id or car.assigned_to_id
        if not (is_car_office_head(user, car) or (effective_assignee_id and str(effective_assignee_id) == str(user.id))):
            raise HTTPException(403, "The responsible Office Head or designated auditee must acknowledge this CAR.")
    elif requested_status in {"Response Submitted", "In Progress", "Awaiting Verification"}:
        if not is_car_office_participant(user, car):
            raise HTTPException(403, "Only the designated responsible office may submit or progress this response.")

def car_office(car, db):
    clause_id = getattr(car, "iso_clause_id", None)
    if clause_id:
        clause = db.query(models.ISORequirement).filter(models.ISORequirement.id == clause_id).first()
        if not clause:
            raise HTTPException(404, "Linked ISO requirement not found.")
        return clause.auditee_office
    return getattr(car, "responsible_office", None) or getattr(car, "area", None)


def require_iso_cycle(db, cycle_year):
    cycle = db.query(models.ISOAuditCycle).filter(models.ISOAuditCycle.name == cycle_year).first()
    if not cycle:
        raise HTTPException(404, "ISO audit cycle not found. Initialize the cycle before creating a CAR.")
    return cycle


def create_audit_finding_for_car(db, payload, cycle, responsible_office, source_type="MANUAL"):
    clause = None
    if payload.iso_clause_id:
        clause = db.query(models.ISORequirement).filter(models.ISORequirement.id == payload.iso_clause_id).first()
        if not clause:
            raise HTTPException(404, "Linked ISO requirement not found.")
        if clause.cycle_year != cycle.name:
            raise HTTPException(409, "The ISO clause and CAR must belong to the same audit cycle.")
    finding = models.ISOAuditFinding(
        cycle_id=cycle.id,
        iso_clause_id=clause.id if clause else None,
        responsible_office=responsible_office,
        finding_text=(payload.nonconformity_statement or payload.findings or "").strip(),
        requirement_reference=(payload.requirement_reference or (f"ISO clause {clause.iso_clause}: {clause.description}" if clause else None)),
        objective_evidence=(payload.objective_evidence or "").strip() or None,
        nonconformity_statement=(payload.nonconformity_statement or payload.findings or "").strip() or None,
        finding_category=payload.finding_category or "UNKNOWN",
        source_type=source_type,
    )
    db.add(finding)
    db.flush()
    return finding


@app.get("/car-forms", response_model=List[schemas.CARFormResponse])
def get_car_forms(
    cycle_year: str = Query("2025 Surveillance"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_faculty_or_admin)
):
    query = db.query(models.CARForm).filter(models.CARForm.cycle_year == cycle_year)
    return [car for car in query.order_by(models.CARForm.created_at.desc()).all() if can_access_office(current_user, car_office(car, db))]


@app.get("/car-forms/eligible-assignees")
def get_car_eligible_assignees(
    office: str = Query(..., min_length=1),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_faculty_or_admin),
):
    if not can_access_office(current_user, office):
        raise HTTPException(403, "This office is outside your CAR access scope.")
    eligible = []
    for candidate in db.query(models.User).filter(
        models.User.role == "PERSONNEL", models.User.status == "Active"
    ).order_by(models.User.full_name).all():
        _load_effective_assignments(candidate, db)
        if (
            car_assignment_types(candidate) & {"OFFICE_HEAD", "OFFICE_MEMBER"}
            and can_access_office(candidate, office)
        ):
            eligible.append({
                "id": str(candidate.id),
                "full_name": candidate.full_name or candidate.email,
                "email": candidate.email,
                "assignments": sorted(car_assignment_types(candidate) & {"OFFICE_HEAD", "OFFICE_MEMBER"}),
            })
    return eligible


@app.post("/car-forms", response_model=schemas.CARFormResponse, status_code=status.HTTP_201_CREATED)
def create_car_form(
    payload: schemas.CARFormCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_faculty_or_admin),
):
    require_car_reviewer(current_user)
    responsible_office = car_office(payload, db)
    require_office(current_user, responsible_office)
    validate_car_assignee(db, payload.assigned_to_id, responsible_office)
    if payload.status not in {"Draft", "Issued"}:
        raise HTTPException(409, "A new CAR must begin as Draft or Issued.")
    requirement_reference = payload.requirement_reference
    if payload.iso_clause_id and not requirement_reference:
        clause = db.query(models.ISORequirement).filter(models.ISORequirement.id == payload.iso_clause_id).first()
        if clause:
            requirement_reference = f"ISO clause {clause.iso_clause}: {clause.description}"
    statement = payload.nonconformity_statement or payload.findings
    if payload.status == "Issued":
        validate_car_issuance(db, payload.finding_category, requirement_reference, payload.objective_evidence, statement)
        validate_car_source_integrity(payload.source_file_path, payload.source_sha256, payload.human_verified)
    if payload.non_conformity_closed or payload.follow_up_result or payload.follow_up_date or payload.comments_remarks:
        require_reviewer(current_user)
    cycle = require_iso_cycle(db, payload.cycle_year)
    try:
        finding = create_audit_finding_for_car(db, payload, cycle, responsible_office)
        item_data = payload.model_dump(exclude={"requirement_reference", "objective_evidence", "nonconformity_statement", "human_verified"})
        item_data["car_no"] = generate_controlled_car_number(db, cycle) if payload.status == "Issued" else None
        item = models.CARForm(
            **item_data,
            cycle_id=cycle.id,
            audit_finding_id=finding.id,
            responsible_office=responsible_office,
            issued_by_id=current_user.id,
            human_verified_by_id=current_user.id if payload.human_verified else None,
            human_verified_at=utc_now() if payload.human_verified else None,
        )
        db.add(item)
        db.flush()
        apply_car_lifecycle_timestamp(item, payload.status)
        record_car_status_history(db, item, None, payload.status, current_user.id, "CAR created")
        db.commit()
    except Exception:
        db.rollback()
        raise
    db.refresh(item)
    if item.status == "Issued":
        send_car_notification_once(
            db, item, "issued", car_notification_recipients(db, item, include_office=True),
            "warning", f"Corrective Action Request issued: {item.car_no}",
            f"A CAR was issued to {item.responsible_office}. Review, acknowledge, and assign the corrective response.",
        )
    return item




@app.put("/car-forms/{car_id}", response_model=schemas.CARFormResponse)
def update_car_form(
    car_id: str,
    payload: schemas.CARFormUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_faculty_or_admin),
):
    car = db.query(models.CARForm).filter(models.CARForm.id == car_id).first()
    if not car:
        raise HTTPException(status_code=404, detail="CAR Form not found")
    require_office(current_user, car_office(car, db))

    changed_fields = {
        field for field in payload.model_fields_set
        if hasattr(car, field) and getattr(payload, field) != getattr(car, field, None)
    }
    structured_finding_fields = payload.model_fields_set & {"requirement_reference", "objective_evidence", "nonconformity_statement"}
    changed_fields |= structured_finding_fields
    if role_of(current_user) == "SYSTEM_ADMIN" and changed_fields:
        raise HTTPException(403, "System Administrators have CAR oversight access but do not perform operational workflow actions.")
    if "car_no" in changed_fields:
        raise HTTPException(409, "CAR numbers are system-generated and cannot be edited manually.")
    if changed_fields & CAR_AUDITOR_FIELDS:
        require_car_reviewer(current_user)
        if car.status != "Draft":
            raise HTTPException(409, "The auditor finding is locked after the CAR is issued.")
    if changed_fields & CAR_ACKNOWLEDGEMENT_FIELDS:
        if not (is_car_office_head(current_user, car) or (car.assigned_to_id and str(car.assigned_to_id) == str(current_user.id))):
            raise HTTPException(403, "Only the responsible Office Head or designated auditee may edit acknowledgement details.")
    if changed_fields & CAR_RESPONSE_FIELDS and not is_car_office_participant(current_user, car):
        raise HTTPException(403, "Only the designated responsible office may edit the corrective response.")
    if changed_fields & CAR_VERIFICATION_FIELDS:
        require_car_reviewer(current_user)
    if "assigned_to_id" in changed_fields:
        if not (is_car_reviewer(current_user) or is_car_office_head(current_user, car)):
            raise HTTPException(403, "Only the auditor or responsible Office Head may designate responsible personnel.")
        validate_car_assignee(db, payload.assigned_to_id, car.responsible_office)
    if payload.area is not None and "area" in changed_fields:
        require_car_reviewer(current_user)
        require_office(current_user, payload.area)
    if "status" in changed_fields and payload.status is not None:
        validate_car_status_transition(car.status, payload.status)
        if payload.status == "Acknowledged" and not (payload.assigned_to_id or car.assigned_to_id):
            raise HTTPException(422, "Designate a responsible person before acknowledging this CAR.")
        authorize_car_status_transition(current_user, car, payload.status, payload.assigned_to_id)
        if payload.status == "Issued":
            validate_car_issuance(
                db,
                payload.finding_category or car.finding_category,
                payload.requirement_reference if "requirement_reference" in structured_finding_fields else car.requirement_reference,
                payload.objective_evidence if "objective_evidence" in structured_finding_fields else car.objective_evidence,
                payload.nonconformity_statement if "nonconformity_statement" in structured_finding_fields else car.nonconformity_statement,
            )
            validate_car_source_integrity(
                car.source_file_path,
                car.source_sha256,
                bool(car.human_verified_at) or payload.human_verified is True,
            )
            if not car.car_no:
                car.car_no = generate_controlled_car_number(db, car.cycle)
        if payload.status == "Response Submitted":
            method = payload.root_cause_method or car.root_cause_method
            analysis = payload.root_cause_analysis if payload.root_cause_analysis is not None else car.root_cause_analysis
            narrative = payload.root_cause if payload.root_cause is not None else car.root_cause
            validate_root_cause_response(method, analysis, narrative)
            if not str(payload.immediate_action if payload.immediate_action is not None else car.immediate_action or "").strip():
                raise HTTPException(422, "Document the correction or containment taken before submitting the response.")
            actions = list(car.action_plan or [])
            if not actions:
                raise HTTPException(422, "Add at least one recurrence-preventing corrective action before submitting the response.")
            for action in actions:
                if not action.owner_user_id or not action.target_date or not str(action.expected_evidence or "").strip():
                    raise HTTPException(422, f"Action {action.sequence_number} requires an owner, target date, and expected evidence.")
        if payload.status in {"Returned", "Closed"}:
            validate_car_verification_decision(
                car,
                payload.status,
                payload.effectiveness_outcome or car.effectiveness_outcome,
                payload.follow_up_date or car.follow_up_date,
                payload.comments_remarks if payload.comments_remarks is not None else car.comments_remarks,
            )
        if payload.status == "Void" and len(str(payload.void_reason or "").strip()) < 10:
            raise HTTPException(422, "Provide a clear reason of at least 10 characters before voiding an issued CAR.")

    revision_changes = {}
    for field in changed_fields:
        if field in structured_finding_fields:
            old_value = getattr(car, field, None)
        else:
            old_value = getattr(car, field, None)
        new_value = getattr(payload, field, None)
        revision_changes[field] = {"from": history_json_value(old_value), "to": history_json_value(new_value)}
    previous_status = car.status

    update_data = {field: getattr(payload, field) for field in changed_fields if hasattr(car, field) and field not in structured_finding_fields}
        
    for key, value in update_data.items():
        setattr(car, key, value)

    if payload.status == "Issued" and "status" in changed_fields:
        car.issued_by_id = current_user.id
        if payload.human_verified is True and not car.human_verified_at:
            car.human_verified_by_id = current_user.id
            car.human_verified_at = utc_now()
    elif payload.status == "Acknowledged" and "status" in changed_fields:
        car.acknowledged_by_id = current_user.id
        car.acknowledged_by = current_user.full_name or current_user.email
    elif payload.status == "Response Submitted" and "status" in changed_fields:
        car.response_submitted_by_id = current_user.id
        car.response_submitted_at = utc_now()
        car.effectiveness_outcome = None
        car.verified_at = None
        car.non_conformity_closed = False
        for action in car.action_plan or []:
            if action.status == "Proposed":
                action.status = "In Progress"
    elif payload.status in {"Returned", "Closed"} and "status" in changed_fields:
        car.verified_by_id = current_user.id
        car.verified_at = utc_now()
        car.non_conformity_closed = payload.status == "Closed"
        if payload.status == "Returned":
            for action in car.action_plan or []:
                action.status = "In Progress"
    if "status" in changed_fields and payload.status:
        transition_reason = payload.void_reason if payload.status == "Void" else payload.comments_remarks
        apply_car_lifecycle_timestamp(car, payload.status)
        record_car_status_history(db, car, previous_status, payload.status, current_user.id, transition_reason)
        if payload.status == "Void":
            car.voided_by_id = current_user.id
            car.void_reason = payload.void_reason.strip()
    if "non_conformity_closed" in changed_fields and "status" not in changed_fields:
        raise HTTPException(409, "Closure is controlled by the CAR verification decision, not by the checkbox alone.")

    if payload.area is not None and payload.area.strip():
        car.responsible_office = payload.area.strip()
        car.audit_finding.responsible_office = car.responsible_office
    if payload.findings is not None:
        car.audit_finding.finding_text = payload.findings
    if payload.finding_category is not None:
        car.audit_finding.finding_category = payload.finding_category
    if "requirement_reference" in structured_finding_fields:
        car.audit_finding.requirement_reference = payload.requirement_reference
    if "objective_evidence" in structured_finding_fields:
        car.audit_finding.objective_evidence = payload.objective_evidence
    if "nonconformity_statement" in structured_finding_fields:
        car.audit_finding.nonconformity_statement = payload.nonconformity_statement
        car.audit_finding.finding_text = payload.nonconformity_statement or car.audit_finding.finding_text
        car.findings = payload.nonconformity_statement
    for action in car.action_plan or []:
        action.auditee_office = car.responsible_office
        action.findings = car.findings or ""
    if revision_changes:
        db.add(models.CARRevisionHistory(
            car_id=car.id,
            changed_fields=revision_changes,
            changed_by_id=current_user.id,
        ))
    car.updated_at = utc_now()
        
    db.commit()
    db.refresh(car)
    if "status" in changed_fields and payload.status == "Awaiting Verification":
        send_car_notification_once(
            db, car, f"awaiting-verification-{car.awaiting_verification_at.isoformat() if car.awaiting_verification_at else 'current'}",
            car_notification_recipients(db, car, include_reviewers=True, include_assignee=False),
            "info", f"CAR ready for verification: {car.car_no}",
            f"The corrective response from {car.responsible_office} is ready for QA/IQA verification.",
        )
    return car


@app.get("/car-forms/{car_id}/source-url")
def get_car_source_url(
    car_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_faculty_or_admin),
):
    car = db.query(models.CARForm).filter(models.CARForm.id == car_id).first()
    if not car:
        raise HTTPException(404, "CAR Form not found.")
    require_office(current_user, car_office(car, db))
    if not car.source_file_path:
        raise HTTPException(404, "This CAR has no preserved source scan.")
    signed_url = create_private_file_url(car.source_file_path)
    if not signed_url:
        raise HTTPException(500, "Unable to generate the source-document preview.")
    return {"url": signed_url, "file_name": car.source_file_name, "mime_type": car.source_mime_type}


@app.post("/car-forms/{car_id}/verification-evidence", status_code=status.HTTP_201_CREATED)
async def upload_car_verification_evidence(
    car_id: str,
    file: UploadFile = File(...),
    notes: str = Form(""),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_faculty_or_admin),
):
    car = db.query(models.CARForm).filter(models.CARForm.id == car_id).first()
    if not car:
        raise HTTPException(404, "CAR Form not found.")
    require_office(current_user, car_office(car, db))
    require_car_reviewer(current_user)
    if car.status != "Awaiting Verification":
        raise HTTPException(409, "Verification evidence may be added only while the CAR awaits verification.")
    contents = await read_upload_limited(file)
    safe_name = re.sub(r"[^A-Za-z0-9._-]+", "_", os.path.basename(file.filename or "verification-evidence"))
    path = f"car-verification/{car.id}/{uuid.uuid4()}_{safe_name}"
    try:
        supabase.storage.from_("documents").upload(
            path=path, file=contents,
            file_options={"content-type": file.content_type or "application/octet-stream"},
        )
        evidence = models.CARVerificationEvidence(
            car_id=car.id,
            file_name=file.filename or safe_name,
            storage_path=path,
            mime_type=file.content_type,
            file_size=len(contents),
            sha256=hashlib.sha256(contents).hexdigest(),
            notes=notes.strip() or None,
            uploaded_by_id=current_user.id,
        )
        db.add(evidence)
        db.commit()
        db.refresh(evidence)
        return schemas.CARVerificationEvidenceResponse.model_validate(evidence)
    except HTTPException:
        raise
    except Exception as exc:
        db.rollback()
        try:
            supabase.storage.from_("documents").remove([path])
        except Exception:
            pass
        raise HTTPException(500, "Unable to preserve the verification evidence.") from exc


@app.get("/car-verification-evidence/{evidence_id}/url")
def get_car_verification_evidence_url(
    evidence_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_faculty_or_admin),
):
    evidence = db.query(models.CARVerificationEvidence).filter(models.CARVerificationEvidence.id == evidence_id).first()
    if not evidence:
        raise HTTPException(404, "Verification evidence not found.")
    require_office(current_user, car_office(evidence.car, db))
    return {"url": create_private_file_url(evidence.storage_path), "file_name": evidence.file_name}


@app.delete("/car-verification-evidence/{evidence_id}")
def delete_car_verification_evidence(
    evidence_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_faculty_or_admin),
):
    evidence = db.query(models.CARVerificationEvidence).filter(models.CARVerificationEvidence.id == evidence_id).first()
    if not evidence:
        raise HTTPException(404, "Verification evidence not found.")
    require_office(current_user, car_office(evidence.car, db))
    require_car_reviewer(current_user)
    if evidence.car.status == "Closed":
        raise HTTPException(409, "Verification evidence for a closed CAR is immutable.")
    path = evidence.storage_path
    db.delete(evidence)
    db.commit()
    try:
        supabase.storage.from_("documents").remove([path])
    except Exception:
        _log.exception("car_verification_evidence_cleanup_failed", extra={"evidence_id": evidence_id})
    return {"message": "Verification evidence removed."}


@app.post("/car-forms/{car_id}/reopen", response_model=schemas.CARFormResponse)
def reopen_car_form(
    car_id: str,
    payload: CARReopenPayload,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_faculty_or_admin),
):
    car = db.query(models.CARForm).filter(models.CARForm.id == car_id).first()
    if not car:
        raise HTTPException(404, "CAR Form not found.")
    require_office(current_user, car_office(car, db))
    require_car_reviewer(current_user)
    if car.status != "Closed":
        raise HTTPException(409, "Only a closed CAR may be reopened.")
    previous_status = car.status
    car.status = "In Progress"
    car.non_conformity_closed = False
    car.effectiveness_outcome = None
    car.verified_at = None
    car.reopened_by_id = current_user.id
    car.reopened_at = utc_now()
    car.reopen_reason = payload.reason.strip()
    car.reopen_count = (car.reopen_count or 0) + 1
    car.in_progress_at = utc_now()
    car.updated_at = utc_now()
    record_car_status_history(db, car, previous_status, "In Progress", current_user.id, payload.reason)
    db.add(models.CARRevisionHistory(
        car_id=car.id,
        changed_fields={"status": {"from": previous_status, "to": "In Progress"}, "reopen_reason": {"from": None, "to": payload.reason.strip()}},
        changed_by_id=current_user.id,
    ))
    db.commit()
    db.refresh(car)
    return car


@app.delete("/car-forms/{car_id}")
def delete_car_form(car_id: str, db: Session = Depends(get_db), admin: models.User = Depends(get_current_faculty_or_admin)):
    car = db.query(models.CARForm).filter(models.CARForm.id == car_id).first()
    if not car:
        raise HTTPException(status_code=404, detail="CAR Form not found")
    require_office(admin, car_office(car, db))
    require_car_reviewer(admin)
    if car.status != "Draft":
        raise HTTPException(409, "Only Draft CARs may be deleted. Issued records must be preserved and voided.")
    db.delete(car)
    db.commit()
    return {"message": "CAR Form deleted"}


@app.get("/car-forms/{car_id}/history")
def get_car_history(
    car_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_faculty_or_admin),
):
    car = db.query(models.CARForm).filter(models.CARForm.id == car_id).first()
    if not car:
        raise HTTPException(404, "CAR Form not found.")
    require_office(current_user, car_office(car, db))
    return {
        "status_history": [schemas.CARStatusHistoryResponse.model_validate(row) for row in car.status_history],
        "revision_history": [schemas.CARRevisionHistoryResponse.model_validate(row) for row in car.revision_history],
    }


@app.post("/car-forms/run-monitoring")
def run_car_monitoring_now(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_faculty_or_admin),
):
    if role_of(current_user) != "SYSTEM_ADMIN" and not is_car_reviewer(current_user):
        raise HTTPException(403, "QA Head, IQA Auditor, or System Administrator access is required.")
    return run_car_monitoring(db)


def visible_car_forms(db, current_user, cycle_year=None):
    query = db.query(models.CARForm)
    if cycle_year:
        query = query.filter(models.CARForm.cycle_year == cycle_year)
    return [car for car in query.order_by(models.CARForm.created_at.asc()).all()
            if can_access_office(current_user, car_office(car, db))]


def car_report_record(car):
    return {
        "id": str(car.id), "car_no": car.car_no, "cycle_year": car.cycle_year,
        "date_issued": car.date_issued, "responsible_office": car.responsible_office,
        "area": car.area, "finding_category": car.finding_category,
        "requirement_reference": car.requirement_reference,
        "objective_evidence": car.objective_evidence,
        "nonconformity_statement": car.nonconformity_statement,
        "status": car.status, "effectiveness_outcome": car.effectiveness_outcome,
        "target_date": car.target_date, "follow_up_date": car.follow_up_date,
        "is_overdue": car.is_overdue, "days_overdue": car.days_overdue,
        "issued_by": car.issued_by_name, "acknowledged_by": car.acknowledged_by_name,
        "assigned_to": car.assigned_to_name, "verified_by": car.verified_by_name,
        "issued_at": car.issued_at, "acknowledged_at": car.acknowledged_at,
        "response_submitted_at": car.response_submitted_at,
        "awaiting_verification_at": car.awaiting_verification_at,
        "verified_at": car.verified_at, "closed_at": car.closed_at,
        "voided_at": car.voided_at, "void_reason": car.void_reason,
        "action_count": len(car.action_plan or []),
        "verification_evidence_count": len(car.verification_evidences or []),
    }


@app.get("/car-reports/master-log")
def get_car_master_log(
    cycle_year: str = Query(..., min_length=1),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_faculty_or_admin),
):
    return [car_report_record(car) for car in visible_car_forms(db, current_user, cycle_year)]


@app.get("/car-reports/summary")
def get_car_reporting_summary(
    cycle_year: str = Query(..., min_length=1),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_faculty_or_admin),
):
    cars = visible_car_forms(db, current_user, cycle_year)
    status_counts, category_counts, outcome_counts, office_counts, monthly_counts = {}, {}, {}, {}, {}
    closure_days = []
    for car in cars:
        for bucket, value in (
            (status_counts, car.status or "Unknown"),
            (category_counts, car.finding_category or "Unknown"),
            (office_counts, car.responsible_office or "Unassigned"),
        ):
            bucket[value] = bucket.get(value, 0) + 1
        if car.effectiveness_outcome:
            outcome_counts[car.effectiveness_outcome] = outcome_counts.get(car.effectiveness_outcome, 0) + 1
        issued_date = car.issued_at or car.created_at
        month_key = issued_date.strftime("%Y-%m") if issued_date else "Unknown"
        monthly_counts[month_key] = monthly_counts.get(month_key, 0) + 1
        if car.issued_at and car.closed_at:
            closure_days.append(max(0, (car.closed_at.date() - car.issued_at.date()).days))
    closed = status_counts.get("Closed", 0)
    effective = outcome_counts.get("EFFECTIVE", 0)
    return {
        "cycle_year": cycle_year,
        "total": len(cars), "open": sum(1 for car in cars if car.status not in {"Closed", "Void"}),
        "closed": closed, "overdue": sum(1 for car in cars if car.is_overdue),
        "closure_rate": round((closed / len(cars) * 100), 1) if cars else 0,
        "effective_rate": round((effective / sum(outcome_counts.values()) * 100), 1) if outcome_counts else 0,
        "average_closure_days": round(sum(closure_days) / len(closure_days), 1) if closure_days else None,
        "status_distribution": status_counts, "category_distribution": category_counts,
        "effectiveness_distribution": outcome_counts, "office_distribution": office_counts,
        "monthly_trend": [{"month": month, "count": count} for month, count in sorted(monthly_counts.items())],
    }


@app.get("/car-forms/{car_id}/report-data")
def get_verified_car_report_data(
    car_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_faculty_or_admin),
):
    car = db.query(models.CARForm).filter(models.CARForm.id == car_id).first()
    if not car:
        raise HTTPException(404, "CAR Form not found.")
    require_office(current_user, car_office(car, db))
    if car.status == "Draft" or not car.car_no:
        raise HTTPException(409, "Issue and verify the CAR before generating the controlled form.")
    return {
        "car": schemas.CARFormResponse.model_validate(car),
        "actions": [schemas.QMSActionPlanResponse.model_validate(action) for action in car.action_plan],
        "status_history": [schemas.CARStatusHistoryResponse.model_validate(row) for row in car.status_history],
        "report_generated_at": utc_now(),
        "report_generated_by": current_user.full_name or current_user.email,
    }


def add_storage_file_to_zip(archive, archive_name, storage_path, manifest_errors):
    path = get_private_storage_path(storage_path)
    if not path:
        manifest_errors.append({"file": archive_name, "error": "Storage path unavailable"})
        return
    try:
        content = supabase.storage.from_("documents").download(path)
        archive.writestr(archive_name, content)
    except Exception as exc:
        manifest_errors.append({"file": archive_name, "error": str(exc)[:300]})


@app.get("/car-forms/{car_id}/audit-package")
def download_car_audit_package(
    car_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_faculty_or_admin),
):
    car = db.query(models.CARForm).filter(models.CARForm.id == car_id).first()
    if not car:
        raise HTTPException(404, "CAR Form not found.")
    require_office(current_user, car_office(car, db))
    if car.status == "Draft":
        raise HTTPException(409, "Draft CARs do not have a controlled audit-history package.")

    buffer, manifest_errors = io.BytesIO(), []
    with zipfile.ZipFile(buffer, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        report = car_report_record(car)
        report["findings"] = car.findings
        report["root_cause"] = car.root_cause
        report["immediate_action"] = car.immediate_action
        report["corrective_measure"] = car.corrective_measure
        report["comments_remarks"] = car.comments_remarks
        archive.writestr("car_record.json", json.dumps(report, indent=2, default=str))
        archive.writestr("status_history.json", json.dumps([
            schemas.CARStatusHistoryResponse.model_validate(row).model_dump(mode="json") for row in car.status_history
        ], indent=2))
        archive.writestr("revision_history.json", json.dumps([
            schemas.CARRevisionHistoryResponse.model_validate(row).model_dump(mode="json") for row in car.revision_history
        ], indent=2))

        csv_buffer = io.StringIO()
        writer = csv.writer(csv_buffer)
        writer.writerow(["Sequence", "Action", "Owner", "Target Date", "Status", "Expected Evidence", "Completion Date"])
        for action in car.action_plan:
            writer.writerow([action.sequence_number, action.corrective_measure, action.owner_name, action.target_date,
                             action.status, action.expected_evidence, action.actual_completion_date])
        archive.writestr("corrective_actions.csv", csv_buffer.getvalue())

        if car.source_file_path:
            add_storage_file_to_zip(archive, f"source/{car.source_file_name or 'original_car_scan'}", car.source_file_path, manifest_errors)
        for action in car.action_plan:
            for evidence in action.evidences:
                add_storage_file_to_zip(
                    archive, f"implementation_evidence/action_{action.sequence_number}/{evidence.document_name}",
                    evidence.storage_path or evidence.file_url, manifest_errors,
                )
        for evidence in car.verification_evidences:
            add_storage_file_to_zip(archive, f"verification_evidence/{evidence.file_name}", evidence.storage_path, manifest_errors)
        archive.writestr("package_manifest.json", json.dumps({
            "car_no": car.car_no, "generated_at": utc_now().isoformat(),
            "generated_by": current_user.full_name or current_user.email,
            "included_actions": len(car.action_plan),
            "included_verification_evidence": len(car.verification_evidences),
            "file_errors": manifest_errors,
        }, indent=2))

    buffer.seek(0)
    safe_number = re.sub(r"[^A-Za-z0-9._-]+", "_", car.car_no or str(car.id))
    return StreamingResponse(buffer, media_type="application/zip", headers={
        "Content-Disposition": f'attachment; filename="{safe_number}_audit_package.zip"'
    })


# CAR FORM OCR EXTRACTION
# ─────────────────────────────────────────────────────────────────────────────

@app.post("/api/extract-car-form")
async def extract_car_form(
    request: Request,
    file: UploadFile = File(...),
    current_user: models.User = Depends(get_governance_reader),
):
    """Extract every visible section of a CAR Form 1 for human verification."""
    limiter.check(request, key_name="car_extract", max_requests=5, window_seconds=60)
    try:
        import base64
        import io
        import json
        import re
        import subprocess
        from datetime import datetime
        from PIL import Image as PILImage

        contents = await read_upload_limited(file)
        filename_lower = file.filename.lower()

        # CAR Form 1 is a one-page controlled form. Keep enough resolution for
        # handwriting, narrow date fields, and checkbox marks across the full page.
        if filename_lower.endswith(".pdf"):
            import fitz
            doc = fitz.open(stream=contents, filetype="pdf")
            if len(doc) == 0:
                doc.close()
                raise HTTPException(status_code=422, detail="The uploaded PDF has no pages.")
            page = doc.load_page(0)
            pix = page.get_pixmap(dpi=180, alpha=False)
            img = PILImage.open(io.BytesIO(pix.tobytes("png"))).convert("RGB")
            doc.close()
        elif filename_lower.endswith((".png", ".jpg", ".jpeg")):
            img = PILImage.open(io.BytesIO(contents)).convert("RGB")
        else:
            raise HTTPException(status_code=400, detail="Please upload a PDF or Image file (.pdf, .png, .jpg, .jpeg).")

        # Preserve portrait aspect ratio while capping memory use on very large photos.
        img.thumbnail((2200, 2200), PILImage.Resampling.LANCZOS)
        buffer = io.BytesIO()
        img.save(buffer, format="JPEG", quality=92, optimize=True)
        prepared_image = buffer.getvalue()
        base64_image = base64.b64encode(prepared_image).decode("utf-8")

        # A deterministic full-page transcript makes dense printed forms much
        # more reliable than vision alone. Two segmentation modes cover both
        # table-like forms and sparse completed sections.
        ocr_candidates = []
        for page_mode in (6, 11):
            ocr_process = subprocess.run(
                ["tesseract", "stdin", "stdout", "-l", "eng", "--psm", str(page_mode)],
                input=prepared_image,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                timeout=90,
                check=False,
            )
            if ocr_process.returncode == 0:
                ocr_candidates.append(ocr_process.stdout.decode("utf-8", errors="ignore").strip())
        # Keep both layouts: sparse mode reads labels cleanly while block mode
        # is better at names covered by signatures and dense finding paragraphs.
        ocr_text = "\n\n--- OCR PASS ---\n\n".join(candidate for candidate in ocr_candidates if candidate)

        # Names sit underneath signatures and beside dates, which makes a
        # full-page OCR pass prone to merging both columns. Re-read that fixed
        # form region at higher resolution and explicitly separate it by date.
        signature_crop = img.crop((
            int(img.width * 0.05), int(img.height * 0.34),
            int(img.width * 0.95), int(img.height * 0.49),
        )).resize((int(img.width * 1.8), int(img.height * 0.30)), PILImage.Resampling.LANCZOS).convert("L")
        signature_buffer = io.BytesIO()
        signature_crop.save(signature_buffer, format="PNG")
        signature_ocr_process = subprocess.run(
            ["tesseract", "stdin", "stdout", "-l", "eng", "--psm", "6"],
            input=signature_buffer.getvalue(), stdout=subprocess.PIPE,
            stderr=subprocess.PIPE, timeout=60, check=False,
        )
        signature_candidates = ""
        if signature_ocr_process.returncode == 0:
            signature_text = re.sub(
                r"\s+", " ",
                signature_ocr_process.stdout.decode("utf-8", errors="ignore"),
            ).strip()
            signature_match = re.search(
                r"Auditor\s*/?\s*Complainant\s*:\s*Acknowledged\s+by\s*:\s*"
                r"(.+?)\s+(\d{1,2}/\d{1,2}/\d{2,4})\s+(.+?)\s+"
                r"(\d{1,2}/\d{1,2}/\d{2,4})",
                signature_text, flags=re.IGNORECASE,
            )
            if signature_match:
                signature_candidates = (
                    "\n\nTARGETED SIGNATURE ROW OCR (column boundaries separated by dates):\n"
                    f"Auditor/Complainant candidate: {signature_match.group(1).strip()}\n"
                    f"Acknowledged by candidate: {signature_match.group(3).strip()}\n"
                    "Correct only obvious OCR letter/case distortions; do not swap or merge these names."
                )
                ocr_text += signature_candidates

        def extract_findings_from_ocr(transcript):
            """Return the complete printed finding block without checkbox labels."""
            lines = [re.sub(r"\s+", " ", line).strip() for line in transcript.splitlines()]
            finding_lines = []
            started = False
            for line in lines:
                lowered = line.lower()
                if not started:
                    if "statement/finding" in lowered:
                        started = True
                    continue
                if not line or lowered.startswith("area:"):
                    continue
                checkbox_heading = (
                    len(line) < 90
                    and any(label in lowered for label in ("major", "minor", "observation"))
                )
                if checkbox_heading or lowered.startswith("auditor/complainant"):
                    break
                finding_lines.append(line)
            return " ".join(finding_lines).strip()

        ocr_findings = max(
            (extract_findings_from_ocr(candidate) for candidate in ocr_candidates),
            key=len,
            default="",
        )

        system_prompt = """You are a meticulous document transcription assistant for a university ISO quality-management system.
Read the ENTIRE visible CAR FORM 1, from the header through the follow-up and closure sections. The form may be blank, partially filled, or fully completed.

NON-NEGOTIABLE RULES:
1. Transcribe only information visibly present in the image. Never infer, complete, summarize, or invent missing content.
2. Return an empty string for a blank text/date field, null for an uncertain checkbox/category, and false for closure only when the closure box/field is visibly blank. Use true only when closure is visibly marked.
3. A checkbox is selected only when it visibly contains a filled box, check mark, X, slash, or similar handwritten mark. Do not select a default merely because a label exists.
4. Preserve the wording of findings, immediate actions, root causes, corrective measures, and remarks. Findings includes EVERY paragraph after Statement/Finding(s) and before the MAJOR/MINOR/OBSERVATION checkboxes. Join wrapped lines into readable paragraphs without changing meaning.
5. Convert unambiguous dates to YYYY-MM-DD. If the main Date field is a range, use its final date as date_issued and preserve the visible range in date_issued_raw. Do not use the printed form revision date as the issued date.
6. Names written beside signatures should be transcribed from the printed name when legible. Do not describe signatures.
7. Inspect all three logical sections: auditor finding, auditee response, and auditor follow-up/closure.

Return one pure JSON object with every key below:
{
  "car_no": "",
  "revision": "",
  "date_issued": "",
  "date_issued_raw": "",
  "campus": "",
  "area": "",
  "findings": "",
  "finding_category": null,
  "auditor_name": "",
  "acknowledged_by": "",
  "type_of_non_conformity": null,
  "other_type_description": "",
  "immediate_action": "",
  "root_cause": "",
  "corrective_measure": "",
  "measures_proposed_by": "",
  "target_date": "",
  "follow_up_result": "",
  "follow_up_date": "",
  "comments_remarks": "",
  "non_conformity_closed": false
}"""

        transcript_context = ocr_text[:14000] if ocr_text else "No OCR transcript was available; rely on the image."
        vision_messages = [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": f"{system_prompt}\n\nOCR TRANSCRIPT (supporting evidence; verify checkboxes against the image):\n{transcript_context}\n\nTranscribe the complete form now. Return JSON only."},
                    {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"}},
                ],
            }
        ]
        extracted = None
        extraction_model = None
        model_errors = []
        # Prefer Llama 3.2 Vision. Current Ollama releases may reject its legacy
        # mllama package, so fall back to local text structuring of the full-page
        # Tesseract transcript instead of using an unreliable vision guess.
        model_attempts = [
            ("llama3.2-vision", vision_messages),
            ("qwen2.5", [{"role": "user", "content": f"{system_prompt}\n\nUse this OCR transcript to populate the JSON. Text absent from the transcript must remain blank. Checkbox selections may be inferred only when the transcript clearly includes a mark such as X, slash, checked, or a solid-box character immediately beside the label.\n\nOCR TRANSCRIPT:\n{transcript_context}\n\nReturn JSON only."}]),
        ]
        for vision_model, attempt_messages in model_attempts:
            try:
                response = local_ai_client.chat.completions.create(
                    model=vision_model,
                    messages=attempt_messages,
                    temperature=0.0,
                    max_tokens=1400,
                    response_format={"type": "json_object"},
                )
                result_json = (response.choices[0].message.content or "").strip()
                if result_json.startswith("```"):
                    result_json = re.sub(r"^```(?:json)?\s*|\s*```$", "", result_json, flags=re.IGNORECASE)
                extracted = json.loads(result_json)
                extraction_model = vision_model
                break
            except Exception as model_error:
                model_errors.append(f"{vision_model}: {model_error}")
                print(f"[extract_car_form] {vision_model} failed; trying offline fallback: {model_error}")

        if extracted is None:
            raise RuntimeError("All local vision models failed: " + " | ".join(model_errors))

        text_fields = [
            "car_no", "revision", "date_issued_raw", "campus", "area", "findings",
            "auditor_name", "acknowledged_by", "other_type_description", "immediate_action",
            "root_cause", "corrective_measure", "measures_proposed_by", "comments_remarks",
        ]
        for field in text_fields:
            value = extracted.get(field)
            extracted[field] = str(value).strip() if value is not None else ""

        # The model is useful for structuring the form but can summarize a long
        # finding. Prefer the deterministic OCR block when it clearly contains
        # substantially more of the source text.
        model_findings = extracted["findings"]
        if len(ocr_findings) >= 80 and len(ocr_findings) > len(model_findings) * 1.15:
            extracted["findings"] = ocr_findings

        def normalize_date(value):
            raw = str(value or "").strip()
            if not raw:
                return ""
            if re.fullmatch(r"\d{4}-\d{2}-\d{2}", raw):
                try:
                    datetime.strptime(raw, "%Y-%m-%d")
                    return raw
                except ValueError:
                    return ""
            for fmt in ("%m/%d/%Y", "%m/%d/%y", "%B %d, %Y", "%b %d, %Y"):
                try:
                    return datetime.strptime(raw, fmt).strftime("%Y-%m-%d")
                except ValueError:
                    continue
            return ""

        for field in ("date_issued", "target_date", "follow_up_date"):
            extracted[field] = normalize_date(extracted.get(field))

        category = str(extracted.get("finding_category") or "").upper().strip().replace(" ", "_")
        if category in {"OFI", "OPPORTUNITY", "OPPORTUNITY_FOR_IMPROVEMENT"}:
            category = "OPPORTUNITY_FOR_IMPROVEMENT"
        extracted["finding_category"] = category if category in CAR_ISSUABLE_CATEGORIES else None

        # OCR frequently turns a solid checkbox into arbitrary letters. A clear
        # phrase in the finding itself is safer than trusting that artifact.
        finding_lower = f"{extracted['findings']}\n{ocr_text}".lower()
        if re.search(r"\bthe\s+observation\b|\bobservation\s+is\s+(?:retained|raised|noted)\b", finding_lower):
            extracted["finding_category"] = "OBSERVATION"

        nc_type_map = {
            "qms related": "QMS Related", "security related": "Security Related",
            "customer feedback": "Customer Feedback", "customer complaint": "Customer Complaint",
            "other": "Other", "other types": "Other",
        }
        extracted["type_of_non_conformity"] = nc_type_map.get(str(extracted.get("type_of_non_conformity") or "").lower().strip())
        explicit_mark = r"(?:☒|☑|■|\[\s*[xX/]\s*\])"
        selected_type_patterns = {
            "QMS Related": rf"{explicit_mark}\s*QMS\s+Related",
            "Security Related": rf"{explicit_mark}\s*Security\s+Related",
            "Customer Feedback": rf"{explicit_mark}\s*Customer\s+Feedback",
            "Customer Complaint": rf"{explicit_mark}\s*Customer\s+Complaint",
            "Other": rf"{explicit_mark}\s*Other",
        }
        selected_type = extracted["type_of_non_conformity"]
        if selected_type and not re.search(selected_type_patterns[selected_type], ocr_text, flags=re.IGNORECASE):
            extracted["type_of_non_conformity"] = None
        if extracted["type_of_non_conformity"] != "Other":
            extracted["other_type_description"] = ""

        follow_up = str(extracted.get("follow_up_result") or "").lower().strip()
        effective_marked = re.search(rf"{explicit_mark}\s*Measures\s+complete\s+and\s+effective", ocr_text, flags=re.IGNORECASE)
        ineffective_marked = re.search(rf"{explicit_mark}\s*Measures\s+ineffective", ocr_text, flags=re.IGNORECASE)
        if "ineffective" in follow_up and ineffective_marked:
            extracted["follow_up_result"] = "Measures ineffective"
        elif "complete" in follow_up and "effective" in follow_up and effective_marked:
            extracted["follow_up_result"] = "Measures complete and effective"
        else:
            extracted["follow_up_result"] = ""

        # Printed names commonly share one line with the signature date. Remove
        # only the date instead of rejecting the entire recognized identity.
        for name_field in ("auditor_name", "acknowledged_by", "measures_proposed_by"):
            name_value = str(extracted.get(name_field, "") or "")
            name_value = re.sub(r"\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b", "", name_value)
            name_value = re.sub(r"\b\d{4}-\d{2}-\d{2}\b", "", name_value)
            name_value = re.sub(r"[^A-Za-zÀ-ÖØ-öø-ÿ.'\-\s]", " ", name_value)
            name_value = re.sub(r"\s+", " ", name_value).strip(" .,-")
            name_words = re.findall(r"[A-Za-zÀ-ÖØ-öø-ÿ]{2,}", name_value)
            extracted[name_field] = name_value if len(name_words) >= 2 else ""

        closed_value = extracted.get("non_conformity_closed")
        extracted["non_conformity_closed"] = closed_value is True or str(closed_value).lower().strip() in {"true", "yes", "checked", "closed"}

        # Do not let a model move finding text into a visibly blank closeout
        # section. Labels with no OCR text between them indicate blank fields.
        remarks_region = re.search(r"Comments\s*/?\s*Remarks\s*(.*?)\s*Non-?Conformity\s+Closed", ocr_text, flags=re.IGNORECASE | re.DOTALL)
        if remarks_region and not re.search(r"[A-Za-z0-9]{3,}", remarks_region.group(1)):
            extracted["comments_remarks"] = ""

        has_response = any(extracted.get(field) for field in ("immediate_action", "root_cause", "corrective_measure", "measures_proposed_by", "target_date"))
        has_follow_up = any(extracted.get(field) for field in ("follow_up_result", "follow_up_date", "comments_remarks"))
        extracted["scan_completion"] = "FULL" if has_response and has_follow_up else "PARTIAL" if has_response or has_follow_up else "FINDING_ONLY"
        extracted["suggested_stage"] = "Closed" if extracted["non_conformity_closed"] and extracted["follow_up_result"] == "Measures complete and effective" else "Under Review" if has_response or has_follow_up else "Open"
        extracted["requires_human_review"] = True
        extracted["extraction_model"] = extraction_model
        extracted["ocr_text_available"] = bool(ocr_text)
        raw_extraction = dict(extracted)
        critical_values = {
            "car_no": extracted.get("car_no"),
            "date_issued": extracted.get("date_issued"),
            "area": extracted.get("area"),
            "finding_category": extracted.get("finding_category"),
            "statement_of_nonconformity": extracted.get("findings"),
            "auditor_name": extracted.get("auditor_name"),
        }
        confidence = {}
        warnings = []
        for field_name, field_value in critical_values.items():
            score = 0.9 if str(field_value or "").strip() else 0.25
            if field_name == "finding_category" and field_value is None:
                score = 0.15
            confidence[field_name] = score
            if score < 0.7:
                warnings.append({"field": field_name, "message": f"Verify {field_name.replace('_', ' ')} against the original scan."})

        safe_filename = re.sub(r"[^A-Za-z0-9._-]+", "_", os.path.basename(file.filename or "car-form"))
        source_hash = hashlib.sha256(contents).hexdigest()
        source_path = f"car-source/{uuid.uuid4()}/{safe_filename}"
        supabase.storage.from_("documents").upload(
            file=contents,
            path=source_path,
            file_options={"content-type": file.content_type or "application/octet-stream"},
        )
        extracted["source_file_path"] = source_path
        extracted["source_file_name"] = file.filename or safe_filename
        extracted["source_mime_type"] = file.content_type or "application/octet-stream"
        extracted["source_file_size"] = len(contents)
        extracted["source_sha256"] = source_hash
        extracted["ocr_model"] = extraction_model
        extracted["ocr_version"] = "car-whole-form-v2"
        extracted["ocr_extracted_at"] = utc_now().isoformat() + "Z"
        extracted["ocr_raw_json"] = raw_extraction
        extracted["ocr_confidence_json"] = {"fields": confidence, "warnings": warnings}
        extracted["confidence_warnings"] = warnings
        return extracted

    except HTTPException:
        raise
    except Exception as e:
        print(f"[extract_car_form] Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to extract data from the CAR form using llama3.2-vision.")


# ================================================================================================================
# NOTIFICATIONS
# ================================================================================================================

@app.get("/notifications", response_model=List[NotificationOut])
def get_notifications(email: str, filter: str = "all", db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    if email.lower() != current_user.email.lower() and not is_system_admin(current_user):
        raise HTTPException(status_code=403, detail="You may only access your own notifications.")
    if not email:
        raise HTTPException(status_code=400, detail="email query param is required")

    try:
        user = db.query(models.User).filter(models.User.email == email).first()
        is_student = (user and user.role == "STUDENT") if user else False

        def _query():
            q = (
                supabase.table("notifications")
                .select("*")
                .eq("user_email", email)
                .order("created_at", desc=True)
                .limit(100)
            )
            if filter == "unread":
                q = q.eq("is_read", False)
            return q.execute()

        response = supabase_query_with_retry(_query)
        data = response.data if response.data else []

        if is_student:
            restricted_titles = {
                "Document Removed from Repository",
                "Document Information Updated",
                "Document Updated",
            }
            data = [n for n in data if n.get("title") not in restricted_titles]

        return data

    except Exception as e:
        print(f"[notifications] GET error: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch notifications")


@app.get("/notifications/count")
def get_notification_count(email: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    if email.lower() != current_user.email.lower() and not is_system_admin(current_user):
        raise HTTPException(status_code=403, detail="You may only access your own notifications.")
    if not email:
        raise HTTPException(status_code=400, detail="email query param is required")

    try:
        user = db.query(models.User).filter(models.User.email == email).first()
        is_student = (user and user.role == "STUDENT") if user else False

        if is_student:
            response = (
                supabase.table("notifications")
                .select("id, title")
                .eq("user_email", email)
                .eq("is_read", False)
                .execute()
            )
            restricted_titles = {
                "Document Removed from Repository",
                "Document Information Updated",
                "Document Updated",
            }
            count = sum(1 for n in (response.data or []) if n.get("title") not in restricted_titles)
            return {"unread_count": count}
        else:
            response = (
                supabase.table("notifications")
                .select("id", count="exact")
                .eq("user_email", email)
                .eq("is_read", False)
                .execute()
            )
            return {"unread_count": response.count if response.count is not None else 0}

    except Exception as e:
        print(f"[notifications] COUNT error: {e}")
        raise HTTPException(status_code=500, detail="Failed to count notifications")


@app.patch("/notifications/mark-all-read")
def mark_all_notifications_read(payload: dict = Body(...), db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    email = payload.get("email")
    if email and email.lower() != current_user.email.lower() and not is_system_admin(current_user):
        raise HTTPException(status_code=403, detail="You may only modify your own notifications.")
    if not email:
        raise HTTPException(status_code=400, detail="email is required in request body")

    try:
        response = (
            supabase.table("notifications")
            .update({"is_read": True})
            .eq("user_email", email)
            .eq("is_read", False)
            .execute()
        )
        updated = len(response.data) if response.data else 0

        # Increment read_count for any broadcast announcements present in read notifications
        if response.data:
            for item in response.data:
                ntitle = item.get("title", "")
                if "📢" in ntitle or "Announcement" in ntitle:
                    clean = ntitle.replace("📢", "").strip()
                    matched = db.query(models.Announcement).filter(models.Announcement.title.ilike(f"%{clean}%")).first()
                    if matched:
                        matched.read_count = (matched.read_count or 0) + 1
            db.commit()

        return {"message": f"Marked {updated} notification(s) as read", "updated": updated}

    except Exception as e:
        print(f"[notifications] MARK-ALL-READ error: {e}")
        raise HTTPException(status_code=500, detail="Failed to mark notifications")


@app.patch("/notifications/{notification_id}/read")
def mark_notification_read(notification_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    try:
        notification = (
            supabase.table("notifications")
            .select("id,user_email")
            .eq("id", notification_id)
            .limit(1)
            .execute()
        )
        if not notification.data:
            raise HTTPException(status_code=404, detail="Notification not found")
        if (
            not is_system_admin(current_user)
            and str(notification.data[0].get("user_email", "")).lower() != current_user.email.lower()
        ):
            raise HTTPException(status_code=403, detail="You may only modify your own notifications.")
        response = (
            supabase.table("notifications")
            .update({"is_read": True})
            .eq("id", notification_id)
            .execute()
        )
        if not response.data:
            raise HTTPException(status_code=404, detail="Notification not found")

        # Sync read status to matching announcement if applicable
        notif_item = response.data[0]
        ntitle = notif_item.get("title", "")
        if "📢" in ntitle or "Announcement" in ntitle:
            clean = ntitle.replace("📢", "").strip()
            matched = db.query(models.Announcement).filter(models.Announcement.title.ilike(f"%{clean}%")).first()
            if matched:
                matched.read_count = (matched.read_count or 0) + 1
                db.commit()

        return {"message": "Notification marked as read"}

    except HTTPException:
        raise
    except Exception as e:
        print(f"[notifications] MARK-READ error: {e}")
        raise HTTPException(status_code=500, detail="Failed to update notification")


@app.delete("/notifications/delete-read")
def delete_read_notifications(payload: dict = Body(...), current_user: models.User = Depends(get_current_user)):
    email = payload.get("email")
    if email and email.lower() != current_user.email.lower() and not is_system_admin(current_user):
        raise HTTPException(status_code=403, detail="You may only delete your own notifications.")
    if not email:
        raise HTTPException(status_code=400, detail="email is required in request body")

    try:
        response = (
            supabase.table("notifications")
            .delete()
            .eq("user_email", email)
            .eq("is_read", True)
            .execute()
        )
        deleted = len(response.data) if response.data else 0
        return {"message": f"Deleted {deleted} read notification(s)", "deleted": deleted}

    except Exception as e:
        print(f"[notifications] DELETE-READ error: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete read notifications")


    
@app.post("/users/change-password")
def change_password(
    req: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if current_user.email.lower() != req.email.lower():
        raise HTTPException(status_code=403, detail="You may only change your own password")
    # 1. Find the user
    user = db.query(models.User).filter(models.User.email == req.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # 2. Verify their current password (Security Check)
    if not utils.verify_password(req.current_password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect current password")

    try:
        utils.enforce_password_policy(req.new_password)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    # 3. Hash and save the new password
    user.hashed_password = utils.hash_password(req.new_password)
    db.commit()

    # --- SILENT AUDIT LOG ---
    try:
        from vector_store import supabase
        supabase.table("system_events_logs").insert({
            "user_email": req.email,
            "event_type": "Security Update",
            "description": "User successfully changed their password"
        }).execute()
    except Exception as e:
        print(f"Failed to log password change: {e}")
    # ------------------------
    
    return {"message": "Password successfully updated!"}

@app.put("/users/profile")
def update_profile(
    req: UpdateProfileRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if current_user.email.lower() != req.email.lower():
        raise HTTPException(status_code=403, detail="You may only update your own profile")
    # 1. Fetch the core user
    user = db.query(models.User).filter(models.User.email == req.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # 2. Handle Email Change Logic
    if req.new_email != req.email:
        if not req.otp_code:
            raise HTTPException(status_code=400, detail="An OTP verification code is required to change your email.")
            
        # Verify the OTP
        record = db.query(models.OTPVerification).filter(models.OTPVerification.email == req.new_email).first()
        if not record or record.otp_code != req.otp_code:
            raise HTTPException(status_code=400, detail="Invalid verification code.")
        if utc_now() > record.expires_at:
            raise HTTPException(status_code=400, detail="This verification code has expired. Please request a new one.")
            
        existing_email = db.query(models.User).filter(models.User.email == req.new_email).first()
        if existing_email:
            raise HTTPException(status_code=400, detail="This email is already in use by another account.")
            
        user.email = req.new_email
        user.email_changed = True
        
        # Clear the OTP record so it can't be reused
        db.delete(record)
    
    # 3. Update core user details
    user.full_name = req.full_name
    
    # 4. Relational Table Routing
    if user.role == "STUDENT":
        if user.student_profile:
            user.student_profile.course = req.program
        else:
            new_profile = models.StudentProfile(user_id=user.id, course=req.program)
            db.add(new_profile)
    elif req.program != user.department:
        raise HTTPException(403, "Program assignments must be changed by a System Administrator.")
        
    db.commit()

    # --- SILENT AUDIT LOG ---
    try:
        from vector_store import supabase
        supabase.table("system_events_logs").insert({
            "user_email": user.email, # Use the confirmed email
            "event_type": "Profile Update",
            "description": f"Updated profile details (Name: {req.full_name}, Program: {req.program})"
        }).execute()
    except Exception as e:
        print(f"Failed to log profile update: {e}")
    # ------------------------
    
    return {
        "message": "Profile updated successfully!", 
        "full_name": user.full_name, 
        "program": req.program,
        "email": user.email  
    }

# --- SETTINGS ROUTES ---
@app.get("/settings", response_model=SettingsSchema)
def get_system_settings(db: Session = Depends(get_db), admin: models.User = Depends(get_current_admin)):
    if _DB_IS_AVAILABLE:
        try:
            settings = db.query(models.SystemSettings).filter(models.SystemSettings.id == 1).first()
            if settings:
                return settings
        except Exception:
            pass
    try:
        res = supabase.table("system_settings").select("*").eq("id", 1).execute()
        if res.data and len(res.data) > 0:
            return res.data[0]
    except Exception as sb_err:
        print(f"[Settings Error]: {sb_err}")
    return {
        "platform_name": "CTU Institutional Knowledge System",
        "campus": "Argao Campus",
        "admin_email": "admin@ctu.edu.ph",
        "jwt_expiration": 30,
        "otp_expiration": 10,
        "ai_provider": "local",
        "ai_model": "llama3.1",
        "groq_model": "qwen/qwen3.8-27b",
        "ai_temperature": 0.2,
        "ai_system_prompt": "",
        "rag_max_chunks": 5
    }


@app.put("/settings", response_model=SettingsSchema)
def update_system_settings(payload: SettingsSchema, db: Session = Depends(get_db), admin: models.User = Depends(get_current_admin)):
    values = payload.model_dump()
    if _DB_IS_AVAILABLE:
        settings = db.query(models.SystemSettings).filter(models.SystemSettings.id == 1).first()
        if not settings:
            settings = models.SystemSettings(id=1)
            db.add(settings)
        for key, value in values.items():
            setattr(settings, key, value)
        db.commit()
        db.refresh(settings)
        try:
            supabase.table("system_events_logs").insert({
                "user_email": admin.email, "event_type": "System Settings",
                "description": "Updated general system settings.",
            }).execute()
        except Exception:
            pass
        return settings
    try:
        res = supabase.table("system_settings").upsert({"id": 1, **values}).execute()
        try:
            supabase.table("system_events_logs").insert({
                "user_email": admin.email, "event_type": "System Settings",
                "description": "Updated general system settings.",
            }).execute()
        except Exception:
            pass
        return res.data[0] if res.data else values
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Unable to save system settings") from exc


def _log_reference_change(actor: models.User, description: str) -> None:
    try:
        supabase.table("system_events_logs").insert({
            "user_email": actor.email, "event_type": "Reference Data", "description": description,
        }).execute()
    except Exception:
        pass


@app.get("/settings/reference-data")
def get_settings_reference_data(admin: models.User = Depends(get_current_admin)):
    units = supabase.table("organizational_units").select("id,code,name,unit_type,is_active,created_at").order("name").execute().data or []
    programs = supabase.table("academic_programs").select("id,code,name,college_unit_id,is_active,created_at").order("name").execute().data or []
    process_groups = supabase.table("iso_process_groups").select("id,code,name,is_active").order("name").execute().data or []
    mappings = supabase.table("iso_process_unit_mappings").select("id,process_group_id,organizational_unit_id").execute().data or []
    return {
        "offices": [item for item in units if item.get("unit_type") == "OFFICE"],
        "colleges": [item for item in units if item.get("unit_type") == "COLLEGE"],
        "programs": programs,
        "iso_process_groups": process_groups,
        "iso_mappings": mappings,
    }


@app.get("/car-forms/classification-rules")
def get_car_classification_rules(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_faculty_or_admin),
):
    rows = db.execute(text(
        "SELECT category, display_name, requires_car, is_active, sort_order "
        "FROM car_classification_rules ORDER BY sort_order, category"
    )).mappings().all()
    return [dict(row) for row in rows]


@app.put("/settings/car-classification-rules/{category}")
def update_car_classification_rule(
    category: str,
    payload: CARClassificationRulePayload,
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_admin),
):
    normalized = category.strip().upper()
    if normalized not in CAR_ISSUABLE_CATEGORIES:
        raise HTTPException(404, "Finding classification not found.")
    result = db.execute(text(
        "UPDATE car_classification_rules SET requires_car = :requires_car, is_active = :is_active, updated_at = now() "
        "WHERE category = :category RETURNING category, display_name, requires_car, is_active, sort_order"
    ), {"category": normalized, "requires_car": payload.requires_car, "is_active": payload.is_active}).mappings().first()
    if not result:
        raise HTTPException(404, "Finding classification not found.")
    db.commit()
    _log_reference_change(admin, f"Updated CAR rule for {result['display_name']}: " + ("CAR required." if payload.requires_car else "CAR not required."))
    return dict(result)


@app.post("/settings/organizational-units", status_code=status.HTTP_201_CREATED)
def create_settings_organizational_unit(payload: OrganizationalUnitSettingsPayload, admin: models.User = Depends(get_current_admin)):
    code, name = payload.code.strip().upper(), payload.name.strip()
    by_code = supabase.table("organizational_units").select("id").eq("code", code).limit(1).execute()
    by_name = supabase.table("organizational_units").select("id").eq("name", name).limit(1).execute()
    if by_code.data or by_name.data:
        raise HTTPException(status_code=409, detail="An office or college already uses that code or name.")
    item = {"id": str(uuid.uuid4()), "code": code, "name": name, "unit_type": payload.unit_type, "is_active": payload.is_active}
    result = supabase.table("organizational_units").insert(item).execute()
    _log_reference_change(admin, f"Created {payload.unit_type.lower()} {name} ({code}).")
    return result.data[0] if result.data else item


@app.put("/settings/organizational-units/{unit_id}")
def update_settings_organizational_unit(unit_id: uuid.UUID, payload: OrganizationalUnitSettingsPayload, admin: models.User = Depends(get_current_admin)):
    found = supabase.table("organizational_units").select("*").eq("id", str(unit_id)).limit(1).execute()
    if not found.data:
        raise HTTPException(status_code=404, detail="Office or college not found.")
    current = found.data[0]
    if payload.code.strip().upper() != current["code"] or payload.unit_type != current["unit_type"]:
        raise HTTPException(status_code=400, detail="Codes and organization types cannot be changed after creation.")
    name = payload.name.strip()
    duplicate = supabase.table("organizational_units").select("id").eq("name", name).neq("id", str(unit_id)).limit(1).execute()
    if duplicate.data:
        raise HTTPException(status_code=409, detail="Another office or college already uses that name.")
    if current.get("is_active") and not payload.is_active:
        assignments = supabase.table("user_assignments").select("id").eq("scope_id", str(unit_id)).eq("is_active", True).limit(1).execute()
        if assignments.data:
            raise HTTPException(status_code=409, detail="Reassign active personnel before archiving this item.")
        if current["unit_type"] == "COLLEGE":
            programs = supabase.table("academic_programs").select("id").eq("college_unit_id", str(unit_id)).eq("is_active", True).limit(1).execute()
            if programs.data:
                raise HTTPException(status_code=409, detail="Archive or move the college's active programs first.")
    result = supabase.table("organizational_units").update({"name": name, "is_active": payload.is_active}).eq("id", str(unit_id)).execute()
    action = "Reactivated" if payload.is_active and not current.get("is_active") else ("Archived" if not payload.is_active else "Updated")
    _log_reference_change(admin, f"{action} {current['unit_type'].lower()} {name} ({current['code']}).")
    return result.data[0] if result.data else {**current, "name": name, "is_active": payload.is_active}


@app.post("/settings/programs", status_code=status.HTTP_201_CREATED)
def create_settings_program(payload: AcademicProgramSettingsPayload, admin: models.User = Depends(get_current_admin)):
    code, name = payload.code.strip().upper(), payload.name.strip()
    college = supabase.table("organizational_units").select("id").eq("id", str(payload.college_unit_id)).eq("unit_type", "COLLEGE").eq("is_active", True).limit(1).execute()
    if not college.data:
        raise HTTPException(status_code=400, detail="Select an active college.")
    duplicate = supabase.table("academic_programs").select("id").eq("code", code).limit(1).execute()
    if duplicate.data:
        raise HTTPException(status_code=409, detail="A program already uses that code.")
    program_id, accreditation_id = str(uuid.uuid4()), str(uuid.uuid4())
    item = {"id": program_id, "code": code, "name": name, "college_unit_id": str(payload.college_unit_id), "is_active": payload.is_active}
    try:
        result = supabase.table("academic_programs").insert(item).execute()
        if payload.is_active:
            supabase.table("program_accreditations").insert({
                "id": accreditation_id, "program_code": code, "current_level": "Candidate Status", "status": "Active",
                "active_areas": "Area I,Area II,Area III,Area IV,Area V,Area VI,Area VII,Area VIII,Area IX,Area X",
            }).execute()
            supabase.table("accreditation_cycles").insert({
                "id": str(uuid.uuid4()), "program_id": accreditation_id, "level_name": "Candidate Status", "attempt_number": 1,
                "cycle_label": "Current Baseline - Candidate Status (Attempt 1)", "status": "ACTIVE",
                "source": "ADMINISTRATIVE_BASELINE", "created_by": admin.email,
            }).execute()
    except Exception as exc:
        supabase.table("academic_programs").delete().eq("id", program_id).execute()
        raise HTTPException(status_code=500, detail="Unable to create the program and its accreditation baseline.") from exc
    _log_reference_change(admin, f"Created academic program {name} ({code}).")
    return result.data[0] if result.data else item


@app.put("/settings/programs/{program_id}")
def update_settings_program(program_id: uuid.UUID, payload: AcademicProgramSettingsPayload, admin: models.User = Depends(get_current_admin)):
    found = supabase.table("academic_programs").select("*").eq("id", str(program_id)).limit(1).execute()
    if not found.data:
        raise HTTPException(status_code=404, detail="Academic program not found.")
    current = found.data[0]
    if payload.code.strip().upper() != current["code"]:
        raise HTTPException(status_code=400, detail="Program codes cannot be changed after creation.")
    college = supabase.table("organizational_units").select("id").eq("id", str(payload.college_unit_id)).eq("unit_type", "COLLEGE").eq("is_active", True).limit(1).execute()
    if not college.data:
        raise HTTPException(status_code=400, detail="Select an active college.")
    if current.get("is_active") and not payload.is_active:
        assignments = supabase.table("user_assignments").select("id").eq("scope_id", str(program_id)).eq("is_active", True).limit(1).execute()
        if assignments.data:
            raise HTTPException(status_code=409, detail="Reassign active personnel before archiving this program.")
        accreditation = supabase.table("program_accreditations").select("id").eq("program_code", current["code"]).limit(1).execute()
        if accreditation.data:
            cycle = supabase.table("accreditation_cycles").select("id").eq("program_id", accreditation.data[0]["id"]).eq("status", "ACTIVE").limit(1).execute()
            if cycle.data:
                raise HTTPException(status_code=409, detail="Close the program's active accreditation cycle before archiving it.")
    if not current.get("is_active") and payload.is_active:
        accreditation = supabase.table("program_accreditations").select("id,current_level").eq("program_code", current["code"]).limit(1).execute()
        if accreditation.data:
            accreditation_id = accreditation.data[0]["id"]
            level_name = accreditation.data[0].get("current_level") or "Candidate Status"
        else:
            accreditation_id = str(uuid.uuid4())
            level_name = "Candidate Status"
            supabase.table("program_accreditations").insert({
                "id": accreditation_id, "program_code": current["code"], "current_level": "Candidate Status", "status": "Active",
                "active_areas": "Area I,Area II,Area III,Area IV,Area V,Area VI,Area VII,Area VIII,Area IX,Area X",
            }).execute()
        active_cycle = supabase.table("accreditation_cycles").select("id").eq("program_id", accreditation_id).eq("status", "ACTIVE").limit(1).execute()
        if not active_cycle.data:
            previous_cycle = supabase.table("accreditation_cycles").select("attempt_number").eq("program_id", accreditation_id).eq("level_name", level_name).order("attempt_number", desc=True).limit(1).execute()
            attempt_number = (previous_cycle.data[0]["attempt_number"] + 1) if previous_cycle.data else 1
            supabase.table("accreditation_cycles").insert({
                "id": str(uuid.uuid4()), "program_id": accreditation_id, "level_name": level_name, "attempt_number": attempt_number,
                "cycle_label": f"Reactivated - {level_name} (Attempt {attempt_number})", "status": "ACTIVE",
                "source": "ADMINISTRATIVE_BASELINE", "created_by": admin.email,
            }).execute()
    values = {"name": payload.name.strip(), "college_unit_id": str(payload.college_unit_id), "is_active": payload.is_active}
    result = supabase.table("academic_programs").update(values).eq("id", str(program_id)).execute()
    action = "Reactivated" if payload.is_active and not current.get("is_active") else ("Archived" if not payload.is_active else "Updated")
    _log_reference_change(admin, f"{action} academic program {values['name']} ({current['code']}).")
    return result.data[0] if result.data else {**current, **values}


@app.put("/settings/iso-mappings/{office_id}")
def update_settings_iso_mapping(
    office_id: uuid.UUID,
    payload: ISOOfficeMappingSettingsPayload,
    admin: models.User = Depends(get_current_admin),
):
    office = supabase.table("organizational_units").select("id,name,unit_type,is_active").eq("id", str(office_id)).limit(1).execute()
    if not office.data or office.data[0].get("unit_type") != "OFFICE":
        raise HTTPException(status_code=404, detail="Campus office not found.")
    requested = {str(item) for item in payload.process_group_ids}
    if requested:
        valid = supabase.table("iso_process_groups").select("id").in_("id", list(requested)).eq("is_active", True).execute().data or []
        if {str(item["id"]) for item in valid} != requested:
            raise HTTPException(status_code=400, detail="One or more ISO process groups are invalid or inactive.")
    existing_rows = supabase.table("iso_process_unit_mappings").select("id,process_group_id").eq("organizational_unit_id", str(office_id)).execute().data or []
    existing = {str(item["process_group_id"]): str(item["id"]) for item in existing_rows}
    for process_id, mapping_id in existing.items():
        if process_id not in requested:
            supabase.table("iso_process_unit_mappings").delete().eq("id", mapping_id).execute()
    additions = requested - set(existing)
    if additions:
        supabase.table("iso_process_unit_mappings").insert([
            {"id": str(uuid.uuid4()), "process_group_id": process_id, "organizational_unit_id": str(office_id)}
            for process_id in additions
        ]).execute()
    process_names = []
    if requested:
        process_names = [item["name"] for item in (supabase.table("iso_process_groups").select("name").in_("id", list(requested)).order("name").execute().data or [])]
    summary = ", ".join(process_names) if process_names else "no ISO process group"
    _log_reference_change(admin, f"Updated ISO mapping for {office.data[0]['name']}: {summary}.")
    return {"office_id": str(office_id), "process_group_ids": sorted(requested)}


@app.get("/settings/configuration-history")
def get_settings_configuration_history(admin: models.User = Depends(get_current_admin)):
    result = supabase.table("system_events_logs").select("id,user_email,event_type,description,event_date").in_("event_type", ["Reference Data", "System Settings"]).order("event_date", desc=True).limit(250).execute()
    return result.data or []


# ─────────────────────────────────────────────────────────────────────────────
# CHED MONITORING MODULE
# ─────────────────────────────────────────────────────────────────────────────

@app.post("/ched/requirements", response_model=schemas.ChedRequirementResponse)
def create_ched_requirement(
    req: schemas.ChedRequirementCreate,
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_governance_manager),
):
    """Admin endpoint to add a new blank requirement to the checklist."""
    require_program(admin, req.program)
    new_req = models.ChedRequirement(
        program=req.program,
        cmo_name=req.cmo_name,
        description=req.description,
        status="Not Compliant"
    )
    db.add(new_req)
    db.commit()
    db.refresh(new_req)
    
    # --- SILENT AUDIT LOG ---
    try:
        supabase.table("system_events_logs").insert({
            "user_email": "System Admin",
            "event_type": "CHED Setup",
            "description": f"Added new CHED requirement for {req.program}"
        }).execute()
    except Exception:
        pass
        
    return new_req

@app.put("/ched/requirements/{req_id}", response_model=schemas.ChedRequirementResponse)
def update_ched_requirement(
    req_id: str,
    req: schemas.ChedRequirementCreate,
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_governance_manager),
):
    """Admin endpoint to edit an existing requirement."""
    requirement = db.query(models.ChedRequirement).filter(models.ChedRequirement.id == req_id).first()
    if not requirement:
        raise HTTPException(status_code=404, detail="Requirement not found")
        
    require_program(admin, requirement.program)
    require_program(admin, req.program)
    requirement.cmo_name = req.cmo_name
    requirement.description = req.description
    db.commit()
    db.refresh(requirement)
    return requirement


@app.delete("/ched/requirements/{req_id}")
def delete_ched_requirement(
    req_id: str,
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_governance_manager),
):
    """Delete a CHED requirement and archive its linked evidence chunks."""
    requirement = db.query(models.ChedRequirement).filter(models.ChedRequirement.id == req_id).first()
    if not requirement:
        raise HTTPException(status_code=404, detail="Requirement not found")

    require_program(admin, requirement.program)
    document_names = [evidence.document_name for evidence in requirement.evidences]
    db.delete(requirement)
    db.commit()

    try:
        chunks = supabase.table("document_sections").select("id, metadata").eq("metadata->>req_id", req_id).execute()
        for chunk in chunks.data or []:
            metadata = dict(chunk.get("metadata") or {})
            metadata["status"] = "Archived"
            supabase.table("document_sections").update({"metadata": metadata}).eq("id", chunk["id"]).execute()
    except Exception:
        pass

    return {"message": "CHED requirement deleted successfully.", "archived_documents": len(document_names)}


@app.get("/ched/requirements/{program}", response_model=List[schemas.ChedRequirementResponse])
def get_ched_requirements(program: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_faculty_or_admin)):
    """Fetches all requirements for a specific program (e.g., BSIT), including nested attached files."""
    require_program(current_user, program)
    reqs = db.query(models.ChedRequirement).filter(models.ChedRequirement.program == program).all()
    uploader_emails = {
        evidence.uploaded_by
        for requirement in reqs
        for evidence in requirement.evidences
        if evidence.uploaded_by
    }
    uploader_names = {
        email.casefold(): (full_name or "Unknown user")
        for email, full_name in (
            db.query(models.User.email, models.User.full_name)
            .filter(models.User.email.in_(uploader_emails))
            .all()
            if uploader_emails else []
        )
    }
    return [
        {
            "id": requirement.id,
            "program": requirement.program,
            "cmo_name": requirement.cmo_name,
            "description": requirement.description,
            "status": requirement.status,
            "evidences": [
                {
                    "id": evidence.id,
                    "document_name": evidence.document_name,
                    "file_name": get_original_ched_file_name(evidence),
                    "file_url": get_fresh_ched_file_url(evidence),
                    "uploaded_by": evidence.uploaded_by,
                    "uploader_name": uploader_names.get(
                        (evidence.uploaded_by or "").casefold(),
                        "Unknown user",
                    ),
                    "status": evidence.status or "Pending Verification",
                    "upload_date": evidence.upload_date,
                }
                for evidence in requirement.evidences
            ],
        }
        for requirement in reqs
    ]

@app.get("/ched/evidence/{evidence_id}/access-url")
def get_ched_evidence_access_url(
    evidence_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_faculty_or_admin),
):
    """Generate a fresh private URL when an authorized user opens CHED evidence."""
    evidence = db.query(models.ChedEvidence).filter(models.ChedEvidence.id == evidence_id).first()
    if not evidence:
        raise HTTPException(status_code=404, detail="CHED evidence not found")

    require_program(current_user, evidence.requirement.program)
    storage_path = evidence.storage_path or get_private_storage_path(evidence.file_url)
    if not storage_path:
        raise HTTPException(status_code=404, detail="Stored CHED evidence file could not be located")

    fresh_url = create_private_file_url(storage_path)
    if not fresh_url:
        raise HTTPException(status_code=500, detail="Unable to create a secure evidence link")

    return {"file_url": fresh_url}

@app.post("/ched/upload-evidence")
async def upload_ched_evidence(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    requirement_id: str = Form(...),
    document_name: str = Form(...),
    uploaded_by: str = Form(...),
    program: str = Form(...), # NEW: Needed for vector metadata
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_faculty_or_admin),
):
    """Uploads PDF evidence to Supabase Storage, links it to CHED, and embeds it for RAG."""

    # 1. Verify the requirement exists
    requirement = db.query(models.ChedRequirement).filter(models.ChedRequirement.id == requirement_id).first()
    if not requirement:
        raise HTTPException(status_code=404, detail="CHED Requirement not found")

    require_program(current_user, requirement.program)
    program = requirement.program
    original_file_name = os.path.basename(file.filename or "").strip()
    if not original_file_name:
        raise HTTPException(status_code=400, detail="Uploaded file must have a file name")

    # Reject duplicate file names within the same requirement before uploading bytes.
    normalized_file_name = original_file_name.casefold()
    existing_evidences = db.query(models.ChedEvidence).filter(
        models.ChedEvidence.requirement_id == requirement.id
    ).all()
    if any(get_original_ched_file_name(item).casefold() == normalized_file_name for item in existing_evidences):
        raise HTTPException(
            status_code=409,
            detail=f"A file named '{original_file_name}' already exists in this CHED requirement.",
        )

    # 2. Read file & upload to Supabase Storage (synchronous — UI gets URL immediately)
    contents = await read_upload_limited(file)
    safe_filename = re.sub(r"[^A-Za-z0-9._-]", "_", original_file_name)
    unique_filename = f"ched_evidence/{requirement.id}/{uuid.uuid4().hex}_{safe_filename}"

    try:
        supabase.storage.from_("documents").upload(
            file=contents, path=unique_filename, file_options={"content-type": file.content_type}
        )
        stored_file_reference = unique_filename
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to upload file to storage.")

    # 3. Save Record in PostgreSQL Database (synchronous — requirement list updates instantly)
    new_evidence = models.ChedEvidence(
        requirement_id=requirement.id,
        document_name=document_name,
        file_name=original_file_name,
        storage_path=unique_filename,
        file_url=stored_file_reference,
        uploaded_by=current_user.email,
        status="Pending Verification",
    )
    db.add(new_evidence)

    # 4. Set status to Pending (synchronous)
    requirement.status = "Pending"
    db.commit()

    # 5. Defer RAG vector embedding to background (heavy — runs after response is sent)
    ched_metadata = {
        "name": document_name,
        "category": "CHED Evidence",
        "office": "Quality Assurance",
        "version": "1.0",
        "status": "Pending",
        "program": program,
        "requirement_target": requirement.description,
        "uploaded_by": current_user.email,
        "upload_date": datetime.now().isoformat(),
        "file_url": stored_file_reference,
        "storage_path": unique_filename,
        "file_name": original_file_name,
        "is_ched": True,
        "req_id": str(requirement.id)
    }
    background_tasks.add_task(
        queue_document_processing,
        contents=contents,
        filename=file.filename,
        content_type=file.content_type or "application/pdf",
        metadata=ched_metadata,
        is_ched_evidence=True,
        ched_req_id=str(requirement.id),
    )

    return {"message": "Evidence uploaded successfully. Status set to Pending Review. AI indexing is running in the background."}

@app.put("/ched/requirements/{requirement_id}/status")
def update_ched_status(
    requirement_id: str,
    status: str = Body(..., embed=True),
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_governance_reviewer),
):
    """Admin endpoint to Accept or Revoke. If Revoked, deletes the attached evidence."""
    req = db.query(models.ChedRequirement).filter(models.ChedRequirement.id == requirement_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Requirement not found")

    require_program(admin, req.program)
    req.status = status 
    
    # If the admin Revokes or Rejects, we must delete the evidence file record
    if status == "Not Compliant":
        # Delete from SQL
        db.query(models.ChedEvidence).filter(models.ChedEvidence.requirement_id == requirement_id).delete()
        
        # Archive from Vector DB so AI stops reading it
        try:
            from vector_store import supabase
            chunks_res = supabase.table("document_sections").select("id, metadata").eq("metadata->>req_id", requirement_id).execute()
            if chunks_res.data:
                for chunk in chunks_res.data:
                    chunk_meta = chunk['metadata']
                    chunk_meta['status'] = "Archived"
                    supabase.table("document_sections").update({"metadata": chunk_meta}).eq("id", chunk['id']).execute()
        except Exception:
            pass
            
    db.commit()
    return {"message": f"Requirement successfully marked as {status}"}

@app.put("/ched/evidence/{evidence_id}/status")
def update_ched_evidence_status(
    evidence_id: str,
    status: str = Body(..., embed=True),
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_governance_reviewer),
):
    """Admin endpoint to update status of a CHED evidence file."""
    evidence = db.query(models.ChedEvidence).filter(models.ChedEvidence.id == evidence_id).first()
    if not evidence:
        raise HTTPException(status_code=404, detail="Evidence not found")
    require_program(admin, evidence.requirement.program)
    evidence.status = status
    db.commit()
    return {"message": f"Evidence status updated to {status}"}

# --- NEW: DELETE CHED EVIDENCE ---
@app.delete("/ched/evidence/{evidence_id}")
def delete_ched_evidence(
    evidence_id: str,
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_governance_manager),
):
    """Deletes specific CHED evidence and archives its vector chunks."""
    evidence = db.query(models.ChedEvidence).filter(models.ChedEvidence.id == evidence_id).first()
    if not evidence:
        raise HTTPException(status_code=404, detail="Evidence not found")
        
    require_program(admin, evidence.requirement.program)
    req_id = evidence.requirement_id
    doc_name = evidence.document_name
    
    # Delete from SQL
    db.delete(evidence)
    db.commit()
    
    # Auto-revert requirement status to Not Compliant if empty
    req = db.query(models.ChedRequirement).filter(models.ChedRequirement.id == req_id).first()
    if req:
        db.refresh(req)
        if len(req.evidences) == 0:
            req.status = "Not Compliant"
            db.commit()
    db.commit()
    
    # Archive from Vector DB
    try:
        from vector_store import supabase
        chunks_res = supabase.table("document_sections").select("id, metadata").eq("metadata->>req_id", str(req_id)).eq("metadata->>name", doc_name).execute()
        if chunks_res.data:
            for chunk in chunks_res.data:
                chunk_meta = chunk['metadata']
                chunk_meta['status'] = "Archived"
                supabase.table("document_sections").update({"metadata": chunk_meta}).eq("id", chunk['id']).execute()
    except Exception:
        pass
        
    return {"message": "Evidence deleted successfully."}


# ─────────────────────────────────────────────────────────────────────────────
# PAPER TRAIL (RECEIVING & RELEASING HISTORY) API ENDPOINTS
# ─────────────────────────────────────────────────────────────────────────────

def _generate_tracking_number(db: Session) -> str:
    """Generates a unique tracking number format: PT-YYYY-XXXX."""
    import random
    year = datetime.now().year
    while True:
        num = random.randint(1000, 9999)
        tracking_no = f"PT-{year}-{num}"
        existing = db.query(models.PaperTrailRecord).filter(models.PaperTrailRecord.tracking_number == tracking_no).first()
        if not existing:
            return tracking_no


def _paper_trail_visible(record, user):
    if permissions_for(user)["paper_trail.control"]:
        return True
    email = user.email.casefold()
    if email in [(record.sender_email or "").casefold(), (record.recipient_email or "").casefold()]:
        return True
    user_offices = {office_key(name) for name in _paper_trail_user_offices(user)}
    record_offices = {
        office_key(record.office),
        office_key(record.current_location),
        office_key(record.origin_office),
    }
    record_offices.discard("")
    return bool(user_offices & record_offices)


def _paper_trail_user_offices(user: models.User) -> list[str]:
    """Return every active OFFICE assignment, preserving its canonical display name."""
    offices = []
    seen = set()
    for name in assigned_offices(user):
        normalized = office_key(name)
        if normalized and normalized not in seen:
            offices.append(str(name).strip())
            seen.add(normalized)
    return offices


def _paper_trail_origin_office(user: models.User, requested_office: Optional[str] = None) -> str:
    """Resolve the office a user is representing for a newly created trail."""
    requested = (requested_office or "").strip()
    if permissions_for(user)["paper_trail.control"]:
        return requested or "Document Control Office"

    offices = _paper_trail_user_offices(user)
    if requested:
        requested_key = office_key(requested)
        match = next((name for name in offices if office_key(name) == requested_key), None)
        if not match:
            raise HTTPException(403, "The originating office must be one of your active office assignments.")
        return match
    if len(offices) == 1:
        return offices[0]
    if len(offices) > 1:
        raise HTTPException(400, "Select which assigned office is creating this paper trail record.")
    raise HTTPException(403, "An active office assignment is required to create a paper trail record.")


def _paper_trail_is_current_custodian(record: models.PaperTrailRecord, user: models.User) -> bool:
    """Checks whether the authenticated user personally or organizationally holds the current checkpoint."""
    if permissions_for(user)["paper_trail.control"]:
        return True
    if record.is_controlled_document and record.status == "Pending Document Control":
        return False
    if record.recipient_email and record.recipient_email.lower() == user.email.lower():
        return True
    current_location = office_key(record.current_location or record.office)
    assigned = {office_key(name) for name in _paper_trail_user_offices(user)}
    return bool(current_location and current_location in assigned)


def _require_paper_trail_custody(record: models.PaperTrailRecord, user: models.User) -> None:
    if not _paper_trail_is_current_custodian(record, user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the current destination office, assigned recipient, or Document Controller may update this checkpoint."
        )


@app.post("/paper-trail", response_model=schemas.PaperTrailRecordResponse, status_code=status.HTTP_201_CREATED)
def create_paper_trail_record(
    payload: schemas.PaperTrailCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_paper_trail_reader)
):
    """Creates a new document paper trail record and logs initial release."""
    tracking_no = _generate_tracking_number(db)
    
    sender_name = current_user.full_name or payload.sender_name
    sender_email = current_user.email
    sender_role = role_of(current_user)
    has_document_control = permissions_for(current_user)["paper_trail.control"]
    origin_office = _paper_trail_origin_office(current_user, payload.origin_office)
    origin_person = payload.origin_person if has_document_control else sender_name

    requires_control_release = bool(payload.is_controlled_document)
    initial_status = "Pending Document Control" if requires_control_release else "Pending Receiving"
    initial_location = "Document Control Office" if requires_control_release else (payload.current_location or payload.office)

    attachment_path = require_private_storage_reference(payload.file_url, payload.storage_path)
    new_record = models.PaperTrailRecord(
        tracking_number=tracking_no,
        title=payload.title,
        document_type=payload.document_type,
        office=payload.office,
        sender_name=sender_name,
        sender_email=sender_email,
        sender_role=sender_role,
        recipient_name=payload.recipient_name,
        recipient_email=payload.recipient_email,
        recipient_role=payload.recipient_role.upper() if payload.recipient_role else None,
        origin_office=origin_office or payload.office,
        origin_person=origin_person or sender_name,
        current_location=initial_location,
        transaction_type=payload.transaction_type or "Submission",
        is_controlled_document=requires_control_release,
        status=initial_status,
        remarks=payload.remarks,
        storage_path=attachment_path or None,
        file_url=attachment_path or None,
    )
    db.add(new_record)
    db.commit()
    db.refresh(new_record)

    # Initial Log Entry
    initial_log = models.PaperTrailLog(
        record_id=new_record.id,
        action="Submitted for Document Control" if requires_control_release else "Document Released / Submitted",
        status=initial_status,
        actor_name=sender_name,
        actor_email=sender_email,
        actor_role=sender_role,
        notes=payload.remarks or (
            f"Controlled document '{payload.title}' submitted for release authorization."
            if requires_control_release else f"Document '{payload.title}' released to {payload.office}."
        )
    )
    db.add(initial_log)
    db.commit()
    db.refresh(new_record)

    # Notifications
    try:
        # Office Broadcasting to target office
        _notify_office(
            db=db,
            office_name=initial_location,
            n_type="info",
            title=(f"Controlled Document Awaiting Release: {tracking_no}" if requires_control_release else f"New Document Received: {tracking_no}"),
            message=(
                f"{sender_name} submitted controlled document '{payload.title}' for release authorization."
                if requires_control_release else f"{sender_name} released document '{payload.title}' to your office ({payload.office})."
            )
        )
        if not requires_control_release and payload.recipient_email and payload.recipient_email != sender_email:
            _send_notification(
                user_email=payload.recipient_email,
                n_type="info",
                title=f"New Document Received: {tracking_no}",
                message=f"{sender_name} released document '{payload.title}' to your office ({payload.office})."
            )
        _notify_all_admins(
            db=db,
            n_type="info",
            title=f"Paper Trail Created: {tracking_no}",
            message=f"Document '{payload.title}' ({payload.document_type}) released by {sender_name} to {payload.office}."
        )
    except Exception as exc:
        print(f"[paper_trail] notification warning: {exc}")

    return serialize_paper_trail_record(new_record)


@app.post("/paper-trail/request", response_model=schemas.PaperTrailRecordResponse, status_code=status.HTTP_201_CREATED)
def create_top_down_document_request(
    payload: schemas.PaperTrailRequestCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_paper_trail_reader)
):
    """Register a request assigned to an office or person within the caller's office scope."""
    tracking_no = _generate_tracking_number(db)
    requester_name = current_user.full_name or "Campus User"
    requester_email = current_user.email
    requester_role = role_of(current_user)
    requester_office = _paper_trail_origin_office(current_user, payload.origin_office)

    new_record = models.PaperTrailRecord(
        tracking_number=tracking_no,
        title=payload.title,
        document_type=payload.document_type,
        office=payload.office,
        sender_name=requester_name,
        sender_email=requester_email,
        sender_role=requester_role,
        recipient_name=payload.target_person_name or payload.office,
        recipient_email=payload.target_person_email,
        recipient_role="PERSONNEL",
        origin_office=requester_office,
        origin_person=requester_name,
        current_location=payload.office,
        transaction_type="Request",
        status="Pending Request",
        remarks=payload.instructions or f"Request for {payload.document_type}: {payload.title}"
    )
    db.add(new_record)
    db.commit()
    db.refresh(new_record)

    initial_log = models.PaperTrailLog(
        record_id=new_record.id,
        action=f"Document Request Issued ({payload.document_type})",
        status="Pending Request",
        actor_name=requester_name,
        actor_email=requester_email,
        actor_role=requester_role,
        notes=payload.instructions or f"{requester_name} requested '{payload.title}' ({payload.document_type}) from {payload.office}."
    )
    db.add(initial_log)
    db.commit()

    try:
        # Notify target person if email provided
        if payload.target_person_email:
            _send_notification(
                user_email=payload.target_person_email,
                n_type="warning",
                title=f"Pending Document Request [{tracking_no}]",
                message=f"{requester_name} has requested document '{payload.title}' ({payload.document_type}). Please upload and fulfill."
            )
        # Office Broadcasting to target office staff
        _notify_office(
            db=db,
            office_name=payload.office,
            n_type="warning",
            title=f"Document Request Issued [{tracking_no}]",
            message=f"{requester_name} requested document '{payload.title}' ({payload.document_type}) from {payload.office}."
        )
    except Exception as exc:
        print(f"[create_top_down_document_request] notification warning: {exc}")

    return serialize_paper_trail_record(new_record)


@app.get("/paper-trail", response_model=List[schemas.PaperTrailRecordResponse])
def get_paper_trail_records(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_paper_trail_reader),
):
    """List paper-trail records visible to the authenticated user."""
    records = db.query(models.PaperTrailRecord).order_by(models.PaperTrailRecord.created_at.desc()).all()
    return [
        serialize_paper_trail_record(record)
        for record in records
        if _paper_trail_visible(record, current_user)
    ]


@app.put("/paper-trail/{record_id}/fulfill", response_model=schemas.PaperTrailRecordResponse)
def fulfill_document_request(
    record_id: str,
    payload: schemas.PaperTrailFulfillRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_paper_trail_reader)
):
    """The current office custodian attaches a fulfilled file and routes it to the origin."""
    record = db.query(models.PaperTrailRecord).filter(models.PaperTrailRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Document record not found.")
    _require_paper_trail_custody(record, current_user)

    user_name = current_user.full_name or "Faculty Member"
    user_email = current_user.email

    attachment_path = require_private_storage_reference(payload.file_url, payload.storage_path)
    if not attachment_path:
        raise HTTPException(status_code=400, detail="A fulfilled request requires an uploaded attachment.")
    record.storage_path = attachment_path
    record.file_url = attachment_path
    record.status = "Submitted / Fulfilled"
    record.current_location = record.origin_office or record.sender_name or "Director / Admin Desk"
    record.recipient_email = None
    record.updated_at = utc_now()

    new_log = models.PaperTrailLog(
        record_id=record.id,
        action="Request Fulfilled & Routed to Origin",
        status="Submitted / Fulfilled",
        actor_name=user_name,
        actor_email=user_email,
        actor_role=role_of(current_user),
        notes=payload.remarks or f"Fulfilled request for '{record.title}' and routed back to {record.current_location}."
    )
    db.add(new_log)
    db.commit()
    db.refresh(record)

    try:
        # Requester / Originator Tracking notification
        if record.sender_email:
            _send_notification(
                user_email=record.sender_email,
                n_type="success",
                title=f"Document Request Fulfilled [{record.tracking_number}]",
                message=f"{user_name} has fulfilled the request for '{record.title}' and routed it back to your desk."
            )
        # Office Broadcasting to origin office
        if record.origin_office:
            _notify_office(
                db=db,
                office_name=record.origin_office,
                n_type="success",
                title=f"Document Request Fulfilled [{record.tracking_number}]",
                message=f"{user_name} has fulfilled the request for '{record.title}'."
            )
    except Exception as exc:
        print(f"[fulfill_document_request] notification warning: {exc}")

    return serialize_paper_trail_record(record)




@app.get("/paper-trail/{record_id}", response_model=schemas.PaperTrailRecordResponse)
def get_paper_trail_detail(
    record_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_paper_trail_reader)
):
    """Fetches single paper trail record with full movement history."""
    record = db.query(models.PaperTrailRecord).filter(models.PaperTrailRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Paper trail record not found.")
    if not _paper_trail_visible(record, current_user):
        raise HTTPException(403, "This record is outside your assigned office.")
    return serialize_paper_trail_record(record)


@app.put("/paper-trail/{record_id}/metadata", response_model=schemas.PaperTrailRecordResponse)
def correct_paper_trail_metadata(
    record_id: str,
    payload: schemas.PaperTrailMetadataUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_document_controller),
):
    """Allows the Document Controller to correct registry metadata without rewriting movement history."""
    record = db.query(models.PaperTrailRecord).filter(models.PaperTrailRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Paper trail record not found.")

    previous_office = record.office
    record.title = payload.title.strip()
    record.document_type = payload.document_type.strip()
    record.office = payload.office.strip()
    record.origin_office = payload.origin_office.strip() if payload.origin_office else None
    record.origin_person = payload.origin_person.strip() if payload.origin_person else None
    record.recipient_name = payload.recipient_name.strip() if payload.recipient_name else None
    record.recipient_email = payload.recipient_email.strip().lower() if payload.recipient_email else None
    record.remarks = payload.remarks
    if (record.current_location or "").strip().lower() == (previous_office or "").strip().lower():
        record.current_location = record.office
    record.updated_at = utc_now()

    db.add(models.PaperTrailLog(
        record_id=record.id,
        action="Registry Metadata Corrected",
        status=record.status,
        actor_name=current_user.full_name or "Document Controller",
        actor_email=current_user.email,
        actor_role=role_of(current_user),
        notes="Document registry details were corrected; prior movement history was preserved.",
    ))
    db.commit()
    db.refresh(record)
    return serialize_paper_trail_record(record)


@app.put("/paper-trail/{record_id}/status", response_model=schemas.PaperTrailRecordResponse)
def update_paper_trail_status(
    record_id: str,
    payload: schemas.PaperTrailStatusUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_paper_trail_reader)
):
    """Updates document routing action & location (Receive, Forward/Route, Return for Revision, Approve & Close)."""
    record = db.query(models.PaperTrailRecord).filter(models.PaperTrailRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Document record not found.")

    old_status = record.status
    action_type = payload.action_type or "Acknowledge"
    new_status = payload.status

    is_document_controller = permissions_for(current_user)["paper_trail.control"]
    if action_type in {"Approve", "Release"} and not is_document_controller:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the Document Controller may authorize controlled-document release or formally close a trail."
        )
    _require_paper_trail_custody(record, current_user)

    if action_type == "Release":
        if not record.is_controlled_document or old_status != "Pending Document Control":
            raise HTTPException(status_code=400, detail="Only a controlled document awaiting Document Control may be released.")
        new_status = "Pending Receiving"
        target_loc = payload.target_office or record.office
        record.current_location = target_loc
        action_text = f"Controlled Copy Authorized & Released to {target_loc}"
    elif action_type == "Acknowledge" or new_status == "Received":
        new_status = "Received"
        action_text = f"Document Received & Acknowledged at {record.current_location or record.office}"
    elif action_type == "Forward":
        new_status = "Forwarded"
        target_loc = payload.target_office or payload.target_person or "Target Office"
        record.current_location = target_loc
        record.recipient_name = payload.target_person or target_loc
        record.recipient_email = None
        action_text = f"Forwarded / Routed to {target_loc}"
    elif action_type == "Return" or new_status == "Needs Revision":
        new_status = "Needs Revision"
        target_loc = record.origin_office or record.sender_name or "Origin Office"
        record.current_location = target_loc
        record.recipient_name = record.origin_person or record.sender_name
        record.recipient_email = None
        action_text = f"Returned for Revision to {target_loc}"
    elif action_type == "Approve" or new_status == "Approved":
        new_status = "Approved"
        action_text = f"Approved & Closed at {record.current_location or record.office}"
    else:
        action_text = f"Status updated to {new_status}"

    record.status = new_status
    record.updated_at = utc_now()

    # Append movement log
    new_log = models.PaperTrailLog(
        record_id=record.id,
        action=action_text,
        status=new_status,
        actor_name=current_user.full_name or "Document Controller",
        actor_email=current_user.email,
        actor_role=role_of(current_user),
        notes=payload.notes or f"Action: {action_text} by {current_user.full_name or 'Document Controller'}."
    )
    db.add(new_log)
    db.commit()
    db.refresh(record)

    # Notifications (Requester Tracking & Office Broadcasting)
    try:
        # 1. Requester / Originator Tracking: Always notify original person who started trail
        if record.sender_email:
            _send_notification(
                user_email=record.sender_email,
                n_type="info" if new_status != "Needs Revision" else "warning",
                title=f"DTS Movement [{record.tracking_number}]",
                message=f"Document '{record.title}' action: {action_text} by {current_user.full_name or 'Document Controller'}."
            )

        # 2. Office Broadcasting to target/current office
        if action_type in {"Forward", "Release"} and payload.target_office:
            _notify_office(
                db=db,
                office_name=payload.target_office,
                n_type="info",
                title=f"Document Forwarded to Office [{record.tracking_number}]",
                message=f"Document '{record.title}' has been forwarded to {payload.target_office} by {current_user.full_name or 'Document Controller'}."
            )
        elif action_type == "Return" and record.origin_office:
            _notify_office(
                db=db,
                office_name=record.origin_office,
                n_type="warning",
                title=f"Document Returned for Revision [{record.tracking_number}]",
                message=f"Document '{record.title}' was returned to {record.origin_office} by {current_user.full_name or 'Document Controller'}."
            )
        elif action_type == "Approve":
            _notify_office(
                db=db,
                office_name=record.current_location or record.office,
                n_type="success",
                title=f"Document Approved & Closed [{record.tracking_number}]",
                message=f"Document '{record.title}' was verified, approved, and closed by {current_user.full_name or 'Document Controller'}."
            )
    except Exception as exc:
        print(f"[update_paper_trail_status] notification error: {exc}")

    return serialize_paper_trail_record(record)


@app.post("/paper-trail/upload")
async def upload_paper_trail_attachment(file: UploadFile = File(...), current_user: models.User = Depends(get_current_paper_trail_reader)):
    """Uploads an optional file attachment for a paper trail record."""
    try:
        contents = await read_upload_limited(file)
        safe_filename = file.filename.replace(" ", "_")
        unique_filename = f"papertrail/{int(time.time())}_{safe_filename}"

        supabase.storage.from_("documents").upload(
            file=contents,
            path=unique_filename,
            file_options={"content-type": file.content_type or "application/pdf"}
        )
        return {
            "storage_path": unique_filename,
            "file_url": create_private_file_url(unique_filename),
            "filename": file.filename,
        }
    except Exception as exc:
        print(f"[upload_paper_trail_attachment] error: {exc}")
        raise HTTPException(status_code=500, detail="Failed to upload attachment.")


# ─────────────────────────────────────────────────────────────────────────────
# ISO 9001:2015 QUALITY MANAGEMENT SYSTEM (QMS) & IQA ENDPOINTS
# ─────────────────────────────────────────────────────────────────────────────

ISO_INTERNAL_RESULT_TYPE = "INTERNAL_AUDIT"
ISO_EXTERNAL_RESULT_TYPES = {
    "CERTIFICATION_AUDIT", "SURVEILLANCE_AUDIT", "RECERTIFICATION_AUDIT", "OTHER_EXTERNAL"
}
ISO_RESULT_TYPES = {ISO_INTERNAL_RESULT_TYPE, *ISO_EXTERNAL_RESULT_TYPES}
ISO_CERTIFICATION_STATUSES = {
    "CERTIFIED", "MAINTAINED", "RECOMMENDED", "SUSPENDED", "WITHDRAWN", "NOT_CERTIFIED"
}


def validate_iso_result_payload(payload, cycle, existing_result=None):
    result_type = str(payload.result_type or "").strip().upper()
    record_status = str(getattr(payload, "record_status", "DRAFT") or "DRAFT").strip().upper()
    certification_status = str(payload.certification_status or "").strip().upper() or None
    if result_type not in ISO_RESULT_TYPES:
        raise HTTPException(400, "Select a valid internal or external ISO audit type.")
    if record_status not in {"DRAFT", "FINALIZED"}:
        raise HTTPException(400, "Result status must be Draft or Finalized.")
    if payload.audit_start_date and payload.audit_start_date > payload.audit_end_date:
        raise HTTPException(400, "Audit start date cannot be after the end date.")
    if payload.audit_end_date > date.today():
        raise HTTPException(400, "Audit result dates cannot be in the future. Use the audit schedule for planned dates.")
    if result_type == ISO_INTERNAL_RESULT_TYPE:
        certification_status = None
    elif certification_status not in ISO_CERTIFICATION_STATUSES:
        if record_status == "FINALIZED":
            raise HTTPException(400, "A finalized external audit requires a certification outcome.")
        certification_status = None

    # A cycle has one authoritative standard version. It may be adjusted while
    # it has no other result records, but cannot silently change historical data.
    standard_version = str(payload.standard_version or "").strip()
    if not standard_version:
        raise HTTPException(400, "ISO standard version is required.")
    return result_type, record_status, certification_status, standard_version


@app.get("/iso/audit-cycles", response_model=List[schemas.ISOAuditCycleResponse])
def get_iso_audit_cycles(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_governance_reader),
):
    return db.query(models.ISOAuditCycle).order_by(models.ISOAuditCycle.name.desc()).all()


@app.put("/iso/audit-cycles/{cycle_id}", response_model=schemas.ISOAuditCycleResponse)
def update_iso_audit_cycle(
    cycle_id: str,
    payload: schemas.ISOAuditCycleUpdate,
    db: Session = Depends(get_db),
    reviewer: models.User = Depends(get_campus_governance_reviewer),
):
    """Edit a planned/active cycle and preserve all linked workflow records."""
    cycle = db.query(models.ISOAuditCycle).filter(models.ISOAuditCycle.id == cycle_id).first()
    if not cycle:
        raise HTTPException(404, "ISO audit cycle not found.")
    if cycle.status == "CLOSED":
        raise HTTPException(409, "Closed ISO audit cycles are read-only historical records.")

    new_name = payload.name
    old_name = cycle.name
    if new_name != old_name:
        duplicate_cycle = db.query(models.ISOAuditCycle).filter(
            models.ISOAuditCycle.name == new_name,
            models.ISOAuditCycle.id != cycle.id,
        ).first()
        if duplicate_cycle:
            raise HTTPException(409, "An ISO audit cycle with this name already exists.")

        linked_models = (
            models.ISORequirement,
            models.IQADaySchedule,
            models.QMSActionPlan,
            models.CARForm,
        )
        if any(db.query(model).filter(model.cycle_year == new_name).first() for model in linked_models):
            raise HTTPException(409, "The new cycle name is already used by existing ISO workflow records.")

    if payload.standard_version != cycle.standard_version:
        has_results = db.query(models.ISOAuditResult).filter(
            models.ISOAuditResult.cycle_id == cycle.id
        ).first()
        if has_results:
            raise HTTPException(409, "The ISO standard version cannot change after audit results have been recorded.")

    try:
        if new_name != old_name:
            for model in (
                models.ISORequirement,
                models.IQADaySchedule,
                models.QMSActionPlan,
                models.CARForm,
            ):
                db.query(model).filter(model.cycle_year == old_name).update(
                    {model.cycle_year: new_name}, synchronize_session=False
                )
        cycle.name = new_name
        cycle.standard_version = payload.standard_version
        cycle.status = payload.status
        db.commit()
        db.refresh(cycle)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(409, "The cycle could not be updated because its name conflicts with existing records.") from exc

    try:
        if supabase:
            supabase.table("system_events_logs").insert({
                "user_email": reviewer.email,
                "event_type": "System Settings",
                "description": f'Updated ISO audit cycle "{old_name}" to "{cycle.name}" ({cycle.status}).',
            }).execute()
    except Exception:
        pass
    return cycle


@app.get("/iso/results", response_model=List[schemas.ISOAuditResultResponse])
def get_iso_audit_results(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_governance_reader),
):
    results = db.query(models.ISOAuditResult).order_by(
        models.ISOAuditResult.audit_end_date.desc(), models.ISOAuditResult.created_at.desc()
    ).all()
    return [serialize_iso_audit_result(result) for result in results]


@app.post("/iso/results", response_model=schemas.ISOAuditResultResponse, status_code=status.HTTP_201_CREATED)
def create_iso_audit_result(
    payload: schemas.ISOAuditResultCreate,
    db: Session = Depends(get_db),
    reviewer: models.User = Depends(get_campus_governance_reviewer),
):
    cycle = db.query(models.ISOAuditCycle).filter(models.ISOAuditCycle.id == payload.cycle_id).first()
    if not cycle:
        raise HTTPException(404, "ISO audit cycle not found.")
    result_type, _, certification_status, standard_version = validate_iso_result_payload(payload, cycle)
    existing_for_cycle = db.query(models.ISOAuditResult).filter(models.ISOAuditResult.cycle_id == cycle.id).first()
    if existing_for_cycle and cycle.standard_version != standard_version:
        raise HTTPException(409, "This cycle already has results under a different ISO standard version.")
    cycle.standard_version = standard_version
    result = models.ISOAuditResult(
        cycle_id=cycle.id,
        result_type=result_type,
        audit_start_date=datetime.combine(payload.audit_start_date, datetime.min.time()) if payload.audit_start_date else None,
        audit_end_date=datetime.combine(payload.audit_end_date, datetime.min.time()),
        auditor_or_certification_body=payload.auditor_or_certification_body.strip(),
        conclusion=payload.conclusion.strip(),
        certification_status=certification_status,
        major_nonconformities=payload.major_nonconformities,
        minor_nonconformities=payload.minor_nonconformities,
        observations=payload.observations,
        opportunities_for_improvement=payload.opportunities_for_improvement,
        summary=payload.summary.strip(),
        record_status="DRAFT",
        created_by=reviewer.email,
    )
    db.add(result)
    db.commit()
    db.refresh(result)
    return serialize_iso_audit_result(result)


@app.put("/iso/results/{result_id}", response_model=schemas.ISOAuditResultResponse)
def update_iso_audit_result(
    result_id: str,
    payload: schemas.ISOAuditResultUpdate,
    db: Session = Depends(get_db),
    reviewer: models.User = Depends(get_campus_governance_reviewer),
):
    result = db.query(models.ISOAuditResult).filter(models.ISOAuditResult.id == result_id).first()
    if not result:
        raise HTTPException(404, "ISO audit result not found.")
    if result.record_status == "FINALIZED":
        raise HTTPException(409, "Finalized ISO results are read-only historical records.")
    cycle = db.query(models.ISOAuditCycle).filter(models.ISOAuditCycle.id == payload.cycle_id).first()
    if not cycle:
        raise HTTPException(404, "ISO audit cycle not found.")
    result_type, record_status, certification_status, standard_version = validate_iso_result_payload(payload, cycle, result)
    other_result = db.query(models.ISOAuditResult).filter(
        models.ISOAuditResult.cycle_id == cycle.id,
        models.ISOAuditResult.id != result.id,
    ).first()
    if other_result and cycle.standard_version != standard_version:
        raise HTTPException(409, "This cycle already has results under a different ISO standard version.")
    cycle.standard_version = standard_version
    result.cycle_id = cycle.id
    result.result_type = result_type
    result.audit_start_date = datetime.combine(payload.audit_start_date, datetime.min.time()) if payload.audit_start_date else None
    result.audit_end_date = datetime.combine(payload.audit_end_date, datetime.min.time())
    result.auditor_or_certification_body = payload.auditor_or_certification_body.strip()
    result.conclusion = payload.conclusion.strip()
    result.certification_status = certification_status
    result.major_nonconformities = payload.major_nonconformities
    result.minor_nonconformities = payload.minor_nonconformities
    result.observations = payload.observations
    result.opportunities_for_improvement = payload.opportunities_for_improvement
    result.summary = payload.summary.strip()
    result.record_status = record_status
    if record_status == "FINALIZED":
        result.finalized_by = reviewer.email
        result.finalized_at = utc_now()
        cycle.status = "CLOSED"
    db.commit()
    db.refresh(result)
    return serialize_iso_audit_result(result)


@app.post("/iso/results/{result_id}/artifact/{artifact_type}", response_model=schemas.ISOAuditResultResponse)
async def upload_iso_result_artifact(
    result_id: str,
    artifact_type: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    reviewer: models.User = Depends(get_campus_governance_reviewer),
):
    result = db.query(models.ISOAuditResult).filter(models.ISOAuditResult.id == result_id).first()
    if not result:
        raise HTTPException(404, "ISO audit result not found.")
    if result.record_status == "FINALIZED":
        raise HTTPException(409, "Finalized ISO results are read-only historical records.")
    artifact_type = artifact_type.strip().lower()
    if artifact_type not in {"report", "certificate"}:
        raise HTTPException(400, "Artifact type must be report or certificate.")
    if artifact_type == "certificate" and result.result_type == ISO_INTERNAL_RESULT_TYPE:
        raise HTTPException(400, "Internal audits may attach an audit report, but they do not issue ISO certificates.")
    extension = os.path.splitext(file.filename or "")[1].lower()
    if extension not in {".pdf", ".png", ".jpg", ".jpeg"}:
        raise HTTPException(400, "Upload a PDF, PNG, or JPEG proof file.")
    contents = await read_upload_limited(file)
    safe_filename = re.sub(r"[^A-Za-z0-9._-]+", "_", os.path.basename(file.filename))
    unique_path = f"iso_results/{result.cycle_id}/{result.id}/{artifact_type}_{uuid.uuid4()}_{safe_filename}"
    supabase.storage.from_("documents").upload(
        file=contents,
        path=unique_path,
        file_options={"content-type": file.content_type or "application/pdf"},
    )
    path_field = f"{artifact_type}_storage_path"
    name_field = f"{artifact_type}_original_filename"
    old_path = getattr(result, path_field, None)
    setattr(result, path_field, unique_path)
    setattr(result, name_field, os.path.basename(file.filename))
    db.commit()
    db.refresh(result)
    if old_path and old_path != unique_path:
        try:
            supabase.storage.from_("documents").remove([old_path])
        except Exception:
            _log.exception("iso_result_old_artifact_cleanup_failed", extra={"storage_path": old_path})
    return serialize_iso_audit_result(result)


@app.get("/iso/results/{result_id}/artifact/{artifact_type}/url")
def get_iso_result_artifact_url(
    result_id: str,
    artifact_type: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_governance_reader),
):
    result = db.query(models.ISOAuditResult).filter(models.ISOAuditResult.id == result_id).first()
    if not result:
        raise HTTPException(404, "ISO audit result not found.")
    artifact_type = artifact_type.strip().lower()
    if artifact_type not in {"report", "certificate"}:
        raise HTTPException(400, "Artifact type must be report or certificate.")
    storage_path = getattr(result, f"{artifact_type}_storage_path", None)
    if not storage_path:
        raise HTTPException(404, f"No {artifact_type} is attached to this result.")
    file_url = create_private_file_url(storage_path)
    if not file_url:
        raise HTTPException(503, "Could not create a temporary proof-file URL.")
    return {
        "file_url": file_url,
        "file_name": getattr(result, f"{artifact_type}_original_filename", None) or f"iso_{artifact_type}.pdf",
    }

@app.get("/iso/cycles", response_model=List[str])
def get_iso_cycles(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_faculty_or_admin)):
    """Retrieves all distinct audit cycle years present in the system, sorted."""
    cycles = db.query(models.ISORequirement.cycle_year).distinct().all()
    cycle_list = [c[0] for c in cycles if c[0]]
    cycle_list.extend(c.name for c in db.query(models.ISOAuditCycle).all() if c.name not in cycle_list)
    defaults = ["2026 Recertification", "2025 Surveillance", "2024 Initial Audit"]
    for d in defaults:
        if d not in cycle_list:
            cycle_list.append(d)
    return sorted(cycle_list, reverse=True)


@app.post("/iso/cycles/init", response_model=List[schemas.ISORequirementResponse])
def initialize_iso_cycle(
    payload: schemas.ISOCycleCreate,
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_campus_governance_reviewer)
):
    """Initializes a new ISO Audit Cycle (e.g. '2026 Surveillance')."""
    target_prog = "GLOBAL"
    new_cycle = payload.cycle_year.strip()
    if not new_cycle:
        raise HTTPException(status_code=400, detail="Cycle year cannot be empty.")

    existing = db.query(models.ISORequirement).filter(
        models.ISORequirement.program == target_prog,
        models.ISORequirement.cycle_year == new_cycle
    ).all()

    cycle = db.query(models.ISOAuditCycle).filter(models.ISOAuditCycle.name == new_cycle).first()
    if not cycle:
        db.add(models.ISOAuditCycle(name=new_cycle, standard_version="ISO 9001:2015", status="ACTIVE"))
        db.commit()

    return existing


@app.get("/iso/requirements/{program}", response_model=List[schemas.ISORequirementResponse])
def get_iso_requirements(program: str, cycle_year: Optional[str] = "2026 Recertification", db: Session = Depends(get_db), current_user: models.User = Depends(get_current_faculty_or_admin)):
    """Retrieves ISO 9001:2015 clause checklists for the campus (Institutional QMS) per cycle year."""
    target_prog = "GLOBAL"
    target_cycle = cycle_year or "2026 Recertification"

    if _DB_IS_AVAILABLE:
        try:
            records = db.query(models.ISORequirement).filter(
                models.ISORequirement.program == target_prog,
                models.ISORequirement.cycle_year == target_cycle
            ).all()
            return [
                serialize_iso_requirement(record)
                for record in filter_office_records(current_user, records)
            ]
        except Exception:
            pass
    if supabase:
        try:
            res = supabase.table("iso_requirements").select("*").eq("program", target_prog).eq("cycle_year", target_cycle).execute()
            return filter_office_records(current_user, res.data or [])
        except Exception:
            pass
    return []


@app.post("/iso/requirements", response_model=schemas.ISORequirementResponse, status_code=status.HTTP_201_CREATED)
def create_iso_requirement(
    payload: schemas.ISORequirementCreate,
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_governance_manager)
):
    """Admin creates a new ISO requirement item for a specific cycle year."""
    require_editable_iso_audit_cycle(db, payload.cycle_year or "2025 Surveillance")
    require_office(admin, payload.auditee_office)
    new_req = models.ISORequirement(
        program=payload.program,
        iso_clause=payload.iso_clause,
        title=payload.title,
        description=payload.description,
        auditee_office=payload.auditee_office,
        risk_level=payload.risk_level or "Medium",
        status="Not Compliant",
        cycle_year=payload.cycle_year or "2025 Surveillance"
    )
    db.add(new_req)
    db.commit()
    db.refresh(new_req)
    return serialize_iso_requirement(new_req)


@app.put("/iso/requirements/{req_id}", response_model=schemas.ISORequirementResponse)
def update_iso_requirement(
    req_id: str,
    payload: schemas.ISORequirementCreate,
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_governance_manager)
):
    """Admin updates an ISO requirement item."""
    req = db.query(models.ISORequirement).filter(models.ISORequirement.id == req_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="ISO requirement not found.")
    require_editable_iso_audit_cycle(db, req.cycle_year)
    if payload.cycle_year and payload.cycle_year != req.cycle_year:
        require_editable_iso_audit_cycle(db, payload.cycle_year)
    require_office(admin, req.auditee_office)

    require_office(admin, payload.auditee_office)
    req.iso_clause = payload.iso_clause
    req.title = payload.title
    req.description = payload.description
    req.auditee_office = payload.auditee_office
    req.risk_level = payload.risk_level or req.risk_level
    if payload.cycle_year:
        req.cycle_year = payload.cycle_year
    db.commit()
    db.refresh(req)
    return serialize_iso_requirement(req)


@app.delete("/iso/requirements/{req_id}")
def delete_iso_requirement(req_id: str, db: Session = Depends(get_db), admin: models.User = Depends(get_governance_manager)):
    req = db.query(models.ISORequirement).filter(models.ISORequirement.id == req_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="ISO requirement not found.")
    require_editable_iso_audit_cycle(db, req.cycle_year)
    require_office(admin, req.auditee_office)
    db.delete(req)
    db.commit()
    return {"message": "ISO requirement deleted"}




@app.post("/iso/upload-evidence")
async def upload_iso_evidence(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    requirement_id: str = Form(...),
    document_name: str = Form(...),
    uploaded_by: str = Form(...),
    program: str = Form(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_faculty_or_admin)
):
    """Uploads an evidence file linked to an ISO clause requirement."""
    req = db.query(models.ISORequirement).filter(models.ISORequirement.id == requirement_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="ISO requirement not found.")
    require_editable_iso_audit_cycle(db, req.cycle_year)
    require_office(current_user, req.auditee_office)

    program = req.program
    uploaded_by = current_user.email
    try:
        # ── 1. Read file & upload to Storage synchronously ────────────────
        contents = await read_upload_limited(file)
        safe_filename = file.filename.replace(" ", "_")
        unique_path = f"iso_evidence/{program}/{int(time.time())}_{safe_filename}"

        supabase.storage.from_("documents").upload(
            file=contents,
            path=unique_path,
            file_options={"content-type": file.content_type or "application/pdf"}
        )
        stored_file_reference = unique_path

        # ── 2. Write SQL record synchronously (so UI updates instantly) ───
        new_evidence = models.ISOEvidence(
            iso_requirement_id=req.id,
            document_name=document_name,
            storage_path=unique_path,
            file_url=stored_file_reference,
            uploaded_by=uploaded_by,
            status="Pending"
        )
        db.add(new_evidence)

        # Set status to Pending
        req.status = "Pending"
        db.commit()
        db.refresh(req)

        # ── 3. Defer RAG embedding + audit log to background ──────────────
        iso_metadata = {
            "name": document_name,
            "category": "Accreditation Evidence",
            "office": req.auditee_office,
            "program": "GLOBAL",
            "scope_type": "OFFICE",
            "scope_code": req.auditee_office,
            "iso_clause": req.iso_clause,
            "uploaded_by": uploaded_by,
            "upload_date": datetime.now().isoformat(),
            "storage_path": unique_path,
            "file_url": stored_file_reference,
        }
        background_tasks.add_task(
            queue_document_processing,
            contents=contents,
            filename=file.filename,
            content_type=file.content_type or "application/pdf",
            metadata=iso_metadata,
            is_iso_evidence=True,
            iso_req_id=str(req.id),
        )

        return {
            "message": "ISO evidence uploaded successfully! AI indexing is running in the background.",
            "file_url": create_private_file_url(unique_path),
        }
    except HTTPException:
        raise
    except Exception as exc:
        print(f"[upload_iso_evidence] error: {exc}")
        raise HTTPException(status_code=500, detail="Failed to upload ISO evidence file.")


@app.get("/iso/evidences/pending")
def get_pending_iso_evidences(db: Session = Depends(get_db), admin: models.User = Depends(get_governance_reviewer)):
    """Retrieves all pending ISO evidences for the Admin Review Queue."""
    result = []
    if _DB_IS_AVAILABLE:
        try:
            evidences = db.query(models.ISOEvidence).filter(
                models.ISOEvidence.status == "Pending"
            ).all()
            for ev in evidences:
                req = ev.requirement
                if not req or not can_access_office(admin, req.auditee_office):
                    continue
                result.append({
                    "id": str(ev.id),
                    "iso_requirement_id": str(ev.iso_requirement_id),
                    "name": ev.document_name,
                    "url": get_fresh_private_file_url(
                        ev.file_url, getattr(ev, "storage_path", None)
                    ),
                    "uploaded_by": ev.uploaded_by,
                    "status": ev.status,
                    "admin_feedback": ev.admin_feedback,
                    "date": ev.upload_date.strftime("%Y-%m-%d") if ev.upload_date else "Recently",
                    "uploaded_at": ev.upload_date.isoformat() if ev.upload_date else "",
                    "target": f"{req.iso_clause}: {req.title}" if req else "ISO Clause",
                    "program": "Institutional QMS",
                    "area_code": req.auditee_office if req else "Global",
                    "cycle_year": req.cycle_year if req else ""
                })
            return sorted(
                result,
                key=lambda item: item.get("uploaded_at") or "",
                reverse=True,
            )
        except Exception as e:
            print(f"[get_pending_iso_evidences] DB error: {e}")
    if supabase:
        try:
            res = supabase.table("iso_evidences").select("*, iso_requirements(*)").eq("status", "Pending").order("upload_date", desc=True).execute()
            if res.data:
                for ev in res.data:
                    req = ev.get("iso_requirements") or {}
                    if not can_access_office(admin, req.get("auditee_office")):
                        continue
                    result.append({
                        "id": str(ev.get("id")),
                        "iso_requirement_id": str(ev.get("iso_requirement_id")),
                        "name": ev.get("document_name"),
                        "url": get_fresh_private_file_url(
                            ev.get("file_url"), ev.get("storage_path")
                        ),
                        "uploaded_by": ev.get("uploaded_by"),
                        "status": ev.get("status"),
                        "admin_feedback": ev.get("admin_feedback"),
                        "date": ev.get("upload_date", "").split("T")[0] if ev.get("upload_date") else "Recently",
                        "uploaded_at": ev.get("upload_date") or "",
                        "target": f"{req.get('iso_clause', 'ISO')}: {req.get('title', '')}",
                        "program": "Institutional QMS",
                        "area_code": req.get("auditee_office", "Global"),
                        "cycle_year": req.get("cycle_year", "")
                    })
                return sorted(
                    result,
                    key=lambda item: item.get("uploaded_at") or "",
                    reverse=True,
                )
        except Exception as e:
            print(f"[get_pending_iso_evidences] Supabase error: {e}")
    return result


@app.put("/iso/evidence/{evidence_id}/status")
def update_iso_evidence_status(
    evidence_id: str, 
    payload: ISOEvidenceReviewRequest, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_faculty_or_admin)
):
    """Admin/Auditor endpoint to update status of an ISO evidence file with verification remarks."""
    require_car_reviewer(current_user)
    ev = None
    if _DB_IS_AVAILABLE:
        try:
            ev = db.query(models.ISOEvidence).filter(models.ISOEvidence.id == evidence_id).first()
        except Exception as e:
            print(f"[update_iso_evidence_status] DB error: {e}")

    if ev:
        requirement = ev.requirement
        if not requirement:
            raise HTTPException(status_code=404, detail="ISO evidence requirement not found")
        require_editable_iso_audit_cycle(db, requirement.cycle_year)
        require_office(current_user, requirement.auditee_office)
        ev.status = payload.status
        ev.admin_feedback = payload.feedback
        db.commit()
        db.refresh(ev)

    if not ev and supabase:
        try:
            lookup = (
                supabase.table("iso_evidences")
                .select("*, iso_requirements(auditee_office)")
                .eq("id", evidence_id)
                .limit(1)
                .execute()
            )
            if not lookup.data:
                raise HTTPException(status_code=404, detail="Evidence not found")
            evidence_row = lookup.data[0]
            requirement = evidence_row.get("iso_requirements") or {}
            require_office(current_user, requirement.get("auditee_office"))

            update_data = {"status": payload.status, "admin_feedback": payload.feedback}
            res = supabase.table("iso_evidences").update(update_data).eq("id", evidence_id).execute()
            if res.data and len(res.data) > 0:
                from types import SimpleNamespace
                ev = SimpleNamespace(**dict(res.data[0]))
        except HTTPException:
            raise
        except Exception as sb_err:
            print(f"[update_iso_evidence_status] Supabase error: {sb_err}")

    if not ev:
        raise HTTPException(status_code=404, detail="Evidence not found")

    # Audit Logging for ISO Verification
    try:
        doc_name = getattr(ev, "document_name", "ISO Evidence Document")
        action_desc = f"IQA Auditor ({current_user.email}) marked '{doc_name}' as {payload.status}."
        if payload.feedback:
            action_desc += f" Remarks: {payload.feedback}"
            
        supabase.table("system_events_logs").insert({
            "user_email": current_user.email,
            "event_type": "ISO Evidence Review",
            "description": action_desc
        }).execute()
    except Exception as e:
        print(f"Failed to log ISO Review: {e}")
        
    return {"message": f"ISO evidence status updated to {payload.status}"}

@app.delete("/iso/evidence/{evidence_id}")
def delete_iso_evidence(
    evidence_id: str,
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_governance_manager)
):
    """Deletes an ISO evidence file."""
    ev = db.query(models.ISOEvidence).filter(models.ISOEvidence.id == evidence_id).first()
    if not ev:
        raise HTTPException(status_code=404, detail="ISO evidence not found.")

    req = ev.requirement
    if not req:
        raise HTTPException(status_code=404, detail="ISO evidence requirement not found.")
    require_editable_iso_audit_cycle(db, req.cycle_year)
    require_office(admin, req.auditee_office)
    db.delete(ev)
    db.commit()
    # Re-evaluate requirement status if no evidences remain
    if req:
        db.refresh(req)
        if len(req.evidences) == 0:
            req.status = "Not Compliant"
            db.commit()

    return {"message": "ISO evidence removed successfully."}


@app.put("/iso/requirements/{req_id}/status", response_model=schemas.ISORequirementResponse)
def update_iso_status(
    req_id: str,
    payload: schemas.ISOStatusUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_faculty_or_admin)
):
    """Update clause compliance and issue one linked CAR for a new nonconformity."""
    require_reviewer(current_user)
    req = db.query(models.ISORequirement).filter(models.ISORequirement.id == req_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="ISO requirement not found.")
    require_editable_iso_audit_cycle(db, req.cycle_year)
    require_office(current_user, req.auditee_office)

    req.status = payload.status
    db.commit()
    db.refresh(req)

    # The CAR is the authoritative case. The auditee adds a subordinate action
    # plan later instead of receiving an independent duplicate plan.
    if payload.status == "Not Compliant":
        existing_car = db.query(models.CARForm).filter(
            models.CARForm.iso_clause_id == req.id,
            models.CARForm.status.notin_(["Closed", "Void"]),
        ).first()
        if not existing_car:
            cycle = require_iso_cycle(db, req.cycle_year)
            finding = models.ISOAuditFinding(
                cycle_id=cycle.id,
                iso_clause_id=req.id,
                responsible_office=req.auditee_office,
                finding_text=f"Audit nonconformity under {req.iso_clause}: {req.description}",
                requirement_reference=f"ISO clause {req.iso_clause}: {req.description}",
                nonconformity_statement=f"Audit nonconformity under {req.iso_clause}: {req.description}",
                finding_category="UNKNOWN",
                source_type="ISO_REQUIREMENT",
            )
            db.add(finding)
            db.flush()
            car = models.CARForm(
                cycle_year=req.cycle_year,
                cycle_id=cycle.id,
                iso_clause_id=req.id,
                audit_finding_id=finding.id,
                responsible_office=req.auditee_office,
                area=req.auditee_office,
                findings=f"Audit Non-Conformity under {req.iso_clause}: {req.description}",
                finding_category="UNKNOWN",
                initiator=current_user.full_name or current_user.email,
                auditor_name=current_user.full_name or current_user.email,
                issued_by_id=current_user.id,
                status="Draft",
            )
            db.add(car)
            db.commit()

    return serialize_iso_requirement(req)


@app.get("/iso/schedule/{program}", response_model=schemas.IQAScheduleResponse)
def get_iqa_schedule(program: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_faculty_or_admin)):
    """Retrieves or seeds the dynamic 3-Day IQA Audit Program Schedule for the campus (Institutional QMS)."""
    target_prog = "GLOBAL"
    sched = db.query(models.IQASchedule).filter(models.IQASchedule.program == target_prog).first()
    if not sched:
        sched = models.IQASchedule(
            program=target_prog,
            academic_year="IQA Audit Cycle 2025-2026",
            day1_date="Sept 10, 2025",
            day1_title="Context, Risk & Resource Audit",
            day1_scope="On-site clause audit of Director of Instruction (DOI), College Deans, Financial Management, Property Custodian & SAO. Audit of Clauses 6.1, 7.1 & 8.5.",
            day2_date="Sept 11, 2025",
            day2_title="HR, Data Systems & External Control",
            day2_scope="Audit of HRMO (Clause 7.2), Registrar & MIS (Clause 9.1), Document Controller (Clause 7.5), Library, and BAC Procurement (Clause 8.4).",
            day3_date="Sept 12, 2025",
            day3_title="Consolidation & Closing Meeting",
            day3_scope="Internal data cross-referencing, synthesis of observations, drafting the formal audit findings report, and the official closing meeting and findings presentation."
        )
        db.add(sched)
        db.commit()
        db.refresh(sched)
    return sched



@app.put("/iso/schedule/{program}", response_model=schemas.IQAScheduleResponse)
def update_iqa_schedule(
    program: str,
    payload: schemas.IQAScheduleUpdate,
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_campus_governance_reviewer),
):
    """Update the campus-level IQA audit schedule."""
    if program != "GLOBAL":
        raise HTTPException(status_code=400, detail="Only the GLOBAL IQA schedule can be updated.")
    schedule = db.query(models.IQASchedule).filter(models.IQASchedule.program == "GLOBAL").first()
    if not schedule:
        schedule = models.IQASchedule(program="GLOBAL")
        db.add(schedule)
    for field, value in payload.model_dump().items():
        setattr(schedule, field, value)
    db.commit()
    db.refresh(schedule)
    return schedule




DEFAULT_IQA_DAYS = [
    {
        "day_number": 1,
        "day_date": "2025-09-10",
        "title": "Context, Risk & Resource Audit",
        "scope": "On-site clause audit of Director of Instruction (DOI), College Deans, Financial Management, Property Custodian & SAO. Audit of Clauses 6.1, 7.1 & 8.5."
    },
    {
        "day_number": 2,
        "day_date": "2025-09-11",
        "title": "HR, Data Systems & External Control",
        "scope": "Audit of HRMO (Clause 7.2), Registrar & MIS (Clause 9.1), Document Controller (Clause 7.5), Library, and BAC Procurement (Clause 8.4)."
    },
    {
        "day_number": 3,
        "day_date": "2025-09-12",
        "title": "Consolidation & Closing Meeting",
        "scope": "Internal data cross-referencing, synthesis of observations, drafting the formal audit findings report, and the official closing meeting and findings presentation."
    }
]


@app.get("/iso/schedule-days", response_model=List[schemas.IQADayScheduleResponse])
def get_iqa_schedule_days(cycle_year: str = Query("2026 Recertification"), db: Session = Depends(get_db), current_user: models.User = Depends(get_current_faculty_or_admin)):
    """Retrieves dynamic IQA Audit Days for the campus QMS filtered by cycle year."""
    if _DB_IS_AVAILABLE:
        try:
            return db.query(models.IQADaySchedule).filter(
                models.IQADaySchedule.program == "GLOBAL",
                models.IQADaySchedule.cycle_year == cycle_year
            ).order_by(models.IQADaySchedule.day_number.asc()).all()
        except Exception:
            pass
    if supabase:
        try:
            res = supabase.table("iqa_day_schedules").select("*").eq("program", "GLOBAL").eq("cycle_year", cycle_year).order("day_number", desc=False).execute()
            return res.data or []
        except Exception:
            pass
    return []


def require_editable_iso_audit_cycle(db: Session, cycle_year: str) -> models.ISOAuditCycle:
    cycle = db.query(models.ISOAuditCycle).filter(models.ISOAuditCycle.name == cycle_year).first()
    if not cycle:
        raise HTTPException(status_code=404, detail="ISO audit cycle not found. Initialize the cycle first.")
    if cycle.status == "CLOSED":
        raise HTTPException(status_code=409, detail="Closed ISO audit cycles are read-only.")
    return cycle


def validate_iqa_day_chronology(
    db: Session,
    payload: schemas.IQADayScheduleCreate,
    exclude_day_id=None,
) -> None:
    """Past dates are valid, but numbered audit days must remain chronological."""
    selected_date = date.fromisoformat(payload.day_date)
    query = db.query(models.IQADaySchedule).filter(
        models.IQADaySchedule.program == "GLOBAL",
        models.IQADaySchedule.cycle_year == payload.cycle_year,
    )
    if exclude_day_id is not None:
        query = query.filter(models.IQADaySchedule.id != exclude_day_id)
    for existing in query.all():
        try:
            existing_date = date.fromisoformat(existing.day_date)
        except (TypeError, ValueError):
            continue
        if existing.day_number < payload.day_number and existing_date > selected_date:
            raise HTTPException(400, f"Day {payload.day_number} cannot be earlier than Day {existing.day_number}.")
        if existing.day_number > payload.day_number and existing_date < selected_date:
            raise HTTPException(400, f"Day {payload.day_number} cannot be later than Day {existing.day_number}.")


@app.post("/iso/schedule-days", response_model=schemas.IQADayScheduleResponse, status_code=status.HTTP_201_CREATED)
def create_iqa_schedule_day(
    payload: schemas.IQADayScheduleCreate,
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_campus_governance_reviewer),
):
    """Add an IQA audit day to the selected campus audit cycle."""
    require_editable_iso_audit_cycle(db, payload.cycle_year)
    if payload.day_number < 1:
        raise HTTPException(status_code=400, detail="Day number must be at least 1.")
    validate_iqa_day_chronology(db, payload)
    existing = db.query(models.IQADaySchedule).filter(
        models.IQADaySchedule.program == "GLOBAL",
        models.IQADaySchedule.cycle_year == payload.cycle_year,
        models.IQADaySchedule.day_number == payload.day_number,
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="This audit cycle already has that day number.")
    item = models.IQADaySchedule(program="GLOBAL", **payload.model_dump())
    db.add(item)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="This audit cycle already has that day number.") from exc
    db.refresh(item)
    return item




@app.put("/iso/schedule-days/{day_id}", response_model=schemas.IQADayScheduleResponse)
def update_iqa_schedule_day(
    day_id: str,
    payload: schemas.IQADayScheduleCreate,
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_campus_governance_reviewer)
):
    """Admin updates an existing dynamic IQA Audit Day."""
    item = db.query(models.IQADaySchedule).filter(models.IQADaySchedule.id == day_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="IQA Audit Day not found.")
    require_editable_iso_audit_cycle(db, item.cycle_year)
    require_editable_iso_audit_cycle(db, payload.cycle_year)
    if payload.day_number < 1:
        raise HTTPException(status_code=400, detail="Day number must be at least 1.")
    validate_iqa_day_chronology(db, payload, item.id)
    duplicate = db.query(models.IQADaySchedule).filter(
        models.IQADaySchedule.program == "GLOBAL",
        models.IQADaySchedule.cycle_year == payload.cycle_year,
        models.IQADaySchedule.day_number == payload.day_number,
        models.IQADaySchedule.id != item.id,
    ).first()
    if duplicate:
        raise HTTPException(status_code=409, detail="This audit cycle already has that day number.")

    item.day_number = payload.day_number
    item.day_date = payload.day_date
    item.title = payload.title
    item.scope = payload.scope
    item.cycle_year = payload.cycle_year

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="This audit cycle already has that day number.") from exc
    db.refresh(item)
    return item




# ─────────────────────────────────────────────────────────────────────────────
# QMS OPPORTUNITIES & ACTION PLANS (MRC Form 6)
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/qms/action-plans", response_model=List[schemas.QMSActionPlanResponse])
def get_qms_action_plans(
    cycle_year: str = Query("2025 Surveillance"),
    office: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_faculty_or_admin)
):
    """Retrieves QMS Action Plans filtered by cycle year and optional auditee office."""
    query = db.query(models.QMSActionPlan).filter(models.QMSActionPlan.cycle_year == cycle_year)
    if office and office != "all":
        query = query.filter(models.QMSActionPlan.auditee_office == office)
    return [
        serialize_qms_action_plan(plan)
        for plan in filter_office_records(
            current_user,
            query.order_by(models.QMSActionPlan.created_at.desc()).all(),
        )
    ]


@app.post("/qms/action-plans", response_model=schemas.QMSActionPlanResponse, status_code=status.HTTP_201_CREATED)
def create_qms_action_plan(
    payload: schemas.QMSActionPlanCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_faculty_or_admin),
):
    car = db.query(models.CARForm).filter(models.CARForm.id == payload.car_id).first()
    if not car:
        raise HTTPException(404, "Parent CAR not found.")
    require_office(current_user, car.responsible_office)
    if not is_car_office_participant(current_user, car):
        raise HTTPException(403, "Only the designated responsible office may create the corrective-action plan.")
    if payload.cycle_year != car.cycle_year or office_key(payload.auditee_office) != office_key(car.responsible_office):
        raise HTTPException(409, "The action plan must use its parent CAR's cycle and responsible office.")
    if car.status not in {"Acknowledged", "Returned", "Response Submitted", "In Progress"}:
        raise HTTPException(409, "Corrective actions can be prepared after the CAR is acknowledged.")
    if payload.assessment_notes or payload.assessment_date:
        require_reviewer(current_user)
    owner_id = payload.owner_user_id or car.assigned_to_id
    if not owner_id:
        raise HTTPException(422, "Select a responsible owner for this corrective action.")
    owner = validate_car_assignee(db, owner_id, car.responsible_office)
    next_sequence = (db.query(func.max(models.QMSActionPlan.sequence_number)).filter(models.QMSActionPlan.car_id == car.id).scalar() or 0) + 1
    item = models.QMSActionPlan(
        **payload.model_dump(exclude={"owner_user_id", "status", "personnel_responsible"}),
        owner_user_id=owner.id,
        personnel_responsible=owner.full_name or owner.email,
        sequence_number=next_sequence,
        status="Proposed" if car.status in {"Acknowledged", "Returned"} else "In Progress",
        created_by=current_user.email,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return serialize_qms_action_plan(item)


@app.delete("/iso/schedule-days/{day_id}")
def delete_iqa_schedule_day(
    day_id: str,
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_campus_governance_reviewer),
):
    """Admin deletes an existing dynamic IQA Audit Day."""
    item = db.query(models.IQADaySchedule).filter(models.IQADaySchedule.id == day_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="IQA Audit Day not found.")
    require_editable_iso_audit_cycle(db, item.cycle_year)
    db.delete(item)
    db.commit()
    return {"message": "IQA Audit Day deleted."}




@app.put("/qms/action-plans/{plan_id}", response_model=schemas.QMSActionPlanResponse)
def update_qms_action_plan(
    plan_id: str,
    payload: schemas.QMSActionPlanUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Updates an existing digital QMS Action Plan."""
    plan = db.query(models.QMSActionPlan).filter(models.QMSActionPlan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="QMS Action Plan not found.")
    require_office(current_user, plan.auditee_office)
    changed_fields = {
        field for field in payload.model_fields_set
        if hasattr(plan, field)
        and not (getattr(payload, field) == "" and getattr(plan, field, None) is None)
        and getattr(payload, field) != getattr(plan, field, None)
    }
    assessment_fields = {"assessment_date", "assessment_notes"}
    response_fields = changed_fields - assessment_fields
    if role_of(current_user) == "SYSTEM_ADMIN" and changed_fields:
        raise HTTPException(403, "System Administrators do not perform operational CAR actions.")
    if response_fields and not is_car_office_participant(current_user, plan.car):
        raise HTTPException(403, "Only the designated responsible office may edit this action plan.")
    if changed_fields & assessment_fields:
        require_car_reviewer(current_user)
    if payload.auditee_office is not None and "auditee_office" in changed_fields:
        raise HTTPException(409, "The action-plan office is controlled by its parent CAR.")
    if payload.auditee_office is not None: plan.auditee_office = payload.auditee_office
    if payload.process_area is not None: plan.process_area = payload.process_area
    if payload.opportunity_type is not None: plan.opportunity_type = payload.opportunity_type
    if payload.findings is not None: plan.findings = payload.findings
    if payload.root_cause is not None: plan.root_cause = payload.root_cause
    if payload.immediate_action is not None: plan.immediate_action = payload.immediate_action
    if payload.corrective_measure is not None: plan.corrective_measure = payload.corrective_measure
    if payload.target_date is not None: plan.target_date = payload.target_date
    if payload.personnel_responsible is not None: plan.personnel_responsible = payload.personnel_responsible
    if payload.owner_user_id is not None:
        owner = validate_car_assignee(db, payload.owner_user_id, plan.car.responsible_office)
        plan.owner_user_id = owner.id
        plan.personnel_responsible = owner.full_name or owner.email
    if payload.action_type is not None: plan.action_type = payload.action_type
    if payload.expected_evidence is not None: plan.expected_evidence = payload.expected_evidence
    if payload.status is not None: 
        if payload.status == "Completed" and not plan.evidences:
            raise HTTPException(422, "Attach implementation evidence before marking this action complete.")
        plan.status = payload.status
        if payload.status == "Completed" and not plan.actual_completion_date and not payload.actual_completion_date:
            plan.actual_completion_date = utc_now().strftime("%Y-%m-%d")

    if payload.actual_completion_date is not None: plan.actual_completion_date = payload.actual_completion_date
    if payload.assessment_date is not None: plan.assessment_date = payload.assessment_date
    if payload.assessment_notes is not None: plan.assessment_notes = payload.assessment_notes

    db.flush()
    if plan.car.status in {"Response Submitted", "In Progress"}:
        all_actions = db.query(models.QMSActionPlan).filter(models.QMSActionPlan.car_id == plan.car_id).all()
        plan.car.status = "Awaiting Verification" if all_actions and all(action.status == "Completed" for action in all_actions) else "In Progress"

    db.commit()
    db.refresh(plan)
    return serialize_qms_action_plan(plan)


@app.delete("/qms/action-plans/{plan_id}")
def delete_qms_action_plan(plan_id: str, db: Session = Depends(get_db), admin: models.User = Depends(get_current_faculty_or_admin)):
    plan = db.query(models.QMSActionPlan).filter(models.QMSActionPlan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="QMS Action Plan not found.")
    require_office(admin, plan.auditee_office)
    if plan.car.status in {"Acknowledged", "Returned"}:
        if not is_car_office_participant(admin, plan.car):
            raise HTTPException(403, "Only the responsible office may remove a proposed action.")
    else:
        require_car_reviewer(admin)
    db.delete(plan)
    db.commit()
    return {"message": "QMS Action Plan deleted"}



@app.delete("/qms/action-plans/evidence/{evidence_id}")
def delete_qms_evidence(
    evidence_id: str,
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_faculty_or_admin),
):
    """Deletes an evidence file attached to a QMS Action Plan."""
    evidence = db.query(models.QMSEvidence).filter(models.QMSEvidence.id == evidence_id).first()
    if not evidence:
        raise HTTPException(status_code=404, detail="QMS Evidence file not found.")
    require_office(admin, evidence.action_plan.auditee_office)
    if not (is_car_reviewer(admin) or is_car_office_participant(admin, evidence.action_plan.car)):
        raise HTTPException(403, "Only the responsible office or CAR reviewer may remove this evidence.")
    db.delete(evidence)
    db.commit()
    return {"message": "Attached evidence file removed."}




@app.post("/qms/action-plans/{plan_id}/upload-evidence")
async def upload_qms_action_plan_evidence(
    plan_id: str,
    file: UploadFile = File(...),
    document_name: str = Form(...),
    uploaded_by: str = Form("Faculty User"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_faculty_or_admin),
):
    """Uploads an evidence file attached directly to a QMS Action Plan."""
    plan = db.query(models.QMSActionPlan).filter(models.QMSActionPlan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="QMS Action Plan not found.")
    require_office(current_user, plan.auditee_office)
    if not is_car_office_participant(current_user, plan.car):
        raise HTTPException(403, "Only the designated responsible office may upload action evidence.")

    contents = await read_upload_limited(file)
    file_path = f"qms_evidences/{uuid.uuid4()}_{file.filename}"
    
    stored_file_reference = ""
    try:
        if supabase:
            supabase.storage.from_("documents").upload(
                path=file_path,
                file=contents,
                file_options={"content-type": file.content_type}
            )
            stored_file_reference = file_path
    except Exception as e:
        _log.exception("qms_evidence_storage_upload_failed", extra={"plan_id": plan_id})
        raise HTTPException(status_code=500, detail="Failed to upload QMS evidence file.") from e

    evidence = models.QMSEvidence(
        action_plan_id=plan.id,
        document_name=document_name or file.filename,
        storage_path=file_path,
        file_url=stored_file_reference,
        uploaded_by=current_user.email
    )
    db.add(evidence)
    db.commit()
    db.refresh(evidence)

    return {
        "message": "Evidence file attached to Action Plan successfully!",
        "evidence_id": str(evidence.id),
        "file_url": create_private_file_url(file_path),
    }


# ─────────────────────────────────────────────────────────────────────────────
# PROGRAM ACCREDITATION & HISTORICAL LEVEL UPGRADE
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/accreditation/program/{program_code}", response_model=schemas.ProgramAccreditationResponse)
def get_program_accreditation(program_code: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_faculty_or_admin)):
    """Fetches the current level and history for a program. Initializes default if none exists."""
    require_program(current_user, program_code)
    accreditation = db.query(models.ProgramAccreditation).filter(
        models.ProgramAccreditation.program_code == program_code
    ).with_for_update().first()
    
    if not accreditation:
        # Seed default starting point with initial history
        accreditation = models.ProgramAccreditation(
            program_code=program_code,
            current_level="Candidate Status",
            status="Active"
        )
        db.add(accreditation)
        db.flush()
        
        # Seed initial baseline milestone
        initial_history = models.AccreditationHistory(
            program_id=accreditation.id,
            level_achieved="Candidate Status",
            remarks="Initial Candidate Status baseline"
        )
        db.add(initial_history)
        active_cycle = ensure_active_accreditation_cycle(db, accreditation, current_user.email)
        initial_history.cycle_id = active_cycle.id
    elif not accreditation.history or len(accreditation.history) == 0:
        # Ensure historical timeline contains at least the current standing
        initial_history = models.AccreditationHistory(
            program_id=accreditation.id,
            level_achieved=accreditation.current_level or "Candidate Status",
            valid_until=accreditation.valid_until,
            remarks=f"Official baseline standing: {accreditation.current_level or 'Candidate Status'}"
        )
        db.add(initial_history)
        active_cycle = ensure_active_accreditation_cycle(db, accreditation, current_user.email)
        initial_history.cycle_id = active_cycle.id

    ensure_active_accreditation_cycle(db, accreditation, current_user.email)
    db.commit()
    db.refresh(accreditation)
        
    return serialize_program_accreditation(accreditation)


@app.put("/accreditation/program/{program_code}", response_model=schemas.ProgramAccreditationResponse)
def update_program_accreditation(
    program_code: str,
    req: schemas.UpgradeAccreditationRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_faculty_or_admin),
):
    """Updates AACCUP areas or calibrates the current standing and cycle."""
    require_program(current_user, program_code)
    changes_standing = req.new_level is not None or req.valid_until_date is not None
    if changes_standing:
        require_campus_reviewer(current_user)
    elif not permissions_for(current_user)["governance.manage"]:
        raise HTTPException(status_code=403, detail="Governance management permission required.")

    accreditation = db.query(models.ProgramAccreditation).filter(
        models.ProgramAccreditation.program_code == program_code
    ).with_for_update().first()
    if not accreditation:
        accreditation = models.ProgramAccreditation(
            program_code=program_code,
            current_level="Candidate Status",
            status="Active",
        )
        db.add(accreditation)
        db.flush()

    active_cycle = ensure_active_accreditation_cycle(db, accreditation, current_user.email)

    if req.active_areas is not None:
        areas = [area.strip() for area in req.active_areas.split(",") if area.strip()]
        if not areas:
            raise HTTPException(status_code=400, detail="At least one active evaluation area is required.")
        allowed_areas = {f"Area {roman}" for roman in ("I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X")}
        invalid = [area for area in areas if area not in allowed_areas]
        if invalid:
            raise HTTPException(status_code=400, detail=f"Invalid evaluation area: {invalid[0]}")
        accreditation.active_areas = ",".join(dict.fromkeys(areas))

    if changes_standing:
        new_level = (req.new_level or accreditation.current_level or "Candidate Status").strip()
        if not new_level:
            raise HTTPException(status_code=400, detail="Accreditation level is required.")
        parsed_date = parse_accreditation_date(req.valid_until_date)
        if new_level != accreditation.current_level:
            close_accreditation_cycle(active_cycle, current_user.email)
            db.flush()
            new_cycle = create_accreditation_cycle(
                db,
                accreditation,
                new_level,
                current_user.email,
                "ADMINISTRATIVE_BASELINE",
                parsed_date,
                "Administrative Baseline",
            )
            db.add(models.AccreditationHistory(
                program_id=accreditation.id,
                level_achieved=new_level,
                valid_until=parsed_date,
                remarks=req.remarks or f"Administrative baseline set to {new_level}",
                cycle_id=new_cycle.id,
            ))
        else:
            active_cycle.valid_until = parsed_date
            active_cycle.updated_at = utc_now()
        accreditation.current_level = new_level
        accreditation.valid_until = parsed_date
        accreditation.updated_at = utc_now()

    db.commit()
    db.refresh(accreditation)
    return serialize_program_accreditation(accreditation)




@app.post("/accreditation/program/{program_code}/history-milestone", response_model=schemas.ProgramAccreditationResponse)
def add_accreditation_milestone(
    program_code: str,
    req: schemas.UpgradeAccreditationRequest,
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_campus_governance_reviewer)
):
    """Adds a promotion level milestone to the accreditation timeline with optional certificate."""
    require_program(admin, program_code)
    accreditation = db.query(models.ProgramAccreditation).filter(models.ProgramAccreditation.program_code == program_code).first()
    if not accreditation:
        accreditation = models.ProgramAccreditation(
            program_code=program_code,
            current_level=req.new_level or "Candidate Status",
            status="Active"
        )
        db.add(accreditation)
        db.commit()
        db.refresh(accreditation)

    parsed_date = parse_accreditation_date(req.valid_until_date)
    active_cycle = ensure_active_accreditation_cycle(db, accreditation, admin.email)

    certificate_path = get_private_storage_path(req.certificate_url)
    history_log = models.AccreditationHistory(
        program_id=accreditation.id,
        level_achieved=req.new_level or "Accreditation Update",
        valid_until=parsed_date,
        certificate_storage_path=certificate_path or None,
        certificate_url=certificate_path or req.certificate_url,
        remarks=req.remarks or f"Milestone logged for {req.new_level}",
        cycle_id=active_cycle.id,
    )
    db.add(history_log)
    db.commit()
    db.refresh(accreditation)
    return serialize_program_accreditation(accreditation)


@app.post("/accreditation/program/{program_code}/upgrade", response_model=schemas.ProgramAccreditationResponse)
def upgrade_program_accreditation(
    program_code: str, 
    req: schemas.UpgradeAccreditationRequest, 
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_campus_governance_reviewer)
):
    """Officially upgrades a program's level and logs the level achievement into history."""
    require_program(admin, program_code)
    new_level = (req.new_level or "").strip()
    if not new_level:
        raise HTTPException(status_code=400, detail="New accreditation level is required.")
    accreditation = db.query(models.ProgramAccreditation).filter(models.ProgramAccreditation.program_code == program_code).with_for_update().first()
    if not accreditation:
        accreditation = models.ProgramAccreditation(
            program_code=program_code,
            current_level="Candidate Status",
            status="Active"
        )
        db.add(accreditation)
        db.flush()

    parsed_date = parse_accreditation_date(req.valid_until_date)
    previous_cycle = ensure_active_accreditation_cycle(db, accreditation, admin.email)
    close_accreditation_cycle(previous_cycle, admin.email)
    db.flush()
    new_cycle = create_accreditation_cycle(
        db,
        accreditation,
        new_level,
        admin.email,
        "LEVEL_TRANSITION",
        parsed_date,
        "Current Cycle",
    )

    certificate_path = get_private_storage_path(req.certificate_url)
    history_log = models.AccreditationHistory(
        program_id=accreditation.id,
        level_achieved=new_level,
        valid_until=parsed_date,
        certificate_storage_path=certificate_path or None,
        certificate_url=certificate_path or req.certificate_url,
        remarks=req.remarks or f"Officially promoted to {new_level}",
        cycle_id=new_cycle.id,
    )
    db.add(history_log)

    # 2. Update the active status
    accreditation.current_level = new_level
    accreditation.valid_until = parsed_date
    accreditation.updated_at = utc_now()

    db.commit()
    db.refresh(accreditation)

    # 3. Add to Audit Log
    try:
        supabase.table("system_events_logs").insert({
            "user_email": admin.email,
            "event_type": "Accreditation Upgrade",
            "description": f"Closed {previous_cycle.cycle_label} and opened {new_cycle.cycle_label}"
        }).execute()
    except Exception:
        pass

    try:
        _notify_all_admins(
            db=db,
            n_type="success",
            title=f"AACCUP Level Upgraded: {program_code}",
            message=f"Program {program_code} has been officially upgraded to {new_level} by {admin.full_name or admin.email}."
        )
    except Exception:
        pass

    return serialize_program_accreditation(accreditation)


@app.get("/accreditation/program/{program_code}/cycles", response_model=List[schemas.AccreditationCycleResponse])
def list_program_accreditation_cycles(
    program_code: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_faculty_or_admin),
):
    require_program(current_user, program_code)
    accreditation = db.query(models.ProgramAccreditation).filter(
        models.ProgramAccreditation.program_code == program_code
    ).first()
    if not accreditation:
        return []
    return (
        db.query(models.AccreditationCycle)
        .filter(models.AccreditationCycle.program_id == accreditation.id)
        .order_by(models.AccreditationCycle.opened_at.desc(), models.AccreditationCycle.attempt_number.desc())
        .all()
    )


@app.post("/accreditation/history/{history_id}/upload-certificate")
async def upload_historical_certificate(
    history_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_campus_governance_reviewer)
):
    """Uploads an official certificate file and attaches it to an accreditation history log."""
    history_log = db.query(models.AccreditationHistory).filter(models.AccreditationHistory.id == history_id).first()
    if not history_log:
        raise HTTPException(status_code=404, detail="History record not found.")

    require_program(admin, history_log.program.program_code)
    contents = await read_upload_limited(file)
    safe_filename = file.filename.replace(" ", "_")
    unique_path = f"certificates/{int(time.time())}_{safe_filename}"

    try:
        supabase.storage.from_("documents").upload(
            file=contents,
            path=unique_path,
            file_options={"content-type": file.content_type or "application/pdf"}
        )
        history_log.certificate_storage_path = unique_path
        history_log.certificate_url = unique_path
        db.commit()
        db.refresh(history_log)
        return {
            "message": "Certificate uploaded successfully",
            "certificate_url": create_private_file_url(unique_path),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload certificate: {str(e)}")


# ─────────────────────────────────────────────────────────────────────────────
# CONTROLLED GENERATED DOCUMENTS
# ─────────────────────────────────────────────────────────────────────────────

@app.post("/legacy-document-editor/usage")
def record_legacy_document_editor_usage(current_user: models.User = Depends(get_current_admin)):
    try:
        supabase.table("system_events_logs").insert({
            "user_email": current_user.email,
            "event_type": "Legacy Document Editor Fallback",
            "description": "A System Administrator opened the temporary legacy document editor fallback.",
        }).execute()
    except Exception:
        _log.exception("legacy_document_editor_usage_log_failed", extra={"user": current_user.email})
    return {"recorded": True}

TEMPLATE_PLACEHOLDERS = {
    "MEMORANDUM": {"SENDER OFFICE", "Date", "Memorandum Number", "Current Year", "Sender Name", "SENDER NAME", "Sender Title", "Recipient Rows", "SUBJECT", "Memo Body"},
    "CAR_FORM_1": {"CAR_NO", "REVISION", "CAMPUS", "DATE_ISSUED", "AREA", "FINDINGS", "CHECK_MAJOR", "CHECK_MINOR", "CHECK_OBS", "AUDITOR", "ACKNOWLEDGED_BY", "CHECK_QMS", "CHECK_SECURITY", "CHECK_FEEDBACK", "CHECK_COMPLAINT", "CHECK_OTHER", "OTHER_DESC", "IMMEDIATE_ACTION", "ROOT_CAUSE", "CORRECTIVE_MEASURE", "PROPOSED_BY", "TARGET_DATE", "CHECK_EFFECTIVE", "CHECK_INEFFECTIVE", "FOLLOWUP_DATE", "REMARKS", "STATUS_CLOSED", "FOLLOWUP_COMPLETE", "FOLLOWUP_INEFFECTIVE"},
    "CAR_FORM_3": {"CYCLE_YEAR", "LOGSHEET_ROWS"},
    "MRC_FORM_2": {"NO", "DATE", "TIME_STARTED", "TIME_ADJOURNED", *{f"ATTENDANCE_{i}" for i in range(1, 10)}, *{f"AGENDA_{i}" for i in range(1, 5)}, "RECORDED_BY_NAME", "NOTED_BY_NAME"},
    "MRC_FORM_3": {"YEAR_1", "YEAR_2", "YEAR_3", "LOGSHEET_ROWS", "PREPARED_BY", "VP_ADMIN", "VP_RD", "VP_ACAD", "VP_PEBA", "APPROVED_BY"},
    "MRC_FORM_4": {"YEAR", "LOGSHEET_ROWS", "PREPARED_BY", "VP_ADMIN", "VP_RD", "VP_ACAD", "VP_PEBA", "APPROVED_BY"},
    "MRC_FORM_5": {"UNIT_NAME", "OBJECTIVE_TEXT", "LOGSHEET_ROWS", "PREPARED_BY", "REVIEWED_BY", "APPROVED_BY"},
    "MRC_FORM_6": {"UNIT_NAME", "LOGSHEET_ROWS", "PREPARED_BY", "REVIEWED_BY", "APPROVED_BY"},
    "MRC_FORM_7": {"LOGSHEET_ROWS", "PREPARED_BY", "APPROVED_BY"},
}

UNSAFE_TEMPLATE_PATTERNS = [
    r"<\s*(script|iframe|frame|object|embed|applet|form|input|button|textarea|select|link|base)\b",
    r"\son[a-z]+\s*=", r"javascript\s*:", r"vbscript\s*:", r"data\s*:\s*text/html",
    r"@import\b", r"expression\s*\(", r"srcdoc\s*=", r"-moz-binding\s*:", r"behavior\s*:",
    r"url\s*\(\s*['\"]?\s*(?:https?:)?//",
]


class TemplateValidationRequest(BaseModel):
    template_code: str = Field(min_length=1, max_length=80)
    content_html: str = Field(min_length=1, max_length=1_000_000)
    field_schema: Optional[List[Dict[str, Any]]] = None


class TemplateVersionCreateRequest(TemplateValidationRequest):
    name: str = Field(min_length=2, max_length=200)
    version: str = Field(min_length=1, max_length=30)
    revision: str = Field(default="0", max_length=30)
    orientation: str = "portrait"
    page_size: str = "short"
    is_new_type: bool = False


def require_template_manager(current_user):
    if not can_manage_templates(current_user):
        raise HTTPException(403, "System Administrator or Document Controller access is required.")


def can_manage_templates(current_user):
    is_document_controller = any(str(item.get("assignment_type", "")).upper() == "DOCUMENT_CONTROLLER" for item in assignments_of(current_user))
    return is_system_admin(current_user) or is_document_controller


def validate_dynamic_field_schema(field_schema, placeholders):
    if not field_schema:
        raise HTTPException(422, "Confirm at least one detected field for this new document type.")
    allowed_types = {"text", "multiline", "date", "time", "person", "checkbox"}
    normalized = []
    seen = set()
    for item in field_schema:
        key = str(item.get("key", "")).strip()
        label = str(item.get("label", "")).strip()
        field_type = str(item.get("type", "text")).strip().lower()
        if not key or key not in placeholders or key in seen:
            raise HTTPException(422, "The confirmed fields must match the unique placeholders detected in the HTML file.")
        if not label or len(label) > 120 or field_type not in allowed_types:
            raise HTTPException(422, "A field label or field type is invalid.")
        seen.add(key)
        normalized.append({"key": key, "label": label, "type": field_type, "placeholder": f"[{key}]", "required": bool(item.get("required", False)), "controlled": False})
    if seen != set(placeholders):
        raise HTTPException(422, "Confirm every placeholder detected in the HTML file before continuing.")
    return normalized


def validate_template_html(template_code, content_html, field_schema=None):
    code = template_code.strip().upper()
    allowed = TEMPLATE_PLACEHOLDERS.get(code)
    unsafe = [pattern for pattern in UNSAFE_TEMPLATE_PATTERNS if re.search(pattern, content_html, re.IGNORECASE)]
    external_urls = re.findall(r"(?:src|href)\s*=\s*['\"]\s*(https?:)?//", content_html, re.IGNORECASE)
    if unsafe or external_urls:
        raise HTTPException(422, "The template contains active or external content that is not permitted.")
    placeholders = sorted(set(re.findall(r"\[([A-Za-z0-9_ ,./&()-]+)\]", content_html)))
    dynamic_schema = None
    if not allowed:
        if not re.fullmatch(r"[A-Z][A-Z0-9_]{2,79}", code):
            raise HTTPException(422, "Use a document code containing uppercase letters, numbers, and underscores only.")
        dynamic_schema = validate_dynamic_field_schema(field_schema, placeholders)
        allowed = {item["key"] for item in dynamic_schema}
    unsupported = sorted(set(placeholders) - allowed)
    if unsupported:
        raise HTTPException(422, {"message": "Unsupported placeholders were found.", "unsupported": unsupported})
    missing = sorted(allowed - set(placeholders))
    return {"valid": True, "template_code": code, "placeholders": placeholders, "missing_placeholders": missing, "field_schema": dynamic_schema}


def validate_safe_generated_html(rendered_html):
    unsafe = [pattern for pattern in UNSAFE_TEMPLATE_PATTERNS if re.search(pattern, rendered_html, re.IGNORECASE)]
    external_urls = re.findall(r"(?:src|href|poster|background|action|formaction)\s*=\s*['\"]\s*(https?:)?//", rendered_html, re.IGNORECASE)
    meta_refresh = re.search(r"<\s*meta\b[^>]*http-equiv\s*=\s*['\"]?refresh", rendered_html, re.IGNORECASE)
    if unsafe or external_urls or meta_refresh:
        raise HTTPException(422, "The generated document contains active or external content that is not permitted.")
    return rendered_html


def require_active_template_access(current_user, template_name, template_code, template_version):
    rows = supabase.table("document_sections").select("metadata").eq("metadata->>name", template_name).execute().data or []
    matching = []
    for row in rows:
        meta = row.get("metadata") or {}
        if meta.get("category") != "Forms / Templates" or str(meta.get("status") or "Active").lower() != "active":
            continue
        if str(meta.get("template_code") or "").upper() != str(template_code).upper() or str(meta.get("version") or "") != str(template_version):
            continue
        if can_read_document(current_user, meta):
            matching.append(meta)
    if not matching:
        raise HTTPException(403, "The selected active template, code, or version is unavailable to this account.")
    return matching[0]


def wrap_converted_template_html(fragment, header_bytes=None, footer_bytes=None):
    import base64

    def image_markup(image_bytes, css_class, alt):
        if not image_bytes:
            return ""
        encoded = base64.b64encode(image_bytes).decode("ascii")
        return f'<div class="{css_class}"><img src="data:image/png;base64,{encoded}" alt="{alt}"></div>'

    header = image_markup(header_bytes, "converted-template-header", "Document header")
    footer = image_markup(footer_bytes, "converted-template-footer", "Document footer")
    body = fragment or "<p><br></p>"
    if re.search(r"<\s*html\b", body, re.IGNORECASE):
        body = re.sub(r"<\s*body([^>]*)>", lambda match: f"<body{match.group(1)}>{header}", body, count=1, flags=re.IGNORECASE)
        body = re.sub(r"<\s*/\s*body\s*>", f"{footer}</body>", body, count=1, flags=re.IGNORECASE)
        return body
    return f'''<!doctype html><html><head><meta charset="utf-8"><style>
      *{{box-sizing:border-box}} body{{margin:0;background:#fff;color:#111;font-family:Arial,sans-serif;font-size:11pt;line-height:1.35}}
      .page{{width:8.5in;min-height:11in;margin:0 auto;padding:.55in .65in;background:#fff}}
      table{{width:100%;border-collapse:collapse}} th,td{{border:1px solid #111;padding:5px;vertical-align:top}}
      .converted-template-header,.converted-template-footer{{width:100%;text-align:center}}
      .converted-template-header img,.converted-template-footer img{{max-width:100%;max-height:90px;object-fit:contain}}
      .converted-template-header{{margin-bottom:16px}} .converted-template-footer{{margin-top:16px}}
      @media print{{.page{{margin:0;box-shadow:none}}}}
    </style></head><body><main class="page">{header}{body}{footer}</main></body></html>'''


@app.post("/document-templates/convert")
async def convert_document_template_file(file: UploadFile = File(...), current_user: models.User = Depends(get_current_faculty_or_admin)):
    from pathlib import Path

    require_template_manager(current_user)
    filename = (file.filename or "template").strip()
    extension = Path(filename).suffix.lower()
    if extension not in {".html", ".htm", ".docx", ".pdf"}:
        raise HTTPException(422, "Upload an HTML, Word (.docx), or PDF template.")
    contents = await read_upload_limited(file)
    warnings = []
    header_bytes = footer_bytes = None
    try:
        if extension in {".html", ".htm"}:
            converted = contents.decode("utf-8")
            source_format = "HTML"
        elif extension == ".docx":
            converted, header_bytes, footer_bytes = docx_to_html_with_assets(contents)
            source_format = "Word"
            warnings.append("Word conversion may require small spacing or table adjustments. Review the preview before saving.")
        else:
            converted = pdf_to_html(contents)
            source_format = "PDF"
            warnings.append("PDF conversion approximates the original layout. Carefully review tables, signatures, and page breaks.")
    except Exception as exc:
        _log.exception("document_template_conversion_failed", extra={"filename": filename, "user": current_user.email})
        raise HTTPException(422, f"The {extension.lstrip('.').upper()} template could not be converted.") from exc
    html = wrap_converted_template_html(converted, header_bytes, footer_bytes)
    validate_safe_generated_html(html)
    placeholders = sorted(set(re.findall(r"\[([A-Za-z0-9_ ,./&()-]+)\]", html)))
    if not placeholders:
        warnings.append("No editable fields were detected. Add markers such as [DATE] or [APPROVED_BY] in the Word/HTML source, then import it again.")
    return {"content_html": html, "source_format": source_format, "original_filename": filename, "placeholders": placeholders, "warnings": warnings}


@app.post("/document-templates/validate")
def validate_document_template(payload: TemplateValidationRequest, current_user: models.User = Depends(get_current_faculty_or_admin)):
    require_template_manager(current_user)
    return validate_template_html(payload.template_code, payload.content_html, payload.field_schema)


@app.get("/document-templates/manage")
def list_managed_document_templates(current_user: models.User = Depends(get_current_faculty_or_admin)):
    require_template_manager(current_user)
    rows = supabase.table("document_sections").select("id, metadata").eq("metadata->>category", "Forms / Templates").order("id", desc=True).execute().data or []
    result = []
    for row in rows:
        meta = row.get("metadata") or {}
        result.append({"id": str(row.get("id")), "name": meta.get("template_name") or meta.get("name"), "repository_name": meta.get("name"), "template_code": meta.get("template_code"), "version": meta.get("version"), "revision": meta.get("template_revision"), "status": meta.get("status", "Active"), "orientation": meta.get("orientation", "portrait"), "created_at": meta.get("created_at"), "field_schema": meta.get("field_schema")})
    return result


@app.post("/document-templates", status_code=201)
def create_document_template_version(payload: TemplateVersionCreateRequest, current_user: models.User = Depends(get_current_faculty_or_admin)):
    require_template_manager(current_user)
    validation = validate_template_html(payload.template_code, payload.content_html, payload.field_schema)
    if payload.orientation not in {"portrait", "landscape"} or payload.page_size not in {"short", "a4", "legal"}:
        raise HTTPException(422, "Unsupported page configuration.")
    code = validation["template_code"]
    if payload.is_new_type and code in TEMPLATE_PLACEHOLDERS:
        raise HTTPException(409, "That document code belongs to an existing protected document type.")
    existing = supabase.table("document_sections").select("id").eq("metadata->>template_code", code).eq("metadata->>version", payload.version).neq("metadata->>status", "Archived").execute().data or []
    if existing:
        raise HTTPException(409, "That template version already exists.")
    repository_name = f"{payload.name.strip()} (v{payload.version.strip()})"
    metadata = {"name": repository_name, "template_name": payload.name.strip(), "category": "Forms / Templates", "office": "Quality Assurance Office", "program": "GLOBAL", "version": payload.version.strip(), "status": "Draft", "scope_type": "CAMPUS", "scope_code": "ARGAO", "template_code": code, "template_revision": payload.revision.strip(), "page_size": payload.page_size, "orientation": payload.orientation, "original_filename": f"{repository_name}.html", "content_html": payload.content_html, "field_schema": validation.get("field_schema") or payload.field_schema, "created_by": current_user.email, "created_at": utc_now().isoformat()}
    response = supabase.table("document_sections").insert({"content": "", "metadata": metadata, "embedding": None}).execute()
    row = (response.data or [{}])[0]
    return {"id": str(row.get("id")), "validation": validation, "metadata": metadata}


def managed_template_row(section_id):
    rows = supabase.table("document_sections").select("id, metadata").eq("id", section_id).execute().data or []
    if not rows:
        raise HTTPException(404, "Template version not found.")
    row = rows[0]; meta = row.get("metadata") or {}
    if meta.get("category") != "Forms / Templates":
        raise HTTPException(404, "Template version not found.")
    return row, meta


@app.post("/document-templates/{section_id}/activate")
def activate_document_template(section_id: str, current_user: models.User = Depends(get_current_faculty_or_admin)):
    require_template_manager(current_user)
    row, meta = managed_template_row(section_id)
    validate_template_html(meta.get("template_code", ""), meta.get("content_html", ""), meta.get("field_schema"))
    code = meta.get("template_code")
    active_rows = supabase.table("document_sections").select("id, metadata").eq("metadata->>template_code", code).eq("metadata->>status", "Active").execute().data or []
    for active in active_rows:
        if str(active.get("id")) == str(section_id):
            continue
        active_meta = active.get("metadata") or {}; active_meta["status"] = "Superseded"; active_meta["superseded_at"] = utc_now().isoformat()
        supabase.table("document_sections").update({"metadata": active_meta}).eq("id", active.get("id")).execute()
    meta["status"] = "Active"; meta["activated_by"] = current_user.email; meta["activated_at"] = utc_now().isoformat()
    supabase.table("document_sections").update({"metadata": meta}).eq("id", row.get("id")).execute()
    return {"message": "Template version activated.", "id": str(row.get("id"))}


@app.post("/document-templates/{section_id}/archive")
def archive_document_template_version(section_id: str, current_user: models.User = Depends(get_current_faculty_or_admin)):
    require_template_manager(current_user)
    row, meta = managed_template_row(section_id)
    if str(meta.get("status", "")).lower() == "active":
        raise HTTPException(409, "Activate a replacement before archiving the active template.")
    references = db_count = 0
    db = SessionLocal()
    try:
        db_count = db.query(models.GeneratedDocument).filter(models.GeneratedDocument.template_code == meta.get("template_code"), models.GeneratedDocument.template_version == meta.get("version"), models.GeneratedDocument.status.in_(["FINALIZED", "SUPERSEDED"])).count()
    finally:
        db.close()
    references = db_count
    if references:
        raise HTTPException(409, "This template version is referenced by a finalized document and cannot be archived.")
    meta["status"] = "Archived"; meta["archived_by"] = current_user.email; meta["archived_at"] = utc_now().isoformat()
    supabase.table("document_sections").update({"metadata": meta}).eq("id", row.get("id")).execute()
    return {"message": "Template version archived.", "id": str(row.get("id"))}

class GeneratedDocumentCreateRequest(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    template_name: str = Field(min_length=1, max_length=255)
    template_code: str = Field(min_length=1, max_length=80)
    template_version: str = Field(min_length=1, max_length=50)
    field_values: Dict[str, Any] = Field(default_factory=dict)
    rendered_html: str = Field(min_length=1, max_length=2_000_000)
    source_type: str = "NONE"
    source_id: Optional[str] = None
    source_reference: Optional[str] = Field(default=None, max_length=255)


class GeneratedDocumentUpdateRequest(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    field_values: Dict[str, Any] = Field(default_factory=dict)
    rendered_html: str = Field(min_length=1, max_length=2_000_000)


class GeneratedDocumentVoidRequest(BaseModel):
    reason: str = Field(min_length=3, max_length=1000)


def generated_document_response(record):
    return {
        "id": str(record.id), "title": record.title, "template_name": record.template_name,
        "template_code": record.template_code, "template_version": record.template_version,
        "status": record.status, "field_values": record.field_values or {},
        "rendered_html": record.rendered_html, "source_type": record.source_type,
        "source_id": str(record.source_id) if record.source_id else None,
        "source_reference": record.source_reference,
        "created_by_id": str(record.created_by_id), "last_edited_by_id": str(record.last_edited_by_id),
        "finalized_by_id": str(record.finalized_by_id) if record.finalized_by_id else None,
        "supersedes_id": str(record.supersedes_id) if record.supersedes_id else None,
        "created_at": record.created_at, "updated_at": record.updated_at,
        "finalized_at": record.finalized_at, "voided_at": record.voided_at,
        "void_reason": record.void_reason,
    }


def require_generated_document_access(record, current_user):
    if record.created_by_id != current_user.id and not is_system_admin(current_user):
        raise HTTPException(403, "You do not have access to this generated document.")


def validate_generated_document_source(db, current_user, source_type, source_id, source_reference=None):
    allowed = {"NONE", "CAR_FORM", "CAR_MASTER_LOG", "ISO_AUDIT_CYCLE", "MRC_RECORD"}
    if source_type not in allowed:
        raise HTTPException(422, "Unsupported generated-document source type.")
    parsed_source_id = None
    if source_id:
        try:
            parsed_source_id = uuid.UUID(source_id)
        except ValueError:
            raise HTTPException(422, "The linked source ID is invalid.")
    if source_type == "CAR_FORM":
        car = db.query(models.CARForm).filter(models.CARForm.id == parsed_source_id).first()
        if not car:
            raise HTTPException(404, "Linked CAR Form not found.")
        require_office(current_user, car_office(car, db))
    elif source_type == "CAR_MASTER_LOG":
        if not source_reference or len(str(source_reference).strip()) > 50:
            raise HTTPException(422, "A valid CAR master-log cycle reference is required.")
        visible_car_forms(db, current_user, str(source_reference).strip())
    elif source_type == "ISO_AUDIT_CYCLE" and parsed_source_id:
        cycle = db.query(models.ISOAuditCycle).filter(models.ISOAuditCycle.id == parsed_source_id).first()
        if not cycle:
            raise HTTPException(404, "Linked ISO audit cycle not found.")
        if not is_system_admin(current_user) and not is_car_reviewer(current_user):
            raise HTTPException(403, "QA, IQA Auditor, or System Administrator access is required.")
    elif source_type == "MRC_RECORD":
        if not source_reference:
            raise HTTPException(422, "A management-review source reference is required.")
        if not is_system_admin(current_user) and not is_car_reviewer(current_user):
            raise HTTPException(403, "QA, IQA Auditor, or System Administrator access is required for management-review sources.")
    elif source_type == "NONE" and (parsed_source_id or source_reference):
        raise HTTPException(422, "Unlinked documents cannot contain a source record reference.")
    return parsed_source_id


def add_generated_document_event(db, record, event_type, current_user, details=None):
    db.add(models.GeneratedDocumentEvent(
        generated_document_id=record.id, event_type=event_type,
        actor_id=current_user.id, actor_email=current_user.email, details=details or {},
    ))


@app.get("/generated-documents")
def list_generated_documents(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_faculty_or_admin)):
    query = db.query(models.GeneratedDocument)
    if not is_system_admin(current_user):
        query = query.filter(models.GeneratedDocument.created_by_id == current_user.id)
    return [generated_document_response(row) for row in query.order_by(models.GeneratedDocument.updated_at.desc()).limit(100).all()]


@app.get("/generated-documents/{document_id}")
def get_generated_document(document_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_faculty_or_admin)):
    record = db.query(models.GeneratedDocument).filter(models.GeneratedDocument.id == document_id).first()
    if not record:
        raise HTTPException(404, "Generated document not found.")
    require_generated_document_access(record, current_user)
    return generated_document_response(record)


@app.post("/generated-documents", status_code=201)
def create_generated_document(payload: GeneratedDocumentCreateRequest, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_faculty_or_admin)):
    require_active_template_access(current_user, payload.template_name, payload.template_code, payload.template_version)
    validate_safe_generated_html(payload.rendered_html)
    source_id = validate_generated_document_source(db, current_user, payload.source_type, payload.source_id, payload.source_reference)
    record = models.GeneratedDocument(
        title=payload.title.strip(), template_name=payload.template_name.strip(), template_code=payload.template_code.strip(),
        template_version=payload.template_version.strip(), field_values=payload.field_values,
        rendered_html=payload.rendered_html, source_type=payload.source_type, source_id=source_id,
        source_reference=payload.source_reference, created_by_id=current_user.id, last_edited_by_id=current_user.id,
    )
    db.add(record); db.flush()
    add_generated_document_event(db, record, "CREATED", current_user, {"template_code": record.template_code})
    db.commit(); db.refresh(record)
    return generated_document_response(record)


@app.put("/generated-documents/{document_id}")
def update_generated_document(document_id: str, payload: GeneratedDocumentUpdateRequest, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_faculty_or_admin)):
    record = db.query(models.GeneratedDocument).filter(models.GeneratedDocument.id == document_id).first()
    if not record:
        raise HTTPException(404, "Generated document not found.")
    require_generated_document_access(record, current_user)
    if record.status != "DRAFT":
        raise HTTPException(409, "Only draft documents can be edited.")
    validate_safe_generated_html(payload.rendered_html)
    record.title = payload.title.strip(); record.field_values = payload.field_values
    record.rendered_html = payload.rendered_html; record.last_edited_by_id = current_user.id; record.updated_at = utc_now()
    add_generated_document_event(db, record, "UPDATED", current_user)
    db.commit(); db.refresh(record)
    return generated_document_response(record)


@app.post("/generated-documents/{document_id}/finalize")
def finalize_generated_document(document_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_faculty_or_admin)):
    record = db.query(models.GeneratedDocument).filter(models.GeneratedDocument.id == document_id).first()
    if not record:
        raise HTTPException(404, "Generated document not found.")
    require_generated_document_access(record, current_user)
    if record.status != "DRAFT":
        raise HTTPException(409, "Only draft documents can be finalized.")
    record.status = "FINALIZED"; record.finalized_by_id = current_user.id
    record.finalized_at = utc_now(); record.updated_at = utc_now()
    add_generated_document_event(db, record, "FINALIZED", current_user, {"template_version": record.template_version})
    db.commit(); db.refresh(record)
    return generated_document_response(record)


@app.post("/generated-documents/{document_id}/reopen", status_code=201)
def reopen_generated_document(document_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_faculty_or_admin)):
    record = db.query(models.GeneratedDocument).filter(models.GeneratedDocument.id == document_id).first()
    if not record:
        raise HTTPException(404, "Generated document not found.")
    require_generated_document_access(record, current_user)
    if record.status != "FINALIZED":
        raise HTTPException(409, "Only finalized documents can be reopened as a new draft.")
    replacement = models.GeneratedDocument(
        title=record.title, template_name=record.template_name, template_code=record.template_code,
        template_version=record.template_version, field_values=record.field_values, rendered_html=record.rendered_html,
        source_type=record.source_type, source_id=record.source_id, source_reference=record.source_reference,
        created_by_id=current_user.id, last_edited_by_id=current_user.id, supersedes_id=record.id,
    )
    db.add(replacement); db.flush()
    record.status = "SUPERSEDED"; record.updated_at = utc_now()
    add_generated_document_event(db, record, "SUPERSEDED", current_user, {"replacement_id": str(replacement.id)})
    add_generated_document_event(db, replacement, "REOPENED", current_user, {"supersedes_id": str(record.id)})
    db.commit(); db.refresh(replacement)
    return generated_document_response(replacement)


@app.post("/generated-documents/{document_id}/void")
def void_generated_document(document_id: str, payload: GeneratedDocumentVoidRequest, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_faculty_or_admin)):
    record = db.query(models.GeneratedDocument).filter(models.GeneratedDocument.id == document_id).first()
    if not record:
        raise HTTPException(404, "Generated document not found.")
    require_generated_document_access(record, current_user)
    if record.status not in {"DRAFT", "FINALIZED"}:
        raise HTTPException(409, "This document can no longer be voided.")
    record.status = "VOIDED"; record.void_reason = payload.reason.strip(); record.voided_at = utc_now(); record.updated_at = utc_now()
    add_generated_document_event(db, record, "VOIDED", current_user, {"reason": record.void_reason})
    db.commit(); db.refresh(record)
    return generated_document_response(record)


@app.get("/audit/generated-documents")
def get_generated_document_audit(db: Session = Depends(get_db), admin: models.User = Depends(get_current_admin)):
    rows = db.query(models.GeneratedDocumentEvent).order_by(models.GeneratedDocumentEvent.created_at.desc()).limit(500).all()
    return [{"id": str(row.id), "document_id": str(row.generated_document_id), "event": row.event_type, "actor": row.actor_email, "details": row.details or {}, "timestamp": row.created_at} for row in rows]


# ─────────────────────────────────────────────────────────────────────────────
# AI DOCUMENT GENERATOR (Supports Local Llama3.1 / Groq)
# ─────────────────────────────────────────────────────────────────────────────

class GenerateDocRequest(BaseModel):
    prompt: str
    temperature: Optional[float] = 0.3

@app.post("/generate-document")
def generate_document_endpoint(
    req: GenerateDocRequest,
    current_user: models.User = Depends(get_current_faculty_or_admin),
):
    """
    Generates professional document body content using local Llama3.1 (via Ollama) or Groq.
    Outputs structured markdown formatted for DOCX/PDF export.
    """
    if not req.prompt.strip():
        raise HTTPException(status_code=400, detail="Prompt cannot be empty.")

    system_prompt = (
        "You are a professional document-drafting assistant embedded in an institutional document generator.\n\n"
        "RULES:\n"
        "1. Generate ONLY the body content of the requested document (academic syllabus, business contract, "
        "memorandum, proposal, letter, NDA, certificate, invoice, lesson plan, report, rubric, etc.).\n"
        "2. NEVER generate, describe, or reference a header, footer, letterhead, logo, page-number block, "
        "or company seal. Those are managed client-side.\n"
        "3. Do NOT wrap the response in markdown code fences.\n"
        "4. Format clearly:\n"
        "   - Top-level title as the first line starting with '# ' in Title Case.\n"
        "   - Section headings starting with '## ' in Title Case.\n"
        "   - Use runs of underscores (e.g. '______________') for fill-in blanks (names, dates, amounts, signatures).\n"
        "   - Use '- ' for bulleted lists and standard paragraphs for prose.\n"
        "5. Keep the draft complete, highly professional, and ready for export."
    )

    try:
        response = local_ai_client.chat.completions.create(
            model="llama3.1",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": req.prompt.strip()}
            ],
            temperature=req.temperature or 0.3,
            max_tokens=3000
        )
        content = response.choices[0].message.content.strip()
        return {"content": content}
    except Exception as e:
        print(f"[Document Generator Error]: {e}")
        # Try fallback if Groq API key is set
        groq_api_key = os.getenv("GROQ_API_KEY")
        if groq_api_key:
            try:
                from groq import Groq as GroqClient
                g_client = GroqClient(api_key=groq_api_key)
                g_res = g_client.chat.completions.create(
                    model="llama-3.3-70b-versatile",
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": req.prompt.strip()}
                    ],
                    temperature=req.temperature or 0.3,
                    max_tokens=3000
                )
                return {"content": g_res.choices[0].message.content.strip()}
            except Exception as g_err:
                print(f"[Groq Fallback Error]: {g_err}")

        raise HTTPException(
            status_code=500,
            detail=f"Could not generate document with local AI: {str(e)}"
        )


# ─────────────────────────────────────────────────────────────────────────────
# CLIENT SATISFACTION SURVEY (CSS) ENDPOINTS
# ─────────────────────────────────────────────────────────────────────────────

def submit_css_response(req: schemas.CssResponseCreate, db: Session = Depends(get_db)):
    """Submits a Client Satisfaction Survey response and saves it to the database."""
    try:
        new_response = models.CssResponse(
            client_type=req.client_type,
            date_of_service=req.date_of_service,
            gender=req.gender,
            age=req.age,
            region=req.region,
            service_availed=req.service_availed,
            campus=req.campus or "Argao",
            office_visited=req.office_visited,
            office_other=req.office_other,
            cc1=req.cc1,
            cc2=req.cc2,
            cc3=req.cc3,
            sqd0=req.sqd0,
            sqd1=req.sqd1,
            sqd2=req.sqd2,
            sqd3=req.sqd3,
            sqd4=req.sqd4,
            sqd5=req.sqd5,
            sqd6=req.sqd6,
            sqd7=req.sqd7,
            sqd8=req.sqd8,
            suggestions=req.suggestions,
            full_name=req.full_name,
            email=req.email
        )
        db.add(new_response)
        db.commit()
        db.refresh(new_response)
        return new_response
    except Exception as e:
        db.rollback()
        # Also try direct Supabase table insertion as graceful fallback
        try:
            payload = req.dict(exclude_unset=True)
            res = supabase.table("css_responses").insert(payload).execute()
            if res.data and len(res.data) > 0:
                return res.data[0]
        except Exception as sb_err:
            print(f"[Supabase CSS Insert Error]: {sb_err}")
        
        raise HTTPException(status_code=500, detail=f"Failed to submit survey response: {str(e)}")








def _iter_block_items(parent):
    import docx
    from docx.document import Document
    from docx.oxml.text.paragraph import CT_P
    from docx.oxml.table import CT_Tbl
    from docx.table import _Cell, Table
    from docx.text.paragraph import Paragraph
    if isinstance(parent, Document):
        parent_elm = parent.element.body
    elif isinstance(parent, _Cell):
        parent_elm = parent._tc
    else:
        raise ValueError("Unsupported parent type")
    for child in parent_elm.iterchildren():
        if isinstance(child, CT_P):
            yield Paragraph(child, parent)
        elif isinstance(child, CT_Tbl):
            yield Table(child, parent)


def _escape_html(s: str) -> str:
    return (s or "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def _docx_runs_to_html(paragraph) -> str:
    """Convert python-docx paragraph runs into inline HTML with formatting."""
    parts = []
    for run in paragraph.runs:
        text = run.text or ""
        if not text:
            continue
        text = _escape_html(text)
        if run.bold:
            text = f"<strong>{text}</strong>"
        if run.italic:
            text = f"<em>{text}</em>"
        if run.underline:
            text = f"<u>{text}</u>"
        parts.append(text)
    return "".join(parts)


def _extract_inline_images_from_part(part, doc):
    """Return the first inline image's bytes from a header/footer part, or None."""
    from docx.oxml.ns import qn
    if part is None:
        return None
    try:
        xml_root = part._element if hasattr(part, "_element") else None
        if xml_root is None:
            return None
        for inline in xml_root.findall('.//' + qn('wp:inline')):
            blip = inline.find('.//' + qn('a:blip'))
            if blip is not None:
                rid = blip.get(qn('r:embed'))
                if rid and rid in doc.part.related_parts:
                    return doc.part.related_parts[rid].blob
    except Exception:
        return None
    return None
# ─────────────────────────────────────────────────────────────────────────────
# DOCX: table-aware body iteration
# ─────────────────────────────────────────────────────────────────────────────

def _docx_iter_body(doc):
    """
    Yield Paragraph and Table objects in document order.

    `doc.paragraphs` returns only top-level paragraphs and silently skips
    everything inside a table. Walking `doc.element.body` gives us every
    block in the order it appears on the page.
    """
    from docx.oxml.ns import qn
    from docx.table import Table
    from docx.text.paragraph import Paragraph

    body = doc.element.body
    for child in body.iterchildren():
        if child.tag == qn("w:p"):
            yield Paragraph(child, doc)
        elif child.tag == qn("w:tbl"):
            yield Table(child, doc)


def _docx_cell_to_html(cell) -> str:
    """Render one table cell's paragraphs as inline HTML, joined by <br>."""
    pieces = []
    for para in cell.paragraphs:
        inner = _docx_runs_to_html(para)
        if inner.strip():
            pieces.append(inner)
    return "<br>".join(pieces)


def _docx_table_to_html(table) -> str:
    """Render a python-docx Table as an HTML <table>."""
    rows_html = []
    for row in table.rows:
        cells_html = []
        for cell in row.cells:
            inner = _docx_cell_to_html(cell)
            cells_html.append(f"<td>{inner}</td>")
        rows_html.append(f"<tr>{''.join(cells_html)}</tr>")
    return "<table>" + "".join(rows_html) + "</table>"

def docx_to_html_with_assets(contents: bytes):
    """
    Convert a DOCX into (html_string, header_image_bytes|None, footer_image_bytes|None).

    Walks the document body in document order, emitting:
      • <p>/<h1>/<h2>/<h3>/<li> for paragraphs (with per-paragraph text-align
        from python-docx's `paragraph.alignment`, plus a style-chain fallback)
      • <table><tr><td>…</td></tr></table> for tables

    Previous versions iterated `doc.paragraphs` only, which silently dropped
    every table's content.
    """
    import docx
    from docx.enum.text import WD_ALIGN_PARAGRAPH
    from docx.table import Table
    from docx.text.paragraph import Paragraph

    doc = docx.Document(io.BytesIO(contents))

    ALIGN_CSS = {
        WD_ALIGN_PARAGRAPH.CENTER:  "center",
        WD_ALIGN_PARAGRAPH.RIGHT:   "right",
        WD_ALIGN_PARAGRAPH.JUSTIFY: "justify",
    }

    def _effective_alignment(para):
        if para.alignment is not None:
            return para.alignment
        style = para.style
        if style is not None:
            try:
                s_align = style.paragraph_format.alignment
                if s_align is not None:
                    return s_align
            except Exception:
                pass
        return None

    def _align_attr(para) -> str:
        css = ALIGN_CSS.get(_effective_alignment(para))
        return f' style="text-align:{css}"' if css else ""

    html_blocks: list[str] = []

    for block in _docx_iter_body(doc):
        if isinstance(block, Table):
            html_blocks.append(_docx_table_to_html(block))
            continue

        # Paragraph
        para = block
        inner = _docx_runs_to_html(para)
        style_name = (para.style.name or "").lower() if para.style else ""
        attr = _align_attr(para)

        if not inner.strip():
            html_blocks.append(f"<p{attr}><br></p>")
            continue

        if style_name == "title" or "heading 1" in style_name:
            html_blocks.append(f"<h1{attr}>{inner}</h1>")
        elif "heading 2" in style_name:
            html_blocks.append(f"<h2{attr}>{inner}</h2>")
        elif "heading 3" in style_name:
            html_blocks.append(f"<h3{attr}>{inner}</h3>")
        elif "list" in style_name:
            html_blocks.append(f"<li{attr}>{inner}</li>")
        else:
            html_blocks.append(f"<p{attr}>{inner}</p>")

    html = "\n".join(html_blocks)

    # Group consecutive <li> elements into <ul> blocks (attribute-tolerant).
    html = re.sub(
        r"(?:<li[^>]*>.*?</li>\n?)+",
        lambda m: f"<ul>{m.group(0)}</ul>",
        html,
        flags=re.DOTALL,
    )

    header_bytes = None
    footer_bytes = None
    for section in doc.sections:
        if header_bytes is None:
            try:
                header_bytes = _extract_inline_images_from_part(section.header, doc)
            except Exception:
                header_bytes = None
        if footer_bytes is None:
            try:
                footer_bytes = _extract_inline_images_from_part(section.footer, doc)
            except Exception:
                footer_bytes = None

    return html, header_bytes, footer_bytes
    def _effective_alignment(para):
        """
        Return the paragraph's effective alignment, walking the style chain
        if the direct alignment is unset. Many real-world DOCX files put
        alignment on the paragraph style (e.g. 'Title' → CENTER) rather than
        on each paragraph directly.
        """
        if para.alignment is not None:
            return para.alignment
        style = para.style
        if style is not None:
            try:
                style_align = style.paragraph_format.alignment
                if style_align is not None:
                    return style_align
            except Exception:
                pass
        return None

    def _align_attr(para) -> str:
        css = ALIGN_CSS.get(_effective_alignment(para))
        return f' style="text-align:{css}"' if css else ""

    from docx.table import Table
    from docx.text.paragraph import Paragraph

    lines = []
    for block in _iter_block_items(doc):
        if isinstance(block, Paragraph):
            para = block
            inner = _docx_runs_to_html(para)
            style_name = (para.style.name or "").lower() if para.style else ""
            attr = _align_attr(para)

            if not inner.strip():
                lines.append(f"<p{attr}><br></p>")
                continue

            if style_name == "title" or "heading 1" in style_name:
                lines.append(f"<h1{attr}>{inner}</h1>")
            elif "heading 2" in style_name:
                lines.append(f"<h2{attr}>{inner}</h2>")
            elif "heading 3" in style_name:
                lines.append(f"<h3{attr}>{inner}</h3>")
            elif "list" in style_name:
                lines.append(f"<li{attr}>{inner}</li>")
            else:
                lines.append(f"<p{attr}>{inner}</p>")
        elif isinstance(block, Table):
            lines.append('<table border="1" style="border-collapse: collapse; width: 100%;">')
            for row in block.rows:
                lines.append("<tr>")
                for cell in row.cells:
                    lines.append("<td style='padding: 4px;'>")
                    for cell_block in _iter_block_items(cell):
                        if isinstance(cell_block, Paragraph):
                            inner = _docx_runs_to_html(cell_block)
                            lines.append(f"<p>{inner}</p>" if inner.strip() else "<p><br></p>")
                    lines.append("</td>")
                lines.append("</tr>")
            lines.append("</table>")

    html = "\n".join(lines)

    # Group consecutive <li> elements into <ul> blocks. The regex accepts
    # optional attributes (e.g. `style="text-align:right"`) so alignment
    # information on list items survives the grouping step.
    html = re.sub(
        r"(?:<li[^>]*>.*?</li>\n?)+",
        lambda m: f"<ul>{m.group(0)}</ul>",
        html,
        flags=re.DOTALL,
    )

    header_bytes = None
    footer_bytes = None
    for section in doc.sections:
        if header_bytes is None:
            try:
                header_bytes = _extract_inline_images_from_part(section.header, doc)
            except Exception:
                header_bytes = None
        if footer_bytes is None:
            try:
                footer_bytes = _extract_inline_images_from_part(section.footer, doc)
            except Exception:
                footer_bytes = None

    return html, header_bytes, footer_bytes

def _bbox_overlaps_any(bbox, other_bboxes, tolerance: float = 3.0) -> bool:
    """True if `bbox` overlaps any bbox in `other_bboxes` (with tolerance)."""
    x0a, y0a, x1a, y1a = (float(v) for v in bbox)
    for ob in other_bboxes:
        try:
            x0b, y0b, x1b, y1b = (float(v) for v in ob)
        except Exception:
            continue
        if x1a < x0b - tolerance or x0a > x1b + tolerance:
            continue
        if y1a < y0b - tolerance or y0a > y1b + tolerance:
            continue
        return True
    return False


def _pdf_table_to_html(pdf_table) -> str:
    """
    Convert a PyMuPDF Table (from page.find_tables()) into an HTML <table>.

    Uses `pdf_table.extract()` for the cell grid. When PyMuPDF reports an
    external header (i.e. the table was defined with an explicit header row),
    the first row is emitted as <th>; otherwise every row is a <td>.
    """
    try:
        data = pdf_table.extract()
    except Exception as e:
        print(f"[pdf_to_html] table.extract failed: {e}")
        return ""

    if not data:
        return ""

    has_external_header = False
    try:
        hdr = getattr(pdf_table, "header", None)
        if hdr is not None and getattr(hdr, "external", False):
            has_external_header = True
    except Exception:
        pass

    rows_html: list[str] = []
    for r_idx, row in enumerate(data):
        cells_html: list[str] = []
        for cell in row:
            cell_text = (cell or "").strip()
            escaped = _escape_html(cell_text).replace("\n", "<br>")
            tag = "th" if (has_external_header and r_idx == 0) else "td"
            cells_html.append(f"<{tag}>{escaped}</{tag}>")
        rows_html.append(f"<tr>{''.join(cells_html)}</tr>")

    return "<table>" + "".join(rows_html) + "</table>"
def _pdf_pair_side_by_side_blocks(blocks):
    """
    After merging paragraph blocks, group them into "row bands" by Y overlap.

    A band is a set of 2+ blocks whose vertical ranges intersect significantly
    but whose horizontal ranges do NOT overlap. Those are the two-column
    layouts common in institutional memos ("TO: <names>" | "- Dean of ...").
    Emits a synthetic 2-column table so the name↔role pairing survives.

    Blocks with no side-by-side partner stay as paragraphs.
    """
    # Sort by top-Y, then by left-X
    ordered = []
    for blk in blocks:
        bboxes = [ln["bbox"] for ln in blk["lines"] if ln.get("bbox")]
        if not bboxes:
            continue
        blk_bbox = (
            min(float(b[0]) for b in bboxes),
            min(float(b[1]) for b in bboxes),
            max(float(b[2]) for b in bboxes),
            max(float(b[3]) for b in bboxes),
        )
        ordered.append({"blk": blk, "bbox": blk_bbox})
    ordered.sort(key=lambda x: (x["bbox"][1], x["bbox"][0]))

    # Greedy band building
    bands = []
    for item in ordered:
        placed = False
        for band in bands:
            # Vertical overlap check: the item must overlap the band's Y range
            band_top = min(b["bbox"][1] for b in band)
            band_bot = max(b["bbox"][3] for b in band)
            overlap = min(band_bot, item["bbox"][3]) - max(band_top, item["bbox"][1])
            if overlap > 0:
                band.append(item)
                placed = True
                break
        if not placed:
            bands.append([item])

    return bands


def _pdf_band_to_html(band, page_left, page_right):
    """
    Emit a band as either:
      • a 2-column <table> when the band contains >=2 side-by-side blocks, or
      • a sequence of <p>s when the band is a single-column set of blocks.
    """
    if len(band) == 1:
        return None  # caller handles single-block bands as normal paragraphs

    # Sort band members left-to-right
    band_sorted = sorted(band, key=lambda x: x["bbox"][0])

    # Check that no two members horizontally overlap. If they do, they're
    # not really two columns — bail and let them be paragraphs.
    for i in range(len(band_sorted) - 1):
        if band_sorted[i]["bbox"][2] > band_sorted[i + 1]["bbox"][0] - 2:
            return None

    # Build the table rows. Each row is one visual line across the columns.
    # We reconstruct rows by Y position: every member block may have multiple
    # visual lines inside it.
    column_lines: list[list[str]] = []
    for member in band_sorted:
        lines_text = []
        for ln in member["blk"]["lines"]:
            parts = [s.get("text", "") for s in ln.get("spans", []) if s.get("text")]
            text = "".join(parts).rstrip()
            lines_text.append(text)
        column_lines.append(lines_text)

    max_rows = max(len(c) for c in column_lines)
    rows_html = []
    for r in range(max_rows):
        cells = []
        for col in column_lines:
            cell_text = col[r] if r < len(col) else ""
            escaped = _escape_html(cell_text)
            cells.append(f"<td>{escaped}</td>")
        rows_html.append(f"<tr>{''.join(cells)}</tr>")

    return "<table>" + "".join(rows_html) + "</table>"
# ─────────────────────────────────────────────────────────────────────────────
# PDF → HTML (alignment-aware)
# ─────────────────────────────────────────────────────────────────────────────


# Fraction of the page top/bottom that belongs to the institutional letterhead.
# Matches the ratios used by extract_pdf_header_footer_images so the two
# functions agree on where the letterhead lives.
PDF_HEADER_REGION_RATIO = 0.14
PDF_FOOTER_REGION_RATIO = 0.90


def _is_in_header_or_footer(bbox, page_height: float) -> bool:
    """
    True if the given bbox lies entirely within the page's header or footer
    band. Blocks here are the PDF's baked-in letterhead (CTU seal text,
    partner logos strip, etc.) which should not be duplicated into the
    editor body — the editor already renders the local letterhead image.
    """
    if page_height <= 0:
        return False
    try:
        _, y0, _, y1 = bbox
    except Exception:
        return False
    y0 = float(y0)
    y1 = float(y1)
    if y1 < page_height * PDF_HEADER_REGION_RATIO:
        return True
    if y0 > page_height * PDF_FOOTER_REGION_RATIO:
        return True
    return False


def _compute_page_content_bounds(page_dict, page_height: float):
    """
    Return (page_left, page_right) — the actual horizontal text margins of
    the page — by scanning every non-header/footer text line's bbox.

    Returns (None, None) when the page has no usable text lines, so callers
    can fall back to the 10%-of-page-width heuristic.

    Using the page's OWN margins (rather than a hard-coded 10%/90% of the
    page width) is what makes the justify / center / right detection work
    across documents with different margin settings.
    """
    xs0, xs1 = [], []
    for block in page_dict.get("blocks", []):
        if block.get("type", 0) != 0:
            continue
        for line in block.get("lines", []):
            ln_bbox = line.get("bbox")
            if not ln_bbox:
                continue
            if _is_in_header_or_footer(ln_bbox, page_height):
                continue
            xs0.append(float(ln_bbox[0]))
            xs1.append(float(ln_bbox[2]))
    if not xs0 or not xs1:
        return None, None
    return min(xs0), max(xs1)


def _infer_pdf_block_alignment(bbox, lines_list, page_left: float, page_right: float) -> str:
    """
    Infer a PDF text block's alignment from its bbox and its per-line bboxes,
    using the page's MEASURED content margins (page_left / page_right).

    Returns one of: "center", "right", "justify", "left".

    Priority:
      1. Centered  — block is narrow and its horizontal center lies near
                     the page's content center, and it doesn't touch either
                     margin.
      2. Right     — block is flush with the right margin but not the left.
      3. Justified — 2+ lines, the block spans nearly the full content
                     width, its non-final lines average close to the full
                     width, and its last line is noticeably shorter (the
                     hallmark of justified text).
      4. Left      — the default.
    """
    try:
        x0, _y0, x1, _y1 = bbox
    except Exception:
        return "left"

    x0 = float(x0)
    x1 = float(x1)
    block_width = x1 - x0

    if block_width <= 0 or page_right <= page_left:
        return "left"

    content_width = page_right - page_left
    if content_width <= 0:
        return "left"

    page_center = (page_left + page_right) / 2.0
    block_center = (x0 + x1) / 2.0

    edge_tol   = content_width * 0.06
    center_tol = content_width * 0.10

    near_left   = abs(x0 - page_left)  < edge_tol
    near_right  = abs(x1 - page_right) < edge_tol
    near_center = abs(block_center - page_center) < center_tol

    # 1. Centered
    if near_center and not near_left and not near_right and block_width < content_width * 0.80:
        return "center"

    # 2. Right-aligned
    if near_right and not near_left:
        return "right"

    # 3. Justified
    if len(lines_list) >= 2:
        line_bboxes = [ln.get("bbox") for ln in lines_list if ln.get("bbox")]
        if len(line_bboxes) >= 2:
            widths = [float(b[2]) - float(b[0]) for b in line_bboxes]
            last_width = widths[-1]
            other_widths = widths[:-1]
            if other_widths:
                avg_other = sum(other_widths) / len(other_widths)
                if (
                    block_width > content_width * 0.85
                    and avg_other > content_width * 0.70
                    and last_width < avg_other * 0.85
                ):
                    return "justify"

    return "left"

def pdf_to_html(contents: bytes) -> str:
    """
    Convert a PDF into an editor-friendly HTML fragment.

    Improvements over the previous version:

      1. The top 14% and bottom 10% of each page (the institutional
         letterhead regions) are SKIPPED. PyMuPDF returns the CTU seal text
         and the partner-logo strip as ordinary text blocks; without this
         filter they leak into the editor body and duplicate the local
         letterhead image the editor already renders.

      2. Alignment inference uses the page's OWN content margins (measured
         from the non-header/footer lines) rather than a hard-coded 10%/90%
         of page width. This is what makes justified body paragraphs
         actually register as justified when the document's margins don't
         match the hard-coded assumption.

    Uses PyMuPDF's `get_text("dict")` mode to obtain per-block and per-line
    bounding boxes. Falls back to PyPDF2 (no alignment, no header/footer
    filtering) when PyMuPDF is unavailable or fails to open the file.
    """
    try:
        import fitz  # PyMuPDF
    except ImportError:
        print("[pdf_to_html] PyMuPDF not installed — falling back to PyPDF2 (no alignment preserved)")
        return _pdf_to_html_pypdf2(contents)

    try:
        doc = fitz.open(stream=contents, filetype="pdf")
    except Exception as e:
        print(f"[pdf_to_html] PyMuPDF open failed: {e} — falling back to PyPDF2")
        return _pdf_to_html_pypdf2(contents)

    html_parts: list[str] = []
    try:
        for page_num in range(len(doc)):
            page = doc.load_page(page_num)
            page_width  = float(page.rect.width)  or 1.0
            page_height = float(page.rect.height) or 1.0

            try:
                page_dict = page.get_text("dict")
            except Exception as e:
                print(f"[pdf_to_html] dict extraction failed on page {page_num}: {e}")
                # Fallback: text mode, no alignment, no header/footer filtering.
                text = page.get_text("text") or ""
                for block in text.split("\n\n"):
                    block = block.strip()
                    if block:
                        escaped = _escape_html(block).replace("\n", "<br>")
                        html_parts.append(f"<p>{escaped}</p>")
                continue

            # Measure this page's real content margins.
            page_left, page_right = _compute_page_content_bounds(page_dict, page_height)
            if page_left is None or page_right is None:
                page_left  = page_width * 0.10
                page_right = page_width * 0.90

            for block in page_dict.get("blocks", []):
                # 0 = text block, 1 = image block. Only text is handled.
                if block.get("type", 0) != 0:
                    continue

                raw_lines = block.get("lines") or []
                if not raw_lines:
                    continue

                # Drop header/footer lines from the block.
                kept_lines = []
                for ln in raw_lines:
                    ln_bbox = ln.get("bbox")
                    if not ln_bbox:
                        continue
                    if _is_in_header_or_footer(ln_bbox, page_height):
                        continue
                    kept_lines.append(ln)

                if not kept_lines:
                    continue

                # Recompute the block bbox from the kept lines only, so the
                # alignment inference isn't skewed by filtered-out neighbours.
                try:
                    kept_bbox = [
                        min(float(ln["bbox"][0]) for ln in kept_lines),
                        min(float(ln["bbox"][1]) for ln in kept_lines),
                        max(float(ln["bbox"][2]) for ln in kept_lines),
                        max(float(ln["bbox"][3]) for ln in kept_lines),
                    ]
                except Exception:
                    continue

                align = _infer_pdf_block_alignment(kept_bbox, kept_lines, page_left, page_right)

                                # Build the paragraph's text by joining WRAPPED lines with a
                # space and HARD-BROKEN lines with <br>.
                #
                # Why this matters: CSS `text-align: justify` only stretches
                # soft-wrapped lines. Any line terminated by a forced break
                # (a <br>) is treated as the last line of a segment and is
                # left-aligned, no matter what text-align says. Joining every
                # visual line with a <br> — as the previous version did —
                # therefore made justify a visual no-op on PDF-sourced text.
                #
                # A line is considered "wrapped" (soft) when it ends within a
                # small tolerance of the page's right content margin. Lines
                # ending short are treated as intentional hard breaks.
                parts: list[str] = []
                WRAP_TOLERANCE = max(6.0, (page_right - page_left) * 0.02)
                for i, line in enumerate(kept_lines):
                    line_text = "".join(
                        s.get("text", "") for s in line.get("spans", []) if s.get("text")
                    ).rstrip()
                    if not line_text:
                        continue
                    parts.append(line_text)

                    is_last = (i == len(kept_lines) - 1)
                    if is_last:
                        continue

                    lb = line.get("bbox")
                    wraps = False
                    if lb:
                        line_end_x = float(lb[2])
                        wraps = abs(line_end_x - page_right) <= WRAP_TOLERANCE

                    parts.append(" " if wraps else "<br>")

                if not parts:
                    continue

                joined = "".join(parts)
                escaped = _escape_html(joined)
                style_attr = f' style="text-align:{align}"' if align != "left" else ""
                html_parts.append(f"<p{style_attr}>{escaped}</p>")
    finally:
        try:
            doc.close()
        except Exception:
            pass

    if not html_parts:
        print("[pdf_to_html] dict mode produced no paragraphs")
        return "<p><br></p>"

    print(f"[pdf_to_html] PyMuPDF dict mode — {len(html_parts)} paragraph(s)")
    return "".join(html_parts)
    
def extract_pdf_header_footer_images(contents: bytes):
    """
    Render the top 12% of page 1 as the header image and the bottom 10% of
    the last page as the footer image.

    Requires PyMuPDF (fitz) for rendering. If PyMuPDF is not installed, this
    returns (None, None) rather than raising — the backfill path proceeds
    with content_html only, and the editor simply renders without letterhead.
    """
    try:
        import fitz  # noqa: F401  — import guard
    except ImportError:
        print("[extract_pdf_header_footer_images] PyMuPDF not installed — skipping header/footer extraction")
        return None, None

    header_png = None
    footer_png = None
    try:
        doc = fitz.open(stream=contents, filetype="pdf")
        if len(doc) > 0:
            first = doc.load_page(0)
            r = first.rect
            header_clip = fitz.Rect(r.x0, r.y0, r.x1, r.y0 + r.height * 0.12)
            header_png = first.get_pixmap(clip=header_clip, dpi=150).tobytes("png")

            last = doc.load_page(len(doc) - 1)
            rl = last.rect
            footer_clip = fitz.Rect(rl.x0, rl.y1 - rl.height * 0.10, rl.x1, rl.y1)
            footer_png = last.get_pixmap(clip=footer_clip, dpi=150).tobytes("png")
        doc.close()
    except Exception as e:
        print(f"[extract_pdf_header_footer_images] warning: {e}")
    return header_png, footer_png

def _upload_asset_to_storage(asset_bytes: bytes, prefix: str) -> str | None:
    """Upload a PNG blob and return its durable private-bucket object path."""
    if not asset_bytes:
        return None
    try:
        path = f"{prefix}_{int(time.time())}_{os.urandom(4).hex()}.png"
        supabase.storage.from_("documents").upload(
            file=asset_bytes, path=path, file_options={"content-type": "image/png"}
        )
        return path
    except Exception as e:
        print(f"[_upload_asset_to_storage] warning: {e}")
        return None


# ─────────────────────────────────────────────────────────────────────────────
# REPOSITORY HELPER FUNCTIONS
# ─────────────────────────────────────────────────────────────────────────────
# These three helpers are consumed by the document endpoints below:
#   • _merge_metadata_across_chunks   → get_documents(), get_document_content()
#   • _backfill_content_html          → get_document_content() (lazy backfill)
#   • _fetch_url_bytes                → _backfill_content_html() (download binary)
# They must be defined before ANY of those endpoints are declared.
# ─────────────────────────────────────────────────────────────────────────────

def _fetch_url_bytes(url: str) -> bytes | None:
    """
    Download the raw bytes at `url`.

    Supabase Storage sits behind Cloudflare, which returns HTTP 403 for
    requests using Python's default `Python-urllib/x.y` User-Agent. To
    avoid the block we:

      1. Prefer Supabase's own storage client, extracting the object path
         from the public URL. This sends proper auth headers + a UA that
         Cloudflare accepts.
      2. Fall back to urllib but with an explicit browser-like User-Agent.

    Returns None on any failure.
    """
    if not url:
        return None

    # ── Path 1: Supabase storage client (preferred) ──────────────────────
    # Stored values may be durable paths or legacy public/signed URLs.
    try:
        object_path = get_private_storage_path(url)
        if object_path:
            blob = supabase.storage.from_("documents").download(object_path)
            if blob:
                print(f"[_fetch_url_bytes] ✓ supabase client fetched {object_path} ({len(blob)} bytes)")
                return blob
    except Exception as e:
        print(f"[_fetch_url_bytes] supabase client failed for {url}: {e}")

    # ── Path 2: urllib with browser-like UA (fallback) ───────────────────
    try:
        req = urllib.request.Request(
            url,
            headers={
                "User-Agent": (
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/120.0.0.0 Safari/537.36"
                ),
                "Accept": "*/*",
            },
        )
        with urllib.request.urlopen(req, timeout=30) as resp:
            blob = resp.read()
            print(f"[_fetch_url_bytes] ✓ urllib fetched {url} ({len(blob)} bytes)")
            return blob
    except Exception as e:
        print(f"[_fetch_url_bytes] urllib failed for {url}: {e}")
        return None


def _merge_metadata_across_chunks(rows: list) -> dict:
    """
    document_sections is a CHUNKED table: one document = N rows, one per
    embedding chunk. Different chunks may carry different metadata keys —
    e.g., `content_html` is only guaranteed to be on the chunk that was
    written by the ingestion path that had it, and older / versioned rows
    may be missing the field entirely.

    This helper merges all chunk rows for a single logical document into
    one metadata dict, preferring the FIRST NON-EMPTY value for each key.

    The input rows must already be ordered deterministically (e.g. by id
    ascending). Callers are responsible for the ordering — this function
    is otherwise pure.
    """
    merged: dict = {}
    for row in rows or []:
        meta = row.get("metadata", {})
        if isinstance(meta, str):
            try:    meta = json.loads(meta)
            except: meta = {}
        for key, val in meta.items():
            if key in merged:
                existing = merged[key]
                # Keep an already-good value; only overwrite empties.
                if existing not in (None, "", [], {}):
                    continue
            merged[key] = val
    return merged


def _backfill_content_html(meta: dict) -> dict | None:
    """
    Lazy backfill for legacy documents uploaded before the editor-facing
    representation existed (or that went through a code path that dropped
    it — see upload_new_version). Downloads the original binary from its
    Supabase Storage `file_url`, runs the structure-preserving converter,
    uploads any header/footer assets it discovers, and returns the fields
    to merge into the metadata row.

    Idempotent and safe to call repeatedly: returns None on any failure,
    letting the caller fall through to its normal empty-content_html path.
    """
    file_url = meta.get("file_url")
    if not file_url:
        print("[_backfill] no file_url in metadata")
        return None

    contents = _fetch_url_bytes(file_url)
    if not contents:
        print(f"[_backfill] could not download {file_url}")
        return None

    # Sniff extension from the URL path; strip any query string.
    filename = (file_url.split("/")[-1] or "").split("?")[0].lower()

    content_html = ""
    hdr_bytes = None
    ftr_bytes = None

    try:
        if filename.endswith(".docx"):
            content_html, hdr_bytes, ftr_bytes = docx_to_html_with_assets(contents)
        elif filename.endswith(".pdf"):
            content_html = pdf_to_html(contents)
            hdr_bytes, ftr_bytes = extract_pdf_header_footer_images(contents)
        elif filename.endswith((".png", ".jpg", ".jpeg")):
            b64 = base64.b64encode(contents).decode("ascii")
            mime = "image/png" if filename.endswith(".png") else "image/jpeg"
            content_html = f'<p><img src="data:{mime};base64,{b64}" /></p>'
        elif filename.endswith((".txt", ".html")):
            text = contents.decode("utf-8", errors="ignore")
            if filename.endswith(".html"):
                content_html = text
            else:
                escaped = _escape_html(text)
                content_html = "".join(
                    f"<p>{line}</p>" if line.strip() else "<p><br></p>"
                    for line in escaped.split("\n")
                )
        else:
            print(f"[_backfill] unsupported extension: {filename}")
            return None
    except Exception as e:
        print(f"[_backfill] conversion error for {filename}: {e}")
        return None

    if not content_html or not content_html.strip():
        print(f"[_backfill] converter returned empty for {filename}")
        return None

    header_url = _upload_asset_to_storage(hdr_bytes, prefix="backfill_header")
    footer_url = _upload_asset_to_storage(ftr_bytes, prefix="backfill_footer")

    print(f"[_backfill] ✓ generated content_html for '{meta.get('name')}' ({len(content_html)} chars)")
    return {
        "content_html":     content_html,
        "header_image_url": header_url,
        "footer_image_url": footer_url,
        "page_size":        meta.get("page_size",  "short"),
        "line_spacing":     meta.get("line_spacing", "1.5"),
    }

import base64
import urllib.request


@app.get("/documents/{document_name}/content")
def get_document_content(
    document_name: str,
    current_user: models.User = Depends(get_current_user),
):
    """
    Returns the structure-preserving HTML representation + header/footer
    asset URLs for a single document, for the editor's loadHtmlIntoPreview()
    path.

    Fetches ALL chunk rows for the document name (ordered by id ascending),
    merges their metadata preferring first non-empty value per key, and only
    then reads `content_html`. This eliminates the previous nondeterministic
    `.limit(1)` behavior that could pick a chunk row missing the payload
    even when another chunk row had it.

    If, after merging, content_html is still empty, a lazy backfill is
    attempted from the stored `file_url` binary. On success the enriched
    metadata is persisted back to every chunk row for the document.
    """
    try:
        res = (
            supabase.table("document_sections")
            .select("metadata, id")
            .eq("metadata->>name", document_name)
            .order("id", desc=True)
            .execute()
        )
        if not res.data:
            res = (
                supabase.table("document_sections")
                .select("metadata, id")
                .ilike("metadata->>name", f"%{document_name.strip()}%")
                .order("id", desc=True)
                .execute()
            )
        if not res.data:
            raise HTTPException(status_code=404, detail="Document not found")

        # Parse metadata and filter out Archived chunks if Active chunks exist
        parsed_rows = []
        import json
        for r in res.data:
            meta = r.get("metadata", {})
            if isinstance(meta, str):
                try: meta = json.loads(meta)
                except: meta = {}
            if not can_read_document(current_user, meta):
                continue
            r["metadata"] = meta
            parsed_rows.append(r)
            
        if not parsed_rows:
            raise HTTPException(404, "Document not found or access is not permitted.")
        active_rows = [r for r in parsed_rows if r["metadata"].get("status") != "Archived"]
        target_rows = active_rows if active_rows else parsed_rows

        meta = _merge_metadata_across_chunks(target_rows)

        if meta.get("category") == "Forms / Templates" and str(meta.get("status") or "Active").lower() != "active" and not can_manage_templates(current_user):
            raise HTTPException(404, "Document not found")

        if current_user.role.upper() == "STUDENT" and is_student_hidden_category(meta.get("category")):
            raise HTTPException(status_code=404, detail="Document not found")

        # ── Lazy backfill for legacy / versioned rows ──────────────────────
        if not meta.get("content_html"):
            print(f"[get_document_content] backfilling '{document_name}' …")
            backfilled = _backfill_content_html(meta)
            if backfilled:
                meta.update(backfilled)
                try:
                    # Persist to every chunk row for this document. Every
                    # row receives the same merged + backfilled metadata,
                    # so future reads are stable regardless of which chunk
                    # a query lands on first.
                    supabase.table("document_sections") \
                        .update({"metadata": meta}) \
                        .eq("metadata->>name", document_name) \
                        .execute()
                    print(f"[get_document_content] persisted backfill for '{document_name}'")
                except Exception as e:
                    # Persistence failure is non-fatal — this request still
                    # returns the freshly-generated payload.
                    print(f"[get_document_content] persist warning: {e}")

        return {
            "name":             meta.get("name", document_name),
            "category":         meta.get("category", ""),
            "office":           meta.get("office", ""),
            "version":          meta.get("version", "1.0"),
            "effectivity_date": meta.get("effectivity_date", ""),
            "content_html":     meta.get("content_html", ""),
            "header_image_url": get_fresh_private_file_url(meta.get("header_image_url")) or None,
            "footer_image_url": get_fresh_private_file_url(meta.get("footer_image_url")) or None,
            "file_url":         get_fresh_private_file_url(
                meta.get("file_url"), meta.get("storage_path")
            ),
            "page_size":        meta.get("page_size", "short"),
            "line_spacing":     meta.get("line_spacing", "1.5"),
            "template_code":    meta.get("template_code"),
            "template_revision": meta.get("template_revision"),
            "orientation":      meta.get("orientation", "portrait"),
            "field_schema":     meta.get("field_schema"),
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"[get_document_content] error: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch document content")
# ─────────────────────────────────────────────────────────────────────────────
