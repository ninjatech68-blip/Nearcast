# MigoMap takeaways for Truegoing

**Written 2026-09-23.** Distilled from the MigoMap review (38 screenshots, SS1–SS38 in upload order; documents `01` and `02` in this folder) and checked against the real Truegoing codebase, `ninjatech68-blip/mobileapp` at `d2959d7`. It complements `mobileapp/docs/COMPETITIVE_RESPONSE_2026-09-22.md`, which already rules on categories, the cast map, sponsored plans and trips; those rulings are not repeated here.

Each takeaway has a status against Truegoing:
- **Built** — Truegoing already does it (cited).
- **Add** — additive; no recorded decision touched; failing test first.
- **Decide** — needs an entry in `01 - Decisions.md` before code.
- **Refuse** — conflicts with a settled decision, the "deliberately absent" list, or the brand; recorded so it isn't copied by accident.

Tags: **[Certain]** seen in a screenshot or in `mobileapp` code/docs · **[Likely]** inference.

---

## 1. The one takeaway that outranks the rest

**MigoMap has users; Truegoing cannot sign anyone in.** [Certain] BE-01 (no SMS provider) is deferred by D36. MigoMap's welcome DM, busy map and "17 activities here" are all *consequences* of having people. Nothing in this list closes that gap. Procure the SMS provider first.

---

## 2. Discovery and the feed

| # | MigoMap does | Evidence | Takeaway for Truegoing | Status |
|---|---|---|---|---|
| 2.1 | Shows everything nearby: map of every activity plus a "17 Activities Here" list. Users drown in it. | SS27, SS30 | Truegoing's rule is right: deliver only what matches (radius + interest + verified). The clutter Truegoing still has comes from the fixed 20 km radius, six coarse categories and no ordering, not from showing too much *kind* of content. See `08` §1 (R1 reader radius, R2 default lens, R3 fixed ordering). | Decide (R1, R3) · Add (R2) |
| 2.2 | Relative time everywhere: "now", "tomorrow", "on Saturday". | SS30 | Adopt on posters. Pure formatter exists in this repo (`src/features/plans/domain/relativeTime.ts`, 12 tests); check `copy.test.ts` rules before pasting strings. | Add |
| 2.3 | Category chips filter the list (All · Food · Outdoor). | SS30 | Built: session lens with honest count (`app/filter.tsx`, `store.ts:464-494`). | Built |
| 2.4 | Sort by "Popular". | SS30 | Refuse. Popularity counts are absent by decision; ordering by crowd is recommendation by another name. Use a fixed, published sort instead (R3). | Refuse |
| 2.5 | Emoji + host avatar pins on a map; clusters. | SS27 | Cast map exists behind a toggle, ruled by D45 (coarse `area_label`, no person coordinates). Brand says "never use map pins"; D50 leaves that unresolved. Not a takeaway to act on until D50 is settled. | Decide (D50 open) |
| 2.6 | A "people nearby" list with names, photos and distance to 0.1 mi; gender/age filters; paywall on the filtered result. | SS16, SS21, SS23 | Refuse. "Public maps of people" and dating mechanics are absent by decision; L2 forbids person coordinates; brand forbids "see who's around". This is MigoMap's biggest safety liability and Truegoing's clearest differentiator. | Refuse |
| 2.7 | Search by city with "N going" counts. | SS20 | Refuse "multi-city discovery" (absent list). Local search within the lens is fine and cheap. | Refuse / Add (local only) |
| 2.8 | "Not for me" style dismissal exists implicitly (close). | SS25 | Built better: `hide_cast` with `not_relevant` feedback, swipe-left animation (`feed-page.tsx:397-419`). | Built |

## 3. Creating a plan

| # | MigoMap does | Evidence | Takeaway | Status |
|---|---|---|---|---|
| 3.1 | Create is a sentence: emoji + "WANT TO …", then type, then a map pin, then time. About 10 seconds. | SS34, SS35, SS37 | Truegoing compose is write → details → sent, with a required time and place (`app/compose.tsx:50`). Compare step count and taps on a device; MigoMap's speed is the target, the consent model is not negotiable. | Add (measure, then trim) |
| 3.2 | Location picked by moving the map under a fixed pin. | SS37 | Built: `pick-location.tsx` with react-native-maps. | Built |
| 3.3 | Emoji auto-chosen for the plan. | SS35 | A category owns a poster's colour field instead (DESIGN_SYSTEM). Emoji-as-category is a different visual language; refuse for the poster, consider for the compose category chips only if the brand agrees. | Refuse (brand) |
| 3.4 | Template bug: "Saransh wants to Looking for a morning cycling partner". | SS25 | Never re-render a stem in front of free text. Truegoing's statement is the person's sentence; keep it that way. Add a copy test if any template ever wraps a statement. | Built (guard it) |
| 3.5 | Recurring plans are absent in MigoMap. | — | Truegoing has none either. Recurring casts would build density in a thin city (hosts programme). Needs a decision (expiry rule D6, freezing L10 interact). | Decide |

## 4. Joining

