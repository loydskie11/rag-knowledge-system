-- Establish the authoritative CAR lifecycle without deleting existing records.
UPDATE public.car_forms SET status = 'Issued' WHERE status IS NULL OR status IN ('Open', 'OPEN');
UPDATE public.car_forms SET status = 'Awaiting Verification' WHERE status IN ('Under Review', 'UNDER REVIEW');
UPDATE public.car_forms SET status = 'In Progress' WHERE status IN ('Pending', 'Active');

ALTER TABLE public.car_forms ALTER COLUMN status SET DEFAULT 'Issued';

ALTER TABLE public.car_forms DROP CONSTRAINT IF EXISTS car_forms_status_check;
ALTER TABLE public.car_forms
  ADD CONSTRAINT car_forms_status_check CHECK (
    status IN (
      'Draft', 'Issued', 'Acknowledged', 'Response Submitted', 'In Progress',
      'Awaiting Verification', 'Returned', 'Closed', 'Void'
    )
  );
