# Nearcast Product Requirements Document

## Document Control

- **Status:** Approved product baseline
- **Owner:** Founder
- **Last updated:** 2026-08-24
- **Governed by:** [Nearcast Documentation Reference](./00 - Start Here - Nearcast Project Reference.md)

## Product Summary

Nearcast allows a person to express an intent inside or alongside a trusted closed group, then deliberately extend that intent to relevant people beyond the group's boundary. It preserves the source group's privacy while giving outside recipients enough provenance and trust context to decide whether to respond.

## Problem

WhatsApp groups are trusted because they are closed and contextual. That same closure limits their reach. When a group cannot satisfy an intent, users currently forward the same message to other groups, contact people individually, post to an overly public network, or give up.

Public platforms offer reach but usually remove the context, control, and relational trust that made the original group useful. Users need a middle layer between private-group confinement and fully public broadcasting.

## Jobs To Be Done

### Broadcaster Job

> When my trusted circle cannot fully satisfy a need, offer, or plan, I want to reach relevant people outside it without exposing the group, so I can resolve the intent while remaining in control.

### Recipient Job

> When a relevant opportunity or request exists outside my current groups, I want to understand why it reached me and whether its source is trustworthy, so I can respond safely.

### Group Job

> When an intent needs more reach, we want to let the intent travel without making our membership, conversation, or group identity public.

## Target User Situation

The ideal initial user is not defined by demographic or event-host status. They are an active participant in closed digital communities who encounters a moment where:

- They have a specific, resolvable intent.
- Their current circle has relevant trust but insufficient reach.
- A fully public post would feel noisy, unsafe, or contextless.
- Outsiders are acceptable if relevance and provenance can be evaluated.
- The intent loses value with time.

## Product Principles

- Intent before identity.
- Controlled reach, never automatic exposure.
- Explain why every recipient sees an intent.
- Reveal sensitive information progressively.
- Use genuine activity and confirmations only.
- Expire temporary intent by default.
- Optimize for resolution, not screen time.
- Keep WhatsApp useful rather than trying to replace it.

## Value Proposition

### For Broadcasters

- Reach beyond one group without posting everywhere.
- Preserve the privacy of the originating group.
- Receive more relevant responses.
- Control who sees sensitive details.
- Build reusable trust through successful outcomes.

### For Recipients

- Access useful intents previously hidden inside adjacent networks.
- Understand relevance and trust provenance.
- Respond without joining an unknown group.
- Build portable, contextual reliability.

## Core Product Model

Every intent starts as one of three primitives:

- **I need:** A person, item, service, recommendation, information, or help.
- **I offer:** An opportunity, item, skill, introduction, resource, or availability.
- **I want to:** Attend, travel, play, collaborate, learn, or experience something.

An intent includes natural-language content, structured context, provenance, reach, expiry, response criteria, privacy settings, lifecycle state, and resolution outcome.

## Core Experience

```text
Intent arises
    -> user creates a Nearcast Intent Card
    -> user shares it with an origin circle when useful
    -> real people confirm or support the intent
    -> user selects controlled external reach
    -> Nearcast delivers it to relevant recipients
    -> recipient understands why it reached them
    -> recipient responds or requests access
    -> broadcaster accepts, replies, or declines
    -> temporary coordination occurs
    -> intent is resolved, expired, or withdrawn
    -> completed interaction updates contextual trust
```

## MVP Scope

The MVP includes:

- Invitation-based account creation and profiles.
- Create, preview, edit, publish, expire, withdraw, and resolve an intent.
- Three intent primitives with category-neutral natural-language creation.
- Approximate location, time, expiry, requirements, and optional price.
- Shareable HTTPS intent links for WhatsApp and other apps.
- Genuine origin confirmations from link recipients.
- Reach levels and audience previews.
- A finite personalized `For You` feed.
- `Why you're seeing this` explanations.
- Contextual responses and optional qualifying questions.
- Accept, reply, decline, block, and report actions.
- Temporary coordination after acceptance.
- Progressive identity and location disclosure.
- Contextual reliability based on completed interactions.
- Push notifications for meaningful state changes.
- Product analytics that excludes message content and precise location.

Detailed requirements live in [MVP Requirements](./02 - First Version Requirements.md).

## Non-Goals For MVP

- Reading, importing, or monitoring WhatsApp group conversations.
- Replacing WhatsApp group chat.
- Payments, escrow, ticketing, or delivery logistics.
- Public follower counts, creator profiles, likes, or viral repost mechanics.
- Full event management or calendar planning.
- Exact live-location sharing.
- AI-generated trust scores or autonomous reach expansion.
- A universal public reputation score.
- Semantic-vector matching as the primary discovery mechanism.
- Nationwide or multi-country launch.
- Supporting minors as independent account holders.

## Initial Launch Strategy

Launch an invitation-only alpha within one dense Bengaluru network containing several adjacent WhatsApp circles. Allow multiple intent categories while constraining geography and network distance. Seed activity through real participants and genuine origin confirmations, never fabricated counts.

## Success Metrics

### North-Star Metric

**Weekly resolved intents with at least one response from beyond the broadcaster's initial trusted circle.**

### Primary Metrics

- Published-to-resolved intent rate.
- External relevant-response rate.
- Median time to first useful response.
- Percentage of recipients who can correctly explain why they saw an intent.
- Acceptance-to-completion rate.
- Repeat broadcast rate after a resolved intent.

### Guardrail Metrics

- Block and report rate per completed interaction.
- Unwanted-contact rate.
- No-show or failed-commitment rate.
- Percentage of reach expansions performed without informed user action; target is zero.
- Notification opt-out and complaint rate.
- RLS/privacy test failures; target is zero in production releases.

## Key Risks

| Risk | Product Response |
|---|---|
| Sparse relevant supply | Limit launch geography and invite adjacent existing circles |
| Users distrust outsiders | Progressive disclosure, provenance, approval, block/report, contextual reliability |
| Fake or inflated momentum | Count only real confirmations and completed interactions |
| Feed becomes noisy | Finite feed, relevance explanations, feedback controls, expiry |
| Privacy leakage | Separate sensitive data, RLS, server-owned mutations, audit tests |
| Too many categories fragment matching | Shared intent primitives, common lifecycle, constrained launch network |
| WhatsApp dependency blocks integration | Use explicit share links and deep links; do not depend on private APIs |
| Harmful or illegal intents | Prohibited-content policy, reporting, rate limits, moderation queue |

## Product Assumptions To Validate

- Users experience the closed-group reach problem at least monthly.
- Recipients value provenance enough to respond to adjacent-network intents.
- Users understand and value explicit reach controls.
- A dense network launch can produce useful matches across categories.
- Successful resolution creates repeat use without an entertainment feed.

These assumptions are not missing requirements. They are measured hypotheses defined in the analytics and roadmap documents.

## Release Gate

The MVP is ready for closed alpha only when a user can complete the full broadcast-to-resolution loop, privacy tests pass, reporting and blocking work, and all analytics events required to evaluate the core assumptions are verified.

## Change Log

| Date | Change |
|---|---|
| 2026-08-24 | Established the category-agnostic, trust-aware intent product baseline |
