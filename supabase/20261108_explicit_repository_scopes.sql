-- Fix 13: separate repository visibility from legacy office/program labels.

alter table public.document_uploads
    add column if not exists scope_type text,
    add column if not exists scope_code text;

update public.document_uploads
set scope_type = case when program <> 'GLOBAL' then 'PROGRAM' else 'CAMPUS' end,
    scope_code = case when program <> 'GLOBAL' then program else 'ARGAO' end
where scope_type is null or scope_code is null;

alter table public.document_uploads
    alter column scope_type set not null,
    alter column scope_code set not null;

alter table public.document_uploads
    drop constraint if exists document_uploads_scope_type_valid;
alter table public.document_uploads
    add constraint document_uploads_scope_type_valid
    check (scope_type in ('CAMPUS', 'OFFICE', 'PROGRAM'));

drop index if exists public.uq_document_uploads_hash_scope;
drop index if exists public.idx_document_uploads_name_scope;

update public.document_uploads
set scope_key = lower(scope_type) || '|' || lower(regexp_replace(scope_code, '[^a-zA-Z0-9]+', '', 'g'));

create unique index uq_document_uploads_hash_scope
    on public.document_uploads (file_sha256, scope_key)
    where status <> 'FAILED';

create index idx_document_uploads_name_scope
    on public.document_uploads (normalized_name, scope_key)
    where status <> 'FAILED';

-- Preserve the visibility of ordinary legacy repository documents. Evidence
-- rows retain their established program/office restrictions.
update public.document_sections
set metadata = metadata || case
    when coalesce(metadata->>'category', '') ilike '%evidence%'
         and coalesce(metadata->>'program', 'GLOBAL') <> 'GLOBAL'
      then jsonb_build_object('scope_type', 'PROGRAM', 'scope_code', metadata->>'program')
    when coalesce(metadata->>'category', '') ilike '%evidence%'
         and coalesce(metadata->>'office', '') <> ''
      then jsonb_build_object('scope_type', 'OFFICE', 'scope_code', metadata->>'office')
    else jsonb_build_object('scope_type', 'CAMPUS', 'scope_code', 'ARGAO')
end
where not (metadata ? 'scope_type') or not (metadata ? 'scope_code');

revoke all on table public.document_uploads from anon, authenticated;
grant select, insert, update, delete on table public.document_uploads to service_role;
