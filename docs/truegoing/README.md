# TrueGoing Product Redesign

The TrueGoing redesign, based on a review of the MigoMap competitor app. TrueGoing is the final brand name; "Nearcast" was the codename.

## Status

**Clean slate, 2026-09-24.** The owner reset the concept. [12 - Truegoing Concept](./12%20-%20Truegoing%20Concept.md) is now the foundation; documents `08`–`11` are the record of how it was reached and their `mobileapp` execution notes no longer apply as written. Screens, brand, data rules and the iOS plan will be written against `12`.

**Scope correction, 2026-09-23 (later the same day).** The product's real codebase is `ninjatech68-blip/mobileapp`, whose `AGENTS.md` designates this repository as read-only design reference and never a source of product rules. Documents `00`–`07` here were written before that repository was available and several of their proposals reverse decisions recorded there. **Use [08 - Handoff to mobileapp](./08%20-%20Handoff%20to%20mobileapp.md)**: it reconciles every item against `mobileapp`'s decision record and says what to add, what needs a decision, and what to drop. Within *this* repository only, this folder still overrides the older Nearcast docs.

The earlier Nearcast documents are kept for history, and each carries a banner:
- **Superseded, do not build from:** `docs/01`, `02`, `03`, `06`, `07`, `08`, `13`, `15`, `16`, `17`, implementation plans `02`–`05`, `DESIGN.md`, `PRODUCT.md`.
- **Partly superseded, still apply where they don't conflict:** `docs/04` (safety principles), `05` (stack and boundaries), `09` (event hygiene), `10` (test approach), `11` (release process), `12` (community policy), `14` (engineering workflow), implementation plan `01` (tooling).

**Active plan:** [17 - iOS Build Plan](./17%20-%20iOS%20Build%20Plan.md), built on `12`–`16`. Document `07` is the superseded plan for the old repository.

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
| 11 | [Fewer Steps Same Trust](./11%20-%20Fewer%20Steps%20Same%20Trust.md) | Step-count targets for post, join, accept, onboard after user testing; owner rulings D52–D57 |
| 12 | [Truegoing Concept](./12%20-%20Truegoing%20Concept.md) | **Clean-slate foundation, 2026-09-24.** The promise, the four rules, the loop, discovery, posting, joining, chat, women-only, profile, incentives, platform, brand, absent list, open items |
| 13 | [Feature Inventory](./13%20-%20Feature%20Inventory.md) | Every feature beyond the core loop, each marked V1 / Later / Never with a reason, for the owner to decide (all recommendations accepted 2026-09-24) |
| 14 | [Brand Design and Content Direction](./14%20-%20Brand%20Design%20and%20Content%20Direction.md) | Brand core, voice rules, vocabulary, copy deck, colour and type, icons, components, navigation, motion, six states, accessibility, store, guardrails, enforcement. Copy deck rewritten 2026-09-24 for a first-time user; screens drawn in `visual/truegoing-screens.html`. Accent ruled Ink 2026-09-24, orange kept for the verified tick |
| 15 | [Screen Contracts](./15%20-%20Screen%20Contracts.md) | One contract per V1 screen: shows, does, rules, six states, final copy; acceptance criteria |
| 16 | [Data Rules](./16%20-%20Data%20Rules.md) | Laws L1–L22 (carried and new), tables, transitions, reads, the permission matrix, 18 denied-path tests, retention, payload hygiene, port plan from the previous database |
| 17 | [iOS Build Plan](./17%20-%20iOS%20Build%20Plan.md) | Stack, eight milestones with contracts, laws and exit tests, dependency order, definition of done, risks, what the owner does next |

`tg-captures-2026-09-23/` holds the *nearcast repo* prototype screens (research only). `tg-real-captures-2026-09-23/` holds the real Truegoing app (`mobileapp` at `d2959d7`, fixture mode) captured from a web dev build; SF Symbols render as letters and the map is stubbed there.

MigoMap screenshots are referenced as SS1–SS38, in the order they were uploaded. They are not stored in the repo.

## Locked decisions

