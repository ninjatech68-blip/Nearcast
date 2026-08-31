# Nearcast Content Design Guide

## Document Control

- **Status:** Product-language source of truth
- **Last updated:** 2026-08-31
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

Nearcast keeps two registers. **Interface terminology** is what a person reads on screen. **Domain terminology** is what the product, architecture, API, and database call the same things. The two tables below map onto each other one-to-one; neither may drift from the other without an entry in this document's change log.

### Interface Terminology

This is the language of every user-facing string. It is the register a first-time user is expected to understand without product knowledge.

| Use | Meaning | Domain term | Avoid |
|---|---|---|---|
| Cast | A plan invitation broadcast to a chosen reach | Intent + Broadcast | Post, listing, event, blast, drop |
| Ask to join | Send a private join request to the host | Response | Join, RSVP, or any wording implying automatic acceptance |
| Circles | People connected to you who can vouch for your follow-through | Trust context | Followers, friends, network size as status |
| Signal | A plain-language description of your follow-through on casts | Reliability | Score, rating, percentage, points, reputation number, social credit |
| Receipts | The record of casts that actually happened | Confirmation history | Badges, trophies, streaks, activity counts |

`Signal` is deliberately qualitative. It describes follow-through in words and never as a number, bar, percentage, or rank. A numeric or comparative Signal would be a trust score, which [Trust Privacy and Safety](./04%20-%20Trust%20Privacy%20and%20Safety.md) and the Design System both prohibit.

`Circles` names the people who can vouch for someone. It does not name a reach tier; reach keeps its own labels so a person is never asked to read one word two ways in the same flow.

### Domain Terminology

This is the language of the PRD, architecture, permissions, API contracts, database schema, and `src/features/`. It does not appear in user-facing strings.

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

- Composer kind: `What kind of cast is this?`
- Composer statement: `What's the invite?`
- Reach: `Who can see this cast?`
- Recommendation explanation: `Why you're seeing this`
- Response disclosure: `What will be shared`
- Acceptance disclosure: `What becomes visible after you accept`
- Resolution: `Was your cast resolved?`

## Button Vocabulary

Buttons use interface terminology. The domain term for each action is in brackets and never appears on screen.

### Creation

- Review cast. [review intent]
- Post cast. [broadcast intent]
- Save draft.
- Adjust reach.
- Resolve cast. [resolve intent]
- Withdraw cast. [withdraw intent]

### Response

- I can help.
- I can recommend someone.
- I'm interested.
- Ask to join. [submit response]
- Make an offer.
- Ask a question.
- Withdraw request. [withdraw response]

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
| Draft | Draft | Only you can see this cast. |
| Live | Live | Visible within your selected reach. |
| Response pending | Request received | Review before sharing more information. |
| Matched | Matched | Temporary coordination is available. |
| Resolved | Resolved | This cast is closed to new requests. |
| Expired | Expired | The response window ended. |
| Withdrawn | Withdrawn | The host closed this cast. |
| Restricted | Under review | Some actions are temporarily unavailable. |

## Empty And Error Copy

### No Relevant Casts

`Nothing relevant is active right now. Adjust your preferences or post a cast.`

### No Requests

`No one has asked to join yet. You can wait, edit the cast, or expand its reach.`

### Offline Draft

`Your draft is saved on this device. It will not be published until you're online.`

### Publish Failure

`Your cast wasn't posted. Review your connection and try again.`

### Permission Denied

`This information isn't available to you.`

Do not reveal whether hidden private records exist.

## Decline, Block, And Report Copy

### Declined Response

`The host didn't accept this request. No additional details were shared.`

### Block Confirmation

`You will no longer see or receive casts, requests, or messages from this person.`

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

- `Someone asked to join your cast.`
- `Your response was accepted.`
- `An accepted participant updated the coordination room.`
- `Your cast closes soon with two requests awaiting review.`

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
| 2026-08-31 | Split terminology into interface and domain registers. Adopted Cast, Ask to join, Circles, Signal, and Receipts as user-facing language, mapped to the unchanged domain terms. Defined Signal as qualitative only, because the source brief's "public reputation" framing would otherwise be a trust score prohibited by document 04 and the Design System. |
| 2026-08-31 | Carried the interface register through Core Prompts, Button Vocabulary, Status Language, empty/error copy, and notification examples, so no user-facing string still reads `intent`. Kept `Continue` out of the composer: the guide allows generics only when no clearer verb exists, and `Review cast` is clearer. |
