# P0 Implementation Plan: The Honest, Safe Loop

- **Status:** Active implementation plan since 2026-09-23. Governs task order only; product, data and design rules come from `03`–`06` in this folder.
- **Goal:** two people who have never met can sign in, one posts a plan, the other finds it on Nearby with a reason, taps "I'm in", they coordinate in a realtime chat, and the exact spot unlocks only for them. Nothing is fabricated and every privacy invariant is tested.
- **Exit:** an internal TestFlight build that passes the §4 exit gate on two physical phones.

> **For agentic workers:** execute tasks in order. Write the failing test first, make it pass, run the task's checks, then make one coherent commit per task. Run `npm run verify` before every commit and `npm run db:test` after any schema or RLS change. Do not start a task whose "Blocked by" list is not clear.

Tags: **[Certain]** verified in repo · **[Likely]** inference · **[Guessing]** estimate.

---

## 0. Scope

### In P0
| Area | Screens (from `04`) | Server (from `05`) |
|---|---|---|
| Sign-in | S01 Welcome, S02 Verify code | Apple + phone OTP auth |
| Onboarding | S04 Name/birthday, S05 Interests, S06 Location, S07 You're in | `complete_onboarding`, `set_home_area` |
| Discovery | S08 Nearby (map + list, sort, category chips, empty states) | `list_nearby_plans`, `nearby_density`, `feedback_not_for_me` |
| Plan | S11 Plan card, S12 Ask to join | `get_plan_card`, `join_plan`, `leave_plan`, `request_to_join`, `withdraw_request` |
| Post | S13 Post flow, S14 Posted | `create_plan_draft`, `reach_estimate`, `publish_plan`, fan-out |
| Host | S28 Manage plan (requests, going list, share spot, cancel) | `accept_request`, `decline_request`, `share_exact_spot`, `cancel_plan`, `remove_member` |
| Chat | S15 Chats, S16 Chat thread (text only, spot strip) | `send_message`, `mark_read`, `get_exact_spot`, Realtime |
| Notifications | Push for 5 types, routed by deep link | `register_device`, `notification_jobs`, `push-sender` |
| Safety | S26 Report and block, S27 Safety (first-join interstitial) | `report`, `block_user`, `unblock_user` |
| Account | S20 You (minimal), S25 Settings (subset) | `update_settings`, `delete-account` |
| Measurement | Funnel events | `track_event`, `analytics_outbox` |

### Deliberately not in P0
S03 public share page · S09 filters sheet · S10 search · S17 Meetup mode (P0 has the spot strip only) · S18 Showed-up check · S19 notifications inbox · S21 others' profiles (P0 shows a name/avatar sheet only) · S22 edit profile beyond name/photo · S23 connections · S24 Heading to · S29 verification · polls, photos in chat · vouches · recurring plans · dark-mode polish beyond tokens.

**Consequence:** women-only and verified-only need verification (S29), so they are **not settable in P0**. The columns and delivery filters ship in the migration so no later migration is needed; the Post flow hides the toggles until P2.

### One deviation from `03` §8
`03` puts push notifications in P1. **This plan pulls five push types into P0:** someone's in, someone asked to join, you were accepted, plan starts in 1 hour, spot unlocked. **Why:** [Likely] without them a host never learns someone joined unless they reopen the app, and the exit-gate test becomes meaningless. The inbox screen (S19) stays in P1.

---

## 1. Decisions and external blockers

Defaults are chosen so work can start. Change any of them before its task starts.

| # | Decision | Default | Blocks |
|---|---|---|---|
| E1 | Apple Developer account owns `com.truegoing.app` | Owner registers it | T0, T15 |
| E2 | SMS provider for phone OTP | A provider Supabase Auth supports natively that delivers in India (candidates: Twilio, Textlocal, Vonage). Confirm DLT registration requirements for India before choosing. [Likely] | T4 |
| E3 | Map library | `expo-maps` (Apple Maps on iOS, Google Maps on Android). Confirm against the Expo SDK 57 docs before T7; fall back to `react-native-maps` if a needed feature is missing. [Likely] | T7 |
| E4 | Google Maps API key (Android only) | Owner creates a restricted key | T7 (Android) |
| E5 | Area names | On-device reverse geocoding (`expo-location` `reverseGeocodeAsync`), stored as text. No paid geocoder in P0. | T5, T6 |
| E6 | Build service | EAS Build + EAS Submit to TestFlight | T15 |
| E7 | Push | Expo push service via `expo-notifications`; Edge Function sends | T10 |
| E8 | Supabase hosted project for staging | Owner creates a staging project; the app never gets a service-role key | T4 onward on device |
| E9 | Terms and Privacy Policy URLs | Placeholder pages are acceptable for internal TestFlight | T4 |

