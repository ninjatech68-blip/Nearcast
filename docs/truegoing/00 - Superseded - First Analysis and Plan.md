> **Superseded.** Kept for the record. Its findings are carried into `01`; its plan is replaced by `03`–`06`.

# TrueGoing (Nearcast) vs MigoMap: Analysis and Plan

Prepared 2026-09-23. Read-only: no code in the repo was edited or committed.

Confidence tags:
- **[Certain]**: verified in code (file:line), in the running build, or in the MigoMap screenshots (SS#, in upload order 1–38).
- **[Likely]**: a strong inference.
- **[Guessing]**: filling a gap.

---

## 0. Start here

**[Certain]** TG does not have a product yet. What exists is a clickable mock.

- No screen reads from or writes to the backend. `src/infrastructure/supabase/client.ts` creates a client, and no file imports it.
- There are no `.from(` / `.rpc(` / `supabase.auth` calls anywhere in `src/`.
- Every screen renders hardcoded fixtures from `src/features/native-demo/nearcast-fixtures.ts`.
- The main CTA, "Broadcast intent", is `onPress={() => undefined}` (`src/app/preview.tsx:57`).
- "Send request" only calls `router.back()` (`src/app/request/[id].tsx:26`).

So the comparison is not "TG's UX vs MigoMap's UX". It is **MigoMap's working core loop vs a TG loop that doesn't exist yet**. The gap is not polish. It is auth, publish, discovery, join, chat and notifications.

**[Certain]** TG's schema also can't represent MigoMap's core object, a group activity with several people "going":

- `matches.intent_id` is `unique`, so an intent gets at most one match (migration `supabase/migrations/20260824161306_nearcast_foundation.sql:123`).
- `accept_response` sets the intent to `matched` after the first acceptance (same file, 329-346).
- MigoMap's whole feed is "2 going", "10 going", "19 going" (SS23, 25, 30, 36, 38).

That makes this a data-model decision, not a UI decision. It is the first thing you need to decide (§8, D1).

**[Likely]** TG's "trust-first" reach ladder defaults to `origin_only` (migration :83). There is no friends or trust-graph table, even though the reason codes `adjacent_trust_connection` and related ones assume one (migration :101).

The consequence: a new user in a new city will see an empty feed. MigoMap avoids that by showing an open map of strangers' activities, plus a welcome DM from its own account (SS6, SS8).

TG's differentiator is also its biggest cold-start problem. The plan has to solve that before it spends effort on screens.

---

## 1. Evidence base and its limits

| Source | What I did | Limit |
|---|---|---|
| MigoMap | Reviewed all 38 screenshots | No flows beyond the screenshots; no data on their user counts. |
| TG app | Read all 20 files under `src/app`, `src/features` and `src/design-system/components`. Built the web export and captured 9 routes in headless Chromium (screenshots in `tg-captures-2026-09-23/`). | **No iOS simulator.** The container is Linux with no `xcrun`. On web, SF Symbols fall back to single letters ("FY", "S", "W"), so icons in the captures are wrong. Layout and copy are right. |
| TG backend | Read the single migration, the seed, the pgTAP tests and `config.toml` | `[path/repo]` was never provided. **[Certain]** No separate backend exists in this repo: there is no `supabase/functions/` and nothing server-side except SQL. |
| TG data/analytics | Nothing | `[access details]` was never provided. **[Certain]** The only analytics artifact is the `analytics_outbox` table (migration :204-213). Nothing writes to it. There are no users and no metrics to query. |

---

## 2. MigoMap teardown

### 2.1 The core loop

**[Certain]**, from the screenshots: see a map of activities near you → tap one → "I'm in" → group chat → meet.

The supporting screens:

- **Home = map of activity pins.** Each pin is an emoji plus the host's avatar (SS27). There is a "See list" button, a search button, a big "+" to create, and a recenter button.
- **List sheet: "17 Activities Here".** Sort by Popular; category chips All / Food / Outdoor. Each row shows emoji, title, distance · category, time ("now", "tomorrow", "on Saturday"), avatars and "N going" (SS30).
- **Activity card:** "{Name} wants to {text} {time}", then "2 going 🎉" with avatars, one green **"I'm in"** CTA, and report / share / close (SS25).
- **Create (a bottom sheet over the map):**
  1. emoji plus "WANT TO" free text (SS35)
  2. type, from 13 categories (SS34)
  3. location, by moving the map under a fixed pin (SS37)
  4. time (not captured)
- **Chats:** tabs All / Unread / Activities / DMs / Groups (SS6). The composer has Camera, Gallery, Poll and Location (SS8). A shield button opens the Safety sheet (SS7).
- **Trips:** "Trending" destination cards ("Bir · Sep · 10 going") (SS38). A "Where to?" search with "N going" per city (SS20). Dates or Flexible (SS32). "My Trips: Chandigarh, in 9 days" (SS36).
- **People Nearby:** "100+ People Nearby", a list of named faces with **exact distance** ("Diya Malik, Panchkula, 3.6 mi") (SS23). There is a filter for gender, age 18–65 and interests (SS16).

### 2.2 Onboarding

**[Certain]** A user goes through 11 or more screens before seeing value:

1. Welcome (SS31)
2. Apple or phone sign-in
3. Name and birthday (SS12)
4. Gender (SS10)
5. Interests (SS18)
6. Hometown (SS5)
7. Photo (SS2)
8. Bio and one social link (SS15)
9. Notification pre-prompt (SS14)
10. **Rating prompt with testimonials** (SS17)
11. "You're in, PS!" radar (SS24)
12. Location permission, asked on the map after onboarding (SS33)

### 2.3 Growth and monetization mechanics

- **[Certain]** A "migomap pro" paywall: ₹299/week pre-selected as POPULAR, 1 Month, 1 Year (SS19). Features: see all nearby travelers, message anywhere, who viewed you, advanced filters, priority listing, read receipts.
- **[Certain]** A **gender-filter paywall**: "59 people found · Female · Upgrade to Premium to see everyone… unlock filtered results" (SS21).
- **[Certain]** Retention and engagement hooks: a profile-views counter (SS26), profile completeness "33%" (SS26), "Get verified: one selfie" (SS26), Refer and Earn (SS11), and Stealth Mode, "Hide from the nearby list" (SS9).
- **[Certain]** Trust and safety surfaces:
  - A Safety sheet: "MigoMap is not a dating app… Romantic messages get you banned" (SS7).
  - Report Event with a one-toggle "Also block {name}" and "The user won't know who reported them" (SS22).
  - Blocked Users, Community Guidelines and Safety Tips in Settings (SS9, SS13).
- **[Certain]** Cold-start devices:
  - An official verified account DMs every new user (SS6, SS8, SS28).
  - Aggregate counts appear everywhere: "100+ people", "100K+ travelers", "19 going".

### 2.4 What MigoMap does well (worth adopting)

1. **One verb.** "I'm in" is a single tap. There is no application or approval step for low-stakes plans (SS25). **[Certain]**
2. **Create is a sentence.** "Want to ___" plus an emoji (SS35). It takes about 10 seconds. **[Certain]**
3. **Time is relative and scannable:** "now", "tomorrow", "on Saturday" (SS30). **[Certain]**
4. **Location is picked by moving the map under a fixed pin** (SS37). That is simple and gives an approximate point naturally. **[Certain]**
5. **Report and block in one sheet**, with an anonymity reassurance (SS22). **[Certain]**
6. **The welcome DM makes the inbox non-empty on day one** (SS6). **[Certain]**
7. **Skeleton loading states** (SS1) and **friendly empty states**: "Nothing here yet", "No friends yet" (SS3, SS4). **[Certain]**

### 2.5 Where MigoMap is weak (TG's opening)

1. **A "not a dating app" message next to dating-app mechanics.** The safety sheet says it is not a dating app (SS7). Meanwhile, a gender filter is the paid upsell (SS21), gender is collected so the app can "match you with the right people" (SS10), and there is a faces-and-distance people list (SS23). **[Certain]** that all of these coexist. **[Likely]** women receive unwanted attention, and the product pushes that way.
2. **Exact distance to named, photographed individuals** (SS23). **[Likely]** repeated readings from different positions can triangulate someone's home. That is a real safety liability.
3. **Asking for a rating before the user has done anything** (SS17). This comes right after the notification prompt. **[Likely]** it produces inflated ratings and may run into App Store review-prompt guidelines. **[Guessing]** on how Apple would enforce it.
4. **Onboarding is 11+ screens before value** (§2.2). **[Likely]** drop-off is high. I have no data.
5. **A copy template bug:** "Saransh **wants to Looking for** a morning cycling partner" (SS25). The prefix "wants to" is joined to free text. **[Certain]**
6. **The default plan is weekly billing, labelled POPULAR** (SS19). **[Likely]** it generates refund and churn complaints.
7. **Counts can't be verified:** "100+", "100K+ travelers", "10 going" on every trending trip (SS17, SS38). **[Guessing]** on whether they are inflated. The identical "10 going" on every card is suspicious.
8. **Location is asked for after onboarding, on a "Zoom in to explore" world map** (SS33). The app's main surface is useless until the user grants it. **[Certain]**

---

## 3. What TG actually is today

### 3.1 App (all [Certain])

| Area | State | Evidence |
|---|---|---|
| Tabs | For You, Activity, Broadcast (redirects to /create), Messages, You | `src/app/(tabs)/_layout.tsx:46-50`, `broadcast.tsx:4` |
| Feed | 2 hardcoded cards. The "Nearby" / "All intents" pills can't be pressed. | `src/app/(tabs)/index.tsx:19-26` |
| Intent detail | Ignores `id`; always shows the badminton fixture. "Not relevant" has no handler. | `src/app/intent/[id].tsx:6,16-21`; `native-ui.tsx:155` |
| Create | Primitive chips plus text (≤500) → Review. The composer does not use the Zod schema. | `src/app/create.tsx:9-60`; imports the type only, `:7` |
| Review / reach | 4 reach rows. "Adjacent network" is always selected and can't be changed. Publish is a no-op. | `src/app/preview.tsx:8-13,39,57` |
| Request | The note input is never read. Send just closes the sheet. | `src/app/request/[id].tsx:19,26` |
| Activity / Messages / You | Static rows; nothing can be pressed; no chat thread route | `activity.tsx`, `messages.tsx`, `you.tsx:20` |
| Missing entirely | Auth, onboarding, location, map, push, chat send, search, filters, settings, block/report UI, profile editing, photos, persistence | grep over `src/` |
| UI states | Loading: only the font gate (`_layout.tsx:43`). Disabled: only "Review intent". Empty: hardcoded rows, not conditional. **No error, offline or restricted state anywhere.** | agent inventory, cited files |
| Visual direction | Light, green-accent, card-based "native minimal" | captures in `tg-captures-2026-09-23/`; `src/design-system/tokens.json` |

### 3.2 Backend: what the code enforces (all [Certain], `M` = the migration file)

**Good foundations to keep:**

- RLS is on for all 19 tables (M:401-419).
- Exact location, address and contact are split into `intent_private`, which only the owner can read (M:72-79, 452-453).
- A delivery reason code and text are stored per recipient (M:97-107).
- `accept_response` is a security-definer function. It is idempotent, row-locked, has a stale-state guard and checks blocks (M:277-350).
- The share projection `get_public_intent` returns only safe fields (M:352-399).
- An analytics CHECK bans intent text, messages, coordinates, contact details and group names from event properties (M:212).
- Clients can only write `draft` intents (M:440-444). Every lifecycle transition therefore has to go server-side.

**Holes the plan must fix before any real user data exists:**

1. **Delivery re-pointing.**
   - `deliveries_update_recipient` checks only `recipient_id = auth.uid()` (M:479-480).
   - UPDATE is granted table-wide (M:535-539).
   - So a recipient can change `intent_id` on their delivery row to any intent. `can_read_intent` then lets them read it. That breaks reach control.
2. **`responses` update** has the same issue: `intent_id` isn't pinned (M:499-501).
3. **Self-unrestriction.** `profiles_update_self` isn't column-limited, so a user can set their own `is_restricted = false` (M:425-426).
4. **Disclosures.** Either party can insert a `match_disclosures` row for any field (M:505-508). There is also no way for the other party to read disclosed values, so the disclosure feature can't work.
5. **Share projection.** `get_public_intent` ignores the broadcaster's `is_restricted` flag and blocks (M:352-399).
6. **No server transitions** for publish, withdraw, resolve, expire, restrict or expand-reach. There is no fan-out and no cron. **No delivery can ever be created**, because `intent_deliveries` has no INSERT policy and no function inserts into it. The feed is structurally impossible today.
7. **Missing wiring:**
   - Realtime is enabled but no table is published.
   - No storage buckets exist.
   - Phone auth is disabled (`config.toml:257-259`) and Apple auth is disabled (`config.toml:322-324`).
8. **Test coverage is 9 pgTAP assertions**, mostly `has_table` / `has_function`.
   - Nothing tests `accept_response`, blocks, responses, messages or match RLS.
   - An "outsider" user is created and never tested (`supabase/tests/database/nearcast_foundation.test.sql:15`).
   - The domain test named "future expiry" doesn't check the future (`intent.test.ts:10` vs `intent.ts:11-16`).

**Schema gaps against the MigoMap feature set:**
- friends / trust graph
- interests
- DOB / age (needed for an 18+ gate)
- bio
- photos
- verification
- multi-participant attendance and capacity
- in-app notifications
- push tokens
- subscriptions
- moderator roles

---

## 4. Gap matrix

| Capability | MigoMap | TG today | Recommend for TG |
|---|---|---|---|
| Sign-in | Apple, phone | None | **Build:** Apple + phone OTP |
| Onboarding | 11+ steps | None | **Build, but ≤4 steps:** name, DOB (18+), interests, location. Defer photo and bio to after the first join. |
| Discovery surface | Map of activity pins plus a list | Static list | **Build:** list first, map second. **Pins show activities, never people.** |
| Create | Emoji + "want to" → type → map pin → time | Primitive + text, then a no-op | **Adopt MigoMap's shape.** Keep TG's reach step as one clear choice. |
| Join | One-tap "I'm in" | Request form, no-op | **Build both:** "I'm in" for open plans, request/approve for requests and offers (see D1). |
| Group attendance ("N going") | Yes | Impossible (unique match) | **Schema change** (D1) |
| Chat | Groups + DMs, media, poll, location | Static | **Build:** a group chat per activity, text only first, realtime |
| Notifications | Pre-prompt + push | None | **Build:** push tokens + `notification_jobs` worker + inbox |
| Report / block | One sheet, anonymous | Tables only | **Build UI now.** It is non-negotiable before launch. |
| People-nearby list with exact distance | Yes, gated by paywall | None | **Don't build.** Safety liability, and it contradicts TG's rules. |
| Gender-filtered people paywall | Yes | None | **Don't build.** |
| Rating prompt before use | Yes | None | **Don't build.** Ask after the first completed meetup (`interaction_outcomes.completed`). |
| Aggregate counts ("100+ people") | Everywhere | None | Show **only real counts**, computed server-side. Show nothing below a threshold instead of inflating. |
| Trips | Yes | None | **Later** (phase 3). A different loop; not core. |
| Profile views, stealth mode, refer and earn, Pro | Yes | None | **Later or never.** Monetize after retention exists. |
| Verification selfie | Yes | None | **Later** (phase 3). A strong trust feature, fits the TG thesis. |
| Welcome DM / cold-start content | Yes | None | **Build a TG version:** a real host-seeded "starter plans" program in the launch city, labelled truthfully. No fake users. |

---

## 5. Strategy

**Don't clone MigoMap.**

- **Why:** MigoMap already has users, network effects and the same concept. A copy with fewer users loses on every screen, because the product *is* the density of nearby activity.
- **What I'd do instead:** beat MigoMap on **safety and trust for people it serves badly**. The clearest group is women and solo travelers, who are exposed by its faces-and-distance list and gender paywall (§2.5). Copy MigoMap's *interaction speed* (one-sentence create, one-tap join, relative times, map pin) and refuse its *exposure mechanics*.
- **Risk in the clone approach:** you spend months reaching parity and still have an empty map in your launch city.

**Concretely, TG's position:** "Plans near you, from people you can trust. Nobody can see where you are."

- **Activities are discoverable; people are not.** Show no people list and no user location. Show approximate area only, which is already enforced by the `intent_context` / `intent_private` split.
- **Every card says why you're seeing it**, using the stored `reason_text`. **[Certain]** this is already in the schema and already designed in the UI (`native-ui.tsx:73`).
- **The trust ladder becomes a visible filter, not a wall.** At launch, most plans will be "Nearby" (reach `nearby_relevant`), chosen explicitly at publish time. That choice is an informed user action, so it satisfies the reach rule. "Friends / friends-of-friends" lanes light up as the graph grows. This fixes the cold-start problem in §0 without abandoning the thesis.

**[Likely]** Launching in one city, with seeded real hosts, beats a global map. MigoMap's "Zoom in to explore" world map (SS33) shows the empty-world problem even for them.

---

## 6. Plan

Each phase is shippable and has acceptance criteria. Nothing below is implemented until you approve.

### Phase 0: make the foundation safe (backend only, ~1 week) [Likely estimate]

1. Pin `intent_id` and the other immutable columns:
   - Either revoke UPDATE on `intent_deliveries` / `responses` and expose `hide_delivery()` / `mark_not_relevant()` / `withdraw_response()` as definer RPCs,
   - or use column-level grants.
2. Stop users from changing `profiles.is_restricted`, via column grants.
3. Fix disclosures:
   - Only the broadcaster can release a field.
   - Add `get_disclosed_details(match_id)` so the participant can read released fields.
4. `get_public_intent`: exclude restricted broadcasters.
5. pgTAP coverage for every allowed **and denied** path:
   - an outsider can't read the intent
   - blocked users can't respond
   - the re-point attack fails
   - `accept_response` idempotency and stale state
   - message RLS
6. Fix the "future expiry" domain test.

**Accept when:** `npm run db:test` covers every policy, both allowed and denied, and all tests pass. The re-point exploit test fails before the fix and passes after it.

### Phase 1: the real core loop (~4–6 weeks) [Likely estimate]

The goal: one person posts, a nearby person joins, both chat, and nothing is fake.

1. **Auth:** Apple + phone OTP. Enable them in `config.toml` and pick an SMS provider.
2. **Onboarding (≤4 screens):**
   - name
   - DOB with an 18+ gate (new `profiles.birth_date`, stored privately; show age only)
   - interests (new table)
   - location permission, **with its own explainer, asked before the feed** (the opposite of SS33)
3. **Schema for group plans (D1):**
   - an `intent_participants` table with `capacity`
   - `join_intent()` / `leave_intent()` definer RPCs that are idempotent, check blocks, capacity and expiry
   - keep `responses` + `accept_response` for request/offer intents that need approval
4. **Publish and fan-out:**
   - `publish_intent()` handles draft→live and requires an explicit reach choice
   - `deliver_intent()` writes `intent_deliveries` with a human `reason_text` for nearby recipients, using the approximate geography and the recipient's coarse home area
   - a cron job expires intents
5. **Feed:** a real `For You` list backed by deliveries.
   - Relative time ("now", "tonight", "Sat").
   - Approximate area, "N going" (real counts), and the reason line.
   - Every UI state: loading skeleton, empty, error, offline, restricted.
6. **Create, rebuilt on MigoMap's shape:**
   - "I want to…" sentence + emoji
   - category
   - time
   - map-pin location, stored as approximate geography, with the exact point in `intent_private`
   - one reach choice
   - publish
   - Fix the phrasing so templates can't produce "wants to Looking for".
7. **Join:** "I'm in" for open plans; "Request to join" for approval-needed ones.
8. **Chat:** one group conversation per intent. Text only, realtime publication on `messages`, unread tracking.
9. **Safety:**
   - report + optional block in one sheet (MigoMap's SS22 pattern)
   - blocked-users list
   - a safety sheet before the first meetup
10. **Analytics:** a writer for `analytics_outbox`, plus an activation funnel of signup → first feed view → first join or post → first message → first completed meetup.

**Accept when:**
- Two real accounts on two devices complete post → join → chat, with realtime delivery.
- Every negative permission path has a pgTAP test.
- `npm run verify` passes.
- Activation events arrive with no banned properties.

### Phase 2: retention and discovery (~3–4 weeks)

1. A map view of **activity** pins, with list/map toggle. No people.
2. Push notifications: a device-token table, a `notification_jobs` worker (Edge Function), and a pre-prompt shown **after** the first join.
3. An in-app notifications inbox, including Requests and Plans tabs.
4. Settings: distance unit, notification radius, blocked users, sign-in methods, delete account (an App Store requirement), legal pages.
5. Search and category filters on the feed.
6. A post-meetup "How did it go?" outcome (`interaction_outcomes`). **Ask for the store review only after a positive outcome.**

### Phase 3: trust depth and second loop

1. Profiles: bio, interests, photos (a storage bucket with RLS), completeness.
2. Selfie verification, as a badge. This fits TG's trust thesis better than it fits MigoMap's.
3. A friends / trust graph, so the `adjacent_network` reach lane has real meaning.
4. Trips: "I'm heading to X on dates" → plans there.
5. Monetization, once D30 retention exists. Candidates: host tools, boosted plans, or a TG-appropriate Pro. **Never** gender-gated people access.

### Explicitly not building

- A people-nearby list or exact distances to people
- A gender filter as a paid unlock
- Pre-use rating prompts
- Unverifiable or inflated counts
- A weekly-billing default

---

## 7. Metrics

**[Certain]** None exist today. Define these before Phase 1 ships:

- **Activation:** % of signups who join or post within 24h.
- **Core loop:** % of live intents that reach ≥2 going; median time from publish to first join.
- **Liquidity (per city):** live intents within 5 km at peak hours. Below a threshold, the feed feels empty.
- **Safety:** reports per 1,000 messages; block rate; % of reports actioned within 24h.
- **Retention:** D1 / D7 / D30. Compare users with a completed meetup against users without one.

---

## 8. Decisions I need from you

- **D1: What is a TG intent?**
  - **(a)** Group plans with N participants and capacity (MigoMap-style "I'm in").
  - **(b)** 1:1 request/offer with approval (the current schema).
  - **(c)** Both, chosen by primitive.
  - **I recommend (c):** `plan` = open group; `request` / `offer` = approval.
  - This changes the schema, so it has to be settled first.
- **D2: Launch reach default.** I recommend an explicit choice at publish, with "Nearby" highlighted, because TG has no trust graph yet. The alternative is "trusted circles first", which [Likely] means an empty feed at launch.
- **D3: Launch geography.** One city (I recommend Chandigarh/Tricity: MigoMap is active there, per SS23/SS27/SS30, which proves demand) or open everywhere.
- **D4: Visual direction.** TG's light, green, card-based UI vs MigoMap's dark, map-first UI. [Likely] the map-first home is part of why MigoMap feels alive. I'd keep TG's visual language but make the map a first-class tab in Phase 2, not the home screen. That is a judgment call.
- **D5: Governing docs.** The plan changes documented behavior: group plans, auth methods, onboarding fields (DOB, interests). Per AGENTS.md, the docs are updated before behavior changes. Do you want that done as Phase 0.5, or should I treat the docs as secondary?
- **D6: Backend and data access.** Confirm that no separate backend repo or analytics store exists. If one does, parts of §3 are incomplete.

## Change log

| Date | Change |
|---|---|
| 2026-09-23 | Created and saved to the repo |
