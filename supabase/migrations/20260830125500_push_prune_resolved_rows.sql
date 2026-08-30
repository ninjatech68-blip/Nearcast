-- ===============================================================
-- Prune push outbox rows by resolved lifecycle, not only sent_at.
-- ===============================================================
--
-- After receipt tracking, a notification can end in more than one
-- terminal state:
--
-- - delivered
-- - partial
-- - failed
-- - no_devices
--
-- Old pruning only removed rows with sent_at, which left failed and
-- no-device rows behind forever. Keep pending/submitted rows for active
-- work, and prune only resolved rows older than a week.
-- ===============================================================

do $$
begin
  if to_regnamespace('cron') is null then
    raise notice 'push prune update: pg_cron not installed — skipping';
    return;
  end if;

  if exists (select 1 from cron.job where jobname = 'prune-notification-outbox') then
    perform cron.unschedule('prune-notification-outbox');
  end if;

  perform cron.schedule(
    'prune-notification-outbox',
    '17 4 * * *',
    $cron$
      delete from public.notification_outbox
      where coalesce(resolved_at, sent_at) < now() - interval '7 days'
    $cron$
  );

  raise notice 'push prune update: prune-notification-outbox rescheduled';
end
$$;