---

## 2. Tasks

### T0 · Rename to TrueGoing and reset identifiers ✅ 2026-09-23
**Files:** `app.config.ts` (replaces `app.json`), `package.json`, `package-lock.json`, `assets/brand/mark.svg`, `assets/images/*`, `src/app-config.test.ts`
**Blocked by:** E1 for registering the bundle ID with Apple (the code change was not blocked)

- [x] `app.config.ts`: `name` TrueGoing, `slug` truegoing, `scheme` truegoing, iOS `bundleIdentifier` and Android `package` `com.truegoing.app`, `userInterfaceStyle` `automatic`.
- [x] Variants via `APP_VARIANT`: `development` → `TrueGoing Dev`, `com.truegoing.app.dev`, scheme `truegoing-dev`; `preview` and `production` → store identity. **Unset means development**, so a build that forgets the variant fails loudly at submission instead of shipping as the store app. Unknown variants throw.
- [x] `package.json` and `package-lock.json` name `truegoing`.
- [x] Placeholder mark from `06` §2.2 in `assets/brand/mark.svg`; icon, Android adaptive foreground and monochrome, splash and favicon rendered from it.
- [x] Test: `src/app-config.test.ts` (7 tests) asserts identity per variant, system appearance, no Nearcast identity, and unknown-variant rejection.
- **Done:** `npm run verify` passed (lint, typecheck, 17 unit + 12 component tests, iOS bundle). `npx expo config` resolves both variants.
- **Decisions made in T0:**
  - The iOS Icon Composer bundle (`assets/expo.icon`, the Expo logo) was removed; iOS uses `icon.png`. A Liquid Glass icon can be added with the final artwork.
  - The Android adaptive background image was replaced by a solid `#0F5E46` background colour.
  - The dev deep-link scheme is `truegoing-dev`, so dev and store builds on one phone don't both claim `truegoing://`.
  - Splash has a dark background (`#0E1714`) as well as light (`#F7F3EA`).
- **Not verifiable here:** a native build on a device. The cloud container has no macOS/Xcode. The first EAS development build (T15 profile, can be run earlier) confirms the icon and bundle ID on a phone.

### T1 · New foundation migration ✅ 2026-09-23
**Files:** `supabase/migrations/20260923100000_truegoing_foundation.sql` (replaces the Nearcast foundation), `supabase/seed.sql`, `supabase/tests/database/truegoing_foundation.test.sql` (replaces the old suite), `src/infrastructure/supabase/database.types.ts`, `scripts/db-native/supabase_shim.sql`, `scripts/db-test-native.sh`
**Blocked by:** nothing.

- [x] All enums from `05` §3.
- [x] The 22 P0 tables, including `women_only`, `verified_only`, `connections_only`, `verified_at` and `check (not women_only or verified_only)`.
- [x] Helpers in `private`: `is_blocked`, `are_connected`, `is_friend_of_friend`, `is_verified_woman`, `reach_rank`, `can_see_plan`, `has_relationship`, plus four small lookup helpers that keep policies free of recursion.
- [x] RLS on every table per the `05` §5 matrix. Supabase's default grants are revoked first; clients get column-level grants only where the matrix allows writes.
- [x] Triggers: snapping (≈300 m grid + geohash-6), reach only widens, women-only host guard, `updated_at`.
- [x] Seed: 54 interests in 10 groups; three local-only personas named `Demo Host`, `Demo Joiner`, `Demo Outsider` (`@truegoing.local`). No plans seeded.
- [x] pgTAP, written before the schema: 79 assertions covering invariants 1, 2, 4, 5, 6, 7 (creation guard, brought forward from T6), 8, 10, 15 and 16, plus anon denial, blocking, membership chat rules and draft-only writes. Invariants that need later RPCs stay with their tasks: 12 in T6; 3, 13 and 17 in T8; 9 in T11; 18 in T12. 11 and 14 cover P1/P2 features.
- [x] Mutation check: removing the women-only visibility rule, granting delivery updates, or opening profiles to everyone each makes the suite fail.
- [x] `supabase db lint --level warning` on `public` and `private`: no findings.
- [x] Types regenerated with the Supabase `postgres-meta` generator.
- **Done:** `npm run verify` passes. `npm run db:test:native` passes 79/79.
- **How it was verified, and what is still open:** the Supabase Docker images could not be pulled in the cloud environment (registry downloads return 403). The suite ran on native PostgreSQL 16 + PostGIS + pgTAP through `scripts/db-test-native.sh`. That script uses a shim which emulates the Supabase roles, `auth.uid()` and default grants (`scripts/db-native/supabase_shim.sql`). **`npm run db:test` on the real Supabase stack (Postgres 17) has not run yet.** The CI `database` job runs it on the first pull request; treat that as the final gate for T1. The generated types omit the empty `graphql_public` schema that the CLI normally includes.
- **Spec deviations** are recorded in `05` §13.

