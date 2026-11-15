BEGIN;

ALTER TABLE public.car_forms
  ADD COLUMN IF NOT EXISTS effectiveness_outcome varchar(50),
  ADD COLUMN IF NOT EXISTS verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS reopened_by_id uuid,
  ADD COLUMN IF NOT EXISTS reopened_at timestamptz,
  ADD COLUMN IF NOT EXISTS reopen_reason text,
  ADD COLUMN IF NOT EXISTS reopen_count integer NOT NULL DEFAULT 0;

ALTER TABLE public.car_forms
  ADD CONSTRAINT car_forms_effectiveness_outcome_valid
  CHECK (effectiveness_outcome IS NULL OR effectiveness_outcome IN ('EFFECTIVE', 'PARTIALLY_EFFECTIVE', 'INEFFECTIVE', 'ADDITIONAL_EVIDENCE_REQUIRED')) NOT VALID;

ALTER TABLE public.car_forms
  ADD CONSTRAINT car_forms_reopened_by_id_fkey
  FOREIGN KEY (reopened_by_id) REFERENCES public.users(id) ON DELETE SET NULL;

CREATE TABLE public.car_verification_evidences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  car_id uuid NOT NULL REFERENCES public.car_forms(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  storage_path text NOT NULL,
  mime_type varchar(120),
  file_size bigint NOT NULL,
  sha256 varchar(64) NOT NULL,
  notes text,
  uploaded_by_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT car_verification_evidence_sha256_format CHECK (sha256 ~ '^[0-9a-f]{64}$')
);

CREATE INDEX idx_car_verification_evidences_car_id ON public.car_verification_evidences(car_id);
CREATE INDEX idx_car_forms_reopened_by_id ON public.car_forms(reopened_by_id);
ALTER TABLE public.car_verification_evidences ENABLE ROW LEVEL SECURITY;

COMMIT;
