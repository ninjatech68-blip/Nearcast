# Nearcast AI Implementation Guide

## Document Control

- **Status:** Implementation source of truth
- **Last updated:** 2026-08-24
- **Governed by:** [Nearcast Documentation Reference](./00 - Start Here - Nearcast Project Reference.md)

## Purpose

This guide connects the approved product documents to the executable repository. It defines how a founder and AI coding partner should choose, implement, test, and release work without relying on chat history.

## Greenfield Rule

Nearcast must be implemented from scratch inside this repository. Do not import architecture, naming, screens, database shape, or product behavior from an old codebase unless a future approved document explicitly adds that source.

## Repository Contract

| Path | Responsibility |
|---|---|
| `AGENTS.md` | Mandatory AI context, safety rules, and commands |
| `src/app` | Expo Router screens and navigation only |
| `src/features` | Feature-local domain, application, data, and UI modules |
| `src/design-system` | Tokens and shared components |
| `src/infrastructure` | Supabase, analytics, notifications, storage, and device adapters |
| `supabase/migrations` | Reproducible schema, functions, grants, and RLS |
| `supabase/tests/database` | pgTAP schema, permission, and transaction tests |
| `docs/implementation` | Ordered implementation plans |

## Working Method

1. Select only the next unchecked phase plan.
2. Read its mandatory product references.
3. Write one failing unit, integration, RLS, or E2E test.
4. Implement the smallest behavior that passes it.
5. Run focused tests, then `npm run verify`.
6. For database work, run `npm run db:reset && npm run db:test`.
7. Update contracts and governing documents in the same change.
8. Commit one coherent behavior; never combine unrelated phases.

## AI Tooling

- Use Codex with root `AGENTS.md` as persistent repository context.
- Use the Expo agent plugin/skills installed by the Expo SDK 57 template.
- Connect the official Supabase MCP only to local, development, or staging projects. Scope it to one project and use read-only mode for inspection when writes are unnecessary.
- Keep migrations in Git even when MCP applies a change. The repository, not a hosted database, is the durable schema source.
- Do not give an agent production data, a service-role key, app-store credentials, or unrestricted production MCP access.

## Environment Gates

| Environment | Data | Distribution | Required gate |
|---|---|---|---|
| Local | Seed personas only | Expo development build | Unit, type, lint, migration, pgTAP |
| Staging | Invited test accounts | Internal EAS channel | CI green and manual privacy smoke test |
| Production | Real invited users | Store/TestFlight production channel | Release checklist, rollback, privacy review, no S0/S1 defects |

## Definition Of Ready

A task is ready when its user outcome, actor, lifecycle state, visible fields, denied fields, analytics event, error states, acceptance test, and rollback behavior are explicit.

## Definition Of Done

A task is done only when positive and negative permission paths pass, retries cannot duplicate consequential records, offline behavior is defined, accessibility labels exist, analytics excludes prohibited data, and governing documentation remains consistent.

## External Setup Still Requiring Human Ownership

- Create separate Supabase staging and production projects.
- Create Expo/EAS organization and development, preview, and production profiles.
- Register Apple and Google developer accounts and app identifiers.
- Create Sentry and PostHog projects only when their roadmap phase begins.
- Configure SMTP, privacy contacts, moderation contact, and store declarations before alpha.

## Change Log

| Date | Change |
|---|---|
| 2026-08-24 | Added executable repository conventions and AI-assisted delivery workflow |
| 2026-08-24 | Added explicit greenfield implementation rule |
