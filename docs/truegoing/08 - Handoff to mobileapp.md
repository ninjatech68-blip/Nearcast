# Handoff: what carries over to `ninjatech68-blip/mobileapp`

**Written 2026-09-23** after reading `mobileapp` at `d2959d7` (`main`). Read-only; nothing in `mobileapp` was changed.

**Who this is for:** the owner, executing in a session opened on `mobileapp`. Every item below is checked against that repo's `docs/01 - Decisions.md`, `AGENTS.md`, `docs/PRODUCT_PRINCIPLES.md`, `docs/BRAND.md`, `docs/FINDINGS_REGISTER.md` and the code. Items are marked:

- **ADD** — additive; no recorded decision is touched. Can be executed after a failing test, per `mobileapp/AGENTS.md`.
- **DECIDE** — touches or reverses a recorded decision. Needs an entry in `01 - Decisions.md` arguing against the original reasoning *before* code.
- **DROP** — conflicts with a settled decision or the "deliberately absent" list, or is already built.

Tags: **[Certain]** verified in `mobileapp` code or docs (file:line) · **[Likely]** inference · **[Guessing]** gap.

---

## 0. Three facts that come before any of it

1. **Nobody can sign in.** [Certain] `sms-hook` refuses every number without a fixed test code (BE-01, S1, deferred by D36; `docs/COMPETITIVE_RESPONSE_2026-09-22.md` §0 says the same). Every item below is worth less than an SMS provider. D36 makes engineering not wait for it; that is the owner's call, but the ranking still holds.

2. **The clutter you describe is not caused by the feed's shape.** [Certain] The feed is already one cast per viewport with vertical snap (`app/src/features/casts/feed-page.tsx:60-64, 307-318`), and delivery already requires all three of: reader within a cast's radius, cast category in the reader's interests, reader verified (`private.casts_for_person`, `supabase/migrations/…qa_scalability_queries.sql:41-90`). What produces clutter is:
   - **A 20 km radius fixed for every cast** (D28). Panchkula to Chandigarh is under 10 km, so every cast in the Tricity reaches everyone in it. [Likely] This is the single biggest source of irrelevance.
   - **Six coarse categories** as the only interest match (D48 kept the six; `LEGACY_CATEGORY` folds the retired four). "sports" matches badminton and cricket alike.
   - **No ranking.** `my_feed` orders by `delivered_at desc` (`area_labels.sql:192-231`); PRD-02 "trust not used in delivery or order" is OPEN.
   - **No default time lens.** Everything up to expiry shows; the lens (`app/filter.tsx`) is session-only.

3. **"Only verified profiles" is already enforced, and the badge is broken.** [Certain] `publish_cast` runs through `private.assert_actor()`, which requires `is_verified`, so every caster is verified by construction. But the client badge `isVerified(byId)` always returns `false` when a backend is configured, because `get_public_profile` doesn't expose verification (`app/src/features/casts/faces.ts:29-55`). The badge is dead UI, not a missing gate. Also: "verified" in this product means phone OTP (D8, D19). It does not mean a selfie or an ID.

---

## 1. The relevance problem: what to change, in order

All of these keep the laws: no person coordinate, reason stored at delivery time, reach never widened without an explicit action, no fabricated counts.

