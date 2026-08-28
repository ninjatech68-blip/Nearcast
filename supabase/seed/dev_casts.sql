-- ============================================================
-- DEV / TEST SEED — NOT FOR PRODUCTION. RUN ON A TEST PROJECT ONLY.
-- ============================================================
--
-- This inserts clearly-fake demo casters and casts so the feed has
-- something to swipe, tap and join during closed testing. It
-- FABRICATES users and activity, which the product forbids in a real
-- deployment (AGENTS.md: "Never fabricate users ... or activity").
-- It is acceptable only on a throwaway test project, and everything it
-- creates is tagged with a fixed id prefix (dddddddd-…) so a single
-- cleanup deletes all of it and nothing else.
--
-- Delivery is gated by place AND interest, so the seed locates itself
-- from the TESTER's own area (set after onboarding on the device) and
-- spreads casts across every category, so whatever interests were
-- picked, several land in the feed. One extra cast comes through a
-- circle the tester owns, to show the "your circle vouches" path.
--
-- USAGE (Supabase SQL editor, or psql against the project):
--   1. Sign in on the device and finish onboarding first, so the
--      tester has a placed home area.
--   2. Set the_login_email below to the account you signed in with.
--   3. Run this whole file (paste it into the Supabase SQL editor, or
--      psql). Re-running is safe (idempotent).
--   4. To remove it all later: run dev_casts_cleanup.sql.
-- ============================================================

do $$
declare
  -- >>> the only line to edit: the account you sign in with on device
  the_login_email text := 'REPLACE_WITH_YOUR_LOGIN_EMAIL';
  tester uuid;
  center extensions.geography;
  area_name text;
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
  circle_id uuid := 'dddddddd-c1c1-0000-0000-000000000001';
  friend_id uuid := 'dddddddd-0000-0000-0000-000000000099';
begin
  select id into tester from auth.users where email = the_login_email;
  if tester is null then
    raise exception 'no account with that email — sign in on the device first, then set tester_email';
  end if;

  select centroid, name into center, area_name
  from public.profile_areas where profile_id = tester order by created_at limit 1;
  if center is null then
    raise exception 'the tester has no placed area yet — finish onboarding on the device first';
  end if;
  area_name := coalesce(area_name, 'nearby');

  -- one demo caster + one live cast per category, pinned to the
  -- tester's own area centroid so it is always in range.
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
      insert into public.intents (broadcaster_id, category, statement, status, expires_at, published_at)
      values (demo_id, cat, lines[i], 'live', now() + interval '2 days', now())
      returning id into new_cast;

      insert into public.intent_context (intent_id, approximate_place, approximate_geography, starts_at, coarse_window)
      values (new_cast, area_name, center, now() + interval '1 day', 'weekday-evening');

      insert into public.intent_reach (intent_id, radius_km) values (new_cast, 10);
    end if;
  end loop;

  -- one caster the tester is CONNECTED to, via a circle the tester
  -- owns — so their cast is delivered at any distance and reads
  -- "your circle vouches", exercising the strongest why-line.
  insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at)
  values (friend_id, '00000000-0000-0000-0000-000000000000','authenticated','authenticated',
          'friend@nearcast.dev','',now(),now())
  on conflict (id) do nothing;
  insert into public.profiles (id, display_name) values (friend_id, 'Kabir (your circle)')
  on conflict (id) do update set display_name = excluded.display_name;

  insert into public.circles (id, owner_id, name) values (circle_id, tester, 'testers')
  on conflict (id) do nothing;
  insert into public.circle_members (circle_id, member_id) values (circle_id, friend_id)
  on conflict do nothing;

  if not exists (select 1 from public.intents where broadcaster_id = friend_id and status = 'live') then
    insert into public.intents (broadcaster_id, category, statement, status, expires_at, published_at)
    values (friend_id, 'social', 'housewarming friday — you''re invited.', 'live', now() + interval '2 days', now())
    returning id into new_cast;
    insert into public.intent_context (intent_id, approximate_place, approximate_geography, starts_at, coarse_window)
    values (new_cast, area_name, center, now() + interval '1 day', 'weekday-evening');
    insert into public.intent_reach (intent_id, radius_km) values (new_cast, 25);
  end if;

  raise notice 'seeded demo casts around %, for tester %', area_name, the_login_email;
end $$;
