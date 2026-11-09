from permissions import require_system_admin, role_of, permissions_for
import os
from typing import Optional
from fastapi import Request, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from supabase import create_client, Client
from dotenv import load_dotenv

import models
import schemas
import utils
from database import get_db

load_dotenv()

# Supabase Client Initialization
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
supabase: Optional[Client] = None

if SUPABASE_URL and SUPABASE_KEY:
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    except Exception as e:
        print(f"[Supabase Init Warning]: {e}")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login", auto_error=False)

def extract_token_from_request(request: Request, bearer_token: Optional[str] = None) -> Optional[str]:
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
    try:
        user = db.query(models.User).filter(models.User.email == email).first()
        if user:
            return user
    except Exception:
        pass
    if supabase:
        try:
            res = supabase.table("users").select("*").eq("email", email).execute()
            if res.data and len(res.data) > 0:
                from types import SimpleNamespace
                user_dict = dict(res.data[0])
                user_dict.setdefault("student_profile", None)
                user_dict.setdefault("administrative_office", "")
                user_dict.setdefault("is_iqa_auditor", False)
                return SimpleNamespace(**user_dict)
        except Exception:
            pass
    return None


def _load_effective_assignments(user, db: Session):
    """Attach normalized assignment records without trusting request/JWT metadata."""
    rows = []
    iso_processes = []
    try:
        assignments = db.query(models.UserAssignment).filter(
            models.UserAssignment.user_id == user.id,
            models.UserAssignment.is_active.is_(True),
        ).all()
        office_ids = {a.scope_id for a in assignments if a.scope_type in {"OFFICE", "COLLEGE"} and a.scope_id}
        program_ids = {a.scope_id for a in assignments if a.scope_type == "PROGRAM" and a.scope_id}
        units = {str(x.id): x for x in db.query(models.OrganizationalUnit).filter(models.OrganizationalUnit.id.in_(office_ids)).all()} if office_ids else {}
        programs = {str(x.id): x for x in db.query(models.AcademicProgram).filter(models.AcademicProgram.id.in_(program_ids)).all()} if program_ids else {}
        for assignment in assignments:
            scope = units.get(str(assignment.scope_id)) or programs.get(str(assignment.scope_id))
            rows.append({
                "id": str(assignment.id),
                "assignment_type": assignment.assignment_type,
                "scope_type": assignment.scope_type,
                "scope_id": str(assignment.scope_id) if assignment.scope_id else None,
                "scope_code": getattr(scope, "code", "ARGAO" if assignment.scope_type == "CAMPUS" else ""),
                "scope_name": getattr(scope, "name", "CTU Argao Campus" if assignment.scope_type == "CAMPUS" else ""),
                "is_primary": bool(assignment.is_primary),
                "is_active": bool(assignment.is_active),
            })
        office_scope_ids = {a.scope_id for a in assignments if a.scope_type == "OFFICE" and a.scope_id}
        if office_scope_ids:
            mapped_processes = db.query(models.ISOProcessGroup.id, models.ISOProcessGroup.name).join(
                models.ISOProcessUnitMapping,
                models.ISOProcessUnitMapping.process_group_id == models.ISOProcessGroup.id,
            ).filter(models.ISOProcessUnitMapping.organizational_unit_id.in_(office_scope_ids)).distinct().all()
            process_ids = [item[0] for item in mapped_processes]
            iso_processes = [item[1] for item in mapped_processes]
            iso_processes.extend(alias for (alias,) in db.query(models.ISOProcessAlias.alias).filter(models.ISOProcessAlias.process_group_id.in_(process_ids)).all())
    except Exception:
        if supabase:
            try:
                assignment_result = supabase.table("user_assignments").select("*").eq("user_id", str(user.id)).eq("is_active", True).execute()
                for assignment in assignment_result.data or []:
                    scope_code = "ARGAO" if assignment.get("scope_type") == "CAMPUS" else ""
                    scope_name = "CTU Argao Campus" if assignment.get("scope_type") == "CAMPUS" else ""
                    scope_id = assignment.get("scope_id")
                    table = "academic_programs" if assignment.get("scope_type") == "PROGRAM" else "organizational_units"
                    if scope_id and assignment.get("scope_type") != "CAMPUS":
                        scope_result = supabase.table(table).select("code,name").eq("id", scope_id).limit(1).execute()
                        if scope_result.data:
                            scope_code, scope_name = scope_result.data[0]["code"], scope_result.data[0]["name"]
                    rows.append({**assignment, "scope_code": scope_code, "scope_name": scope_name})
                office_scope_ids = [a.get("scope_id") for a in rows if a.get("scope_type") == "OFFICE" and a.get("scope_id")]
                if office_scope_ids:
                    mappings = supabase.table("iso_process_unit_mappings").select("process_group_id").in_("organizational_unit_id", office_scope_ids).execute()
                    process_ids = list({row["process_group_id"] for row in (mappings.data or [])})
                    if process_ids:
                        processes = supabase.table("iso_process_groups").select("name").in_("id", process_ids).execute()
                        iso_processes = [row["name"] for row in (processes.data or [])]
                        aliases = supabase.table("iso_process_aliases").select("alias").in_("process_group_id", process_ids).execute()
                        iso_processes.extend(row["alias"] for row in (aliases.data or []))
            except Exception:
                rows = []
    setattr(user, "_effective_assignments", rows if rows else None)
    setattr(user, "_accessible_iso_processes", iso_processes)
    return user

def get_current_user(
    request: Request,
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> models.User:
    """Enforces user authentication across Header and Cookie strategies with Supabase REST fallback."""
    extracted_token = extract_token_from_request(request, token)
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
    extracted_token = extract_token_from_request(request, token)
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


def get_current_faculty_or_admin(current_user: models.User = Depends(get_current_user)) -> models.User:
    """Compatibility dependency for authenticated campus personnel."""
    if role_of(current_user) not in {"PERSONNEL", "SYSTEM_ADMIN"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted to campus personnel."
        )
    return current_user


def get_current_survey_analyst(current_user: models.User = Depends(get_current_user)) -> models.User:
    if not permissions_for(current_user)["survey.analytics"]:
        raise HTTPException(status_code=403, detail="Survey Analytics permission is required.")
    return current_user
