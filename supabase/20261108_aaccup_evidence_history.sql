-- Stable identities and indexed cycle lookups for AACCUP evidence history.
-- The evidence remains in document_sections so its vector chunks and original
-- file metadata stay together; every chunk of one file receives the same ID.

with evidence_identities as (
  select
    section.id,
    md5(concat_ws('|',
      coalesce(section.metadata->>'program', ''),
      coalesce(section.metadata->>'accreditation_cycle_id', ''),
      coalesce(section.metadata->>'storage_path', section.metadata->>'file_url', ''),
      coalesce(section.metadata->>'name', ''),
      coalesce(section.metadata->>'area_code', ''),
      coalesce(section.metadata->>'requirement_target', ''),
      coalesce(section.metadata->>'upload_date', '')
    )) as identity_hash
  from public.document_sections section
  where section.metadata->>'category' = 'Accreditation Evidence'
    and coalesce(section.metadata->>'iso_clause', '') = ''
    and section.metadata ? 'accreditation_cycle_id'
    and not (section.metadata ? 'accreditation_evidence_id')
)
update public.document_sections section
set metadata = coalesce(section.metadata, '{}'::jsonb) || jsonb_build_object(
  'accreditation_evidence_id', (
    substr(identity_hash, 1, 8) || '-' ||
    substr(identity_hash, 9, 4) || '-' ||
    substr(identity_hash, 13, 4) || '-' ||
    substr(identity_hash, 17, 4) || '-' ||
    substr(identity_hash, 21, 12)
  )::uuid::text
)
from evidence_identities identity
where section.id = identity.id;

create index if not exists idx_document_sections_aaccup_cycle_area
  on public.document_sections (
    (metadata->>'program'),
    (metadata->>'accreditation_cycle_id'),
    (metadata->>'area_code')
  )
  where metadata->>'category' = 'Accreditation Evidence'
    and coalesce(metadata->>'iso_clause', '') = '';

create index if not exists idx_document_sections_aaccup_evidence_id
  on public.document_sections ((metadata->>'accreditation_evidence_id'))
  where metadata->>'category' = 'Accreditation Evidence'
    and coalesce(metadata->>'iso_clause', '') = '';

