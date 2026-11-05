"""Explicit, one-time role migration; dry run unless --apply is supplied."""
import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy import text
from database import engine


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--system-admin-email", required=True)
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    email = args.system_admin_email.strip().lower()
    with engine.begin() as connection:
        users = [dict(row) for row in connection.execute(text(
            "SELECT id, email, role, status, administrative_office, is_iqa_auditor "
            "FROM public.users ORDER BY id FOR UPDATE"
        )).mappings()]
        target = [u for u in users if u["email"].lower() == email]
        if len(target) != 1 or target[0]["status"] != "Active":
            raise SystemExit("The designated administrator must be one existing active account.")
        if target[0]["role"] not in {"ADMIN", "SYSTEM_ADMIN"}:
            raise SystemExit("The designated account must already be an administrator.")
        changes = []
        for user in users:
            role = "SYSTEM_ADMIN" if user["email"].lower() == email else {"ADMIN": "OFFICE_HEAD", "IQA": "FACULTY"}.get(user["role"], user["role"])
            if role != user["role"]:
                changes.append((user, role))
        print(f"Role changes: {len(changes)}; designated System Administrator: {email}")
        for user, role in changes:
            print(f"  {user['email']}: {user['role']} -> {role}")
        if not args.apply:
            print("Dry run only. Add --apply to persist these changes.")
            return
        audit_policies = [dict(row) for row in connection.execute(text(
            "SELECT policyname, roles, cmd, qual, with_check FROM pg_policies "
            "WHERE schemaname='public' AND tablename='system_events_logs'"
        )).mappings()]
        backup_dir = Path(__file__).resolve().parent.parent / "backups"
        backup_dir.mkdir(exist_ok=True)
        backup = backup_dir / ("role_assignments_" + datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ") + ".json")
        backup.write_text(json.dumps({"users": users, "audit_policies": audit_policies}, indent=2, default=str), encoding="utf-8")
        for user, role in changes:
            connection.execute(text(
                "UPDATE public.users SET role=:role, is_iqa_auditor=:auditor WHERE id=:id"
            ), {"id": user["id"], "role": role, "auditor": bool(user["is_iqa_auditor"] or user["role"] == "IQA")})
        # The application uses its own JWTs. Its server reads logs using the service role;
        # anonymous Supabase clients must not bypass the System Administrator guard.
        connection.execute(text('DROP POLICY IF EXISTS "Enable read access for all users" ON public.system_events_logs'))
        connection.execute(text("ALTER TABLE public.system_events_logs ENABLE ROW LEVEL SECURITY"))
        connection.execute(text("REVOKE ALL ON public.system_events_logs FROM anon, authenticated"))
        count = connection.execute(text("SELECT count(*) FROM public.users WHERE role='SYSTEM_ADMIN' AND status='Active'")).scalar_one()
        if count < 1:
            raise RuntimeError("Migration would leave no active System Administrator.")
        print(f"Verified {count} active System Administrator(s). Backup: {backup}")


if __name__ == "__main__":
    main()
