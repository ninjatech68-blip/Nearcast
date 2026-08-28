-- Remove everything dev_casts.sql created. Every seeded row hangs off
-- an auth.users id with the fixed dddddddd- prefix, and the foreign
-- keys cascade, so deleting those users removes their profiles, casts,
-- context, reach, deliveries and circle membership in one go. The
-- tester-owned "testers" circle is removed explicitly.
delete from public.circles where id = 'dddddddd-c1c1-0000-0000-000000000001';
delete from auth.users where id::text like 'dddddddd-%';
