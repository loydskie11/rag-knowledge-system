-- Fix 3: keep institutional files private and store durable object paths.
-- The FastAPI backend uses the service role for uploads and signs a URL only
-- after applying the application's authorization rules.

alter table public.paper_trail_records
    add column if not exists storage_path text;

alter table public.iso_evidences
    add column if not exists storage_path text;

alter table public.qms_evidences
    add column if not exists storage_path text;

alter table public.accreditation_history
    add column if not exists certificate_storage_path text;

update public.paper_trail_records
set storage_path = case
    when file_url like 'http%' then regexp_replace(split_part(file_url, '?', 1), '^.*/storage/v1/object/(sign|public|authenticated)/documents/', '')
    else file_url
end
where storage_path is null and nullif(file_url, '') is not null;

update public.iso_evidences
set storage_path = case
    when file_url like 'http%' then regexp_replace(split_part(file_url, '?', 1), '^.*/storage/v1/object/(sign|public|authenticated)/documents/', '')
    else file_url
end
where storage_path is null and nullif(file_url, '') is not null;

update public.qms_evidences
set storage_path = case
    when file_url like 'http%' then regexp_replace(split_part(file_url, '?', 1), '^.*/storage/v1/object/(sign|public|authenticated)/documents/', '')
    else file_url
end
where storage_path is null and nullif(file_url, '') is not null;

update public.accreditation_history
set certificate_storage_path = case
    when certificate_url like 'http%' then regexp_replace(split_part(certificate_url, '?', 1), '^.*/storage/v1/object/(sign|public|authenticated)/documents/', '')
    else certificate_url
end
where certificate_storage_path is null
  and nullif(certificate_url, '') is not null
  and (
      certificate_url not like 'http%'
      or certificate_url like '%/storage/v1/object/%/documents/%'
  );

-- Existing vector metadata already has storage_path. Remove expired signed
-- links at rest while preserving the path needed for on-demand signing.
update public.document_sections
set metadata = jsonb_set(
    metadata,
    '{file_url}',
    to_jsonb(metadata->>'storage_path'),
    true
)
where nullif(metadata->>'storage_path', '') is not null;

update public.document_sections
set metadata = jsonb_set(
    metadata,
    '{header_image_url}',
    to_jsonb(regexp_replace(split_part(metadata->>'header_image_url', '?', 1), '^.*/storage/v1/object/(sign|public|authenticated)/documents/', '')),
    true
)
where metadata->>'header_image_url' like '%/storage/v1/object/%/documents/%';

update public.document_sections
set metadata = jsonb_set(
    metadata,
    '{footer_image_url}',
    to_jsonb(regexp_replace(split_part(metadata->>'footer_image_url', '?', 1), '^.*/storage/v1/object/(sign|public|authenticated)/documents/', '')),
    true
)
where metadata->>'footer_image_url' like '%/storage/v1/object/%/documents/%';

-- A private bucket rejects conventional /object/public URLs. The backend's
-- service-role client remains able to upload/download and create signed URLs.
update storage.buckets
set public = false,
    updated_at = now()
where id = 'documents';
