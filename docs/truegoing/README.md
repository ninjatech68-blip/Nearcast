# TrueGoing Product Redesign

The TrueGoing redesign, based on a review of the MigoMap competitor app. TrueGoing is the final brand name; "Nearcast" was the codename.

## Status

**Scope correction, 2026-09-23 (later the same day).** The product's real codebase is `ninjatech68-blip/mobileapp`, whose `AGENTS.md` designates this repository as read-only design reference and never a source of product rules. Documents `00`–`07` here were written before that repository was available and several of their proposals reverse decisions recorded there. **Use [08 - Handoff to mobileapp](./08%20-%20Handoff%20to%20mobileapp.md)**: it reconciles every item against `mobileapp`'s decision record and says what to add, what needs a decision, and what to drop. Within *this* repository only, this folder still overrides the older Nearcast docs.

The earlier Nearcast documents are kept for history, and each carries a banner:
- **Superseded, do not build from:** `docs/01`, `02`, `03`, `06`, `07`, `08`, `13`, `15`, `16`, `17`, implementation plans `02`–`05`, `DESIGN.md`, `PRODUCT.md`.
- **Partly superseded, still apply where they don't conflict:** `docs/04` (safety principles), `05` (stack and boundaries), `09` (event hygiene), `10` (test approach), `11` (release process), `12` (community policy), `14` (engineering workflow), implementation plan `01` (tooling).

**Active implementation plan:** [07 - P0 Implementation Plan](./07%20-%20P0%20Implementation%20Plan.md).

## Documents

| # | Document | What it is |
|---|---|---|
| 00 | [Superseded - First Analysis and Plan](./00%20-%20Superseded%20-%20First%20Analysis%20and%20Plan.md) | First gap analysis and plan; kept for the record |
| 01 | [Comparison - MigoMap vs TrueGoing](./01%20-%20Comparison%20-%20MigoMap%20vs%20TrueGoing.md) | 30-area comparison with a scorecard |
| 02 | [Comparison - Experience UI Copy Table](./02%20-%20Comparison%20-%20Experience%20UI%20Copy%20Table.md) | Row-by-row comparison of journey, navigation, UI, UX, features, copy and vocabulary |
| 03 | [TrueGoing Reimagined](./03%20-%20TrueGoing%20Reimagined.md) | Product concept, adoption buckets, cold-start strategy, P0–P3 priorities |
| 04 | [Screen Contracts](./04%20-%20Screen%20Contracts.md) | 29 screen contracts plus global, component, routing and acceptance contracts |
| 05 | [Schema and API Specification](./05%20-%20Schema%20and%20API%20Specification.md) | Tables, RLS matrix, algorithms, RPCs, error codes, privacy invariants |
| 06 | [Design Content and Brand Guidelines](./06%20-%20Design%20Content%20and%20Brand%20Guidelines.md) | Brand, colour, type, icons, components and content, marked retain / change / new |
| 07 | [P0 Implementation Plan](./07%20-%20P0%20Implementation%20Plan.md) | Active plan: 16 tasks, dependencies, blockers, exit gate |
| 08 | [Handoff to mobileapp](./08%20-%20Handoff%20to%20mobileapp.md) | What carries over to the real codebase: add / decide / drop, the relevance plan, execution order |
| 09 | [MigoMap Takeaways for Truegoing](./09%20-%20MigoMap%20Takeaways%20for%20Truegoing.md) | 45 takeaways, each marked Built / Add / Decide / Refuse against `mobileapp` |
| 10 | [Screen Review - Truegoing vs MigoMap](./10%20-%20Screen%20Review%20-%20Truegoing%20vs%20MigoMap.md) | 32 screen-by-screen rows with verdicts, a consolidated copy table and an order of work |
| 11 | [Fewer Steps Same Trust](./11%20-%20Fewer%20Steps%20Same%20Trust.md) | Step-count targets for post, join, accept, onboard after user testing; host-opened plans as the one mechanism decision |

`tg-captures-2026-09-23/` holds the *nearcast repo* prototype screens (research only). `tg-real-captures-2026-09-23/` holds the real Truegoing app (`mobileapp` at `d2959d7`, fixture mode) captured from a web dev build; SF Symbols render as letters and the map is stubbed there.

MigoMap screenshots are referenced as SS1–SS38, in the order they were uploaded. They are not stored in the repo.

## Locked decisions

| Date | Decision |
|---|---|
| 2026-09-23 | Brand name: **TrueGoing** |
| 2026-09-23 | Bundle ID: **`com.truegoing.app`** (iOS and Android); dev builds `com.truegoing.app.dev` |
| 2026-09-23 | This folder is the source of truth; older docs marked superseded, not rewritten |
| 2026-09-23 | Vocabulary: plan · ask · offer · host · people going · connection; tabs Nearby · Chats · Post · You |
| 2026-09-23 | Women-only plans: set by, delivered to, and joinable by verified women only |

## Change log

| Date | Change |
|---|---|
| 2026-09-23 | Saved the redesign document set to the repo |
| 2026-09-23 | Became the source of truth |
| 2026-09-23 | Added the P0 implementation plan |
| 2026-09-23 | Scope correction: real codebase is `mobileapp`; added the handoff document |
| 2026-09-23 | Added the MigoMap takeaways for Truegoing |
| 2026-09-23 | Added the screen-by-screen review of the real Truegoing app vs MigoMap, with captures |
| 2026-09-23 | Handoff doc gained the screen work order and the consolidated copy table |
| 2026-09-23 | Added the step-count plan after user testing (`11`) and §5.3 in the handoff |
