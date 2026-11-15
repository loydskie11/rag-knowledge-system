BEGIN;

CREATE TABLE public.car_notification_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  car_id uuid NOT NULL REFERENCES public.car_forms(id) ON DELETE CASCADE,
  event_key varchar(120) NOT NULL,
  recipient_email text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_car_notification_event UNIQUE(car_id, event_key, recipient_email)
);

CREATE INDEX idx_car_notification_events_car ON public.car_notification_events(car_id, sent_at DESC);
ALTER TABLE public.car_notification_events ENABLE ROW LEVEL SECURITY;

COMMIT;
