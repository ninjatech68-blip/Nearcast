-- Minimal emulation of the Supabase platform objects the TrueGoing schema
-- depends on, for running migrations and pgTAP on a plain PostgreSQL
-- cluster when the Supabase Docker stack is unavailable.
--
-- Mirrors Supabase behaviour that matters for security tests:
--   * roles anon / authenticated (no RLS bypass) and service_role (bypassrls)
--   * auth.uid() and auth.role() read the request.jwt claims exactly as Supabase does
--   * default privileges grant ALL on new public tables to anon/authenticated,
--     so a migration that forgets to revoke is caught by the tests
-- This is not a substitute for `supabase test db`; CI runs the real stack.

create role anon nologin noinherit;
create role authenticated nologin noinherit;
create role service_role nologin noinherit bypassrls;
create role authenticator login noinherit;
grant anon, authenticated, service_role to authenticator;

create schema if not exists extensions;
create schema if not exists auth;
grant usage on schema auth to anon, authenticated, service_role;
grant usage on schema extensions to anon, authenticated, service_role;
grant usage on schema public to anon, authenticated, service_role;

create table auth.users (
  instance_id uuid,
  id uuid primary key,
  aud varchar(255),
  role varchar(255),
  email varchar(255),
  encrypted_password varchar(255),
  email_confirmed_at timestamptz,
  phone text,
  raw_app_meta_data jsonb,
  raw_user_meta_data jsonb,
  created_at timestamptz,
  updated_at timestamptz
);

create function auth.uid() returns uuid language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;

create function auth.role() returns text language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')
  )::text
$$;

grant execute on function auth.uid(), auth.role() to anon, authenticated, service_role;

alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;

create publication supabase_realtime;

-- Supabase puts extension functions on the search path.
alter database postgres set search_path = "$user", public, extensions;
