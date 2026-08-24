-- Local-only genuine-looking fixtures. The UI must label these as demo data.
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'asha@nearcast.local', crypt('nearcast-local', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'dev@nearcast.local', crypt('nearcast-local', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'mira@nearcast.local', crypt('nearcast-local', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now())
on conflict (id) do nothing;

insert into public.profiles (id, display_name, city) values
  ('00000000-0000-0000-0000-000000000101', 'Asha Rao', 'Bengaluru'),
  ('00000000-0000-0000-0000-000000000102', 'Dev Mehta', 'Bengaluru'),
  ('00000000-0000-0000-0000-000000000103', 'Mira Sen', 'Bengaluru')
on conflict (id) do nothing;

insert into public.intents (
  id, broadcaster_id, primitive, statement, status, response_action, expires_at, published_at
) values (
  '10000000-0000-0000-0000-000000000101',
  '00000000-0000-0000-0000-000000000101',
  'request', 'Looking for one person to help sort donated books tomorrow morning.',
  'live', 'Offer help', now() + interval '2 days', now()
) on conflict (id) do nothing;

insert into public.intent_context (intent_id, starts_at, approximate_place)
values ('10000000-0000-0000-0000-000000000101', now() + interval '1 day', 'Indiranagar')
on conflict (intent_id) do nothing;
insert into public.intent_reach (intent_id, level)
values ('10000000-0000-0000-0000-000000000101', 'adjacent_network')
on conflict (intent_id) do nothing;
insert into public.intent_confirmations (intent_id, confirmer_id)
values ('10000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000103')
on conflict do nothing;
insert into public.intent_deliveries (intent_id, recipient_id, reason_code, reason_text)
values (
  '10000000-0000-0000-0000-000000000101',
  '00000000-0000-0000-0000-000000000102',
  'adjacent_trust_connection',
  'Shared through one trusted connection'
) on conflict do nothing;
