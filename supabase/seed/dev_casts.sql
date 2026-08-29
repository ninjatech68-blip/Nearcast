-- ============================================================
-- DEV / TEST SEED — NOT FOR PRODUCTION. RUN ON A TEST PROJECT ONLY.
-- ============================================================
--
-- Inserts clearly-fake demo casters and casts so every tester has a
-- populated feed to swipe, tap and join during closed testing. It
-- FABRICATES users and activity, which the product forbids in a real
-- deployment (AGENTS.md). It is acceptable only on a throwaway test
-- project. Everything it creates is tagged with a fixed id prefix
-- (dddddddd-…) so dev_casts_cleanup.sql removes all of it and nothing
-- else.
--
-- Delivery: these casts are flagged `seed_demo = true`, so the feed
-- materialiser hands them to EVERY signed-in tester regardless of
-- where they are or which interests they picked (the test base is
-- scattered, so a place/interest-gated demo would leave most feeds
-- empty). Real casts stay on the normal gate — visible only within
-- their radius / trust / interest — so the true end-to-end delivery
-- cycle is exercised by real casts.
--
-- USAGE (Supabase SQL editor, or psql against the TEST project):
--   Run this whole file. No editing, no tester email, no onboarding
--   prerequisite. Re-running is safe (idempotent).
--   Requires migration 20260829120000_demo_seed_delivery.sql applied.
--   To remove it all later: run dev_casts_cleanup.sql.
-- ============================================================

do $$
declare
  cats public.cast_category[] := array[
    'social','sports','food','music','travel','games','arts','learning','networking','help'
  ]::public.cast_category[];
  names text[] := array['Aarav','Riya','Kavya','Meera','Dev','Nisha','Rohan','Sara','Ishaan','Tara'];
  lines text[] := array[
    'chai + catch-up this evening, anyone around?',
    'badminton after work, need two more.',
    'trying the new dosa place saturday — join?',
    'jam session sunday, bring a guitar.',
    'weekend trip to the hills, one seat left in the car.',
    'board games night, teaching Catan to newbies.',
    'sketching in the park sunday morning.',
    'study group for the AWS cert, wednesdays.',
    'coffee with other product folks, comparing notes.',
    'help moving a couch saturday — pizza on me.'
  ];
  cat public.cast_category;
  demo_id uuid;
  new_cast uuid;
  i int := 0;
begin
  -- one demo caster + one live demo cast per category.
  foreach cat in array cats loop
    i := i + 1;
    demo_id := ('dddddddd-0000-0000-0000-' || lpad(i::text, 12, '0'))::uuid;

    insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at)
    values (demo_id, '00000000-0000-0000-0000-000000000000','authenticated','authenticated',
            'demo' || i || '@nearcast.dev','',now(),now())
    on conflict (id) do nothing;

    insert into public.profiles (id, display_name) values (demo_id, names[i])
    on conflict (id) do update set display_name = excluded.display_name;

    -- skip if this demo already has a live cast (idempotent re-runs)
    if not exists (select 1 from public.intents where broadcaster_id = demo_id and status = 'live') then
      insert into public.intents (broadcaster_id, category, statement, status, seed_demo, expires_at, published_at)
      values (demo_id, cat, lines[i], 'live', true, now() + interval '30 days', now())
      returning id into new_cast;

      -- a place label for the feed row; geography is left null because
      -- demo delivery does not depend on distance.
      insert into public.intent_context (intent_id, approximate_place, starts_at, coarse_window)
      values (new_cast, 'nearby', now() + interval '1 day', 'weekday-evening');
    end if;
  end loop;

  raise notice 'seeded % demo casts, visible to every tester', i;
end $$;
