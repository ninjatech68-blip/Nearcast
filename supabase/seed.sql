-- Local-only genuine-looking fixtures. The UI must label these as demo data.
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, confirmation_token, recovery_token, email_change_token_new,
  email_change, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'asha@nearcast.local', crypt('nearcast-local', gen_salt('bf')), now(), '', '', '', '', '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'dev@nearcast.local', crypt('nearcast-local', gen_salt('bf')), now(), '', '', '', '', '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'mira@nearcast.local', crypt('nearcast-local', gen_salt('bf')), now(), '', '', '', '', '{"provider":"email","providers":["email"]}', '{}', now(), now())
on conflict (id) do nothing;

insert into public.profiles (id, display_name, city) values
  ('00000000-0000-0000-0000-000000000101', 'Asha Rao', 'Bengaluru'),
  ('00000000-0000-0000-0000-000000000102', 'Dev Mehta', 'Bengaluru'),
  ('00000000-0000-0000-0000-000000000103', 'Mira Sen', 'Bengaluru')
on conflict (id) do nothing;

-- Coarse home areas, a few kilometres apart, so the distance bands have real
-- input rather than falling back to the city string. Never an address: these
-- are area-precision points, and they live on profile_private where no other
-- member can read them.
insert into public.profile_private (profile_id, approximate_geography, adult_affirmed_at) values
  ('00000000-0000-0000-0000-000000000101',
   extensions.st_point(77.6408, 12.9784)::extensions.geography, now()),
  ('00000000-0000-0000-0000-000000000102',
   extensions.st_point(77.6245, 12.9352)::extensions.geography, now()),
  ('00000000-0000-0000-0000-000000000103',
   extensions.st_point(77.7500, 12.9698)::extensions.geography, now())
on conflict (profile_id) do update
  set approximate_geography = excluded.approximate_geography,
      adult_affirmed_at = excluded.adult_affirmed_at;

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
insert into public.intent_deliveries
  (intent_id, recipient_id, reason_code, reason_text, rank_position)
values (
  '10000000-0000-0000-0000-000000000101',
  '00000000-0000-0000-0000-000000000102',
  'adjacent_trust_connection',
  'Shared through one trusted connection',
  1
) on conflict do nothing;

-- A second intent, so the feed is not a single card and shows a second
-- delivery reason. Mira confirmed Asha's intent above, which is what makes
-- them a trusted connection — the relationship is real, not asserted.
insert into public.intents (
  id, broadcaster_id, primitive, statement, status, response_action, expires_at, published_at
) values (
  '10000000-0000-0000-0000-000000000102',
  '00000000-0000-0000-0000-000000000103',
  'offer', 'Spare projector free this weekend if anyone is running a workshop.',
  'live', 'I am interested', now() + interval '4 days', now()
) on conflict (id) do nothing;

insert into public.intent_context (intent_id, approximate_place, approximate_geography)
values ('10000000-0000-0000-0000-000000000102', 'Whitefield',
        extensions.st_point(77.7500, 12.9698)::extensions.geography)
on conflict (intent_id) do nothing;
insert into public.intent_reach (intent_id, level)
values ('10000000-0000-0000-0000-000000000102', 'nearby_relevant')
on conflict (intent_id) do nothing;
insert into public.intent_deliveries
  (intent_id, recipient_id, reason_code, reason_text, rank_position)
values (
  '10000000-0000-0000-0000-000000000102',
  '00000000-0000-0000-0000-000000000101',
  'adjacent_trust_connection',
  'Shared through one trusted connection',
  1
) on conflict do nothing;

-- Local invitation tokens for testing redemption end to end. The plaintext
-- tokens are `local-invite-1` and `local-invite-2`; open
-- nearcast://invite/local-invite-1 after signing in with a persona that has
-- no profile yet. Local only — never seed invitations in a real environment.
insert into public.invitations (token_hash, issued_by, note, expires_at)
values
  (encode(extensions.digest('local-invite-1', 'sha256'), 'hex'),
   '00000000-0000-0000-0000-000000000101', 'Local testing invitation 1', now() + interval '365 days'),
  (encode(extensions.digest('local-invite-2', 'sha256'), 'hex'),
   '00000000-0000-0000-0000-000000000101', 'Local testing invitation 2', now() + interval '365 days')
on conflict (token_hash) do nothing;
