-- ===============================================================
-- The demo cast's delivery reason, without the long dash.
-- ===============================================================
--
-- "demo cast — shown to every tester" renders on the poster as
-- "why you: demo cast — shown to every tester". Every reason beside it
-- separates with a middle dot, so this one line was the odd one out.
--
-- A new migration rather than an edit to 20260829120000, which has
-- already been applied. Two parts: the function writes the new text
-- from now on, and the rows already carrying the old text are updated,
-- because a delivery reason is READ from the row and never recomputed
-- on the device.
-- ===============================================================

create or replace function private.materialise_deliveries(recipient uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  candidate record;
  verdict private.delivery_verdict;
begin
  -- 1. demo seed casts: visible to every tester regardless of place,
  --    interest or trust. honest reason, never a fabricated signal.
  for candidate in
    select i.id
    from public.intents i
    where i.seed_demo
      and i.status in ('live', 'matched')
      and i.expires_at > now()
      and i.broadcaster_id <> recipient
      and not exists (
        select 1 from public.intent_deliveries d
        where d.intent_id = i.id and d.recipient_id = recipient
      )
  loop
    insert into public.intent_deliveries
      (intent_id, recipient_id, reason_code, reason_text, score, signals)
    values
      (candidate.id, recipient, 'demo_seed',
       'demo cast · shown to every tester', 1, array['demo cast for testing']::text[])
    on conflict (intent_id, recipient_id) do nothing;
  end loop;

  -- 2. real casts: the normal delivery gate, exactly as before.
  for candidate in
    select i.id
    from public.intents i
    where not i.seed_demo
      and i.status in ('live', 'matched')
      and i.expires_at > now()
      and i.broadcaster_id <> recipient
      and not exists (
        select 1 from public.intent_deliveries d
        where d.intent_id = i.id and d.recipient_id = recipient
      )
  loop
    verdict := private.delivery_for(recipient, candidate.id);
    if verdict.deliver then
      insert into public.intent_deliveries
        (intent_id, recipient_id, reason_code, reason_text, score, signals)
      values
        (candidate.id, recipient, verdict.reason_code, verdict.reason_text, verdict.score, verdict.signals)
      on conflict (intent_id, recipient_id) do nothing;
    end if;
  end loop;
end;
$$;

-- rows already delivered keep whatever text they were written with, so
-- bring the existing ones along rather than leaving two versions of the
-- same sentence in the same feed.
update public.intent_deliveries
set reason_text = 'demo cast · shown to every tester'
where reason_code = 'demo_seed'
  and reason_text = 'demo cast — shown to every tester';
