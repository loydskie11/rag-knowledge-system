create table if not exists public.iso_process_aliases (
  id uuid primary key default gen_random_uuid(),
  process_group_id uuid not null references public.iso_process_groups(id) on delete cascade,
  alias varchar(255) not null unique
);
create index if not exists idx_iso_process_alias_group on public.iso_process_aliases(process_group_id);

insert into public.iso_process_aliases (process_group_id, alias)
select process.id, aliases.alias
from (values
  ('CAMPUS_DIRECTOR', 'Management/Leadership'),
  ('CAMPUS_DIRECTOR', 'Gender and Development'),
  ('ACADEMIC_AFFAIRS', 'Educational Delivery Processes'),
  ('STUDENT_AFFAIRS', 'Student Affairs Services'),
  ('ADMIN_FINANCE', 'Finance/Budget/Accounting/Cashier'),
  ('ADMIN_FINANCE', 'Procurement/BAC'),
  ('RESEARCH_DEVELOPMENT', 'Research and Development'),
  ('EXTENSION_COMMUNITY', 'Extension'),
  ('PRODUCTION_RESOURCE', 'Production and Resource Generation'),
  ('QUALITY_ASSURANCE', 'Document Controller'),
  ('REGISTRAR', 'Registrar/MIS'),
  ('LIBRARY', 'Library Services'),
  ('SUPPLY_PROPERTY', 'Supply/Property Custodian'),
  ('HR_RECORDS', 'HRMO'),
  ('SECURITY_PLANT', 'DRRM'),
  ('SECURITY_PLANT', 'Maintenance/General Services')
) as aliases(process_code, alias)
join public.iso_process_groups process on process.code = aliases.process_code
on conflict (alias) do update set process_group_id = excluded.process_group_id;

insert into public.iso_process_unit_mappings (process_group_id, organizational_unit_id)
select process.id, unit.id
from (values
  ('CAMPUS_DIRECTOR', 'GAD'), ('ACADEMIC_AFFAIRS', 'GRADUATE_SCHOOL'),
  ('ADMIN_FINANCE', 'BAC'), ('QUALITY_ASSURANCE', 'ADMIN'),
  ('GUIDANCE_PLACEMENT', 'GUIDANCE'), ('MEDICAL_DENTAL', 'MEDICAL_DENTAL')
) as mapping(process_code, unit_code)
join public.iso_process_groups process on process.code = mapping.process_code
join public.organizational_units unit on unit.code = mapping.unit_code
on conflict (process_group_id, organizational_unit_id) do nothing;

alter table public.iso_process_aliases enable row level security;
revoke all on table public.iso_process_aliases from anon, authenticated;
grant all on table public.iso_process_aliases to service_role;
