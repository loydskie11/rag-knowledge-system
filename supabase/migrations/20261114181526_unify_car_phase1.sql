BEGIN;

CREATE TABLE IF NOT EXISTS public.iso_audit_findings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id uuid NOT NULL REFERENCES public.iso_audit_cycles(id) ON DELETE RESTRICT,
  iso_clause_id uuid REFERENCES public.iso_requirements(id) ON DELETE SET NULL,
  responsible_office varchar(255) NOT NULL,
  finding_text text NOT NULL,
  finding_category varchar(50) NOT NULL DEFAULT 'UNKNOWN',
  source_type varchar(30) NOT NULL DEFAULT 'MANUAL',
  source_record_key varchar(100) UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.iso_audit_findings ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.car_forms ADD COLUMN IF NOT EXISTS cycle_id uuid;
ALTER TABLE public.car_forms ADD COLUMN IF NOT EXISTS audit_finding_id uuid;
ALTER TABLE public.car_forms ADD COLUMN IF NOT EXISTS responsible_office varchar(255);
ALTER TABLE public.qms_action_plans ADD COLUMN IF NOT EXISTS car_id uuid;

INSERT INTO public.iso_audit_cycles (id, name, standard_version, status, created_at)
SELECT gen_random_uuid(), source.cycle_year, 'ISO 9001:2015', 'ACTIVE', now()
FROM (
  SELECT DISTINCT cycle_year FROM public.car_forms WHERE cycle_year IS NOT NULL
  UNION
  SELECT DISTINCT cycle_year FROM public.qms_action_plans WHERE cycle_year IS NOT NULL
) source
WHERE NOT EXISTS (
  SELECT 1 FROM public.iso_audit_cycles cycle WHERE cycle.name = source.cycle_year
);

UPDATE public.car_forms car
SET cycle_id = cycle.id,
    responsible_office = COALESCE(NULLIF(car.responsible_office, ''), NULLIF(car.area, ''), 'Unassigned')
FROM public.iso_audit_cycles cycle
WHERE cycle.name = car.cycle_year
  AND (car.cycle_id IS NULL OR car.responsible_office IS NULL);

INSERT INTO public.iso_audit_findings (
  cycle_id, iso_clause_id, responsible_office, finding_text,
  finding_category, source_type, source_record_key, created_at
)
SELECT
  car.cycle_id,
  car.iso_clause_id,
  COALESCE(NULLIF(car.responsible_office, ''), 'Unassigned'),
  COALESCE(NULLIF(car.findings, ''), 'Legacy CAR finding was not recorded.'),
  COALESCE(NULLIF(car.finding_category, ''), 'UNKNOWN'),
  'CAR_MIGRATION',
  'car:' || car.id::text,
  COALESCE(car.created_at, now())
FROM public.car_forms car
WHERE car.audit_finding_id IS NULL
ON CONFLICT (source_record_key) DO NOTHING;

UPDATE public.car_forms car
SET audit_finding_id = finding.id
FROM public.iso_audit_findings finding
WHERE finding.source_record_key = 'car:' || car.id::text
  AND car.audit_finding_id IS NULL;

-- Link exact legacy matches before creating a parent CAR for unmatched plans.
WITH ranked_matches AS (
  SELECT
    plan.id AS plan_id,
    car.id AS car_id,
    row_number() OVER (PARTITION BY plan.id ORDER BY car.created_at, car.id) AS match_rank
  FROM public.qms_action_plans plan
  JOIN public.car_forms car
    ON car.cycle_year = plan.cycle_year
   AND lower(trim(COALESCE(car.responsible_office, car.area, ''))) = lower(trim(plan.auditee_office))
   AND lower(trim(COALESCE(car.findings, ''))) = lower(trim(plan.findings))
  WHERE plan.car_id IS NULL
)
UPDATE public.qms_action_plans plan
SET car_id = matched.car_id
FROM ranked_matches matched
WHERE plan.id = matched.plan_id
  AND matched.match_rank = 1;

