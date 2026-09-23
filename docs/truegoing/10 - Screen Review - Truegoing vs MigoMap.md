# 10 - Screen Review: Truegoing vs MigoMap

**Written 2026-09-23.** A screen-by-screen review of the real Truegoing app (`ninjatech68-blip/mobileapp`, `main` at `d2959d7`, fixture data mode, web dev build) against the 38 MigoMap screenshots (SS1–SS38, upload order). Each row says what Truegoing shows today, what MigoMap does, which is better, and what to change. Every proposal is checked against `mobileapp/docs/DESIGN_SYSTEM.md` (voice rules), `mobileapp/docs/BRAND.md` (copy deck) and `mobileapp/docs/01 - Decisions.md`. Where a proposal would reverse a recorded decision it is marked **Decide**, not **Do**.

Evidence tags: **[Certain]** verified in code, in the running fixture build, or in a screenshot, with a citation. **[Likely]** strong inference. **[Guessing]** filling a gap.

Captures of the screens reviewed are in [`tg-real-captures-2026-09-23/`](./tg-real-captures-2026-09-23/). The web build renders SF Symbols as letters and has no map; everything else is the shipped UI.

---

## 0. The uncomfortable summary

1. **[Certain] Truegoing's copy is already better than MigoMap's on almost every screen.** The join sheet, cast detail and compose reach text say exactly what happens next and what stays hidden. MigoMap's strongest screens (SS25 activity card, SS7 safety) are weaker than Truegoing's equivalents. Rewriting copy is not where the win is.
2. **[Certain] The problems are structural, and none of them is fixed by looking more like MigoMap.** In order of damage:
   - The poster never shows **when the plan happens**. It shows `Ends 10pm`, which is expiry (`happens_at + 3h`, D6), not start (`remote.ts:238` maps `expires_at` through `expiryLabel`; nothing on the poster or detail renders `happens_at`). MigoMap shows "now · tomorrow · on Saturday" on every card (SS30). A person cannot decide to go without a start time, so every poster forces a tap.
   - **Two affordances are invisible**: withdraw and cancel are long-press only, announced by a caption (`alerts-page.tsx:332-354`). MigoMap has nothing comparable to copy, but a visible quiet action is table stakes.
   - **The verified mark is dead** against a real backend (`faces.ts:29-55`) while the copy promises verified people. MigoMap's badge (SS26) at least renders.
   - The feed has **no default time lens and no published order** (`store.ts:464-494`, `my_feed` ordered by `delivered_at desc`). This is the clutter the user experiences, and it is a data problem, covered in `08 §1` (R1–R5), not a UI problem.
   - **Reach is stated three ways**: `20 km` on the own-plan poster, `Shared within 2 km` on a seeded cast (user photo; `plan-line.ts:70` prints whatever `radius_m` the row carries, and the schema allows 2 000–20 000 m while `geo.ts:21` fixes new casts at 20 000). Same product, two numbers, one of them the schema minimum.
3. **[Likely] The visual system is right and should not move toward MigoMap.** One plan per viewport, category owns the colour field, big lowercase statement, one black bar button. Compared with MigoMap's dark map with emoji pins and "17 Activities Here" (SS27, SS30), Truegoing is calmer and more decisive. Changes below are refinements inside this system.

---

## 1. Screen-by-screen

Legend: **TG** wins · **MM** wins · **Tie** · **Do** = within existing decisions · **Decide** = needs a decision entry first · **Refuse** = do not adopt.

### 1.1 Entry and onboarding

