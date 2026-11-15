BEGIN;

ALTER TABLE public.car_forms
  ADD COLUMN IF NOT EXISTS source_file_path text,
  ADD COLUMN IF NOT EXISTS source_file_name text,
  ADD COLUMN IF NOT EXISTS source_mime_type varchar(120),
  ADD COLUMN IF NOT EXISTS source_file_size bigint,
  ADD COLUMN IF NOT EXISTS source_sha256 varchar(64),
  ADD COLUMN IF NOT EXISTS ocr_model varchar(120),
  ADD COLUMN IF NOT EXISTS ocr_version varchar(80),
  ADD COLUMN IF NOT EXISTS ocr_extracted_at timestamptz,
  ADD COLUMN IF NOT EXISTS ocr_raw_json jsonb,
  ADD COLUMN IF NOT EXISTS ocr_confidence_json jsonb,
  ADD COLUMN IF NOT EXISTS human_verified_by_id uuid,
  ADD COLUMN IF NOT EXISTS human_verified_at timestamptz;

ALTER TABLE public.car_forms
  ADD CONSTRAINT car_forms_human_verified_by_id_fkey
  FOREIGN KEY (human_verified_by_id) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.car_forms
  ADD CONSTRAINT car_forms_source_sha256_format
  CHECK (source_sha256 IS NULL OR source_sha256 ~ '^[0-9a-f]{64}$') NOT VALID;

CREATE INDEX IF NOT EXISTS idx_car_forms_source_sha256 ON public.car_forms(source_sha256);
CREATE INDEX IF NOT EXISTS idx_car_forms_human_verified_by_id ON public.car_forms(human_verified_by_id);

COMMIT;
