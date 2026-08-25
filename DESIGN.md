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
| `color.border.focus` | `#17324D` | Focus indicator, reusing the provenance action colour |
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
| `color.action.primaryPressed` | `#8ADDB8` | Pressed dark primary action |
| `color.action.secondary` | `#8EB8E5` | Dark information/provenance action |
| `color.border.subtle` | `#33443C` | Dark separators and outlines |
| `color.border.focus` | `#8EB8E5` | Dark focus indicator, reusing the provenance action colour |
| `color.status.info` | `#8EB8E5` | Dark informational status |
| `color.status.warning` | `#FFE2A7` | Dark warning status |
| `color.status.danger` | `#FFD9D4` | Dark error/destructive status |

The pressed, focus, and status rows complete the dark appearance so that the
component state contract below can be honoured in both appearances. Their values
are taken from the approved static preview in `docs/design-system-preview/`,
which already carried them; note that the dark appearance brightens the pressed
primary action rather than darkening it.

### Fill Rule

Only the primary action is filled. Every other accent — info, success, warning,
danger, neutral — is a tinted surface carrying a status or action foreground, in
both appearances. Destructive actions are outlined in danger rather than filled,
so destructive meaning never carries the visual weight of consent.

Two on-colour tokens have no consumer under this rule: `color.onInfo` and
`color.onDanger` describe type on a filled info or danger accent, and no approved
treatment fills either. They are retained for a future filled variant and are
excluded from the automated contrast checks, which have no surface to measure
them against. Resolving them one way or the other is open for the design owner.

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
- The `Home` tab's screen title is `For You` (the finite, relevant intent feed named in `docs/03 - User Journeys and Flows.md`); the tab label stays `Home`.
- Main tab screens show the tab bar.
- Pushed detail and chat screens may hide the tab bar and use native back navigation.
- Headers must be native: large title for top-level screens, compact back header for pushed screens.
- Search and filters belong inside relevant screens unless product requirements explicitly promote them.

## Trust Display

Trust display is standardized as a factual trust-context line:

```text
One trusted connection from your network
8 of 9 confirmed interactions were completed
```

A single universal trust number or band (`Trust 812 · High trust`) is
forbidden: `docs/04 - Trust Privacy and Safety.md` rules out a single
universal social-credit score and trust badges that resemble guarantees, and
`docs/08 - Writing and Content Guide.md` requires trust context — evidence
relevant to the decision — over a trust score. Do not mix trust displays such
as `4.7`, percentages, ratings, followers, likes, or popularity counters.
Trust must not imply guaranteed safety, and it must never be based on fake
engagement.

## Core Components

### IntentCard

Anatomy:

1. Broadcaster mini-profile.
2. `TrustBadge`.
3. Approximate area only.
4. Category pill.
5. One-line intent summary.
6. `WhyShownChip`.

The whole card is one tap target that opens intent detail. Feed cards carry no
commitment action: committing (offer help, request to join) happens on the
detail screen, where the full context is visible. Detail contexts may render a
primary contextual action and a save/bookmark affordance — exactly one save
affordance per screen.

States: default, pressed, focused, saved, loading, empty, restricted, offline, expired, withdrawn, reported.

### TrustBadge

Displays a factual trust-context line, such as `8 of 9 confirmed interactions
were completed`, and may include verified signals phrased with the
non-guarantee caveat (`Phone verified. Verification does not guarantee
safety.`). It is a trust-context component, not a score or popularity badge.
It renders on the muted neutral surface so it reads as context; the success
tint is reserved for confirmations (posted, verified, resolved).

### WhyShownChip

Required on delivered or recommended intents. Rendered inline, the reason is a
caption-size line — never micro type, because the delivery reason is
trust-critical copy and must survive font scaling. The pill treatment is
reserved for the tappable `Why shown` affordance, which opens a concise
explanation such as:

```text
Shown because: approximate area + public link
```

The opened explanation must include a feedback action (per
`docs/15 - Mobile Screen Contracts.md`, `WhyYouSeeThis` requires both the
rendered explanation and a way to say the reason is wrong).

### PrivacyHint

Used before actions that may reveal information.

Preferred copy:

```text
No exact address or contact details shown.
Reach never expands without your action.
```

### ReachOptionCard

Shows reach choice, who can see the intent, and the privacy consequence. Increasing reach requires explicit consent.

Reach selection is a sheet decision (see `NativeSheet`), never an inline block
on the review screen: the sheet presents all four ordered reach levels, the
newly included audience for each step, and the disclosure delta — what becomes
visible that is not visible now (per `docs/15 - Mobile Screen Contracts.md`).
The review screen shows the current choice as a single row that opens the
sheet.

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
- App tokens implement this contract in `src/design-system/tokens.ts`; the contract is the authority and the tokens follow it.
- Prefer semantic tokens over raw values in production code.
- Use platform-native primitives where possible.
- Do not implement web-shaped controls, hover-dependent interactions, or custom navigation that fights platform expectations.
- Do not add a new component if a core component can express the behavior with a documented variant.

## Implementation

| Contract area | Implementation |
|---|---|
| Semantic colour, type, shape, spacing, motion, elevation | [`src/design-system/tokens.ts`](src/design-system/tokens.ts), mirrored for tooling in [`src/design-system/tokens.json`](src/design-system/tokens.json) |
| Light/dark accent recipes | [`src/design-system/accents.ts`](src/design-system/accents.ts) |
| Component state contract and priority | [`src/design-system/state.ts`](src/design-system/state.ts) |
| Trust display | [`src/design-system/trust.ts`](src/design-system/trust.ts) |
| Privacy-safe content rules | [`src/design-system/privacy.ts`](src/design-system/privacy.ts) |
| Core components | [`src/design-system/components/`](src/design-system/components) |

Typography follows the platform mapping above: components and screens apply
the shared size and weight hierarchy and inherit the native system face (SF
Pro on iOS, Roboto on Android). No custom font family is bundled or loaded.
Screens resolve their palette through `useColors()`/`useThemedStyles()` from
[`src/design-system/appearance.tsx`](src/design-system/appearance.tsx), so both
appearances render from the same code; automated checks refuse a hardcoded
light or dark palette reference and any `fontFamily` outside the design system.

## Visual References

- Polished DS board: [`docs/design/nearcast-design-system-board.png`](docs/design/nearcast-design-system-board.png)
- Static DS preview: [`docs/design-system-preview/index.html`](docs/design-system-preview/index.html)
- Approved screen board set: `/Users/piyushsharma/.codex/generated_images/01a034a8-69dc-7092-83f5-957e6fab1b03/`
