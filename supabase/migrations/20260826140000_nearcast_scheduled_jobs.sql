-- Scheduled maintenance (Doc 04 retention table, Doc 11 operations).
--
-- Two things must happen without anyone pressing a button: a lapsed intent has
-- to stop looking live, and aged content has to be removed on the retention
-- schedule. Both are already tested functions; this migration only decides
-- when they run.
--
-- The schedule is declared as a contract rather than written inline, so the
-- substitute PostgreSQL harness can assert what is meant to run even though
-- pg_cron exists only on Supabase.

create or replace function private.scheduled_jobs()
returns table (job_name text, schedule text, command text)
language sql immutable set search_path = '' as $$
  select *
  from (values
    ('nearcast_expire_intents', '*/15 * * * *', 'select public.expire_intents();'),
    ('nearcast_apply_retention_policy', '17 3 * * *', 'select public.apply_retention_policy();')
  ) as jobs(job_name, schedule, command)
$$;

revoke execute on function private.scheduled_jobs() from public, anon, authenticated;

-- Guarded and idempotent: re-running the migration re-registers the same two
-- jobs rather than accumulating duplicates. On a plain PostgreSQL harness this
-- block is a recorded no-op.
do $$
declare
  job record;
begin
  if not exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    raise notice 'pg_cron is unavailable; maintenance jobs were not registered';
    return;
  end if;

  create extension if not exists pg_cron;

  for job in select * from private.scheduled_jobs() loop
    if exists (select 1 from cron.job where jobname = job.job_name) then
      perform cron.unschedule(job.job_name);
    end if;
    perform cron.schedule(job.job_name, job.schedule, job.command);
  end loop;
end $$;
