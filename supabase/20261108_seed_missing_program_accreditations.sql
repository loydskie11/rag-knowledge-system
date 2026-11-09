-- Ensure every active campus program has an accreditation baseline and an
-- active evidence cycle. Existing accreditation records remain unchanged.

with inserted_programs as (
  insert into public.program_accreditations (
    id, program_code, current_level, status, active_areas, updated_at
  )
  select
    gen_random_uuid(),
    program.code,
    'Candidate Status',
    'Active',
    'Area I,Area II,Area III,Area IV,Area V,Area VI,Area VII,Area VIII,Area IX,Area X',
    now()
  from public.academic_programs program
  where program.is_active
    and not exists (
      select 1
      from public.program_accreditations accreditation
      where accreditation.program_code = program.code
    )
  returning id, program_code, current_level, valid_until
)
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