| # | Screen | Truegoing today | MigoMap | Verdict | Proposal |
|---|---|---|---|---|---|
| 1 | Sign in | [Certain] Phone field, `Continue`, no marketing (capture `01-signin`). Nobody can sign in on a real backend: SMS provider deferred (D36, BE-01 S1). | SS1–SS3: splash, warm hero copy, Apple/Google/phone. | **TG** on copy; **MM** on working. | **Do**: pick the SMS provider. Nothing on this list matters until sign-in works. Add one line under the field saying what the number is for: `We text a code. Your number is never shown to anyone.` (BRAND voice: state the fact, no "please"). |
| 2 | Name | [Certain] `Your first name`, `Next` (capture `03-name`). | SS5 "what should we call you?" lowercase, warm. | Tie. | Keep. Truegoing's lowercase headline voice already matches; label is correct sentence case. |
| 3 | Age | [Certain] Date picker, `Next`; 18+ gate in DB (D30, `person_age`). | SS10 asks gender "to match you with the right people"; no age gate visible. | **TG**. | Keep. **Refuse** gender collection as MigoMap does it (doc `09` 7.5). |
| 4 | Home area | [Certain] `Your home area` → area picker with `Use my location`, search, suggestions, `Use this area`; footer: `Your area is stored as a neighbourhood, never your exact position. It decides which plans can reach you.` (captures `05-home`, `07-area-suggestions`). | SS33 asks location after onboarding on a world map, "Zoom in to explore". | **TG**. | Keep. One fix: the picker's title reads `HOME AREA` when reached from compose (capture `31-compose-area`), where it is the plan's area, not home. Title it from the caller: `Where is the plan?` |
| 5 | Interests | [Certain] Six chips: social · sports + outdoors · food + drinks · music + nightlife · games · learning + making; button `Show my feed` (capture `09-interests`). | SS12–SS13 offers ~30 interest tiles with emoji. | **MM** on precision, **TG** on speed. | **Decide** (R4 in `08`): sub-interests under the six, delivered on the parent and ranked by child. Six buckets are why "sports" delivers cricket to a badminton player. Keep the six on screen; expand on tap. |
| 6 | Steps before value | [Certain] 4 steps (name, age, home, interests) then feed. | SS2–SS24: 11+ screens incl. photo, bio, socials, rating prompt, radar. | **TG**. | Keep. Do not add a photo step; the avatar is optional and lives on Profile. |

### 1.2 Feed (the poster)

