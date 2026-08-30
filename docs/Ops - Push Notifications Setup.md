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

## Token mapping

Do not test against "the newest iOS token" and assume it belongs to the
phone in your hand. A person can have multiple devices, reinstall the
app, or sign in on more than one handset.

Use the token rows with the profile and device metadata together:

```sql
select
  p.display_name,
  d.platform,
  d.device_label,
  d.device_model,
  d.app_build,
  left(d.token, 25) as token_prefix,
  d.updated_at
from public.device_push_tokens d
join public.profiles p on p.id = d.user_id
order by p.display_name, d.updated_at desc;
```

Send a direct Expo test only after matching the intended person and the
intended device row.

## Known limits

- Quiet hours are a local preference; the sender does not yet consult
  them, so a ping can arrive inside a person's quiet window.
- Expo tickets and receipts are tracked, and dead tokens are
  invalidated automatically. Even so, a receipt only means the vendor
  accepted the notification, not that a human definitely saw a banner.

---

# Ops — Chat Media

`20260829170000_chat_media.sql` creates everything: the message
columns, the `send_media` RPC, and a **private** `chat-media` bucket
with policies that let only a conversation's two parties read or write
under its `<conversation_id>/…` folder. `supabase db push` is the whole
setup — there is no dashboard step.

Two things worth knowing:

- **Photos need a native rebuild.** The camera needs
  `NSCameraUsageDescription`, which comes from the `expo-image-picker`
  plugin config in `app.json`. Regenerate and rebuild:
  `DEVELOPMENT_TEAM=<team-id> npm run ios:build -- prebuild`. The team
  must be passed because `prebuild` regenerates the Xcode project and
  the saved signing team goes with it.
- **GIF search is not built.** The picker sends an animated GIF that is
  already in the photo library, and iOS is asked for the asset as
  stored so it is not flattened to a still. A Giphy/Tenor style *search*
  picker needs a provider account and an API key, and shipping one means
  sending a search term to a third party from inside a private chat —
  that is a product decision, not a missing function.

Verify on two devices: send a photo from the camera, a photo from the
library, an animated GIF, and a location; check that
`select media_kind, media_path from public.messages order by created_at desc limit 4;`
shows paths under the conversation's folder, and that the bucket is
listed as private in the dashboard.
