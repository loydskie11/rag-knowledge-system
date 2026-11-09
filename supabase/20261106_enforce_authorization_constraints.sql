drop index if exists public.uq_users_single_document_controller;

alter table public.users drop constraint if exists users_base_role_check;
alter table public.users add constraint users_base_role_check
  check (role in ('SYSTEM_ADMIN', 'PERSONNEL', 'STUDENT'));

alter table public.user_assignments drop constraint if exists user_assignments_type_scope_check;
alter table public.user_assignments add constraint user_assignments_type_scope_check check (
  (assignment_type in ('OFFICE_HEAD', 'OFFICE_MEMBER') and scope_type = 'OFFICE') or
  (assignment_type in ('COLLEGE_DEAN', 'COLLEGE_SECRETARY') and scope_type = 'COLLEGE') or
  (assignment_type in ('PROGRAM_CHAIR', 'FACULTY_MEMBER') and scope_type = 'PROGRAM') or
  (assignment_type in ('QA_HEAD', 'DOCUMENT_CONTROLLER') and scope_type = 'CAMPUS') or
  (assignment_type in ('IQA_AUDITOR', 'SURVEY_ANALYST') and scope_type in ('CAMPUS', 'OFFICE'))
);

create unique index if not exists uq_user_assignment_effective_scope
  on public.user_assignments(user_id, assignment_type, scope_type, coalesce(scope_id, '00000000-0000-0000-0000-000000000000'::uuid));
