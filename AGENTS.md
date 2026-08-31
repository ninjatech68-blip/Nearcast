# Nearcast Agent Reference

Nearcast is a trust-aware intent network. It lets an intent move beyond a closed group without exposing the group, fabricating activity, or silently expanding reach.

## Project Starting Point

This is a greenfield build. Use this repository and the documents in `docs/` as the only product and engineering source of truth. Do not assume any old app, old codebase, previous prototype, or external project will be reused.

## Read Before Editing

1. `docs/00 - Start Here - Nearcast Project Reference.md`
2. The mandatory documents named there for the subsystem being changed.
3. The matching plan in `docs/implementation/`.
4. Exact Expo SDK 57 docs at `https://docs.expo.dev/versions/v57.0.0/` for framework behavior.
5. Current Supabase docs and changelog before Supabase changes.

When documents conflict, use the precedence order in `docs/00 - Start Here - Nearcast Project Reference.md`. Update governing documents before changing product behavior.

## Non-Negotiable Product Rules

- Never fabricate users, confirmations, responses, availability, or activity counts.
- Never expand intent reach without an informed user action.
- Never expose private-group identity or membership.
- Never store exact location or contact details in discoverable intent rows.
- Every recommendation needs a stored, human-readable delivery reason.
- Realtime accelerates delivery; PostgreSQL remains the source of truth.
- Push and analytics payloads must not contain intent text, messages, exact coordinates, contact details, or private-group names.

## Engineering Rules

- Use TypeScript strict mode and feature-local modules under `src/features/`.
- Keep domain rules pure and independent of React Native and Supabase.
- Validate external inputs with Zod and enforce important invariants again in PostgreSQL.
- Enable RLS on every exposed table. Use explicit policies and test allowed and denied paths.
- Put privileged lifecycle transitions in server-controlled database functions or Edge Functions; make transitions idempotent.
- Write a failing test before production behavior. Run `npm run verify` before claiming app changes complete.
- Run `npm run db:test` after schema or RLS changes when the local Supabase stack is available.
- Never commit `.env`, service-role keys, access tokens, or production data.

## Commands

```bash
npm install
cp .env.example .env
npm run verify
npm run build:preview
npm run db:push
npm run db:test
npm run db:types
```

## Nothing Runs Locally

The database is a hosted Supabase project, builds happen on EAS, and the app
talks to the internet. There is no local Supabase stack, no simulator, and no
Metro dev server. Everything is in git and reachable over the network.

This is not a preference. A build that depends on one machine being reachable
cannot be handed to a tester, and a dev-client build fetches its bundle from
whatever Metro answers on port 8081 — which has already caused a build of this
app to load an unrelated project's JavaScript.

## Database

Migrations are pushed to the hosted project with `npm run db:push` after
`supabase link`. `npm run db:test` runs pgTAP against `SUPABASE_DB_URL`, and
`npm run db:types` regenerates types from the linked project. Never point these
at a local stack.

## Builds

`npm run build:preview` produces a release build on EAS with internal
distribution: an installable link for registered devices. `npm run
build:production` produces store builds. Both are release configuration; there
is no development profile, deliberately.

The preflight runs first. Release builds inline `EXPO_PUBLIC_*` at bundle time,
so it rejects a URL that is http, loopback, or a private network address before
a build starts rather than after.

## Definition Of Done

A change is complete only when its acceptance criteria pass, negative permission paths are tested, documentation remains consistent, and verification output is recorded. A UI state is incomplete without loading, empty, error, offline/queued, disabled, and restricted handling where applicable.
