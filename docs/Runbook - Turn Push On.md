# Runbook — Turn Push On

Everything in the repository is built and tested. Push still does not
work, and none of the reasons are code:

| # | What is missing | Without it |
| --- | --- | --- |
| 0 | The schema on the hosted project | Every table and function below is missing |
| 1 | An APNs key on the Expo project | iOS tokens register, nothing is ever delivered |
| 2 | FCM credentials for Android | Android tokens cannot be issued at all |
| 3 | `send-push` deployed | The outbox fills and nothing drains it |
| 4 | Two Vault secrets | The cron drain is a documented no-op — it never calls the function |
| 5 | A development build on a real device | Expo Go has not carried push since SDK 53 |

Work them in order. Each step ends with something you can check, so a
failure is attributable to one step rather than to "push doesn't work".

Everything below needs credentials only the project owner has. Have
ready: the Expo account that owns the EAS project, an Apple Developer
account, the Firebase project, and the Supabase project ref plus its
service-role key.

## Running the checks — read this first

**Every SQL check in this runbook is about the HOSTED project.** None of
them mean anything run locally, and `supabase db query` defaults to the
LOCAL database, so a check run without a target reports on a database
that has nothing to do with what you just deployed:

```
error: relation "public.notification_outbox" does not exist
```

That message means you queried the wrong database, not that the deploy
failed. Always pass `--linked` (after `supabase link --project-ref`):

```bash
supabase db query --linked "select 1;"
```

For multi-statement checks, put the SQL in a file and use `-f`:

```bash
supabase db query --linked -f /tmp/check.sql
```

The one exception is step 4, which is run in the **Supabase SQL editor**
in the browser — deliberately, because it carries the service-role key
and that should not go through shell history.

---

## Step 0 — get the schema onto the hosted project

36 migrations exist in the repository. Everything in this runbook
assumes they have been applied to the Supabase project; on a project
that has not seen this branch, none of them have.

```bash
supabase link --project-ref <project-ref>
supabase migration list          # LOOK at this before going further
supabase db push                 # applies what is missing, in order
```

**`supabase db push` only applies migrations. `supabase db reset` DROPS
THE DATABASE — never run it against a hosted project.**

**Check** — against the hosted project (`supabase db query --linked -f ...`):

```sql
select count(*) from public.notification_outbox;      -- 0, not an error
select count(*) from public.conversation_presence;    -- 0, not an error
select proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public'
   and proname in ('claim_notification_batch','record_notification_failure',
                   'my_unread_badge','conversation_summary');
-- expect all four
```

---

## Step 1 — APNs key on the Expo project

```bash
npx eas credentials
# → iOS → your profile → Push Notifications: Manage your Apple Push Key
# upload an existing .p8, or let EAS create one
```

**Check:** `npx eas credentials` lists a Push Key against the iOS
profile. Nothing else in this runbook will produce an iOS notification
until it does.

---

## Step 2 — FCM credentials for Android

`app.json` currently has no `googleServicesFile`, so Android push is not
configured at all.

1. Firebase console → your project → Add app → Android, with package
   name **`com.piyushsharma.nearcast.dev`** (it must match `app.json`
   exactly, and the dev and production bundles are different apps).
2. Download `google-services.json` into the repository root.
3. Add it to `app.json`:

```jsonc
"android": {
  "package": "com.piyushsharma.nearcast.dev",
  "googleServicesFile": "./google-services.json"
}
```

4. Give EAS the FCM V1 service-account key:

```bash
npx eas credentials    # → Android → FCM V1 service account key → upload
```

**Do not commit `google-services.json`.** Add it to `.gitignore` and
upload it to EAS as a file-type secret instead:

```bash
npx eas secret:create --scope project --name GOOGLE_SERVICES_JSON \
  --type file --value ./google-services.json
```

**Check:** `npx eas credentials` shows an FCM V1 key for Android.

---

## Step 3 — deploy the sender

```bash
supabase functions deploy send-push --project-ref <project-ref>
supabase functions deploy prune-chat-media --project-ref <project-ref>

# only if your Expo project requires one for push
supabase secrets set EXPO_ACCESS_TOKEN=<token> --project-ref <project-ref>
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected by Supabase;
do not set them yourself.

**Check** — invoke it by hand with an empty outbox. It should answer
without doing anything:

```bash
curl -s -X POST "https://<project-ref>.supabase.co/functions/v1/send-push" \
  -H "Authorization: Bearer <service-role-key>" \
  -H "Content-Type: application/json" -d '{}'