| # | MigoMap does | Evidence | Takeaway | Status |
|---|---|---|---|---|
| 4.1 | One tap "I'm in", no approval, straight into a group chat. | SS25 | Refuse. Truegoing's "Ask to go" with a required note and caster acceptance is the consent model (D5, Principle 28, `join/[id].tsx:149`); per-plan group chat is absent by decision (D2). MigoMap's speed here is exactly what makes it feel like a dating app. | Refuse |
| 4.2 | "2 going" with avatar stack on every card. | SS25, SS30 | Refuse the count (no headcount, D29; popularity counts absent). `taken` exists in `my_feed` but is deliberately not shown. | Refuse |
| 4.3 | Says what happens next is nothing ("I'm in" is final). | SS25 | Truegoing must say plainly that a request goes to a person who may say no. Done 2026-09-22 (Tier A4). | Built |
| 4.4 | Withdraw is discoverable. | — | Truegoing's withdraw is long-press only (`alerts-page.tsx:328-339`); flagged as CPY-13 and A11Y-04. Make it a visible action. | Add |
| 4.5 | A joiner can leave. | — | UX-07: a joiner cannot leave a plan in Truegoing. Fix. | Add |

## 5. Chat and coordination

| # | MigoMap does | Evidence | Takeaway | Status |
|---|---|---|---|---|
| 5.1 | Group chat per activity, with camera, gallery, poll, location. | SS8 | Pair threads only (D2); photos and location only (D12), plus reply/reactions/real typing (D23). Polls: refuse (no group). | Built / Refuse |
| 5.2 | Safety shield in the chat header opens tips. | SS8, SS7 | Built 2026-09-22 (Tier A1): four safety lines at the top of a new thread. | Built |
| 5.3 | "Share your number after you've met, not before." | SS7 | Good line; Truegoing's version exists in the safety lines. | Built |
| 5.4 | Exact place is public on the pin. | SS25 | Truegoing reveals the place only on acceptance (D17, D42). Keep. One open hole: `may_see_place` is never revoked after block, decline or withdrawal (SEC-12). Fix before any external tester. | Add (SEC-12) |
| 5.5 | Nothing at the moment of meeting. | — | Both apps lack an in-meeting safety surface (SEC-14 open). A "Meetup mode" one hour before: place, directions, "tell someone" via OS SMS, "I'm here", "leave/call". No person coordinate stored. | Add |

## 6. Profile, trust and verification

| # | MigoMap does | Evidence | Takeaway | Status |
|---|---|---|---|---|
| 6.1 | Selfie verification, "Get verified: one selfie". | SS26 | Truegoing: verified = phone OTP (D8, D19). The **badge is dead**: `isVerified` always returns false against a real backend (`faces.ts:29-55`) while every caster is verified by construction (`assert_actor`). Fix or remove the mark (`08` R5). Selfie verification: not before users, and it proves liveness, not identity. | Add (fix badge) · Decide (selfie) |
| 6.2 | "PRO" badge on profiles; profile-view counter and notifications. | SS26, SS28 | Refuse. Paid status as trust and "who looked at you" are dating mechanics; profile views reward looking at people. | Refuse |
| 6.3 | Profile completeness ring (33%). | SS26 | Reasonable nudge if the items are trust items (name, area, interests, first plan, first receipt). Small. | Add |
| 6.4 | Rating prompt with testimonials during onboarding. | SS17 | Refuse; ask only after a settled receipt. The competitive response proposes adding this to the absent list; agree. | Refuse (record it) |
| 6.5 | Friends list, "Add friend" on strangers, sent requests. | SS4, SS9 | Circles are dormant (D31); receipts and vouches are the trust graph (D7, D10). Cold "add friend" is refused; connection after a settled receipt is the compatible form, and D31's re-open gate says when. | Refuse now |
| 6.6 | Reliability shown as vibes ("100K+ travelers"). | SS17 | Truegoing's Reliability is derived from receipts and no-shows (D22), shown as facts. Keep; PRD-04 (flakes shown to strangers) is under review. | Built |

## 7. Onboarding and permissions

| # | MigoMap does | Evidence | Takeaway | Status |
|---|---|---|---|---|
| 7.1 | 11+ screens before value; gender, hometown, photo, bio, social, notifications, rating, radar. | SS2–SS24 | Truegoing asks name, home area, interests (FEATURES.md:55-65) and asks for push after the first cast. Shorter and better. Keep it that way. | Built |
| 7.2 | Location asked *after* onboarding on a "Zoom in to explore" world map. | SS33 | Truegoing prefills the area from device location during onboarding and has a location pre-prompt (D40, P51). Keep. | Built |
| 7.3 | Notification pre-prompt with two benefits. | SS14 | Built: push asked on the cast-sent screen. | Built |
| 7.4 | "you're in, PS!" radar with faces and confetti. | SS24 | A personal arrival moment is worth having; faces of strangers and confetti are not (brand: no radar rings, no live avatars). Text only. | Add (text only) |
| 7.5 | Gender collected "to match you with the right people". | SS10 | Refuse the collection as done here (dating framing). Women-only casts would need gender and a decision; not before users (`08` §2.2). | Refuse / Decide later |
| 7.6 | Onboarding has no exit. | — | Same in Truegoing (UX-05 open). Fix. | Add |

