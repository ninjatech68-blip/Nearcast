-- ===============================================================
-- Demo seed casts reach every tester; real casts keep the gate.
-- ===============================================================
--
-- The test base is geographically scattered, so a demo cast pinned to
-- one city (or gated by interest) would leave most testers with an
-- empty feed. This adds a `seed_demo` flag: casts carrying it are
-- delivered to every signed-in tester unconditionally, with an honest
-- delivery reason, so the feed is always populated for a demo.
--
-- Real casts (seed_demo = false, the default and the only value in
-- production) are untouched: they still flow through the normal
-- place-within-radius + trust + interest gate, so the genuine
-- end-to-end delivery cycle is exercised by real casts alone.
-- ===============================================================

alter table public.intents
  add column if not exists seed_demo boolean not null default false;

comment on column public.intents.seed_demo is
  'true only for dev/test seed casts, which bypass the delivery gate and '
  'reach every tester. production casts are always false.';

-- an honest reason code for the demo path (real reasons are unchanged)
alter table public.intent_deliveries
  drop constraint intent_deliveries_reason_code_check;
alter table public.intent_deliveries
  add constraint intent_deliveries_reason_code_check
    check (reason_code in ('shared_circle', 'one_trusted_link', 'nearby_interest_match', 'demo_seed'));

/**
 * Materialise deliveries for one recipient on feed read.
 *
 * Two passes:
 *   1. demo seed casts — delivered to everyone, unconditionally, with a
 *      truthful reason ("demo cast — shown to every tester"). These
 *      exist only on test projects.
 *   2. real casts — the normal gate via `delivery_for`, unchanged.
 */
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
       'demo cast — shown to every tester', 1, array['demo cast for testing']::text[])
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
