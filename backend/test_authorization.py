"""Exercise actual route bodies without starting Ollama or connecting to production data."""
import ast
import inspect
import re
import unittest
import uuid
from datetime import datetime
from pathlib import Path
from types import SimpleNamespace as User
from typing import Optional, List
from unittest.mock import MagicMock
from urllib.parse import unquote, urlparse

from fastapi import FastAPI, Depends, HTTPException, Query, Body, File, Form, UploadFile, BackgroundTasks, status
from fastapi.testclient import TestClient
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session
import models
import schemas
import dependencies as auth_dependencies
from permissions import *


def user(role="PERSONNEL", office="Library Office", department="BSIT", **extra):
    account = User(role=role, administrative_office=office, department=department, email="head@example.edu", status="Active", is_iqa_auditor=False)
    account._accessible_iso_processes = {"Library Office": ["University Library"], "Human Resource and Management Office": ["HR & Records Management"]}.get(office, [])
    if role in {"SYSTEM_ADMIN", "STUDENT", "UNKNOWN"}:
        account._effective_assignments = []
        return account
    legacy_type = LEGACY_ROLE_ASSIGNMENTS.get(role)
    assignments = []
    if legacy_type in {"COLLEGE_DEAN", "COLLEGE_SECRETARY"}:
        assignments.append({"assignment_type": legacy_type, "scope_type": "COLLEGE", "scope_code": department, "scope_name": department})
    elif legacy_type in {"PROGRAM_CHAIR", "FACULTY_MEMBER"}:
        if department:
            assignments.append({"assignment_type": legacy_type, "scope_type": "PROGRAM", "scope_code": department, "scope_name": department})
    elif legacy_type == "DOCUMENT_CONTROLLER":
        assignments.append({"assignment_type": legacy_type, "scope_type": "CAMPUS", "scope_code": "ARGAO", "scope_name": "CTU Argao Campus"})
    else:
        if office:
            assignments.append({"assignment_type": legacy_type or "OFFICE_HEAD", "scope_type": "OFFICE", "scope_code": office, "scope_name": office})
        if department in PROGRAM_COLLEGES:
            assignments.append({"assignment_type": "FACULTY_MEMBER", "scope_type": "PROGRAM", "scope_code": department, "scope_name": department})
    if extra.get("auditor"):
        assignments.append({"assignment_type": "IQA_AUDITOR", "scope_type": "CAMPUS", "scope_code": "ARGAO", "scope_name": "CTU Argao Campus"})
    account._effective_assignments = assignments
    return account


def office_iqa(office="DOI Office", programs=None):
    account = user(office=None, department=None)
    account._effective_assignments = [{
        "assignment_type": "IQA_AUDITOR",
        "scope_type": "OFFICE",
        "scope_code": office,
        "scope_name": office,
    }]
    for program in programs or []:
        account._effective_assignments.append({
            "assignment_type": "FACULTY_MEMBER",
            "scope_type": "PROGRAM",
            "scope_code": program,
            "scope_name": program,
        })
    account._accessible_iso_processes = ["Academic Affairs", "Educational Delivery Processes"] if office == "DOI Office" else []
    return account


def document_controller():
    account = user("PERSONNEL", office=None, department=None)
    account._effective_assignments = [{
        "assignment_type": "DOCUMENT_CONTROLLER",
        "scope_type": "CAMPUS",
        "scope_code": "ARGAO",
        "scope_name": "CTU Argao Campus",
        "is_primary": True,
    }]
    return account


def assigned_personnel(assignment_type, scope_type, scope_code, scope_name=None):
    account = user("PERSONNEL", office=None, department=None)
    account._effective_assignments = [{
        "assignment_type": assignment_type,
        "scope_type": scope_type,
        "scope_code": scope_code,
        "scope_name": scope_name or scope_code,
        "is_primary": True,
    }]
    return account


def load_routes():
    tree = ast.parse(Path(__file__).with_name("main.py").read_text(encoding="utf-8"))
    names = {
        "get_current_admin", "get_governance_reader", "get_accreditation_reader", "get_governance_manager",
        "get_governance_reviewer", "get_campus_governance_reviewer",
        "get_current_faculty_or_admin", "get_document_manager", "require_document_office", "require_document_name_access",
        "protect_last_system_admin", "get_auth_profile", "register_user", "get_iso_requirements",
        "create_iso_requirement", "update_iso_requirement", "delete_iso_requirement", "upload_iso_evidence",
        "update_iso_evidence_status", "update_iso_status", "delete_iso_evidence",
        "get_pending_iso_evidences", "get_pending_accreditation", "review_accreditation",
        "get_qms_action_plans", "create_qms_action_plan", "update_qms_action_plan",
        "delete_qms_action_plan", "delete_qms_evidence", "upload_qms_action_plan_evidence",
        "car_office", "get_car_forms", "create_car_form", "update_car_form", "delete_car_form",
        "get_ched_evidence_access_url", "upload_ched_evidence", "update_ched_status", "update_ched_evidence_status", "delete_ched_evidence",
        "_paper_trail_visible", "_paper_trail_user_offices", "_paper_trail_origin_office",
        "_paper_trail_is_current_custodian", "_require_paper_trail_custody",
        "get_current_document_controller", "get_paper_trail_detail",
        "get_private_storage_path", "require_private_storage_reference",
        "resolve_accreditation_cycle", "load_aaccup_evidence_chunks", "require_active_aaccup_evidence",
        "normalize_document_identity", "document_scope_key", "_safe_duplicate_record",
        "classify_document_duplicate", "duplicate_http_exception",
        "PersonnelAssignmentRequest", "UserCreateRequest", "UserUpdateRequest", "ISOEvidenceReviewRequest", "AccreditationReviewRequest",
    }
    nodes = []
    for node in tree.body:
        if getattr(node, "name", None) in names:
            node.decorator_list = []
            nodes.append(node)
    ns = dict(globals(), get_current_user=lambda: None, get_db=lambda: None,
              get_current_paper_trail_reader=lambda: None, _DB_IS_AVAILABLE=True, supabase=MagicMock(),
              get_fresh_private_file_url=lambda value=None, storage_path=None: storage_path or value or "",
              serialize_iso_requirement=lambda record: record,
              serialize_qms_action_plan=lambda record: record,
              serialize_paper_trail_record=lambda record: record,
              serialize_program_accreditation=lambda record: record)
    exec(compile(ast.Module(body=nodes, type_ignores=[]), "actual_main_routes", "exec"), ns)
    return ns


class AuthorizationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.routes = load_routes()

    def db_for(self, record):
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = record
        return db

    def denied(self, callback, code=403):
        with self.assertRaises(HTTPException) as raised:
            callback()
        self.assertEqual(raised.exception.status_code, code)

    def test_system_admin_has_every_capability(self):
        self.assertTrue(permissions_for(user("SYSTEM_ADMIN"))["system.manage"])
        self.assertTrue(permissions_for(user("SYSTEM_ADMIN"))["governance.review"])
        self.assertTrue(permissions_for(user("SYSTEM_ADMIN"))["governance.cross_office"])
        self.assertTrue(permissions_for(user("SYSTEM_ADMIN"))["paper_trail.control"])
        require_office(user("SYSTEM_ADMIN", office=None), "Registrar")
        require_program(user("SYSTEM_ADMIN", office=None), "BSTM")
        for role in ["OFFICE_HEAD", "FACULTY", "STUDENT", "DOCUMENT_CONTROLLER", "ADMIN", "UNKNOWN"]:
            self.denied(lambda: require_system_admin(user(role)))

    def test_every_base_role_and_assignment_has_the_expected_capabilities(self):
        capability_keys = set(permissions_for(user("SYSTEM_ADMIN")))
        self.assertTrue(all(permissions_for(user("SYSTEM_ADMIN")).values()))
        self.assertFalse(any(permissions_for(user("STUDENT")).values()))

        unassigned = permissions_for(user("PERSONNEL", office=None, department=None))
        self.assertEqual({key for key, enabled in unassigned.items() if enabled}, {"paper_trail.read"})

        expected = {
            ("OFFICE_HEAD", "OFFICE", "Library Office"): {
                "governance.access", "governance.manage", "documents.manage", "paper_trail.read", "survey.analytics",
            },
            ("OFFICE_MEMBER", "OFFICE", "Library Office"): {"governance.access", "paper_trail.read"},
            ("COLLEGE_DEAN", "COLLEGE", "COTE"): {
                "governance.access", "governance.manage", "documents.manage", "paper_trail.read",
            },
            ("COLLEGE_SECRETARY", "COLLEGE", "COTE"): {
                "governance.access", "documents.manage", "paper_trail.read",
            },
            ("PROGRAM_CHAIR", "PROGRAM", "BSIT"): {
                "governance.access", "governance.manage", "documents.manage", "paper_trail.read",
            },
            ("FACULTY_MEMBER", "PROGRAM", "BSIT"): {"governance.access", "paper_trail.read"},
            ("QA_HEAD", "CAMPUS", "ARGAO"): {
                "governance.access", "governance.review", "governance.manage", "governance.cross_office",
                "paper_trail.read", "survey.analytics", "survey.cross_office",
            },
            ("IQA_AUDITOR", "CAMPUS", "ARGAO"): {
                "governance.access", "governance.review", "governance.manage", "governance.cross_office",
                "paper_trail.read", "survey.analytics", "survey.cross_office",
            },
            ("IQA_AUDITOR", "OFFICE", "DOI Office"): {
                "governance.access", "governance.review", "governance.manage", "paper_trail.read", "survey.analytics",
            },
            ("SURVEY_ANALYST", "CAMPUS", "ARGAO"): {
                "paper_trail.read", "survey.analytics", "survey.cross_office",
            },
            ("SURVEY_ANALYST", "OFFICE", "Library Office"): {"paper_trail.read", "survey.analytics"},
            ("DOCUMENT_CONTROLLER", "CAMPUS", "ARGAO"): {"paper_trail.read", "paper_trail.control"},
        }
        for assignment, enabled in expected.items():
            with self.subTest(assignment=assignment):
                actual = permissions_for(assigned_personnel(*assignment))
                self.assertEqual(set(actual), capability_keys)
                self.assertEqual({key for key, value in actual.items() if value}, enabled)

    def test_survey_analytics_respects_office_and_campus_assignments(self):
        records = [
            User(office_visited="Library Office"),
            User(office_visited="Registrar's Office"),
            User(office_visited="DOI Office"),
        ]
        office_head = assigned_personnel("OFFICE_HEAD", "OFFICE", "Library Office")
        office_analyst = assigned_personnel("SURVEY_ANALYST", "OFFICE", "Registrar's Office")
        campus_analyst = assigned_personnel("SURVEY_ANALYST", "CAMPUS", "ARGAO")
        self.assertEqual([row.office_visited for row in filter_survey_records(office_head, records)], ["Library Office"])
        self.assertEqual([row.office_visited for row in filter_survey_records(office_analyst, records)], ["Registrar's Office"])
        self.assertEqual(filter_survey_records(campus_analyst, records), records)

    def test_real_auth_dependency_denies_anonymous_and_invalid_tokens(self):
        app = FastAPI()
        guard = auth_dependencies.get_current_user
        db_dependency = inspect.signature(guard).parameters["db"].default.dependency
        app.dependency_overrides[db_dependency] = lambda: MagicMock()

        @app.get("/protected")
        def protected(current_user=Depends(guard)):
            return {"email": current_user.email}

        client = TestClient(app)
        self.assertEqual(client.get("/protected").status_code, 401)
        self.assertEqual(client.get("/protected", headers={"Authorization": "Bearer invalid"}).status_code, 401)

    def test_private_storage_paths_accept_only_documents_bucket_references(self):
        extract = self.routes["get_private_storage_path"]
        require = self.routes["require_private_storage_reference"]
        self.assertEqual(extract("evidence/BSIT/report.pdf"), "evidence/BSIT/report.pdf")
        self.assertEqual(
            extract("https://project.supabase.co/storage/v1/object/sign/documents/evidence/BSIT/report.pdf?token=secret"),
            "evidence/BSIT/report.pdf",
        )
        self.assertEqual(
            extract("https://project.supabase.co/storage/v1/object/public/documents/folder/My%20File.pdf"),
            "folder/My File.pdf",
        )
        for invalid in ("../secret.pdf", "folder/../secret.pdf", "https://example.com/file.pdf", ""):
            with self.subTest(invalid=invalid):
                self.assertEqual(extract(invalid), "")
        self.assertEqual(require(storage_path="folder/file.pdf"), "folder/file.pdf")
        self.denied(lambda: require(value="https://example.com/file.pdf"), code=400)

    def test_duplicate_classifier_uses_hash_name_and_repository_scope(self):
        class FakeQuery:
            def __init__(self, rows):
                self.rows = rows
                self.filters = []

            def select(self, *_args): return self
            def eq(self, field, value): self.filters.append(("eq", field, value)); return self
            def neq(self, field, value): self.filters.append(("neq", field, value)); return self
            def order(self, *_args, **_kwargs): return self
            def limit(self, *_args): return self

            def execute(self):
                rows = list(self.rows)
                for operation, field, expected in self.filters:
                    if operation == "eq":
                        rows = [row for row in rows if row.get(field) == expected]
                    else:
                        rows = [row for row in rows if row.get(field) != expected]
                return User(data=rows)

        class FakeSupabase:
            def __init__(self, rows): self.rows = rows
            def table(self, name):
                self.assert_table = name
                return FakeQuery(self.rows)

        classify = self.routes["classify_document_duplicate"]
        scope = self.routes["document_scope_key"]("Library Office", "GLOBAL")
        base = {
            "id": "1", "file_sha256": "a" * 64, "document_name": "Handbook",
            "normalized_name": "handbook", "original_filename": "handbook.pdf",
            "office": "Library Office", "program": "GLOBAL", "version": "1.0",
            "status": "ACTIVE", "scope_key": scope, "created_at": "2026-01-01T00:00:00Z",
        }
        original_supabase = self.routes["supabase"]
        try:
            self.routes["supabase"] = FakeSupabase([base])
            self.assertEqual(classify("a" * 64, "Renamed copy", "Library Office", "GLOBAL")["code"], "EXACT_DUPLICATE")
            self.assertEqual(classify("b" * 64, "Handbook", "Library Office", "GLOBAL")["code"], "POSSIBLE_NEW_VERSION")

            cross_scope = {**base, "scope_key": self.routes["document_scope_key"]("Registrar's Office", "GLOBAL"), "office": "Registrar's Office"}
            self.routes["supabase"] = FakeSupabase([cross_scope])
            self.assertEqual(classify("a" * 64, "Different name", "Library Office", "GLOBAL")["code"], "CROSS_SCOPE_DUPLICATE")

            self.routes["supabase"] = FakeSupabase([])
            self.assertEqual(classify("c" * 64, "New policy", "Library Office", "GLOBAL")["code"], "NEW_DOCUMENT")
        finally:
            self.routes["supabase"] = original_supabase

    def test_duplicate_registry_is_race_safe_and_private(self):
        project = Path(__file__).parents[1]
        migration = (project / "supabase" / "20261108_document_upload_registry.sql").read_text(encoding="utf-8")
        frontend = (project / "src" / "app" / "pages" / "KnowledgeRepository.tsx").read_text(encoding="utf-8")
        queue = (project / "src" / "app" / "contexts" / "UploadQueueContext.tsx").read_text(encoding="utf-8")
        self.assertIn("create unique index if not exists uq_document_uploads_hash_scope", migration.lower())
        self.assertIn("where status <> 'FAILED'", migration)
        self.assertIn("alter table public.document_uploads enable row level security", migration.lower())
        self.assertIn("revoke all on table public.document_uploads from anon, authenticated", migration.lower())
        self.assertIn('crypto.subtle.digest("SHA-256"', frontend)
        self.assertIn('"/documents/check-duplicate"', frontend)
        self.assertIn('"/documents/check-duplicate-file"', frontend)
        self.assertIn("Continue as new version", frontend)
        self.assertIn('detail?.message || "The document upload failed."', queue)

    def test_auth_profile_returns_authoritative_display_name(self):
        account = user("FACULTY")
        account.full_name = "Updated Faculty Name"
        account.created_by_admin = True
        account.email_changed = False
        profile = self.routes["get_auth_profile"](account)
        self.assertEqual(profile["full_name"], "Updated Faculty Name")
        self.assertTrue(profile["created_by_admin"])

    def test_review_requires_explicit_assignment(self):
        for role in ["OFFICE_HEAD", "FACULTY", "COLLEGE_DEAN", "PROGRAM_CHAIR", "COLLEGE_SECRETARY"]:
            self.denied(lambda: require_reviewer(user(role)))
        require_reviewer(user(auditor=True))
        self.denied(lambda: require_reviewer(user(office="Quality Assurance & Management (QAU)")))
        self.assertFalse(is_reviewer(user("STUDENT", auditor=True)))

    def test_office_iqa_review_scope_does_not_expand_to_the_campus(self):
        auditor = office_iqa()

        self.assertTrue(is_reviewer(auditor))
        self.assertFalse(is_campus_reviewer(auditor))
        require_office(auditor, "DOI Office")
        require_office(auditor, "Academic Affairs")
        self.denied(lambda: require_office(auditor, "HR & Records Management"))
        self.assertEqual(accessible_programs(auditor), [])
        self.assertTrue(permissions_for(auditor)["governance.review"])
        self.assertFalse(permissions_for(auditor)["governance.cross_office"])
        self.assertFalse(permissions_for(auditor)["survey.cross_office"])

    def test_global_governance_configuration_requires_campus_reviewer(self):
        self.denied(lambda: require_campus_reviewer(office_iqa()))
        require_campus_reviewer(user(office=None, department=None, auditor=True))
        require_campus_reviewer(user("SYSTEM_ADMIN", office=None, department=None))

    def test_campus_iqa_reviewer_keeps_campus_wide_scope(self):
        auditor = user(office=None, department=None, auditor=True)

        self.assertTrue(is_campus_reviewer(auditor))
        require_office(auditor, "HR & Records Management")
        self.assertEqual(set(accessible_programs(auditor)), set(PROGRAM_COLLEGES))
        self.assertTrue(permissions_for(auditor)["governance.cross_office"])
        self.assertTrue(permissions_for(auditor)["survey.cross_office"])

    def test_office_iqa_can_combine_only_explicit_academic_scope(self):
        auditor = office_iqa(programs=["BSIT"])

        self.assertEqual(accessible_programs(auditor), ["BSIT"])
        self.denied(lambda: require_program(auditor, "BSHM"))

    def test_office_aliases_are_exact_and_missing_assignment_denied(self):
        require_office(user(), "Library Office")
        require_office(user(), "University Library")
        for office in [None, "", "all", "Library", "Registrar", "Library Office Annex"]:
            self.denied(lambda: require_office(user(), office))
        self.denied(lambda: require_office(user(office=None), None))

    def test_multiple_assignments_combine_permissions_without_changing_base_role(self):
        account = user()
        account._effective_assignments.extend([
            {"assignment_type": "PROGRAM_CHAIR", "scope_type": "PROGRAM", "scope_code": "BSHM", "scope_name": "BSHM"},
            {"assignment_type": "SURVEY_ANALYST", "scope_type": "CAMPUS", "scope_code": "ARGAO", "scope_name": "CTU Argao Campus"},
        ])
        self.assertEqual(role_of(account), "PERSONNEL")
        self.assertTrue(can_access_program(account, "BSHM"))
        self.assertTrue(permissions_for(account)["governance.manage"])
        self.assertTrue(permissions_for(account)["survey.cross_office"])

    def test_office_member_cannot_manage_documents_or_governance(self):
        account = user(office="Library Office", department=None)
        account._effective_assignments[0]["assignment_type"] = "OFFICE_MEMBER"
        self.assertTrue(can_access_office(account, "Library Office"))
        self.assertFalse(permissions_for(account)["documents.manage"])
        self.assertFalse(permissions_for(account)["governance.manage"])

    def test_program_scope(self):
        require_program(user(), "BSIT")
        self.denied(lambda: require_program(user(), "BSHM"))
        self.denied(lambda: require_program(user("STUDENT"), "BSIT"))
        unassigned_head = user("OFFICE_HEAD", department=None)
        self.assertEqual(accessible_programs(unassigned_head), [])
        self.denied(lambda: require_program(unassigned_head, "BSIT"))
        self.assertFalse(can_read_document(unassigned_head, {"category": "Accreditation Evidence", "program": "BSIT", "office": "University Library"}))
        self.assertFalse(can_manage_document(unassigned_head, {"category": "Accreditation Evidence", "program": "BSIT", "office": "University Library"}))

    def test_academic_leadership_scope(self):
        dean = user("COLLEGE_DEAN", department="College of Technology and Engineering (COTE)")
        require_program(dean, "BSIT")
        require_program(dean, "BIT_ET")
        self.denied(lambda: require_program(dean, "BSTM"))

        secretary = user("COLLEGE_SECRETARY", department=dean.department)
        require_program(secretary, "BSIE")
        self.assertTrue(permissions_for(secretary)["documents.manage"])
        self.assertFalse(permissions_for(secretary)["governance.manage"])
        self.assertFalse(permissions_for(secretary)["system.manage"])

        chair = user("PROGRAM_CHAIR", department="BSHM")
        require_program(chair, "BSHM")
        self.denied(lambda: require_program(chair, "BSTM"))

    def test_rag_and_repository_share_evidence_scope(self):
        self.assertTrue(can_read_document(user(), {"category": "Policy"}))
        self.assertFalse(can_read_document(user(), {"category": "CHED Evidence", "program": "BSHM"}))
        self.assertFalse(can_read_document(user(), {"category": "Accreditation Evidence", "iso_clause": "7.1", "office": "Registrar"}))
        self.assertFalse(can_read_document(None, {"category": "CHED Evidence", "program": "BSIT"}))

    def test_explicit_repository_scope_controls_read_and_manage_access(self):
        office_head = user(office="Library Office", department=None)
        program_chair = user("PROGRAM_CHAIR", office=None, department="BSIT")
        campus_document = {"scope_type": "CAMPUS", "scope_code": "ARGAO", "category": "Policy"}
        office_document = {"scope_type": "OFFICE", "scope_code": "Library Office", "category": "Policy"}
        program_document = {"scope_type": "PROGRAM", "scope_code": "BSIT", "category": "Policy"}

        self.assertTrue(can_read_document(user("STUDENT"), campus_document))
        self.assertFalse(can_manage_document(office_head, campus_document))
        self.assertTrue(can_read_document(office_head, office_document))
        self.assertTrue(can_manage_document(office_head, office_document))
        self.assertFalse(can_read_document(program_chair, office_document))
        self.assertTrue(can_read_document(program_chair, program_document))
        self.assertTrue(can_manage_document(program_chair, program_document))
        self.assertFalse(can_read_document(office_head, program_document))

    def test_iso_create_and_update_check_destination_office(self):
        payload = schemas.ISORequirementCreate(program="GLOBAL", iso_clause="7.1", title="T", description="D", auditee_office="Registrar")
        db = self.db_for(User(auditee_office="University Library"))
        self.denied(lambda: self.routes["create_iso_requirement"](payload, db, user()))
        self.denied(lambda: self.routes["update_iso_requirement"]("id", payload, db, user()))
        db.commit.assert_not_called()

    def test_iso_mutation_cannot_target_another_office(self):
        db = self.db_for(User(auditee_office="Registrar"))
        self.denied(lambda: self.routes["delete_iso_requirement"]("id", db, user()))
        db.delete.assert_not_called()

    def test_iso_approval_blocked_for_unassigned_non_reviewers(self):
        for role in ["FACULTY", "OFFICE_HEAD", "COLLEGE_DEAN", "PROGRAM_CHAIR", "COLLEGE_SECRETARY"]:
            db = MagicMock()
            self.denied(lambda: self.routes["update_iso_evidence_status"]("id", User(status="Approved", feedback=""), db, user(role)))
            self.denied(lambda: self.routes["update_iso_status"]("id", schemas.ISOStatusUpdate(status="Compliant"), db, user(role)))
            db.query.assert_not_called()

    def test_aaccup_pending_queue_filters_program_scope(self):
        cycle_id = uuid.uuid4()
        backend = MagicMock()
        backend.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value.data = [
            {"metadata": {"accreditation_evidence_id": str(uuid.uuid4()), "accreditation_cycle_id": str(cycle_id), "name": "BSIT Evidence", "category": "Accreditation Evidence", "status": "Pending", "program": "BSIT"}},
            {"metadata": {"accreditation_evidence_id": str(uuid.uuid4()), "accreditation_cycle_id": str(cycle_id), "name": "BSHM Evidence", "category": "Accreditation Evidence", "status": "Pending", "program": "BSHM"}},
        ]
        self.routes["get_pending_accreditation"].__globals__["supabase"] = backend
        db = MagicMock()
        db.query.return_value.filter.return_value.all.return_value = [User(id=cycle_id)]

        result = self.routes["get_pending_accreditation"](db, office_iqa(programs=["BSIT"]))

        self.assertEqual([item["name"] for item in result], ["BSIT Evidence"])

    def test_aaccup_review_checks_every_matching_chunk_before_update(self):
        evidence_id = uuid.uuid4()
        chunks = [{"id": 1, "metadata": {
            "accreditation_evidence_id": str(evidence_id),
            "accreditation_cycle_id": str(uuid.uuid4()),
            "name": "Shared Name", "category": "Accreditation Evidence", "program": "BSHM",
        }}]
        self.routes["review_accreditation"].__globals__["load_aaccup_evidence_chunks"] = lambda _: chunks
        request = self.routes["AccreditationReviewRequest"](evidence_id=evidence_id, status="Approved", feedback="")
        backend = MagicMock()
        self.routes["review_accreditation"].__globals__["supabase"] = backend

        self.denied(lambda: self.routes["review_accreditation"](request, MagicMock(), office_iqa(programs=["BSIT"])))
        backend.table.return_value.update.assert_not_called()

    def test_ched_review_status_checks_parent_program(self):
        requirement = User(program="BSHM", status="Pending")
        db = self.db_for(requirement)
        self.denied(lambda: self.routes["update_ched_status"]("req", "Compliant", db, office_iqa(programs=["BSIT"])))
        db.commit.assert_not_called()

        evidence = User(requirement=User(program="BSHM"), status="Pending")
        db = self.db_for(evidence)
        self.denied(lambda: self.routes["update_ched_evidence_status"]("ev", "Approved", db, office_iqa(programs=["BSIT"])))
        db.commit.assert_not_called()

    def test_iso_pending_queue_filters_parent_office(self):
        allowed = User(id="allowed", status="Pending", requirement=User(auditee_office="Academic Affairs", iso_clause="7.1", title="Allowed", cycle_year="2026"), document_name="Allowed", file_url="", uploaded_by="u", admin_feedback="", upload_date=None, iso_requirement_id="r1")
        denied = User(id="denied", status="Pending", requirement=User(auditee_office="HR & Records Management", iso_clause="7.2", title="Denied", cycle_year="2026"), document_name="Denied", file_url="", uploaded_by="u", admin_feedback="", upload_date=None, iso_requirement_id="r2")
        db = MagicMock()
        db.query.return_value.filter.return_value.all.return_value = [allowed, denied]

        result = self.routes["get_pending_iso_evidences"](db, office_iqa())

        self.assertEqual([item["name"] for item in result], ["Allowed"])

    def test_iso_evidence_review_checks_parent_office_before_update(self):
        evidence = User(requirement=User(auditee_office="HR & Records Management"), status="Pending", admin_feedback="")
        db = self.db_for(evidence)
        payload = self.routes["ISOEvidenceReviewRequest"](status="Approved", feedback="Checked")

        self.denied(lambda: self.routes["update_iso_evidence_status"]("ev", payload, db, office_iqa()))
        self.assertEqual(evidence.status, "Pending")
        db.commit.assert_not_called()

    def test_qms_update_checks_old_and_new_office(self):
        db = self.db_for(User(auditee_office="Registrar"))
        self.denied(lambda: self.routes["update_qms_action_plan"]("id", schemas.QMSActionPlanUpdate(corrective_measure="Edit"), db, user()))
        db = self.db_for(User(auditee_office="University Library"))
        self.denied(lambda: self.routes["update_qms_action_plan"]("id", schemas.QMSActionPlanUpdate(auditee_office="Registrar"), db, user()))
        db.commit.assert_not_called()

    def test_qms_assessment_is_reviewer_only(self):
        db = self.db_for(User(auditee_office="University Library"))
        self.denied(lambda: self.routes["update_qms_action_plan"]("id", schemas.QMSActionPlanUpdate(assessment_notes="Verified"), db, user()))

    def test_qms_own_office_update_succeeds(self):
        record = User(auditee_office="Library Office", corrective_measure="Old")
        db = self.db_for(record)
        self.routes["update_qms_action_plan"]("id", schemas.QMSActionPlanUpdate(corrective_measure="New"), db, user())
        self.assertEqual(record.corrective_measure, "New")
        db.commit.assert_called_once()

    def test_unchanged_empty_assessment_fields_do_not_block_office_edits(self):
        record = User(auditee_office="Library Office", corrective_measure="Old", assessment_notes=None, assessment_date=None)
        db = self.db_for(record)
        self.routes["update_qms_action_plan"]("id", schemas.QMSActionPlanUpdate(corrective_measure="New", assessment_notes="", assessment_date=""), db, user())
        db.commit.assert_called_once()

    def test_iso_list_filters_both_database_and_rest_fallback(self):
        records = [User(auditee_office="Library Office"), User(auditee_office="Registrar")]
        db = MagicMock()
        db.query.return_value.filter.return_value.all.return_value = records
        handler = self.routes["get_iso_requirements"]
        self.assertEqual(handler("GLOBAL", "2026", db, user()), records[:1])
        db.query.side_effect = RuntimeError("Database unavailable")
        self.routes["supabase"].table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value.data = [vars(r) for r in records]
        self.assertEqual(handler("GLOBAL", "2026", db, user()), [vars(records[0])])

    def test_generic_repository_route_respects_program_scope(self):
        self.routes["supabase"].table.return_value.select.return_value.eq.return_value.execute.return_value.data = [{"metadata": {"category": "CHED Evidence", "program": "BSIT", "office": "University Library"}}]
        self.routes["require_document_name_access"](user(), "Evidence")
        self.routes["supabase"].table.return_value.select.return_value.eq.return_value.execute.return_value.data = [{"metadata": {"category": "CHED Evidence", "program": "BSHM", "office": "University Library"}}]
        self.denied(lambda: self.routes["require_document_name_access"](user(), "Other Evidence"))

    def test_student_cannot_modify_qms_even_if_office_matches(self):
        db = self.db_for(User(auditee_office="University Library"))
        self.denied(lambda: self.routes["update_qms_action_plan"]("id", schemas.QMSActionPlanUpdate(), db, user("STUDENT")))

    def test_qms_evidence_parent_scope(self):
        db = self.db_for(User(action_plan=User(auditee_office="Registrar")))
        self.denied(lambda: self.routes["delete_qms_evidence"]("id", db, user()))
        db.delete.assert_not_called()

    def test_ched_signed_link_checks_parent_scope(self):
        db = self.db_for(User(requirement=User(program="BSHM")))
        self.denied(lambda: self.routes["get_ched_evidence_access_url"]("id", db, user()))

    def test_car_scope_and_review_fields(self):
        db = self.db_for(User(iso_clause_id=None, area="Registrar"))
        self.denied(lambda: self.routes["update_car_form"]("id", schemas.CARFormUpdate(root_cause="x"), db, user()))
        db = self.db_for(User(iso_clause_id=None, area="Library Services"))
        self.denied(lambda: self.routes["update_car_form"]("id", schemas.CARFormUpdate(non_conformity_closed=True), db, user()))

    def test_paper_trail_direct_id_access_and_custody(self):
        record = User(sender_email="a@example.edu", recipient_email=None, office="Registrar", current_location="Registrar", origin_office="Finance", is_controlled_document=False, status="Received")
        db = self.db_for(record)
        self.denied(lambda: self.routes["get_paper_trail_detail"]("id", db, user()))
        self.assertFalse(self.routes["_paper_trail_is_current_custodian"](record, user(office="Reg")))
        self.assertTrue(self.routes["_paper_trail_visible"](record, user("DOCUMENT_CONTROLLER")))

    def test_paper_trail_combines_every_active_office_assignment(self):
        account = user(office="Library Office", department=None)
        account._effective_assignments.append({
            "assignment_type": "OFFICE_MEMBER",
            "scope_type": "OFFICE",
            "scope_code": "Registrar's Office",
            "scope_name": "Registrar's Office",
        })
        registrar_record = User(
            sender_email="sender@example.edu", recipient_email=None,
            office="Registrar's Office", current_location="Registrar's Office",
            origin_office="Accounting Office", is_controlled_document=False, status="Pending Receiving",
        )
        finance_record = User(
            sender_email="sender@example.edu", recipient_email=None,
            office="Budget / Finance Office", current_location="Budget / Finance Office",
            origin_office="Accounting Office", is_controlled_document=False, status="Pending Receiving",
        )

        self.assertEqual(
            self.routes["_paper_trail_user_offices"](account),
            ["Library Office", "Registrar's Office"],
        )
        self.assertTrue(self.routes["_paper_trail_visible"](registrar_record, account))
        self.assertTrue(self.routes["_paper_trail_is_current_custodian"](registrar_record, account))
        self.assertFalse(self.routes["_paper_trail_visible"](finance_record, account))
        self.assertFalse(self.routes["_paper_trail_is_current_custodian"](finance_record, account))

    def test_paper_trail_preserves_personal_and_controller_access(self):
        outside_record = User(
            sender_email="head@example.edu", recipient_email=None,
            office="Budget / Finance Office", current_location="Budget / Finance Office",
            origin_office="Accounting Office", is_controlled_document=False, status="Pending Receiving",
        )
        recipient_record = User(
            sender_email="sender@example.edu", recipient_email="head@example.edu",
            office="Budget / Finance Office", current_location="Budget / Finance Office",
            origin_office="Accounting Office", is_controlled_document=False, status="Pending Receiving",
        )

        self.assertTrue(self.routes["_paper_trail_visible"](outside_record, user(office=None, department=None)))
        self.assertTrue(self.routes["_paper_trail_visible"](recipient_record, user(office=None, department=None)))
        self.assertTrue(self.routes["_paper_trail_is_current_custodian"](recipient_record, user(office=None, department=None)))
        self.assertTrue(self.routes["_paper_trail_visible"](outside_record, user("DOCUMENT_CONTROLLER")))
        self.assertTrue(self.routes["_paper_trail_is_current_custodian"](outside_record, user("DOCUMENT_CONTROLLER")))

    def test_personnel_document_controller_has_intended_campus_control(self):
        controller = document_controller()
        record = User(
            sender_email="sender@example.edu", recipient_email=None,
            office="Registrar's Office", current_location="Registrar's Office",
            origin_office="Accounting Office", is_controlled_document=True,
            status="Pending Document Control",
        )

        self.assertEqual(role_of(controller), "PERSONNEL")
        self.assertTrue(permissions_for(controller)["paper_trail.read"])
        self.assertTrue(permissions_for(controller)["paper_trail.control"])
        self.assertIs(self.routes["get_current_document_controller"](controller), controller)
        self.assertTrue(self.routes["_paper_trail_visible"](record, controller))
        self.assertTrue(self.routes["_paper_trail_is_current_custodian"](record, controller))
        self.routes["_require_paper_trail_custody"](record, controller)
        self.assertEqual(self.routes["_paper_trail_origin_office"](controller), "Document Control Office")
        self.assertEqual(
            self.routes["_paper_trail_origin_office"](controller, "Registrar's Office"),
            "Registrar's Office",
        )

        administrator = user("SYSTEM_ADMIN", office=None)
        self.assertIs(self.routes["get_current_document_controller"](administrator), administrator)
        self.denied(lambda: self.routes["get_current_document_controller"](user("PERSONNEL")))

        frontend = (Path(__file__).parent.parent / "src" / "app" / "pages" / "PaperTrail.tsx").read_text(encoding="utf-8")
        self.assertIn('hasCapability("paper_trail.control")', frontend)
        self.assertIn("isDocumentController &&", frontend)

    def test_paper_trail_origin_must_be_an_active_assignment(self):
        account = user(office="Library Office", department=None)
        account._effective_assignments.append({
            "assignment_type": "OFFICE_HEAD", "scope_type": "OFFICE",
            "scope_code": "Research Office", "scope_name": "Research Office",
        })
        resolver = self.routes["_paper_trail_origin_office"]
        self.assertEqual(resolver(account, "Research Office"), "Research Office")
        self.denied(lambda: resolver(account, "Accounting Office"))
        self.denied(lambda: resolver(account), 400)
        self.denied(lambda: resolver(user(office=None, department=None)))

    def test_paper_trail_frontend_uses_effective_assignments(self):
        frontend = (
            Path(__file__).parent.parent / "src" / "app" / "pages" / "PaperTrail.tsx"
        ).read_text(encoding="utf-8")
        self.assertIn("const { userRole, assignments } = useRole()", frontend)
        self.assertIn('assignment.scope_type === "OFFICE"', frontend)
        self.assertNotIn('sessionStorage.getItem("userAdministrativeOffice")', frontend)
        self.assertNotIn("ISO_OFFICES_16", frontend)

    def test_paper_trail_list_does_not_accept_identity_filters(self):
        tree = ast.parse(Path(__file__).with_name("main.py").read_text(encoding="utf-8"))
        endpoint = next(
            node for node in tree.body
            if isinstance(node, ast.FunctionDef) and node.name == "get_paper_trail_records"
        )
        parameters = {argument.arg for argument in endpoint.args.args}
        self.assertNotIn("role", parameters)
        self.assertNotIn("email", parameters)

    def test_last_active_admin_guard(self):
        db = MagicMock()
        db.query.return_value.filter.return_value.order_by.return_value.with_for_update.return_value.all.return_value = [user("SYSTEM_ADMIN")]
        self.denied(lambda: self.routes["protect_last_system_admin"](db, user("SYSTEM_ADMIN")), 409)
        db.query.return_value.filter.return_value.order_by.return_value.with_for_update.return_value.all.return_value.append(user("SYSTEM_ADMIN"))
        self.routes["protect_last_system_admin"](db, user("SYSTEM_ADMIN"))

    def test_registration_rejects_privileged_inputs_before_database_access(self):
        for role, office, auditor in [("SYSTEM_ADMIN", None, False), ("ADMIN", None, False), ("COLLEGE_DEAN", None, False), ("PROGRAM_CHAIR", None, False), ("COLLEGE_SECRETARY", None, False), ("FACULTY", "Library", False), ("STUDENT", None, True)]:
            db = MagicMock()
            payload = schemas.UserCreate(email="new@example.edu", password="unused", full_name="Test", role=role, administrative_office=office, is_iqa_auditor=auditor)
            self.denied(lambda: self.routes["register_user"](payload, db))
            db.query.assert_not_called()

    def test_real_dependency_returns_http_403_for_office_head(self):
        app = FastAPI()
        guard = self.routes["get_current_admin"]
        auth_dependency = inspect.signature(guard).parameters["current_user"].default.dependency
        app.dependency_overrides[auth_dependency] = lambda: user()

        @app.get("/system-only")
        def restricted(admin=Depends(guard)):
            return {"ok": True}

        client = TestClient(app)
        self.assertEqual(client.get("/system-only").status_code, 403)
        app.dependency_overrides[auth_dependency] = lambda: user("SYSTEM_ADMIN")
        self.assertEqual(client.get("/system-only").status_code, 200)

    def test_governance_reader_requires_governance_assignment(self):
        guard = self.routes["get_governance_reader"]
        self.denied(lambda: guard(user("STUDENT")))
        self.denied(lambda: guard(user("PERSONNEL", office=None, department=None)))
        self.assertEqual(guard(user("PERSONNEL", office="Library Office")).email, "head@example.edu")

    def test_accreditation_reader_excludes_office_only_personnel(self):
        guard = self.routes["get_accreditation_reader"]
        self.denied(lambda: guard(user("STUDENT")))
        self.denied(lambda: guard(user("PERSONNEL", office="Library Office", department=None)))
        self.assertEqual(guard(user("FACULTY", office=None, department="BSIT")).email, "head@example.edu")
        self.assertEqual(guard(user("SYSTEM_ADMIN", office=None)).email, "head@example.edu")

    def test_announcement_routes_have_one_protected_implementation(self):
        backend = Path(__file__).parent
        main_tree = ast.parse((backend / "main.py").read_text(encoding="utf-8"))
        router_tree = ast.parse((backend / "routers" / "announcements.py").read_text(encoding="utf-8"))
        protected_paths = {
            "/announcements",
            "/users/counts",
            "/announcements/{announcement_id}",
            "/announcements/{announcement_id}/read",
        }

        def decorated_routes(tree, owner):
            routes = []
            for node in tree.body:
                if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                    continue
                for decorator in node.decorator_list:
                    if not isinstance(decorator, ast.Call) or not isinstance(decorator.func, ast.Attribute):
                        continue
                    if not isinstance(decorator.func.value, ast.Name) or decorator.func.value.id != owner:
                        continue
                    if decorator.args and isinstance(decorator.args[0], ast.Constant):
                        routes.append((decorator.func.attr, decorator.args[0].value, node))
            return routes

        self.assertEqual(
            [route for route in decorated_routes(main_tree, "app") if route[1] in protected_paths],
            [],
        )
        router_routes = [route for route in decorated_routes(router_tree, "router") if route[1] in protected_paths]
        self.assertEqual(
            [(method, path) for method, path, _ in router_routes],
            [
                ("post", "/announcements"),
                ("get", "/announcements"),
                ("get", "/users/counts"),
                ("put", "/announcements/{announcement_id}"),
                ("delete", "/announcements/{announcement_id}"),
                ("post", "/announcements/{announcement_id}/read"),
            ],
        )

        dependencies = {
            node.name: ast.unparse(node)
            for _, _, node in router_routes
        }
        for handler in ("create_announcement", "get_user_counts", "update_announcement", "delete_announcement"):
            self.assertIn("Depends(get_current_admin)", dependencies[handler])
        self.assertIn("Depends(get_current_user)", dependencies["get_announcements"])
        self.assertIn("Depends(get_current_user)", dependencies["mark_announcement_read"])

    def test_sensitive_backend_routes_use_the_required_server_side_guards(self):
        tree = ast.parse(Path(__file__).with_name("main.py").read_text(encoding="utf-8"))
        routes = {}
        for node in tree.body:
            if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                continue
            for decorator in node.decorator_list:
                if (
                    isinstance(decorator, ast.Call)
                    and isinstance(decorator.func, ast.Attribute)
                    and isinstance(decorator.func.value, ast.Name)
                    and decorator.func.value.id == "app"
                    and decorator.args
                    and isinstance(decorator.args[0], ast.Constant)
                ):
                    routes[(decorator.func.attr.upper(), decorator.args[0].value)] = ast.unparse(node)

        expected_guards = {
            ("GET", "/users"): "Depends(get_current_admin)",
            ("GET", "/settings"): "Depends(get_current_admin)",
            ("POST", "/ask-policy"): "Depends(get_current_user)",
            ("GET", "/documents/file-url"): "Depends(get_current_user)",
            ("GET", "/paper-trail"): "Depends(get_current_paper_trail_reader)",
            ("PUT", "/paper-trail/{record_id}/metadata"): "Depends(get_current_document_controller)",
            ("POST", "/admin/accreditation-review"): "Depends(get_governance_reviewer)",
            ("GET", "/audit/queries"): "Depends(get_current_admin)",
            ("POST", "/generate-document"): "Depends(get_current_faculty_or_admin)",
            ("GET", "/documents/{document_name}/content"): "Depends(get_current_user)",
            ("GET", "/iso/audit-cycles"): "Depends(get_governance_reader)",
            ("GET", "/iso/results"): "Depends(get_governance_reader)",
            ("POST", "/iso/results"): "Depends(get_campus_governance_reviewer)",
            ("PUT", "/iso/results/{result_id}"): "Depends(get_campus_governance_reviewer)",
            ("POST", "/iso/results/{result_id}/artifact/{artifact_type}"): "Depends(get_campus_governance_reviewer)",
            ("GET", "/iso/results/{result_id}/artifact/{artifact_type}/url"): "Depends(get_governance_reader)",
            ("POST", "/accreditation/program/{program_code}/upgrade"): "Depends(get_campus_governance_reviewer)",
            ("POST", "/accreditation/program/{program_code}/history-milestone"): "Depends(get_campus_governance_reviewer)",
            ("POST", "/accreditation/history/{history_id}/upload-certificate"): "Depends(get_campus_governance_reviewer)",
            ("GET", "/accreditation/program/{program_code}/cycles/{cycle_id}/evidence"): "Depends(get_current_faculty_or_admin)",
            ("GET", "/accreditation/evidence/{evidence_id}/access-url"): "Depends(get_current_faculty_or_admin)",
            ("DELETE", "/accreditation/evidence/{evidence_id}"): "Depends(get_current_faculty_or_admin)",
        }
        for route, guard in expected_guards.items():
            with self.subTest(route=route):
                self.assertIn(route, routes)
                self.assertIn(guard, routes[route])

    def test_iso_result_history_is_private_and_finalized_records_are_immutable(self):
        project = Path(__file__).parents[1]
        migration = (project / "supabase" / "20261108_iso_audit_results.sql").read_text(encoding="utf-8").lower()
        backend = (project / "backend" / "main.py").read_text(encoding="utf-8")
        frontend = (project / "src" / "app" / "pages" / "AccreditationSupport.tsx").read_text(encoding="utf-8")
        self.assertIn("alter table public.iso_audit_results enable row level security", migration)
        self.assertIn("revoke all on table public.iso_audit_results from anon, authenticated", migration)
        self.assertIn('if result.record_status == "FINALIZED"', backend)
        self.assertNotIn('@app.delete("/iso/results/', backend)
        self.assertIn('hasCapability("governance.cross_office")', frontend)
        self.assertIn("Internal audits are recorded as audit findings and never presented as ISO certification", frontend)

    def test_accreditation_cycles_preserve_attempts_and_restrict_level_transitions(self):
        project = Path(__file__).parents[1]
        migration = (project / "supabase" / "20261108_accreditation_cycles.sql").read_text(encoding="utf-8").lower()
        backend = (project / "backend" / "main.py").read_text(encoding="utf-8")
        frontend = (project / "src" / "app" / "pages" / "AccreditationSupport.tsx").read_text(encoding="utf-8")

        self.assertIn("constraint accreditation_cycles_program_level_attempt_key", migration)
        self.assertIn("uq_accreditation_cycles_one_active_program", migration)
        self.assertIn("where status = 'active'", migration)
        self.assertIn("current baseline -", migration)
        self.assertIn("legacy_history", migration)
        self.assertIn("accreditation_cycle_id", migration)
        self.assertIn("coalesce(section.metadata->>'iso_clause', '') = ''", migration)
        self.assertIn("alter table public.accreditation_cycles enable row level security", migration)
        self.assertIn("revoke all on table public.accreditation_cycles from anon, authenticated", migration)

        tree = ast.parse(backend)
        functions = {
            node.name: ast.unparse(node)
            for node in tree.body
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))
        }
        self.assertIn("Depends(get_campus_governance_reviewer)", functions["upgrade_program_accreditation"])
        self.assertIn("close_accreditation_cycle", functions["upgrade_program_accreditation"])
        self.assertIn("create_accreditation_cycle", functions["upgrade_program_accreditation"])
        self.assertLess(
            functions["upgrade_program_accreditation"].index("close_accreditation_cycle"),
            functions["upgrade_program_accreditation"].index("db.flush()", functions["upgrade_program_accreditation"].index("close_accreditation_cycle")),
        )
        self.assertIn("require_campus_reviewer", functions["update_program_accreditation"])
        self.assertIn("accreditation_cycle_id", functions["upload_accreditation_evidence"])
        self.assertNotIn("document_sections", functions["upgrade_program_accreditation"])
        self.assertIn('hasCapability("governance.cross_office")', frontend)
        self.assertIn("A level change closes the current cycle", frontend)

    def test_previous_accreditation_evidence_is_cycle_scoped_and_read_only(self):
        project = Path(__file__).parents[1]
        migration = (project / "supabase" / "20261108_aaccup_evidence_history.sql").read_text(encoding="utf-8").lower()
        backend = (project / "backend" / "main.py").read_text(encoding="utf-8")
        frontend = (project / "src" / "app" / "pages" / "AccreditationSupport.tsx").read_text(encoding="utf-8")

        self.assertIn("accreditation_evidence_id", migration)
        self.assertIn("idx_document_sections_aaccup_cycle_area", migration)
        self.assertIn("idx_document_sections_aaccup_evidence_id", migration)
        self.assertIn("coalesce(section.metadata->>'iso_clause', '') = ''", migration)

        tree = ast.parse(backend)
        functions = {
            node.name: ast.unparse(node)
            for node in tree.body
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))
        }
        self.assertIn("req.evidence_id", functions["review_accreditation"])
        self.assertNotIn("req.document_name", functions["review_accreditation"])
        self.assertIn("require_active_aaccup_evidence", functions["review_accreditation"])
        self.assertIn("require_active_aaccup_evidence", functions["archive_aaccup_evidence"])
        self.assertIn("documents.manage", functions["archive_aaccup_evidence"])
        self.assertIn("accreditation_cycle_id", functions["get_accreditation_status"])
        self.assertIn("accreditation_cycle_id", functions["get_accreditation_details"])
        self.assertIn("require_program", functions["get_aaccup_evidence_access_url"])
        self.assertIn("Current Level", frontend)
        self.assertIn("Previous Levels", frontend)
        self.assertIn("READ-ONLY HISTORY", frontend)
        self.assertIn("Previous-cycle evidence cannot be changed", frontend)

        with self.assertRaises(Exception):
            self.routes["AccreditationReviewRequest"](
                document_name="legacy-name-only",
                status="Approved",
            )

    def test_every_sensitive_frontend_route_has_a_matching_direct_url_permission(self):
        project = Path(__file__).parents[1]
        routes_source = (project / "src" / "app" / "routes.tsx").read_text(encoding="utf-8")
        permissions_source = (project / "src" / "app" / "utils" / "rolePermissions.ts").read_text(encoding="utf-8")
        protected_source = (project / "src" / "app" / "components" / "ProtectedRoute.tsx").read_text(encoding="utf-8")
        layout_source = (project / "src" / "app" / "layouts" / "DashboardLayout.tsx").read_text(encoding="utf-8")

        expected = {
            "knowledge-repository": "canAccessKnowledgeRepository",
            "paper-trail": "canAccessPaperTrail",
            "ask-policy": "canAccessAskPolicy",
            "accreditation-support": "canAccessAccreditationSupport",
            "audit-trail": "canAccessAuditTrail",
            "users-roles": "canAccessUsersRoles",
            "settings": "canAccessSettings",
            "broadcast-announcement": "canAccessBroadcastAnnouncement",
            "document-generator": "canAccessDocumentGenerator",
            "grade-evaluation": "canAccessGradeEvaluation",
            "client-survey": "canAccessClientSurvey",
            "client-survey-dashboard": "canAccessServiceSatisfaction",
        }
        for route, permission in expected.items():
            with self.subTest(route=route):
                block = re.search(
                    rf'path:\s*"{re.escape(route)}"(?P<body>.*?)(?=\n\s*\}},|\n\s*\],)',
                    routes_source,
                    re.DOTALL,
                )
                self.assertIsNotNone(block)
                self.assertIn(f'permission="{permission}"', block.group("body"))
                self.assertIn(permission, permissions_source)
                self.assertIn(permission, layout_source)

        self.assertIn('if (!userRole) return <Navigate to="/login" replace />', protected_source)
        self.assertIn('return <Navigate to="/app" replace />', protected_source)
        declared = set(re.findall(r'"(can[A-Z][A-Za-z]+)"', permissions_source))
        used = set(re.findall(r'permission="(can[A-Z][A-Za-z]+)"', routes_source + layout_source))
        self.assertFalse(used - declared, f"Undeclared frontend permissions: {sorted(used - declared)}")

    def test_all_governance_review_families_keep_scope_checks(self):
        source = Path(__file__).with_name("main.py").read_text(encoding="utf-8")
        tree = ast.parse(source)
        functions = {
            node.name: ast.unparse(node)
            for node in tree.body
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))
        }
        expected_scope_checks = {
            "review_accreditation": "require_program",
            "update_ched_evidence_status": "require_program",
            "update_iso_evidence_status": "require_office",
            "update_qms_action_plan": "require_office",
            "update_car_form": "require_office",
        }
        for handler, scope_check in expected_scope_checks.items():
            with self.subTest(handler=handler):
                self.assertIn(handler, functions)
                self.assertIn(scope_check, functions[handler])


if __name__ == "__main__":
    unittest.main()