| # | Element | Truegoing today | MigoMap | Verdict | Proposal |
|---|---|---|---|---|---|
| 7 | Layout | [Certain] One plan per viewport, vertical snap, category colour field, statement in display type (capture `11-feed-poster-2`). | SS30: dark list of cards, 3–4 per screen, "17 Activities Here". | **TG**. | Keep. This is the product. |
| 8 | Start time | [Certain] Absent. Only `Ends 10pm` / `Ends Thu`. | SS30: `tomorrow`, `on Saturday`, `now` on every card. | **MM**. | **Do**: replace the expiry with the start on the poster: `Thu 7pm` or `Today 7pm`, using fixed English day names (no locale; see `08 §3`). Keep `Ends` only on the host's own poster where expiry is the thing they control. Rule: a reader needs *when*, a host needs *until when*. |
| 9 | Host line | [Certain] `✓ aarav · 31 plans completed ›` in a black pill; the mark is fixture-only (`faces.ts:29-55`). Name is lowercased on the poster and title-cased on detail (`Aarav`). | SS25/SS30: avatar, first name, "2 going" avatar stack. | **TG** on content; both broken (TG mark dead, MM count is vanity). | **Do**: wire `isVerified` to the real `is_verified` (R5). Pick one casing for names across poster and detail; the detail's `Aarav` is right, the poster's `aarav` reads as a typo next to `31 plans completed`. |
| 10 | Fact line | [Certain] `Panchkula Sector 5 · 3 vouches · Ends 10pm`. `3 vouches` is a real count from a dormant system (D31). | SS30: distance `0.3 mi`, category chip. | Tie. | **Do**: drop `vouches` from the poster while circles are dormant; a number nobody can act on is noise. Show `Panchkula Sector 5 · ≈3 km` (approximate distance is allowed and honest). |
| 11 | Why line | [Certain] `Why: one trusted link away · you're into sports ›` in muted mono. | None. MigoMap never says why. | **TG**. | Keep, tighten: `Why: near you · into sports ›`. "One trusted link away" is unverifiable by the reader today (circles dormant) and reads as marketing. Keep the stored reason honest to what delivered it (radius, interest, verified). |
| 12 | Actions | [Certain] `Ask to go` (black bar), `Not interested` (quiet). Swipe-left hides with `not_relevant` (`feed-page.tsx:397-419`). | SS25: `I'm in` one tap, no approval. | **TG**. | **Refuse** one-tap join (D5). Keep. Add a 1-line toast after `Not interested`: `Hidden. Fewer plans like this.` so the feedback loop is visible (MigoMap never explains dismissal either). |
| 13 | Own live plan | [Certain] `LIVE` stamp, `20 km · Ends Thu`, `See who's asked` (capture `10-feed-own-live`). Detail shows `Cancel plan`, `Done` (capture `16-see-who-asked`). | SS25: own activity looks like anyone else's. | **TG**. | Keep. `See who's asked` should show the count when non-zero: `2 asked ›`. It is the host's own plan, so the number is not a popularity signal to strangers. |
| 14 | Header controls | [Certain] Search glyph, `List | Map` segmented pill (capture `11-feed-poster-2`). | SS27: map-first with list toggle, filter chips, search. | Tie. | **Decide** whether the Map toggle earns its place at the top of the only feed; D45 keeps it. If kept, the lens should be in the same pill (`List · Map · Lens`), not a separate search glyph that opens filters. Today the glyph reads as text search and opens categories (capture `13-lens`). |
| 15 | Lens sheet | [Certain] `Show me / WHEN Today Tomorrow This weekend / WHAT All + six / Resets when you leave the feed… / Show everything / Close` (capture `13-lens`). Resets on leave. | SS30: sticky chips `All · Food · Outdoor`, sort `Popular`. | **MM** on persistence, **TG** on honesty. | **Do** (R2): default lens `This week`, persisted per person, shown as a chip on the header so the reader always knows what they are seeing. **Refuse** `Popular` sort (`09` 2.4). Exit word here should be `Done` (nothing lost) not `Close` (DESIGN_SYSTEM exit-word table). |
| 16 | Empty feed | [Certain] `Looking for plans…` while loading; empty copy names a reason (`empty-reason.ts`, `feed-page.tsx:497-510`). | SS1/SS3 skeletons, then "be the first". | **TG**. | Keep. |

### 1.3 Cast detail and join

| # | Element | Truegoing today | MigoMap | Verdict | Proposal |
|---|---|---|---|---|---|
| 17 | Detail sheet | [Certain] Coloured header with statement + category, then `Panchkula Sector 5 · Ends 10pm`, host row with reliability bars and `31 plans completed · 0 no-shows`, host note, `Why you saw this…`, then the privacy paragraph: `For now you only see roughly how far away this is. If Aarav accepts you, you get the exact place and the chat, and nobody swaps numbers.` (capture `17-cast-detail`). | SS25: emoji, "Saransh wants to Looking for…", "2 going", exact pin, `I'm in`. | **TG**, clearly. | Two fixes. (a) Same start-time fix as row 8. (b) The host row truncates (`0 no-sho…` at 390 pt). Move `0 no-shows` under the name as a second mono line; never let a trust fact clip. |
| 18 | Join sheet | [Certain] `Ask to go`, note field 0/140, three mono paragraphs (who sees what, host decides, silent no, public place), `Send request` disabled at 0 chars (`join/[id].tsx:149`), `Never mind` (capture `18-join-sheet`). | SS25: none, `I'm in` is final. | **TG**. | Keep the required note. Cut one paragraph: merge `Aarav decides…` and `A no is silent…` into one: `Aarav decides. Yes opens the chat here. No answer means no.` Three paragraphs above a disabled button is the one place the sheet feels like a form. |
| 19 | Request sent | [Certain] Returns to detail; `Request sent. Aarav will decide. We'll notify you here.` plus `Withdraw request`, `Done` (capture `20-join-sent`). | SS25: joins group chat instantly. | **TG**. | Keep. `We'll notify you here` is false when push is off (the compose flow already handles this honestly via `sent-note.ts`). Reuse `sentNoteFor()` here so the sentence matches the person's real notification state. |
| 20 | Caster profile | [Certain] `Aarav ✓ · Near Panchkula Sector 5 · in your circle · 31 plans completed · 0 no-shows · on Truegoing since March · vouched by 2 people you trust · In common: 1 plan · Live plans · Receipts are attendance facts, not ratings. · block · report` (capture `21-caster-profile`). | SS26/SS28: photo, bio, PRO badge, profile views, "Add friend". | **TG**. | Keep. Remove `in your circle` and `vouched by 2 people you trust` until circles are live (D31); a dormant system should not speak. `block · report` as lowercase inline links at the foot is correct and unshowy. |

### 1.4 Activity, Messages, chat

