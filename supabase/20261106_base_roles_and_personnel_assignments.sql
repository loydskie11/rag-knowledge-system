-- Three base roles plus repeatable, scoped personnel assignments.
create table if not exists public.organizational_units (
  id uuid primary key default gen_random_uuid(),
  code varchar(80) not null unique,
  name varchar(255) not null unique,
  unit_type varchar(30) not null check (unit_type in ('OFFICE', 'COLLEGE')),
  is_active boolean not null default true,
  created_at timestamp without time zone not null default now()
);

create table if not exists public.academic_programs (
  id uuid primary key default gen_random_uuid(),
  code varchar(50) not null unique,
  name varchar(255) not null,
  college_unit_id uuid not null references public.organizational_units(id) on delete restrict,
  is_active boolean not null default true,
  created_at timestamp without time zone not null default now()
);

create table if not exists public.user_assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  assignment_type varchar(60) not null check (assignment_type in (
    'OFFICE_HEAD', 'OFFICE_MEMBER', 'COLLEGE_DEAN', 'COLLEGE_SECRETARY',
    'PROGRAM_CHAIR', 'FACULTY_MEMBER', 'QA_HEAD', 'IQA_AUDITOR',
    'SURVEY_ANALYST', 'DOCUMENT_CONTROLLER'
  )),
  scope_type varchar(30) not null check (scope_type in ('CAMPUS', 'OFFICE', 'COLLEGE', 'PROGRAM')),
  scope_id uuid,
  is_primary boolean not null default false,
  is_active boolean not null default true,
  created_at timestamp without time zone not null default now(),
  constraint user_assignments_scope_required check (
    (scope_type = 'CAMPUS' and scope_id is null) or (scope_type <> 'CAMPUS' and scope_id is not null)
  ),
  constraint uq_user_assignment_scope unique (user_id, assignment_type, scope_type, scope_id)
);

create table if not exists public.iso_process_groups (
  id uuid primary key default gen_random_uuid(),
  code varchar(80) not null unique,
  name varchar(255) not null unique,
  is_active boolean not null default true
);

create table if not exists public.iso_process_unit_mappings (
  id uuid primary key default gen_random_uuid(),
  process_group_id uuid not null references public.iso_process_groups(id) on delete cascade,
  organizational_unit_id uuid not null references public.organizational_units(id) on delete cascade,
  constraint uq_iso_process_unit unique (process_group_id, organizational_unit_id)
);

create index if not exists idx_user_assignments_user_active on public.user_assignments(user_id, is_active);
create index if not exists idx_user_assignments_type_scope on public.user_assignments(assignment_type, scope_type, scope_id) where is_active;
create unique index if not exists uq_active_document_controller on public.user_assignments(assignment_type)
  where assignment_type = 'DOCUMENT_CONTROLLER' and is_active;
create unique index if not exists uq_user_primary_assignment on public.user_assignments(user_id)
  where is_primary and is_active;
create index if not exists idx_academic_programs_college on public.academic_programs(college_unit_id);
create index if not exists idx_iso_process_mapping_group on public.iso_process_unit_mappings(process_group_id);
create index if not exists idx_iso_process_mapping_unit on public.iso_process_unit_mappings(organizational_unit_id);

insert into public.organizational_units (code, name, unit_type) values
  ('CD', 'CD Office', 'OFFICE'), ('ACCOUNTING', 'Accounting Office', 'OFFICE'),
  ('BUDGET_FINANCE', 'Budget / Finance Office', 'OFFICE'), ('CASHIER', 'Cashier''s Office', 'OFFICE'),
  ('CSU', 'Civil Security Unit (CSU) Office', 'OFFICE'), ('MEDICAL_DENTAL', 'Medical Clinic / Dental', 'OFFICE'),
  ('ADMIN', 'Admin Office', 'OFFICE'), ('CAS_OFFICE', 'CAS Office', 'OFFICE'),
  ('COTE_OFFICE', 'COTE Office', 'OFFICE'), ('COED_OFFICE', 'COED Office', 'OFFICE'),
  ('MIS', 'MIS Office', 'OFFICE'), ('GUIDANCE', 'Guidance Office', 'OFFICE'),
  ('GRADUATE_SCHOOL', 'Graduate School Office', 'OFFICE'), ('HRMO', 'Human Resource and Management Office', 'OFFICE'),
  ('LIBRARY', 'Library Office', 'OFFICE'), ('MAINTENANCE', 'Maintenance Office', 'OFFICE'),
  ('BAC', 'BAC Office', 'OFFICE'), ('PAID', 'Public Assistance and Information Desk', 'OFFICE'),
  ('REGISTRAR', 'Registrar''s Office', 'OFFICE'), ('SCHOLARSHIP', 'Scholarship Office', 'OFFICE'),
  ('SAO_DEAN', 'SAO Dean''s Office', 'OFFICE'), ('SUPPLY', 'Supply Office', 'OFFICE'),
  ('GAD', 'GAD Office', 'OFFICE'), ('PLANNING', 'Planning & Development Office', 'OFFICE'),
  ('DOI', 'DOI Office', 'OFFICE'), ('RESEARCH', 'Research Office', 'OFFICE'),
  ('EXTENSION', 'Extension Office', 'OFFICE'),
  ('COED', 'College of Education (COEd)', 'COLLEGE'),
  ('CAS', 'College of Arts and Sciences (CAS)', 'COLLEGE'),
  ('CAFES', 'College of Agriculture, Forestry, & Environmental Science (CAFES)', 'COLLEGE'),
  ('COTE', 'College of Technology and Engineering (COTE)', 'COLLEGE'),
  ('CHTM', 'College of Hospitality and Tourism Management (CHTM)', 'COLLEGE')
