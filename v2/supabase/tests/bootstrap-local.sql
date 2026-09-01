-- Local-only shim for what hosted Supabase provides: the auth schema,
-- auth.uid(), and the two client roles. Never applied to a real project.
do $$ begin
  if not exists (select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
end $$;
create schema if not exists auth;
create schema if not exists extensions;
create table if not exists auth.users (id uuid primary key);
create or replace function auth.uid() returns uuid language sql stable as
$f$ select nullif(current_setting('request.jwt.claims', true)::json->>'sub','')::uuid $f$;
create or replace function auth.jwt() returns jsonb language sql stable as
$f$ select coalesce(nullif(current_setting('request.jwt.claims', true),'')::jsonb, '{}'::jsonb) $f$;
grant usage on schema auth, extensions to anon, authenticated;
grant execute on function auth.uid(), auth.jwt() to anon, authenticated;
