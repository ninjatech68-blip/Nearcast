-- What Supabase's own stack provides, and a plain PostgreSQL does not.
--
-- `supabase start` runs a container image with auth, roles, and the
-- extension schema already set up. Running the same migrations against
-- a plain local PostgreSQL means providing those pieces ourselves.
--
-- This is a DEVELOPMENT HARNESS, never shipped and never applied to a
-- real project: it is deliberately the minimum our migrations touch, so
-- that anything they rely on beyond this shows up as a failure here
-- rather than a surprise in production. Notably it does NOT recreate
-- GoTrue's auth logic — only the `auth.users` table our foreign keys
-- reference and the `auth.uid()` every RLS policy reads.

create schema if not exists extensions;
create schema if not exists auth;

create extension if not exists postgis with schema extensions;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists pgtap with schema extensions;

-- the subset of auth.users our foreign keys and test fixtures use
create table if not exists auth.users (
  id uuid primary key,
  instance_id uuid,
  aud text,
  role text,
  email text,
  encrypted_password text,
  created_at timestamptz,
  updated_at timestamptz
);

-- the same contract as Supabase's: the subject claim of the request JWT
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'sub', '')::uuid;
$$;

do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated; end if;
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role; end if;
end $$;

-- without USAGE on `extensions`, pgTAP's own functions stop resolving
-- the moment a test switches to `authenticated`, and every assertion
-- after that point fails as "function does not exist".
grant usage on schema extensions to authenticated, anon, service_role;
