-- Remove two legacy QMS imports that cannot satisfy the current CAR workflow.
-- Their status/notification children cascade; action plans use RESTRICT and must
-- be removed explicitly first.
delete from public.qms_action_plans
where car_id in (
  'a255e993-33b4-4bab-855b-385043b7d799'::uuid,
  '08d51533-abec-45c9-a178-6c3391662422'::uuid
);

delete from public.car_forms
where id in (
  'a255e993-33b4-4bab-855b-385043b7d799'::uuid,
  '08d51533-abec-45c9-a178-6c3391662422'::uuid
)
and status = 'In Progress'
and finding_category = 'UNKNOWN';

alter table public.car_forms validate constraint car_forms_effectiveness_outcome_valid;
alter table public.car_forms validate constraint car_forms_issued_category_valid;
alter table public.car_forms validate constraint car_forms_root_cause_method_valid;
alter table public.car_forms validate constraint car_forms_source_sha256_format;
alter table public.qms_action_plans validate constraint qms_action_plans_action_type_valid;
