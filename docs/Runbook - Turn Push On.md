# Runbook — Turn Push On

Everything in the repository is built and tested. Push still does not
work, and none of the reasons are code:

| # | What is missing | Without it |
| --- | --- | --- |
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

In the Supabase SQL editor:

```sql
select vault.create_secret(
  'https://<project-ref>.supabase.co/functions/v1/send-push',
  'send_push_url');
select vault.create_secret('<service-role-key>', 'send_push_service_key');
```

Then re-run `20260829150000_push_schedule.sql` (it is idempotent), or
execute its `DO` block by hand.

**Check:**

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

**Check:**

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

Follow it in the database:

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
