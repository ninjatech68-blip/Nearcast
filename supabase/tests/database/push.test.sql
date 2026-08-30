begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

select has_table('public', 'device_push_tokens', 'device tokens table exists');
select has_table('public', 'notification_outbox', 'the notification outbox exists');
select has_table('public', 'notification_deliveries', 'per-device delivery rows exist');

-- caster A and joiner B, both in indiranagar and into sports so the cast
-- reaches B through the normal gate
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) values
  ('00000000-0000-0000-0000-0000000000A1','00000000-0000-0000-0000-000000000000','authenticated','authenticated','a@x','',now(),now()),
  ('00000000-0000-0000-0000-0000000000B1','00000000-0000-0000-0000-000000000000','authenticated','authenticated','b@x','',now(),now());
insert into public.profiles (id, display_name) values
  ('00000000-0000-0000-0000-0000000000A1','Aarav Rao'),
  ('00000000-0000-0000-0000-0000000000B1','Riya Mehta');
insert into public.profile_areas (profile_id, name, centroid) values
  ('00000000-0000-0000-0000-0000000000B1','indiranagar', extensions.ST_SetSRID(extensions.ST_MakePoint(77.6408,12.9784),4326)::extensions.geography);
insert into public.profile_interests (profile_id, category) values ('00000000-0000-0000-0000-0000000000B1','sports');

-- A publishes a cast
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-0000000000A1","role":"authenticated"}';
select public.publish_cast('sports','badminton after work.','indiranagar', 5::smallint, now() + interval '2 days', 12.9784, 77.6408, now() + interval '1 day', 'weekday-evening');
reset role;

-- B registers a device token, sees the cast, and asks to join
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-0000000000B1","role":"authenticated"}';
select public.register_push_token(
  'ExponentPushToken[test-b]',
  'ios',
  'Riya phone',
  'iPhone 16 Pro',
  '14'
);
select count(*) from public.my_feed();
select public.respond_to_cast(
  (select intent_id from public.intent_deliveries where recipient_id='00000000-0000-0000-0000-0000000000B1' limit 1),
  'in! i play weekly.');
reset role;

select is(
  (select count(*)::int from public.device_push_tokens where user_id='00000000-0000-0000-0000-0000000000B1'),
  1, 'the device token is stored for the signed-in user');
select is(
  (select device_label from public.device_push_tokens where user_id='00000000-0000-0000-0000-0000000000B1' limit 1),
  'Riya phone', 'the token keeps a human-readable device label');
select is(
  (select device_model from public.device_push_tokens where user_id='00000000-0000-0000-0000-0000000000B1' limit 1),
  'iPhone 16 Pro', 'the token keeps a device model for ops mapping');
select is(
  (select count(*)::int from public.notification_outbox where recipient_id='00000000-0000-0000-0000-0000000000A1' and kind='join_request'),
  1, 'the caster is queued a join_request ping');
select is(
  (select delivery_status from public.notification_outbox where recipient_id='00000000-0000-0000-0000-0000000000A1' and kind='join_request' limit 1),
  'pending', 'new outbox rows start pending until the sender works them');

-- A accepts the request
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-0000000000A1","role":"authenticated"}';
select public.accept_response((select response_id from public.pending_joins_on_my_casts() limit 1), 'live');
reset role;

select is(
  (select count(*)::int from public.notification_outbox where recipient_id='00000000-0000-0000-0000-0000000000B1' and kind='join_accepted'),
  1, 'the joiner is queued a join_accepted ping');
select is(
  (select attempt_count from public.notification_outbox where recipient_id='00000000-0000-0000-0000-0000000000B1' and kind='join_accepted' limit 1),
  0, 'new outbox rows start with zero send attempts');

-- privacy: the outbox holds only a kind + ids, never message content
select is(
  (select count(*)::int from information_schema.columns
    where table_schema='public' and table_name='notification_outbox'
      and column_name in ('statement','message','note','body','text','title','content')),
  0, 'the outbox stores no message content — only a kind and ids');

select finish();
rollback;
