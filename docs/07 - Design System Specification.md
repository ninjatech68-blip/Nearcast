# Nearcast Design System Specification

## Document Control

- **Status:** Design-system source of truth
- **Last updated:** 2026-08-24
- **Required companion:** [App Design Foundation](./17 - Mobile App Design Foundation.md)
- **Governed by:** [Nearcast Documentation Reference](./00 - Start Here - Nearcast Project Reference.md)

## Design Character

Nearcast is calm, credible, human, and quietly optimistic. It should feel like a trusted utility with social capability, not an entertainment feed, financial dashboard, web dashboard, chat-first product, or high-energy marketplace.

The approved visual direction is **Trustworthy Native Clarity**. Every screen should answer:

```text
What is this?
Why am I seeing it?
What is safe to do next?
```

## Design Principles

- Use familiar mobile patterns for consequential actions.
- Make provenance, reach, expiry, and privacy visible.
- Use color for state and action, not content category.
- Prefer borders and tonal surfaces over heavy elevation.
- Keep primary actions in the thumb zone.
- Use motion to explain state change, not attract attention.
- Meet accessibility requirements before visual embellishment.

## Token Architecture

Use three layers:

```text
Primitive -> Semantic -> Component
```

Components must reference semantic or component tokens. Raw values may appear only in primitive-token definitions.

## Primitive Colors

| Token | Value | Purpose |
|---|---|---|
| `green.50` | `#EDF8F3` | Light trust surface |
| `green.100` | `#D8EFE5` | Selected trust surface |
| `green.500` | `#248765` | Accessible supporting green |
| `green.600` | `#176B50` | Primary action |
| `green.700` | `#11533E` | Pressed primary |
| `forest.900` | `#17221D` | Primary ink |
| `stone.0` | `#FFFFFF` | Raised surface |
| `stone.50` | `#F8F7F3` | App canvas |
| `stone.100` | `#EFEEE8` | Subtle surface |
| `stone.200` | `#DFDED6` | Border |
| `stone.500` | `#777A72` | Secondary text |
| `stone.700` | `#444A44` | Supporting ink |
| `amber.50` | `#FFF5DF` | Warning surface |
| `amber.600` | `#A85F08` | Expiry and caution |
| `coral.50` | `#FFF0EC` | Danger surface |
| `coral.600` | `#B8432F` | Destructive action |
| `blue.50` | `#EDF5FA` | Information surface |
| `blue.600` | `#276A91` | Information action |

Final production colors must pass contrast tests in their actual text/background combinations. If a value fails, adjust the primitive while preserving its semantic role.

## Semantic Colors

| Token | Light mapping |
|---|---|
| `color.background.canvas` | `stone.50` |
| `color.background.surface` | `stone.0` |
| `color.background.subtle` | `stone.100` |
| `color.text.primary` | `forest.900` |
| `color.text.secondary` | `stone.700` |
| `color.text.muted` | `stone.500` |
| `color.border.default` | `stone.200` |
| `color.action.primary` | `green.600` |
| `color.action.primaryPressed` | `green.700` |
| `color.trust.surface` | `green.50` |
| `color.trust.text` | `green.700` |
| `color.warning.surface` | `amber.50` |
| `color.warning.text` | `amber.600` |
| `color.danger.surface` | `coral.50` |
| `color.danger.text` | `coral.600` |
| `color.info.surface` | `blue.50` |
| `color.info.text` | `blue.600` |
| `color.focus` | `blue.600` |

Dark appearance is implemented by remapping semantic tokens, not by changing components. Dark primitives must preserve semantic contrast and avoid pure black surfaces.

Dark appearance is **deferred beyond the first alpha build** (C-08). The dark values below remain the approved target; `app.json` pins the light appearance until the cutover.

The approved 2026-08-25 design direction introduces an implementation target for native semantic naming. This is a **post-Phase-1 cutover** (C-07): the two systems use different token names, so every component changes at once and the migration must not be interleaved with feature work.

| Token | Light | Dark |
|---|---:|---:|
| `color.background.app` | `#F7F3EA` | `#0E1714` |
| `color.background.surface` | `#FFFFFF` | `#15211D` |
| `color.background.surfaceMuted` | `#F1F4EC` | `#1E2B25` |
| `color.background.info` | `#EAF2FA` | `#142A3A` |
| `color.background.success` | `#E8F3EC` | `#143025` |
| `color.background.warning` | `#FFF5DF` | `#35270F` |
| `color.background.danger` | `#FFF0EF` | `#381B18` |
| `color.text.primary` | `#16231F` | `#F3F7F1` |
| `color.text.secondary` | `#52635D` | `#BAC8C0` |
| `color.action.primary` | `#0F5E46` | `#65D0A1` |
| `color.action.primaryPressed` | `#0A4936` | `#0A4936` |
| `color.action.secondary` | `#17324D` | `#8EB8E5` |
| `color.status.warning` | `#8A4B00` | `#FFE2A7` |
| `color.status.danger` | `#A33124` | `#FFD9D4` |
| `color.border.subtle` | `#DDD6C8` | `#33443C` |

