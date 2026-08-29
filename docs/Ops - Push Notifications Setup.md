# Ops — Push Notifications Setup

What is in the repository, and the four steps that are not code.

## The pieces

| Piece | Where | State |
| --- | --- | --- |
| Permission prompt + token registration | `src/features/notifications/push.ts` | in the app |
| Token store + RLS + `register_push_token` | `supabase/migrations/20260829140000_push.sql` | in the schema |
| Content-free outbox + triggers | same migration | in the schema |
| Branded copy + Expo delivery | `supabase/functions/send-push/index.ts` | in the repo, **needs deploying** |
| Minute-by-minute drain + weekly prune | `supabase/migrations/20260829150000_push_schedule.sql` | guarded no-op until step 3 |
| Tap handling (refresh + open activity) | `src/features/notifications/routing.ts` | in the app |

A push never carries intent text, a message, coordinates, contact
details, or a private-group name. The outbox stores a kind and ids; the
copy is composed at send time and says only enough to get the person to
open the app.

## Step 1 — APNs key on the Expo project

Delivery goes through Expo's push service, so the APNs key from the
Apple Developer account has to be on the Expo project — being in the
Apple account alone does nothing. This is true even though the build is
made locally in Xcode rather than by EAS.

```bash
npx eas credentials --platform ios
# Push Notifications → set up a Push Key (upload the .p8, or let it create one)
```

The bundle identifier there must be `com.piyushsharma.trvlai.test` and
the Expo project the one in `app.json` (`extra.eas.projectId`).

## Step 2 — deploy the sender

```bash
supabase functions deploy send-push --project-ref <project-ref>
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected by Supabase.
Set `EXPO_ACCESS_TOKEN` only if the Expo project requires one:

```bash
supabase secrets set EXPO_ACCESS_TOKEN=... --project-ref <project-ref>
```

## Step 3 — let the schedule find its secrets

`20260829150000_push_schedule.sql` deliberately contains no secret and
writes none into `cron.job`; the scheduled command reads both out of
Vault when it runs. Store them once, on the hosted project:

```sql
select vault.create_secret(
  'https://<project-ref>.supabase.co/functions/v1/send-push',
  'send_push_url');
select vault.create_secret('<service-role-key>', 'send_push_service_key');
```

Then re-run the migration (`supabase db push`) — it is idempotent and,
with the secrets present, schedules the drain every minute and a prune
of sent rows at 04:17 daily. Without them it logs a notice and does
nothing, which is also what happens on the headless local database in
`scripts/db-local.sh`, where pg_cron and pg_net do not exist.

Confirm:

```sql
select jobname, schedule, active from cron.job;
```

## Step 4 — prove it end to end

On two physical devices (never the simulator):

1. Both sign in and finish onboarding, allowing notifications.
2. `select count(*) from public.device_push_tokens;` → 2.
3. Device A posts a cast. Device B asks to join it.
4. `select kind, sent_at from public.notification_outbox order by created_at desc limit 5;`
   — a `join_request` row appears, and `sent_at` fills in within a minute.
5. Device A gets "someone wants in". Tapping it opens the app on
   activity, under **needs you**, with the request already loaded.
6. Device A accepts. Device B gets "you're in" and lands on activity.

If step 4 shows rows but `sent_at` stays null, the schedule is not
running (step 3). If `sent_at` fills in but no banner arrives, delivery
is failing at Expo or APNs (step 1) — check the function logs:

```bash
supabase functions logs send-push --project-ref <project-ref>
```

## Known limits

- Quiet hours are a local preference; the sender does not yet consult
  them, so a ping can arrive inside a person's quiet window.
- There is no receipt of delivery. `sent_at` records that the message
  was handed to Expo, not that a phone showed it.
