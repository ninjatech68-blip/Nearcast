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
-- reference, and the `auth.uid()` and `auth.jwt()` the policies and
-- definer functions read.

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

-- the whole claim set, which is what the operator check reads. Kept as a
-- shim rather than inlining current_setting in production code, so the
-- migrations use the same accessor Supabase documents.
create or replace function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(current_setting('request.jwt.claims', true)::jsonb, '{}'::jsonb);
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

-- Supabase grants these, and code that reads the request's claims depends
-- on them. Without the schema usage, any function calling auth.uid() or
-- auth.jwt() directly as `authenticated` fails as "permission denied for
-- schema auth" — a harness difference that would otherwise look like a
-- policy bug.
grant usage on schema auth to authenticated, anon, service_role;
grant execute on function auth.uid() to authenticated, anon, service_role;
grant execute on function auth.jwt() to authenticated, anon, service_role;
