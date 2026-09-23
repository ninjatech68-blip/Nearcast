# 11 - Fewer Steps, Same Trust

**Written 2026-09-23.** Response to user testing: people who used both apps said MigoMap "gets the job done" with fewer steps. This document takes that verdict seriously and sets step targets for Truegoing's three core jobs without giving up the four things that make it Truegoing: verified people only, host consent, exact place hidden until then, and nobody browsable.

Evidence tags as in `10`. Truegoing counts come from the fixture build captured in [`tg-real-captures-2026-09-23/`](./tg-real-captures-2026-09-23/); MigoMap counts from SS25, SS34–SS37.

---

## 0. Read the test correctly

- [Certain] Nobody can sign in to Truegoing on a real backend (D36, BE-01). Testers used a fixture or seeded build. Their verdict on **flows** stands. Their verdict on **feed relevance** was a verdict on ten seeded accounts, not on delivery.
- [Certain] MigoMap is fewer steps for two different reasons. **Flow design**: one screen to post, time on every card, no explanatory prose. **Mechanism**: no approval, no hidden place, group chat. The first transfers. The second is what your decision record refuses, and it is also why MigoMap needs a paywall, a people list and gender filters to feel useful.
- Target: match MigoMap's step count on posting, come within one tap on joining, and stay ahead on onboarding, while every trust rule keeps holding in PostgreSQL.

## 1. Step counts, today and target

| Job | MigoMap | Truegoing today | Truegoing target |
|---|---|---|---|
| Post a plan | ~5 taps + a sentence, 1 screen | ~12 taps + a sentence: category, text, Next, Where, search, pick, Use this area, When, date, time, Done, Send (captures `28`–`33`) | **4 taps + a sentence, 1 screen** |
| Join a plan | 1 tap, in chat at once | 2 taps + a typed note, then wait (captures `17`–`20`) | **2 taps, no typing in the common case**; 1 tap when the host opened the plan |
| Host accepts | none | Activity → See request → Accept | **1 tap from the push or the Activity row** |
| Onboard | 11+ screens | 4 screens + OTP | **3 screens + OTP** |
| Understand a card | 1 glance | 1 glance + 1 tap for the time | **1 glance** |

---

## 2. Posting: one screen, four taps

[Certain] Today compose is two steps plus two pickers, and step 2 opens with three paragraphs about reach before the two fields (`compose.tsx`, capture `30-compose-2`). MigoMap's is one screen: emoji, sentence, pin, time (SS34–SS37).

**Target screen, top to bottom:**

1. Text field, focused on open, 140 chars. Category chips under it, sentence case, one row that scrolls. [Likely] Pre-highlight a suggested chip from the text (badminton → Sports + outdoors) and let the person correct it. This is classification, not fabrication; the person confirms it.
2. **Where**: prefilled with the home area, one tap to change. Most plans are near home; the picker is the exception, not the path.
3. **When**: four quick picks, `Tonight 7pm · Tomorrow evening · This weekend · Pick a time`, the last opening the native picker. Fixed English labels (`08 §3`).
4. `Send the plan`, enabled the moment text and time exist.

Reach disclosure: the full paragraph shows on a person's **first** plan only, then collapses to one line above the button: `Reaches 20 km. Exact place stays hidden until you accept someone.` D28 is untouched; the fact is still on screen every time, just not three times.

Refuse: sentence stems ("WANT TO …"), which produced "Saransh wants to Looking for…" (SS25). Refuse emoji as category.

Decisions touched: none. Everything here is client-side. Failing tests first on the quick-pick formatter and the chip suggestion.

## 3. Joining: two taps, no typing, host decides

[Certain] `Send request` is dead until a note exists (Principle 28, `join/[id].tsx:149`). The database does not require the note: `request_to_join(in_cast uuid, in_note text default null)` stores `nullif(btrim(in_note), '')`. The requirement is client-only.

**Target sheet:**

- `Ask to go` opens the sheet as today. Under the field, three tap-to-send starters: `I can make it` · `First time, is a beginner fine?` · `Can I bring one more?` One tap on a starter sends. Free text stays for people who want it.
- One paragraph, not three: `Aarav sees your first name and this note, nothing else, until they accept. No answer means no.`
- I disagree with removing the note entirely. Here's what I'd do instead: starters, so the common case is two taps and the host still receives a sentence to decide on. The risk in a blank ask is what MigoMap shows on SS25: people land in plans with nothing said, and hosts cannot tell who to accept.

Decision touched: Principle 28 wording (note must exist) becomes "a note, typed or chosen, must exist". Record it before shipping. No schema change.

## 4. The bridge: host-opened plans (Decide)

This is the one mechanism change that gets Truegoing to MigoMap's one-tap join without losing the quality.

