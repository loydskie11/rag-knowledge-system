import ast
import secrets
import unittest
from datetime import datetime, timedelta
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import MagicMock

from fastapi import Depends, HTTPException, Request
from jose import JWTError
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

import models
import utils


def load_reset_handlers():
    tree = ast.parse(Path(__file__).with_name("main.py").read_text(encoding="utf-8"))
    selected = {
        "UpdatePasswordRequest",
        "VerifyPasswordResetCodeRequest",
        "update_password",
        "verify_password_reset_code",
    }
    nodes = []
    for node in tree.body:
        if getattr(node, "name", None) in selected:
            node.decorator_list = []
            nodes.append(node)
    namespace = {
        "BaseModel": BaseModel,
        "EmailStr": EmailStr,
        "Depends": Depends,
        "HTTPException": HTTPException,
        "Request": Request,
        "Session": Session,
        "datetime": datetime,
        "secrets": secrets,
        "models": models,
        "utils": utils,
        "limiter": MagicMock(),
        "get_db": lambda: None,
        "_send_notification": MagicMock(),
    }
    exec(compile(ast.Module(body=nodes, type_ignores=[]), "password_reset_handlers", "exec"), namespace)
    return namespace


class PasswordResetSecurityTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.handlers = load_reset_handlers()

    def test_password_policy_matches_the_ui_requirements(self):
        self.assertEqual(
            utils.password_policy_failures("short"),
            ["at least 8 characters", "1 uppercase letter", "1 number", "1 special character"],
        )
        self.assertEqual(utils.password_policy_failures("ValidPass1!"), [])
        self.assertIn("1 special character", utils.password_policy_failures("Valid Pass1"))

    def test_reset_token_is_email_and_purpose_specific(self):
        token = utils.create_password_reset_token("person@example.edu", "123456")
        claims = utils.decode_password_reset_token(token, "PERSON@example.edu")
        self.assertEqual(claims["purpose"], "password_reset")
        self.assertTrue(utils.password_reset_token_matches_code(claims, "123456"))
        self.assertFalse(utils.password_reset_token_matches_code(claims, "654321"))

        with self.assertRaises(ValueError):
            utils.decode_password_reset_token(token, "different@example.edu")

    def test_session_token_cannot_be_used_as_reset_token(self):
        session_token = utils.create_access_token({"sub": "person@example.edu"})
        with self.assertRaises(ValueError):
            utils.decode_password_reset_token(session_token, "person@example.edu")

    def test_tampered_reset_token_is_rejected(self):
        token = utils.create_password_reset_token("person@example.edu", "123456")
        with self.assertRaises(JWTError):
            utils.decode_password_reset_token(token + "tampered", "person@example.edu")

    def test_actual_update_handler_rejects_weak_password_before_write(self):
        user = SimpleNamespace(email="person@example.edu")
        database = MagicMock()
        database.query.return_value.filter.return_value.first.return_value = user
        request = self.handlers["UpdatePasswordRequest"](
            email=user.email,
            reset_token=utils.create_password_reset_token(user.email, "123456"),
            new_password="weakpass",
        )
        with self.assertRaises(HTTPException) as raised:
            self.handlers["update_password"](request, database)
        self.assertEqual(raised.exception.status_code, 400)
        self.assertIn("uppercase", raised.exception.detail)
        database.commit.assert_not_called()

    def test_actual_verify_handler_returns_bound_reset_token(self):
        user = SimpleNamespace(email="person@example.edu")
        record = SimpleNamespace(
            email=user.email,
            otp_code="123456",
            expires_at=datetime.utcnow() + timedelta(minutes=5),
        )
        database = MagicMock()
        database.query.side_effect = [
            MagicMock(filter=MagicMock(return_value=MagicMock(first=MagicMock(return_value=user)))),
            MagicMock(filter=MagicMock(return_value=MagicMock(first=MagicMock(return_value=record)))),
        ]
        payload = self.handlers["VerifyPasswordResetCodeRequest"](
            email=user.email,
            otp_code=record.otp_code,
        )
        result = self.handlers["verify_password_reset_code"](
            payload,
            SimpleNamespace(client=SimpleNamespace(host="127.0.0.1"), headers={}),
            database,
        )
        claims = utils.decode_password_reset_token(result["reset_token"], user.email)
        self.assertTrue(utils.password_reset_token_matches_code(claims, record.otp_code))
        self.handlers["limiter"].check.assert_called()


if __name__ == "__main__":
    unittest.main()
