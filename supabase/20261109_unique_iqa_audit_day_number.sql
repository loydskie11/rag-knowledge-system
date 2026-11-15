-- A cycle cannot contain two IQA schedule entries with the same day number.
create unique index if not exists uq_iqa_day_schedule_cycle_day
on public.iqa_day_schedules (program, cycle_year, day_number);
