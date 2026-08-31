# Ops — Push Notifications Setup

What is in the repository, and the four steps that are not code.

> To actually turn push on for the first time, follow
> **`docs/Runbook - Turn Push On.md`** — it sequences every credential,
> deploy and check, and says how to read the result when one fails.

## The pieces

| Piece | Where | State |
| --- | --- | --- |
| Permission prompt + token registration | `src/features/notifications/push.ts` | in the app |
| Token store + RLS + `register_push_token` | `supabase/migrations/20260829140000_push.sql` | in the schema |
| Content-free outbox + triggers | same migration | in the schema |
| Branded copy + Expo delivery | `supabase/functions/send-push/index.ts` | in the repo, **needs deploying** |
| Minute-by-minute drain + weekly prune | `supabase/migrations/20260829150000_push_schedule.sql` | guarded no-op until step 3 |
| Batch claim, so two drains cannot double-send | `supabase/migrations/20260830180000_push_claim_batch.sql` | in the schema |
| Retry with backoff + error classification | `supabase/migrations/20260830200000_push_retry.sql` | in the schema |
| Badge count, Android channel split, TTL | `supabase/migrations/20260830210000_push_badge_and_channels.sql` | in the schema |
| Chat-message ping + presence suppression | `supabase/migrations/20260830170000_chat_expiry_and_message_push.sql` | in the schema |
| Tap handling (refresh + open the right chat) | `src/features/notifications/routing.ts` | in the app |

A push never carries intent text, a message, coordinates, contact
details, or a private-group name. The outbox stores a kind and ids; the
copy is composed at send time and says only enough to get the person to
open the app.

## What gets a ping

| Kind | Fires when | Suppressed when |
| --- | --- | --- |
| `join_request` | someone asks to join your cast | — |
| `join_accepted` | the caster says yes | — |
| `chat_message` | a message lands in a chat you are in | you have that chat open |

Each names the person who acted, resolved from `actor_id` at send time
and never stored on the row:

| kind | title | body |
| --- | --- | --- |
| `join_request` | **Riya wants to join** | Accept or decline when you're ready. |
| `join_accepted` | **Riya accepted your request** | The chat is open. |
| `chat_message` | **Riya** | Sent you a message. |

**No message excerpt and no plan title, deliberately.** `08 - Writing
and Content Guide.md` rules out "exact locations, prices, message
excerpts, and private-group references" on a lock screen, and AGENTS.md
rules out intent text and messages in a payload. A first name is neither
— the same guide states people can see each other's first name — so a
notification says who and what changed, and stops.

Sentence case, though the app speaks lowercase in-app: a lock screen
sits under the OS-rendered app name beside every other app, where
lowercase reads as a defect rather than a voice.

Quiet hours are NOT built. There is no quiet window in the schema, the
profile never syncs one, and the sender never asks. The switch that used
to sit in the profile was removed rather than left inert: it persisted a
window nothing read, and a control that promises the phone will stay
silent and does not is worse to ship than a missing one.

The scope, for when it is built: quiet hours apply to the app's own
pings, not to a person's message. `join_request` and `join_accepted` are
Nearcast talking, so they wait for a quiet window to pass;
`chat_message` is somebody writing to you and behaves like a text, which
is a per-chat mute or the OS's own Do Not Disturb to silence, not an
app-wide curfew. See Known limits.

`chat_message` is the one with a rule attached. A notification for a
message you are watching arrive is noise, so the open thread takes a
30-second presence lease (`touch_conversation_presence`) and renews it
every 10 seconds; the enqueue trigger checks that lease and stays quiet
while it holds. The lease is dropped explicitly when the screen closes
or the app backgrounds — backgrounding matters, because the app is no
longer in front of anyone and the next message *should* ping.

Nothing has to be cleaned up for this to be correct. Kill the app, lose
the network, run out of battery: the lease simply lapses and pings
resume. That is why it is a lease and not a flag, and why it is not
inferred from read receipts, which move whenever a list syncs.

A burst of messages is one ping, not one per message: a partial unique
index keeps a single un-drained `chat_message` row per (recipient,
conversation). Once that ping is claimed for sending, the next message
queues its own — so a reply half a minute later is not swallowed.

## Step 1 — APNs key on the Expo project

Delivery goes through Expo's push service, so the APNs key from the
Apple Developer account has to be on the Expo project — being in the
Apple account alone does nothing. This is true even though the build is
made locally in Xcode rather than by EAS.

```bash
npx eas credentials --platform ios
# Push Notifications → set up a Push Key (upload the .p8, or let it create one)
```

The bundle identifier there must be `com.piyushsharma.nearcast` and the
Expo project the one in `app.json` (`extra.eas.projectId`).

The bundle identifier changed on 2026-08-31: the app had been building as
`com.piyushsharma.trvlai.test` under the name `TrvlAI Test`, a different
product's identity, through fifteen builds. One consequence for push, and one non-consequence:

- **The push key carries over; the tokens do not.** An APNs auth key is
  issued to the Apple team, not to one app, so the existing key works for
  the new identifier without any action. The first build under
  `com.piyushsharma.nearcast` reused key `YVA6Q57NS8` exactly as it should.
  An earlier version of this note claimed the key had to be re-registered.
  That was wrong.
- **The push tokens already in `device_push_tokens` are dead.** A token is
  issued per app identity, so the three stored for the old app will never
  deliver again. Each device re-registers on first launch of the new app,
  and the sender's invalid-token handling prunes the old rows.

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

