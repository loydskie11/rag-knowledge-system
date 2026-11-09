-- Internal audit completion must not be presented as external ISO certification.
update public.iqa_schedules
set day3_scope = 'Internal data cross-referencing, synthesis of observations, drafting the formal audit findings report, and the official closing meeting and findings presentation.'
where day3_scope = 'Internal data cross-referencing, synthesis of observations, drafting formal audit findings report, and official Closing Ceremony & Certificate Awarding.';

update public.iqa_day_schedules
set scope = 'Internal data cross-referencing, synthesis of observations, drafting the formal audit findings report, and the official closing meeting and findings presentation.'
where scope = 'Internal data cross-referencing, synthesis of observations, drafting formal audit findings report, and official Closing Ceremony & Certificate Awarding.';
