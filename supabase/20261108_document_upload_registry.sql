-- One durable record per repository file. Vector chunks remain in
-- document_sections, but duplicate decisions are made here before OCR or
-- embedding starts.

create table if not exists public.document_uploads (
    id uuid primary key default gen_random_uuid(),
    file_sha256 text not null,
    file_size bigint not null check (file_size >= 0),
    original_filename text not null,
    document_name text not null,
    normalized_name text not null,
    category text not null,
    office text not null,
    program text not null default 'GLOBAL',
    scope_type text not null check (scope_type in ('CAMPUS', 'OFFICE', 'PROGRAM')),
    scope_code text not null,
    scope_key text not null,
    version text not null,
    upload_mode text not null default 'NEW_DOCUMENT'
        check (upload_mode in ('NEW_DOCUMENT', 'NEW_VERSION', 'LEGACY_BACKFILL')),
    status text not null default 'PROCESSING'
        check (status in ('PROCESSING', 'ACTIVE', 'SUPERSEDED', 'ARCHIVED', 'FAILED')),
    storage_path text,
    job_id uuid,
    uploaded_by text not null,
    failure_reason text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint document_uploads_sha256_format
        check (file_sha256 ~ '^[0-9a-f]{64}$')
);

-- SQLAlchemy's development create_all may have created the table before this
-- migration. Keep server-side defaults authoritative for REST inserts too.
alter table public.document_uploads alter column id set default gen_random_uuid();
alter table public.document_uploads alter column program set default 'GLOBAL';
alter table public.document_uploads alter column upload_mode set default 'NEW_DOCUMENT';
alter table public.document_uploads alter column status set default 'PROCESSING';
alter table public.document_uploads alter column created_at set default now();
alter table public.document_uploads alter column updated_at set default now();

-- A byte-identical file may exist in another legitimate scope, but never
-- more than once in the same scope. Failed reservations do not block retry.
create unique index if not exists uq_document_uploads_hash_scope
    on public.document_uploads (file_sha256, scope_key)
    where status <> 'FAILED';

create index if not exists idx_document_uploads_hash
    on public.document_uploads (file_sha256)
    where status <> 'FAILED';

create index if not exists idx_document_uploads_name_scope
    on public.document_uploads (normalized_name, scope_key)
    where status <> 'FAILED';

create index if not exists idx_document_uploads_job_id
    on public.document_uploads (job_id)
    where job_id is not null;

alter table public.document_uploads enable row level security;

-- Repository writes are authorized by FastAPI and use the backend service
-- role. Browser roles must not access the registry directly.
revoke all on table public.document_uploads from anon, authenticated;
grant select, insert, update, delete on table public.document_uploads to service_role;
