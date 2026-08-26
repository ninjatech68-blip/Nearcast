# Nearcast Documentation Reference

## Purpose

This is the governing index for Nearcast product, design, engineering, safety, measurement, and delivery documentation. Every future Nearcast specification, design artifact, implementation plan, and codebase-level agent instruction must begin by consulting this file.

When a software repository is created, copy this document's governance rules into the repository root `AGENTS.md` and link back to this documentation set.

## Product Definition

> Nearcast is a trust-aware intent network that helps people extend a need, offer, or plan beyond closed groups without making it fully public.

Nearcast does not read or expose private WhatsApp conversations. A person explicitly creates an intent, shares it into an existing group when useful, gathers genuine confirmations, and controls how far it may travel beyond that group.

## Project Starting Point

Nearcast is a greenfield product build. There is no old app, legacy product codebase, or previous production system to migrate from. All implementation decisions must start from this documentation set, the root `AGENTS.md`, and the code in this repository.

## Mandatory Reading Order

1. [Product Requirements Document](./01 - Product Requirements.md)
2. [MVP Requirements](./02 - First Version Requirements.md)
3. [User Flows and Screen Inventory](./03 - User Journeys and Flows.md)
4. [Trust, Privacy, and Safety](./04 - Trust Privacy and Safety.md)
5. [System Architecture and Data Model](./05 - System Architecture.md)
6. [Permissions Matrix](./06 - Permissions and Access Rules.md)
7. [App Design Foundation](./17 - Mobile App Design Foundation.md)
8. [Design System Specification](./07 - Design System Specification.md)
9. [Content Design Guide](./08 - Writing and Content Guide.md)
10. [Analytics and Measurement Plan](./09 - Metrics and Analytics Plan.md)
11. [QA and Test Strategy](./10 - Quality and Testing Plan.md)
12. [Release and Operations Guide](./11 - Release and Operations Plan.md)
13. [Legal and Community Policy Outline](./12 - Community Policy Outline.md)
14. [Product Development Roadmap](./13 - Product Development Roadmap.md)
15. [AI Implementation Guide](./14 - Implementation Guide.md)
16. [Mobile Screen Contracts](./15 - Mobile Screen Contracts.md)
17. [Server API Contracts](./16 - API Contracts.md)
18. Select the active phase plan from the [Implementation Plan Index](./implementation/00 - Implementation Plans Index.md)

## Source-of-Truth Precedence

When documents conflict, use this order:

1. Trust, privacy, safety, and legal constraints override convenience and growth goals.
2. The PRD overrides feature-level requirements and roadmap sequencing.
3. MVP Requirements define what is included in the first releasable product.
4. The Permissions Matrix overrides UI assumptions about data visibility.
5. System Architecture governs technical boundaries and data ownership.
6. The App Design Foundation and Design System Specification jointly govern all visual and interaction design.
7. The Content Design Guide governs product terminology and interface language.
8. The Roadmap governs sequence, not product intent.
9. The API and screen contracts govern executable boundaries within the scope allowed by all documents above them.
10. Implementation plans govern task order only and may not override product, safety, permission, architecture, or design sources.

### Derived Repository Documents

Two root documents restate governed material for day-to-day use. They are **derived, not governing**, and are inserted into the order as follows:

| Document | Rank | Subordinate to |
|---|---|---|
| `PRODUCT.md` | 2.1 | Product Requirements (01), MVP Requirements (02) |
| `DESIGN.md` | 6.1 | Design System Specification (07), App Design Foundation (17) |

A derived document may not introduce product behavior, relax a safety or permission rule, or contradict its parent. When a parent changes, the derived document must be reconciled in the same change. `docs/analysis/` sits below implementation plans and is measurement only.

Conflicts must be resolved by editing the relevant source document and recording the decision in its change log. Downstream artifacts must not silently override an upstream source.

## Design Governance

Every design brief, wireframe, prototype, screen specification, and UI implementation must reference:

- [App Design Foundation](./17 - Mobile App Design Foundation.md)
- [Design System Specification](./07 - Design System Specification.md)
- [Content Design Guide](./08 - Writing and Content Guide.md)
- [Permissions Matrix](./06 - Permissions and Access Rules.md)

Designs must use the documented intent lifecycle, progressive disclosure rules, semantic tokens, signature components, accessibility requirements, and content terminology. A design may introduce a new component only after documenting why existing components cannot express the required behavior.

## Engineering Governance

- Use Expo, React Native, TypeScript, and Supabase/Postgres for the MVP.
- Keep business-critical mutations behind server-owned functions.
- Enforce visibility in the database with Row-Level Security; UI hiding is not authorization.
- Store exact location and private identity data separately from discoverable intent data.
- Use migrations for every schema or policy change.
- Add tests for every RLS policy and lifecycle transition.
- Do not introduce microservices, graph databases, Elasticsearch, or custom chat infrastructure without measured evidence.
- Use root `AGENTS.md`, the active phase plan, test-first changes, and the verification commands defined in the AI Implementation Guide.

## Product Assumptions

- Initial launch is an invitation-only alpha within one dense Bengaluru network containing adjacent WhatsApp circles.
- The product is category-agnostic but geography- and trust-constrained.
- Users may broadcast `I need`, `I offer`, or `I want to` intents.
- WhatsApp is an entry and sharing channel, not a data source controlled by Nearcast.
- Exact locations, contact details, and private-group identities are hidden until permission is granted.
- The first release does not include payments, public follower graphs, or AI-first matching.

## Decision Log

