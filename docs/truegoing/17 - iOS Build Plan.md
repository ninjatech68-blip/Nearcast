# 17 - iOS Build Plan

**Written 2026-09-24.** How the first version gets built, in what order, and how each step proves it is done. Built from [`12`](./12%20-%20Truegoing%20Concept.md) to [`16`](./16%20-%20Data%20Rules.md). Each milestone names the screen contracts it implements (`15`), the laws it depends on (`16`), and one exit test a person can run on a phone. A milestone is not done until its exit test passes on a real device, in light and dark, at the largest text size, with the database tests green.

Plain summary first. Then the engineer's version.

---

## 0. In one paragraph

Eight milestones. The database comes first, because every rule lives there and the app is only a window onto it. Then the app grows in the order a person meets it: sign in and look, ask and post, accept and chat, confirm and record, women-only, the map, standing, then polish and the store. Nothing is skipped to go faster; the order is chosen so that at every milestone there is a working app that respects all four rules.

## 1. Stack and repository

| Layer | Choice | Why |
|---|---|---|
| App | Swift 6, SwiftUI, iOS 17 minimum | Native elements, sheets, Dynamic Type, dark mode for free; iOS 17 covers the phones that matter |
| Map | MapKit | Native, free, offline reverse geocoding to a neighbourhood name (`CLGeocoder`) |
| Backend | Supabase: PostgreSQL, Auth (phone OTP, Apple, Google), Realtime, Storage, Edge Functions | Carried; the rules already exist as SQL |
| Client to backend | `supabase-swift`, calling only the functions in `16 §4–5` | No table writes from the client, by construction |
| Push | APNs through the existing outbox worker | Identifiers only (L22) |
| Text messages | The SMS provider chosen in milestone 0 | Nothing works without it |
| Tests | XCTest for domain logic and snapshot tests for the six states; pgTAP for the database | The six states are tested as screenshots, not by eye |
| Repository | New repository `truegoing-ios`; database in `truegoing-db` ported from `mobileapp/supabase` | Clean slate for the app, carried rules for the data |
| Design tokens | One Swift file generated from `14 §4`; a test asserts no literal colour or size elsewhere | The design system has one source |

Architecture in one line: **domain rules as pure Swift with tests, one repository layer over Supabase, SwiftUI views that render state and call intents.** No view talks to the network.

## 2. Milestones

### M0 · Foundation (before any screen)

**Do:** choose and wire the SMS provider; create the two repositories; port the database per `16 §10` with the rename; write the structural law tests first (L1, L2, L15, L22) and make them pass over the new schema; set up CI that runs pgTAP, the Swift tests, the copy test and the contrast test on every change; generate the token file from `14`; draw the first thirty plan icons (`13` 2.1 vocabulary) as SF-Symbol-compatible SVGs.
**Depends on:** nothing.
**Exit test:** a phone receives a real code by text and the database accepts the verification. `db test` and `db contract` green with the 18 denied-path tests from `16 §7` written and failing where the feature does not exist yet.

### M1 · Sign in and look

**Contracts:** A1–A7, B1 (map, read-only), B2, B3 (read-only), G1 (empty), G6 (partial), H2, H3.
**Laws:** L1, L2, L8, L15, L16.
**Do:** phone and code; Apple and Google with name prefilled; name and date of birth; interests with sub-interests; neighbourhood with the one-shot location; optional photo; the Plans tab with map or list by density, persistent filters, cards with the why line; plan details sheet without the ask button; the unverified banner; the "Show more interests" line; offline banner and cached reads.
**Exit test:** a new person installs, signs in with Google, finishes onboarding in three screens, sees seeded plans on the map and list in their interests only, opens a plan and reads why they see it, switches to dark and largest text and everything still fits. An unverified Apple account sees all of this and cannot tap anything that writes.

### M2 · Ask and post

**Contracts:** B4, B5, C1–C4, E1 (Waiting, Your plans), E4, G4.
**Laws:** L6, L10, L16, L20 (refusal side only).
**Do:** the ask sheet with starters; share by link and the web landing page; the post sheet with live extraction to chips, missing-chip state, quick picks, where and when sheets, `Show on the map`, `For women only` hidden until milestone 5; posted toast honest about notifications; waiting rows with take-back; cancel and edit-until-frozen.
**Exit test:** a verified person posts "badminton at sector 5 courts tomorrow 7pm, need two" in under ten seconds and four taps; a second person sees it, asks with a starter in two taps; the host's Activity shows the ask; the plan's words refuse to change after that ask.

### M3 · Accept, chat, meet

**Contracts:** E1 (Needs you), E2, E3, F1, F2, D1, D2, D3, G5, H1 kinds 1–5.
**Laws:** L4, L7, L13, L14, L17, L18, L19 (handle later), L22.
**Do:** accept and decline on the row and in the push; the exact place unlocks; pair thread for capacity 1, room for capacity 2+, pinned plan with place, calendar and directions; safety opener; quick lines; photos and location; reply and reactions; read-only after 24 hours; "Did it happen?" with the follow-up; standing updates; block (mutual, leaves shared plans), report with evidence, blocked list.
**Exit test:** host accepts two people; both see the exact place and are in one room with the host; an asker who was not accepted cannot see the room or the place; one member blocks another and leaves the plan silently; after the plan's time all three answer "Did it happen?" and the host's showed-up rate changes accordingly.

