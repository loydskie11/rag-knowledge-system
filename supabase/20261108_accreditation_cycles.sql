-- Stable AACCUP accreditation cycles. Every program/level attempt receives a
-- separate record so future promotions never overwrite historical evidence.

create table if not exists public.accreditation_cycles (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.program_accreditations(id) on delete cascade,
  level_name varchar(100) not null,
  attempt_number integer not null default 1 check (attempt_number > 0),
  cycle_label varchar(255) not null,
  status varchar(20) not null default 'ACTIVE'
    check (status in ('ACTIVE', 'CLOSED')),
  source varchar(40) not null default 'LEVEL_TRANSITION'
    check (source in ('LEGACY_HISTORY', 'LEGACY_BASELINE', 'LEVEL_TRANSITION', 'ADMINISTRATIVE_BASELINE')),
  opened_at timestamp without time zone not null default now(),
  closed_at timestamp without time zone,
  valid_until timestamp without time zone,
  source_history_id uuid unique references public.accreditation_history(id) on delete set null,
  created_by varchar(255) not null,
  closed_by varchar(255),
  created_at timestamp without time zone not null default now(),
  updated_at timestamp without time zone not null default now(),
  constraint accreditation_cycles_closed_state check (
    (status = 'ACTIVE' and closed_at is null) or
    (status = 'CLOSED' and closed_at is not null)
  ),
  constraint accreditation_cycles_program_level_attempt_key
    unique (program_id, level_name, attempt_number)
);

-- SQLAlchemy create_all can create this table before the migration in local
-- development. Keep database-side defaults authoritative in either order.
alter table public.accreditation_cycles alter column id set default gen_random_uuid();
alter table public.accreditation_cycles alter column attempt_number set default 1;
alter table public.accreditation_cycles alter column status set default 'ACTIVE';
alter table public.accreditation_cycles alter column source set default 'LEVEL_TRANSITION';
alter table public.accreditation_cycles alter column opened_at set default now();
alter table public.accreditation_cycles alter column created_at set default now();
alter table public.accreditation_cycles alter column updated_at set default now();

alter table public.accreditation_history
  add column if not exists cycle_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'accreditation_history_cycle_id_fkey'
  ) then
    alter table public.accreditation_history
      add constraint accreditation_history_cycle_id_fkey
      foreign key (cycle_id) references public.accreditation_cycles(id) on delete set null;
  end if;
end $$;

create index if not exists idx_accreditation_cycles_program_status
  on public.accreditation_cycles (program_id, status);

create unique index if not exists uq_accreditation_cycles_one_active_program
  on public.accreditation_cycles (program_id)
  where status = 'ACTIVE';

create index if not exists idx_accreditation_history_cycle_id
  on public.accreditation_history (cycle_id);

-- Preserve every imported history entry as its own closed attempt. This is
-- intentionally separate from the active baseline created below.
with ranked_history as (
  select
    ah.*,
    row_number() over (
      partition by ah.program_id, ah.level_achieved
      order by ah.date_granted, ah.id
    )::integer as attempt_number
  from public.accreditation_history ah
), inserted_history_cycles as (
  insert into public.accreditation_cycles (
    program_id, level_name, attempt_number, cycle_label, status, source,
    opened_at, closed_at, valid_until, source_history_id, created_by, closed_by
  )
  select
    rh.program_id,
    rh.level_achieved,
    rh.attempt_number,
    'Historical Import - ' || rh.level_achieved || ' (Attempt ' || rh.attempt_number || ')',
    'CLOSED',
    'LEGACY_HISTORY',
    coalesce(rh.date_granted, now()),
    greatest(coalesce(rh.valid_until, rh.date_granted, now()), coalesce(rh.date_granted, now())),
    rh.valid_until,
    rh.id,
    'system-migration',
    'system-migration'
  from ranked_history rh
  where not exists (
    select 1 from public.accreditation_cycles existing
    where existing.source_history_id = rh.id
  )
  on conflict do nothing
  returning id
)
select count(*) from inserted_history_cycles;

update public.accreditation_history ah
set cycle_id = cycle.id
from public.accreditation_cycles cycle
where cycle.source_history_id = ah.id
  and ah.cycle_id is null;

-- One clearly labelled active baseline is created for each current program.
with baseline_attempts as (
  select
    pa.*,
    coalesce((
      select max(cycle.attempt_number)
      from public.accreditation_cycles cycle
      where cycle.program_id = pa.id
        and cycle.level_name = coalesce(pa.current_level, 'Candidate Status')
    ), 0) + 1 as next_attempt,
    coalesce((
      select max(ah.date_granted)
      from public.accreditation_history ah
      where ah.program_id = pa.id
        and ah.level_achieved = coalesce(pa.current_level, 'Candidate Status')
    ), pa.updated_at, now()) as baseline_opened_at
  from public.program_accreditations pa
)
insert into public.accreditation_cycles (
  program_id, level_name, attempt_number, cycle_label, status, source,
  opened_at, valid_until, created_by
)
select
  baseline.id,
  coalesce(baseline.current_level, 'Candidate Status'),
  baseline.next_attempt,
  'Current Baseline - ' || coalesce(baseline.current_level, 'Candidate Status') ||
    ' (Attempt ' || baseline.next_attempt || ')',
  'ACTIVE',
  'LEGACY_BASELINE',
  baseline.baseline_opened_at,
  baseline.valid_until,
  'system-migration'
from baseline_attempts baseline
where not exists (
  select 1 from public.accreditation_cycles active_cycle
  where active_cycle.program_id = baseline.id
    and active_cycle.status = 'ACTIVE'
);

-- Existing AACCUP chunks, if any, belong to the imported active baseline.
-- ISO evidence shares the category label, so explicitly exclude ISO clauses.
update public.document_sections section
set metadata = coalesce(section.metadata, '{}'::jsonb) || jsonb_build_object(
  'accreditation_cycle_id', cycle.id::text,
  'accreditation_cycle_label', cycle.cycle_label,
  'accreditation_level', cycle.level_name,
  'accreditation_attempt', cycle.attempt_number
)
from public.program_accreditations pa
join public.accreditation_cycles cycle
  on cycle.program_id = pa.id and cycle.status = 'ACTIVE'
where section.metadata->>'category' = 'Accreditation Evidence'
  and coalesce(section.metadata->>'iso_clause', '') = ''
  and section.metadata->>'program' = pa.program_code
  and not (section.metadata ? 'accreditation_cycle_id');

alter table public.accreditation_cycles enable row level security;
revoke all on table public.accreditation_cycles from anon, authenticated;
grant all on table public.accreditation_cycles to service_role;

