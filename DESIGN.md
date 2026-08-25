# Nearcast Design System

<!-- impeccable:design-schema 1 -->

## Status

- **Status:** Approved visual design contract
- **Approved:** 2026-08-25
- **Mode:** Operate
- **Source boards:** Approved Nearcast native screen boards and polished design-system board generated on 2026-08-25
- **Governing docs:** [`docs/17 - Mobile App Design Foundation.md`](docs/17%20-%20Mobile%20App%20Design%20Foundation.md), [`docs/07 - Design System Specification.md`](docs/07%20-%20Design%20System%20Specification.md)

This file captures the approved visual world for Nearcast. It does not replace product, privacy, permission, or engineering rules in `docs/`; it translates the approved visual boards into a durable implementation contract.

## Design Thesis

Nearcast uses **Trustworthy Native Clarity**: a calm, native, privacy-first product language for controlled local intent.

Every screen must answer:

```text
What is this?
Why am I seeing it?
What is safe to do next?
```

The system must feel like a trusted mobile utility with social capability, not a marketplace, chat-first product, social feed, or engagement game.

## Experience Pillars

- **Controlled reach:** users choose who, where, and how far an intent travels.
- **Human reasons:** every delivered or recommended intent exposes a concise, human-readable reason.
- **Progressive disclosure:** sensitive details appear only when they are useful and permitted.
- **Resolution over engagement:** UI rewards resolved intent, not scrolling, likes, followers, or artificial activity.
- **Native trust:** platform conventions should make the app feel familiar before the brand asks for attention.

## Visual Character

- Warm, quiet, spacious, and highly legible.
- Grouped native surfaces rather than web-style card piles.
- Deep green for consent and primary action.
- Navy-blue for provenance, explanation, and information.
- Amber for caution and pending states.
- Coral/red only for danger, reporting, blocking, and destructive meaning.
- No purple default, fake metrics, follower counts, vanity likes, exposed private group names, exact address display, or fabricated activity.

## Semantic Color Tokens

Components must use semantic tokens. Raw hex values belong only in token definitions.

### Light Appearance

| Token | Value | Role |
|---|---:|---|
| `color.background.app` | `#F7F3EA` | Warm app canvas |
| `color.background.surface` | `#FFFFFF` | Cards, sheets, grouped panels |
| `color.background.surfaceMuted` | `#F1F4EC` | Privacy hints and muted groups |
| `color.background.info` | `#EAF2FA` | Provenance and why-shown surfaces |
| `color.background.success` | `#E8F3EC` | Posted, verified, resolved surfaces |
| `color.background.warning` | `#FFF5DF` | Caution, pending, pause surfaces |
| `color.background.danger` | `#FFF0EF` | Report, block, destructive surfaces |
| `color.text.primary` | `#16231F` | Primary text on light surfaces |
| `color.text.secondary` | `#52635D` | Secondary text on light surfaces |
| `color.action.primary` | `#0F5E46` | Consent and primary action |
| `color.action.primaryPressed` | `#0A4936` | Pressed primary action |
| `color.action.secondary` | `#17324D` | Information and provenance action |
| `color.border.subtle` | `#DDD6C8` | Subtle separators and outlines |
| `color.status.info` | `#1E5D8C` | Informational status |
| `color.status.warning` | `#B7791F` | Warning status |
| `color.status.danger` | `#D04A3A` | Error/destructive status |

### Dark Appearance

| Token | Value | Role |
|---|---:|---|
| `color.background.app` | `#0E1714` | Dark app canvas |
| `color.background.surface` | `#15211D` | Dark cards, sheets, grouped panels |
| `color.background.surfaceMuted` | `#1E2B25` | Muted dark groups |
| `color.background.info` | `#142A3A` | Dark provenance surfaces |
| `color.background.success` | `#143025` | Dark success surfaces |
| `color.background.warning` | `#35270F` | Dark warning surfaces |
| `color.background.danger` | `#381B18` | Dark danger surfaces |
| `color.text.primary` | `#F3F7F1` | Primary text on dark surfaces |
| `color.text.secondary` | `#BAC8C0` | Secondary text on dark surfaces |
| `color.action.primary` | `#65D0A1` | Dark primary action |
| `color.action.secondary` | `#8EB8E5` | Dark information/provenance action |
| `color.border.subtle` | `#33443C` | Dark separators and outlines |