### T2 · Pure domain modules
**Files:** `src/features/plans/domain/*.ts` (+ tests); delete `src/features/intents/`
**Blocked by:** T1 types (for shared enums)

Tests first for each:
- [ ] `plan.ts`: Zod schemas for a plan draft (type, text 1–500 trimmed, emoji, category, starts/ends with `ends > starts` and `starts > now − 1h`, capacity 1–200 or null, asks/offers force capacity 1).
- [ ] `reach.ts`: ordering, `canWiden(from, to)`, labels "Friends · Friends of friends · Nearby · Anyone in {city}".
- [ ] `relativeTime.ts`: exact rules in `06` §9.6 ("now", "in 20 min", "tonight 8 pm", "tomorrow 7:30 am", "Sat 6 pm", "12 Oct"), en-IN.
- [ ] `distance.ts`: "under 1 km", "≈ n km", unit from settings, never decimals.
- [ ] `counts.ts`: real integer ≥ 5, "a few" for 1–4, "≈" for estimates, nothing for 0 where copy says so.
- [ ] `reason.ts`: maps `reason_code` + params to the closed set in `06` §9.5; unknown code throws.
- [ ] `planCta.ts`: the S11 primary-button state machine (role × type × status × eligibility → label, enabled, reason).
- [ ] `errors.ts`: server error code → user copy (`05` §8 → `06` §9.8).
- **Done when:** unit tests cover every branch; no React Native or Supabase import in `domain/`.

### T3 · Design system for P0
**Files:** `src/design-system/tokens.json`, `tokens.ts`, `src/design-system/components/*`
**Blocked by:** T0 (appearance setting)

- [ ] Tokens: add the dark palette from `06` §3 (already specified), category tints, map colours, motion, haptics. Token test asserts AA contrast for every text/background pair in both themes.
- [ ] Fonts: UI on system fonts; Manrope only for `display` style. Remove the font gate from the root layout's hot path (`src/app/_layout.tsx:43`).
- [ ] Components with tests for every state they support: `CategoryTile`, `GoingStack` (no placeholder avatars; real count), `ReasonLine` (throws without a reason), `PrivacyStrip` (locked / unlocks-at / unlocked), `PlanRow`, `PrimaryPlanCTA` (drives from `planCta.ts`), `ReachDial` (locked stops, estimates, screen-reader output), `StatePanel` (loading skeleton, empty, error+retry, offline banner, restricted), `Sheet` (detents peek/half/full), `GlassIconButton` (map overlay only).
- [ ] Icon map from `06` §7.1 as a single `Icon` component (SF Symbols on iOS, Material Symbols on Android) with required `accessibilityLabel`.
- **Done when:** component tests pass in both themes; `native-demo` UI is no longer imported anywhere.

### T4 · Sign-in (S01, S02)
**Files:** `src/app/(auth)/welcome.tsx`, `verify.tsx`, `src/features/auth/*`, `supabase/config.toml`
**Blocked by:** E2 (phone), E8 (device testing), E9

