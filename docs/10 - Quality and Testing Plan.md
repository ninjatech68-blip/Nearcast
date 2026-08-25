# Nearcast QA And Test Strategy

## Document Control

- **Status:** Approved quality baseline
- **Last updated:** 2026-08-24
- **Governed by:** [Nearcast Documentation Reference](./00 - Start Here - Nearcast Project Reference.md)

## Quality Objectives

- Prevent unauthorized data disclosure.
- Preserve correct intent lifecycle transitions.
- Avoid duplicate responses, matches, messages, and notifications.
- Keep core mobile flows accessible and resilient.
- Detect regressions before release rather than through user reports.

## Test Pyramid

### Unit Tests

Test pure domain behavior:

- Intent state transitions.
- Expiry calculations.
- Reach comparisons.
- Disclosure projections.
- Ranking signal calculations.
- Analytics property allowlists.
- Content formatting and locale behavior.

### Database And RLS Tests

Use pgTAP or equivalent database tests for every table and role:

- Broadcaster can manage own draft and intent.
- Recipient sees only eligible projections.
- Respondent cannot read competing responses.
- Accepted participant sees only explicitly released private fields.
- Blocked users cannot discover, respond, or message.
- Anonymous viewer cannot query full domain tables.
- Service-only tables reject client roles.
- Update policies prevent ownership reassignment.

Every allowed case requires at least one corresponding denied case.

### Integration Tests

Test server-owned operations with real local Postgres:

- Publish intent transaction.
- Unique origin confirmation.
- Idempotent response submission.
- Atomic response acceptance and match creation.
- Notification outbox creation.
- Resolve and contextual reliability update.
- Block propagation.
- Report preservation and restriction.

### Component Tests

Use React Native Testing Library for:

- IntentCard variants and states.
- ReachSelector disclosures.
- Response and acceptance previews.
- Dynamic type behavior.
- Screen-reader labels.
- Error, offline, expired, and restricted states.

### Mobile End-To-End Tests

Use Maestro or a compatible cross-platform tool for:

- Authentication.
- Create, preview, and publish intent.
- Open shared link.
- Confirm origin support.
- Expand reach.
- Discover and respond from a second account.
- Accept response and coordinate.
- Resolve and confirm completion.
- Block and report.
- Account deletion.

## Critical Security Test Scenarios

- Manipulate client payload to request broader reach than approved.
- Query exact location before acceptance.
- Reuse a signed link after expiry.
- Accept the same response concurrently.
- Access a temporary room after being removed or blocked.
- Submit HTML/script content and verify safe rendering.
- Enumerate public IDs and verify non-disclosure.
- Send excessive OTP, creation, response, and report requests and verify rate limits.
- Verify no secrets or sensitive content appear in logs or analytics.

## Lifecycle Test Matrix

Every state transition must test:

- Valid source and target.
- Invalid source state.
- Unauthorized actor.
- Concurrent duplicate request.
- Expired intent.
- Blocked relationship.
- Restricted account or content.
- Notification and analytics side effects.

## Offline And Recovery Testing

- Draft survives forced app termination.
- Publish does not claim success while offline.
- Retried publish uses idempotency key.
- Message reconnect fetches missed persisted messages.
- Push opens correct current state when an intent has since expired.
- Partially uploaded media does not become publicly accessible.

## Accessibility Testing

- VoiceOver and TalkBack complete the core loop.
- Dynamic type works at maximum supported size.
- Focus order matches decision hierarchy.
- Controls have meaningful labels and minimum target size.
- Reduced motion removes nonessential movement.
- Status remains understandable without color.
- Contrast meets documented minimums.

## Device Matrix

Closed alpha minimum:

- Current and previous major iOS versions on one small and one large iPhone size.
- Current and previous major Android versions on one mid-range physical device and one emulator.
- Slow network, intermittent network, and offline modes.
- Light appearance. Dark appearance is deferred beyond the first alpha build and is not a closed-alpha gate; see the C-08 resolution in the decision log of Doc 00.
- English locale with 24-hour and 12-hour time formats.

Expand coverage based on actual alpha device analytics.

## Test Data

Maintain deterministic seed users for broadcaster, recipient, confirmer, accepted participant, moderator, blocked user, and restricted user. Seed intents across every lifecycle state without using production personal data.

## Continuous Integration Gates

Every pull request must pass:

- Formatting and linting.
- Type checking.
- Unit tests.
- Database/RLS tests.
- Integration tests.
- Migration application from clean database.
- Analytics schema validation.
- Secret scanning.

Release branches additionally run mobile E2E smoke tests and production build validation.

## Severity Definitions

| Severity | Definition | Release effect |
|---|---|---|
| S0 | Privacy breach, account takeover, or widespread data corruption | Stop release; incident response |
| S1 | Core loop blocked or safety control fails | Stop release |
| S2 | Important feature degraded with workaround | Fix before beta or explicitly accept for alpha |
| S3 | Minor visual/content issue | Schedule normally |

## Release Exit Criteria

- No open S0 or S1 issues.
- All Permissions Matrix tests pass.
- Core E2E loop passes on iOS and Android.
- Accessibility critical path passes.
- Migration and rollback procedure verified in staging.
- Analytics events validated without prohibited data.
- Crash-free staging sessions meet the release target established after baseline testing.

## Change Log

| Date | Change |
|---|---|
| 2026-08-24 | Defined test pyramid, security scenarios, device coverage, CI gates, and release criteria |
| 2026-08-25 | Resolved C-08: removed dark appearance from the closed-alpha device matrix because the token cutover is deferred |
