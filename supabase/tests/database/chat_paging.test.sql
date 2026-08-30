begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

select has_function('public', 'conversation_messages_page', 'paged chat reader exists');
select has_function('public', 'conversation_messages_after', 'incremental chat reader exists');
select has_function('public', 'mark_conversation_delivered', 'delivery ack function exists');

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) values
  ('11111111-0000-0000-0000-0000000000c1','00000000-0000-0000-0000-000000000000','authenticated','authenticated','a@x','',now(),now()),
  ('11111111-0000-0000-0000-0000000000c2','00000000-0000-0000-0000-000000000000','authenticated','authenticated','b@x','',now(),now());
insert into public.profiles (id, display_name) values
  ('11111111-0000-0000-0000-0000000000c1','A One'),
  ('11111111-0000-0000-0000-0000000000c2','B Two');
insert into public.intents (id, broadcaster_id, category, statement, status, expires_at, published_at) values
  ('11111111-1000-0000-0000-0000000000c1','11111111-0000-0000-0000-0000000000c1','sports','a plan','matched', now()+interval '2 days', now());
insert into public.responses (id, intent_id, respondent_id, message, status) values
  ('11111111-2000-0000-0000-0000000000c1','11111111-1000-0000-0000-0000000000c1','11111111-0000-0000-0000-0000000000c2','in','accepted');
insert into public.matches (id, intent_id, response_id, broadcaster_id, participant_id) values
  ('11111111-3000-0000-0000-0000000000c1','11111111-1000-0000-0000-0000000000c1','11111111-2000-0000-0000-0000000000c1','11111111-0000-0000-0000-0000000000c1','11111111-0000-0000-0000-0000000000c2');
insert into public.conversations (id, match_id, person_low, person_high, mode, expires_at) values
  ('11111111-4000-0000-0000-0000000000c1','11111111-3000-0000-0000-0000000000c1',
   least('11111111-0000-0000-0000-0000000000c1'::uuid,'11111111-0000-0000-0000-0000000000c2'::uuid),
   greatest('11111111-0000-0000-0000-0000000000c1'::uuid,'11111111-0000-0000-0000-0000000000c2'::uuid),
   'day', now()+interval '1 day');
update public.matches set conversation_id = '11111111-4000-0000-0000-0000000000c1'
  where id = '11111111-3000-0000-0000-0000000000c1';

insert into public.messages (conversation_id, sender_id, body, is_system, created_at) values
  ('11111111-4000-0000-0000-0000000000c1','11111111-0000-0000-0000-0000000000c1','one',false,'2026-08-30T10:00:00Z'),
  ('11111111-4000-0000-0000-0000000000c1','11111111-0000-0000-0000-0000000000c2','two',false,'2026-08-30T10:00:01Z'),
  ('11111111-4000-0000-0000-0000000000c1','11111111-0000-0000-0000-0000000000c1','three',false,'2026-08-30T10:00:02Z');

set local role authenticated;
set local "request.jwt.claims" = '{"sub":"11111111-0000-0000-0000-0000000000c1","role":"authenticated"}';

select is(
  (select string_agg(body, ',' order by created_at asc) from public.conversation_messages_page('11111111-4000-0000-0000-0000000000c1', null, null, 2)),
  'two,three',
  'paged reader returns the most recent slice in ascending order'
);

select is(
  (select string_agg(body, ',' order by created_at asc) from public.conversation_messages_after('11111111-4000-0000-0000-0000000000c1', '2026-08-30T10:00:00Z', null, 10)),
  'two,three',
  'incremental reader returns only rows after the cursor'
);

select is(
  (select remote_status from public.conversation_messages_page('11111111-4000-0000-0000-0000000000c1', null, null, 3)
    where body = 'three' limit 1),
  'sent',
  'a sender sees an unacknowledged message as sent'
);

reset role;
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"11111111-0000-0000-0000-0000000000c2","role":"authenticated"}';
select public.mark_conversation_delivered('11111111-4000-0000-0000-0000000000c1');

reset role;
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"11111111-0000-0000-0000-0000000000c1","role":"authenticated"}';
select is(
  (select remote_status from public.conversation_messages_page('11111111-4000-0000-0000-0000000000c1', null, null, 3)
    where body = 'three' limit 1),
  'delivered',
  'a sender sees delivered after the recipient acks delivery'
);

reset role;
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"11111111-0000-0000-0000-0000000000c2","role":"authenticated"}';
select public.mark_conversation_read('11111111-4000-0000-0000-0000000000c1');

reset role;
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"11111111-0000-0000-0000-0000000000c1","role":"authenticated"}';
select is(
  (select remote_status from public.conversation_messages_page('11111111-4000-0000-0000-0000000000c1', null, null, 3)
    where body = 'three' limit 1),
  'read',
  'a sender sees read after the recipient marks the conversation read'
);

reset role;
select finish();
rollback;
