# Nearcast App Design Foundation

> **Governance:** This document is a design source of truth governed by [Nearcast Documentation Reference](./00 - Start Here - Nearcast Project Reference.md). All screen, flow, prototype, and component documents must reference this foundation and [Nearcast Design System Specification](./07 - Design System Specification.md).

## Purpose

This document defines the product experience and design-system foundation for the Nearcast mobile app. It should guide future UX flows, visual design, component specifications, design tokens, prototypes, and implementation decisions.

The initial design assumes a cross-platform mobile app that follows native iOS and Android conventions while maintaining one shared Nearcast product language.

## Product Definition

> **Nearcast is a trust-aware intent network that helps people extend a need, offer, or plan beyond closed groups without making it fully public.**

Nearcast is not primarily a chat app, event app, marketplace, or social feed. Its central object is the **Intent Card**, and its central interaction is **controlled broadcast**.

WhatsApp and other closed groups remain where trust and intent may originate. Nearcast helps an intent travel beyond those closed boundaries while preserving context, privacy, and control.

## Product Promise

> **Your trusted network is larger than your contact list.**

Nearcast helps users:

- Extend an intent beyond their existing groups.
- Reach relevant people instead of a generic public audience.
- Understand why an intent has reached them.
- Evaluate trust before interacting.
- Control when identity and sensitive information are revealed.
- Resolve an intent without exposing the originating group.

## Experience Principles

### 1. Intent Before Identity

Show what is needed, offered, or proposed before emphasizing who posted it. Identity becomes more prominent when it is relevant to trust and decision-making.

### 2. Explain Every Match

Always tell users why they are seeing an intent. Distribution should never feel mysterious or invasive.

Examples:

- "Nearby and connected through one trusted circle."
- "Shown because you have responded to similar requests."
- "Shared one connection beyond your residential community."

### 3. Reach Is User-Controlled

Never expand an intent's audience automatically. Users must understand and approve every increase in reach.

### 4. Trust Grows Progressively

Reveal identity, exact location, contact details, and private context only as the interaction advances and permission is granted.

### 5. Everything Expires

Intents are temporary by default. They should expire when they are no longer useful, even if the user forgets to close them.

### 6. Resolution Beats Engagement

Nearcast succeeds when users resolve an intent and leave satisfied. Screen time, endless scrolling, and notification volume are not measures of user success.

### 7. One Screen, One Decision

Each screen should prioritize one clear decision: broadcast, respond, approve, coordinate, expand, or resolve.

### 8. Never Fabricate Activity

All counts, trust signals, responses, and statuses must reflect real activity. Empty and low-response states must remain honest and useful.

## Information Architecture

The mobile app should use four primary destinations.

### For You

A finite feed of relevant, active intents from adjacent networks.

### Broadcast

The prominent central action for creating and publishing an intent.

### Activity

The operational center for broadcasts, responses, requests, matches, and temporary conversations.

### You

The user's trust profile, circles, preferences, privacy controls, verification, and safety settings.

Search and filtering should live within **For You** rather than becoming a separate navigation destination.

## The Intent Model

Every Nearcast intent contains the following elements.

### Primitive

The intent begins with one of three universal primitives:

- **I need:** Help, information, a person, an item, a service, or a recommendation.
- **I offer:** An opportunity, item, skill, resource, introduction, or availability.
- **I want to:** Attend, travel, play, collaborate, learn, or experience something.

### Statement

A natural-language description of the intent.

### Context

Structured details such as location, timing, quantity, price, requirements, and eligibility.

### Provenance

An explanation of where trust originated without exposing the private group or its members.

### Reach

The audience boundary defining how far beyond the original circle the intent may travel.

### Expiry

The time after which the intent automatically becomes inactive.

### Response Action

The action relevant to the intent, such as help, recommend, join, offer, request, or ask.

### Status

The current lifecycle state of the intent.

### Privacy Level

The information visible at each stage of the interaction.

