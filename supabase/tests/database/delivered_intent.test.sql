begin;

create extension if not exists pgtap with schema extensions;
select plan(20);

select has_function('public', 'delivered_intent', 'the detail read path exists');

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at)
values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'detail-owner@nearcast.local', '', now(), now()),
  ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'detail-viewer@nearcast.local', '', now(), now()),
  ('00000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'detail-stranger@nearcast.local', '', now(), now());

insert into public.profiles (id, display_name, approximate_home) values
  ('00000000-0000-0000-0000-0000000000c1', 'Asha Rao', extensions.st_point(77.6400, 12.9780)::extensions.geography),
  ('00000000-0000-0000-0000-0000000000c2', 'Dev Mehta', extensions.st_point(77.6400, 12.9780)::extensions.geography),
  ('00000000-0000-0000-0000-0000000000c3', 'Mira Sen', extensions.st_point(77.6400, 12.9780)::extensions.geography);

insert into public.intents (
  id, broadcaster_id, primitive, statement, status, response_action,
  expires_at, published_at, share_slug, version, created_at
) values
  ('90000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000c1',
   'request', 'Named broadcaster intent', 'live', 'Offer help',
   now() + interval '2 days', now(), 'a1000000-0000-0000-0000-0000000000c1', 1, now()),
  ('90000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000c1',
   'request', 'Anonymous broadcaster intent', 'live', 'Offer help',
   now() + interval '2 days', now(), 'a1000000-0000-0000-0000-0000000000c2', 1, now()),
  ('90000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-0000000000c1',
   'request', 'Withdrawn intent', 'withdrawn', 'Offer help',
   now() + interval '2 days', now(), 'a1000000-0000-0000-0000-0000000000c3', 1, now());

insert into public.intent_context (
  intent_id, approximate_place, approximate_geography, starts_at, quantity,
  price_minor, currency, requirements
) values
  ('90000000-0000-0000-0000-0000000000c1', 'Indiranagar',
   extensions.st_point(77.6420, 12.9790)::extensions.geography,
   now() + interval '1 day', 2, 15000, 'INR', '["Bring your own racket"]'::jsonb),
  ('90000000-0000-0000-0000-0000000000c2', 'Indiranagar',
   extensions.st_point(77.6420, 12.9790)::extensions.geography, null, null, null, null, '[]'::jsonb),
  ('90000000-0000-0000-0000-0000000000c3', 'Indiranagar',
   extensions.st_point(77.6420, 12.9790)::extensions.geography, null, null, null, null, '[]'::jsonb);

insert into public.intent_private (intent_id, exact_address, private_contact) values
  ('90000000-0000-0000-0000-0000000000c1', '12 Some Exact Street', '+91 90000 00000');

insert into public.intent_reach (intent_id, level, show_broadcaster_first_name) values
  ('90000000-0000-0000-0000-0000000000c1', 'adjacent_network', true),
  ('90000000-0000-0000-0000-0000000000c2', 'adjacent_network', false),
  ('90000000-0000-0000-0000-0000000000c3', 'adjacent_network', true);

-- The viewer was delivered all three. The stranger was delivered none.
insert into public.intent_deliveries (intent_id, recipient_id, reason_code, reason_text) values
  ('90000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000c2',
   'adjacent_trust_connection', 'Someone you both know shared this'),
  ('90000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000c2',
   'adjacent_trust_connection', 'Someone you both know shared this'),
  ('90000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-0000000000c2',
   'adjacent_trust_connection', 'Someone you both know shared this');

insert into public.intent_confirmations (intent_id, confirmer_id) values
  ('90000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000c3');

-- Delivery is the permission.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000c2","role":"authenticated"}';

select is(
  (select count(*)::int from public.delivered_intent('90000000-0000-0000-0000-0000000000c1')),
  1,
  'a delivered recipient can open the intent that reached them'
);

select is(
  (select statement from public.delivered_intent('90000000-0000-0000-0000-0000000000c1')),
  'Named broadcaster intent',
  'the detail is the intent that was asked for, not a fixture'
);

select is(
  (select reason_text from public.delivered_intent('90000000-0000-0000-0000-0000000000c1')),
  'Someone you both know shared this',
  'the stored explanation travels with the detail'
);

select is(
  (select confirmation_count::int from public.delivered_intent('90000000-0000-0000-0000-0000000000c1')),
  1,
  'confirmations are counted honestly rather than implied'
);

select is(
  (select viewer_has_confirmed from public.delivered_intent('90000000-0000-0000-0000-0000000000c1')),
  false,
  'the viewer has not confirmed, and is not counted as though they had'
);

select is(
  (select broadcaster_first_name from public.delivered_intent('90000000-0000-0000-0000-0000000000c1')),
  'Asha',
  'a first name shows when the broadcaster allowed it'
);

select is(
  (select broadcaster_first_name from public.delivered_intent('90000000-0000-0000-0000-0000000000c2')),
  null,
  'a first name is withheld when the broadcaster did not allow it'
);

select is(
  (select broadcaster_first_name from public.home_feed(20)
    where intent_id = '90000000-0000-0000-0000-0000000000c2'),
  null,
  'the feed card honours the same first-name choice as the detail it opens'
);

select is(
  (select distance_band from public.delivered_intent('90000000-0000-0000-0000-0000000000c1')),
  'walking_distance',
  'distance arrives as a coarse band'
);

-- A closed intent explains itself rather than vanishing.
select is(
  (select status::text from public.delivered_intent('90000000-0000-0000-0000-0000000000c3')),
  'withdrawn',
  'a closed intent returns its status so the screen can say what happened'
);

-- Nobody else's intent, and nobody else's replies.
select is(
  (select my_response_status from public.delivered_intent('90000000-0000-0000-0000-0000000000c1')),
  null,
  'no response yet reads as no response'
);

select is(
  (select response_status::text
   from public.submit_response('90000000-0000-0000-0000-0000000000c1', 'I can help with this')),
  'pending',
  'the delivered recipient can actually respond to the id the detail gave them'
);

select is(
  (select my_response_status::text from public.delivered_intent('90000000-0000-0000-0000-0000000000c1')),
  'pending',
  'an existing response comes back so the screen never offers a duplicate'
);

reset role;
insert into public.responses (intent_id, respondent_id, message)
values ('90000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000c3', 'Me too');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000c2","role":"authenticated"}';

select is(
  (select my_response_status::text from public.delivered_intent('90000000-0000-0000-0000-0000000000c1')),
  'pending',
  'a respondent still sees only their own reply, never a competitor''s'
);

reset role;
insert into public.intent_confirmations (intent_id, confirmer_id)
values ('90000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000c2');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000c2","role":"authenticated"}';

select is(
  (select viewer_has_confirmed from public.delivered_intent('90000000-0000-0000-0000-0000000000c1')),
  true,
  'a confirmation the viewer genuinely made comes back as theirs'
);

-- Someone with no delivery gets nothing, so a guessed id discloses nothing.
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000c3","role":"authenticated"}';

select is_empty(
  $$select 1 from public.delivered_intent('90000000-0000-0000-0000-0000000000c1')$$,
  'an undelivered member cannot open the intent by knowing its id'
);

-- Hiding a card stops the action, because `submit_response` refuses a hidden
-- delivery. The detail has to agree with that rather than offer a doomed CTA.
reset role;
update public.intent_deliveries set hidden_at = now()
where intent_id = '90000000-0000-0000-0000-0000000000c1'
  and recipient_id = '00000000-0000-0000-0000-0000000000c2';

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000c2","role":"authenticated"}';

select is(
  (select is_hidden from public.delivered_intent('90000000-0000-0000-0000-0000000000c1')),
  true,
  'a hidden delivery still opens, and says it is hidden'
);

reset role;
update public.intent_deliveries set hidden_at = null
where intent_id = '90000000-0000-0000-0000-0000000000c1'
  and recipient_id = '00000000-0000-0000-0000-0000000000c2';

-- A block closes the detail as well as the feed.
reset role;
insert into public.blocks (blocker_id, blocked_id)
values ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000c1');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000c2","role":"authenticated"}';

select is_empty(
  $$select 1 from public.delivered_intent('90000000-0000-0000-0000-0000000000c1')$$,
  'blocking the broadcaster closes the detail, not only the feed'
);

-- The shape carries no coordinate and no private field.
reset role;
create temporary view detail_shape as
  select * from public.delivered_intent('90000000-0000-0000-0000-0000000000c1');

select set_eq(
  $$select column_name::text from information_schema.columns where table_name = 'detail_shape'$$,
  $$values ('delivery_id'),('intent_id'),('primitive'),('statement'),('response_action'),
           ('status'),('expires_at'),('published_at'),('starts_at'),('deadline_at'),
           ('quantity'),('price_minor'),('currency'),('requirements'),
           ('approximate_place'),('distance_band'),('broadcaster_first_name'),
           ('confirmation_count'),('viewer_has_confirmed'),
           ('reason_code'),('reason_text'),('is_saved'),('is_hidden'),
           ('my_response_status')$$,
  'the detail carries bands and context, never a coordinate, address or contact'
);

select * from finish();
rollback;
