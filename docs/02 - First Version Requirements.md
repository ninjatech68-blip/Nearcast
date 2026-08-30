# Nearcast MVP Requirements

## Document Control

- **Status:** Approved MVP baseline
- **Last updated:** 2026-08-24
- **Parent:** [Product Requirements Document](./01 - Product Requirements.md)
- **Governed by:** [Nearcast Documentation Reference](./00 - Start Here - Nearcast Project Reference.md)

## Requirement Language

- **Must:** Required for closed alpha.
- **Should:** Required before broader beta unless evidence removes the need.
- **May:** Deliberately deferred enhancement.

## Accounts And Identity

- **MUST-001:** Users must authenticate with a one-time code sent to their email during closed alpha. Accounts are invite-only: a verified identity is not membership, and a profile exists only after an invitation is redeemed.
- **MUST-001a:** Google and Apple sign-in are deferred, not dropped, and must ship before public beta. Offering third-party sign-in on iOS obliges Nearcast to offer Sign in with Apple, which requires a paid Apple Developer Program membership; email codes carry no such obligation and no external dependency, so closed alpha does not pay that cost to prove the product.
- **MUST-002:** Every user must have a stable internal identifier independent of email or phone.
- **MUST-003:** Profiles must support display name, avatar, approximate home area, interests, verification state, and contextual reliability summaries.
- **MUST-004:** Users must be able to delete their account and request deletion of associated personal data.
- **SHOULD-001:** Phone verification should be introduced before public beta for risk-sensitive actions.
- **MAY-001:** Passkeys may replace or complement social login later.

## Intent Creation

- **MUST-010:** A user must create an intent from natural-language text.
- **MUST-011:** The user must select or confirm `I need`, `I offer`, or `I want to`.
- **MUST-012:** Nearcast must support optional approximate location, start time, deadline, quantity, price, and response requirements.
- **MUST-013:** Every intent must have an explicit expiry, with a safe default proposed by the system.
- **MUST-014:** The user must preview recipient-visible content before publishing.
- **MUST-015:** Drafts must survive app restarts and temporary network loss.
- **MUST-016:** The user must be able to edit, withdraw, duplicate, and resolve their own intent.
- **MUST-017:** Published edits that materially change price, location, eligibility, or time must be visible to existing respondents.

## Origin And Sharing

- **MUST-020:** Every published intent must have a unique HTTPS share link.
- **MUST-021:** The link must open the correct intent in the app when installed and a privacy-safe fallback when not installed.
- **MUST-022:** A link recipient must be able to view public intent details before installing the app.
- **MUST-023:** A signed-in link recipient must be able to confirm that the intent has support from the origin circle without revealing the circle's membership.
- **MUST-024:** Confirmation counts must represent unique, authenticated people.
- **MUST-025:** Nearcast must not claim that a WhatsApp group is verified unless Nearcast has independently verified the represented organization.
- **SHOULD-020:** Shared links should render a useful rich preview without exposing sensitive details.

## Reach And Discovery

- **MUST-030:** The broadcaster must explicitly choose an initial reach level.
- **MUST-031:** Reach levels must include origin-only, adjacent trust network, relevant nearby users, and broader approved reach.
- **MUST-032:** The UI must explain what each reach level exposes.
- **MUST-033:** Nearcast must never expand reach without user confirmation.
- **MUST-034:** Every delivered intent must include a human-readable reason for delivery.
- **MUST-035:** Discovery must exclude blocked relationships, expired intents, ineligible recipients, and prohibited content.
- **MUST-036:** The `For You` feed must be finite and refreshable rather than endless.
- **MUST-037:** Users must be able to hide an intent and mark it not relevant.
- **SHOULD-030:** Ranking should combine eligibility, trust distance, geography, timing, recency, and user preference.

## Responses And Matching

- **MUST-040:** Each intent must define one primary response action appropriate to its context.
- **MUST-041:** The broadcaster may add up to two qualifying questions.
- **MUST-042:** Respondents must preview what identity and information will be shared before submission.
- **MUST-043:** The broadcaster must be able to accept, reply to, or decline a response.
- **MUST-044:** Declined respondents must receive a neutral status without private reasoning.
- **MUST-045:** Acceptance must create a match and unlock only the details allowed by the permissions matrix.
- **MUST-046:** Duplicate acceptance must be idempotent and must not create multiple matches.