- [ ] `config.toml`: enable Apple and phone sign-up with the chosen SMS provider; disable email/password sign-up for the app; keep anonymous off. Local development uses Supabase's test OTP numbers.
- [ ] Session store on `expo-sqlite` localStorage (already wired in `client.ts`); route guard sends signed-out users to `/welcome`, onboarding-incomplete users to `/onboarding/name`, others to Nearby.
- [ ] S01 and S02 exactly per `04`, including generic errors, 30 s resend countdown, 3-strike cool-down.
- [ ] Component tests for each state; an integration test against local Supabase for phone OTP with a test number.
- **Done when:** both providers sign in on a device against staging; returning user lands on Nearby in one screen.

### T5 · Onboarding (S04–S07)
**Files:** `src/app/onboarding/*`, `src/features/onboarding/*`; migration adds `complete_onboarding`, `set_home_area`, `nearby_density`
**Blocked by:** T4

- [ ] RPCs with pgTAP: under-18 raises `underage`; `set_home_area` stores a geohash-6 cell and never raw coordinates (assert no numeric lat/lng persisted); `nearby_density` returns buckets only.
- [ ] S04 name + birthday (picker defaults to 25 years ago), S05 interests (skippable), S06 location explainer → OS prompt (when in use) → manual area fallback, S07 density line (three variants) with no faces.
- [ ] Analytics events per `04`.
- **Done when:** a new account reaches Nearby in four screens with location granted and with it denied.

### T6 · Post (S13, S14) and fan-out
**Files:** `src/app/post/*`, `src/features/post/*`; migration adds `create_plan_draft`, `reach_estimate`, `publish_plan`, `private.deliver_plan`
**Blocked by:** T2, T3, T5

- [ ] Server first, tests first:
  - `create_plan_draft` validates, snaps, splits exact vs public place; asks/offers force capacity 1; `women_only` raises `women_only_not_allowed` for everyone in P0 (no one is verified yet).
  - `reach_estimate` returns buckets, never identities.
  - `publish_plan` is idempotent, version-checked (`stale`), creates the conversation and host membership, runs fan-out with a stored reason per recipient, respects blocks and restriction, enqueues no push for `plan_nearby` in P0 (that push type is P1).
  - pgTAP: invariants 4 (reason), 6 (reach), 7 (women-only cannot be created), 12 (idempotent publish).
- [ ] Client: six steps per S13 with local draft autosave; emoji auto-suggest from a static keyword map; map-pin location step on the same map component as T7; reach dial defaults to Nearby; attribute toggles for women-only/verified-only are hidden in P0; S14 confirmation with the real estimate.
- **Done when:** a plan posted on phone A with "Nearby" is delivered to phone B's account with reason "Near you" (verified by query); the exact point is not readable by B.

### T7 · Nearby (S08)
**Files:** `src/app/(tabs)/nearby.tsx`, `src/features/nearby/*`; migration adds `list_nearby_plans`, `feedback_not_for_me`
**Blocked by:** T6, E3, E4 (Android)

- [ ] `list_nearby_plans` returns `plan_card` view models (`05` §9) filtered by `can_see_plan`, with a reason on every row; missing deliveries are inserted with computed reasons. pgTAP: outsider sees nothing; blocked host's plans never appear; every row has a reason.
- [ ] Map: plan pins (CategoryTile + host avatar) at snapped points, clustering, the user's own dot only; glass overlay buttons (bell hidden in P0, recenter, list toggle).
- [ ] Sheet: title with count bucket, sort Soonest/Popular/Closest, category chips including Tonight; PlanRow list with ReasonLine and "Not for me" with 5 s undo.
- [ ] All empty variants: none nearby (with starter chips that open S13 pre-filled), filtered-zero, location-denied, offline cached with "Last updated".
- [ ] Map accessibility per `06` §11.
- **Done when:** component tests cover every state; on device, B sees A's plan pin and row within 10 s of publish (pull to refresh is acceptable in P0).

### T8 · Plan card, ask to join, manage plan (S11, S12, S28)
**Files:** `src/app/plan/[id]/*`, `src/features/plan/*`; migration adds `get_plan_card`, `join_plan`, `leave_plan`, `request_to_join`, `withdraw_request`, `accept_request`, `decline_request`, `remove_member`, `cancel_plan`, `share_exact_spot`, `get_exact_spot`, spot-unlock cron
**Blocked by:** T7

