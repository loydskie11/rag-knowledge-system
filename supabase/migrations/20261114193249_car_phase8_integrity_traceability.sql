BEGIN;

ALTER TABLE public.car_forms
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS issued_at timestamptz,
  ADD COLUMN IF NOT EXISTS acknowledged_at timestamptz,
  ADD COLUMN IF NOT EXISTS in_progress_at timestamptz,
  ADD COLUMN IF NOT EXISTS awaiting_verification_at timestamptz,
  ADD COLUMN IF NOT EXISTS returned_at timestamptz,
  ADD COLUMN IF NOT EXISTS closed_at timestamptz,
  ADD COLUMN IF NOT EXISTS voided_at timestamptz,
  ADD COLUMN IF NOT EXISTS voided_by_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS void_reason text;

WITH duplicates AS (
  SELECT id, row_number() OVER (PARTITION BY cycle_id, car_no ORDER BY created_at, id) AS duplicate_rank
  FROM public.car_forms WHERE car_no IS NOT NULL AND btrim(car_no) <> ''
)
UPDATE public.car_forms AS car
SET car_no = car.car_no || '-LEGACY-' || upper(left(car.id::text, 8))
FROM duplicates
WHERE duplicates.id = car.id AND duplicates.duplicate_rank > 1;

CREATE UNIQUE INDEX IF NOT EXISTS uq_car_forms_cycle_car_no
  ON public.car_forms(cycle_id, car_no)
  WHERE car_no IS NOT NULL AND btrim(car_no) <> '';

CREATE TABLE public.car_number_counters (
  cycle_id uuid PRIMARY KEY REFERENCES public.iso_audit_cycles(id) ON DELETE CASCADE,
  next_number integer NOT NULL DEFAULT 1 CHECK (next_number > 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.car_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  car_id uuid NOT NULL REFERENCES public.car_forms(id) ON DELETE CASCADE,
  from_status varchar(50),
  to_status varchar(50) NOT NULL,
  reason text,
  changed_by_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  changed_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.car_revision_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  car_id uuid NOT NULL REFERENCES public.car_forms(id) ON DELETE CASCADE,
  changed_fields jsonb NOT NULL,
  changed_by_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  changed_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT car_revision_history_changed_fields_object CHECK (jsonb_typeof(changed_fields) = 'object')
);

CREATE INDEX idx_car_status_history_car_changed ON public.car_status_history(car_id, changed_at DESC);
CREATE INDEX idx_car_revision_history_car_changed ON public.car_revision_history(car_id, changed_at DESC);
CREATE INDEX idx_car_forms_voided_by ON public.car_forms(voided_by_id);
ALTER TABLE public.car_number_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.car_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.car_revision_history ENABLE ROW LEVEL SECURITY;

-- Legacy test/import rows may predate the issued-category rule. Recreate the
-- NOT VALID constraint around the timestamp backfill so they remain readable
-- while all newly written rows continue to be enforced.
ALTER TABLE public.car_forms DROP CONSTRAINT IF EXISTS car_forms_issued_category_valid;
UPDATE public.car_forms
SET issued_at = CASE WHEN status <> 'Draft' THEN COALESCE(issued_at, created_at) ELSE issued_at END,
    acknowledged_at = CASE WHEN status IN ('Acknowledged','Response Submitted','In Progress','Awaiting Verification','Returned','Closed') THEN COALESCE(acknowledged_at, created_at) ELSE acknowledged_at END,
    closed_at = CASE WHEN status = 'Closed' THEN COALESCE(closed_at, verified_at, created_at) ELSE closed_at END,
    voided_at = CASE WHEN status = 'Void' THEN COALESCE(voided_at, created_at) ELSE voided_at END;
ALTER TABLE public.car_forms
  ADD CONSTRAINT car_forms_issued_category_valid
  CHECK (status = 'Draft' OR finding_category IN ('MAJOR','MINOR','OBSERVATION','OPPORTUNITY_FOR_IMPROVEMENT')) NOT VALID;

INSERT INTO public.car_status_history(car_id, from_status, to_status, reason, changed_at)
SELECT id, NULL, status, 'Legacy lifecycle baseline', created_at FROM public.car_forms;

COMMIT;
