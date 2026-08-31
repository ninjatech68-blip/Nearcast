# Nearcast Mobile Screen Contracts

## Document Control

- **Status:** Mandatory implementation contract
- **Last updated:** 2026-08-24
- **Design parents:** [App Design Foundation](./17 - Mobile App Design Foundation.md), [Design System](./07 - Design System Specification.md)
- **Authorization parent:** [Permissions Matrix](./06 - Permissions and Access Rules.md)

## Global State Contract

Every data screen must define loading, empty, error with retry, offline or queued, restricted, and content states. Skeletons may imply shape but never imply fake people or counts. Consequential buttons remain disabled with an explanation until requirements are met. A stale mutation shows current state and offers recovery rather than silently overwriting it.

## Navigation

Unauthenticated routes are sign-in, public intent, and policy pages. Authenticated primary destinations are Home, My Intents, Activity, and Profile. Creation is a full-screen modal. Response, reach, privacy, resolution, report, and disclosure decisions use sheets. Match coordination is a dedicated screen.

## MVP Screens

| Screen | Primary decision | Required content | Sensitive constraints |
|---|---|---|---|
| Sign in | Create an account or return? | Google/Apple sign-in, recovery | Generic errors prevent account enumeration |
| Home | Inspect or create? | Finite intent list, WhyYouSeeThis, create action | No infinite-feed mechanics or fabricated activity |
| Intent composer | What is the intent? | Primitive, statement, suggestions, draft state | Draft remains local/private |
| Intent review | Publish with these terms? | Structured context, expiry, reach, PrivacyDisclosure | Exact details never enter public context |
| Share | Where will user share it? | HTTPS link, WhatsApp/system share, public preview | Nearcast does not read the destination group |
| Public intent | Is this worth joining? | Privacy-safe projection and sign-in action | Query only `get_public_intent`; no private table reads |
| Reach selector | Expand to whom? | Four ordered levels, newly included audience, disclosure delta | Expansion requires explicit confirmation |
| Intent detail | Respond or manage? | IntentCard anatomy, provenance, one CTA | CTA determined by role and lifecycle |
| Response sheet | Send this response? | Message, qualification, disclosure preview | No competing responses visible |
| Request inbox | Accept, reply, or decline? | RequestCard list and statuses | Only broadcaster reads all responses |
| Match room | Coordinate now? | IntentStatusHeader, persisted messages, released fields | Only match parties; no typing/presence in MVP |
| Resolution | What happened? | Factual outcome and dispute option | Reliability changes only from confirmed outcomes |
| Report/block | Protect me? | Reason, consequence, confirmation | Block takes effect immediately without exposing enforcement detail |

## Component APIs

`IntentCard` receives a privacy-safe view model, not a raw database row. `ReachSelector` receives current level, allowed next levels, and disclosure diffs. `PrivacyDisclosure` receives `visibleNow` and `visibleAfterAction`. `ResponseCTA` receives one verb phrase and one action. `WhyYouSeeThis` requires both rendered explanation and feedback action.

## Deep Links

- `nearcast://intent/:id` opens authenticated intent detail.
- `https://nearcast.app/i/:shareSlug` opens the public projection and hands off to the app when installed.
- Notifications contain only object identifiers and route to intent, response, or conversation after authorization is rechecked.

## Accessibility Acceptance

Core flows support dynamic type, screen-reader order, 48x48 minimum targets, text alternatives for state color, reduced motion, keyboard avoidance, and visible focus on supported devices. Privacy and safety copy may wrap and must not be truncated.

## Change Log

| Date | Change |
|---|---|
| 2026-08-24 | Defined mobile navigation, complete state coverage, screen responsibilities, and component boundaries |
| 2026-08-31 | Removed invitation-gated access. Nearcast is not invite-only: sign-up is open and the alpha cohort is limited by recruitment rather than by a token gate. |