- [ ] Server tests first: join idempotent (12); capacity race (13); attribute checks; `not_available` identical across causes; request duplicates; requester isolation (17); spot locked before unlock and for non-members (3); host-only share; cancel notifies members.
- [ ] pg_cron jobs: plan start/end transitions and `spot_unlock` system message (`05` §7.9, P0 subset).
- [ ] S11 with the full primary-button state machine from T2, going stack, reason box, privacy strip, report entry; optimistic "I'm in" with rollback on `plan_full`; leave confirmation.
- [ ] S12 with disclosure copy and duplicate/offline states.
- [ ] S28 P0 subset: requests list with accept/decline, going list with remove, exact spot with "Share now", cancel with reason. Edit details and widen reach are P1.
- **Done when:** B taps "I'm in" on A's plan and both see B in the going list; B cannot fetch the exact spot until unlock or A shares it.

### T9 · Chats (S15, S16)
**Files:** `src/app/(tabs)/chats.tsx`, `src/app/chat/[id].tsx`, `src/features/chat/*`; migration adds `send_message`, `mark_read`, Realtime publication for `messages`, `conversation_members`, `plan_members`
**Blocked by:** T8

- [ ] Server: membership-driven conversation access; system messages for join, leave, spot unlocked, plan starting; rate limit 30/min; pgTAP for non-member denial and closed conversations.
- [ ] S15 list with segments All · Plans · Asks · Unread, previews redacting spot shares, empty state.
- [ ] S16 thread: realtime subscription, optimistic send with retry, offline queue, pinned plan strip with countdown → "Get directions" after unlock (opens the platform maps app), host-only "Share spot now", read-only after close. No typing indicators, no read receipts.
- **Done when:** a message from A appears on B's phone within 2 s; a non-member deep link shows "This isn't available".

### T10 · Push notifications (five types)
**Files:** `src/features/notifications/*`, `supabase/functions/push-sender/*`; migration adds `register_device` and job enqueueing in the P0 RPCs
**Blocked by:** T8, E7

- [ ] Types: `member_joined` (to host), `request_received` (to host), `request_accepted` (to requester), `plan_starting` (T−60 min, to members), `spot_unlocked` (to members).
- [ ] Payload schema `{ type, plan_id?, chat_id?, user_id?, reason_code? }` enforced by CHECK (invariant 15). Text is composed on device after an authorization check.
- [ ] Permission pre-prompt shown after the first "I'm in" or first post (per `03` §4.2), never during onboarding.
- [ ] Deep-link routing table from `04` §D, each re-checking access.
- **Done when:** on device, A receives "{B} is in · {plan}" within 10 s of B joining; tapping it opens S11.

### T11 · Safety (S26, S27)
**Files:** `src/features/safety/*`; migration adds `report`, `block_user`, `unblock_user`
**Blocked by:** T8

- [ ] `block_user` removes shared memberships and requests both ways, hides deliveries both ways, is idempotent; pgTAP invariant 9.
- [ ] S26 from plan card, chat header menu and name sheet; "Also block" toggle defaults on for Safety concern.
- [ ] S27 shown once before the first "I'm in"; reachable from the chat shield.
- [ ] Moderation stays service-role SQL in P0; document the manual review procedure in `docs/12` (partly superseded doc, still applies).
- **Done when:** after A blocks B, each sees "This isn't available" for the other's plans and profile sheet.

### T12 · You and settings (S20 minimal, S25 subset)
**Files:** `src/app/(tabs)/you.tsx`, `src/app/settings/*`, `supabase/functions/delete-account/*`
**Blocked by:** T4

- [ ] S20: photo (upload to private `avatars` bucket with signed URLs), name, age rule, area, upcoming plans (hosting and going), sign-out.
- [ ] S25 subset: Appearance, Distance unit, Push on/off, Blocked people (list + unblock), Safety tips, Terms, Privacy, Message the founder (mailto), Sign out, **Delete account**.
- [ ] `delete-account` Edge Function per `05` §7.1; pgTAP invariant 18.
- **Done when:** a deleted account's messages show "Former member" and its private rows are gone.

### T13 · Measurement
**Files:** `src/features/analytics/*`; migration adds `track_event`
**Blocked by:** T5

