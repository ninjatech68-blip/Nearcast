# Nearcast Design System

<!-- impeccable:design-schema 1 -->

## Status

- **Status:** Derived implementation reference. **Not a governing document.**
- **Precedence:** Rank 6.1 — subordinate to [`docs/07 - Design System Specification.md`](docs/07%20-%20Design%20System%20Specification.md) and [`docs/17 - Mobile App Design Foundation.md`](docs/17%20-%20Mobile%20App%20Design%20Foundation.md), which jointly govern all visual and interaction design. Where this file disagrees with either, they win and this file must be corrected in the same change.
- **Last reconciled:** 2026-08-25 against commit `7820a0a`
- **Source boards:** Polished design-system board at [`docs/design/nearcast-design-system-board.png`](docs/design/nearcast-design-system-board.png)

This file translates the governed design documents into a concrete native implementation reference. It does not replace product, privacy, permission, or engineering rules in `docs/`, and it may not introduce product behavior that those documents do not already permit.

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
| `color.status.warning` | `#8A4B00` | Warning status |
| `color.status.danger` | `#A33124` | Error/destructive status |

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

**The governing type scale is the Manrope scale in `docs/07`.** The table below is the native-platform mapping target for a future implementation pass; it does not supersede `docs/07`, and production code currently implements the `docs/07` scale.

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

**The governing shape and motion values are those in `docs/07`** (`radius.card` 16, motion 150/220/320ms), which production code implements. The values below are the native-platform target for a future implementation pass and do not supersede `docs/07`.

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

Primary tab bar has four destinations, matching the governed information architecture in `docs/17` and `docs/03`:

1. `For You`
2. `Broadcast`
3. `Activity`
4. `You`

`Activity` is the operational centre for owned broadcasts, responses, requests, matches, and temporary coordination. Coordination conversations live inside `Activity`; there is no separate chat destination. Search and filtering live inside `For You`.

Rules:

- `Broadcast` is the raised center action.
- Main tab screens show the tab bar.
- Pushed detail and chat screens may hide the tab bar and use native back navigation.
- Headers must be native: large title for top-level screens, compact back header for pushed screens.
- Search and filters belong inside relevant screens unless product requirements explicitly promote them.

## Trust Display

Trust is displayed as factual, contextual evidence. **There is no numeric trust score.**

```text
8 of 9 confirmed interactions were completed
One trusted connection from your network
Confirmed by 3 people at the origin
```

Never render a composite score, `4.7`, `Trust 812`, percentages, ratings, followers, likes, or popularity counters. A universal reputation score is a stated non-goal in `docs/01` and is prohibited by `docs/04`. Trust evidence must trace to a countable fact, must never imply guaranteed safety, and must never be based on fabricated engagement.

## Core Components

### IntentCard

Anatomy, ordered intent-first per Experience Principle 1 in `docs/17`:

1. Primitive label and `ExpiryIndicator`.
2. Intent statement.
3. Essential contextual metadata, approximate area only.
4. `WhyShownChip` or `ProvenanceStrip`.
5. `TrustContext` evidence and genuine confirmation count.
6. One primary contextual action, such as `Offer help`.
7. Optional save action.

Identity appears after the intent, never before it. There is no category pill: `docs/01` is category-agnostic and `docs/07` requires colour to encode state and action rather than content category.

States: default, pressed, focused, saved, loading, empty, restricted, offline, expired, withdrawn, reported.

### TrustContext

Displays factual trust evidence and verification state as text. It is a trust-context component, not a score or popularity badge. It renders only counts that correspond to stored, confirmed records.

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
- Static DS preview: [`docs/design-system-preview/index.html`](docs/design-system-preview/index.html)
- Approved screen board set: generated locally on 2026-08-25 and **not committed**. It therefore carries no authority for anyone but its author. Any board that must inform implementation has to be committed under `docs/design/` first.

## Change Log

| Date | Change |
|---|---|
| 2026-08-25 | Created the native minimal design contract from the approved 2026-08-25 boards |
| 2026-08-25 | Reclassified as a derived, non-governing reference subordinate to `docs/07` and `docs/17` (resolves G-01) and added this change log (resolves G-03) |
| 2026-08-25 | Resolved C-02: replaced the five-destination Home/Explore/Broadcast/Chat/Profile tab bar with the governed four-destination For You/Broadcast/Activity/You architecture |
| 2026-08-25 | Resolved C-03: removed the numeric `Trust 812` display and renamed `TrustBadge` to `TrustContext` |
| 2026-08-25 | Resolved C-04: reordered `IntentCard` intent-first and removed the category pill |
| 2026-08-25 | Resolved C-05 and C-06: marked the native typography, shape, and motion tables as future implementation targets subordinate to `docs/07` |
| 2026-08-25 | Resolved G-06: removed the uncommitted local path previously cited as visual authority |
