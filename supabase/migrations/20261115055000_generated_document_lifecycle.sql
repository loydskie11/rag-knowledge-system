do $$
begin
  if to_regclass('public.generated_documents') is not null
     and exists (select 1 from information_schema.columns where table_schema='public' and table_name='generated_documents' and column_name='user_email')
     and not exists (select 1 from information_schema.columns where table_schema='public' and table_name='generated_documents' and column_name='template_code') then
    alter table public.generated_documents rename to generated_documents_legacy;
  end if;
end $$;

create table public.generated_documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  template_name text not null,
  template_code text not null,
  template_version text not null,
  status text not null default 'DRAFT' check (status in ('DRAFT','FINALIZED','SUPERSEDED','VOIDED')),
  field_values jsonb not null default '{}'::jsonb,
  rendered_html text not null,
  source_type text not null default 'NONE' check (source_type in ('NONE','CAR_FORM','CAR_MASTER_LOG','ISO_AUDIT_CYCLE','MRC_RECORD')),
  source_id uuid null,
  source_reference text null,
  created_by_id uuid not null references public.users(id) on delete restrict,
  last_edited_by_id uuid not null references public.users(id) on delete restrict,
  finalized_by_id uuid null references public.users(id) on delete restrict,
  supersedes_id uuid null references public.generated_documents(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  finalized_at timestamptz null,
  voided_at timestamptz null,
  void_reason text null
);

create index if not exists idx_generated_documents_owner_updated on public.generated_documents(created_by_id, updated_at desc);
create index if not exists idx_generated_documents_source on public.generated_documents(source_type, source_id);
create index if not exists idx_generated_documents_status on public.generated_documents(status);

create table if not exists public.generated_document_events (
  id uuid primary key default gen_random_uuid(),
  generated_document_id uuid not null references public.generated_documents(id) on delete cascade,
  event_type text not null check (event_type in ('CREATED','UPDATED','FINALIZED','SUPERSEDED','VOIDED','REOPENED')),
  actor_id uuid null references public.users(id) on delete set null,
  actor_email text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_generated_document_events_document on public.generated_document_events(generated_document_id, created_at desc);

alter table public.generated_documents enable row level security;
alter table public.generated_document_events enable row level security;

comment on table public.generated_documents is 'Controlled generated-document drafts and immutable finalized snapshots managed by the authenticated backend.';
comment on table public.generated_document_events is 'Append-only audit history for generated-document lifecycle actions.';