All categories should use this shared model. A category may change the contextual fields and response action, but it should not create an entirely different experience.

## Intent Lifecycle

The standard lifecycle is:

```text
Draft -> Live -> Response Pending -> Matched -> Resolved
                  |                         |
                  -> Declined               -> Expired
                                            -> Withdrawn
```

Supported states include:

- **Draft:** The intent is being created and is not visible to others.
- **Live:** The intent is visible within its approved reach.
- **Expanding:** The user is reviewing or increasing its reach.
- **Response pending:** Someone has responded and is waiting for a decision.
- **Matched:** A response has been accepted and coordination is active.
- **Resolved:** The user's objective has been completed.
- **Expired:** The intent reached its expiry without resolution.
- **Withdrawn:** The broadcaster manually closed the intent.
- **Reported:** The intent is restricted while a safety report is reviewed.

## Core Screens

### For You

The home screen is a finite collection of active Intent Cards. Every card should communicate:

- The intent headline.
- Essential time and location context.
- Trust distance.
- Why the recipient is seeing it.
- Expiry or urgency.
- One contextual response action.

Avoid vanity likes, follower counts, and generic comment totals. Secondary actions may include **Save**, **Hide**, and **Not relevant**.

Example:

> **Need two people for badminton**  
> Tonight · 2.4 km away · 4 already confirmed  
> One trusted connection  
> **Why you're seeing this:** You play nearby on weekday evenings  
> `[Request to join]`

### Broadcast Composer

Begin with one large conversational input:

> **What do you need, offer, or want to do?**

The user writes naturally. Nearcast extracts and proposes structure without forcing the user to begin with a form.

The user then reviews:

1. Intent details.
2. Expiry.
3. Response criteria.
4. Privacy.
5. Reach.

The final step previews exactly what recipients will see. A standard broadcast should take less than one minute to create.

### Reach Selection

Reach uses a familiar audience-selector pattern:

- My trusted circles.
- People connected to my circles.
- Relevant people nearby.
- Broader public reach.

The interface must explain what each level exposes. Increasing reach requires explicit confirmation.

### Live Intent

The live intent screen is an operational dashboard rather than a social post page.

Example:

> **Your intent is live**  
> Reached 24 relevant people  
> 5 viewed · 2 responded  
> Expires in 6 hours

Primary actions:

- Review responses.
- Adjust reach.
- Edit intent.
- Resolve intent.
- Withdraw intent.

If no relevant responses arrive, Nearcast may suggest controlled expansion without implying false activity.

### Intent Detail

Use progressive disclosure in this order:

1. Intent and essential context.
2. Why the user received it.
3. Trust provenance.
4. Broadcaster reliability.
5. Requirements and privacy information.
6. Contextual response action.

Sensitive identity, contact, and location information remains hidden until acceptance when appropriate.

### Responding

The primary response action changes with the intent:

- I can help.
- I'm interested.
- I can recommend someone.
- Request to join.
- Make an offer.
- Ask a question.

Low-risk intents may accept immediate responses. Higher-risk intents should use a request-and-approval flow. Nearcast may ask one or two qualifying questions when they materially improve the match.

### Request Review

Show one respondent at a time with contextually relevant trust evidence.

Example:

> **Riya wants the ticket**  
> Two trusted connections  
> Phone verified · 4 successful exchanges  
> "Can collect it this evening."

Primary actions should remain fixed near the thumb zone:

- Accept.
- Reply.
- Decline.

Do not reduce people to one universal star score. Show contextual evidence such as completed exchanges, attendance reliability, response history, or mutual connections.

### Temporary Coordination

After acceptance, open a focused temporary conversation containing:

- The accepted intent pinned at the top.
- Shared details.
- Messages and logistical actions.
- Report and block controls.
- A resolve action.

The conversation closes when the intent ends but remains available in history where needed for safety and support.

### Resolution

When the interaction finishes, ask:

> **Was your intent resolved?**

After confirmation, close the intent and collect lightweight factual feedback:

