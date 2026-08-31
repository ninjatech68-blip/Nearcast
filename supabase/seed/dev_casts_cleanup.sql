-- Remove everything dev_casts.sql created. Every seeded row hangs off
-- an auth.users id with the fixed dddddddd- prefix, and the foreign
-- keys cascade, so deleting those users removes their profiles, casts,
-- context, and the deliveries those casts fanned out to testers in one
-- go.
delete from auth.users where id::text like 'dddddddd-%';
