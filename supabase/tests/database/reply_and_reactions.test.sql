begin;
create extension if not exists pgtap with schema extensions;
select plan(27);

select has_column('public', 'messages', 'reply_to_id', 'a message can quote another');
select has_table('public', 'message_reactions', 'and can be reacted to');
select has_function('public', 'toggle_message_reaction', 'reacting is one round trip');
select has_function('public', 'reactions_for_message', 'and reads back in the shape the UI wants');

-- Two rooms, built the way the app builds them: a cast, a delivery, a
-- response, an acceptance. A1+A2 share the near room; A3+A4 share a far one
-- that neither A1 nor A2 is party to.
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) values
  ('00000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-000000000000','authenticated','authenticated','ra1@x','',now(),now()),
  ('00000000-0000-0000-0000-0000000000a2','00000000-0000-0000-0000-000000000000','authenticated','authenticated','ra2@x','',now(),now()),
  ('00000000-0000-0000-0000-0000000000a3','00000000-0000-0000-0000-000000000000','authenticated','authenticated','ra3@x','',now(),now()),
  ('00000000-0000-0000-0000-0000000000a4','00000000-0000-0000-0000-000000000000','authenticated','authenticated','ra4@x','',now(),now());

insert into public.profiles (id, display_name) values
  ('00000000-0000-0000-0000-0000000000a1','Asha Rao'),
  ('00000000-0000-0000-0000-0000000000a2','Dev Mehta'),
  ('00000000-0000-0000-0000-0000000000a3','Mira Sen'),
  ('00000000-0000-0000-0000-0000000000a4','Ravi Nair');

insert into public.intents (id, broadcaster_id, category, statement, status, expires_at, published_at) values
  ('10000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000a1','sports','badminton','live', now()+interval '2 days', now()),
  ('10000000-0000-0000-0000-0000000000a2','00000000-0000-0000-0000-0000000000a3','food','dinner','live', now()+interval '2 days', now());

insert into public.intent_deliveries (intent_id, recipient_id, reason_code, reason_text, score, signals) values
  ('10000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000a2','demo_seed','x',1,'{x}'),
  ('10000000-0000-0000-0000-0000000000a2','00000000-0000-0000-0000-0000000000a4','demo_seed','x',1,'{x}');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}';
select public.respond_to_cast('10000000-0000-0000-0000-0000000000a1'::uuid, 'in for badminton');
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a4","role":"authenticated"}';
select public.respond_to_cast('10000000-0000-0000-0000-0000000000a2'::uuid, 'in for dinner');

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
select public.accept_response((select id from public.responses where intent_id='10000000-0000-0000-0000-0000000000a1'), 'live');
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a3","role":"authenticated"}';
select public.accept_response((select id from public.responses where intent_id='10000000-0000-0000-0000-0000000000a2'), 'live');
reset role;

create temporary table rooms as
select
  (select c.id from public.conversations c
    where c.person_low = least('00000000-0000-0000-0000-0000000000a1'::uuid,'00000000-0000-0000-0000-0000000000a2'::uuid)
      and c.person_high = greatest('00000000-0000-0000-0000-0000000000a1'::uuid,'00000000-0000-0000-0000-0000000000a2'::uuid)) as near_room,
  (select c.id from public.conversations c
    where c.person_low = least('00000000-0000-0000-0000-0000000000a3'::uuid,'00000000-0000-0000-0000-0000000000a4'::uuid)
      and c.person_high = greatest('00000000-0000-0000-0000-0000000000a3'::uuid,'00000000-0000-0000-0000-0000000000a4'::uuid)) as far_room;
grant select on rooms to authenticated;

insert into public.messages (id, conversation_id, sender_id, body)
select 'd0000000-0000-0000-0000-0000000000a1'::uuid, near_room, '00000000-0000-0000-0000-0000000000a1'::uuid, 'are you coming?' from rooms
union all
select 'd0000000-0000-0000-0000-0000000000a2'::uuid, near_room, '00000000-0000-0000-0000-0000000000a2'::uuid, 'on my way' from rooms
union all
select 'd0000000-0000-0000-0000-0000000000a9'::uuid, far_room, '00000000-0000-0000-0000-0000000000a3'::uuid, 'a message in another room' from rooms;

select lives_ok(
  $$ update public.messages set reply_to_id = 'd0000000-0000-0000-0000-0000000000a1'
     where id = 'd0000000-0000-0000-0000-0000000000a2' $$,
  'a message can quote another in the same conversation'
);

/**
 * The reason the foreign key is composite. A plain reference to messages(id)
 * would let a message quote one from a room the reader was never in, and a
 * quoted message renders inside the bubble — so a private message would be
 * shown to somebody with no access to it.
 */
select throws_ok(
  $$ update public.messages set reply_to_id = 'd0000000-0000-0000-0000-0000000000a9'
     where id = 'd0000000-0000-0000-0000-0000000000a2' $$,
  '23503',
  NULL,
  'a message cannot quote one from a different conversation'
);

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}';

select is(
  public.toggle_message_reaction('d0000000-0000-0000-0000-0000000000a1', '👍') -> 0 ->> 'emoji',
  '👍',
  'a party to the room can react'
);

select is(
  public.toggle_message_reaction('d0000000-0000-0000-0000-0000000000a1', '👍'),
  '[]'::jsonb,
  'and tapping the same emoji again takes it away'
);