| # | Element | Truegoing today | MigoMap | Verdict | Proposal |
|---|---|---|---|---|---|
| 21 | Tabs | [Certain] `Activity` title, tabs `Messages | Needs you 3`, then chips `NEEDS YOU 3 · YOUR PLANS 1` (capture `23b-activity-needs-you`). On device the chips truncate to `NEEDS…`, `WAIT…`, `YOUR PL…` (user photo). | SS8: chat list; SS9 notification list. | Tie. | **Do**: the chips duplicate the tab (`Needs you` appears twice on one screen). Replace with three plain tabs: `Needs you · Waiting · Your plans`, and move `Messages` to its own dock badge context, or keep `Messages` as the first tab and make the chips a second row of sentence-case pills that wrap. Uppercase mono at 13 pt cannot survive 390 pt with three labels; that is what truncated on the phone. |
| 22 | Items | [Certain] `badminton after work · How did it go? · CONFIRM ATTENDANCE`; `Riya asked to join "…" · 4m ago · chess in the park… · REVIEW`. | SS9: generic notification rows. | **TG**. | Keep the item design. Change `REVIEW` to `See request` and `CONFIRM ATTENDANCE` to `Did it happen?` in sentence case; uppercase orange stamps are the same pattern as the chips and will clip. DESIGN_SYSTEM says sentence case for CTAs. |
| 23 | Withdraw / cancel | [Certain] `“…” · Long-press to withdraw`, `· Long-press to cancel` as caption text (`alerts-page.tsx:332-354`). | No equivalent. | Both weak. | **Do**: add a visible quiet action `Withdraw` / `Cancel plan` on the row's right, keep long-press as a shortcut. A hidden gesture with a caption is not "gestures are the way out" (D41); it is a gesture as the only way in. |
| 24 | Messages empty | [Certain] `No messages yet · A chat opens the moment a request is accepted, yours or theirs.` (capture `23-activity`). | SS8 welcome DM from a fake 25-year-old (SS6). | **TG**. | Keep. **Refuse** persona DMs (`09` 8.1). |
| 25 | Chat thread | [Likely] Pair thread, four safety lines at the top of a new thread (Tier A1), photos and location only (D12). Not captured on web. | SS7/SS8: group chat, safety shield, "Share your number after you've met". | **TG** on model. | Keep. Verify on device that the safety lines are collapsible after the first read; four lines above every new thread will be dismissed as boilerplate if they cannot go away. |

### 1.5 Profile and Settings

| # | Element | Truegoing today | MigoMap | Verdict | Proposal |
|---|---|---|---|---|---|
| 26 | Profile | [Certain] `Profile` title, avatar, `Piyush · sector 5`, `Reliability: strong` with bars and `People on the same plan can see your reliability and meetup history.`, rows `Blocked · Meetup history · september recap · Settings` (capture `26-profile`). | SS26: photo, PRO badge, completeness ring 33%, profile views, friends. | **TG** on trust facts; **MM** on feeling like a profile. | User's own read: it looks like a settings list. Agreed. **Do**: put what a *host sees about you* first, as one card: name, area, reliability bars, `31 plans completed · 0 no-shows`, interests. Label it `What hosts see`. Below it the utility rows. `Blocked: nobody` does not deserve second position; move it under Settings. |
| 27 | Completeness | Absent. | SS26 ring 33%. | **MM**. | **Do** small: a one-line nudge under the card, only when something is missing: `Add a photo so hosts can recognise you.` No ring, no percentage. |
| 28 | Settings | [Certain] `Name & phone number · Home area (always approximate) · What you're into · Notifications (Off. Turn them on in Settings…) · Devices · Terms & privacy · Community guidelines · Paid suggestions` (capture `27-settings`). | SS9: km/mi, stealth mode, blocked users, notifications. | **TG**. | Keep. `Paid suggestions` (D47 venue offers) reads as a paywall row; rename `Venue suggestions` with the sub `Venues can pay to suggest a place. Never people.` |

### 1.6 Compose

| # | Element | Truegoing today | MigoMap | Verdict | Proposal |
|---|---|---|---|---|---|
| 29 | Step 1 | [Certain] `PLAN`, progress bar, `what are you actually up for?`, six category chips, `What's the plan?` field 0/140, `Write it like you mean it. You can edit until someone asks to join.`, `Next: add details` (capture `28-compose-1`). | SS34–SS35: emoji + "WANT TO …" sentence builder, ~10 s to post. | Tie. | Keep free text (the "Saransh wants to Looking for…" bug in SS25 is what sentence stems do). **Do**: make the category chips sentence case (`Sports + outdoors`); mono lowercase chips at 390 pt wrap to three rows and push the field below the fold. |
| 30 | Step 2 | [Certain] `choose who this can reach` + `Every plan reaches 20 km around the place you pick. Only the people you accept will see the exact place. Everyone the plan reaches sees roughly how far away it is.`, `Where? choose an area`, `When · Add date + time`, `Send the plan`, `Back` (capture `30-compose-2`). | SS37: move map under a fixed pin, then time. | **TG** on honesty. | The heading `choose who this can reach` promises a choice the screen does not offer (reach is fixed, D28). Rename `Where and when`. Reach text stays. Exit word here is `Back` and is correct (nothing discarded, previous step retained). |
| 31 | Area picker | [Certain] Title `HOME AREA` (wrong context, row 4), `Where, roughly?`, `Use my location`, `Nearby`, `Via geocode (limited)`. | SS37 map-first. | Tie. | Fix the title. `Via geocode (limited)` is a developer note leaking to users; drop it. |
| 32 | Sent | [Likely] `OUT` stamp, sent note from `sentNoteFor()` (will-notify / come-back / undecided), `Turn on notifications` / `Not now` (`compose.tsx:411-446`). | SS14 notification pre-prompt with two benefits. | **TG**. | Keep. This is the model for row 19. |

