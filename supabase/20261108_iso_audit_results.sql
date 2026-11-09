-- Fix 16: durable ISO audit outcomes and private supporting artifacts.

create table if not exists public.iso_audit_cycles (
    id uuid primary key default gen_random_uuid(),
    name text not null unique,
    standard_version text not null default 'ISO 9001:2015',
    status text not null default 'ACTIVE'
        check (status in ('PLANNED', 'ACTIVE', 'CLOSED')),
    created_at timestamptz not null default now()
);

create table if not exists public.iso_audit_results (
    id uuid primary key default gen_random_uuid(),
    cycle_id uuid not null references public.iso_audit_cycles(id) on delete restrict,
    result_type text not null
        check (result_type in ('INTERNAL_AUDIT', 'CERTIFICATION_AUDIT', 'SURVEILLANCE_AUDIT', 'RECERTIFICATION_AUDIT', 'OTHER_EXTERNAL')),
    audit_start_date timestamptz,
    audit_end_date timestamptz not null,
    auditor_or_certification_body text not null,
    conclusion text not null,
    certification_status text
        check (certification_status is null or certification_status in ('CERTIFIED', 'MAINTAINED', 'RECOMMENDED', 'SUSPENDED', 'WITHDRAWN', 'NOT_CERTIFIED')),
    major_nonconformities integer not null default 0 check (major_nonconformities >= 0),
    minor_nonconformities integer not null default 0 check (minor_nonconformities >= 0),
    observations integer not null default 0 check (observations >= 0),
    opportunities_for_improvement integer not null default 0 check (opportunities_for_improvement >= 0),
    summary text not null,
    report_storage_path text,
    report_original_filename text,
    certificate_storage_path text,
    certificate_original_filename text,
    record_status text not null default 'DRAFT'
        check (record_status in ('DRAFT', 'FINALIZED')),
    created_by text not null,
    finalized_by text,
    finalized_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Development startup may have created these tables through SQLAlchemy before
-- the migration is applied. Keep database-side defaults authoritative too.
alter table public.iso_audit_cycles alter column id set default gen_random_uuid();
alter table public.iso_audit_cycles alter column standard_version set default 'ISO 9001:2015';
alter table public.iso_audit_cycles alter column status set default 'ACTIVE';
alter table public.iso_audit_cycles alter column created_at set default now();
alter table public.iso_audit_results alter column id set default gen_random_uuid();
alter table public.iso_audit_results alter column major_nonconformities set default 0;
alter table public.iso_audit_results alter column minor_nonconformities set default 0;
alter table public.iso_audit_results alter column observations set default 0;
alter table public.iso_audit_results alter column opportunities_for_improvement set default 0;
alter table public.iso_audit_results alter column record_status set default 'DRAFT';
alter table public.iso_audit_results alter column created_at set default now();
alter table public.iso_audit_results alter column updated_at set default now();

create index if not exists idx_iso_audit_results_cycle_date
    on public.iso_audit_results (cycle_id, audit_end_date desc);

insert into public.iso_audit_cycles (name)
select distinct cycle_name
from (
    select cycle_year as cycle_name from public.iso_requirements
    union select cycle_year from public.qms_action_plans
    union select cycle_year from public.iqa_day_schedules
) source
where cycle_name is not null and btrim(cycle_name) <> ''
on conflict (name) do nothing;

insert into public.iso_audit_cycles (name)
values ('2026 Recertification'), ('2025 Surveillance'), ('2024 Initial Audit')
on conflict (name) do nothing;

alter table public.iso_audit_cycles enable row level security;
alter table public.iso_audit_results enable row level security;

revoke all on table public.iso_audit_cycles from anon, authenticated;
revoke all on table public.iso_audit_results from anon, authenticated;
grant select, insert, update, delete on table public.iso_audit_cycles to service_role;
grant select, insert, update, delete on table public.iso_audit_results to service_role;