### On-Color Tokens

| Token | Light | Dark | Role |
|---|---:|---:|---|
| `color.onPrimary` | `#FFFFFF` | `#062C20` | Text/icons on primary action |
| `color.onInfo` | `#FFFFFF` | `#DCEEFF` | Text/icons on info accents |
| `color.onWarning` | `#2E2100` | `#FFEBC2` | Text/icons on warning surfaces |
| `color.onDanger` | `#FFFFFF` | `#FFD9D4` | Text/icons on danger accents |
| `color.onSurface` | `#16231F` | `#F3F7F1` | Text/icons on default surfaces |
| `color.onSuccess` | `#16231F` | `#D6F5E6` | Text/icons on success surfaces |

## Typography

Use native platform typography while preserving one shared hierarchy.

| Style | Size / line | Weight | Use |
|---|---:|---|---|
| `type.largeTitle` | 34 / 41 | Bold | Top-level native screens |
| `type.screenTitle` | 28 / 34 | Semibold | Screen headers |
| `type.sectionTitle` | 20 / 26 | Semibold | Section headings |
| `type.body` | 16 / 24 | Regular | Primary body copy |
| `type.bodyStrong` | 16 / 24 | Semibold | Emphasis and controls |
| `type.caption` | 13 / 18 | Regular | Supporting copy |
| `type.micro` | 11 / 16 | Medium | Labels and metadata |

Platform mapping:

- **iOS:** SF Pro, SF Symbols, native sheets, native switches, minimum 44pt touch target.
- **Android:** Roboto, Material Symbols, Material tonal surfaces, Material bottom sheets and switches, minimum 48dp touch target.

## Shape, Spacing, Elevation, Motion

| Token | Value | Role |
|---|---:|---|
| `radius.card` | 20 | Intent cards and major grouped panels |
| `radius.row` | 14 | Grouped-list rows and compact cards |
| `radius.button` | 14 | Buttons and text inputs |
| `radius.pill` | 999 | Chips, badges, status pills |
| `space.1` | 4 | Tight metadata |
| `space.2` | 8 | Icon/text pairs |
| `space.3` | 12 | Internal row spacing |
| `space.4` | 16 | Standard component padding |
| `space.5` | 20 | Prominent grouped padding |
| `space.6` | 24 | Section spacing |
| `space.8` | 32 | Large screen separation |

Elevation is capped:

- `elevation.card`: soft native separation only.
- `elevation.broadcast`: raised center tab action only.
- Avoid heavy stacked shadows, decorative glow, or glass effects.

Motion:

- `motion.press`: 120ms.
- `motion.sheet`: 240ms.
- `motion.page`: 300ms.
- Reduced motion replaces large movement with crossfade and immediate state feedback.

## Navigation

Primary tab bar has five destinations:

1. `Home`
2. `Explore`
3. `Broadcast`
4. `Chat`
5. `Profile`

Rules:

- `Broadcast` is the raised center action.
- Main tab screens show the tab bar.
- Pushed detail and chat screens may hide the tab bar and use native back navigation.
- Headers must be native: large title for top-level screens, compact back header for pushed screens.
- Search and filters belong inside relevant screens unless product requirements explicitly promote them.

## Trust Display

Trust display is standardized as:

```text
Trust 812 · High trust
```

Do not mix trust displays such as `4.7`, percentages, ratings, followers, likes, or popularity counters. Trust must not imply guaranteed safety, and it must never be based on fake engagement.