- At compose, an off-by-default toggle: **`Anyone verified can join`**. Turning it on is the host's informed action. The line under it: `People you'd otherwise approve one by one join at once and see the place.`
- For a reader, an opened plan shows `I'm going` instead of `Ask to go`. One tap: the join is accepted server-side in the same transaction, the exact place unlocks (D17 still holds: reveal on acceptance, acceptance is just immediate), and the pair thread opens (D2 holds).
- Everything else stays: verified-only delivery, radius, interest match, slots (D5), pair threads, block and report, no headcount shown to strangers (D29).

What it needs: a decision entry (D52 draft), a law assertion that an open plan still never reveals the place to a non-accepted person, a column `casts.open_join boolean not null default false`, `request_to_join` branching to accept when the cast is open and the actor passes `private.assert_actor()`, pgTAP for allowed and denied paths, and the toggle plus the `I'm going` button. Idempotent, as all writes are.

Why this is better than MigoMap's one tap: the host chose it, per plan, and only verified people can take it. MigoMap gives one tap to everyone on every plan and then sells filters to cope with the result.

## 5. Host acceptance: one tap

[Certain] Today a request is a row in Activity with a `REVIEW` stamp that opens the request before `Accept` appears (capture `23b`). Put `Accept` and `Decline` on the row itself, and in the push's action buttons where the platform allows. The note is already on the row; nothing else is needed to decide.

## 6. Feed: the card answers everything

Covered in `10` rows 8, 10, 15. Restated as the step it removes: today a reader taps every poster to learn when it happens. Start time on the poster removes one tap from every decision, on every plan, for every person. It is the highest-leverage change in this document and it is a formatter.

## 7. Onboarding: three screens

[Certain] Today: name, age, home area, interests (captures `03`–`09`). Merge name and date of birth on one screen; both are one field. Keep home area and interests as their own screens because each carries a disclosure line that must be read. Three screens plus OTP. Nothing to decide.

---

## 8. What stays refused, and why the testers will not miss it

| MigoMap mechanism | Why it feels fast | What replaces it |
|---|---|---|
| One-tap join on every plan | No consent step | Host-opened plans (§4) give the same tap where the host wants it |
| Group chat per activity | Everyone in one room | Pair threads with the plan pinned at the top: time, place once unlocked, `Did it happen?` |
| Exact pin before joining | No unlock step | Approximate distance on the card; exact place on acceptance, immediate on open plans |
| People nearby list | Browse instead of wait | Plans are the unit; delivery does the browsing. Nothing to add. |
| "N going" avatar stacks | Social proof at a glance | Host's reliability facts on the card, which are real |

---

## 9. Order

1. Poster start time (§6). Formatter, tests, one afternoon.
2. Compose on one screen with quick picks and prefilled area (§2). Client only.
3. Join starters and one-paragraph sheet (§3). Client only, plus the Principle 28 wording change.
4. Accept on the Activity row and in the push (§5). Client only.
5. Onboarding merge (§7). Client only.
6. **Decide** host-opened plans (§4), then decision → law → assertion → schema → UI.

Steps 1–5 do not touch a decision or the database. They can ship before the SMS provider is chosen and be waiting when sign-in works.

---

## 10. Map, list, filters, and "post anywhere" (added after the owner's question)

The question: MigoMap has a map view and a list view with filters, which are engagement points. What if Truegoing lets go of the 20 km geofence and lets people post anywhere on the map?

**The premise is half wrong, and the half that is wrong is already built.**

- [Certain] **Posting anywhere already works.** The 20 km radius is on the *plan*, not on the poster. Compose picks any area by search (`compose.tsx`, `area.tsx`); a person in Panchkula can post a plan in Goa today, and it reaches people whose area is within 20 km of Goa. Nothing stores where the poster is (D3, D4).
- [Certain] **Hearing from more than one place already works.** `person_areas` is plural; Settings has `Add an area` (`areas.tsx:65`). Add Goa as an area and Goa's plans reach you. The mechanism the owner wants is live and hidden under Settings → Home area.
- [Certain] **The map view exists and is ruled.** D45 (ruled 2026-09-22): the feed carries a neighbourhood label, never a coordinate; the map places casts by area label. It is blank against real accounts only because `my_feed` did not yet return the label; that is the D45 follow-through, not a new feature.
- [Likely] **Dropping the geofence would recreate the complaint that started this work.** "I only want relevant plans, not everything around me" and "let me see everything on the map" are the same request with the sign flipped. MigoMap's map is engaging because it is full; it is full because it shows everything; showing everything is the clutter. The radius is what makes the why line true.

**What to build instead, in this order:**