on conflict (code) do update set name = excluded.name, unit_type = excluded.unit_type, is_active = true;

insert into public.academic_programs (code, name, college_unit_id)
select values_table.code, values_table.name, units.id
from (values
  ('BEED', 'Bachelor of Elementary Education (BEED)', 'COED'),
  ('BSED_MATH', 'BSEd major in Mathematics (BSEd-Math)', 'COED'),
  ('BSED_ENGLISH', 'BSEd major in English (BSEd-Eng)', 'COED'),
  ('BTLED_HE', 'BTLEd major in Home Economics (BTLEd-HE)', 'COED'),
  ('AB_ELS', 'BA in English Language Studies (AB-ELS)', 'CAS'),
  ('AB_LIT', 'BA in Literature (AB-Lit)', 'CAS'), ('AB_PSYCH', 'BA in Psychology (AB-Psych)', 'CAS'),
  ('BSF', 'Bachelor of Science in Forestry (BSF)', 'CAFES'),
  ('BSA', 'Bachelor of Science in Agriculture (BSA)', 'CAFES'),
  ('BSES', 'Bachelor of Science in Environmental Science (BSES)', 'CAFES'),
  ('BSIE', 'BS in Industrial Engineering (BSIE)', 'COTE'),
  ('BSIT', 'BS in Information Technology (BSIT)', 'COTE'),
  ('BIT_AT', 'BIT major in Automotive Technology (BIT-AT)', 'COTE'),
  ('BIT_CT', 'BIT major in Computer Technology (BIT-CT)', 'COTE'),
  ('BIT_DT', 'BIT major in Drafting Technology (BIT-DT)', 'COTE'),
  ('BIT_ET', 'BIT major in Electronics Technology (BIT-ET)', 'COTE'),
  ('BIT_GT', 'BIT major in Garments Technology (BIT-GT)', 'COTE'),
  ('BSHM', 'BS in Hospitality Management (BSHM)', 'CHTM'),
  ('BSTM', 'BS in Tourism Management (BSTM)', 'CHTM')
) as values_table(code, name, college_code)
join public.organizational_units units on units.code = values_table.college_code
on conflict (code) do update set name = excluded.name, college_unit_id = excluded.college_unit_id, is_active = true;

insert into public.iso_process_groups (code, name) values
  ('CAMPUS_DIRECTOR', 'Campus Director'), ('ACADEMIC_AFFAIRS', 'Academic Affairs'),
  ('STUDENT_AFFAIRS', 'Student Affairs & Services'), ('ADMIN_FINANCE', 'Administrative & Finance'),
  ('RESEARCH_DEVELOPMENT', 'Research & Development'), ('EXTENSION_COMMUNITY', 'Extension & Community Services'),
  ('PRODUCTION_RESOURCE', 'Production & Resource Generation'), ('QUALITY_ASSURANCE', 'Quality Assurance & Management (QAU)'),
  ('REGISTRAR', 'Registrar''s Office'), ('GUIDANCE_PLACEMENT', 'Guidance & Placement'),
  ('LIBRARY', 'University Library'), ('MEDICAL_DENTAL', 'Medical & Dental Clinic'),
  ('SUPPLY_PROPERTY', 'Supply & Property Unit'), ('HR_RECORDS', 'HR & Records Management'),
  ('MIS_IT', 'MIS & Information Technology Unit'), ('SECURITY_PLANT', 'Security & Physical Plant Unit')
on conflict (code) do update set name = excluded.name, is_active = true;

