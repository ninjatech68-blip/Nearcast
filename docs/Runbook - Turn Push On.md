# Runbook — Turn Push On

Everything in the repository is built and tested. When push does not
work, it is almost never the code — it is one of these, and none of them
are code:

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
select count(*) as outbox from public.notification_outbox;
select count(*) as presence from public.conversation_presence;
select proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public'
   and proname in ('claim_notification_batch','record_notification_failure',
                   'my_unread_badge','conversation_summary');
```

**What passes:** the two counts return **a number — any number** — and
the last returns **all four** function names.

A number is the whole point: it proves the table exists. `0` is not the
expected value, it is merely one possible one. On a project that has
seen any testing, a non-zero outbox is normal and expected — nothing has
ever drained it, which is the entire reason for this runbook. Only an
**error** fails this check:

```
error: relation "public.notification_outbox" does not exist
```

That means the schema is not applied, or you queried the wrong database.

> **If the outbox is non-zero, read "Before the first drain" below
> before you reach step 4.** Those rows are real notifications that are
> about to be delivered.

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

## Before the first drain — what is already in the outbox

Anything sitting in `notification_outbox` with `delivery_status =
'pending'` has never been delivered, because nothing has ever drained
it. The moment step 4 starts the cron job, the drain claims every one
of them and submits them for real.

If those rows are days old, that means real people getting *"someone
wants in"* about a cast that has long since happened. The TTL added in
`20260830210000` bounds how long the *provider* holds a notification; it
does not make a week-old queued row young.

So look before you start the drain:

```sql
select kind, delivery_status, count(*),
       min(created_at) as oldest, max(created_at) as newest
from public.notification_outbox
group by kind, delivery_status
order by 3 desc;

-- and whether anyone would actually receive them
select count(*) as live_tokens
from public.device_push_tokens where invalidated_at is null;
```

**If `live_tokens` is 0**, the queue is harmless: the drain will mark
every row `no_devices` and resolve it without sending anything. Carry
on.

**If `live_tokens` is not 0 and the rows are stale**, retire them before
step 4. Mark rather than delete, so the audit trail keeps the fact that
they existed and were deliberately not sent:

```sql
update public.notification_outbox
set delivery_status = 'failed',
    last_error = 'discarded_before_first_drain',
    resolved_at = now(),
    next_attempt_at = null
where delivery_status = 'pending'
  and created_at < now() - interval '1 day';
```

Then re-run the group-by above and confirm nothing stale is still
`pending`.

---

## Step 3 — deploy the sender

> **This is very likely a REDEPLOY, not a first deploy.** If the outbox
> holds rows with status `delivered`, `no_devices` or `failed`, a
> previous version of `send-push` has already run — those three statuses
> are written by nothing else.
>
> That makes version skew the failure mode to watch for. The kinds a
> notification can have live in the DATABASE (the `kind` check
> constraint, and the triggers that enqueue), while the COPY for each
> kind lives in the FUNCTION. Applying a migration that adds a kind
> without redeploying the function means the database starts queueing
> something the function cannot render, and every one of those rows dies
> as `unknown_kind:<kind>` — terminal by design, silent unless someone
> reads `last_error`.
>
> The tell is a clean split by kind: older kinds `delivered`, the newest
> kind uniformly `failed`, starting at the moment its migration landed.
> If you see that, deploying the current function is the fix.

> **Skew runs the other way too, and this direction breaks things that
> currently work.** The sender sets `channelId` on every Android
> notification, but Android notification channels are created by the
> CLIENT, in `configureNotifications()`. A notification posted to a
> channel that does not exist on the device is dropped by Android and
> never shown — silently, with a delivered receipt.
>
> So a sender that names `messages` and `requests` will go dark on any
> Android device still running a build that only created `default`.
> iOS ignores `channelId`, so iOS is unaffected either way.
>
> Before redeploying a sender that changed `channelId`, check what is
> actually out there:
>
> ```sql
> select platform, app_build, count(*)
> from public.device_push_tokens
> where invalidated_at is null
> group by platform, app_build;
> ```
>
> No Android tokens: redeploy freely. Android tokens on an older build:
> ship the client build FIRST — it creates the channels on launch — or
> the redeploy trades a broken chat notification for a broken join
> notification.

```bash
supabase functions deploy send-push --project-ref <project-ref>
supabase functions deploy prune-chat-media --project-ref <project-ref>

# only if your Expo project requires one for push
supabase secrets set EXPO_ACCESS_TOKEN=<token> --project-ref <project-ref>
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected by Supabase;
do not set them yourself.

**Check** — invoke it by hand. It should answer without doing anything:

```bash
curl -s -X POST "https://<project-ref>.supabase.co/functions/v1/send-push" \
  -H "Authorization: Bearer $EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY" \
  -H "Content-Type: application/json" -d '{}'
# {"ok":true,"receipts":{...},"sends":{"attempted":0,...,"retrying":0}}
```

**Use the anon / publishable key, not the service-role key.** The
gateway only needs *a* valid JWT to let the request through; the
function does its own privileged work with the `SUPABASE_SERVICE_ROLE_KEY`
that Supabase injects into its environment, never with the caller's
token. The anon key is public — it ships in the app — so it belongs in
a shell in a way the service-role key does not.

Without any header you get `UNAUTHORIZED_NO_AUTH_HEADER`, which means
the gateway rejected you, not that the function is broken.

`"ok": true` proves the function deployed, booted, and can reach the
database. A `"retrying"` field inside `sends` proves it is the CURRENT
build rather than an older one still running.

**You may not need this check at all.** Once the cron drain from step 4
is active it invokes the function every minute using the key from Vault,
so a fresh end-to-end test (step 6) proves the deploy took *and* proves
delivery, in one observation. Reach for the curl when you want to
separate "did it deploy" from "does it deliver".

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

Within a minute B should get a banner titled with A's first name and
the body *"Sent you a message."* — that is the copy the deployed sender
actually composes (`COPY.chat_message` in
`supabase/functions/send-push/index.ts`), and it is deliberately free of
any excerpt. Tapping it should open that conversation, and the app icon
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

**What healthy looks like.** Confirmed in production on 2026-08-30 —
two chat messages, end to end:

| message | queued | `submitted` | `delivered` |
| --- | --- | --- | --- |
| #1 | 15:56:47 | 15:57:00 | 15:58:00 |
| #2 | 15:58:05 | 15:59:00 | 16:00:01 |

A row moves `pending → sending → submitted → delivered`, and each hop
waits for the next minute-ly drain: one to submit it to Expo, the next
to poll the receipt and promote it. So roughly a minute to reach the
device and another before the database says `delivered`.

`submitted` is therefore a NORMAL transient state, not a stuck one. Read
the outbox during that window — as is easy to do, since you are usually
querying seconds after testing — and a perfectly healthy notification
looks unfinished. Give it one more drain cycle before investigating.

| What you see | What it means |
| --- | --- |
| `submitted`, `resolved_at` null, less than ~2 min old | Normal. The receipt has not been polled yet. Wait one drain cycle. |
| `submitted` for many minutes | The receipt poll is failing. Check `notification_deliveries.error_code`. |
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
