BEGIN;

ALTER TABLE public.car_forms ADD COLUMN IF NOT EXISTS issued_by_id uuid;
ALTER TABLE public.car_forms ADD COLUMN IF NOT EXISTS acknowledged_by_id uuid;
ALTER TABLE public.car_forms ADD COLUMN IF NOT EXISTS assigned_to_id uuid;
ALTER TABLE public.car_forms ADD COLUMN IF NOT EXISTS verified_by_id uuid;

WITH candidates AS (
  SELECT car.id AS car_id, users.id AS user_id,
    row_number() OVER (
      PARTITION BY car.id
      ORDER BY CASE WHEN lower(trim(users.full_name)) = lower(trim(COALESCE(car.initiator, ''))) THEN 0 ELSE 1 END, users.id
    ) AS candidate_rank
  FROM public.car_forms car
  JOIN public.users users ON users.status = 'Active' AND (
    lower(trim(users.full_name)) = lower(trim(COALESCE(car.initiator, '')))
    OR lower(trim(users.full_name)) = lower(trim(COALESCE(car.auditor_name, '')))
    OR lower(trim(users.email)) = lower(trim(COALESCE(car.initiator, '')))
  )
  WHERE car.issued_by_id IS NULL
)
UPDATE public.car_forms car
SET issued_by_id = candidates.user_id
FROM candidates
WHERE car.id = candidates.car_id AND candidates.candidate_rank = 1;

WITH candidates AS (
  SELECT car.id AS car_id, users.id AS user_id,
    row_number() OVER (PARTITION BY car.id ORDER BY users.id) AS candidate_rank
  FROM public.car_forms car
  JOIN public.users users ON users.status = 'Active'
    AND lower(trim(users.full_name)) = lower(trim(COALESCE(car.acknowledged_by, '')))
  WHERE car.acknowledged_by_id IS NULL
)
UPDATE public.car_forms car
SET acknowledged_by_id = candidates.user_id
FROM candidates
WHERE car.id = candidates.car_id AND candidates.candidate_rank = 1;

WITH candidates AS (
  SELECT car.id AS car_id, users.id AS user_id,
    row_number() OVER (PARTITION BY car.id ORDER BY users.id) AS candidate_rank
  FROM public.car_forms car
  JOIN public.qms_action_plans plan ON plan.car_id = car.id
  JOIN public.users users ON users.status = 'Active'
    AND lower(trim(users.full_name)) = lower(trim(COALESCE(plan.personnel_responsible, '')))
  WHERE car.assigned_to_id IS NULL
)
UPDATE public.car_forms car
SET assigned_to_id = candidates.user_id
FROM candidates
WHERE car.id = candidates.car_id AND candidates.candidate_rank = 1;

ALTER TABLE public.car_forms
  ADD CONSTRAINT car_forms_issued_by_id_fkey FOREIGN KEY (issued_by_id)
  REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.car_forms
  ADD CONSTRAINT car_forms_acknowledged_by_id_fkey FOREIGN KEY (acknowledged_by_id)
  REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.car_forms
  ADD CONSTRAINT car_forms_assigned_to_id_fkey FOREIGN KEY (assigned_to_id)
  REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.car_forms
  ADD CONSTRAINT car_forms_verified_by_id_fkey FOREIGN KEY (verified_by_id)
  REFERENCES public.users(id) ON DELETE SET NULL;

CREATE INDEX idx_car_forms_issued_by_id ON public.car_forms(issued_by_id);
CREATE INDEX idx_car_forms_acknowledged_by_id ON public.car_forms(acknowledged_by_id);
CREATE INDEX idx_car_forms_assigned_to_id ON public.car_forms(assigned_to_id);

COMMIT;