reset role;
select is(
  (select count(*)::int from public.message_reactions),
  0,
  'the row is really gone, not just hidden'
);

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}';
select lives_ok(
  $$ select public.toggle_message_reaction('d0000000-0000-0000-0000-0000000000a1', '❤️') $$,
  'a different emoji is a different reaction'
);

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
select lives_ok(
  $$ select public.toggle_message_reaction('d0000000-0000-0000-0000-0000000000a1', '❤️') $$,
  'and the other person can add the same emoji'
);

select is(
  jsonb_array_length(public.reactions_for_message('d0000000-0000-0000-0000-0000000000a1')),
  1,
  'the same emoji from two people is one pill'
);

/**
 * The viewer learns whether a reaction is theirs and nothing more. Account ids
 * would let a client correlate people across rooms, and the UI only needs to
 * know which pill to draw as active.
 */
select is(
  (public.reactions_for_message('d0000000-0000-0000-0000-0000000000a1') -> 0 -> 'userIds') @> '["me"]'::jsonb,
  true,
  'a viewer sees their own reaction marked as theirs'
);

select is_empty(
  $$ select 1
     from jsonb_array_elements(public.reactions_for_message('d0000000-0000-0000-0000-0000000000a1')) e,
          jsonb_array_elements_text(e.value -> 'userIds') u
     where u.value not in ('me', 'them') $$,
  'and no account id ever leaves the server in a reaction'
);

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a3","role":"authenticated"}';

select throws_ok(
  $$ select public.toggle_message_reaction('d0000000-0000-0000-0000-0000000000a1', '👍') $$,
  '42501', 'not_authorized',
  'someone outside the room cannot react in it'
);

/**
 * Nobody reads the table from a client, insider or outsider. There is no grant
 * and RLS is on with no policies, so every read goes through the definer that
 * maps reactor ids to 'me' or 'them'. That is what keeps account ids off the
 * wire.
 */
select throws_ok(
  $$ select 1 from public.message_reactions $$,
  '42501',
  'permission denied for table message_reactions',
  'no client reads the reactions table directly, in or out of the room'
);

reset role;
update public.conversations set closed_at = now(), mode = 'ended'
where id = (select near_room from rooms);

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}';

select throws_ok(
  $$ select public.toggle_message_reaction('d0000000-0000-0000-0000-0000000000a1', '😮') $$,
  '40001', 'conversation_closed',
  'a closed room takes no new reactions, the same as it takes no messages'
);

reset role;
update public.conversations set closed_at = null, mode = 'day',
       expires_at = now() - interval '1 minute'
where id = (select near_room from rooms);

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}';

select throws_ok(
  $$ select public.toggle_message_reaction('d0000000-0000-0000-0000-0000000000a1', '😮') $$,
  '40001', 'conversation_closed',
  'nor does an expired one'
);

reset role;
update public.conversations set expires_at = now() + interval '1 day'
where id = (select near_room from rooms);
delete from public.messages where id = 'd0000000-0000-0000-0000-0000000000a1';

select is(
  (select reply_to_id from public.messages where id = 'd0000000-0000-0000-0000-0000000000a2'),
  null,
  'deleting a quoted message leaves the reply standing, simply not quoting'
);

select is(
  (select count(*)::int from public.message_reactions
    where message_id = 'd0000000-0000-0000-0000-0000000000a1'),
  0,
  'and its reactions go with it'
);

-- ---------------------------------------------------------------
-- Sending a reply, and reading the room's reply/reaction map.
-- ---------------------------------------------------------------
select has_function('public', 'conversation_message_meta',
  'reply and reaction facts read back for a room');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}';

-- The three-argument call is what the build already on people's phones makes.
-- Recreating send_message with a fourth defaulted parameter must not break it.
select isnt(
  public.send_message((select near_room from rooms), 'still works without a quote', null),
  null,
  'the three-argument send the installed app makes still resolves'
);

create temporary table quoted_reply as
select public.send_message(
  (select near_room from rooms),
  'replying to yours',
  null,
  'd0000000-0000-0000-0000-0000000000a2'::uuid
) as id;
grant select on quoted_reply to authenticated;

select is(
  (select reply_to_id from public.messages where id = (select id from quoted_reply)),
  'd0000000-0000-0000-0000-0000000000a2'::uuid,
  'a reply records what it quotes'
);

select is(
  (select reply_body from public.conversation_message_meta((select near_room from rooms))
    where message_id = (select id from quoted_reply)),
  'on my way',
  'and the quoted text comes back, so a bubble draws its quote in one round trip'
);

select is(
  (select reply_is_mine from public.conversation_message_meta((select near_room from rooms))
    where message_id = (select id from quoted_reply)),
  true,
  'the quote knows whose message it was'
);

/**
 * The composite key would refuse this as a constraint violation. Checking it
 * in the function means the client gets an error it can act on rather than a
 * raw 23503 it has to parse.
 */
select throws_ok(
  format($$ select public.send_message(%L, 'quoting across rooms', null, %L) $$,
         (select near_room from rooms),
         'd0000000-0000-0000-0000-0000000000a9'),
  '23503', 'reply_not_in_conversation',
  'a reply cannot quote a message from another room'
);

select is_empty(
  format($$ select 1 from public.conversation_message_meta(%L)
            where message_id = (select id from quoted_reply)
              and reactions <> '[]'::jsonb $$, (select far_room from rooms)),
  'and the map is scoped to its own room'
);

select * from finish();
rollback;
