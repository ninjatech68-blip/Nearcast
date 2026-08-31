# Nearcast Product Development Roadmap

## Document Control

- **Status:** Approved outcome-based roadmap
- **Team:** Founder plus AI coding partner
- **Planning horizon:** Closed alpha through launch validation
- **Last updated:** 2026-08-24
- **Governed by:** [Nearcast Documentation Reference](./00 - Start Here - Nearcast Project Reference.md)

## Roadmap Principles

- Build one complete user outcome before expanding breadth.
- Keep the product category-agnostic but launch-network constrained.
- Ship safety and permissions with the feature they protect.
- Prefer direct user evidence over speculative scale work.
- Use feature flags and small cohorts.
- Do not advance a phase until its exit gate is satisfied.

Indicative timing assumes one founder working consistently with AI assistance. Ranges are planning aids, not deadlines.

## Phase 0: Product And Technical Foundation

**Indicative duration:** 1-2 weeks

### Outcomes

- Documentation suite reviewed and accepted.
- Expo and Supabase projects initialized for local and staging.
- Design tokens and core project conventions established.
- CI applies migrations and runs type, unit, and RLS tests.

### Deliverables

- Repository structure.
- Environment configuration.
- Authentication spike.
- Database migration baseline.
- Core domain state-machine tests.
- IntentCard and foundational design-system components.

### Exit Gate

A clean checkout can run the app, local database, tests, and one authenticated staging build without manual undocumented steps.

## Phase 1: Intent Creation And Sharing

**Indicative duration:** 2-3 weeks

### Outcomes

- A signed-in user can create, preview, publish, edit, withdraw, expire, and resolve an intent.
- Every intent has a privacy-safe HTTPS link.
- A WhatsApp recipient can inspect the intent without installing the app.
- Authenticated recipients can provide genuine origin confirmation.

### Deliverables

- Authentication and minimal profile.
- Natural-language composer and structured review.
- Intent lifecycle and expiry jobs.
- Reach/privacy preview.
- Shared-link fallback.
- Origin confirmation.
- Analytics through publication and sharing.

### Exit Gate

Five internal testers can publish and share real intents without assistance, and no private field appears in public metadata or analytics.

## Phase 2: Discovery And Controlled Reach

**Indicative duration:** 2-3 weeks

### Outcomes

- Broadcasters can explicitly expand reach.
- Eligible users receive a finite, explainable For You feed.
- Block, expiry, geography, and eligibility rules filter delivery.

### Deliverables

- PostGIS approximate-area model.
- ReachSelector and disclosure flow.
- Delivery generation and explanation codes.
- Feed, intent detail, hide, save, and not-relevant actions.
- Matching-quality dashboard.

### Exit Gate

Every feed card has a valid explanation, blocked users never receive each other's intents, and test users judge at least half of delivered alpha intents relevant enough to inspect.

## Phase 3: Responses, Acceptance, And Coordination

**Indicative duration:** 3 weeks

### Outcomes

- Recipients can respond with context.
- Broadcasters can accept, reply, or decline.
- Acceptance creates a private match with progressive disclosure.
- Matched participants can coordinate temporarily.

### Deliverables

- Contextual response actions.
- Qualification and disclosure preview.
- Request review flow.
- Atomic match creation.
- Private temporary messages with reconnect.
- Push notifications for real state changes.

### Exit Gate

The complete two-user flow passes E2E on iOS and Android, concurrent acceptance is idempotent, and exact location remains protected until explicitly released.

## Phase 4: Resolution, Trust, And Safety

**Indicative duration:** 2-3 weeks

### Outcomes

- Participants close the loop and record factual outcomes.
- Contextual reliability reflects confirmed completion only.
- Blocking, reporting, restriction, and audit operations work end to end.

### Deliverables

- Resolution and completion confirmation.
- Contextual reliability aggregates.
- Block and report flows.
- Moderation queue and action audit.
- Rate limits and prohibited-content controls.
- Account deletion and data-retention jobs.

### Exit Gate

All Permissions Matrix and safety tests pass, a report can be reviewed and actioned, and no open S0/S1 defects remain.

## Phase 5: Closed Alpha

**Indicative duration:** 3-4 weeks of observation and iteration

### Cohort

Recruit 30-50 adults from one dense Bengaluru network spanning several adjacent WhatsApp circles. Allow multiple intent categories while moderating every report manually.

### Learning Goals

- How often does the closed-group reach problem occur?
- Which intent primitives resolve most often?
- Does provenance increase response confidence?
- Which reach level produces useful responses without noise?
- Does one successful resolution lead to another broadcast?

### Operating Cadence

- Conduct five user conversations per week.
- Review every unresolved intent and safety report.
- Ship no more than one meaningful experiment per core flow at a time.
- Maintain a weekly metrics and qualitative-learning review.

### Exit Gate

Advance only when:

- At least 20 genuine intents have been published.
- At least 30% receive a relevant external response.
- At least 20% resolve through Nearcast.
- At least 25% of successful broadcasters create another intent within four weeks.
- No unresolved severe privacy or safety issue remains.

These are validation thresholds, not growth targets. Failing a threshold triggers product investigation rather than artificial engagement tactics.

## Phase 6: Focused Beta

**Indicative duration:** 4-6 weeks

### Outcomes

- Expand to 200-500 users within adjacent networks.
- Improve matching based on measured feedback.
- Add phone verification for elevated-risk actions.
- Formalize moderation and support response times.
- Complete legal review and store privacy declarations.

### Candidate Enhancements

- Better preference controls.
- Duplicate and recurring intent support.
- Context-specific verification.
- Richer link previews.
- Limited intent images.
- Improved trust-distance explanations.

Candidate enhancements enter the beta only when they address observed friction.

### Exit Gate

Resolution and repeat-use metrics remain stable as the cohort expands, safety workload is manageable, and infrastructure operates within budget and reliability targets.

## Phase 7: Launch Decision

Choose one path based on evidence:

### Expand

Open adjacent Bengaluru networks while preserving controlled growth and moderation capacity.

### Focus

Concentrate the product on the highest-performing intent situations without changing the horizontal architecture.

### Rework

Revise trust, reach, or matching when useful response and resolution remain weak.

### Stop

Do not scale if the product cannot produce repeatable resolution without unacceptable privacy, safety, or acquisition costs.

## Deferred Until Evidence

- Payments and escrow.
- Full WhatsApp inbound share extension.
- AI semantic matching.
- Maps-first discovery.
- Media-rich chat.
- Public profiles and followers.
- Business accounts.
- Multi-city expansion.
- Dedicated backend or microservices.

## Roadmap Metrics

Each phase tracks:

- User outcome achieved.
- Funnel conversion.
- Time to complete the core task.
- Privacy and safety incidents.
- Defect severity.
- Operating cost.
- Qualitative evidence.

## Change Control

Roadmap changes may alter sequence and timing but may not silently alter PRD scope, permissions, or safety rules. Product changes require updating the governing source documents first.

## Change Log

| Date | Change |
|---|---|
| 2026-08-24 | Created solo-team, evidence-gated roadmap from foundation through launch decision |
| 2026-08-31 | Removed invitation-gated access. Nearcast is not invite-only: sign-up is open and the alpha cohort is limited by recruitment rather than by a token gate. |
