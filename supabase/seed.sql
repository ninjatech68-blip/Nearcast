-- Local development seed only. Never run against staging or production.
-- Interests are reference data. The three personas are labelled "Demo" so they
-- can never be mistaken for real people; no plans are seeded (AGENTS.md: never
-- fabricate plans or activity).

insert into public.interests (slug, label, emoji, "group", sort_order) values
  ('badminton', 'Badminton', '🏸', 'Sport', 10),
  ('cricket', 'Cricket', '🏏', 'Sport', 11),
  ('football', 'Football', '⚽', 'Sport', 12),
  ('running', 'Running', '🏃', 'Sport', 13),
  ('cycling', 'Cycling', '🚴', 'Sport', 14),
  ('gym', 'Gym', '🏋️', 'Sport', 15),
  ('tennis', 'Tennis', '🎾', 'Sport', 16),
  ('swimming', 'Swimming', '🏊', 'Sport', 17),
  ('coffee', 'Coffee', '☕', 'Food & drinks', 20),
  ('street-food', 'Street food', '🌮', 'Food & drinks', 21),
  ('dinner', 'Dinner out', '🍽️', 'Food & drinks', 22),
  ('cooking', 'Cooking', '🍳', 'Food & drinks', 23),
  ('chai', 'Chai', '🫖', 'Food & drinks', 24),
  ('dessert', 'Desserts', '🍰', 'Food & drinks', 25),
  ('hiking', 'Hiking', '🥾', 'Outdoors', 30),
  ('trekking', 'Trekking', '🏔️', 'Outdoors', 31),
  ('camping', 'Camping', '⛺', 'Outdoors', 32),
  ('walks', 'Walks', '🚶', 'Outdoors', 33),
  ('road-trips', 'Road trips', '🚗', 'Outdoors', 34),
  ('photography', 'Photography', '📷', 'Outdoors', 35),
  ('birdwatching', 'Birdwatching', '🐦', 'Outdoors', 36),
  ('board-games', 'Board games', '🎲', 'Games', 40),
  ('cards', 'Cards', '🃏', 'Games', 41),
  ('video-games', 'Video games', '🎮', 'Games', 42),
  ('chess', 'Chess', '♟️', 'Games', 43),
  ('quiz', 'Quiz nights', '🧠', 'Games', 44),
  ('museums', 'Museums', '🏛️', 'Culture', 50),
  ('live-music', 'Live music', '🎸', 'Culture', 51),
  ('movies', 'Movies', '🎬', 'Culture', 52),
  ('theatre', 'Theatre', '🎭', 'Culture', 53),
  ('art', 'Art', '🎨', 'Culture', 54),
  ('books', 'Books', '📚', 'Culture', 55),
  ('heritage', 'Heritage walks', '🕌', 'Culture', 56),
  ('languages', 'Languages', '🗣️', 'Learning', 60),
  ('coding', 'Coding', '💻', 'Learning', 61),
  ('workshops', 'Workshops', '🛠️', 'Learning', 62),
  ('study', 'Study together', '📖', 'Learning', 63),
  ('startups', 'Startups', '🚀', 'Learning', 64),
  ('moving-help', 'Moving help', '📦', 'Help & favours', 70),
  ('rides', 'Rides', '🚙', 'Help & favours', 71),
  ('pet-sitting', 'Pet sitting', '🐾', 'Help & favours', 72),
  ('tech-help', 'Tech help', '🔧', 'Help & favours', 73),
  ('spare-tickets', 'Spare tickets', '🎟️', 'Help & favours', 74),
  ('lending', 'Lend and borrow', '🤝', 'Help & favours', 75),
  ('dancing', 'Dancing', '💃', 'Nightlife', 80),
  ('karaoke', 'Karaoke', '🎤', 'Nightlife', 81),
  ('comedy', 'Comedy', '😂', 'Nightlife', 82),
  ('gigs', 'Gigs', '🎶', 'Nightlife', 83),
  ('yoga', 'Yoga', '🧘', 'Wellness', 90),
  ('meditation', 'Meditation', '🕯️', 'Wellness', 91),
  ('sunrise', 'Sunrise sessions', '🌅', 'Wellness', 92),
  ('travel', 'Travel', '✈️', 'Rides & travel', 100),
  ('weekend-trips', 'Weekend trips', '🧳', 'Rides & travel', 101),
  ('carpool', 'Carpool', '🚘', 'Rides & travel', 102)
on conflict (slug) do nothing;

insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                        email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'demo-host@truegoing.local', crypt('truegoing-local', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'demo-joiner@truegoing.local', crypt('truegoing-local', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'demo-outsider@truegoing.local', crypt('truegoing-local', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{}', now(), now())
on conflict (id) do nothing;

insert into public.profiles (id, display_name, area_name, city, onboarding_completed_at) values
  ('00000000-0000-0000-0000-000000000101', 'Demo Host', 'Sector 8', 'Chandigarh', now()),
  ('00000000-0000-0000-0000-000000000102', 'Demo Joiner', 'Sector 17', 'Chandigarh', now()),
  ('00000000-0000-0000-0000-000000000103', 'Demo Outsider', 'Phase 7', 'Mohali', now())
on conflict (id) do nothing;

insert into public.profile_private (profile_id, birth_date, home_cell) values
  ('00000000-0000-0000-0000-000000000101', '1992-04-12', 'ttnfv2'),
  ('00000000-0000-0000-0000-000000000102', '1996-09-03', 'ttnfv2'),
  ('00000000-0000-0000-0000-000000000103', '1990-01-20', 'ttnfkm')
on conflict (profile_id) do nothing;

insert into public.profile_settings (profile_id) values
  ('00000000-0000-0000-0000-000000000101'),
  ('00000000-0000-0000-0000-000000000102'),
  ('00000000-0000-0000-0000-000000000103')
on conflict (profile_id) do nothing;
