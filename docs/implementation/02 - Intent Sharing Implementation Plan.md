# Intent Creation And Sharing Implementation Plan

> **For agentic workers:** Execute checkbox tasks in order with test-first changes and one coherent commit per task.

**Goal:** Let an invited user create, review, publish, share, edit, withdraw, expire, and resolve a privacy-safe intent.

**Architecture:** Drafts remain local until publish. Server functions own state transitions; the app consumes privacy-specific view models rather than raw rows.

**Tech Stack:** Expo Router, Supabase Auth/Edge Functions/Postgres, Zod, Expo Linking and Share.

## Task 1: Invitation And Authentication

**Files:** `src/features/auth/`, `src/app/invite/[token].tsx`, `src/app/sign-in.tsx`, `supabase/functions/redeem-invite/`

- [ ] Test expired, used, valid, and rate-limited invitation tokens.
- [ ] Implement OTP sign-in and create a minimal profile only after invite redemption.
- [ ] Use generic authentication errors and secure session persistence.
- [ ] Verify sign-out removes local session and protected routes redirect.

## Task 2: Draft And Review

**Files:** `src/features/intents/create/`, `src/app/create.tsx`, `src/app/preview.tsx`

- [ ] Test local draft recovery, 500-character limit, expiry default, and required primitive.
- [ ] Add structured time, approximate place, quantity, price, requirements, and private details.
- [ ] Render `PrivacyDisclosure` from separate public/private draft models.
- [ ] Test offline draft storage and explicit draft clearing on account deletion.

## Task 3: Publish Transaction

**Files:** `supabase/functions/publish-intent/`, `src/features/intents/data/publish-intent.ts`, database tests

- [ ] Test owner, stale version, expired input, retry, and private-field leakage cases first.
- [ ] Validate request with Zod; atomically create context/private/reach/event rows and return share slug.
- [ ] Persist idempotency key and reject mismatched retry fingerprints.
- [ ] Track `intent_published` without statement or sensitive properties.

## Task 4: Public Link And Confirmation

**Files:** `src/app/i/[shareSlug].tsx`, `src/features/sharing/`, `supabase/functions/confirm-intent/`

- [ ] Test anonymous projection contains only the API contract fields.
- [ ] Add universal link routing and WhatsApp/system share action.
- [ ] Require authentication for one genuine confirmation per user and forbid self-confirmation.
- [ ] Render honest zero/one/many confirmation states without origin membership.

## Task 5: Owner Lifecycle

**Files:** `src/features/intents/manage/`, `supabase/functions/update-intent/`, `supabase/functions/close-intent/`

- [ ] Test material-edit event history, withdrawal, resolution, expiry, stale state, and duplicate retries.
- [ ] Add My Intents and IntentStatusHeader with next valid owner actions.
- [ ] Stop new responses immediately for non-live states.

## Exit Gate

Five testers publish and share real intents without assistance; public metadata and analytics contain no private field; all lifecycle and RLS tests pass.

## Change Log

| Date | Change |
|---|---|
| 2026-08-24 | Created intent creation and sharing implementation plan |
