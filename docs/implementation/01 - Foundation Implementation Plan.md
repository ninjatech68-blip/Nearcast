# Foundation Implementation Plan

> **For agentic workers:** Execute checkbox tasks in order with test-first changes and one coherent commit per task.

**Goal:** Produce a reproducible Expo and Supabase foundation with authentication, tokens, CI, and enforced privacy boundaries.

**Architecture:** Expo Router owns navigation; pure TypeScript modules own domain rules; Supabase owns identity, durable data, transactions, and RLS. Mobile code never receives service credentials.

**Tech Stack:** Expo SDK 57, React Native, TypeScript, Supabase CLI/Postgres/PostGIS, Zod, Vitest, pgTAP.

## Task 1: Repository Gate

**Files:** `AGENTS.md`, `README.md`, `.env.example`, `.github/workflows/verify.yml`, `package.json`

- [x] Install pinned dependencies and commit `package-lock.json`.
- [x] Add lint, typecheck, unit-test, iOS-bundle, and database scripts.
- [x] Add CI jobs for app and local Supabase verification.
- [x] Run `npm run verify`; lint, typecheck, 10 unit tests, and the iOS bundle exit 0.
- [ ] Run CI from a clean clone; expect both jobs green.

## Task 2: Domain And Design Foundation

**Files:** `src/features/intents/domain/*.ts`, `src/design-system/tokens.ts`, `src/design-system/tokens.json`, `src/app/*`

- [x] Write failing tests for primitives, reach order, lifecycle transitions, environment parsing, and token invariants.
- [x] Implement minimum pure domain modules and machine-readable tokens.
- [x] Implement local composer-to-preview navigation without publishing incomplete data.
- [x] Add component interaction tests when the Expo-compatible React Native test renderer is selected.
- [ ] Verify the flow on one iOS and one Android development build.

## Task 3: Database Boundary

**Files:** `supabase/migrations/*_nearcast_foundation.sql`, `supabase/seed.sql`, `supabase/tests/database/nearcast_foundation.test.sql`

- [x] Define identity, intent, delivery, response, match, messaging, outcome, report, notification, and analytics tables.
- [x] Separate discoverable, contextual, and exact/private fields.
- [x] Enable RLS and explicit grants on every exposed table.
- [x] Add anonymous privacy-safe public intent projection and idempotent response acceptance.
- [x] Add local test personas and positive/negative pgTAP tests.
- [x] Start Docker, run `npm run db:start && npm run db:reset && npm run db:test`; expect migration and all pgTAP tests to pass.
- [x] Run `npx supabase db lint --level warning`; resolve every security warning.
- [x] Generate `src/infrastructure/supabase/database.types.ts` with `npm run db:types`.

## Exit Gate

A clean clone runs app and database checks without undocumented steps, authentication can create one self-owned profile in staging, and no recipient can query exact intent details before disclosure.

## Change Log

| Date | Change |
|---|---|
| 2026-08-24 | Created foundation implementation plan and recorded completed scaffold work |
| 2026-08-24 | Selected Expo Jest with React Native Testing Library for component interaction tests |
| 2026-08-24 | Verified local Supabase reset, pgTAP, owned-schema lint, and generated database types |
