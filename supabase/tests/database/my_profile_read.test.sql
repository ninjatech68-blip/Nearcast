begin;
create extension if not exists pgtap with schema extensions;
select plan(3);

select has_function('public', 'my_profile_areas', 'own-profile area reader exists');

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) values
  ('00000000-0000-0000-0000-0000000000f1','00000000-0000-0000-0000-000000000000','authenticated','authenticated','pr1@x','',now(),now()),
  ('00000000-0000-0000-0000-0000000000f2','00000000-0000-0000-0000-000000000000','authenticated','authenticated','pr2@x','',now(),now());
insert into public.profiles (id, display_name) values
  ('00000000-0000-0000-0000-0000000000f1','Returning'),
  ('00000000-0000-0000-0000-0000000000f2','Other');
insert into public.profile_areas (profile_id, name, centroid) values
  ('00000000-0000-0000-0000-0000000000f1','indiranagar', extensions.ST_SetSRID(extensions.ST_MakePoint(77.64,12.97),4326)::extensions.geography),
  ('00000000-0000-0000-0000-0000000000f2','koramangala', extensions.ST_SetSRID(extensions.ST_MakePoint(77.62,12.93),4326)::extensions.geography);

set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-0000000000f1","role":"authenticated"}';

-- I get my own area, with its point decomposed to lat/lng
select results_eq(
  $$ select name, round(latitude::numeric,2), round(longitude::numeric,2) from public.my_profile_areas() $$,
  $$ values ('indiranagar', 12.97::numeric, 77.64::numeric) $$,
  'my own area comes back with its centroid as lat/lng');

-- never anyone else's
select is(
  (select count(*)::int from public.my_profile_areas() where name = 'koramangala'),
  0, 'another user''s area is never returned');

reset role;
select finish();
rollback;