1. **Surface the area switcher in the feed header.** Replace the search glyph with `Near Sector 5 ▾`. Tap: the person's areas, plus `Add a place`. Adding a place is the existing `person_areas` write with the existing disclosure line. This is MigoMap's city search (SS20) without the trips product, and it needs no decision.
2. **Finish D45 so the map works in life.** `my_feed` returns `area_label`; the map shows labelled areas with a real plan count per label (`4 plans`), never a person, never a pin at a coordinate. Tap a label: the feed filters to it. That is the engagement point, and it is honest.
3. **Make the lens persistent and visible** (`10` row 15, `08` R2): chips `This week · Sports + outdoors` on the header, so list and map share one filter state like MigoMap's chips (SS30).
4. **Do not widen the radius.** If a plan should reach further, that is the host's informed action per plan (a future reach choice, D28 to be reopened), never a global change.

Refuse: a world map to pan (SS33), trips and trending destinations (SS20, SS32, SS36, SS38), pins at coordinates, any surface that shows where a person is.

---

## 11. Map browse, ruled by the owner (added 2026-09-23)

The owner reaffirmed after §10: **plans must be visible on the map, and a person can browse the map for plans and open their details.** This is the owner's call and it is recorded here as a draft decision for `mobileapp/docs/01 - Decisions.md`. My disagreement stands in §10 and is not repeated; what follows is the version that keeps the four trust rules while doing what was asked.

### D53 (draft) — Plans are browsable on a map, at their coarse point

**What changes.** D45 ruled that no coordinate for an unaccepted cast crosses the wire, only a gazetteer label. D53 amends that: `my_feed` and a new `casts_on_map` read return the cast's **coarse point**, `casts.match_point`, which is already snapped to a ~1 km grid (`20260901030000_places.sql:20`, `20260918000000_area_labels.sql:14`). The exact venue stays where D17 and L14 put it: host and accepted people only. Nothing about people moves: no person has a coordinate anywhere (D3, D4), and the map shows plans, never people.

**Brand guardrail amended.** `BRAND.md` says never use map pins. Read it as *never pins for people*. A plan on the map is a **category-coloured dot** at its coarse point, no avatar, no face, no radar ring. Clusters show a real count (`4 plans`), never an estimate dressed as a fact.

**Privacy bound, stated exactly.** [Certain] A dot at a 1 km grid point tells a browser which 1 km cell a plan is in. That is the same information the delivery radius already leaks to anyone within 20 km, so the map adds no new fact about the plan for people in reach. What it adds is **reach**: a browser outside the plan's 20 km can now see that the plan exists and roughly where. That is a widening, and the rule is that reach widens only by the host's informed action. So:

**Host control, at compose.** One toggle, `Show on the map`, with the line: `Anyone browsing the map sees this plan and its rough area, not the exact place. Off: only people within 20 km who share the interest.` **Ruled by the owner 2026-09-23: default on.** The map is meant to be full; an empty map is the failure D45 was written about. Recorded with D53; the toggle itself is what keeps "reach only widens by informed action" true. Turning it off later narrows, which the rule forbids; so the toggle is set at publish and locked after the first ask, like the words (L10).

### The map screen

- **Entry.** `List | Map` on the feed header as today (D26 unchanged; three destinations plus Create). Map opens centred on the person's home area, never on device location.
- **Dots.** One per plan at the coarse point, coloured by category. Tap: the poster rises as a bottom sheet with the full card (statement, host with reliability, start time, `≈` distance, why line, `Ask to go` / `I'm going`). Everything a reader can do from the list they can do from the sheet. Details open the same cast detail as the list.
- **Clusters.** Below a zoom threshold, dots merge into a count. Tap a cluster: zoom, or a list of the plans in it.
- **Filters.** The same lens as the list (`This week · Sports + outdoors`), one filter state for both views (§10 step 3). Plus one map-only chip: `Mine` (delivered to me) vs `All` (every plan with `Show on the map`). Default `Mine`, so the first view is still the relevant one; `All` is the browse the owner asked for.
- **Why line on browsed plans.** A plan seen through `All` did not reach the person by delivery, so the why line says so: `Why: you're browsing the map`. Every plan still carries a true reason.
- **Own plans.** The host's own plan shows at its coarse point with a `LIVE` stamp, same as the list.
- **Joining a browsed plan.** `Ask to go` works from any dot, in or out of the 20 km. The host still decides (D5) or opened the plan (§4). The exact place still unlocks on acceptance (D17).
- **Never on the map.** People, avatars, "N going", exact venues before acceptance, device location, heatmaps of where people are.

### What it needs in `mobileapp`

