# Response And Coordination Implementation Plan

> **For agentic workers:** Execute checkbox tasks in order with test-first changes and one coherent commit per task.

**Goal:** Let a recipient respond, let the broadcaster decide, and give accepted parties a temporary private coordination room.

**Architecture:** Responses are private to respondent and broadcaster. Acceptance is one locked database transaction. Messages persist before Realtime broadcast.

**Tech Stack:** Supabase Edge Functions/Postgres/Realtime, Expo Notifications, React Native.

## Task 1: Contextual Response

**Files:** `src/features/responses/`, `supabase/functions/submit-response/`

- [ ] Test self-response, missing delivery, duplicate response, blocked pair, expiry, retry, and valid submission.
- [ ] Implement singular ResponseCTA, qualification fields, and disclosure preview.
- [ ] Queue a generic response notification in the same transaction.

## Task 2: Broadcaster Inbox

**Files:** `src/features/responses/inbox/`, `supabase/functions/decide-response/`

- [ ] Test that respondents cannot see competitors and declined users receive only neutral status.
- [ ] Implement RequestCard and Accept/Reply/Decline actions.
- [ ] Use expected status/version for every decision.

## Task 3: Atomic Acceptance

**Files:** acceptance migration/function, concurrency pgTAP test, `src/features/matches/`

- [ ] Run two concurrent acceptance attempts and prove exactly one match and conversation exist.
- [ ] Return the existing match for an identical accepted-response retry.
- [ ] Release no private field until a separate disclosure action succeeds.

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
