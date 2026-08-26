# Intent Creation And Sharing Implementation Plan

> **For agentic workers:** Execute checkbox tasks in order with test-first changes and one coherent commit per task.

**Goal:** Let an invited user create, review, publish, share, edit, withdraw, expire, and resolve a privacy-safe intent.

**Architecture:** Drafts remain local until publish. Server functions own state transitions; the app consumes privacy-specific view models rather than raw rows.

**Tech Stack:** Expo Router, Supabase Auth/Edge Functions/Postgres, Zod, Expo Linking and Share.

## Task 1: Invitation And Authentication

**Files:** `src/features/auth/`, `src/app/invite/[token].tsx`, `src/app/sign-in.tsx`, `supabase/functions/redeem-invite/`

- [x] Test expired, used, valid, and rate-limited invitation tokens.
- [x] Implement Google and Apple sign-in and create a minimal profile only after invite redemption.
- [x] Use generic authentication errors and secure session persistence.
- [ ] Verify sign-out removes local session and protected routes redirect.

## Task 2: Draft And Review

**Files:** `src/features/intents/create/`, `src/app/create.tsx`, `src/app/preview.tsx`

- [x] Test local draft recovery, 500-character limit, expiry default, and required primitive.
- [ ] Add structured time, approximate place, quantity, price, requirements, and private details.
- [ ] Render `PrivacyDisclosure` from separate public/private draft models.
- [x] Test offline draft storage and explicit draft clearing on account deletion.

## Task 3: Publish Transaction

**Files:** `supabase/functions/publish-intent/`, `src/features/intents/data/publish-intent.ts`, database tests

- [x] Test owner, stale version, expired input, retry, and private-field leakage cases first.
- [x] Atomically create context/reach/event rows and return the share slug.
- [x] Persist idempotency key and reject mismatched retry fingerprints.
- [ ] Track `intent_published` without statement or sensitive properties.

## Task 4: Public Link And Confirmation

**Files:** `src/app/i/[shareSlug].tsx`, `src/features/sharing/`, `supabase/functions/confirm-intent/`

- [x] Test anonymous projection contains only the API contract fields.
- [ ] Add universal link routing and WhatsApp/system share action.
- [x] Require authentication for one genuine confirmation per user and forbid self-confirmation.
- [x] Render honest zero/one/many confirmation states without origin membership.

## Task 5: Owner Lifecycle

**Files:** `src/features/intents/manage/`, `supabase/functions/update-intent/`, `supabase/functions/close-intent/`

- [x] Test withdrawal, resolution, expiry, stale state, and duplicate retries.
- [ ] Add My Intents and IntentStatusHeader with next valid owner actions.
- [x] Stop new responses immediately for non-live states.
- [x] Add `update_intent` with material-edit history visible to existing respondents (MUST-017).

## Exit Gate

Five testers publish and share real intents without assistance; public metadata and analytics contain no private field; all lifecycle and RLS tests pass.

## Change Log

| Date | Change |
|---|---|
| 2026-08-24 | Created intent creation and sharing implementation plan |
| 2026-08-25 | Resolved C-01: replaced OTP sign-in with Google and Apple sign-in to match MVP Requirement MUST-001 |
| 2026-08-25 | Delivered invitation redemption, Google and Apple sign-in, the publish transaction with idempotency, origin confirmation, close and expiry, and the anonymous share projection; 74 Phase 1 pgTAP assertions pass |
| 2026-08-25 | Outstanding in this plan: Zod validation at the publish boundary, structured draft fields beyond primitive and statement, offline draft persistence, universal-link routing and the WhatsApp share action, material-edit history, and the `intent_published` analytics event |
| 2026-08-26 | Delivered Zod validation at the publish boundary and material-edit history: `update_intent`, the respondent-visible history policy, the owner edit screen, and 30 pgTAP assertions. Editing stops at `matched`, a rewritten statement counts as material, and the event records categories rather than values — all three recorded in the Doc 00 decision log. No analytics event is emitted for edits, because the Doc 09 taxonomy names none and inventing one would widen telemetry no metric asks for. Outstanding in this plan: structured draft fields beyond statement and area in the composer, offline draft persistence, and universal-link routing with the WhatsApp share action |
| 2026-08-26 | Delivered offline draft persistence (MUST-015): a local SQLite draft written on every change, restored as initial composer state, cleared on publish and on account deletion. Publishing now distinguishes an unreachable server from a refusal and never reports success it did not receive; a retry reuses the same idempotency key. Outstanding in this plan: the structured composer fields, and universal-link routing with the WhatsApp share action |