Every colored surface or accent must define a matching foreground token such as `color.onPrimary`, `color.onInfo`, `color.onWarning`, `color.onDanger`, `color.onSurface`, and `color.onSuccess`.

## Typography

Use **Manrope** for the shared product typeface, with platform fallback only while the font loads.

| Style | Size/line | Weight | Use |
|---|---|---|---|
| `display` | 32/38 | 700 | Rare onboarding statement |
| `title.1` | 26/32 | 700 | Screen title |
| `title.2` | 22/28 | 700 | Major section |
| `title.3` | 18/24 | 650 | Card and sheet title |
| `body.large` | 17/25 | 450 | Primary readable content |
| `body` | 15/22 | 450 | Default interface text |
| `body.strong` | 15/22 | 650 | Emphasis and controls |
| `label` | 13/18 | 650 | Chips and compact metadata |
| `caption` | 12/17 | 500 | Supporting information |

Support dynamic type. Do not truncate critical privacy, trust, or safety text solely to preserve layout.

Native implementation should map this hierarchy onto platform typography:

- **iOS:** SF Pro, SF Symbols, native sheets, native switches, and 44pt minimum touch targets.
- **Android:** Roboto, Material Symbols, Material tonal surfaces, Material sheets and switches, and 48dp minimum touch targets.

## Spacing And Sizing

Use a 4px primitive grid:

`space.1=4`, `space.2=8`, `space.3=12`, `space.4=16`, `space.5=20`, `space.6=24`, `space.8=32`, `space.10=40`, `space.12=48`.

- Screen horizontal inset: 16px.
- Dense metadata gap: 4-8px.
- Related content gap: 12px.
- Component gap: 16px.
- Section gap: 24-32px.
- Minimum interactive target: 44pt on iOS and 48dp on Android.

## Radius, Border, And Elevation

| Token | Value | Use |
|---|---:|---|
| `radius.small` | 8px | Small fields and labels |
| `radius.control` | 12px | Inputs and buttons |
| `radius.card` | 16px | Intent and request cards |
| `radius.sheet` | 24px | Top corners of bottom sheets |
| `radius.pill` | 999px | Status chips only |
| `border.default` | 1px | Standard separation |
| `elevation.card` | none/subtle | Default cards rely on borders |
| `elevation.overlay` | medium | Sheets, dialogs, menus |

## Motion

| Token | Value | Use |
|---|---:|---|
| `motion.fast` | 150ms | Color and control feedback |
| `motion.standard` | 220ms | Sheets and state transitions |
| `motion.emphasis` | 320ms | Broadcast ripple or resolution |
| `easing.standard` | ease-out | Most transitions |

Reduced-motion mode removes ripple, scale, and travel metaphors while retaining opacity and immediate state feedback.

## Core Foundation Components

### Button

Variants: primary, secondary, outline, ghost, destructive. Standard height is 48px, which satisfies both platform minimums. Loading preserves label width. Destructive actions require explicit language and confirmation when irreversible.

### Text Input And Composer

Supports label, helper, character guidance, error, voice-accessibility label, and optional structured suggestions. The natural-language intent composer expands up to a defined maximum before scrolling.

### Chip

Variants: selectable, selected, status, and removable. A chip cannot be the only indication of a consequential state.

### Bottom Sheet

Preferred for mobile decisions that preserve parent context: reach selection, response action, resolution, report, and privacy disclosure. Use full-screen flow for multi-step creation.

### Banner And Inline Notice

Variants: information, trust, warning, danger, and success. Include an icon and text; never rely on color alone.

## Signature Components

### TrustContext

Trust is displayed as factual, contextual evidence. There is no numeric trust score, and no component may compute or render one.

Approved formats:

```text
8 of 9 confirmed interactions were completed
One trusted connection from your network
Confirmed by 3 people at the origin
Phone verified. Verification does not guarantee safety.
```

Never render a composite score, `4.7`, `Trust 812`, percentages, ratings, follower counts, likes, popularity counters, or any single number that summarizes a person. [Product Requirements](./01 - Product Requirements.md) lists a universal public reputation score as a non-goal and [Trust, Privacy, and Safety](./04 - Trust Privacy and Safety.md) prohibits a single universal social-credit score; both outrank this document. Trust evidence must always be attributable to a countable fact, and it must not imply guaranteed safety.

### IntentCard

Anatomy:

