# Discovery And Controlled Reach Implementation Plan

> **For agentic workers:** Execute checkbox tasks in order with test-first changes and one coherent commit per task.

**Goal:** Deliver a finite, explainable set of eligible intents after explicit reach expansion.

**Architecture:** SQL eligibility filters precede ranking. Every materialized delivery stores a stable explanation code and privacy-safe rendered reason.

**Tech Stack:** PostGIS, PostgreSQL functions, Edge Functions, Expo Router.

## Task 1: Approximate Geography

**Files:** new PostGIS migration, `src/features/location/`, pgTAP tests

- [ ] Test distance bands and prove exact coordinates never appear in discovery responses.
- [ ] Store approximate geography with GIST index and convert results to coarse distance labels.
- [ ] Verify blocked, expired, restricted, and out-of-range candidates return no rows.

## Task 2: Reach Expansion

**Files:** `src/features/reach/`, `supabase/functions/change-intent-reach/`

- [ ] Test no expansion without a matching current level, explicit target, and disclosure confirmation.
- [ ] Implement ReachSelector with audience delta and privacy impact.
- [ ] Log old/new reach and actor; keep reduction immediately available.

## Task 3: Explainable Delivery

**Files:** `supabase/functions/generate-deliveries/`, `src/features/feed/`

- [x] Test every delivered row has one approved explanation code and non-empty reason.
- [x] Apply eligibility in this order: lifecycle, reach, geography, blocks, restriction, prior action. Time and explicit-criteria filters remain open alongside the full ranking pass.
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
| 2026-08-25 | Delivered `generate_deliveries` with explainable reason codes, tier-ordered selection, a 50-recipient cap per run, and 18 pgTAP assertions; trust adjacency derives from stored confirmations and completed matches per the Doc 00 decision |
| 2026-08-25 | Outstanding in this plan: PostGIS distance bands (city match is the interim geography), full ranking signals with fatigue limits, feed hide/save/not-relevant UI, and the measurement task |