| # | Change | Status | Why it's allowed | Where |
|---|---|---|---|---|
| R1 | **Reader-side hearing radius.** A `person_settings.hear_radius_m` (2 000–20 000, default to decide, I'd start at 5 000), applied in `casts_for_person` as `least(cast radius, reader radius)`. Existing deliveries outside the new radius are hidden, not deleted. | **DECIDE** (new decision; not a reversal) | D28 fixes the *caster's* reach and forbids offering it to the caster. D4 says an area means "where I want to hear about things", which is the reader's side. Narrowing what a reader hears never widens reach. The reader must be told the cast still reaches 20 km. | `person_settings` (venue_offers.sql:113), `casts_for_person`, settings screen, a `laws` assertion that the reader radius can only narrow. |
| R2 | **Default time lens = "this week", with "today" one tap away.** The lens already exists client-side (`store.ts:464-494`). Make the default not "everything". | **ADD** | The lens is a session filter with an honest count (Principle 46-56). Changing its default changes no delivery. | `app/filter.tsx`, `store.ts`, `feed-page.tsx`. Keep the honest count of what the lens hides. |
| R3 | **Transparent ordering, not recommendation.** Order the feed by a fixed, published rule: happening soonest first, then nearest, then caster's settled receipts as a tiebreak. Show the ordering rule in the lens sheet in one sentence. | **DECIDE** | "Algorithmic recommendation" is on the absent list. A fixed sort with a stated rule and no per-person learning is not that, but the decision must say so explicitly and PRD-02 must be cited. | `my_feed` order clause; lens copy. |
| R4 | **Interest granularity.** Sub-interests under the six categories (badminton under sports), matched at delivery. | **DECIDE** (reversal of the ten→six narrowing; = Tier B1 in the competitive response) | `COMPETITIVE_RESPONSE` §3 says B1 "needs users to know". I agree with that ordering: don't do this before real people cast. | Later. |
| R5 | **Fix the verified mark.** Either expose a boolean `caster_verified` in `my_feed`/`get_public_profile` (it is always true for casters, so it leaks nothing) or remove the mark. Don't ship a mark that can never light up. | **ADD** | Casters are verified by construction; publishing the fact discloses nothing new. Check SEC-05 (profile oracle) before adding any field to `get_public_profile`. | `faces.ts`, `my_feed`, `get_public_profile`. |
| R6 | **"Not interested" that learns nothing but hides forever.** Already `hide_cast` with `not_relevant` feedback. Keep it; do not build a learning ranker from it (absent list). | **DROP** (already built) | — | — |
| R7 | **Daily feed budget** (show at most N casts/day). | **DROP** | Hides real casts behind a number; conflicts with "empty is not failure" and honest counts. R1–R3 solve the same problem without hiding anything. | — |

**Do R1 + R2 + R5 first.** R1 is the one that matters and it needs a short decision entry. Suggested wording for the decision, in the repo's format:

> **D51 — A reader may narrow what they hear.** `person_settings.hear_radius_m`, 2–20 km, default 5 km. Applied in `casts_for_person` as the smaller of the cast's radius and the reader's. Casts already delivered outside it are hidden, never deleted. This changes nothing about a caster's reach (D28 stands; casters are still told "every cast reaches 20 km"). It changes only which of the casts that reach me I hear about. Law: a reader radius may only be *smaller* than the cast's; asserted in `laws.test.sql`.

---

## 2. What from the TrueGoing work carries over

My earlier documents (`docs/truegoing/00`–`07` in `ninjatech68-blip/nearcast`) were written against the wrong repository. Here is what survives contact with `mobileapp`.

### 2.1 ADD — additive, execute after a failing test

| Item | From | Fits because | Where in `mobileapp` |
|---|---|---|---|
| **Meetup mode**: one hour before `happens_at`, for the caster and accepted joiner only: the place (already gated by `may_see_place`), directions, a "tell someone" SMS composed by the OS (never sent by the app), an "I'm here" tap, and "leave / call". | `04` S17 | SEC-14 "no mid-meeting safety affordance" is OPEN. The place reveal already exists (D17, D42); this is the surface around it. No coordinate about a person is stored. | `app/src/app/plan/[id]` or a new `meetup/[id]`; no schema change except an optional `checked_in_at` on `plan_receipts` if wanted. |
| **Push for "a new cast near you matches your interests"**, honouring quiet hours only if quiet hours exist (they were removed: "a control the app cannot honour is worse than a missing one"). | `07` T10 | PRD-05 "nothing brings people back; push is only reactive" is OPEN. Payload rule already exists (no text, coordinates or names). | `notification_outbox` on delivery insert; `send-push`. Rate-limit per reader per day. |
| **"Not available" is one state for every cause.** | `04` §A.4 | Already the server's behaviour: blocked pair and missing delivery both return `cast_not_found` (`request_to_join`). Confirm the client renders one identical screen. | `app/src/app/cast/[id].tsx` error path. |
| **Relative-time wording** on posters ("in 20 min", "tonight 8 pm", "tomorrow 7:30 am", "Sat 6 pm") with fixed month names (the `en-GB` locale renders "Sept"). | `Nearcast` `src/features/plans/domain/relativeTime.ts` | Pure function, 12 tests. Check `copy.test.ts` for em-dash and casing rules before pasting strings. | `app/src/features/casts/domain/`. |
| **Store-review prompt only after a settled receipt.** | `06` §3.2 | The competitive response §3 Tier D proposes exactly this for the absent list. | Add to "deliberately absent": "a rating prompt before a settled receipt". |
| **Mutation checks on privacy rules** (break the rule on purpose, confirm the suite fails, paste the red output). | `07` T1, T3 | Already D35 policy in `mobileapp`. Nothing to add; keep doing it. | — |

### 2.2 DECIDE — needs a decision entry first

| Item | From | Decision it touches |
|---|---|---|
| R1 reader hearing radius | this doc §1 | New (D51 draft above). |
| R3 transparent ordering | this doc §1 | Absent-list item "algorithmic recommendation"; PRD-02. |
| **Women-only casts** (host and joiners must be verified women). | `04` S13, `05` | `mobileapp` collects no gender. Adding it is a new sensitive field under DPDP (see `AGE_POLICY.md` for the regime), a new law, and a new oracle surface. Real safety value, real cost. Not before users. |
| **Sub-interests** (R4) | this doc §1 | The ten→six narrowing (B1). Needs users. |

### 2.3 DROP — conflicts with settled decisions, or already built

| Item from my work | Why it's dropped |
|---|---|
| One-tap "I'm in" | Rejected in `COMPETITIVE_RESPONSE_2026-09-22.md` Tier D ("one-tap join without approval") as a consequence of the consent model. Join is "Ask to go" with a required note and caster acceptance (D5, Principle 28, `join/[id].tsx:149`). This is the product's consent model, not friction to remove. |
| "N going" avatar stacks, group attendance | Slots are hidden (D29); no headcount is shown; `taken` exists in `my_feed` but the product deliberately doesn't display a crowd. Popularity counts are absent by decision. |
| Per-plan group chat | Absent by decision (D2). Pair threads only; a one-way caster note (D46) covers the broadcast case. |
| Reach dial (Friends / Friends of friends / Nearby / Anyone in city) | Reach is fixed at 20 km and disclosed, never offered (D28). Circles are dormant (D31). A reader-side radius (R1) is the compatible version of this idea. |
| Map of plans as the home screen; 4 tabs Nearby/Chats/Post/You | Navigation is settled: three pages near/Activity/Profile with a floating Create (D26, D41). A cast map exists behind a toggle and D45 rules what it may show. Brand says "Not a map. Not a feed." |
| Selfie verification, "Verified" badge as a trust tier | Verified = phone OTP (D8, D19). No selfie or ID. Fix the dead badge instead (R5). |
| "Showed up ×n", vouches | Already exist as receipts (D7) and vouches (D10, retired to dormant by D31). Reliability is the profile's trust standing. |
| "a few" for counts under 5 | Conflicts with "spoken labels never round a count" (DESIGN_SYSTEM.md:161-173) and "the filter is a session lens with an honest count". `mobileapp` shows a real count or nothing. |
| Heading to / trips | "multi-city discovery" is absent by decision. |
| Dark mode, category tints, green palette, Manrope, my icon map, my components | Brand is settled: Go Orange `#FF4D1D`, Warm Cream `#FFF4DE`, Ink Black `#11100C`, Bricolage Grotesque + IBM Plex Mono (D48, D50). Light only (D34). My design system is for a different product. |
| My schema (`plans`, `plan_deliveries`, …) and migration | `mobileapp` has 59 migrations, 36 pgTAP files, ≈731 assertions and laws L1–L14. My 22-table foundation is a parallel design; discard it. |
| My screen contracts and P0 plan | Written for a product with one-tap join, group chat and a reach dial. Not applicable as documents. Individual ideas are listed above. |
| Bundle ID `com.truegoing.app` | D48 (amended) keeps `com.piyushsharma.nearcast` and `nearcast://` on purpose to avoid a provisioning, Maps-console and Supabase round-trip. Do not change it. |
| "Plan / ask / offer" vocabulary, tabs "Nearby · Chats · Post · You" | D38 and D48 settle vocabulary: the app is Truegoing, a cast is a **plan** in every string, destinations are near / Activity / Profile / Create. |

---

## 3. Rules and guidelines from my work, deduplicated against `mobileapp`

`mobileapp/AGENTS.md`, `PLAYBOOK.md` and the decision record already cover almost everything I wrote, and are stricter in places (derivation order decision → law → assertion → schema; D35 proving grep and mutation evidence; clients hold SELECT + EXECUTE only; no granted function may name another person). The few rules of mine that are not already written down there:

1. **Every "unavailable" outcome renders one identical screen** regardless of cause (blocked, hidden, expired, out of reach), on the client as well as the server. [Certain] the server already collapses causes into `cast_not_found`; make the client's copy and layout match for every path.
2. **Icons never carry meaning alone; every icon-only control has an accessibility label; decorative icons are hidden from screen readers.** `mobileapp` already says "colour is never the only carrier" and "icons only where a word will not fit"; this adds the screen-reader half.
3. **Relative time uses fixed English month and weekday names** until localisation, because device locale data varies.
4. **Any estimate shown to a user is prefixed "≈" and computed server-side**; if it can't be computed, the UI says "unavailable", never a placeholder number. (`mobileapp` already forbids fabricated quantities; this covers the estimate case.)
5. **Push payloads carry IDs and a type only; text is composed on device after an authorization re-check**, so a payload for a cast you can no longer see lands on the "unavailable" screen, not a blank.
6. **Seed data must be labelled or impossible to mistake for real.** [Certain] `scripts/seed-panchkula.sh` creates ten realistic people with ordinary casts and no marker; the only guard is the dev-project ref check. Either name them unmistakably ("Demo Host") or add a `seeded` flag the client renders. This matters because "never fabricate activity" is the first non-negotiable, and seeded casts on a real device are indistinguishable from real ones.

---

## 4. Findings in `mobileapp` I'd raise in priority, having read it

These are already in `FINDINGS_REGISTER.md`; I'm only saying which ones bear on the relevance problem and on trust.

- **PRD-02** trust not used in delivery or order → R3.
- **PRD-05** only reactive push → §2.1 push item.
- **SEC-12** `may_see_place` never revoked: an accepted joiner who is later blocked or whose request is withdrawn keeps the exact place. This undermines the reveal-on-acceptance promise; fix before any external tester.
- **SEC-05 / SEC-06** oracles via `get_public_profile` / `related_to`: check before R5 adds any field.
- **UX-07** a joiner cannot leave a plan.
- **REL-02** `TEST_SIGNIN` readable in release builds.
- **Stale docs:** `FEATURES.md` still lists vouch, circles, "casting radius pre-chosen" and "cast button top-right", contradicting D31, D28, D26. `BACKEND.md`/`README.md` say 131 assertions; the suite is ≈731. `FINDINGS_REGISTER` verdicts date from 2026-09-08 and were not all written back (BE-15 says `config.toml` is missing; it exists).

---

## 5. What to execute, in order, in the `mobileapp` window

Each step follows `mobileapp/AGENTS.md`: decision → law → failing assertion → code → mutation check → `./scripts/verify-all.sh` green with output recorded.

1. **Owner:** procure the SMS provider (BE-01). Nothing else produces a user.
2. **Decision D51** (reader hearing radius) in `docs/01 - Decisions.md`, then: law assertion in `supabase/tests/database/laws.test.sql` (reader radius only narrows), `person_settings.hear_radius_m`, `casts_for_person`, a Settings row with the disclosure sentence, `db-local.sh contract` and `types`.
3. **R2** default lens "this week" with honest hidden count (client only).
4. **R5** fix or remove the dead verified mark, after checking SEC-05.
5. **SEC-12** revoke `may_see_place` on block, withdrawal and decline; assertion first.
6. **Meetup mode** (SEC-14) and **proactive push** (PRD-05), each as its own failing test first.
7. **Decision R3** (transparent ordering), then `my_feed` order clause and lens copy.
8. **Seed labelling** (§3.6) before any device demo to a stranger.
9. **Doc drift:** update `FEATURES.md`, `BACKEND.md`, `README.md` test counts, and re-verify stale `FINDINGS_REGISTER` rows. Don't rewrite dated docs.
10. **Hold** R4 (sub-interests) and women-only casts until there are users to learn from.

### 5.1 Screen work from the review in `10`, in order

Runs alongside the list above; it is client-only except where noted. Steps that already appear above are cross-referenced, not repeated. Evidence and per-screen reasoning are in [`10 - Screen Review - Truegoing vs MigoMap`](./10%20-%20Screen%20Review%20-%20Truegoing%20vs%20MigoMap.md).

1. **Sign-in provider** = step 1 above. Everything in this list is invisible until it ships.
2. **Start time on poster and detail.** Today only expiry renders (`remote.ts:238` maps `expires_at` through `expiryLabel`; nothing renders `happens_at`). One pure formatter with fixed English day names (§3), failing test first; poster shows `Thu 7pm` / `Today 7pm`, host's own poster keeps `Ends`.
3. **Verified mark wired to `is_verified`** = R5, step 4 above.
4. **Default lens `This week`, persisted, shown as a chip on the feed header** = R2, step 3 above. Lens exit word becomes `Done`.
5. **Activity:** replace the duplicated tab-plus-chips with three sentence-case tabs `Needs you · Waiting · Your plans`; add a visible `Withdraw` / `Cancel plan` quiet action beside the long-press (`alerts-page.tsx:332-354`); stamps `REVIEW` and `CONFIRM ATTENDANCE` become sentence-case `See request` and `Did it happen?`.
6. **Profile:** a `What hosts see` card first (name, area, reliability bars, plans completed and no-shows, interests), utility rows below, `Blocked` under Settings.
7. **Copy table §5.2** in one commit, with `copy.test.ts` extended to the new strings and the casing exception written into `DESIGN_SYSTEM.md`.
8. **Decide** before touching: sub-interests (R4), whether the Map toggle stays on the feed header (D45), and how reach is disclosed when seeded rows carry `radius_m = 2000` while new casts are fixed at 20 000 (`geo.ts:21`).

### 5.2 Copy changes, consolidated

All lines follow `DESIGN_SYSTEM.md` voice rules: sentence case, no exclamation marks, no emoji, no em dashes, exit words from its table (`Done` nothing lost · `Never mind` something discarded · `Back` previous step kept). Cited rows are in `10 §1`.

| Where | Today | Proposed | Why | Row |
|---|---|---|---|---|
| Sign in | field only | `We text a code. Your number is never shown to anyone.` | State the fact | 1 |
| Area picker title, from compose | `HOME AREA` | `Where is the plan?` | Wrong context | 4, 31 |
| Area picker | `Via geocode (limited)` | remove | Developer note leaking | 31 |
| Poster fact line | `Panchkula Sector 5 · 3 vouches · Ends 10pm` | `Panchkula Sector 5 · ≈3 km · Thu 7pm` | Start beats expiry; vouches dormant (D31); approximate distance is allowed | 8, 10 |
| Poster host line | `✓ aarav` | `✓ Aarav` | One casing across poster and detail | 9 |
| Poster why line | `Why: one trusted link away · you're into sports ›` | `Why: near you · into sports ›` | Only reasons the delivery actually used | 11 |
| Own poster | `See who's asked` | `2 asked ›` / `Nobody asked yet` | Real count, host only | 13 |
| Not interested | silent | toast `Hidden. Fewer plans like this.` | Make the feedback loop visible | 12 |
| Lens exit | `Close` | `Done` | Exit-word table | 15 |
| Lens default | none, resets on leave | `This week` chip on the header | R2 | 15 |
| Detail host row | `31 plans completed · 0 no-sho…` | two lines: `31 plans completed` / `0 no-shows` | Trust facts never clip | 17 |
| Join sheet | three paragraphs | `Aarav sees your first name and this note, nothing else, until they accept.` / `Aarav decides. Yes opens the chat here. No answer means no.` / `First time meeting? Choose a public place.` | Fewer words above a disabled button | 18 |
| Request sent | `We'll notify you here.` | from `sentNoteFor()` | Never promise a notification that cannot arrive | 19 |
| Caster profile | `in your circle`, `vouched by 2 people you trust` | remove while circles are dormant | A dormant system should not speak (D31) | 20 |
| Activity chips | `NEEDS YOU 3 · YOUR PLANS 1` (+ `WAITING`) | tabs `Needs you · Waiting · Your plans` | Truncation at 390 pt; duplicate of the tab | 21 |
| Activity stamps | `REVIEW`, `CONFIRM ATTENDANCE` | `See request`, `Did it happen?` | Sentence-case CTAs; width | 22 |
| Activity caption | `· Long-press to withdraw` / `· Long-press to cancel` | visible `Withdraw` / `Cancel plan` quiet action; caption removed | Hidden affordance | 23 |
| Profile | utility rows only | `What hosts see` card first | A profile, not a settings list | 26 |
| Profile nudge | none | `Add a photo so hosts can recognise you.` only when missing | Small, no ring, no percentage | 27 |
| Settings row | `Paid suggestions` | `Venue suggestions` · `Venues can pay to suggest a place. Never people.` | Reads as a paywall | 28 |
| Compose 1 chips | `sports + outdoors` mono lowercase | `Sports + outdoors` sentence case | Wraps to three rows at 390 pt | 29 |
| Compose 2 heading | `choose who this can reach` | `Where and when` | Reach is not a choice (D28) | 30 |

**Casing rule to settle once.** `DESIGN_SYSTEM.md:233` says sentence case for titles, headings, labels and CTAs, yet uppercase mono is used for eyebrows (`SPORTS + OUTDOORS`), chips (`NEEDS YOU`), stamps (`LIVE`, `REVIEW`) and section labels (`WHAT KIND OF PLAN?`). Write the exception down: uppercase mono for one-word stamps and category eyebrows only; everything tappable is sentence case.

---

## 6. Disposition of the `nearcast` repository work

`mobileapp/AGENTS.md:18-22` designates the `ninjatech68-blip/Nearcast` repo as read-only design reference, never a source of product rules. Everything I committed there on `claude/practical-pasteur-vg33rh` (docs `00`–`07`, the T0–T3 code) is therefore research material, not policy. The branch is left as is; its `README` in `docs/truegoing/` now says so. Nothing from it should be merged into `mobileapp` as-is; use the tables above.

## Change log

| Date | Change |
|---|---|
| 2026-09-23 | Created after reading `mobileapp` at `d2959d7`; reconciled every TrueGoing item against its decision record |
| 2026-09-23 | Added §5.1 screen work order and §5.2 consolidated copy table from the screen review (`10`) |