## Coordination

- **MUST-050:** Accepted participants must receive a temporary coordination channel.
- **MUST-051:** The channel must display the governing intent and current status.
- **MUST-052:** Messages must be limited to accepted participants and authorized support staff.
- **MUST-053:** Users must be able to block or report from the coordination channel.
- **MUST-054:** Closing an intent must stop new responses while preserving necessary safety history.
- **MUST-055:** The coordination channel must carry an explicit deadline. It closes one day after the governing intent expires, and never sooner than one day after acceptance, so parties can still confirm the outcome once the intent itself has lapsed.
- **MUST-056:** A channel past its deadline must stop accepting messages immediately, whether or not a scheduled sweep has run, and must remain readable to its parties afterwards. A closed channel is a read-only record, not a hidden one.
- **MAY-050:** Media messaging, voice notes, typing indicators, and presence are deferred.

## Resolution And Trust

- **MUST-060:** The broadcaster must be able to mark an intent resolved.
- **MUST-061:** Accepted participants must be able to confirm whether the interaction occurred.
- **MUST-062:** Only completed interactions may affect reliability summaries.
- **MUST-063:** Feedback must be factual and contextual, not a universal star rating.
- **MUST-064:** Users must be able to dispute an incorrect completion status.
- **SHOULD-060:** Reliability summaries should distinguish participation, exchange, recommendation, and collaboration contexts.

## Privacy And Safety

- **MUST-070:** Exact location and private contact details must not be stored in discoverable intent rows.
- **MUST-071:** Authorization must be enforced server-side and through database RLS.
- **MUST-072:** Users must be able to block another user globally.
- **MUST-073:** Users must be able to report an intent, profile, response, or message.
- **MUST-074:** Reported content must enter a moderation queue with an immutable audit record.
- **MUST-075:** Prohibited-content rules must be enforced before closed alpha.
- **MUST-076:** Minors may not independently create accounts in the MVP.
- **MUST-077:** Rate limits must protect authentication, intent creation, responses, messaging, and reporting.

## Notifications

- **MUST-080:** Notify broadcasters about relevant responses and accepted-user updates.
- **MUST-081:** Notify respondents when requests are accepted, declined, or expire.
- **MUST-082:** Deep-link notifications to the relevant intent, response, or conversation.
- **MUST-083:** Allow granular notification preferences.
- **MUST-084:** Never send generic re-engagement notifications without a real user-relevant event.

## Accessibility And Reliability

- **MUST-090:** Support dynamic type, screen readers, reduced motion, and minimum contrast requirements.
- **MUST-091:** Never use color as the only state indicator.
- **MUST-092:** Core creation and response flows must tolerate transient offline states without duplicate submissions.
- **MUST-093:** Loading, empty, error, expired, declined, and offline states must have defined UX.

## Analytics

- **MUST-100:** Track the core funnel from intent creation through external resolution.
- **MUST-101:** Analytics must not contain intent text, messages, exact coordinates, contact information, or private-group names.
- **MUST-102:** Analytics events must use the taxonomy in [Analytics and Measurement Plan](./09 - Metrics and Analytics Plan.md).
- **MUST-103:** Account deletion must propagate to analytics identifiers where legally and technically required.

## MVP Acceptance Scenario

The MVP passes functional acceptance when an invited user can create an intent, share it into a WhatsApp circle, receive genuine confirmations, expand its reach, deliver it to an eligible adjacent user, receive a response, accept that response, coordinate privately, resolve the intent, and update contextual trust without exposing the origin group or exact location prematurely.

## Change Log

| Date | Change |
|---|---|
| 2026-08-24 | Defined closed-alpha functional and non-functional requirements |
| 2026-08-30 | Defined the coordination channel lifetime and its read-only state after close |
| 2026-08-30 | Changed closed-alpha authentication to invite-gated email one-time codes and deferred Google and Apple sign-in to MUST-001a |
