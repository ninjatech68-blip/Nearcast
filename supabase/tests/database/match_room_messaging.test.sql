begin;

create extension if not exists pgtap with schema extensions;
select plan(12);

select has_column('public', 'conversations', 'expires_at', 'rooms carry a deadline');
select has_column('public', 'messages', 'reply_to_id', 'messages can quote another message');
select has_function('public', 'close_expired_conversations', 'the expiry sweep exists');

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'broadcaster@nearcast.local', '', now(), now()),
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'recipient@nearcast.local', '', now(), now()),
  ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'outsider@nearcast.local', '', now(), now());

insert into public.profiles (id, display_name) values
  ('00000000-0000-0000-0000-000000000001', 'Asha Rao'),
  ('00000000-0000-0000-0000-000000000002', 'Dev Mehta'),
  ('00000000-0000-0000-0000-000000000003', 'Mira Sen');

insert into public.intents (
  id, broadcaster_id, primitive, statement, status, response_action, expires_at, published_at, share_slug
) values (
  '10000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'request', 'Need help carrying books this evening', 'matched', 'Offer help',
  now() + interval '1 day', now(), '20000000-0000-0000-0000-000000000001'
);

insert into public.responses (id, intent_id, respondent_id, message, status)
values (
  '30000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  'Happy to help', 'accepted'
);

insert into public.matches (id, intent_id, response_id, broadcaster_id, participant_id)
values (
  '40000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  '30000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002'
);

-- An open room and a lapsed room that the sweep has not visited yet.
insert into public.conversations (id, match_id, expires_at)
values (
  '50000000-0000-0000-0000-000000000001',
  '40000000-0000-0000-0000-000000000001',
  now() + interval '6 hours'
);

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}';

select lives_ok(
  $$insert into public.messages (conversation_id, sender_id, body)
    values ('50000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'Seven works')$$,
  'a match party can write to an open room'
);

select throws_ok(
  $$insert into public.messages (conversation_id, sender_id, body, is_system)
    values ('50000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'System note', true)$$,
  '42501',
  null,
  'a party cannot forge a system message'
);

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000003","role":"authenticated"}';

select throws_ok(
  $$insert into public.messages (conversation_id, sender_id, body)
    values ('50000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 'Let me in')$$,
  '42501',
  null,
  'a non-party cannot write to the room'
);

select is_empty(
  $$select 1 from public.messages where conversation_id = '50000000-0000-0000-0000-000000000001'$$,
  'a non-party cannot read the transcript'
);

-- Expiry closes writing without the sweep having run.
reset role;
update public.conversations set expires_at = now() - interval '1 minute'
where id = '50000000-0000-0000-0000-000000000001';

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}';

select throws_ok(
  $$insert into public.messages (conversation_id, sender_id, body)
    values ('50000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'Still here?')$$,
  '42501',
  null,
  'a lapsed room rejects writes before the sweep runs'
);

select isnt_empty(
  $$select 1 from public.messages where conversation_id = '50000000-0000-0000-0000-000000000001'$$,
  'a party can still read the transcript of a lapsed room'
);

-- The sweep is idempotent and leaves an audit row.
reset role;
select is(public.close_expired_conversations(), 1, 'the sweep closes the lapsed room');
select is(public.close_expired_conversations(), 0, 'running the sweep again changes nothing');

select isnt_empty(
  $$select 1 from public.messages
    where conversation_id = '50000000-0000-0000-0000-000000000001' and is_system$$,
  'closing the room records a system message'
);

-- A reply may not point at a message in a different conversation.
select throws_ok(
  $$update public.messages
    set reply_to_id = '00000000-0000-0000-0000-000000000001'
    where conversation_id = '50000000-0000-0000-0000-000000000001' and not is_system$$,
  '23503',
  null,
  'a reply cannot reference a message outside its room'
);

select * from finish();
rollback;