| Date | Decision | Reason |
|---|---|---|
| 2026-08-24 | Use intent, not event, as the core product object | Supports every category and preserves the original problem definition |
| 2026-08-24 | Keep WhatsApp as the trusted origin and Nearcast as controlled expansion | Avoids replacing an established closed-group behavior |
| 2026-08-24 | Use honest confirmations and never fabricated activity | Trust is the product's primary asset |
| 2026-08-24 | Use Expo/React Native and Supabase/Postgres for the MVP | Maximizes solo-team delivery speed while retaining relational and geospatial capabilities |
| 2026-08-24 | Use one dense launch network rather than one content category | Preserves horizontal intent scope while concentrating liquidity |
| 2026-08-24 | Use an AI-readable repository contract and phase-specific plans | Keeps implementation grounded in approved requirements instead of chat context |
| 2026-08-24 | Keep production credentials and production MCP access outside AI tooling | Limits blast radius while retaining fast local and staging development |
| 2026-08-24 | Treat Nearcast as a greenfield build with no legacy codebase dependency | Keeps future implementation from inheriting assumptions or patterns from unrelated projects |
| 2026-08-25 | Approve Trustworthy Native Clarity as the mobile design-system direction | Establishes a calm, native, trust-first visual system before implementation |
| 2026-08-25 | Authenticate with Google and Apple, not email/phone OTP | MVP Requirement MUST-001 outranks the screen contract and implementation plan that specified OTP |
| 2026-08-25 | Keep four primary destinations: For You, Broadcast, Activity, You | Two governing design documents specify four; Activity already owns coordination, so a separate chat destination duplicates it |
| 2026-08-25 | Display trust as contextual evidence with no numeric score | A universal reputation score is a stated non-goal and is prohibited by the safety baseline, which outranks the design system |
| 2026-08-25 | Admit `PRODUCT.md` and `DESIGN.md` to the precedence order as derived documents | They asserted authority the order did not grant, which let them drift from their parents |
| 2026-08-25 | Defer dark appearance beyond the first alpha build | The token cutover renames every semantic token; shipping light-only keeps Phase 1 scope honest |
| 2026-08-25 | Derive trust adjacency from stored confirmations and completed matches until a circles model exists | The schema has no social-graph table yet; deliveries must still trace to real stored evidence, never to an assumed relationship |
| 2026-08-25 | Allow a development-only password sign-in outside production, and make the share-link base URL configuration-driven | Keeps development, testing, and review active while OAuth credentials and the share domain remain pending human actions; production behavior is unchanged and the email provider is never enabled on production |
| 2026-08-25 | Pull the semantic token cutover forward into the current build, revising the earlier C-07 timing | Founder direction: the app must match the approved Trustworthy Native Clarity palette now; deferring created a visible mismatch between the approved boards and the running app |
| 2026-08-25 | Keep Manrope as the product typeface through the cutover, adopting the approved native type scale onto Manrope weights | The C-05 resolution stands; the SF Pro and Roboto mapping activates in a later platform-styling pass |
| 2026-08-25 | Ship the dark palette as machine-readable token data while the app remains light-pinned | Dark appearance stays deferred per C-08; carrying the values in the tokens makes the future remap a data change rather than a redesign |
| 2026-08-26 | Count a rewritten statement as a material edit alongside the four categories MUST-017 names | A respondent agreed to the text as much as to the price; the requirement's purpose is that nobody is surprised by a change they did not see |
| 2026-08-26 | Stop owner editing once an intent is matched | After acceptance the terms are being coordinated in a room between two named people, where a change is a conversation rather than a silent revision |
| 2026-08-26 | Claude owns regular development; Codex is called only to clear blockers Claude cannot clear itself | Founder direction. One owner keeps the governance loop closed — every change goes through the same test-first, document-first path — while the work that genuinely needs Docker, a simulator, or a signing identity is handed over as a bounded request rather than a parallel development track |
| 2026-08-26 | Prohibited content restricts an intent pending review rather than refusing the publish outright | Doc 04 requires both "block creation" and "route to moderation", and a keyword classifier will sometimes be wrong. Restriction satisfies both — nothing becomes discoverable, a moderator sees it, and a false positive does not destroy what someone wrote |
| 2026-08-26 | Record an adult affirmation rather than a date of birth | MUST-076 needs evidence that the account holder is an adult, not their birthday. The affirmation is the least personal data that provides it, and it is stored on `profile_private`, which no other member can read |
| 2026-08-26 | Record material edits by category and never copy the new values into the event log | `intent_events` is append-only, so values written there would sit outside the reach of the Doc 04 retention policy; respondents read current values from the intent itself |

## Document Change Rule

Every document must include a `Change Log` section. Material decisions require updating this reference if they affect product definition, document precedence, design governance, or architecture.

## Change Log

| Date | Change |
|---|---|
| 2026-08-24 | Created the governing documentation index and source-of-truth rules |
| 2026-08-24 | Added implementation guide, mobile/API contracts, phase plans, and AI engineering governance |
| 2026-08-24 | Added explicit greenfield project starting point |
| 2026-08-25 | Recorded approved mobile design-system direction in design governance |
| 2026-08-25 | Added derived-document ranks for `PRODUCT.md` and `DESIGN.md` and recorded the C-01, C-02, C-03, and C-08 resolutions in the decision log |
| 2026-08-26 | Recorded the three material-edit decisions taken while implementing MUST-017 |
| 2026-08-26 | Recorded the development ownership model: Claude develops, Codex unblocks |
| 2026-08-26 | Recorded the two safety-gate decisions: restriction over refusal, and affirmation over date of birth |