- [ ] `track_event` RPC with the outbox CHECK (invariant 15); client wrapper that only accepts the typed event list from `04`.
- [ ] Funnel: `welcome.view → verify.success → onboarding.complete → nearby.view → plan.view → plan.join | post.publish → chat.send`.
- [ ] A SQL view for the funnel by day. Shipping events to an external tool is P1.
- **Done when:** a full two-phone run produces the funnel rows with no forbidden properties.

### T14 · Remove the old prototype
**Files:** `src/features/native-demo/*`, `src/features/intents/*` (if not already removed), `src/app/(tabs)/{index,activity,broadcast,messages}.tsx`, `src/app/{create,preview}.tsx`, `src/app/intent/*`, `src/app/profile/*`, `src/app/request/*`, related tests
**Blocked by:** T7–T9 (replacements exist)

- [ ] Delete fixtures and old routes; tab layout is Nearby · Chats · Post · You.
- [ ] Grep gate: no user-visible "intent", "broadcast", "Nearcast", "match" strings remain (a test scans the string catalogue).
- **Done when:** `npm run verify` passes with the old code gone.

### T15 · Internal TestFlight and exit-gate run
**Files:** `eas.json`, release notes in `PROJECT_LOG.md`
**Blocked by:** all tasks; E1, E6

- [ ] EAS profiles: `development` (`com.truegoing.app.dev`), `preview` (internal), `production`.
- [ ] Staging Supabase migrated with the P0 migrations; seeded with interests only.
- [ ] Run the §4 exit gate on two physical iPhones (and one Android device if E4 is done). Record results in `PROJECT_LOG.md`.

---

## 3. Order, dependencies and estimate

```
T0 ─┬─ T1 ─ T2 ─┐
    └─ T3 ──────┼─ T6 ─ T7 ─ T8 ─┬─ T9 ─┐
T4 ─ T5 ────────┘                ├─ T10 ┤
T4 ─ T12                         └─ T11 ┼─ T14 ─ T15
T5 ─ T13 ───────────────────────────────┘
```

Rough effort for one full-time developer with AI assistance [Guessing]:

| Tasks | Effort |
|---|---|
| T0–T3 | 1.5 weeks |
| T4–T5 | 1 week |
| T6–T7 | 1.5–2 weeks (map work is the largest unknown) |
| T8–T9 | 1.5 weeks |
| T10–T13 | 1 week |
| T14–T15 | 0.5 week |
| **Total** | **7–8 weeks** |

That is longer than the 4–6 weeks estimated in `00` §6. The difference is push in P0, the full state coverage every screen now requires, and the privacy test suite. [Likely] Cutting either would make the exit gate untrustworthy.

---

## 4. Exit gate

All must pass on two physical phones against staging, recorded in `PROJECT_LOG.md`:

1. A new user signs in with phone OTP and with Apple, and reaches Nearby in four onboarding screens.
2. A posts a plan with reach Nearby in under 30 seconds using defaults.
3. B, who shares no connection with A, sees the plan on the map and list with "Near you" as the reason.
4. B taps "I'm in"; A receives a push within 10 s; both see B going.
5. They exchange messages in realtime (under 2 s).
6. B cannot see the exact spot until unlock time or until A taps "Share spot now"; then B can get directions.
7. B reports and blocks A; both see "This isn't available" for each other.
8. B deletes the account; A's chat shows "Former member".
9. `npm run verify` and `npm run db:test` pass, including every privacy invariant listed in T1–T12.
10. No screen shows a fabricated number, a person's location, or a person list. Reviewed by hand against `04` §A.

---

## 5. Risks

- **[Likely] Map work overruns.** Clustering, custom pins and sheet interaction are the most device-specific work. If it slips, ship P0 with the list first and the map toggle second; do not ship a map that draws people.
- **[Likely] India SMS delivery.** Transactional SMS in India requires DLT registration of sender and templates, which can take days to weeks. Start E2 immediately.
- **[Likely] Empty staging.** The exit gate only proves the loop works; it says nothing about density. The hosts programme (`03` §5) must run in parallel.
- **[Guessing] Realtime limits** on the Supabase plan chosen for staging; check connection limits before inviting testers.

## Change log

| Date | Change |
|---|---|
| 2026-09-23 | Created the P0 implementation plan |
| 2026-09-23 | T0 complete |
| 2026-09-23 | T1 complete (native Postgres verification; real Supabase run pending in CI) |
