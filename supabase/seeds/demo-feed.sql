-- Demo feed. NOT a migration. Never applied by `npm run db:push`.
--
-- AGENTS.md says never fabricate users, confirmations, responses, availability
-- or activity counts. This file fabricates broadcasters and intents, so it needs
-- its boundary stated rather than assumed.
--
-- The rule protects a user from being shown activity that did not happen. It is
-- not violated by a developer deliberately populating a staging database to
-- exercise scrolling, ordering and card layout, because nobody is being misled:
-- the person running it knows exactly what it is. It IS violated the moment this
-- data shares a project with a real tester, who cannot tell the difference.
--
-- Therefore:
--   * Run only against a staging project used by the team.
--   * Never run against a project any real alpha tester touches.
--   * Every demo account uses @demo.nearcast.invalid, so demo rows stay
--     identifiable in the database even though the feed reads normally.
--
-- The guard below refuses to run once a project shows real activity.

do $$
declare
  demo_area extensions.geography(point, 4326);
  demo_ids uuid[] := array[
    '11111111-0000-4000-8000-000000000001'::uuid,
    '11111111-0000-4000-8000-000000000002'::uuid,
    '11111111-0000-4000-8000-000000000003'::uuid,
    '11111111-0000-4000-8000-000000000004'::uuid,
    '11111111-0000-4000-8000-000000000005'::uuid,
    '11111111-0000-4000-8000-000000000006'::uuid
  ];
  demo_names text[] := array[
    'Asha Rao', 'Dev Mehta', 'Mira Sen', 'Ravi Nair', 'Leela Iyer', 'Arjun Bose'
  ];
  statements text[] := array[
    'Need two helpers to move a desk on Saturday morning',
    'Spare cricket kit going free if anyone can use it',
    'Looking for one more for badminton doubles on Thursday',
    'Can someone lend a pressure washer for an afternoon',
    'Offering lifts to the airport early Friday, two seats',
    'Want to start a weekend running group, anyone in',
    'Need a ladder tall enough for a first-floor window',
    'Giving away a working microwave, collection only',
    'Looking for someone to share a badminton court booking',
    'Have spare tomato seedlings, happy to pass them on',
    'Need help carrying shopping up three flights on Sunday',
    'Starting a book swap, bring one take one'
  ];
  primitives public.intent_primitive[] := array[
    'request', 'offer', 'request', 'request', 'offer', 'plan',
    'request', 'offer', 'request', 'offer', 'request', 'plan'
  ];
  actions text[] := array[
    'Offer help', 'Ask for it', 'Join in', 'Offer to lend', 'Ask for a seat',
    'Join in', 'Offer to lend', 'Ask for it', 'Share the court', 'Ask for some',
    'Offer help', 'Join in'
  ];
  place_names text[] := array[
    'Indiranagar', 'Koramangala', 'Jayanagar', 'HSR Layout',
    'Indiranagar', 'Bellandur', 'Koramangala', 'Indiranagar',
    'Jayanagar', 'HSR Layout', 'Indiranagar', 'Koramangala'
  ];
  chosen_place public.places;
  new_intent uuid;
  index integer;
begin
  if exists (select 1 from public.matches) or exists (select 1 from public.responses) then
    raise exception
      'This project has real activity (responses or matches exist). Refusing to seed demo data.';
  end if;

  select centre into demo_area from public.places where name = 'Indiranagar';

  if demo_area is null then
    raise exception 'The places table is empty. Run the migrations first.';
  end if;

  -- Demo broadcasters. These accounts never sign in; they exist only to own the
  -- intents below, so a real member's feed has something to scroll.
  for index in 1..array_length(demo_ids, 1) loop
    insert into auth.users (
      id, instance_id, aud, role, email, encrypted_password, created_at, updated_at
    ) values (
      demo_ids[index], '00000000-0000-0000-0000-000000000000',
      'authenticated', 'authenticated',
      'demo' || index || '@demo.nearcast.invalid', '', now(), now()
    ) on conflict (id) do nothing;

    insert into public.profiles (id, display_name, approximate_home, city)
    values (demo_ids[index], demo_names[index], demo_area, 'Indiranagar')
    on conflict (id) do nothing;
  end loop;

  for index in 1..array_length(statements, 1) loop
    select * into chosen_place from public.places where name = place_names[index];

    insert into public.intents (
      broadcaster_id, primitive, statement, status, response_action,
      expires_at, published_at
    ) values (
      demo_ids[1 + (index % array_length(demo_ids, 1))],
      primitives[index],
      statements[index],
      'live',
      actions[index],
      -- Staggered expiry so the feed's "closing soonest" ordering is visible.
      now() + (index * interval '7 hours') + interval '4 hours',
      now() - (index * interval '11 minutes')
    ) returning id into new_intent;

    insert into public.intent_context (
      intent_id, approximate_place, approximate_geography
    ) values (new_intent, chosen_place.name, chosen_place.centre);

    insert into public.intent_private (intent_id) values (new_intent);

    insert into public.intent_reach (intent_id, level)
    values (
      new_intent,
      -- A mix, so cards carry different explanations and the trust-distance
      -- ordering is visible rather than uniform.
      case index % 3
        when 0 then 'adjacent_network'::public.reach_level
        when 1 then 'nearby_relevant'::public.reach_level
        else 'broader_approved'::public.reach_level
      end
    );

    perform public.generate_deliveries(new_intent);
  end loop;

  raise notice 'Seeded % demo intents from % demo broadcasters.',
    array_length(statements, 1), array_length(demo_ids, 1);
end $$;