## Core Components

### IntentCard

Anatomy:

1. Broadcaster mini-profile.
2. `TrustBadge`.
3. Approximate area only.
4. Category pill.
5. One-line intent summary.
6. `WhyShownChip`.
7. Primary contextual action, such as `Offer help`.
8. Optional save/bookmark action.

States: default, pressed, focused, saved, loading, empty, restricted, offline, expired, withdrawn, reported.

### TrustBadge

Displays `Trust 812 · High trust` and may include verified signals. It is a trust-context component, not a popularity badge.

### WhyShownChip

Required on delivered or recommended intents. It opens a concise explanation such as:

```text
Shown because: approximate area + public link
```

### PrivacyHint

Used before actions that may reveal information.

Preferred copy:

```text
No exact address or contact details shown.
Reach never expands without your action.
```

### ReachOptionCard

Shows reach choice, who can see the intent, and the privacy consequence. Increasing reach requires explicit consent.

### DeliveryReasonRow

Shows stored delivery reasons in dashboard and detail contexts. Delivery reasons must be human-readable.

### ReviewIntentCard

Previews exactly what others will see before posting. The preview must not show private contact details, exact location, private group names, or hidden identity fields.

### Composer

Uses a visible label, natural-language text area, helper text, character guidance, and a keyboard-safe action bar.

Preferred helper copy:

```text
No exact address or contact details shown.
```

### NativeSheet

Used for focused, reversible decisions: reach selection, offer help, resolve intent, report/block, privacy explanation. Multi-step creation can use a full-screen flow.

### StatePanel

Required states:

- Loading skeleton.
- Empty.
- Offline queued.
- Restricted sign-in.
- Error with retry.
- Success posted.
- Disabled with reason.

Retry is recovery, not destruction. Error text/icons may use danger; retry buttons should use primary or outline recovery styling.

## Component State Contract

Every interactive primitive and Nearcast component must define:

- Default.
- Pressed.
- Focused.
- Disabled.
- Loading.
- Selected.
- Error.
- Offline.
- Success.
- Reduced-motion behavior.

State priority:

```text
disabled > loading > error > offline > pressed > focused > selected > success > default
```

## Privacy-Safe Content Rules

- Use approximate area language such as `Riverside area`, `Approximate area`, or `Nearby area`.
- Avoid precise distance examples as a default design pattern.
- Use `Hide contact details`; do not use `Make anonymous` unless a product requirement defines true anonymity.
- Never expose private circle names or private group membership.
- Never use fake live counts, fake confirmations, fake user activity, likes, followers, or vanity ratings.
- Every recommendation needs a visible or reachable reason.

## Accessibility Contract

- Normal text contrast must meet WCAG AA 4.5:1.
- Large text and meaningful non-text UI must meet at least 3:1.
- Dynamic Type and Android font scaling must not truncate critical trust, privacy, safety, or action copy.
- VoiceOver and TalkBack labels must describe action and state, not just icon shape.
- Touch targets: 44pt minimum on iOS, 48dp minimum on Android.
- Fixed headers, tab bars, sheets, and keyboard-safe CTAs must respect safe areas and IME insets.
- Reduced motion must preserve state feedback without large travel.

## Implementation Guardrails

- The approved design board is visual authority for the first formal implementation pass.
- Existing app tokens may lag this contract until implementation is explicitly requested.
- Prefer semantic tokens over raw values in production code.
- Use platform-native primitives where possible.
- Do not implement web-shaped controls, hover-dependent interactions, or custom navigation that fights platform expectations.
- Do not add a new component if a core component can express the behavior with a documented variant.

## Visual References

- Polished DS board: [`docs/design/nearcast-design-system-board.png`](docs/design/nearcast-design-system-board.png)
- Approved screen board set: `/Users/piyushsharma/.codex/generated_images/01a034a8-69dc-7092-83f5-957e6fab1b03/`