- Did the participant follow through?
- Was the information accurate?
- Would you interact with this person again?

Only completed interactions should contribute to reputation.

## Trust And Privacy Model

Nearcast should reveal information progressively.

### Before Response

- Intent details.
- Approximate location when needed.
- General provenance.
- Limited trust summary.

### After Response

- First name or selected display identity.
- Relevant trust signals.
- Qualifying response information.

### After Acceptance

- Exact coordination details when necessary.
- Temporary communication channel.
- Additional identity information appropriate to the risk level.

### After Completion

- Outcome confirmation.
- Contextual reputation updates.
- Optional ongoing trusted connection.

The original private group, its conversation, and its membership should never become visible by default.

## Notification Strategy

Notifications should report meaningful state changes rather than manufacture engagement.

Appropriate notifications include:

- "Someone relevant responded to your intent."
- "Your request was accepted."
- "An intent matching your availability appeared nearby."
- "Your broadcast expires soon with two unanswered responses."

Avoid generic notifications such as:

- "We miss you."
- "Come back and see what's happening."
- "People are waiting for you."

## Visual Direction

Nearcast should feel **calm, credible, human, and quietly optimistic**. It should not resemble a high-energy entertainment network.

### Color

- Use a warm off-white canvas instead of clinical white.
- Use a deep signal green as the primary action and trust color.
- Use forest-black for primary text.
- Use warm amber for timing, expiry, and deliberate reach expansion.
- Reserve muted coral for destructive and safety actions.
- Use restrained neutral surfaces and borders.

Color should encode status and action rather than content category. Different intent categories must not create a rainbow interface.

### Typography

- Use Manrope or another warm geometric sans with strong mobile readability.
- Maintain a compact but comfortable mobile type scale.
- Use weight and spacing before relying on color for hierarchy.
- Use tabular numerals for counts, prices, distances, and time where supported.

### Shape And Elevation

- Intent Cards use approximately 16px corner radii.
- Buttons use approximately 12-14px corner radii.
- Chips and compact statuses may use pill shapes.
- Prefer subtle borders over heavy shadows.
- Use elevation only for temporary layers such as sheets, menus, and active dialogs.

### Layout And Spacing

- Use a 4px base spacing grid.
- Prefer 8px, 12px, 16px, 24px, and 32px spacing steps.
- Maintain at least 16px horizontal screen margins.
- Use minimum 48px touch targets.
- Keep primary actions within comfortable thumb reach.
- Respect safe areas and platform navigation conventions.

### Iconography

- Use rounded outline icons with consistent stroke weight.
- Pair icons with text for important trust, privacy, and safety actions.
- Avoid decorative icons that resemble badges or gamification rewards.

## Motion And Feedback

Motion should explain state changes and the movement of an intent through the network.

Recommended patterns:

- A restrained outward ripple after broadcasting.
- A smooth status transition from Live to Matched.
- A subtle response-arrival animation.
- A clear confirmation when reach expands.
- A contained resolution transition when an intent closes.

Motion should generally use short durations between 150ms and 250ms. Avoid confetti, streak celebrations, and attention-seeking loops. Respect reduced-motion preferences.

## Content Voice

Nearcast copy should be direct, transparent, contextual, and reassuring.

Recommended language:

- "Why you're seeing this."
- "Shared one connection beyond your circle."
- "Only accepted respondents will see the exact location."
- "No relevant responses yet."
- "Expand reach when you're ready."
- "This intent has been resolved."

Avoid manipulative or ambiguous language:

- "Don't miss out."
- "People are waiting."
- "Go viral."
- "Everyone is interested."
- "Act now" unless a real deadline requires it.

## Accessibility Requirements

- Meet WCAG AA contrast requirements.
- Maintain at least 4.5:1 contrast for standard text.
- Maintain at least 3:1 contrast for large text and UI components.
- Never communicate status using color alone.
- Provide visible focus states for external keyboard and assistive navigation.
- Support dynamic type and text scaling.
- Provide accessible labels for trust, provenance, privacy, and status icons.
- Announce loading, success, error, and state changes to assistive technologies.
- Respect reduced-motion and increased-contrast settings.