### M4 · Standing (Layer 1)

**Contracts:** G1 full, D1 marks, H1 kinds 6–8.
**Laws:** L4, L8, L22.
**Do:** `person_standing` computed from receipts; showed-up rate on cards, details and profiles; `Regular host` after five plans that happened, with placement first in its area; weekly digest and monthly recap pushes; the "a plan you'd like" push capped at one a day; first-plan nudge.
**Exit test:** a host with five settled plans gets the mark and their plan sorts first among same-time plans; a person receives one digest on Friday and no more than one "a plan you'd like" per day.

### M5 · Women-only

**Contracts:** C1 (`For women only`), B3 restricted line, G6 declaration, D3 `in_women_plan`, H4 badge.
**Laws:** L20.
**Do:** the declaration switch; delivery, ask and detail gates; the card line; host removal; the one-strike path from a host-confirmed report to permanent removal and phone hold.
**Exit test:** a declared woman posts a women plan; a non-declared account never receives it, sees only the card line on a shared link, and cannot ask; a member reported by the host inside that plan is removed and cannot re-verify with the same number.

### M6 · Map browse and connected accounts

**Contracts:** B1 (`All`, browse why line, clusters), G3, D1 handles after acceptance, F1 header handles.
**Laws:** L15, L19.
**Do:** `plans_on_map` with viewport and cap; `Mine | All`; clusters with real counts; markers with plan icons only; the Instagram handle field; `handle_for` gate in profiles and thread headers.
**Exit test:** a person browsing `All` sees a plan outside their interests at its coarse point, asks, is accepted, and only then sees the host's handle; a blocked pair sees neither place nor handle.

### M7 · Polish and store

**Contracts:** every six-state snapshot; G7; H3; the moderation console (web, H4).
**Laws:** L9, L11, L12.
**Do:** VoiceOver pass on every control; Dynamic Type reflow at the largest accessibility size; Reduced Motion; haptics at the four moments only; offline queue for asks and messages; force-update and maintenance screens; account deletion with the 30-day phone hold; the moderation console with the report queue; App Store listing per `14 §10`; privacy nutrition labels (phone, name, coarse location by user entry, photos; no tracking).
**Exit test:** a TestFlight build passes an accessibility audit with zero errors, every screen's six states match their snapshots, a deleted account cannot come back for 30 days, and a report filed from a phone appears in the console within a minute.

### M8 (after launch) · Points (Layer 2)

**Laws:** L21. **Do:** `person_points` ledger, credits on `confirm_met`, the same-pair and weekly rules, the in-app spend (pin, frame, early access). Not before Layer 1 has a month of data.

## 3. Order and dependencies

```
M0 ─► M1 ─► M2 ─► M3 ─► M4 ─► M7 ─► store
                    │         ▲
                    ├─► M5 ───┤
                    └─► M6 ───┘
```

M5 and M6 can run in parallel after M3. M4 needs M3's receipts. M7 needs everything. M8 waits for real data.

## 4. Definition of done, per milestone

1. Every contract listed has all six states implemented and snapshot-tested in light and dark at default and largest Dynamic Type.
2. Every law listed has its denied-path tests passing in pgTAP, written before the code.
3. The copy test and the contrast test pass.
4. The exit test is run on a physical iPhone by someone other than the person who built it, and recorded (a screen recording or a short written log with the date).
5. Documents `12`–`16` still describe what was built; if the build changed a decision, the document changed first.

## 5. Seeding and the first city

The app is available everywhere from day one and works everywhere (iOS resolves any location to a neighbourhood name). Effort is concentrated in one city, to be named before M3's exit test, because that test needs real people in one place. Seed plans are real plans by real people the owner knows, labelled as such in the moderation console, never fabricated accounts (`08 §3.6` still applies).

## 6. Risks, named

| Risk | What it would do | Mitigation |
|---|---|---|
| SMS provider slips | Nothing ships | M0 gate; Apple and Google sign-in let people look while it is resolved |
| Extraction of what, where, when from a sentence is unreliable | Posting feels broken | Chips are always editable; quick picks cover when; the home neighbourhood covers where; a pure function with a test corpus of 200 real sentences before M2 |
| Rooms make blocking messy | Two people at one place | L18 test in M3 before the UI exists |
| Empty map on day one | App looks dead | Density rule falls back to list; seeding in one city; the digest brings people back |
| Icons look amateur | Ink palette feels cold | Icons are drawn by a designer, reviewed on the visual page before M1 |
| Self-declared women-only fails publicly | Trust damage | Truthful wording, host removal, one strike, and the vouch chain ready as an upgrade |

## 7. What is deliberately not in this plan

Android. Points before data. Partner rewards. Plan photos. Recurring plans. Waitlists. Multiple neighbourhoods. Text search. Widgets. iPad. Any of `13 §8`.

## 8. What the owner does next

1. Choose the SMS provider (M0 cannot start without it).
2. Name the designer for the icon set and the app icon.
3. Name the first city before M3.
4. Decide the four defaults in `16 §11` or accept them.

Everything else in this plan can start now.