## 8. Retention

| # | MigoMap does | Evidence | Takeaway | Status |
|---|---|---|---|---|
| 8.1 | Welcome DM from an official account presented as a 25-year-old person. | SS6, SS28 | A real message from the founder, as the founder, is fine and cheap. A brand persona with an age is a fabricated person; refuse. Support email is still a placeholder (D38/REL-16). | Add (real founder) |
| 8.2 | "Nearby activity" push within a chosen radius. | SS9 | PRD-05 open: Truegoing push is only reactive. Add "a new cast matches you" with a per-day cap and payload hygiene (IDs only). Pairs naturally with R1 reader radius. | Add |
| 8.3 | Trips: "heading to X", trending destinations. | SS20, SS32, SS36, SS38 | Refuse ("multi-city discovery" absent; competitive response B4). | Refuse |
| 8.4 | Stealth mode. | SS9 | Unnecessary: there is no people list to hide from. | Refuse |
| 8.5 | Refer and earn. | SS11 | Paid referral conflicts with "never inflate activity"; an unpaid invite link is fine later. | Refuse (paid) |
| 8.6 | Distance unit km/mi; MigoMap defaults to miles in India. | SS9 | Truegoing is km, `+91`, British spelling (DESIGN_SYSTEM.md:183-187). Keep. | Built |

## 9. Safety and moderation

| # | MigoMap does | Evidence | Takeaway | Status |
|---|---|---|---|---|
| 9.1 | Report sheet with reasons, "The user won't know who reported them", and an "Also block" toggle. | SS22 | Built: `report/[id].tsx` blocks in the same flow (competitive response §1 #2). Check the anonymity line exists in copy. | Built |
| 9.2 | "Not a dating app. Romantic messages get you banned." next to dating mechanics. | SS7 | Truegoing's boundary is structural (no people browsing, pair threads, place hidden). Keep the rule enforced, not just stated. | Built |
| 9.3 | Blocked users list in settings. | SS9 | Built (`Blocked` row on Profile, symmetric block D13, ledger D38). | Built |
| 9.4 | Community guidelines and safety tips reachable from settings. | SS13 | Built; also reachable from report flow since Tier A3. | Built |

## 10. Copy and visual

| # | MigoMap does | Evidence | Takeaway | Status |
|---|---|---|---|---|
| 10.1 | Warm, lowercase, conversational onboarding copy. | SS2, SS5, SS15 | Truegoing's voice is already lowercase-headline, dry, no exclamation marks (BRAND, DESIGN_SYSTEM). The warmth gap I saw was in the *old nearcast repo*, not in Truegoing. No change. | Built |
| 10.2 | Round-number social proof: "100+ people", "100K+ travelers", every trip "10 going". | SS17, SS27, SS38 | Refuse; brand "Avoid" list names these exact phrases. This is the pattern most likely to be copied by accident. | Refuse |
| 10.3 | Dark UI, purple accent, glass buttons over the map, 3D emoji. | SS27, SS16 | Brand is settled (Go Orange, Warm Cream, Ink Black; no purple gradients; light only D34). Glass exists already in the dock. Nothing to adopt. | Refuse / Built |
| 10.4 | Skeleton loaders; empty states that name an action. | SS1, SS3 | Built; empty ≠ failed is a fixed bug with history (`feed-page.tsx:139-175`); "make the first move" empty state done (Tier A2). | Built |
| 10.5 | Weekly billing pre-selected as "POPULAR"; "Upgrade Now 👋". | SS19 | If Truegoing ever charges (D47 venue offers are flat-fee to venues, not to users), never weekly by default, never emoji on a payment button. | Refuse |

---

## 11. Net result

- **Refuse (recorded so nobody copies it):** people list with distances, gender/age filters, paywalled people, one-tap join, group chat, "N going", popularity sort, PRO badges, profile views, pre-use rating prompt, trips, stealth mode, paid referral, round-number counts, fabricated persona.
- **Already built in Truegoing:** one-plan-per-screen feed, interest-gated delivery, report+block in one flow, safety lines in chat, place hidden until acceptance, short onboarding, location pre-prompt, empty ≠ failed, km and `+91`.
- **Add now (no decision needed):** default lens "this week"; fix or remove the dead verified mark; visible withdraw; joiner can leave; onboarding exit; revoke `may_see_place` on block/decline/withdraw (SEC-12); Meetup mode (SEC-14); proactive "matches you" push with a cap (PRD-05); relative-time wording; real founder welcome; label the Panchkula seed.
- **Decide first:** reader-side hearing radius (D51 draft in `08` §1); fixed published feed ordering (PRD-02); recurring casts; sub-interests (B1, needs users); selfie verification and women-only casts (not before users).

The order that matters: SMS provider → D51 + default lens + verified mark → SEC-12 → Meetup mode and push → the decisions that need users.

## Change log

| Date | Change |
|---|---|
| 2026-09-23 | Created: MigoMap takeaways checked against `mobileapp` at `d2959d7` |
