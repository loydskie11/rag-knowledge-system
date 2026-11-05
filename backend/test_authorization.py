"""Exercise actual route bodies without starting Ollama or connecting to production data."""
import ast
import inspect
import unittest
from datetime import datetime
from pathlib import Path
from types import SimpleNamespace as User
from typing import Optional, List
from unittest.mock import MagicMock

from fastapi import FastAPI, Depends, HTTPException, Query, Body, File, Form, UploadFile, BackgroundTasks, status
from fastapi.testclient import TestClient
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
import models
import schemas
from permissions import *


def user(role="OFFICE_HEAD", office="University Library", **extra):
    return User(role=role, administrative_office=office, department="BSIT", email="head@example.edu", status="Active", is_iqa_auditor=extra.get("auditor", False))


def load_routes():
    tree = ast.parse(Path(__file__).with_name("main.py").read_text(encoding="utf-8"))
    names = {
        "get_current_admin", "get_governance_manager", "get_governance_reviewer",
        "get_current_faculty_or_admin", "get_document_manager", "require_document_office", "require_document_name_access",
        "protect_last_system_admin", "get_auth_profile", "register_user", "get_iso_requirements",
        "create_iso_requirement", "update_iso_requirement", "delete_iso_requirement", "upload_iso_evidence",
        "update_iso_evidence_status", "update_iso_status", "delete_iso_evidence",
        "get_qms_action_plans", "create_qms_action_plan", "update_qms_action_plan",
        "delete_qms_action_plan", "delete_qms_evidence", "upload_qms_action_plan_evidence",
        "car_office", "get_car_forms", "create_car_form", "update_car_form", "delete_car_form",
        "get_ched_evidence_access_url", "upload_ched_evidence", "delete_ched_evidence",
        "_paper_trail_visible", "_paper_trail_is_current_custodian", "get_paper_trail_detail",
        "UserCreateRequest", "UserUpdateRequest", "ISOEvidenceReviewRequest",
    }
    nodes = []
    for node in tree.body:
        if getattr(node, "name", None) in names:
            node.decorator_list = []
            nodes.append(node)
    ns = dict(globals(), get_current_user=lambda: None, get_db=lambda: None,
              get_current_paper_trail_reader=lambda: None, _DB_IS_AVAILABLE=True, supabase=MagicMock())
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

    def test_review_requires_explicit_assignment(self):
        for role in ["OFFICE_HEAD", "FACULTY", "COLLEGE_DEAN", "PROGRAM_CHAIR", "COLLEGE_SECRETARY"]:
            self.denied(lambda: require_reviewer(user(role)))
        require_reviewer(user(auditor=True))
        require_reviewer(user(office="Quality Assurance & Management (QAU)"))
        self.assertFalse(is_reviewer(user("STUDENT", auditor=True)))

    def test_office_aliases_are_exact_and_missing_assignment_denied(self):
        require_office(user(), "Library Services")
        for office in [None, "", "all", "University", "Registrar", "University Library Annex"]:
            self.denied(lambda: require_office(user(), office))
        self.denied(lambda: require_office(user(office=None), None))

    def test_program_scope(self):
        require_program(user(), "BSIT")
        self.denied(lambda: require_program(user(), "BSHM"))
        self.denied(lambda: require_program(user("STUDENT"), "BSIT"))

    def test_academic_leadership_scope(self):
        dean = user("COLLEGE_DEAN")
        dean.department = "College of Technology and Engineering (COTE)"
        require_program(dean, "BSIT")
        require_program(dean, "BIT_ET")
        self.denied(lambda: require_program(dean, "BSTM"))

        secretary = user("COLLEGE_SECRETARY")
        secretary.department = dean.department
        require_program(secretary, "BSIE")
        self.assertTrue(permissions_for(secretary)["documents.manage"])
        self.assertFalse(permissions_for(secretary)["governance.manage"])
        self.assertFalse(permissions_for(secretary)["system.manage"])

        chair = user("PROGRAM_CHAIR")
        chair.department = "BSHM"
        require_program(chair, "BSHM")
        self.denied(lambda: require_program(chair, "BSTM"))

    def test_rag_and_repository_share_evidence_scope(self):
        self.assertTrue(can_read_document(user(), {"category": "Policy"}))
        self.assertFalse(can_read_document(user(), {"category": "CHED Evidence", "program": "BSHM"}))
        self.assertFalse(can_read_document(user(), {"category": "Accreditation Evidence", "iso_clause": "7.1", "office": "Registrar"}))
        self.assertFalse(can_read_document(None, {"category": "CHED Evidence", "program": "BSIT"}))

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
        record = User(auditee_office="Library Services", corrective_measure="Old")
        db = self.db_for(record)
        self.routes["update_qms_action_plan"]("id", schemas.QMSActionPlanUpdate(corrective_measure="New"), db, user())
        self.assertEqual(record.corrective_measure, "New")
        db.commit.assert_called_once()

    def test_unchanged_empty_assessment_fields_do_not_block_office_edits(self):
        record = User(auditee_office="Library Services", corrective_measure="Old", assessment_notes=None, assessment_date=None)
        db = self.db_for(record)
        self.routes["update_qms_action_plan"]("id", schemas.QMSActionPlanUpdate(corrective_measure="New", assessment_notes="", assessment_date=""), db, user())
        db.commit.assert_called_once()

    def test_iso_list_filters_both_database_and_rest_fallback(self):
        records = [User(auditee_office="Library Services"), User(auditee_office="Registrar")]
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


if __name__ == "__main__":
    unittest.main()
