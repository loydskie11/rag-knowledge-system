BEGIN;

ALTER TABLE public.iso_audit_findings
  ADD COLUMN IF NOT EXISTS requirement_reference text,
  ADD COLUMN IF NOT EXISTS objective_evidence text,
  ADD COLUMN IF NOT EXISTS nonconformity_statement text;

UPDATE public.iso_audit_findings
SET nonconformity_statement = finding_text
WHERE nonconformity_statement IS NULL AND nullif(trim(finding_text), '') IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.car_classification_rules (
  category varchar(40) PRIMARY KEY,
  display_name varchar(100) NOT NULL,
  requires_car boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT car_classification_rules_category_valid
    CHECK (category IN ('MAJOR', 'MINOR', 'OBSERVATION', 'OPPORTUNITY_FOR_IMPROVEMENT'))
);

INSERT INTO public.car_classification_rules (category, display_name, requires_car, is_active, sort_order)
VALUES
  ('MAJOR', 'Major Nonconformity', true, true, 10),
  ('MINOR', 'Minor Nonconformity', true, true, 20),
  ('OBSERVATION', 'Observation', false, true, 30),
  ('OPPORTUNITY_FOR_IMPROVEMENT', 'Opportunity for Improvement', false, true, 40)
ON CONFLICT (category) DO NOTHING;

ALTER TABLE public.car_classification_rules ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.car_forms
  ADD CONSTRAINT car_forms_issued_category_valid
  CHECK (status = 'Draft' OR finding_category IN ('MAJOR', 'MINOR', 'OBSERVATION', 'OPPORTUNITY_FOR_IMPROVEMENT'))
  NOT VALID;

COMMIT;
