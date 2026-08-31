# Product

<!-- impeccable:product-schema 1 -->

## Platform

adaptive

## Users

Nearcast serves adults in local trust networks, starting with one dense Bengaluru network connected through adjacent closed circles. Sign-up is open; trust comes from connections and provenance, not from a gated door. The primary user has a specific temporary need, offer, or plan that may need to travel beyond one group without becoming fully public.

## Product Purpose

Nearcast is a trust-aware intent network. It lets a person create an intent, preserve the privacy of the originating circle, deliberately choose reach, explain why each recipient sees the intent, and resolve the interaction without exposing sensitive details prematurely.

## Positioning

Nearcast is not a social feed, chat app, event app, or marketplace. Its mechanism is controlled broadcast: an intent can travel beyond a closed group while provenance, reach, identity, exact location, and contact details are disclosed progressively.

## Operating Context

Users move through mobile-native flows: For You feed, broadcast composer, intent detail, broadcaster profile, response/request flow, activity, messages, and personal profile/settings. WhatsApp and other closed groups remain external sharing contexts; Nearcast does not read private conversations.

## Capabilities and Constraints

Users may broadcast `I need`, `I offer`, or `I want to` intents. Every delivered intent needs a human-readable delivery reason. Reach must never expand without informed user action. The product must not fabricate users, confirmations, responses, availability, activity counts, likes, follower counts, ratings, or social proof. Exact location, private contact details, private group identity, and membership must remain hidden until the relevant permission state allows disclosure.

## Brand Commitments

Nearcast should feel calm, credible, human, quietly optimistic, and native. The interface should be minimal, trust-aware, and useful rather than promotional, viral, or social-media-like.

Terminology runs in two registers, defined in [`docs/08 - Writing and Content Guide.md`](docs/08%20-%20Writing%20and%20Content%20Guide.md). User-facing copy uses Cast, Ask to join, Circles, Signal, and Receipts. The domain model, API, and database keep Intent, Broadcast, Reach, Origin, Confirmation, Response, Match, Resolve, Trust context, and Reliability. Signal is qualitative language about follow-through and must never render as a score, rating, percentage, or rank.

## Evidence on Hand

Approved product and design source documents live in `docs/`. The current app uses Expo, React Native, Expo Router, TypeScript, Manrope, SF Symbols through Expo Symbols, and semantic design tokens in `src/design-system/tokens.ts`.

## Product Principles

- Intent before identity.
- Controlled reach, never automatic exposure.
- Explain every match.
- Reveal sensitive information progressively.
- Resolution beats engagement.

## Accessibility & Inclusion

The mobile app must support dynamic type, screen readers, reduced motion, minimum contrast, 44-48 point touch targets, honest loading/empty/error/offline states, and privacy/safety copy that can wrap without truncation.
