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

- Initial launch is a limited alpha within one dense Bengaluru network containing adjacent WhatsApp circles. The cohort is limited by who is recruited, not by an invitation gate; sign-up is open.
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

## Document Change Rule

Every document must include a `Change Log` section. Material decisions require updating this reference if they affect product definition, document precedence, design governance, or architecture.

## Change Log

| Date | Change |
|---|---|
| 2026-08-24 | Created the governing documentation index and source-of-truth rules |
| 2026-08-24 | Added implementation guide, mobile/API contracts, phase plans, and AI engineering governance |
| 2026-08-24 | Added explicit greenfield project starting point |
| 2026-08-25 | Recorded approved mobile design-system direction in design governance |
| 2026-08-31 | Removed invitation-gated access. Nearcast is not invite-only: sign-up is open and the alpha cohort is limited by recruitment rather than by a token gate. |
