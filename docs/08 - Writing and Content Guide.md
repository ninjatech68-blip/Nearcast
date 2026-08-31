# Nearcast Content Design Guide

## Document Control

- **Status:** Product-language source of truth
- **Last updated:** 2026-08-24
- **Design sources:** [App Design Foundation](./17 - Mobile App Design Foundation.md) and [Design System Specification](./07 - Design System Specification.md)
- **Governed by:** [Nearcast Documentation Reference](./00 - Start Here - Nearcast Project Reference.md)

## Voice

Nearcast sounds calm, clear, respectful, transparent, and useful. It explains consequential behavior before asking for action.

Nearcast does not sound promotional, mysterious, overly familiar, judgmental, or urgent without a real deadline.

## Writing Principles

- Lead with the user's intent or current state.
- Use familiar words rather than product jargon.
- Explain why information is requested.
- State privacy consequences directly.
- Use specific verbs for buttons.
- Distinguish facts, estimates, and trust signals.
- Never imply safety or identity is guaranteed.
- Keep rejection and restriction language neutral.

## Canonical Terminology

| Use | Meaning | Avoid |
|---|---|---|
| Intent | A temporary need, offer, or proposed action | Post, listing, event as universal terms |
| Broadcast | Publish an intent to an approved reach | Blast, go viral |
| Reach | How far an intent may travel | Audience size as status |
| Origin | The private context where an intent began | Verified WhatsApp group unless verified |
| Confirmation | Authenticated support or recognition | Attendee, guaranteed participant |
| Response | A person's contextual reply to an intent | Lead |
| Match | An accepted response | Connection when no acceptance occurred |
| Resolve | Close an intent with an outcome | Complete when outcome is uncertain |
| Trust context | Evidence relevant to a decision | Trust score |
| Reliability | Factual follow-through history | Rating or social credit |

## Core Prompts

- Composer: `What do you need, offer, or want to do?`
- Reach: `How far should this intent travel?`
- Recommendation explanation: `Why you're seeing this`
- Response disclosure: `What will be shared`
- Acceptance disclosure: `What becomes visible after you accept`
- Resolution: `Was your intent resolved?`

## Button Vocabulary

### Creation

- Review intent.
- Preview broadcast.
- Broadcast intent.
- Save draft.
- Adjust reach.
- Resolve intent.
- Withdraw intent.

### Response

- I can help.
- I can recommend someone.
- I'm interested.
- Request to join.
- Make an offer.
- Ask a question.
- Withdraw response.

### Decision

- Accept response.
- Reply.
- Decline.
- Share exact location.
- Keep location private.

Generic `Submit`, `Continue`, and `OK` are allowed only when no clearer action exists.

## Trust And Provenance Patterns

Recommended:

- `Confirmed by 3 people at the origin.`
- `One trusted connection from your network.`
- `Phone verified. Verification does not guarantee safety.`
- `8 of 9 confirmed interactions were completed.`

Avoid:

- `Trusted user.`
- `100% safe.`
- `Verified group.` unless independently verified.
- `Everyone is joining.`
- `Popular near you.` without a defined factual basis.

## Privacy Patterns

- `People can see your first name and approximate area.`
- `Only accepted respondents can see the exact location.`
- `Your originating group and its members remain private.`
- `Reducing reach stops new delivery. It cannot retract details already viewed.`
- `This information will be shared only after you accept.`

## Status Language

| State | Label | Supporting copy |
|---|---|---|
| Draft | Draft | Only you can see this intent. |
| Live | Live | Visible within your selected reach. |
| Response pending | Response received | Review before sharing more information. |
| Matched | Matched | Temporary coordination is available. |
| Resolved | Resolved | This intent is closed to new responses. |
| Expired | Expired | The response window ended. |
| Withdrawn | Withdrawn | The broadcaster closed this intent. |
| Restricted | Under review | Some actions are temporarily unavailable. |

## Empty And Error Copy

### No Relevant Intents

`Nothing relevant is active right now. Adjust your preferences or broadcast an intent.`

### No Responses

`No relevant responses yet. You can wait, edit the intent, or expand its reach.`

### Offline Draft

`Your draft is saved on this device. It will not be published until you're online.`

### Publish Failure

`Your intent wasn't published. Review your connection and try again.`

### Permission Denied

`This information isn't available to you.`

Do not reveal whether hidden private records exist.

## Decline, Block, And Report Copy

### Declined Response

`The broadcaster didn't accept this response. No additional details were shared.`

### Block Confirmation

`You will no longer see or receive intents, responses, or messages from this person.`

### Report Confirmation

`Report received. We have preserved the relevant information for review. You can also block this person now.`

### Restriction

`Some account actions are unavailable while we review a safety concern.`

Avoid accusatory language before moderation is complete.

## Notification Copy Rules

- Name the real state change.
- Avoid sensitive content on the lock screen.
- Avoid exact locations, prices, message excerpts, and private-group references.
- Deep-link to the affected object.

Examples:

- `A relevant response arrived for your intent.`
- `Your response was accepted.`
- `An accepted participant updated the coordination room.`
- `Your intent expires soon with two responses awaiting review.`

Never send `We miss you`, `People are waiting`, or manufactured FOMO.

## Accessibility And Localization

- Use short sentences and common vocabulary.
- Do not encode meaning in punctuation, capitalization, or emoji.
- Allow text expansion of at least 30% for localization.
- Use locale-aware time, date, distance, and currency formatting.
- Avoid gender assumptions and relationship labels not supplied by users.
- Read screen-reader labels aloud during design review.

## Content Review Checklist

- Is the action described with a specific verb?
- Is the privacy effect clear before action?
- Are facts distinguished from estimates and signals?
- Could the wording imply guaranteed safety?
- Does the message expose sensitive information on a lock screen?
- Is rejection neutral and non-provocative?
- Can the sentence be understood without product knowledge?

## Change Log

| Date | Change |
|---|---|
| 2026-08-24 | Defined Nearcast terminology, voice, UI patterns, notifications, and safety language |