## Design-System Architecture

Use a three-layer token model.

```text
Primitive tokens
Color, spacing, typography, radius, elevation, opacity, and motion

        ↓

Semantic tokens
Background, surface, text, trust, action, warning, danger, success, and focus

        ↓

Component tokens
Intent Card, Reach Selector, Provenance Strip, buttons, sheets, navigation, and other components
```

Components must reference semantic or component tokens rather than raw values. Light and dark appearances should be implemented by reassigning semantic tokens.

## Signature Components

The design system should prioritize the following Nearcast-specific components:

- `IntentCard`
- `IntentTypeLabel`
- `ProvenanceStrip`
- `WhyYouSeeThis`
- `TrustDistance`
- `ReachSelector`
- `ReachPreview`
- `ExpiryIndicator`
- `ResponseCTA`
- `RequestCard`
- `IntentStatusHeader`
- `IntentMetrics`
- `ResolutionSheet`
- `TrustProfile`
- `TrustContext`
- `PrivacyDisclosure`
- `SafetyActionSheet`
- `EmptyIntentState`

Foundation components should include:

- Buttons.
- Icon buttons.
- Text inputs and text areas.
- Selectors, checkboxes, radios, switches, and chips.
- Cards and list rows.
- Badges and status labels.
- Alerts and inline notices.
- Bottom sheets and dialogs.
- Navigation bars and tabs.
- Toasts and banners.
- Avatars and identity placeholders.
- Loading indicators and skeletons.

Each interactive component must define:

- Default.
- Pressed.
- Focused.
- Selected.
- Loading.
- Disabled.
- Error.
- Offline.

## Critical Empty And Failure States

### No Relevant Intents

Explain that there is currently nothing matching the user's context. Offer preference adjustment or broadcasting without inventing content.

### No Responses

Show actual reach and suggest an explicit audience expansion, editing the intent, or waiting until a relevant time.

### Intent Expired

Explain that the intent is no longer active. Allow the broadcaster to duplicate and update it rather than silently reposting it.

### Connection Lost

Preserve drafts and clearly distinguish queued actions from successfully published actions.

### Request Declined

Communicate the result neutrally without exposing private reasons or creating unnecessary embarrassment.

### Safety Restriction

Explain what action was limited, what remains private, and what the user can do next.

## Product Success Criteria

The experience should optimize for:

- Time to create a valid intent.
- Percentage of recipients who understand why they received an intent.
- Relevant response rate.
- Intent resolution rate.
- Time from broadcast to useful response.
- Percentage of reach expansions explicitly initiated by users.
- Completed interactions without safety incidents.
- Repeat broadcasts following successful resolution.

Nearcast should not optimize primarily for feed depth, session duration, notification opens, or raw content volume.

## Design North Star

Nearcast is a **mobile trust utility with social capabilities**.

The approved app design direction is **Trustworthy Native Clarity**: warm native surfaces, explicit provenance, controlled reach, and progressive disclosure. The interface should remain minimal and calm while making trust, privacy, and safe next actions self-explanatory.

Every design decision should reinforce the following experience:

```text
I have an intent
      ↓
My closed group cannot fully resolve it
      ↓
I safely extend its reach
      ↓
The right person understands why they received it
      ↓
We progressively establish trust
      ↓
The intent is resolved
```

The defining user feeling is:

> **I can reach beyond my circles without losing control.**

## Change Log

| Date | Change |
|---|---|
| 2026-08-25 | Resolved C-03: added `TrustContext` to the signature component list; no component may render a numeric trust score |
| 2026-08-25 | Recorded approved Trustworthy Native Clarity direction for the mobile app design system |
| 2026-08-24 | Created the mobile app experience and design foundation |
| 2026-08-24 | Added documentation governance and formal design-system references |
