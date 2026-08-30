# Intent Creation And Sharing Implementation Plan

> **For agentic workers:** Execute checkbox tasks in order with test-first changes and one coherent commit per task.

**Goal:** Let an invited user create, review, publish, share, edit, withdraw, expire, and resolve a privacy-safe intent.

**Architecture:** Drafts remain local until publish. Server functions own state transitions; the app consumes privacy-specific view models rather than raw rows.

**Tech Stack:** Expo Router, Supabase Auth/Edge Functions/Postgres, Zod, Expo Linking and Share.

## Task 1: Invitation And Authentication

**Files:** `src/features/auth/`, `src/app/invite/[token].tsx`, `src/app/sign-in.tsx`, `public.redeem_invite`

- [x] Test expired, used, valid, and rate-limited invitation tokens.
- [x] Implement OTP sign-in and create a minimal profile only after invite redemption.
- [x] Use generic authentication errors and secure session persistence.
- [x] Verify sign-out removes local session and protected routes redirect.

Redemption is `public.redeem_invite`, a `security definer` function rather than
an Edge Function, matching the `accept_response` and `send_message` precedent.
The client insert policy on `profiles` was removed, so redemption is the only
path that creates a profile and membership cannot be self-granted.

Two decisions worth carrying forward. Raw invitation tokens are never stored,
only a SHA-256 hash, so a database disclosure hands out no working invitations.
And redemption reports an outcome instead of raising for recoverable failures:
`raise exception` aborts the whole call, which would roll back the attempt row
written moments earlier and leave the rate limit permanently at zero. Missing,
expired and already-redeemed tokens share one outcome so a caller cannot probe
which invitations exist.

Authentication is email one-time codes per the amended MUST-001; Google and
Apple sign-in are deferred to MUST-001a.

## Task 2: Draft And Review

**Files:** `src/features/intents/create/`, `src/app/create.tsx`, `src/app/preview.tsx`

- [x] Test local draft recovery, 500-character limit, expiry default, and required primitive.
- [x] Add structured time, approximate place, quantity, price, requirements, and private details.
- [x] Render `PrivacyDisclosure` from separate public/private draft models.
- [x] Test offline draft storage and explicit draft clearing on account deletion.

The public and private halves are separate objects rather than one record with
sensitive fields mixed in. A screen rendering the public projection is handed
`publicDraft` and structurally cannot reach an exact address or a phone number,
so "exact details never enter public context" holds by shape rather than by
remembering to filter. `describeDisclosure` is built from `publicDraft` alone
and a test asserts no private value reaches the visible lists.

The draft is stored on the device through expo-sqlite's localStorage shim and is
no longer passed through navigation parameters, which keeps it local as the
screen contract requires and survives an offline period. Unreadable or outdated
stored data is discarded rather than repaired: losing an unfinished draft is a
smaller harm than publishing one silently missing fields the person believed
were set. `signOut` clears it, so the next person to sign in on a shared device
inherits nothing; account deletion has no separate local state to forget.

Expiry defaults to 24 hours per MUST-013, proposed rather than assumed, and the
review screen refuses a deadline already in the past. `PrivacyDisclosure` gained
a `heldBack` list, recorded in the Mobile Screen Contracts change log.

## Task 3: Publish Transaction

**Files:** `supabase/functions/publish-intent/`, `src/features/intents/data/publish-intent.ts`, database tests

- [x] Test owner, stale version, expired input, retry, and private-field leakage cases first.
- [x] Validate request with Zod; atomically create context/private/reach/event rows and return share slug.
- [x] Persist idempotency key and reject mismatched retry fingerprints.
- [x] Track `intent_published` without statement or sensitive properties.

`public.publish_intent` is a `security definer` function, following the
`accept_response`, `send_message` and `redeem_invite` precedent. One transaction
writes the intent, its public context, its private details, its reach and its
event row, so a partial publish cannot occur.

API Contracts described the input as a draft ID. The draft is device-local by
the screen contract, and the two documents sit at the same precedence rank, so
the privacy constraint decided: there is no server draft row to name and publish
carries the draft's content. The idempotency key does the work the draft ID
would have and does it better, since a device-local identifier could not
deduplicate a retry issued from a second device. Expected version belongs to the
edit path in Task 6, where a row already exists to be stale against. Recorded in
the API Contracts change log.

Ownership is checked as membership rather than as a draft owner: only a redeemed
invitation creates a profile, so a signed-in identity without one cannot
broadcast. Private values are written to `intent_private` and never to
`intent_context`, and analytics records shape only, never the statement.

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
| 2026-08-30 | Completed invitation-gated email one-time-code authentication |
| 2026-08-30 | Completed local intent drafting and review with a public/private draft split |
| 2026-08-30 | Completed the publish transaction as a database function with idempotent retries |
