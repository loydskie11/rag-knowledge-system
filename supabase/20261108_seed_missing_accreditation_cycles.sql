-- The accreditation records may already exist from an earlier deployment.
-- Give every record that does not yet have one an active evidence cycle.

insert into public.accreditation_cycles (
  program_id, level_name, attempt_number, cycle_label, status, source,
  opened_at, valid_until, created_by
)
select
  accreditation.id,
  accreditation.current_level,
  1,
  'Current Baseline - ' || accreditation.current_level || ' (Attempt 1)',
  'ACTIVE',
  'ADMINISTRATIVE_BASELINE',
  now(),
  accreditation.valid_until,
  'system-migration'
from public.program_accreditations accreditation
where not exists (
  select 1
  from public.accreditation_cycles cycle
  where cycle.program_id = accreditation.id
    and cycle.status = 'ACTIVE'
);