---

## 2. Copy changes, all in one place

Every line below follows DESIGN_SYSTEM voice rules: sentence case, no exclamation marks, no emoji, no em dashes, exit words from the table (`Done` nothing lost · `Never mind` something discarded · `Back` previous step kept).

| Where | Today | Proposed | Why |
|---|---|---|---|
| Poster fact line | `Panchkula Sector 5 · 3 vouches · Ends 10pm` | `Panchkula Sector 5 · ≈3 km · Thu 7pm` | Start beats expiry; vouches dormant; approximate distance is allowed |
| Poster why line | `Why: one trusted link away · you're into sports ›` | `Why: near you · into sports ›` | Only reasons the delivery actually used |
| Own poster | `See who's asked` | `2 asked ›` / `Nobody asked yet` | Real count to the host only |
| Lens exit | `Close` | `Done` | Exit-word table |
| Lens default | none, resets | `This week` chip on header | R2 |
| Detail host row | `31 plans completed · 0 no-sho…` | two lines: `31 plans completed` / `0 no-shows` | Trust facts never clip |
| Join sheet | 3 paragraphs | `Aarav sees your first name and this note, nothing else, until they accept.` / `Aarav decides. Yes opens the chat here. No answer means no.` / `First time meeting? Choose a public place.` | Fewer words above a disabled button |
| Request sent | `We'll notify you here.` | from `sentNoteFor()` | Never promise a notification that cannot arrive |
| Activity chips | `NEEDS YOU 3 · YOUR PLANS 1` (+`WAITING`) | tabs `Needs you · Waiting · Your plans` | Truncation on device; duplicate of the tab |
| Activity stamps | `REVIEW`, `CONFIRM ATTENDANCE` | `See request`, `Did it happen?` | Sentence case CTAs; width |
| Activity caption | `· Long-press to withdraw` | visible `Withdraw` quiet action, caption removed | Hidden affordance |
| Profile | rows only | `What hosts see` card first | Profile, not settings |
| Settings row | `Paid suggestions` | `Venue suggestions` · `Venues can pay to suggest a place. Never people.` | Reads as paywall |
| Compose 2 heading | `choose who this can reach` | `Where and when` | Reach is not a choice (D28) |
| Area picker title (from compose) | `HOME AREA` | `Where is the plan?` | Wrong context |
| Area picker | `Via geocode (limited)` | remove | Developer note |
| Sign in | field only | `We text a code. Your number is never shown to anyone.` | State the fact |

Casing rule to settle once: `DESIGN_SYSTEM.md:233` says sentence case for titles, headings, labels and CTAs. Uppercase mono is used today for eyebrows (`SPORTS + OUTDOORS`), chips (`NEEDS YOU`), stamps (`LIVE`, `REVIEW`) and section labels (`WHAT KIND OF PLAN?`). [Guessing] eyebrows and stamps were intended as the exception. Write that exception down: uppercase mono for one-word stamps and category eyebrows only; everything tappable is sentence case.

---

## 3. What not to adopt from MigoMap, restated for this review

Refused, with the screen it would have touched: one-tap `I'm in` (row 12), `N going` avatar stacks (rows 9, 13), `Popular` sort (row 15), exact pin before acceptance (row 17), group chat (row 25), profile views and PRO badge (rows 20, 26), completeness percentage ring (row 27), persona welcome DM (row 24), gender at onboarding (row 3), dark purple map-first home (rows 7, 14). Each has a decision or an "absent by decision" entry behind it; the fuller reasoning is in `09`.

---

## 4. Order of work

1. Sign-in provider (row 1). Everything else is invisible until this ships.
2. Start time on poster and detail (rows 8, 17). One formatter, fixed day names, tests first.
3. Verified mark wired to `is_verified` (row 9, R5).
4. Default lens `This week`, persisted, shown on header (row 15, R2).
5. Activity: three sentence-case tabs, visible Withdraw/Cancel, sentence-case stamps (rows 21–23).
6. Profile `What hosts see` card (row 26).
7. Copy table §2, in one commit, with `copy.test.ts` extended to the new strings.
8. **Decide** rows: sub-interests (row 5), Map toggle placement (row 14), reach disclosure wording vs the 2 km seed rows (§0.2).

Each item lands in `mobileapp` under its governance: decision → law → assertion → schema where the database is touched, failing test first, `./scripts/verify-all.sh` before claiming done. This repository stays reference only.
