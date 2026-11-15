begin;

-- Colleges are represented by COLLEGE units, so these duplicate OFFICE units
-- must not appear in active office dropdowns or ISO routing.
delete from public.iso_process_unit_mappings
where organizational_unit_id in (
  select id
  from public.organizational_units
  where code in ('CAS_OFFICE', 'COED_OFFICE', 'COTE_OFFICE')
);

update public.organizational_units
set is_active = false
where code in ('CAS_OFFICE', 'COED_OFFICE', 'COTE_OFFICE');

-- QA is a real campus service office and remains distinct from the
-- campus-wide QA_HEAD personnel assignment.
insert into public.organizational_units (id, code, name, unit_type, is_active)
values (gen_random_uuid(), 'QA_OFFICE', 'Quality Assurance Office', 'OFFICE', true)
on conflict (code) do update
set name = excluded.name,
    unit_type = excluded.unit_type,
    is_active = true;

insert into public.iso_process_unit_mappings (id, process_group_id, organizational_unit_id)
select gen_random_uuid(), process_group.id, qa_office.id
from public.iso_process_groups process_group
cross join public.organizational_units qa_office
where process_group.code = 'QUALITY_ASSURANCE'
  and qa_office.code = 'QA_OFFICE'
on conflict (process_group_id, organizational_unit_id) do nothing;

insert into public.system_events_logs (user_email, event_type, description)
values (
  'admin@ctu.edu.ph',
  'Reference Data',
  'Archived duplicate CAS, COED, and COTE office records; added Quality Assurance Office and mapped it to Quality Assurance & Management.'
);

commit;