1. Primitive label and expiry.
2. Intent statement.
3. Essential contextual metadata.
4. `ProvenanceStrip` or `WhyYouSeeThis`.
5. Genuine confirmation or status evidence.
6. One contextual `ResponseCTA`.

Variants: feed, shared-link preview, compact activity, and archived. States: default, pressed, saved, expired, withdrawn, restricted, loading, and offline.

### ProvenanceStrip

Explains the source of trust without exposing private group identity. It uses a trust surface, connection icon, one concise statement, and optional details action.

### WhyYouSeeThis

Required on recommended intents. It must contain a human-readable explanation and a route to preference feedback.

### TrustDistance

Displays descriptive network context such as `One trusted connection` or `Confirmed by three people at the origin`. Avoid ambiguous numeric scores.

Use approximate area language such as `Riverside area`, `Nearby area`, or `Approximate area`. Do not default to precise distance examples.

### ReachSelector

Shows four ordered reach levels, the current level, newly included audience, and privacy impact. Increasing reach requires confirmation. It must not visually shame narrow reach.

### ExpiryIndicator

Uses neutral treatment when distant, warning treatment when action is genuinely time-sensitive, and explicit text when expired. Never use false urgency.

### ResponseCTA

Label is generated from the intent action vocabulary. It is always a verb phrase and remains singular per card.

### RequestCard

Displays respondent identity, contextual trust evidence, qualification, response text, and fixed Accept/Reply/Decline actions. It must not expose unrelated profile data.

### IntentStatusHeader

Shows lifecycle state, expiry, reach, and the next available action. Status is represented with icon, text, and tone.

### ResolutionSheet

Collects resolution outcome and explains whether the outcome affects reliability. It does not celebrate failure states or pressure positive feedback.

### PrivacyDisclosure

Lists fields visible now and fields that will become visible after an action. Used before publish, reach expansion, response, and acceptance.

Preferred privacy copy includes:

- "No exact address or contact details shown."
- "Reach never expands without your action."
- "Hide contact details."

Avoid "Make anonymous" unless a product requirement defines true anonymity.

### EmptyIntentState

States reality plainly and presents a useful next action. It must never include fabricated examples presented as live activity.

## Component State Contract

Every interactive component documents:

- Default.
- Pressed.
- Focused.
- Selected.
- Loading.
- Disabled with reason when useful.
- Error with recovery.
- Offline/queued where applicable.
- Restricted when safety policy applies.

State priority is: disabled, loading, active/pressed, focus, selected, default.

## Iconography And Illustration

- Use rounded outline icons with consistent stroke weight.
- Pair critical privacy and safety icons with labels.
- Use the outward signal-ring motif sparingly for broadcast and reach education.
- Do not use shields or checkmarks in ways that imply guaranteed safety.
- Illustration is reserved for onboarding and meaningful empty states.

## Accessibility

- Normal text contrast: at least 4.5:1.
- Large text and UI component contrast: at least 3:1.
- Visible focus indicator with at least 3:1 contrast.
- Screen-reader labels explain status and action, not visual shape.
- Reading and focus order follows the decision hierarchy.
- Touch targets are at least 44pt on iOS and 48dp on Android.
- Dynamic type must work through the largest supported accessibility size for core flows.

## Figma Organization

```text
00 Foundations
01 Tokens
02 Core Components
03 Nearcast Components
04 Patterns
05 Templates
06 Screens
07 Prototypes
99 Archive
```

Component names use `Category/Component/Variant/State`, for example `Intent/Card/Feed/Default`.

Every screen page must link in its description to this specification, the App Design Foundation, the User Flow, and the Permissions Matrix section it implements.

## Design Review Checklist

- Does the screen serve one primary decision?
- Is reach and privacy impact visible?
- Is the reason for recommendation explained?
- Are all states represented without color alone?
- Does the screen follow the Permissions Matrix?
- Does copy follow the Content Design Guide?
- Is the component already available before creating a new one?
- Does the design work with dynamic type and reduced motion?
- Does trust use the single approved display format?
- Does retry use recovery styling rather than destructive styling?
- Does the screen avoid precise location/distance examples unless required?

## Change Log

| Date | Change |
|---|---|
| 2026-08-25 | Resolved C-03: replaced the numeric `Trust 812` TrustBadge with the contextual-evidence TrustContext component, because Product Requirements and Trust, Privacy, and Safety both prohibit a universal score and outrank this document |
| 2026-08-25 | Resolved C-09: minimum touch target stated as 44pt on iOS and 48dp on Android, matching the App Design Foundation and platform guidance |
| 2026-08-25 | Added approved Trustworthy Native Clarity direction, native semantic token target, adaptive platform mappings, trust display standard, and privacy-safe copy rules |
| 2026-08-24 | Defined tokens, components, motion, accessibility, and Figma governance |
