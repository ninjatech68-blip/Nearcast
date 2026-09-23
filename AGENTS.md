# TrueGoing Agent Reference

TrueGoing is where you find plans near you from people you can trust, and post your own without telling strangers where you are. Plans are discoverable; people are not. Every plan says why it reached you, and the exact spot stays hidden until someone is going. "Nearcast" was the codename and is retired as a user-facing name.

## Project Starting Point

This is a greenfield build. Use this repository and the documents in `docs/truegoing/` as the only product and engineering source of truth. Do not assume any old app, old codebase, previous prototype, or external project will be reused.

## Read Before Editing

1. `docs/truegoing/README.md` (status and locked decisions)
2. `docs/truegoing/03 - TrueGoing Reimagined.md` (product and priorities)
3. For the subsystem you are changing:
   - screens and UI: `docs/truegoing/04 - Screen Contracts.md` and `docs/truegoing/06 - Design Content and Brand Guidelines.md`
   - database, RLS, RPCs: `docs/truegoing/05 - Schema and API Specification.md`
4. `docs/truegoing/07 - P0 Implementation Plan.md` for task order and the current task.
5. `docs/00 - Start Here - Nearcast Project Reference.md` for precedence and which older docs still apply.
6. Exact Expo SDK 57 docs at `https://docs.expo.dev/versions/v57.0.0/` for framework behavior.
7. Current Supabase docs and changelog before Supabase changes.

When documents conflict, `docs/truegoing/` wins. Update the governing document before changing product behavior.

## Non-Negotiable Product Rules

- Never fabricate users, plans, people going, vouches, show-ups, availability, or activity counts. Counts are real, labelled "≈", or shown as "a few".
- People are not browsable. No people list, people search, or people filter anywhere.
- Never store or show any user's location. Only plans have a place: an approximate area and a grid-snapped point in public data, the exact spot in private data.
- The exact spot of a plan is visible only to the host, and to people going after it unlocks or the host shares it.
- Never widen a plan's reach without an informed action by the host. Reach only widens; it never narrows.
- Every plan that reaches someone has a stored, human-readable reason, shown on the card.
- Women-only plans are set by, delivered to, and joinable by verified women only (self-declared woman + selfie-verified).
- Realtime accelerates delivery; PostgreSQL remains the source of truth.
- Push and analytics payloads must not contain plan text, messages, exact coordinates, contact details, or names.

## Engineering Rules

- Use TypeScript strict mode and feature-local modules under `src/features/`.
- Keep domain rules pure and independent of React Native and Supabase.
- Validate external inputs with Zod and enforce important invariants again in PostgreSQL.
- Enable RLS on every exposed table. Use explicit policies and test allowed and denied paths.
- Put privileged transitions in server-controlled database functions or Edge Functions; make transitions idempotent.
- Write a failing test before production behavior. Run `npm run verify` before claiming app changes complete.
- Run `npm run db:test` after schema or RLS changes when the local Supabase stack is available.
- Never commit `.env`, service-role keys, access tokens, or production data.

## Commands

```bash
npm install
cp .env.example .env
npm run start
npm run verify
npm run db:start
npm run db:reset
npm run db:test
npm run db:types
```

## Definition Of Done

A change is complete only when its acceptance criteria pass, negative permission paths are tested, documentation remains consistent, and verification output is recorded. A UI state is incomplete without loading, empty, error, offline/queued, disabled, and restricted handling where applicable.

## Change Log

| Date | Change |
|---|---|
| 2026-09-23 | Made `docs/truegoing/` the source of truth; renamed to TrueGoing; rewrote product rules for plans, reach, spot unlock and women-only plans |
| 2026-09-23 | Added the P0 implementation plan to the reading order |