# {"ok":true,"receipts":{...},"sends":{"attempted":0,...}}
```

`"ok": true` here proves the function deployed, booted, and can reach
the database. It is the first time this code has ever executed.

---

## Step 4 — let the schedule find its secrets

The drain reads its URL and key out of Vault at run time so no secret is
ever written into `cron.job`. Until both exist, the schedule migration
is a deliberate no-op.

In the **Supabase SQL editor** in the browser — not the CLI, because
this carries the service-role key and should not enter shell history:

```sql
select vault.create_secret(
  'https://<project-ref>.supabase.co/functions/v1/send-push',
  'send_push_url');
select vault.create_secret('<service-role-key>', 'send_push_service_key');
```

Then re-run `20260829150000_push_schedule.sql` (it is idempotent), or
execute its `DO` block by hand.

**Check** — `supabase db query --linked "select jobname, schedule, active from cron.job;"`

```sql
select jobname, schedule, active from cron.job;
-- expect: drain-notification-outbox, prune-notification-outbox,
--         close-expired-conversations, prune-conversation-presence
```

If `drain-notification-outbox` is absent, the secrets are not readable
and the migration skipped silently — that is the single most likely
reason push appears dead after everything else is done.

---

## Step 5 — a real device

Expo Go cannot receive push. You need a development build.

```bash
npx eas build --profile development --platform ios
npx eas build --profile development --platform android
```

Install, sign in, and accept the notification prompt.

**Check** — hosted, `--linked`:

```sql
select platform, device_model, app_build, invalidated_at
from public.device_push_tokens;
```

A row per device, `invalidated_at` null. No row means the client never
got a token — check that the notification permission was granted and
that `expo.extra.eas.projectId` is set in `app.json`.

---

## Step 6 — prove it end to end

Two accounts, two devices. On device A, send a message to B. **Close the
app on B completely** — presence suppression will correctly withhold the
notification if B has that chat open.

Within a minute B should get *"a new message / they wrote back. yours to
read."*, tapping it should open that conversation, and the app icon
should carry a badge.

Follow it in the hosted database — `supabase db query --linked -f ...`:

```sql
-- did the trigger queue it?
select kind, delivery_status, attempt_count, last_error, next_attempt_at
from public.notification_outbox order by created_at desc limit 5;

-- did Expo accept it, and what did the receipt say?
select ticket_status, receipt_status, error_code, error_message
from public.notification_deliveries order by created_at desc limit 5;

-- the two views that answer "what is going wrong"
select * from public.notification_health;
select * from public.notification_failures;
```

### Reading the result

| What you see | What it means |
| --- | --- |
| No outbox row | The trigger did not fire. Is the recipient the *other* party, and is the chat window still open? |
| `pending` with `next_attempt_at` in the future | It failed and is waiting to retry. `last_error` says why. |
| `pending`, `next_attempt_at` null, never moving | The cron drain is not running — go back to step 4. |
| `no_devices` | No usable token for that person. Step 5. |
| `failed`, `last_error` `InvalidCredentials` / `MismatchSenderId` | Steps 1–2 are wrong or incomplete. |
| `failed`, `last_error` `gave_up_after_5:...` | It retried its whole budget. The suffix is the real error. |
| `delivered` but no banner | It arrived and the OS chose not to show it — usually the app was foregrounded on that chat, or the notification channel is muted in Android settings. |

---

## Notes

- **`DeviceNotRegistered` is normal** after reinstalling an app. The
  token is invalidated automatically and re-registers on next launch.
- **Presence suppression is not a bug.** No notification is sent to
  someone who has that conversation open. Background the app to test.
- **Chat messages ignore quiet hours by design** — a person's message
  behaves like a text. Only `join_request` and `join_accepted` are
  app-generated pings, and quiet hours for those is not built yet.
- **Android channels are split** into Messages and Requests, so people
  tune them separately in system settings. A muted channel delivers
  silently and still shows nothing.
