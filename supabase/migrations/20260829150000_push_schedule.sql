-- ===============================================================
-- Drain the notification outbox on a schedule.
-- ===============================================================
--
-- The triggers in 20260829140000_push.sql enqueue a content-free row
-- the moment someone asks to join or gets accepted. Nothing sent them:
-- the outbox filled up and no device was ever pinged. This schedules
-- the `send-push` Edge Function to drain it every minute.
--
-- NO SECRET LIVES IN THIS FILE, and none is written into `cron.job`.
-- The scheduled command reads both values out of Vault at RUN time, so
-- the service key exists only in Vault. Before this can do anything,
-- store them once against the project (dashboard SQL editor, or psql
-- with the service connection):
--
--   select vault.create_secret(
--     'https://<project-ref>.supabase.co/functions/v1/send-push',
--     'send_push_url');
--   select vault.create_secret('<service-role-key>', 'send_push_service_key');
--
-- ...then re-run this migration (it is idempotent) or execute the same
-- DO block by hand. Until both secrets exist this is a documented
-- no-op rather than a failure — the same reason it is guarded on the
-- extensions: the headless local database in scripts/db-local.sh has
-- neither pg_cron nor pg_net, and a migration that only applies on the
-- hosted project would split the schema in two.
-- ===============================================================

do $$
declare
  has_url boolean := false;
  has_key boolean := false;
begin
  if to_regnamespace('cron') is null or to_regnamespace('net') is null then
    raise notice 'push schedule: pg_cron/pg_net not installed — skipping';
    return;
  end if;

  begin
    select exists (select 1 from vault.decrypted_secrets where name = 'send_push_url') into has_url;
    select exists (select 1 from vault.decrypted_secrets where name = 'send_push_service_key') into has_key;
  exception
    when others then
      raise notice 'push schedule: vault unreadable — skipping';
      return;
  end;

  if not (has_url and has_key) then
    raise notice 'push schedule: vault secrets send_push_url / send_push_service_key not set — skipping';
    return;
  end if;

  if exists (select 1 from cron.job where jobname = 'drain-notification-outbox') then
    perform cron.unschedule('drain-notification-outbox');
  end if;
  perform cron.schedule(
    'drain-notification-outbox',
    '* * * * *',
    $cron$
      select net.http_post(
        url := (select decrypted_secret from vault.decrypted_secrets where name = 'send_push_url'),
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'send_push_service_key')
        ),
        body := '{}'::jsonb
      );
    $cron$
  );

  -- a delivered notification is a fact about a moment that has passed;
  -- keeping it forever grows a table nobody reads. sent rows go after
  -- a week, which is long enough to debug a delivery complaint.
  if exists (select 1 from cron.job where jobname = 'prune-notification-outbox') then
    perform cron.unschedule('prune-notification-outbox');
  end if;
  perform cron.schedule(
    'prune-notification-outbox',
    '17 4 * * *',
    $cron$ delete from public.notification_outbox where sent_at < now() - interval '7 days' $cron$
  );

  raise notice 'push schedule: drain + prune scheduled';
end
$$;
