-- Cover frequently joined governance foreign keys identified by the Supabase
-- performance advisor. These indexes also avoid full-table scans when a
-- referenced parent row is updated or deleted.

create index if not exists idx_accreditation_history_program_id
  on public.accreditation_history (program_id);

create index if not exists idx_ched_evidences_requirement_id
  on public.ched_evidences (requirement_id);

create index if not exists idx_iso_evidences_iso_requirement_id
  on public.iso_evidences (iso_requirement_id);

create index if not exists idx_paper_trail_logs_record_id
  on public.paper_trail_logs (record_id);
