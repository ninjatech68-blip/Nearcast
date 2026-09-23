# TrueGoing Product Redesign

The TrueGoing redesign, based on a review of the MigoMap competitor app. TrueGoing is the final brand name; "Nearcast" was the codename.

## Status

**Source of truth since 2026-09-23.** This folder overrides every other document in the repo. `AGENTS.md` and `docs/00` point here.

The earlier Nearcast documents are kept for history, and each carries a banner:
- **Superseded, do not build from:** `docs/01`, `02`, `03`, `06`, `07`, `08`, `13`, `15`, `16`, `17`, implementation plans `02`–`05`, `DESIGN.md`, `PRODUCT.md`.
- **Partly superseded, still apply where they don't conflict:** `docs/04` (safety principles), `05` (stack and boundaries), `09` (event hygiene), `10` (test approach), `11` (release process), `12` (community policy), `14` (engineering workflow), implementation plan `01` (tooling).

**There is no active implementation plan yet.** Write the P0 plan from `03` §8 and `05` before building.

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

`tg-captures-2026-09-23/` holds the TrueGoing screens as they were on 2026-09-23, captured from the web build. SF Symbols render as letters there.

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
