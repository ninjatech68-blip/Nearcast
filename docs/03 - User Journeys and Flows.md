# Nearcast User Flows And Screen Inventory

## Document Control

- **Status:** Approved UX flow baseline
- **Last updated:** 2026-08-24
- **Design sources:** [App Design Foundation](./17 - Mobile App Design Foundation.md) and [Design System Specification](./07 - Design System Specification.md)
- **Governed by:** [Nearcast Documentation Reference](./00 - Start Here - Nearcast Project Reference.md)

## Experience Model

Nearcast supports two fluid roles:

- **Broadcaster:** Creates and controls an intent.
- **Recipient:** Discovers, confirms, responds to, or participates in an intent.

The same user may switch roles multiple times in one week. Navigation and terminology must not label people permanently as hosts, organizers, buyers, or sellers.

## Global Navigation

- **For You:** Finite, relevant intent feed.
- **Broadcast:** Central creation action.
- **Activity:** Broadcasts, responses, matches, and temporary coordination. Coordination conversations live here; there is no separate chat destination.
- **You:** Trust history, privacy, notification settings, verification, blocks, and account controls.

## Flow 1: First Entry From A Shared Link

```text
WhatsApp link
  -> privacy-safe intent preview
  -> why this link exists
  -> contextual action
  -> sign in only when responding or confirming
  -> return to same intent
  -> submit action
  -> status confirmation
```

### Screens

1. **Public Intent Preview:** Shows intent statement, approximate context, expiry, genuine confirmation count, and allowed provenance.
2. **Authentication Sheet:** Google or Apple sign-in with a clear explanation of why identity is needed. This is the single approved authentication method for the closed alpha.
3. **Response Preview:** Shows information that will be shared with the broadcaster.
4. **Response Submitted:** Shows pending, accepted-immediately, or confirmation-complete status.

### Failure States

- Expired intent: explain that it is closed; do not offer a response CTA.
- Withdrawn intent: state that the broadcaster closed it.
- Invalid link: offer safe navigation to the app without revealing whether private data exists.
- Blocked relationship: display an unavailable state without identifying the block source.

## Flow 2: First App Open Without A Link

```text
welcome value statement
  -> sign in
  -> select approximate area
  -> choose a few broad relevance signals
  -> view a limited For You feed
  -> respond or create an intent
```

Onboarding must not require a complete profile. Verification and additional preferences are requested only when they unlock a real action.

## Flow 3: Create And Publish An Intent

```text
Broadcast
  -> natural-language composer
  -> extracted structured details
  -> user confirms primitive and context
  -> expiry and response criteria
  -> privacy and reach
  -> recipient preview
  -> publish
  -> share to origin circle
```

### Composer Requirements

- Start with `What do you need, offer, or want to do?`
- Preserve the user's original wording while allowing structured edits.
- Suggest, but never silently set, sensitive location or audience data.
- Save local draft changes continuously.
- Show validation inline without erasing valid input.

### Publish Confirmation

After publishing, show:

- Current reach.
- Expiry.
- Public share link.
- `Share to WhatsApp` action.
- What recipients can see.
- `View as recipient` action.

## Flow 4: Origin Confirmation

```text
broadcaster shares intent link to closed group
  -> group member opens link
  -> reviews intent
  -> signs in if needed
  -> taps Confirm origin support
  -> unique confirmation added
```

Confirmation means the person recognizes or supports the presented intent. It does not guarantee attendance, truth, payment, or safety. The UI must explain this distinction.

## Flow 5: Expand Reach

```text
live intent dashboard
  -> Adjust reach
  -> compare current and proposed audience
  -> review newly exposed fields
  -> confirm expansion
  -> receive expansion confirmation
```

Reach options:

- Origin-only.
- Adjacent trust network.
- Relevant nearby people.
- Broader approved reach.

The application must not preselect a broader reach to pressure users. Reducing reach takes effect immediately for future delivery but does not retract information already shown to prior recipients.

## Flow 6: Discover And Respond

```text
For You card
  -> intent detail
  -> Why you're seeing this
  -> trust and privacy context
  -> contextual response
  -> optional qualification
  -> disclosure preview
  -> submit
```

Primary response labels include:

- I can help.
- I can recommend someone.
- I'm interested.
- Request to join.
- Make an offer.
- Ask a question.

## Flow 7: Review A Response

```text
response notification
  -> response detail
  -> contextual trust evidence
  -> Accept / Reply / Decline
  -> acceptance disclosure preview
  -> match created
```

Accept and decline operations must be idempotent. The broadcaster must see if accepting would reveal exact location or contact details before confirming.

## Flow 8: Temporary Coordination

```text
match created
  -> temporary room
  -> intent pinned at top
  -> logistics messages
  -> block/report available
  -> resolve or withdraw
```

The room does not attempt to replace WhatsApp. It exists to protect private information until both parties choose another channel.

## Flow 9: Resolution And Feedback

```text
broadcaster taps Resolve
  -> selects resolution outcome
  -> accepted participants confirm completion
  -> factual feedback
  -> contextual reliability updated
  -> intent archived
```

Resolution outcomes:

- Resolved through Nearcast.
- Resolved elsewhere.
- No longer needed.
- Could not resolve before expiry.

Only `Resolved through Nearcast` with participant confirmation contributes to completed-interaction reliability.

## Flow 10: Block And Report

```text
overflow or safety action
  -> choose Block or Report
  -> select reason
  -> optional factual detail
  -> immediate protective action
  -> confirmation and support route
```

Blocking must immediately remove direct contact and prevent future matching. Reporting must preserve evidence according to the retention policy even if the reporter deletes local content.

## Screen Inventory

### Authentication And Onboarding

- Welcome.
- Authentication.
- Authentication callback.
- Approximate area selection.
- Initial relevance preferences.
- Notification permission education.

### Discovery

- For You feed.
- Filter and preference sheet.
- Intent detail.
- Why you're seeing this sheet.
- Saved intents.
- Hidden/not-relevant confirmation.

### Creation And Management

- Intent composer.
- Structured-detail review.
- Expiry and requirements.
- Privacy and reach selector.
- Recipient preview.
- Publish success.
- Live intent dashboard.
- Edit-intent review.
- Expand-reach confirmation.
- Resolve-intent sheet.

### Response And Coordination

- Response composer.
- Disclosure preview.
- Response pending.
- Response review.
- Acceptance confirmation.
- Temporary coordination room.
- Completion feedback.

### Profile And Safety

- Trust profile.
- Interaction history.
- Verification.
- Privacy controls.
- Notification settings.
- Blocked users.
- Report flow.
- Help and safety.
- Account deletion.

## Required State Coverage

Every applicable screen must define:

- Loading.
- Empty.
- Partial data.
- Offline.
- Retryable error.
- Non-retryable error.
- Permission denied.
- Expired.
- Withdrawn.
- Blocked.
- Reported/restricted.
- Success.

## UX Acceptance Criteria

- A first-time broadcaster can publish a valid intent in under 60 seconds after authentication.
- A link recipient can understand the intent and its provenance before installing the app.
- A recipient can explain why an intent appeared without opening settings.
- A user sees the privacy impact before expanding reach or accepting a response.
- No sensitive field appears in a screen state prohibited by the Permissions Matrix.

## Change Log

| Date | Change |
|---|---|
| 2026-08-24 | Defined complete MVP mobile flows and screen inventory |
| 2026-08-25 | Recorded the C-02 resolution: four primary destinations, with coordination conversations inside Activity |
