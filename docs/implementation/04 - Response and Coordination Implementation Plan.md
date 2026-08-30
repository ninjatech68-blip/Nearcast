# Response And Coordination Implementation Plan

> **For agentic workers:** Execute checkbox tasks in order with test-first changes and one coherent commit per task.

**Goal:** Let a recipient respond, let the broadcaster decide, and give accepted parties a temporary private coordination room.

**Architecture:** Responses are private to respondent and broadcaster. Acceptance is one locked database transaction. Messages persist before Realtime broadcast.

**Tech Stack:** Supabase Edge Functions/Postgres/Realtime, Expo Notifications, React Native.

## Task 1: Contextual Response

**Files:** `src/features/responses/`, `public.submit_response`

- [x] Test self-response, missing delivery, duplicate response, blocked pair, expiry, retry, and valid submission.
- [x] Implement singular ResponseCTA, qualification fields, and disclosure preview.
- [x] Queue a generic response notification in the same transaction.

`public.submit_response` is a `security definer` function, matching the
precedent set by the other server mutations. One transaction writes the
response and queues the broadcaster's notification, so a response can never
exist that nobody is told about, and a notification can never point at a
response that was rolled back.

Eligibility is delivery: an intent reaches a person through the reach graph, and
someone it never reached has no standing to respond. Self-response is refused
because responding to your own intent would be fabricating interest.

A second response from the same person returns their original rather than
refusing, so a retry does not read as a rejection, while the unique constraint
keeps one response per person per intent. A replayed idempotency key returns the
original; the same key with a different message conflicts.

The notification carries object identifiers and an event type only. The table
has no column for message text, so a payload cannot leak the response body even
by mistake, and the suite asserts that rather than assuming it.

Qualification stores only what the respondent claimed. An unchecked box is an
absence of a claim, not a claim of absence, so `false` is never stored: a screen
must not be able to render "does not have transport" as though it had been
asserted. The sheet shows one CTA and no view of anyone else's reply.

## Task 2: Broadcaster Inbox

**Files:** `src/features/responses/inbox/`, `public.decline_response`

- [x] Test that respondents cannot see competitors and declined users receive only neutral status.
- [x] Implement RequestCard and Accept/Reply/Decline actions.
- [x] Use expected status/version for every decision.

`responses_read_parties` already limits a respondent to their own response, so
competitors are invisible by policy rather than by the inbox choosing not to
render them; the suite asserts a respondent reads exactly one row while the
broadcaster reads all of them.

A decline is neutral because there is nowhere to put a reason: the responses
table has no such column, so a private justification cannot be stored and
therefore cannot leak. The inbox offers no reason field either.

Decisions carry the status they were made against, and both accept and decline
are idempotent on a repeat, so a retry confirms the outcome rather than
reporting a state the broadcaster cannot act on. Accept is withdrawn from the
inbox once the intent is no longer live, because a matched intent cannot take a
second match and offering it would promise what the server refuses.

Responses are never ranked or scored. Presenting them as a leaderboard would
turn a request for help into a competition the respondents cannot see they are
entered in.

## Task 3: Atomic Acceptance

**Files:** acceptance migration/function, concurrency pgTAP test, `src/features/matches/`

- [x] Run two concurrent acceptance attempts and prove exactly one match and conversation exist.
- [x] Return the existing match for an identical accepted-response retry.
- [x] Release no private field until a separate disclosure action succeeds.

Concurrency was proved with two real connections racing `accept_response` on
two different responses to the same intent, not with a single-session
simulation: pgTAP runs in one transaction and cannot express a race. One
attempt won and the other raised `stale_intent_state`, leaving exactly one
match, one conversation and one accepted response. The `for update` lock on the
intent serialises the attempts, and `matches.intent_id` being unique is the
constraint that makes a second match impossible even if the lock were bypassed.

`accept_response` now also queues the respondent's notification inside the same
transaction. Without it an accepted respondent would have a coordination room
open and no reason to look at it.

Acceptance releases nothing private. The suite asserts `match_disclosures` is
empty after a match is created and that the accepted participant still cannot
read `intent_private`; releasing a field remains a separate, deliberate act.

## Task 4: Temporary Messaging

**Files:** `src/features/messages/`, `supabase/functions/send-message/`

- [x] Test membership, closed room, block, body length, idempotency, reconnect, and missed-message fetch.
- [x] Persist before private-channel broadcast and unsubscribe on unmount.
- [x] Exclude typing, presence, media, voice, and live location.

The room renders through `react-native-gifted-chat`, configured so that every
excluded feature is left unenabled rather than switched off after the fact; the
message mapper is a whitelist, so a field with no column behind it cannot be
produced. Read receipts are limited to pending and sent, which report whether
PostgreSQL holds the row. `received` is never set, because nothing records
whether a message was read and a read tick would invent an activity signal.

`send-message` is a `security definer` database function rather than an Edge
Function, matching the `accept_response` precedent and the server-controlled
transaction rule in AGENTS.md. Persisting there is what makes the Realtime
broadcast safe: `postgres_changes` only emits after the transaction commits.
Room lifetime and the read-only state after close follow MUST-055 and MUST-056.

## Task 5: Notifications

**Files:** `supabase/functions/process-notifications/`, `src/infrastructure/notifications/`

- [ ] Test preference, generic payload, retry cap, invalid token, and deep-link reauthorization.
- [ ] Send object IDs and generic copy only through Expo Push Service.

## Exit Gate

The complete two-user flow passes E2E on iOS and Android, acceptance is concurrency-safe, reconnect restores persisted messages, and exact location stays hidden until explicit release.

## Change Log

| Date | Change |
|---|---|
| 2026-08-24 | Created response, acceptance, coordination, and notification implementation plan |
| 2026-08-30 | Completed temporary messaging on Gifted Chat with room expiry and a send-message database function |
| 2026-08-30 | Completed contextual response with delivery-based eligibility and a transactional notification |
| 2026-08-30 | Completed the broadcaster inbox and atomic acceptance, with concurrency proved across two connections |
