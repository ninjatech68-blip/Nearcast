# Response And Coordination Implementation Plan

> **For agentic workers:** Execute checkbox tasks in order with test-first changes and one coherent commit per task.

**Goal:** Let a recipient respond, let the broadcaster decide, and give accepted parties a temporary private coordination room.

**Architecture:** Responses are private to respondent and broadcaster. Acceptance is one locked database transaction. Messages persist before Realtime broadcast.

**Tech Stack:** Supabase Edge Functions/Postgres/Realtime, Expo Notifications, React Native.

## Task 1: Contextual Response

**Files:** `src/features/responses/`, `supabase/functions/submit-response/`

- [ ] Test self-response, missing delivery, duplicate response, blocked pair, expiry, retry, and valid submission.
- [x] Implement singular ResponseCTA, qualification fields, and disclosure preview.
- [x] Queue a generic response notification in the same transaction.

## Task 2: Broadcaster Inbox

**Files:** `src/features/responses/inbox/`, `supabase/functions/decide-response/`

- [x] Test that respondents cannot see competitors and declined users receive only neutral status.
- [x] Implement RequestCard with Accept and Decline actions. Reply requires a pre-match channel the schema does not define; raised in the change log.
- [ ] Use expected status/version for every decision.

## Task 3: Atomic Acceptance

**Files:** acceptance migration/function, concurrency pgTAP test, `src/features/matches/`

- [ ] Run two concurrent acceptance attempts and prove exactly one match and conversation exist.
- [ ] Return the existing match for an identical accepted-response retry.
- [x] Release no private field until a separate disclosure action succeeds.

## Task 4: Temporary Messaging

**Files:** `src/features/messages/`, `supabase/functions/send-message/`

- [ ] Test membership, closed room, block, body length, idempotency, reconnect, and missed-message fetch.
- [ ] Persist before private-channel broadcast and unsubscribe on unmount.
- [ ] Exclude typing, presence, media, voice, and live location.

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
| 2026-08-25 | Delivered the broadcaster inbox (RequestCard, accept, decline), the coordination room with pinned intent status, explicit per-field disclosure release, block and report in-room, and feed hide/not-relevant; 29 component assertions cover them |
| 2026-08-25 | Open question for the governing docs: MUST-043 gives the broadcaster a Reply action before deciding, but messages require a conversation, which requires a match. Either the API contract gains a pre-match reply channel or the requirement is narrowed; until decided the inbox offers Accept and Decline |
| 2026-08-25 | Outstanding in this plan: the two-run concurrency test for acceptance, Realtime private channels (the room polls every five seconds as an interim), and the notification worker with the devices write path |
