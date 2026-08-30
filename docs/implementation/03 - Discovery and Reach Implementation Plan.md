# Discovery And Controlled Reach Implementation Plan

> **For agentic workers:** Execute checkbox tasks in order with test-first changes and one coherent commit per task.

**Goal:** Deliver a finite, explainable set of eligible intents after explicit reach expansion.

**Architecture:** SQL eligibility filters precede ranking. Every materialized delivery stores a stable explanation code and privacy-safe rendered reason.

**Tech Stack:** PostGIS, PostgreSQL functions, Edge Functions, Expo Router.

## Task 1: Approximate Geography

**Files:** `20260831030000_approximate_geography.sql`, `src/features/location/`, pgTAP tests

- [x] Test distance bands and prove exact coordinates never appear in discovery responses.
- [x] Store approximate geography with GIST index and convert results to coarse distance labels.
- [x] Verify blocked, expired, restricted, and out-of-range candidates return no rows.

Profiles carried only a city name, so discovery had nowhere to measure from.
They now hold an approximate home point, GIST indexed. It is deliberately
approximate: what a person is willing to be found near, not where they live.
Exact coordinates stay in `intent_private.exact_geography` and never enter a
discovery result.

Distance is reported as a band rather than a number, and that is a privacy
decision rather than a rounding convenience. A metre value is a coordinate in
disguise: readings taken from several intents would trilaterate a home address,
which is precisely what an approximate point exists to prevent. The client
receives only the band, so nothing downstream can reconstruct a distance.

`discover_intents` cannot leak a coordinate because its return type has no
column for one, and the suite pins that column list as a set so adding one fails
loudly. Eligibility is applied before anything else, in the plan's order:
lifecycle, reach, time, geography, blocks, restriction. An `origin_only` intent
is not discoverable at all, and an unplaced intent reports `unknown` rather than
being treated as nearby.

Ranking is deliberately absent. Eligibility is a correctness question and
ranking is a judgement, and mixing them would make it impossible to test either.

## Task 2: Reach Expansion

**Files:** `src/features/reach/`, `supabase/functions/change-intent-reach/`

- [ ] Test no expansion without a matching current level, explicit target, and disclosure confirmation.
- [ ] Implement ReachSelector with audience delta and privacy impact.
- [ ] Log old/new reach and actor; keep reduction immediately available.

## Task 3: Explainable Delivery

**Files:** `supabase/functions/generate-deliveries/`, `src/features/feed/`

- [ ] Test every delivered row has one approved explanation code and non-empty reason.
- [ ] Apply eligibility in this order: lifecycle, reach, time, geography, explicit criteria, blocks, restriction, prior action.
- [ ] Rank the surviving set by trust distance, geography, timing, relevance, recency, and fatigue.
- [ ] Render a finite Home list with WhyYouSeeThis, hide, save, and not-relevant actions.

## Task 4: Measurement

**Files:** `src/infrastructure/analytics/`, matching-quality query/dashboard spec

- [ ] Emit delivery, impression, detail-open, hide, and relevance-feedback events with approved properties only.
- [ ] Add a test asserting analytics serialization rejects prohibited keys.

## Exit Gate

Every feed card has a valid explanation, blocked users never receive each other's intents, exact geography is absent from delivery payloads, and alpha relevance review meets the roadmap gate.

## Change Log

| Date | Change |
|---|---|
| 2026-08-24 | Created discovery and controlled reach implementation plan |
| 2026-08-31 | Completed approximate geography, coarse distance bands, and eligibility filtering |
