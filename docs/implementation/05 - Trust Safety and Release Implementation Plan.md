# Trust, Safety, Analytics, And Release Implementation Plan

> **For agentic workers:** Execute checkbox tasks in order with test-first changes and one coherent commit per task.

**Goal:** Close interactions factually, enforce safety controls, measure without sensitive content, and operate a controlled alpha.

**Architecture:** Outcomes are participant evidence, not ratings. Blocking is synchronous; reports and moderation retain auditable evidence. Release gates combine automated and manual checks.

**Tech Stack:** Supabase/Postgres/Edge Functions, PostHog, Sentry, EAS Build/Update.

## Task 1: Outcomes And Reliability

**Files:** `src/features/resolution/`, outcome migration/functions, pgTAP tests

- [ ] Test completion, disagreement, duplicate report, and ineligible actor cases.
- [ ] Update contextual reliability only from undisputed completed outcomes.
- [ ] Show descriptive history, never an opaque universal trust score.

## Task 2: Block And Report

**Files:** `src/features/safety/`, `supabase/functions/create-report/`, RLS tests

- [ ] Test immediate bidirectional discovery/message exclusion after either party blocks.
- [ ] Support profile, intent, response, and message reports with rate limits.
- [ ] Preserve evidence while hiding restricted content from discovery.

## Task 3: Moderation And Retention

**Files:** moderation migration/functions, private operator runbook

- [ ] Test moderator authorization from app metadata, not user metadata.
- [ ] Add immutable action audit and restriction restoration to captured safe state.
- [ ] Implement account deletion and retention jobs against the policy outline.

## Task 4: Privacy-Safe Telemetry

**Files:** `src/infrastructure/analytics/`, `src/infrastructure/observability/`

- [ ] Test the analytics allowlist and Sentry scrubber with prohibited sample data.
- [ ] Implement the funnel and reliability metrics from the analytics plan.
- [ ] Add alerts for auth failures, function errors, notification backlog, and report backlog.

## Task 5: Alpha Release

**Files:** `eas.json`, store metadata, release checklist and rollback runbook

- [ ] Build development and preview binaries for iOS and Android.
- [ ] Run full unit, RLS, Edge Function, E2E, accessibility, and privacy smoke suites.
- [ ] Confirm backups, rollback migration, support contact, moderation rota, and kill switches.
- [ ] Invite only the approved Bengaluru cohort and review every report manually.

## Exit Gate

All Permissions Matrix tests pass, one report can be actioned end to end, account deletion follows policy, telemetry contains no prohibited content, and no S0/S1 defect remains.

## Change Log

| Date | Change |
|---|---|
| 2026-08-24 | Created trust, safety, analytics, operations, and release implementation plan |
