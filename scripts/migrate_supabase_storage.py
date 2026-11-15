"""Copy Supabase Storage objects between two projects without embedding secrets.

Required environment variables:
  CLOUD_SUPABASE_URL
  CLOUD_SUPABASE_SERVICE_KEY
  LOCAL_SUPABASE_URL
  LOCAL_SUPABASE_SERVICE_KEY

DATABASE_URL is used only to enumerate the cloud objects reliably. The actual
file bytes are downloaded and uploaded through the Storage API.
"""

from __future__ import annotations

import json
import os
import sys
from collections import Counter

import psycopg2
from supabase import create_client


REQUIRED_ENV = (
    "DATABASE_URL",
    "CLOUD_SUPABASE_URL",
    "CLOUD_SUPABASE_SERVICE_KEY",
    "LOCAL_SUPABASE_URL",
    "LOCAL_SUPABASE_SERVICE_KEY",
)


def require_environment() -> dict[str, str]:
    values = {name: os.getenv(name, "").strip() for name in REQUIRED_ENV}
    missing = [name for name, value in values.items() if not value]
    if missing:
        raise RuntimeError(f"Missing required environment variables: {', '.join(missing)}")
    return values


def cloud_objects(database_url: str) -> list[tuple[str, str, dict]]:
    with psycopg2.connect(database_url) as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                select bucket_id, name, coalesce(metadata, '{}'::jsonb)
                from storage.objects
                where name is not null
                order by bucket_id, name
                """
            )
            return [(bucket, name, metadata or {}) for bucket, name, metadata in cursor.fetchall()]


def ensure_bucket(client, bucket_id: str) -> None:
    existing = {bucket.name for bucket in client.storage.list_buckets()}
    if bucket_id not in existing:
        client.storage.create_bucket(bucket_id, options={"public": False})


def main() -> int:
    env = require_environment()
    source = create_client(env["CLOUD_SUPABASE_URL"], env["CLOUD_SUPABASE_SERVICE_KEY"])
    destination = create_client(env["LOCAL_SUPABASE_URL"], env["LOCAL_SUPABASE_SERVICE_KEY"])
    objects = cloud_objects(env["DATABASE_URL"])
    totals = Counter(bucket for bucket, _, _ in objects)

    for bucket_id in sorted(totals):
        ensure_bucket(destination, bucket_id)

    copied = Counter()
    failed: list[dict[str, str]] = []
    for index, (bucket_id, object_name, metadata) in enumerate(objects, start=1):
        try:
            payload = source.storage.from_(bucket_id).download(object_name)
            content_type = metadata.get("mimetype") or "application/octet-stream"
            destination.storage.from_(bucket_id).upload(
                object_name,
                payload,
                {"content-type": content_type, "upsert": "true"},
            )
            copied[bucket_id] += 1
            print(f"[{index}/{len(objects)}] copied {bucket_id}/{object_name}")
        except Exception as exc:  # continue so the final report lists every failed object
            failed.append({"bucket": bucket_id, "name": object_name, "error": str(exc)})
            print(f"[{index}/{len(objects)}] FAILED {bucket_id}/{object_name}: {exc}", file=sys.stderr)

    report = {
        "expected": dict(totals),
        "copied": dict(copied),
        "failed": failed,
    }
    print(json.dumps(report, indent=2))
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
