-- Remove expired signed URLs from relational records after storage_path backfill.
-- Object paths are durable; API responses receive a newly signed URL on demand.

update public.ched_evidences
set file_url = storage_path
where nullif(storage_path, '') is not null;

update public.paper_trail_records
set file_url = storage_path
where nullif(storage_path, '') is not null;

update public.iso_evidences
set file_url = storage_path
where nullif(storage_path, '') is not null;

update public.qms_evidences
set file_url = storage_path
where nullif(storage_path, '') is not null;

update public.accreditation_history
set certificate_url = certificate_storage_path
where nullif(certificate_storage_path, '') is not null;
