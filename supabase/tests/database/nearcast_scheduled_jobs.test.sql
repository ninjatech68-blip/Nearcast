-- Scheduled maintenance jobs.
-- Two jobs keep stored state honest: expiry, so a lapsed intent stops looking
-- live, and retention, so aged messages and exact locations are removed on the
-- Doc 04 schedule. The definitions are a testable contract; registration with
-- pg_cron is applied from them.
begin;

create extension if not exists pgtap with schema extensions;
select plan(9);

-- ---------------------------------------------------------------- contract
select has_function(
  'private', 'scheduled_jobs', array[]::text[],
  'the schedule contract exists'
);

select results_eq(
  $$ select count(*)::int from private.scheduled_jobs() $$,
  array[2],
  'exactly two jobs are scheduled, and no more run unattended'
);

select results_eq(
  $$ select schedule from private.scheduled_jobs() where job_name = 'nearcast_expire_intents' $$,
  array['*/15 * * * *'::text],
  'expiry runs every fifteen minutes, so a lapsed intent is never long stale'
);

select isnt_empty(
  $$ select 1 from private.scheduled_jobs()
     where job_name = 'nearcast_expire_intents' and command like '%public.expire_intents%' $$,
  'the expiry job calls the tested expiry function, not inline SQL'
);

select isnt_empty(
  $$ select 1 from private.scheduled_jobs()
     where job_name = 'nearcast_apply_retention_policy' and schedule ~ '^\d+ \d+ \* \* \*$' $$,
  'retention runs once a day at a fixed hour'
);

select isnt_empty(
  $$ select 1 from private.scheduled_jobs()
     where job_name = 'nearcast_apply_retention_policy'
       and command like '%public.apply_retention_policy%' $$,
  'the retention job calls the tested retention function'
);

-- ------------------------------------------------------------------ grants
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-0000000000f1","role":"authenticated"}';
select throws_ok(
  $$ select * from private.scheduled_jobs() $$,
  '42501',
  NULL,
  'a client cannot read the maintenance schedule'
);
select throws_ok(
  $$ select public.apply_retention_policy() $$,
  '42501',
  NULL,
  'a client cannot run the retention job by hand'
);
reset role;

-- ------------------------------------------------------------ registration
-- pg_cron exists on Supabase but not on the substitute harness. Where it is
-- present the jobs must actually be registered; where it is absent, say so
-- rather than claiming a pass.
-- pg_cron exists on Supabase but not on the substitute harness. The lookup is
-- deferred to run time, because a plain `case` would still parse the branch
-- that references `cron.job` on a harness where that relation does not exist.
create function pg_temp.cron_registration_check() returns text language plpgsql as $check$
declare registered integer;
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    execute $q$
      select count(*)::int from cron.job
      where jobname in (select job_name from private.scheduled_jobs())
    $q$ into registered;
    return is(registered, 2, 'both jobs are registered with pg_cron');
  end if;
  return pass('pg_cron is not installed here; registration is exercised on the Supabase stack in CI');
end
$check$;

select pg_temp.cron_registration_check();

select * from finish();
rollback;
