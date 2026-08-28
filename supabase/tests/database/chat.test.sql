begin;
create extension if not exists pgtap with schema extensions;
select plan(22);

select has_function('public', 'my_conversations', 'I can list my chats');
select has_function('public', 'conversation_messages', 'and read one');
select has_function('public', 'send_message', 'and send into it');
select has_function('public', 'set_conversation_mode', 'and change its window');
select has_function('public', 'send_location', 'and share a place');
select has_function('public', 'mark_conversation_read', 'and mark it read');
select has_column('public', 'conversation_reads', 'last_read_at', 'read state is tracked per reader');

-- A + B, A publishes, B joins, A accepts → a conversation exists
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) values
  ('00000000-0000-0000-0000-0000000000A2','00000000-0000-0000-0000-000000000000','authenticated','authenticated','a2@x','',now(),now()),
  ('00000000-0000-0000-0000-0000000000B2','00000000-0000-0000-0000-000000000000','authenticated','authenticated','b2@x','',now(),now()),
  ('00000000-0000-0000-0000-0000000000C2','00000000-0000-0000-0000-000000000000','authenticated','authenticated','c2@x','',now(),now());
insert into public.profiles (id, display_name) values
  ('00000000-0000-0000-0000-0000000000A2','Aarav Rao'),
  ('00000000-0000-0000-0000-0000000000B2','Riya Mehta'),
  ('00000000-0000-0000-0000-0000000000C2','Nosy Stranger');
insert into public.profile_areas (profile_id, name, centroid) values
  ('00000000-0000-0000-0000-0000000000B2','indiranagar', extensions.ST_SetSRID(extensions.ST_MakePoint(77.6408,12.9784),4326)::extensions.geography);
insert into public.profile_interests (profile_id, category) values ('00000000-0000-0000-0000-0000000000B2','sports');

set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-0000000000A2","role":"authenticated"}';
select public.publish_cast('sports','badminton after work.','indiranagar', 5::smallint, now() + interval '2 days', 12.9784, 77.6408, now() + interval '1 day', 'weekday-evening');
reset role;
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-0000000000B2","role":"authenticated"}';
select count(*) from public.my_feed();
select public.respond_to_cast((select intent_id from public.intent_deliveries where recipient_id='00000000-0000-0000-0000-0000000000B2' limit 1), 'in!');
reset role;
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-0000000000A2","role":"authenticated"}';
select public.accept_response((select response_id from public.pending_joins_on_my_casts() limit 1), 'live');
select conversation_id as cid from public.my_conversations() limit 1 \gset

-- A sees the conversation
select is((select count(*)::int from public.my_conversations()), 1, 'A has one conversation');
select is((select other_first_name from public.my_conversations() limit 1), 'Riya', 'named for the other person');

-- A sends a message; both A and B can read it
select lives_ok(
  $$ select public.send_message((select conversation_id from public.my_conversations() limit 1), 'court booked 7-8') $$,
  'A can send into the conversation'
);
select is(
  (select count(*)::int from public.conversation_messages((select conversation_id from public.my_conversations() limit 1))),
  1,
  'and read it back'
);
reset role;

-- B sees the same conversation and the same message
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-0000000000B2","role":"authenticated"}';
select is((select count(*)::int from public.my_conversations()), 1, 'B sees the conversation too');
select is(
  (select body from public.conversation_messages((select conversation_id from public.my_conversations() limit 1)) where not is_mine limit 1),
  'court booked 7-8',
  'B reads A''s message, marked not mine'
);
select lives_ok(
  $$ select public.send_message((select conversation_id from public.my_conversations() limit 1), 'perfect, see you there') $$,
  'B can reply'
);
reset role;

-- unread: B has not marked read yet, so A's message counts as unread for B
select is(
  (select unread_count from public.my_conversations() limit 1),
  1::bigint,
  'A''s message is unread for B until B opens the chat'
);
select lives_ok(
  format($$ select public.mark_conversation_read(%L) $$, :'cid'),
  'B marks the conversation read'
);
select is(
  (select unread_count from public.my_conversations() limit 1),
  0::bigint,
  'and the unread count clears'
);
-- B shares an approximate location; it is rounded and readable
select lives_ok(
  format($$ select public.send_location(%L, 12.97843, 77.64081, 'the gate') $$, :'cid'),
  'B can share a location'
);
select is(
  (select round(latitude::numeric, 4) from public.conversation_messages(:'cid'::uuid)
     where latitude is not null limit 1),
  12.9784::numeric,
  'the shared pin is rounded to ~11m, never exact'
);
reset role;

-- a stranger cannot read or write the conversation
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-0000000000C2","role":"authenticated"}';
select is(
  (select count(*)::int from public.conversation_messages(
    (select id from public.conversations limit 1))),
  0,
  'a non-party reads nothing'
);
select throws_ok(
  format($$ select public.send_message(%L, 'let me in') $$, :'cid'),
  '42501', 'not_a_party',
  'and cannot send'
);
reset role;

-- ending the chat closes it to new messages
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-0000000000A2","role":"authenticated"}';
select public.set_conversation_mode((select conversation_id from public.my_conversations() limit 1), 'ended');
select throws_ok(
  $$ select public.send_message((select conversation_id from public.my_conversations() limit 1), 'still there?') $$,
  '23514', 'conversation_ended',
  'an ended chat takes no new messages'
);
reset role;

select * from finish();
rollback;