- Quiet hours do not exist. Not in the schema, not in profile sync, not
  in the sender, and no longer in the app: the local-only switch was
  removed once it was clear nothing ever read it. Any `join_request` or
  `join_accepted` can arrive at any hour. Building it means
  `quiet_start` and `quiet_end` on the profile, synced by
  `useProfileSync` and read before the enqueue decision — server-side
  state, which is why the local shape was not worth keeping warm.
  `chat_message` is out of scope by design and would not be held back
  even once this is wired up.
- Presence is keyed per PERSON, not per device: the lease is
  `(conversation_id, profile_id)`, and the trigger decides whether to
  enqueue at all before any device is looked at. So two devices signed
  into one account, with the chat open on either, suppress the ping on
  both. Fixing it means moving the decision to fan-out time in the
  sender, where device identity actually exists.
- Expo tickets and receipts are tracked, and dead tokens are
  invalidated automatically. Even so, a receipt only means the vendor
  accepted the notification, not that a human definitely saw a banner.
- A failure is retried up to `private.push_max_attempts()` times with a
  capped exponential backoff (`private.push_backoff`), and only if
  `private.push_error_is_retryable` says the error was the moment rather
  than the message. Rate limits, provider 5xx and dropped connections
  come back; dead tokens, oversized messages and bad credentials do not.
  A row that exhausts its budget records `gave_up_after_N:<code>`, so a
  spent budget is never misread as a permanently broken notification.
- What is going wrong, without reading a log:

  ```sql
  select * from public.notification_health;    -- counts by kind and status
  select * from public.notification_failures;  -- why things failed, worst first
  ```

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

---

# Ops — The Chat Window

A chat carries an expiry so it does not linger past the reason it
opened. `20260830170000_chat_expiry_and_message_push.sql` is what makes
that real; before it, `expires_at` was written and never read, so the
header counted down to "expired" over a composer that still worked.

Three layers, deliberately:

1. **The guard.** `private.assert_can_send` refuses past the expiry, so
   a lapsed chat stops taking messages at the instant it lapses rather
   than whenever a job next runs. Extending is refused for the same
   reason — there is nothing left to extend.
2. **The read.** `my_conversations` reports a lapsed chat as `ended`,
   so the app disables the composer without waiting for anything.
3. **The sweep.** `close_expired_conversations()` writes the close down
   — mode `ended`, `closed_at` set to the expiry it actually lapsed at,
   not the moment the sweeper noticed — and drops a note in the thread.
   Scheduled every five minutes; idempotent, so running it by hand is
   safe.

A chat closed by hand and one that ran out of time are told apart by
their error: `conversation_ended` and `conversation_expired`. An
`always` chat never lapses, whatever `expires_at` happens to hold.

The sweeper needs pg_cron. Where it is absent — `scripts/db-local.sh`
has neither pg_cron nor pg_net — the migration says so and skips, and
the guard plus the read still make expiry behave correctly; only the
durable write and the closing note wait for a scheduler.

Check it is running:

```sql
select jobname, schedule, active from cron.job
 where jobname in ('close-expired-conversations', 'prune-conversation-presence');
select public.close_expired_conversations(500);  -- returns rows closed
```

---

# Ops — Chat Load

An open chat polls, and that poll is the largest source of steady-state
load in the app: it runs for everyone signed in, several times a minute,
whether or not anything is happening. `20260830190000_chat_hot_path.sql`
and the cadence around it exist to make each tick proportional to what
changed rather than to how long the conversation has been going.

Measured before the change, against 400 conversations and a
2,000-message thread — one person, one chat open:

| per tick | before | after |
| --- | --- | --- |
| `mark_conversation_read` | 32.5 ms, 35,968 buffers | 0.17 ms |
| `mark_conversation_delivered` | 22.2 ms, 14,732 buffers | 0.15 ms |
| conversation metadata | 9.9 ms (whole list) | 1.3 ms (one row) |
| twenty ticks | 2,849 ms | 61 ms |
| dead tuples left behind | 62,000 | 121 |

Four things did it, none of which change what the app shows:

1. **Receipt watermarks.** Both marks rewrote a receipt row for every
   message in the thread, every tick. `conversation_reads` now carries
   `delivered_through` beside `last_read_at`, and a tick only looks at
   messages newer than it. The scan deliberately re-runs over a minute
   of overlap (`private.receipt_overlap()`) so a message committing
   slightly out of timestamp order is still picked up; `on conflict`
   makes re-stamping free.
2. **`conversation_summary(uuid)`.** The open thread needed one row and
   was pulling the whole list to get it. Same columns, one row.
3. **`private.conversation_rows`.** One definition behind both readers,
   with laterals correlated to the caller's own conversations. The old
   body ran five correlated subqueries per row, computed the last
   message twice, and built its match lookup from a scan of *every*
   match in the table before discarding all but the caller's.
4. **The poll became a floor again.** `src/features/chat/cadence.ts`
   slows both polls when the realtime socket is confirmed live, because
   a tick then re-fetches what already arrived over the socket. It fails
   toward polling fast: any status other than SUBSCRIBED — including
   not knowing yet — reads as not live.

An idle tick also no longer writes at all. Acknowledging an empty thread
wrote two receipt rows about nothing; the client now only answers for
something that actually came.

If chat ever feels sluggish, the first thing to check is whether the
socket is wrongly reporting itself live:

```sql
-- is the hot path still cheap? both should be well under a millisecond
explain (analyze, buffers) select public.mark_conversation_read('<id>');
explain (analyze, buffers) select * from public.conversation_summary('<id>');
-- watermarks should be advancing, not null
select conversation_id, last_read_at, delivered_through
  from public.conversation_reads where profile_id = '<uid>';
```
