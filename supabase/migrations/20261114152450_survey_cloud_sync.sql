create table if not exists public.survey_sync_runs (
    id uuid primary key default gen_random_uuid(),
    started_at timestamptz not null default now(),
    completed_at timestamptz,
    status text not null default 'running'
        check (status in ('running', 'success', 'failed')),
    fetched_count integer not null default 0 check (fetched_count >= 0),
    inserted_count integer not null default 0 check (inserted_count >= 0),
    skipped_count integer not null default 0 check (skipped_count >= 0),
    max_cloud_created_at timestamptz,
    error_message text,
    triggered_by uuid references public.users(id) on delete set null
);

create index if not exists idx_survey_sync_runs_started_at
    on public.survey_sync_runs (started_at desc);

alter table public.survey_sync_runs enable row level security;

revoke all on table public.survey_sync_runs from anon, authenticated;
grant all on table public.survey_sync_runs to service_role;