| Date | Decision |
|---|---|
| 2026-09-23 | Brand name: **TrueGoing** |
| 2026-09-23 | Bundle ID: **`com.truegoing.app`** (iOS and Android); dev builds `com.truegoing.app.dev` |
| 2026-09-23 | This folder is the source of truth; older docs marked superseded, not rewritten |
| 2026-09-23 | Vocabulary: plan · ask · offer · host · people going · connection; tabs Nearby · Chats · Post · You |
| 2026-09-23 | Women-only plans: set by, delivered to, and joinable by verified women only (superseded 2026-09-24 by `12 §9`: self-declared, host-controlled, one strike) |
| 2026-09-24 | Platform: iOS 17 minimum, Liquid Glass on iOS 26+ with system fallback, Apple Maps via MapKit, no third-party map SDK |
| 2026-09-24 | Development sign-in uses a static code, guarded so a release build refuses it; SMS provider deferred to before TestFlight |
| 2026-09-24 | First city: Panchkula |
| 2026-09-24 | Look and feel: Airbnb-like. White surfaces, soft shadows, 20/28-point rounding, category row of 3D plan icons, search pill; 3D icons to be commissioned or licensed, placeholders until then |
| 2026-09-24 | Colour: Airbnb's roles (text `#222222`, muted `#717171`, line `#DDDDDD`, white surfaces, black secondary) with Truegoing coral `#FF5C39` in the brand slot on a gradient primary button and the tick. Supersedes the Ink ruling of the same day |
| 2026-09-24 | Voice: Airbnb's register (warm, direct, second person, sentence case, no exclamation marks) plus Truegoing's disclosure line on every action that touches a person |
| 2026-09-24 | Filter sheet with live count and illustrated empty states adopted from Airbnb (`15` B6, B2) |
| 2026-09-23 | Plans are browsable on a map at their coarse (~1 km) point; exact place still hidden until acceptance; people never on the map; host toggle `Show on the map` default on (`11 §11`, D53 draft for `mobileapp`) |
| 2026-09-23 | One group thread per plan for the host and accepted people only; pair threads retained; a block makes the blocker leave the plan (`11 §12`, D54 draft for `mobileapp`) |
| 2026-09-23 | Optional Instagram handle, owner-only in storage, shown only after acceptance on a live plan, never on the caster profile (`11 §13`, D55 draft for `mobileapp`) |
| 2026-09-23 | Sign in with Apple or Google, name prefilled; phone code still required to be verified, ask or post (`11 §14`, D56 draft) |
| 2026-09-23 | Map markers show the plan's icon in its category colour, never a person's photo (`11 §15`, amends D53) |
| 2026-09-23 | Each plan gets a drawn icon suggested from its words and confirmed by the person (`11 §16`, D57 draft) |

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
| 2026-09-24 | Clean-slate concept written after the owner Q&A (`12`); it supersedes the execution notes in `08`–`11` |
| 2026-09-24 | Women-only ruled as recommended; launch approach recorded (available everywhere, seeded in one city); feature inventory added (`13`) |
| 2026-09-24 | Feature inventory accepted as recommended; brand, design and content direction added (`14`) |
| 2026-09-24 | Visual review page of the twelve first-version screens; copy deck in `14` rewritten to match |
| 2026-09-24 | Accent ruled Ink; doc 14 colour section rewritten; screen contracts added (`15`) |
| 2026-09-24 | Data rules added (`16`) |
| 2026-09-24 | iOS build plan added (`17`); it is now the active plan |
| 2026-09-24 | Owner ruled: iOS 17 minimum with Liquid Glass on iOS 26+ and the system fallback below; Apple Maps for all maps. `17` and `14` updated |
| 2026-09-24 | Owner answers recorded: static development code, Panchkula, icon approach, defaults accepted |
| 2026-09-24 | Owner ruled the assistant builds everything, with the owner running Mac-only steps; 85-icon set generated in `visual/icons/` and shown on the visual page |
| 2026-09-24 | Icons redrawn in an Airbnb-like outline style; one repository `truegoing` ruled instead of two; owner confirmed Mac and developer account |
| 2026-09-24 | Owner ruled an Airbnb-like look with 3D plan icons; `14 §4` rewritten, visual page restyled, placeholder 3D tiles in `visual/icons-3d/` |
| 2026-09-24 | Owner ruled "as close to Airbnb as legally sensible": colour roles, register, filter sheet, illustrations; coral hue kept distinct from Rausch on purpose |