INSERT INTO public.iso_audit_findings (
  cycle_id, responsible_office, finding_text, finding_category,
  source_type, source_record_key, created_at
)
SELECT
  cycle.id,
  plan.auditee_office,
  plan.findings,
  'UNKNOWN',
  'QMS_PLAN_MIGRATION',
  'qms:' || plan.id::text,
  COALESCE(plan.created_at, now())
FROM public.qms_action_plans plan
JOIN public.iso_audit_cycles cycle ON cycle.name = plan.cycle_year
WHERE plan.car_id IS NULL
ON CONFLICT (source_record_key) DO NOTHING;

INSERT INTO public.car_forms (
  id, cycle_year, cycle_id, audit_finding_id, car_no, date_issued,
  finding_category, initiator, area, responsible_office, findings,
  root_cause, immediate_action, corrective_measure, measures_proposed_by,
  target_date, status, created_at
)
SELECT
  gen_random_uuid(),
  plan.cycle_year,
  finding.cycle_id,
  finding.id,
  'MIGRATED-QMS-' || upper(left(replace(plan.id::text, '-', ''), 8)),
  to_char(COALESCE(plan.created_at, now()), 'YYYY-MM-DD'),
  finding.finding_category,
  plan.created_by,
  plan.auditee_office,
  plan.auditee_office,
  plan.findings,
  plan.root_cause,
  plan.immediate_action,
  plan.corrective_measure,
  plan.personnel_responsible,
  plan.target_date,
  CASE
    WHEN plan.status = 'Completed' THEN 'Awaiting Verification'
    WHEN plan.status IN ('In Progress', 'Overdue') THEN 'In Progress'
    ELSE 'Response Submitted'
  END,
  COALESCE(plan.created_at, now())
FROM public.qms_action_plans plan
JOIN public.iso_audit_findings finding ON finding.source_record_key = 'qms:' || plan.id::text
WHERE plan.car_id IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.car_forms car
    WHERE car.audit_finding_id = finding.id
  );

UPDATE public.qms_action_plans plan
SET car_id = car.id
FROM public.iso_audit_findings finding
JOIN public.car_forms car ON car.audit_finding_id = finding.id
WHERE finding.source_record_key = 'qms:' || plan.id::text
  AND plan.car_id IS NULL;

ALTER TABLE public.car_forms ALTER COLUMN cycle_id SET NOT NULL;
ALTER TABLE public.car_forms ALTER COLUMN audit_finding_id SET NOT NULL;
ALTER TABLE public.car_forms ALTER COLUMN responsible_office SET NOT NULL;
ALTER TABLE public.qms_action_plans ALTER COLUMN car_id SET NOT NULL;

ALTER TABLE public.car_forms
  ADD CONSTRAINT car_forms_cycle_id_fkey FOREIGN KEY (cycle_id)
  REFERENCES public.iso_audit_cycles(id) ON DELETE RESTRICT;
ALTER TABLE public.car_forms
  ADD CONSTRAINT car_forms_audit_finding_id_fkey FOREIGN KEY (audit_finding_id)
  REFERENCES public.iso_audit_findings(id) ON DELETE RESTRICT;
ALTER TABLE public.qms_action_plans
  ADD CONSTRAINT qms_action_plans_car_id_fkey FOREIGN KEY (car_id)
  REFERENCES public.car_forms(id) ON DELETE RESTRICT;

CREATE UNIQUE INDEX uq_qms_action_plans_car_id ON public.qms_action_plans(car_id);
CREATE INDEX idx_car_forms_cycle_id ON public.car_forms(cycle_id);
CREATE INDEX idx_car_forms_audit_finding_id ON public.car_forms(audit_finding_id);
CREATE INDEX idx_car_forms_responsible_office ON public.car_forms(responsible_office);
CREATE INDEX idx_iso_audit_findings_cycle_office ON public.iso_audit_findings(cycle_id, responsible_office);

COMMIT;