insert into public.iso_process_unit_mappings (process_group_id, organizational_unit_id)
select process.id, unit.id from (values
  ('CAMPUS_DIRECTOR', 'CD'), ('ACADEMIC_AFFAIRS', 'DOI'), ('ACADEMIC_AFFAIRS', 'CAS_OFFICE'),
  ('ACADEMIC_AFFAIRS', 'COTE_OFFICE'), ('ACADEMIC_AFFAIRS', 'COED_OFFICE'),
  ('STUDENT_AFFAIRS', 'SAO_DEAN'), ('STUDENT_AFFAIRS', 'SCHOLARSHIP'),
  ('ADMIN_FINANCE', 'ADMIN'), ('ADMIN_FINANCE', 'ACCOUNTING'), ('ADMIN_FINANCE', 'BUDGET_FINANCE'),
  ('ADMIN_FINANCE', 'CASHIER'), ('RESEARCH_DEVELOPMENT', 'RESEARCH'), ('EXTENSION_COMMUNITY', 'EXTENSION'),
  ('PRODUCTION_RESOURCE', 'PLANNING'), ('QUALITY_ASSURANCE', 'ADMIN'), ('REGISTRAR', 'REGISTRAR'),
  ('GUIDANCE_PLACEMENT', 'GUIDANCE'), ('LIBRARY', 'LIBRARY'), ('MEDICAL_DENTAL', 'MEDICAL_DENTAL'),
  ('SUPPLY_PROPERTY', 'SUPPLY'), ('HR_RECORDS', 'HRMO'), ('MIS_IT', 'MIS'),
  ('SECURITY_PLANT', 'CSU'), ('SECURITY_PLANT', 'MAINTENANCE')
) as mapping(process_code, unit_code)
join public.iso_process_groups process on process.code = mapping.process_code
join public.organizational_units unit on unit.code = mapping.unit_code
on conflict (process_group_id, organizational_unit_id) do nothing;

-- Preserve existing people by translating their former role/office/program fields.
insert into public.user_assignments (user_id, assignment_type, scope_type, scope_id, is_primary)
select users.id,
  case when users.role = 'OFFICE_HEAD' then 'OFFICE_HEAD' else 'OFFICE_MEMBER' end,
  'OFFICE', units.id, users.role = 'OFFICE_HEAD'
from public.users users
join public.organizational_units units on units.code = case
  when users.administrative_office in ('HRMO', 'HR & Records Management') then 'HRMO'
  when users.administrative_office in ('Academic Affairs', 'Director of Instruction') then 'DOI'
  when users.administrative_office in ('Registrar/MIS', 'Registrar''s Office') then 'REGISTRAR'
  when users.administrative_office in ('Student Affairs & Services', 'Student Affairs Services') then 'SAO_DEAN'
  when users.administrative_office in ('Research & Development', 'Research Office') then 'RESEARCH'
  when users.administrative_office in ('Extension & Community Services', 'Extension Office') then 'EXTENSION'
  when users.administrative_office in ('MIS & Information Technology Unit', 'MIS Office') then 'MIS'
  else null end
where coalesce(users.administrative_office, '') <> ''
on conflict (user_id, assignment_type, scope_type, scope_id) do nothing;

insert into public.user_assignments (user_id, assignment_type, scope_type, scope_id, is_primary)
select users.id, 'FACULTY_MEMBER', 'PROGRAM', programs.id,
  not exists (select 1 from public.user_assignments current where current.user_id = users.id and current.is_primary)
from public.users users join public.academic_programs programs on programs.code = users.department
where users.role in ('FACULTY', 'PROGRAM_CHAIR', 'OFFICE_HEAD', 'COLLEGE_DEAN', 'COLLEGE_SECRETARY')
on conflict (user_id, assignment_type, scope_type, scope_id) do nothing;

insert into public.user_assignments (user_id, assignment_type, scope_type, scope_id, is_primary)
select users.id, 'IQA_AUDITOR', 'CAMPUS', null,
  not exists (select 1 from public.user_assignments current where current.user_id = users.id and current.is_primary)
from public.users users where users.is_iqa_auditor is true
on conflict (user_id, assignment_type, scope_type, scope_id) do nothing;

update public.users set role = 'PERSONNEL'
where role in ('ADMIN', 'OFFICE_HEAD', 'COLLEGE_DEAN', 'PROGRAM_CHAIR', 'COLLEGE_SECRETARY', 'FACULTY', 'DOCUMENT_CONTROLLER', 'IQA');

alter table public.organizational_units enable row level security;
alter table public.academic_programs enable row level security;
alter table public.user_assignments enable row level security;
alter table public.iso_process_groups enable row level security;
alter table public.iso_process_unit_mappings enable row level security;
revoke all on table public.organizational_units, public.academic_programs, public.user_assignments,
  public.iso_process_groups, public.iso_process_unit_mappings from anon, authenticated;
grant all on table public.organizational_units, public.academic_programs, public.user_assignments,
  public.iso_process_groups, public.iso_process_unit_mappings to service_role;