1. Decision entry D53 in `01 - Decisions.md`, with D45's "what was given up" paragraph updated rather than deleted.
2. Law assertion: a coarse point is on the 1 km grid for every row that crosses the wire; no exact point for a non-accepted reader; no person coordinate anywhere (extends the existing coordinate-column enumeration).
3. `casts.show_on_map boolean not null default true`, set at publish, immutable after the first join request.
4. `casts_on_map(bbox, lens)` SECURITY DEFINER read: verified callers only (`private.assert_actor()`), returns coarse point, category, start time, host trust facts, `show_on_map = true`, live only, bounded to the viewport and capped per call.
5. pgTAP: allowed (verified browser gets dots in bbox), denied (unverified, restricted, under-age; exact point never present; `show_on_map = false` never returned).
6. Client: reuse the existing map screen and `map-placement.ts`; replace label lookup with coarse points; sheet reuses the poster component; one lens store for list and map.
7. Copy: the toggle line, the browse why line, cluster count format, empty map state `No plans on the map here yet.`

Order: after §9 steps 1–5. It touches a decision and the schema, so it goes through decision → law → assertion → schema → UI, and `db-local.sh test` and `contract` before any device build.

---

## 12. Group thread per plan, ruled by the owner (added 2026-09-23)

The owner ruled: **add a group chat per plan.** This reverses D2 (pair threads only, "what makes blocking tractable and what keeps a cast from becoming a room") and touches the brand guardrail against group-chat-first positioning. My position, once: I disagree because a room is where MigoMap's clutter and dating drift live, and because symmetric blocking (D13) has no clean answer inside a shared room. Here's what I'd do instead: the design below, which puts the group only where consent already happened. The risk in a plain per-plan group is a stranger's room with the exact place in it. What follows is the owner's decision, built to keep the four rules.

### D54 (draft) — A plan has one thread for the people who are going

**Who is in it.** The host and every **accepted** person, and nobody else. Askers who have not been accepted are not in it and cannot see it. Acceptance is the door (D5's consent step and §4's host-opened plans both lead here). Slots (D5) cap the room at the plan's size.

**When it exists.** Created on the first acceptance. Ends at the plan's expiry plus the same grace the pair threads use today (`chat.ts` modes `ended · week · month`), then read-only.

**What is in it.** The plan pinned at the top: statement, start time, **exact place** (revealed here, on acceptance, D17 unchanged), `Did it happen?` when the time passes. Text, photos and location as today (D12). Reply and reactions as today (D23). The four safety lines open the thread as they open a pair thread now. **No polls, no voice, no video, no invites, no sharing the thread outside the plan.**

**Pair threads stay.** Every accepted person still has a private thread with the host (`threads` keyed by `cast_id, joiner_id` as today), one tap from the group. Two joiners do not get a private thread with each other unless a settled receipt later connects them (D7). This is what keeps D2's intent alive inside D54: the room is for the plan, the pair is for the person.

**Blocking inside a room (D13, made tractable).** Block is symmetric and immediate. If either person blocks the other while both are accepted on one plan, the **blocker leaves the plan**: their acceptance is withdrawn silently, they leave the room, the host is told only that a place opened. Neither sees the other's messages afterwards. A block by the host removes the blocked person from the plan and the room, as declining does today. The alternative (hide messages inside a shared room) leaves two people at the same exact place at the same time, which is the one outcome blocking exists to prevent.

**Receipts.** `Did it happen?` still needs both sides to confirm (D7). In a group plan the host confirms each person; each person confirms the host. Attendance stays pairwise even when the chat is not, because reliability is a fact about a pair meeting, not a room.

**What never enters the room.** People who only asked. Anyone unverified. Phone numbers by design (the safety lines still say so). The plan's why line. Popularity: the member list shows names and reliability, never a count to strangers (D29 holds; the count is visible only to people already inside).

### What it needs in `mobileapp`

1. Decision entry D54 amending D2; brand guardrail reworded to *group chat is never the positioning* (the product is still plans, and the room is a consequence of going).
2. Laws: only accepted people read or write a plan room; a room never contains a person who blocked or is blocked by another member; the exact place is visible only to room members and the host; nobody outside the plan can enumerate the members.
3. Schema: `plan_threads (cast_id pk, created_at, ended_at)`, `plan_thread_members (cast_id, person_id, joined_at, left_at)`, messages either in the existing `messages` table via a nullable `plan_cast_id` or a sibling table; RLS by membership; SECURITY DEFINER transitions `open_plan_thread` (on first accept), `leave_plan_thread` (on block, withdraw, decline), all idempotent.
4. pgTAP: allowed (accepted member reads and writes), denied (asker, unverified, blocked pair, post-expiry write, member enumeration by an outsider).
5. Client: the existing chat UI (`@kesha-antonov/react-native-chat`) with the pinned plan header; Activity → Messages lists plan rooms above pair threads; `Message Aarav privately` from the room header.
6. Copy: room opener `Everyone here is going. The exact place is below. Share your number after you've met, not before.`; leave confirmation; ended state.

Order: after D53 (§11). It is the largest schema change in this set and should not ship before the SMS provider and the first real users, because every rule above needs real blocking and real receipts to be tested against.
