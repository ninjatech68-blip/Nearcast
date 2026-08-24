# Nearcast Trust, Privacy, And Safety Specification

## Document Control

- **Status:** Mandatory safety baseline
- **Last updated:** 2026-08-24
- **Governed by:** [Nearcast Documentation Reference](./00 - Start Here - Nearcast Project Reference.md)
- **Authorization details:** [Permissions Matrix](./06 - Permissions and Access Rules.md)

## Safety Objective

Nearcast must expand the reach of an intent without automatically expanding access to a person's private group, identity, exact location, or contact information.

Trust signals reduce uncertainty; they do not guarantee character, truth, quality, or safety. Product copy must not imply otherwise.

## Trust Model

Nearcast trust is contextual and evidence-based. It uses:

- Authenticated origin confirmations.
- Network distance where a legitimate connection exists.
- Identity and phone verification state.
- Completed Nearcast interactions.
- Context-specific follow-through rates.
- Mutual blocks, reports, and enforcement restrictions.

Nearcast must not use:

- Purchased endorsements.
- Unverified claims of group membership.
- Fabricated activity.
- A single universal social-credit score.
- Protected attributes or inferred sensitive traits.
- Private message content for recommendation ranking.

## Progressive Disclosure

### Stage 1: Discovery

Recipients may see the intent, approximate context, expiry, aggregate confirmations, limited broadcaster identity, and a reason for delivery.

### Stage 2: Response

The broadcaster may see the respondent's display identity, relevant verification, contextual reliability, qualifying answers, and response text.

### Stage 3: Acceptance

Accepted participants receive only the exact details required for coordination. The interface must preview every newly disclosed field before acceptance.

### Stage 4: Completion

Participants may provide factual outcome feedback and optionally retain a trusted connection. No private-group membership is granted automatically.

## Location Protection

- Store approximate discovery location separately from exact coordination location.
- Use a coarse area or rounded point for discovery.
- Never include exact coordinates in analytics, logs, push payloads, or public link metadata.
- Reveal exact location only to accepted participants when the broadcaster explicitly allows it.
- Remove exact-location access when a match is cancelled, blocked, or restricted, subject to safety evidence retention.
- Do not implement continuous live-location tracking in the MVP.

## Identity Protection

- Use stable internal IDs rather than phone numbers or email addresses in domain tables.
- Do not expose government identity documents to other users.
- Do not expose origin confirmer identities to the broadcaster; show aggregate confirmation evidence.
- Reveal contact details only through an explicit, reversible consent action.
- Prevent profile enumeration through public URLs or predictable IDs.

## Origin Confirmation Integrity

- Require authentication before confirmation.
- Allow one active confirmation per user and intent.
- Prevent broadcaster self-confirmation.
- Rate-limit confirmation attempts.
- Record confirmation provenance and timestamp for abuse analysis.
- Present confirmation as support or recognition, not guaranteed participation.
- Remove confirmation influence when accounts are suspended or fraudulent.

## Risk-Adaptive Verification

Verification effort should increase with action risk:

| Risk | Example | Minimum Control |
|---|---|---|
| Low | Recommendation or general information | Authenticated profile, report/block |
| Medium | In-person group participation | Verified contact method, acceptance gate, contextual reliability |
| Elevated | High-value exchange or private-location meeting | Additional verification, stronger warnings, limited reach |
| Prohibited in MVP | Weapons, illegal substances, exploitative services, unsafe minor contact | Block creation and route to moderation |

## Blocking

Blocking is immediate and global between the two accounts. It stops direct messaging, responses, future matching, and access to newly disclosed private details. The blocked person is not told who blocked them.

## Reporting

Users may report:

- Intent.
- Profile.
- Response.
- Temporary-room message.
- Completed interaction.

Required report reasons:

- Spam or irrelevant solicitation.
- Fraud or misleading information.
- Harassment or hate.
- Unsafe in-person behavior.
- Prohibited goods or services.
- Privacy violation.
- Impersonation.
- Other safety concern.

Submitting a report must offer immediate blocking. Severe categories should restrict content pending review.

## Moderation States

- **Open:** Awaiting review.
- **Restricted:** Content or account visibility limited during review.
- **Actioned:** Warning, content removal, temporary suspension, or permanent suspension applied.
- **Dismissed:** Evidence did not support a policy violation.
- **Escalated:** Requires legal, emergency, or specialist handling.

All moderator actions require an audit record containing actor, timestamp, reason code, affected object, and action.

## Prohibited Content

The MVP prohibits:

- Illegal goods, controlled substances, and weapons.
- Sexual services, exploitation, trafficking, or non-consensual content.
- Attempts to contact or recruit minors outside approved guardian contexts.
- Hate, harassment, threats, stalking, or doxxing.
- Fraud, impersonation, counterfeit goods, and deceptive financial schemes.
- Requests for credentials, OTPs, passwords, or sensitive identity documents.
- Sale of private personal data.
- Self-harm encouragement or instructions for causing harm.
- Dangerous medical claims presented as professional care.

## Data Retention

| Data | Default Retention |
|---|---|
| Active intent | Until resolved, withdrawn, or expired |
| User-visible intent history | 12 months unless deleted earlier |
| Temporary messages | 90 days after closure |
| Exact coordination location | 30 days after closure unless safety hold applies |
| Analytics events | 13 months with pseudonymous identifier |
| Security and audit logs | 12 months |
| Moderation evidence | 24 months or legal requirement |
| Deleted-account mapping | Minimal suppression record as legally required |

Retention periods must be configurable and reviewed with legal counsel before public beta.

## Security Controls

- Validate every user-controlled field server-side.
- Parameterize all database queries.
- Enable RLS on every exposed table.
- Use separate `USING` and `WITH CHECK` rules for updates.
- Keep service credentials out of mobile and public web clients.
- Rate-limit authentication, creation, response, messaging, reporting, and link access.
- Sanitize user-generated content and never render arbitrary HTML.
- Redact messages, intent text, exact location, email, phone, and tokens from logs.
- Use short-lived signed access where a public link grants non-public capability.
- Encrypt transport and rely on managed encryption at rest.
- Back up the database and test restoration.

## Safety UX Requirements

- Place block and report actions in every direct-interaction surface.
- Use plain-language disclosure before exact location or contact release.
- Do not use trust badges that resemble guarantees.
- Show safety reminders before first elevated-risk interaction.
- Provide neutral decline and restriction messages that do not provoke retaliation.
- Offer emergency guidance without claiming Nearcast is an emergency service.

## Pre-Alpha Safety Gate

- Permissions Matrix has automated positive and negative tests.
- Block propagation works across feed, response, and messaging.
- Reports create immutable audit records.
- Prohibited-content controls are active.
- Exact location is absent from analytics, logs, public metadata, and push payloads.
- Account deletion and data export flows are testable.
- Founder has a documented moderation response process.

## Change Log

| Date | Change |
|---|---|
| 2026-08-24 | Defined contextual trust, progressive disclosure, moderation, prohibited content, and retention baseline |
