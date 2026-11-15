BEGIN;

DROP INDEX IF EXISTS public.uq_qms_action_plans_car_id;

ALTER TABLE public.car_forms
  ADD COLUMN IF NOT EXISTS root_cause_method varchar(30),
  ADD COLUMN IF NOT EXISTS root_cause_analysis jsonb,
  ADD COLUMN IF NOT EXISTS response_submitted_by_id uuid,
  ADD COLUMN IF NOT EXISTS response_submitted_at timestamptz;

ALTER TABLE public.car_forms
  ADD CONSTRAINT car_forms_response_submitted_by_id_fkey
  FOREIGN KEY (response_submitted_by_id) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.car_forms
  ADD CONSTRAINT car_forms_root_cause_method_valid
  CHECK (root_cause_method IS NULL OR root_cause_method IN ('FIVE_WHYS', 'FISHBONE', 'FREE_FORM')) NOT VALID;

ALTER TABLE public.qms_action_plans
  ADD COLUMN IF NOT EXISTS sequence_number integer,
  ADD COLUMN IF NOT EXISTS action_type varchar(30),
  ADD COLUMN IF NOT EXISTS expected_evidence text,
  ADD COLUMN IF NOT EXISTS owner_user_id uuid;

ALTER TABLE public.qms_action_plans
  ADD CONSTRAINT qms_action_plans_owner_user_id_fkey
  FOREIGN KEY (owner_user_id) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.qms_action_plans
  ADD CONSTRAINT qms_action_plans_action_type_valid
  CHECK (action_type IS NULL OR action_type IN ('CORRECTION_CONTAINMENT', 'CORRECTIVE_ACTION')) NOT VALID;

WITH numbered AS (
  SELECT id, row_number() OVER (PARTITION BY car_id ORDER BY created_at, id) AS sequence_number
  FROM public.qms_action_plans
)
UPDATE public.qms_action_plans plan
SET sequence_number = numbered.sequence_number,
    action_type = COALESCE(plan.action_type, 'CORRECTIVE_ACTION'),
    expected_evidence = COALESCE(NULLIF(plan.expected_evidence, ''), 'Implementation evidence and effectiveness record'),
    owner_user_id = COALESCE(plan.owner_user_id, car.assigned_to_id)
FROM numbered, public.car_forms car
WHERE plan.id = numbered.id AND car.id = plan.car_id;

ALTER TABLE public.qms_action_plans ALTER COLUMN sequence_number SET NOT NULL;
ALTER TABLE public.qms_action_plans ALTER COLUMN action_type SET NOT NULL;
ALTER TABLE public.qms_action_plans ALTER COLUMN expected_evidence SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_qms_action_plan_sequence ON public.qms_action_plans(car_id, sequence_number);
CREATE INDEX IF NOT EXISTS idx_qms_action_plans_owner_user_id ON public.qms_action_plans(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_car_forms_response_submitted_by_id ON public.car_forms(response_submitted_by_id);

COMMIT;
