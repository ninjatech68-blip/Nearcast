# Product

<!-- impeccable:product-schema 1 -->

## Status

- **Status:** Derived product summary. **Not a governing document.**
- **Precedence:** Rank 2.1 — subordinate to [`docs/01 - Product Requirements.md`](docs/01%20-%20Product%20Requirements.md) and [`docs/02 - First Version Requirements.md`](docs/02%20-%20First%20Version%20Requirements.md). Where this file disagrees with either, they win and this file must be corrected in the same change.
- **Last reconciled:** 2026-08-25 against commit `7820a0a`

## Platform

adaptive

## Users

Nearcast serves adults in invitation-only local trust networks, starting with one dense Bengaluru network connected through adjacent closed circles. The primary user has a specific temporary need, offer, or plan that may need to travel beyond one group without becoming fully public.

## Product Purpose

Nearcast is a trust-aware intent network. It lets a person create an intent, preserve the privacy of the originating circle, deliberately choose reach, explain why each recipient sees the intent, and resolve the interaction without exposing sensitive details prematurely.

## Positioning

Nearcast is not a social feed, chat app, event app, or marketplace. Its mechanism is controlled broadcast: an intent can travel beyond a closed group while provenance, reach, identity, exact location, and contact details are disclosed progressively.

## Operating Context

Users move through mobile-native flows: For You feed, broadcast composer, intent detail, broadcaster profile, response/request flow, activity, messages, and personal profile/settings. WhatsApp and other closed groups remain external sharing contexts; Nearcast does not read private conversations.

## Capabilities and Constraints

Users may broadcast `I need`, `I offer`, or `I want to` intents. Every delivered intent needs a human-readable delivery reason. Reach must never expand without informed user action. The product must not fabricate users, confirmations, responses, availability, activity counts, likes, follower counts, ratings, or social proof. Exact location, private contact details, private group identity, and membership must remain hidden until the relevant permission state allows disclosure.

## Brand Commitments

Nearcast should feel calm, credible, human, quietly optimistic, and native. The interface should be minimal, trust-aware, and useful rather than promotional, viral, or social-media-like. Current product terminology uses Intent, Broadcast, Reach, Origin, Confirmation, Response, Match, Resolve, Trust context, and Reliability. Trust is never displayed as a numeric score.

## Evidence on Hand

Approved product and design source documents live in `docs/`. The current app uses Expo, React Native, Expo Router, TypeScript, Manrope, SF Symbols through Expo Symbols, and semantic design tokens in `src/design-system/tokens.ts`.

## Product Principles

- Intent before identity.
- Controlled reach, never automatic exposure.
- Explain every match.
- Reveal sensitive information progressively.
- Resolution beats engagement.

## Accessibility & Inclusion

The mobile app must support dynamic type, screen readers, reduced motion, minimum contrast, 44pt iOS and 48dp Android touch targets, honest loading/empty/error/offline states, and privacy/safety copy that can wrap without truncation.

## Change Log

| Date | Change |
|---|---|
| 2026-08-25 | Captured product truth for the native minimal design direction |
| 2026-08-25 | Reclassified as a derived, non-governing summary subordinate to `docs/01` and `docs/02` (resolves G-02) and added this change log (resolves G-04) |
| 2026-08-25 | Aligned touch-target and trust-display wording with the resolutions to C-09 and C-03 |
