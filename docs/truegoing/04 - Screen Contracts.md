# TrueGoing Screen Contracts (Reimagined Product)

## Document control

- **Status:** Proposal, saved to the repo 2026-09-23. Nothing here is implemented. Not yet authoritative; see `README.md` in this folder.
- **Based on:** *03 - TrueGoing Reimagined.md* (product), *02 - Comparison - Experience UI Copy Table.md* (evidence).
- **Supersedes if adopted:** `docs/15 - Mobile Screen Contracts.md`. Screens keep the same contract shape so the team's habits carry over, but the screens themselves are new.
- **Not in scope:** schema DDL, API signatures, visual design tokens. Where a screen needs a server call, it is named in domain terms (e.g. `join_plan`) so the API spec can be written against it.

## How to read a contract

Every screen has the same eleven fields:

1. **Route and presentation** (Expo Router path; tab, push, modal, or sheet)
2. **The one decision** the screen exists to help the user make
3. **Entry points → Exits**
4. **Reads / Writes** (domain data, and whether the write is a server-controlled transition)
5. **Layout**, top to bottom
6. **Actions → Outcomes**
7. **States:** loading · empty · error · offline/queued · disabled · restricted. Every data screen must define all six.
8. **Copy:** exact user-visible strings. Placeholders in `{braces}`.
9. **Privacy rules** specific to this screen
10. **Events:** analytics event names and allowed properties
11. **Acceptance criteria**

---

## G. Global contracts (apply to every screen)

### G1. States
- **Loading:** skeleton rows that imply *shape only*. Never a skeleton avatar count that suggests people who don't exist, and never a placeholder number.
- **Empty:** a heading, one sentence, and one action. Empty states are honest: "Nothing near you yet", not a busy-looking placeholder.
- **Error:** what failed in plain words, a **Retry** button, and the last good content if any.
- **Offline/queued:** a banner "You're offline. We'll send this when you're back." Reads show cached content with a "Last updated {time}" line. Writes that are safe to queue (message, "I'm in", "Not for me", show-up confirmation) queue locally and show a clock icon until confirmed. Writes that are not safe to queue (post, cancel, block, report, delete account) are disabled offline with the reason shown.
- **Disabled:** consequential buttons stay disabled with a one-line reason under them until requirements are met. Never a silent disabled state.
- **Restricted:** a user whose account is restricted sees plans and chats they are already in, but cannot post, join, or connect. Each blocked action shows "Your account is limited right now. Contact support." The reason is never shown in-app (moderation detail stays private).

### G2. Privacy rules
- **No people list anywhere.** The only places another person appears are: on a plan they host or are in, in a chat you share, in your connections, in a report/block context.
- **No user location anywhere.** Not on the map, not as a distance, not as "last seen". Distance appears only for *plans*, rounded: "under 1 km", "≈ 3 km", "≈ 8 km".
- **Approximate place only** for plans. Public copy is the area name and a grid-snapped point. The exact spot is shown only in Meetup mode to people going, and only after the host set it.
- **First name only** for anyone you haven't connected with. Full display name after connection.
- **Every card that reaches you shows why.** No card renders without a reason line.
- **Counts are real or absent.** Counts under 5 render as words ("a few"). Estimates are labelled "≈".
- **Push payloads** carry only object IDs, a type, and a reason code. No plan text, message text, coordinates, contact details, or names of private circles.

### G3. Copy rules
- Sentence case everywhere. Headlines may be lowercase in onboarding only.
- Verbs on buttons: *I'm in · Ask to join · Post · Send · Connect · Report · Block*. Never "Submit", "OK", "Broadcast".
- Nouns: **plan / ask / offer**, **host**, **people going**, **connection**. Never "intent", "broadcaster", "recipient", "match".
- Say what is shown and what is hidden in the same sentence whenever privacy is at stake.
- One emoji maximum per screen heading; none in body text, buttons or errors.

### G4. Accessibility
- Minimum 44×44 pt targets, 48×48 for primary actions.
- Every icon-only button has an accessibility label.
- Dynamic type up to XXL without truncating privacy or safety copy.
- State is never colour-only: a reason line, badge text or icon accompanies it.
- Reduced motion disables the map fly-in, confetti and skeleton shimmer.
- Sheets are dismissible by drag, by the close button, and by VoiceOver escape.

### G5. Analytics
- Event names are `screen.action` in snake case.
- Allowed properties: IDs, enums, counts, durations, reach level, category, reason code, plan type.
- Forbidden properties, enforced server-side: plan text, message text, coordinates, contact details, private circle names, display names.

### G6. Theme
- System / Dark / Light, defaulting to System. Every screen must be checked in both.

---

## N. Navigation map

**Unauthenticated:** `welcome` → `verify` → onboarding. `p/[slug]` (public plan page) is reachable without sign-in.

**Onboarding (stack, no tab bar):** `onboarding/name` → `onboarding/interests` → `onboarding/location` → `onboarding/done` → `(tabs)/nearby`.

**Tabs (4):** `nearby` · `chats` · `post` (opens a modal, never a screen) · `you`.

**Sheets over Nearby:** filters, search, plan card, ask-to-join, report, safety.

**Pushed screens:** chat thread, profile, connections, heading-to, notifications, settings and its children, manage plan, verification, edit profile.

**Full-screen modals:** post flow, meetup mode, showed-up check.

**Deep links:** `truegoing://plan/{id}` · `truegoing://chat/{id}` · `truegoing://profile/{id}` · `https://truegoing.app/p/{slug}`. Every deep link re-checks authorization before rendering; an unauthorized target shows the "not available" state (S11 restricted), never a blank screen.

---

## Screens

### S01 · Welcome and sign-in

1. **Route:** `/welcome` · full screen, unauthenticated.
2. **Decision:** Do I want in, and how do I sign in?
3. **Entry:** app launch with no session; sign-out. **Exit:** `verify` (phone) or onboarding (Apple, first time) or `nearby` (returning).
4. **Reads:** none. **Writes:** starts an auth session (Apple or phone OTP).
5. **Layout:** animated map card with three illustrative plan pins labelled as examples (small caption "Examples", so nothing looks like real activity) → "welcome to" + wordmark → one-line promise → **Continue with Apple** → **Continue with phone** → legal line.
6. **Actions:** Continue with Apple → native sheet → onboarding or nearby. Continue with phone → phone field appears inline with a country picker → **Send code** → `verify`. Terms / Privacy → in-app browser.
7. **States:** loading: buttons show a spinner and are disabled. Error: "Couldn't start sign-in. Try again." with Retry. Offline: buttons disabled, banner. Restricted: n/a.
8. **Copy:** promise "Plans near you, from people you can trust. Nobody sees where you are until you say so." Legal: "By continuing, you agree to our Terms and Privacy Policy."
9. **Privacy:** the example pins are static art, never real plans.
10. **Events:** `welcome.view`, `welcome.apple_tap`, `welcome.phone_tap`, `welcome.legal_tap {doc}`.
11. **Accept when:** both providers complete on a device; returning users land on Nearby within one screen; example pins carry the "Examples" caption.

### S02 · Verify code

1. `/verify` · push.
2. Is this my number?
3. From S01 phone. Exit → onboarding or nearby.
4. Writes: verifies OTP.
5. "Enter the code we sent to {masked number}" → 6-box code input → **Verify** → "Resend code" (countdown 30 s) → "Change number".
6. Verify → session. Resend → new code, toast "Code sent".
7. Loading: Verify spinner. Error: "That code didn't work. Check it and try again." (never says whether the number exists). Offline: Verify disabled. Disabled: Verify until 6 digits.
8. Copy as above.
9. Errors are generic to prevent account enumeration.
10. `verify.view`, `verify.success`, `verify.fail`, `verify.resend`.
11. Autofill from SMS works; three wrong codes triggers a 60 s cool-down with a visible timer.

### S03 · Public plan page

1. `/p/[slug]` · full screen, unauthenticated (also web).
2. Is this plan worth joining?
3. From a shared link. Exit → S01 with `returnTo=plan/{id}`, or app hand-off if installed.
4. Reads: `get_public_plan(slug)` only. No other table.
5. Emoji + title → "{area} · {relative time}" → host first name + Verified tick if any → "{N} going" (or "a few going", or nothing under the floor) → **Open in TrueGoing** / **Sign in to join** → footer "Exact spot and contact details are only shown to people who join."
6. CTA → S01 → back to S11 after auth.
7. Loading: skeleton. Empty/expired: "This plan has ended or isn't public anymore." Error: Retry. Restricted host or blocked: identical "not available" copy (no distinction).
8. As above.
9. Never shows exact spot, coordinates, contact details, other attendees, or reach level. First name only.
10. `public_plan.view {plan_id}`, `public_plan.cta_tap`.
11. Page renders the same for a restricted host as for an expired plan.

### S04 · Onboarding: name and birthday

1. `/onboarding/name` · stack, progress 1/3.
2. What should we call you, and are you 18+?
3. From first sign-in. Exit → S05. Back → sign out with confirmation.
4. Writes: display name; date of birth to a private profile record. Age is derived, DOB is never shown to others.
5. Progress bar → "what should we call you?" → "let's get your profile started" → Name field with live check → "Birthday" row → wheel picker → **Continue**.
6. Continue → S05.
7. Disabled: Continue until name is 1–60 chars and age ≥ 18. Under 18: inline "You need to be 18 or older to use TrueGoing." and Continue stays disabled. Error: Retry. Offline: Continue disabled.
8. Field labels "YOUR NAME", "BIRTHDAY". Helper under name: "This is what people going will see."
9. DOB is private. Only age is public, and only after your first join (see S20).
10. `onboarding.name_view`, `onboarding.name_continue`, `onboarding.underage_block`.
11. Picker defaults to 25 years ago, not a fixed year; screen reader reads age eligibility error.

### S05 · Onboarding: interests

1. `/onboarding/interests` · progress 2/3 · **Skip** allowed.
2. What do you like doing?
3. From S04. Exit → S06.
4. Writes: selected interests (0–20).
5. "what do you like doing?" → "so we can show you the right plans" → search field → grouped emoji chips (Sport, Food, Outdoors, Games, Culture, Learning, Help & favours, Nightlife, Wellness) → **Continue** / Skip.
6. Chip toggles; Continue → S06.
7. Loading: chips skeleton. Error: chips from a bundled fallback list. Offline: selection queued.
8. As above.
9. Interests are used for the "Nearby · matches {interest}" reason line; they are shown on your profile only if you choose.
10. `onboarding.interests_view`, `onboarding.interests_continue {count}`, `onboarding.interests_skip`.
11. Search filters chips; Skip lands on S06 with zero interests and the app still works.

### S06 · Onboarding: location explainer

1. `/onboarding/location` · progress 3/3.
2. Will I share my location, knowing what it's for?
3. From S05. Exit → S07 (granted) or S07 with a "Set your area manually" step (denied).
4. Writes: nothing; permission request only. On grant, a coarse home area (grid cell) is stored; exact coordinates are never stored.
5. Map-pin emoji → "where are you?" → three lines with icons: "We show plans around you." / "We never show anyone where you are." / "Plans show an area, not an exact spot." → **Continue** → system prompt.
6. Continue → OS prompt → S07. Denied → inline "You can pick your area instead." with a city/area search → S07.
7. Error: Retry. Denied: manual area path. Offline: Continue enabled (permission is local); area search disabled.
8. As above.
9. The app requests **when in use** only. It never requests always-on.
10. `onboarding.location_view`, `onboarding.location_granted`, `onboarding.location_denied`, `onboarding.location_manual`.
11. Denied users can still complete onboarding and see plans in a chosen area.

### S07 · Onboarding: you're in

1. `/onboarding/done` · stack.
2. (No decision; arrival moment.)
3. From S06. Exit → Nearby.
4. Reads: count of plans in the user's area this week (real). Writes: marks onboarding complete.
5. Radar animation with **no faces** (rings and dots only) → "you're in, {first name}!" → density line → **Start exploring** → "You can finish your profile any time."
6. Start exploring → `(tabs)/nearby`.
7. Density line variants: ≥ 5 plans: "{N} plans near you this week." 1–4: "A few plans near you this week." 0: "Be the first to post a plan near you." Reduced motion: static rings.
8. As above.
9. No avatars of other people; this is where MigoMap shows strangers' faces. TG shows none.
10. `onboarding.done_view {plans_nearby_bucket}`, `onboarding.complete`.
11. Count bucket is server-computed; zero case renders the "Be the first" line.

### S08 · Nearby (home)

1. `/(tabs)/nearby` · tab.
2. Is there a plan for me, or should I post one?
3. Tab; deep links; S07. Exits → S09, S10, S11, S13, S19, S24, S20 (via avatar).
4. Reads: `list_nearby_plans(area, filters, sort, cursor)` returning privacy-safe plan cards with a reason each; `nearby_density(area)`; unread notification count. Writes: "Not for me" feedback (queueable).
5. Map (top ~55%): clustered plan pins (emoji + host avatar) at grid-snapped points; user's own blue dot only if location granted; recenter button; no other people ever. Header over map: search button, **Heading to** chip if set, bell with badge. Bottom sheet (half-open default, drags to full): title "{N} plans near you" (or "Plans near you" when under floor) → sort segment *Soonest · Popular · Closest* → filter chips *All · Tonight · Food · Outdoors · Games · Help · Filters…* → list rows: emoji tile, title, "{area} · {relative time}", avatar stack + "{N} going", reason line in trust colour with a trailing "Not for me".
6. Tap pin/row → S11. Search → S10. Filters… → S09. Bell → S19. Heading-to chip → S24. Pull to refresh. "Not for me" → row collapses with "We'll show fewer like this" and an **Undo** for 5 s.
7. Loading: map renders immediately, list shows 4 skeleton rows. Empty (filters on): "No plans match. Clear filters". Empty (none nearby): heading "Nothing near you yet", line with the nearest real density ("4 plans in {nearby area} this week →" only if true), then **Post the first plan** and three starter chips *Coffee now · Walk this evening · Badminton this weekend* that open S13 pre-filled. Error: last good list + banner with Retry. Offline: cached list, "Last updated {time}", pins greyed. Restricted: browsing works; Post shows the restricted message. Location denied: map centred on chosen area with a "Using {area}" chip that opens S06's manual picker.
8. Reason lines (exact set): "{First name} is going" · "Vouched by {First name}" · "Friends of friends" · "Near you · {interest}" · "Near you" · "You're heading to {city}" · "Hosted by a venue near you". Sort labels and chip labels as above.
9. Map pins are grid-snapped (≈ 300 m). No pin ever sits on a residential address the host entered. Friends' pins get no special precision. The list never shows distance under 1 km more precisely than "under 1 km".
10. `nearby.view {plans_count_bucket, sort, filters}`, `nearby.pin_tap {plan_id}`, `nearby.row_tap {plan_id, reason_code}`, `nearby.not_for_me {plan_id, reason_code}`, `nearby.empty_view {variant}`, `nearby.starter_tap {template}`.
11. Every row has a reason line (test: a card view model without a reason fails to render). Pins never render for people. Empty state variants render for zero, filtered-zero, and location-denied.

### S09 · Filters sheet

1. `/nearby/filters` · sheet.
2. Which plans do I want to see?
3. From S08. Exit: apply or dismiss.
4. Writes: local filter state; persisted per user.
5. Header "Filters" with **Clear** and a check button → "WHEN": Any · Now · Tonight · Tomorrow · This weekend · Pick dates → "TYPE": Plans · Asks · Offers (multi) → "CATEGORY": emoji chips → "DISTANCE": stepper 2 / 5 / 10 / 25 km → "ONLY SHOW": Verified hosts · Women-only plans (visible only to verified women) · Friends and friends of friends → **Show {N} plans** button with a live real count.
6. Check/Show → S08 with filters. Clear → defaults.
7. Loading count: button reads "Show plans" until the count returns. Offline: count unavailable, button "Show plans".
8. As above.
9. There is no gender filter on people. "Women-only plans" filters *plans* by a host-set attribute. Women-only plans are delivered only to verified women (self-declared gender + selfie verification), so they never appear to anyone else.
10. `filters.apply {when, types, categories, distance_km, only}`, `filters.clear`.
11. The count in the button matches the list length after apply.

### S10 · Search

1. `/nearby/search` · sheet, keyboard open.
2. Where or what am I looking for?
3. From S08. Exit → S08 recentred or S11.
4. Reads: place search (geocoder), plan title search within area, categories.
5. Search field "Search plans, places or categories" → recent searches → results grouped: Places (city/area, with "{N} plans" if real) · Plans (rows as S08) · Categories.
6. Place → S08 recentred with "Showing {area}" chip. Plan → S11. Category → S08 filtered.
7. Empty: "No results for '{query}'". Error: Retry. Offline: recent searches only.
8. As above.
9. Searching a person's name returns nothing; people are not searchable outside Connections (S23).
10. `search.query {kind, results_count}`, `search.result_tap {kind}`.
11. A person's name typed here yields the "No results" state.

### S11 · Plan card

1. `/plan/[id]` · sheet over the map (or push when deep-linked from elsewhere).
2. Am I in?
3. From S08, S10, S19, S16 system messages, deep links. Exits → S12, S16, S21, S26, share sheet.
4. Reads: `get_plan_card(id)` (privacy-safe view model: title, emoji, type, area, snapped point, relative time, capacity and spots left, going list of first names + avatars, vouches, attributes, host card, reason for *this* viewer, my status). Writes: `join_plan` (Plans; queueable; idempotent), `leave_plan`, `vouch_plan`, "Not for me".
5. Grabber → header row: back, share, report, close → emoji large → title → "{area} · {relative time} · {spots left} spots left" (or "No limit") → host row: avatar, "Hosted by {First name}", Verified tick, tap → S21 → attribute tags (Women only · Verified only · Friends of friends only · Repeats weekly · Venue) → going: avatar stack + "{Names} and {n} more are going" → vouches: "Vouched by {Names}" with a **Vouch** button if the viewer is a connection of the host → reason box: "Why you're seeing this: {reason}" + "Not for me" → privacy strip: "Exact spot unlocks 1 hour before, for people going." → for Asks/Offers: "What they need" / "What they're offering" details → sticky footer: primary button by state (below) + secondary "Chat" once in.
6. **Primary button by role and state:**
   - Viewer, Plan, spots left → **I'm in** → optimistic join; button becomes **You're in · Open chat**; toast "You're in. Say hi in the chat."
   - Viewer, Plan, full → disabled **Full** with "Join the waitlist" secondary (P2).
   - Viewer, Plan, attribute not met → disabled with reason. Verified only: "This plan is for verified people. Get verified →". Women only, viewer is an unverified woman: "This plan is for verified women. Get verified →". Women only, any other viewer: the plan is never delivered, so this state is unreachable except by deep link, which shows "not available".
   - Viewer, Ask/Offer → **Ask to join** / **I'll take it** → S12.
   - Viewer, request pending → disabled **Asked · waiting for {host}** + "Withdraw".
   - Going → **You're in** (tap → Leave confirmation) + **Open chat**.
   - Host → **Manage plan** → S28.
   - Ended → no primary; "This plan has ended."
   - Share → system share with the public link. Report → S26. Vouch → toggles, "You vouched for this plan."
7. Loading: skeleton with the emoji tile. Error: Retry. Offline: card from cache; I'm in queues with a clock and "We'll confirm when you're back online"; Ask to join disabled. Restricted viewer: primary disabled with the restricted line. Not available (blocked, out of reach, ended and private): "This plan isn't available." with a back button, identical for all causes.
8. Strings above. Leave confirmation: "Leave this plan? {Host} and people going will be told." → **Leave** / Cancel.
9. Full names only for connections. Exact spot never appears here, even to the host (host sees it in S28). Attendees of an Ask/Offer are never listed to other viewers.
10. `plan.view {plan_id, type, reason_code, my_status}`, `plan.join {plan_id}`, `plan.leave`, `plan.ask_tap`, `plan.vouch`, `plan.share`, `plan.report_tap`, `plan.not_for_me`.
11. Join is idempotent (double tap yields one membership). Capacity is enforced server-side; a race shows "Just filled up" and reverts. The "not available" state is indistinguishable across causes.

### S12 · Ask to join (Asks and Offers)

1. `/plan/[id]/ask` · sheet.
2. Do I want to ask, knowing what the host will see?
3. From S11. Exit → S11 with pending state.
4. Writes: `request_to_join(plan_id, note?)`, server checks reach, blocks, expiry, duplicates.
5. "Ask to join" → "{Host} will see your first name, your photo and this note." → note field (optional, ≤ 300) with placeholder "Anything {Host} should know?" → disclosure line "Your contact details stay hidden until {Host} accepts." → **Send** / Cancel.
6. Send → S11 pending; toast "Sent. We'll tell you when {Host} replies."
7. Disabled: Send while offline ("You're offline"). Error: "Couldn't send. Try again." Duplicate: "You've already asked." Restricted: disabled with line.
8. As above.
9. Host sees name, photo, note, mutual connections count. Never phone, never exact location.
10. `ask.view`, `ask.send {has_note}`, `ask.cancel`.
11. A second request for the same plan is rejected server-side and shown as the duplicate state.

### S13 · Post flow

1. `/post` · full-screen modal with a 6-step progress bar. Draft autosaves locally.
2. What am I posting, and who should see it?
3. From the Post tab, S08 empty-state starters (pre-filled), S28 "Post again". Exit → S14, or discard.
4. Writes: local draft until the last step; then `create_plan_draft` + `publish_plan(draft_id, reach)` as one server transition (draft → live). The exact spot goes to the private record; the snapped point and area to the public record.
5. **Step 1 · What.** Segmented *I want to · I need · I have* → sentence field beginning with the chosen stem: "I want to **{play badminton tonight}**" (≤ 140 visible; ≤ 500 total) → emoji tile auto-suggested from text, tap to change → category chips (auto-selected, editable).
   **Step 2 · When.** Chips *Now · Tonight · Tomorrow · Pick* → picker → "Repeat weekly" toggle → "Ends after" (default: start + 3 h; for Asks, "Open until {date}").
   **Step 3 · Where.** Map with fixed centre pin; search; "Move the map to set the spot"; caption: "People see **{area}**. The exact spot unlocks for people going, 1 hour before." → toggle "Show exact spot right away" (default off; on for Venue hosts).
   **Step 4 · Who can join.** Capacity chips *2 · 4 · 8 · No limit* → attributes: Women only (shown only to hosts who are verified women; turning it on forces Verified only) · Verified only · Connections and friends of friends only.
   **Step 5 · Who sees it.** Reach dial with four stops and a live estimate line per stop: "Friends ≈ {n} · Friends of friends ≈ {n} · Nearby ≈ {n} · Anyone in {city} ≈ {n}". Default stop: Nearby. Under the dial: "You're choosing who this reaches. You can widen it later, never narrow it." → link "Who counts as nearby?".
   **Step 6 · Review.** Card preview as others will see it → the reach line → **Post**.
6. Next/Back per step; close → "Keep draft?" Keep / Discard. Post → S14.
7. Disabled: Next until the step is valid, with a reason (e.g. "Add a few words about the plan"). Reach estimates loading: "≈ …" then numbers; on failure: "Estimate unavailable" and Post still allowed. Offline: steps 1–4 work; step 5 shows "Connect to post"; Post disabled. Restricted: the Post tab opens a sheet with the restricted line instead of this flow. Error on Post: "Couldn't post. Your draft is saved." with Retry.
8. Step titles: "What's the plan?" · "When?" · "Where?" · "Who can join?" · "Who sees it?" · "Ready?". Post button: **Post**. Stems: "I want to…", "I need…", "I have…".
9. The estimate counts real accounts and renders "a few" under 5. Exact coordinates never leave the private record. Attributes are host-set facts about the plan, not filters on people.
10. `post.step_view {step}`, `post.type_select {type}`, `post.when_select {preset}`, `post.where_set {snapped}`, `post.capacity {n}`, `post.attribute {name, on}`, `post.reach_select {level}`, `post.publish {type, reach, category, capacity, repeats}`, `post.discard {step}`.
11. A plan posted with "Nearby" appears in a second account's S08 within 10 s with the reason "Near you". The exact spot is not readable by the second account before the unlock window. The dial's estimate for "Friends" equals the poster's connection count.

### S14 · Posted

1. `/post/done` · modal end screen.
2. (No decision.)
3. From S13. Exit → S11 (own plan) or S08.
4. Reads: the posted plan.
5. Check animation → "Posted" → "Reaching ≈ {n} people {reach label}. We'll tell you when someone's in." → **View plan** → **Share link** → "Back to Nearby".
6. As labelled.
7. Reduced motion: static check.
8. As above; if estimate unavailable: "Posted to {reach label}."
9. Share uses the public link (S03 projection).
10. `post.done_view`, `post.done_share`.
11. Share sheet carries only the public URL and title.

### S15 · Chats

1. `/(tabs)/chats` · tab.
2. Which conversation needs me?
3. Tab; notifications. Exit → S16.
4. Reads: conversations where I'm a member (plan chats, ask threads); unread counts. Writes: mark read.
5. Header "Chats" → search → segment *All · Plans · Asks · Unread* → rows: emoji tile (plan) or avatar (ask thread), title, last message preview (first name: text; system messages in italics), time, unread badge; plans starting within 1 h show a **Starting soon** tag.
6. Row → S16. Long press → Mute / Leave plan.
7. Loading: skeleton rows. Empty (new user): "No chats yet" / "Join a plan and its chat opens right here." / **Find a plan**. Empty (filtered): "Nothing unread." Error: Retry. Offline: cached rows, banner.
8. As above.
9. Previews never include a shared exact spot or contact detail; those render as "shared the spot" / "shared a contact".
10. `chats.view`, `chats.row_tap {kind}`, `chats.filter {segment}`.
11. Unread counts match the thread; previews redact spot and contact shares.

### S16 · Chat thread

1. `/chat/[id]` · push.
2. What's the plan, and are we set?
3. From S15, S11, notifications. Exit → S11 (header tap), S17, S21, S26.
4. Reads: messages (paged, realtime), membership, plan status. Writes: `send_message` (queueable), photo upload, poll create/vote, host-only `share_exact_spot`, `leave_plan`.
5. Header: emoji + plan title, "{N} going · {relative time}", tap → S11; shield → S27; "…" → Mute, Leave, Report. Pinned plan strip: "{area} · {time}" + **Spot unlocks in {countdown}** or **Get directions** once unlocked. Message list with system messages ("Priya is in", "Spot unlocked", "Plan starts in 1 hour", "How did it go? →"). Composer: text, photo, poll, and for the host only **Share spot now**.
6. Send → optimistic bubble → confirmed. Share spot now (host) → confirmation "Share the exact spot with everyone going now? This is recorded." → system message + strip changes. Get directions → maps app. Poll → create sheet (question, 2–4 options, single choice). Tap avatar → S21. Leave → confirmation.
7. Loading: skeleton bubbles. Empty (host alone): "It's just you for now. We'll post here when someone's in." Error: Retry; unsent messages show **Tap to retry**. Offline: queued messages with a clock; composer enabled; photo disabled. Restricted: can read; composer replaced by the restricted line. Ended plan (24 h after): read-only with "This chat is closed." and **Post again** for the host.
8. Placeholder "Message". Host spot button "Share spot now". Countdown "Spot unlocks in 2 h 10 m".
9. Exact spot appears only after unlock or host share, only to members. No read receipts, no typing indicators, no "last seen" in P0/P1. Media is visible to members only and expires with the chat archive.
10. `chat.view {kind}`, `chat.send {has_media}`, `chat.poll_create`, `chat.spot_share {host}`, `chat.directions_tap`, `chat.leave`.
11. Realtime delivery under 2 s between two devices. A non-member deep-linking to the chat sees the "not available" state. Spot share by a non-host is rejected server-side.

### S17 · Meetup mode

1. `/plan/[id]/meetup` · full-screen modal; auto-offered by notification 1 h before start; also from S16 strip.
2. Am I set to go, and is someone looking out for me?
3. From notification, S16, S11 (going). Exit → back.
4. Reads: plan, exact spot (now unlocked), people going. Writes: `set_trusted_contact` (local + private), `send_plan_to_contact` (composes an SMS via the OS; the app never sends on your behalf), `checkin(plan_id)`, `flag_unsafe(plan_id)`.
5. "Starting in {countdown}" → exact spot map + address + **Get directions** → "Going: {avatars, first names}" → **Tell someone your plans** → sheet: pick a contact, preview of the SMS ("I'm at {plan title} near {area} at {time}. Sent from TrueGoing.") → **Send** via OS → "I'm here" check-in button (active from 15 min before) → footer "Something feels off?" → **Get help**: Call {trusted contact} · Call emergency services · Report and leave.
6. As labelled. Check-in → system message "PS is here" in chat (first name only).
7. Loading: skeleton. Error: Retry; directions still work from the cached spot. Offline: spot from cache; SMS composes offline; check-in queues. Not going (deep link): "You're not in this plan." with **View plan**.
8. As above; the SMS preview never includes other attendees' names or the exact address unless the user toggles "Include address".
9. The exact spot is shown only here and in S16 after unlock. Trusted contact is stored privately and never shown to anyone. Check-in shares no location; it's a tap.
10. `meetup.view`, `meetup.directions`, `meetup.contact_share`, `meetup.checkin`, `meetup.help_tap {action}`.
11. A user not in the plan cannot fetch the exact spot via this route. The SMS is composed by the OS; the app makes no network call with the contact's number.

### S18 · Showed-up check

1. `/plan/[id]/showed-up` · modal, offered by notification 2 h after start, and from the chat system message.
2. Who was actually there?
3. From notification, S16. Exit → back; auto-dismiss after submit.
4. Writes: `confirm_showed_up(plan_id, [user_ids])`, `rate_plan(went_well: bool)`; both idempotent.
5. "How did {plan title} go?" → two big buttons **Went well** / **Didn't happen** → if went well: "Who showed up?" avatar grid of people going, each toggling a check → **Done** → if didn't happen: "Sorry to hear that." → optional reason chips (Nobody came · Cancelled · Something felt off → S26) → Done.
6. Done → toast "Thanks. This helps everyone's Showed up count." Went well + first positive plan → the store review prompt is eligible (system prompt, later, never here).
7. Offline: queues. Error: Retry. Skipped: reminder once, then never for this plan.
8. As above.
9. A show-up is counted only when confirmed by at least one *other* attendee. Self-confirmation alone counts for nothing. No 1–5 rating of people, ever.
10. `showedup.view`, `showedup.went_well {value}`, `showedup.confirm {count}`, `showedup.skip`.
11. Confirmations are mutual; a solo confirmer produces no badge increment.

### S19 · Notifications

1. `/notifications` · push from the bell.
2. What needs me?
3. From S08 bell, push tap. Exit → S11, S16, S21, S28.
4. Reads: notification inbox (server-stored, paged). Writes: mark read, mark all read.
5. Header "Notifications" + **Mark all read** → segment *All · Plans · Asks · People* → rows: icon, text, relative time, unread dot. Types: "{Name} is in {plan}" · "{Name} asked to join {plan}" (host) · "{Host} accepted you" · "{Plan} starts in 1 hour" · "Spot unlocked for {plan}" · "New plan near you: {emoji} {title} · {reason}" · "{Name} vouched for your plan" · "{Name} confirmed you showed up" · "{Name} wants to connect".
6. Row → target. Swipe → mark read.
7. Loading: skeleton. Empty: "Nothing here yet" / "We'll tell you when someone's in, or when a plan pops up near you." Error: Retry. Offline: cached.
8. As above.
9. The push payload holds IDs and a type; text is composed on device after an authorization check. "New plan near you" pushes respect the radius and quiet hours in S25.
10. `notifications.view`, `notifications.row_tap {type}`, `notifications.mark_all`.
11. Tapping a push for a plan you can no longer see lands on the "not available" state, not a crash or blank.

### S20 · You (own profile)

1. `/(tabs)/you` · tab.
2. How do I look to people going, and what should I finish?
3. Tab. Exit → S22, S23, S24, S25, S29, own plans → S11/S28.
4. Reads: profile, badges (Verified, Showed up ×n, Hosted ×n), completeness, my upcoming and past plans, connections count. Writes: none directly.
5. Header: settings gear, share (profile link) → avatar with completeness ring and "{pct}%" → name, "{age} · {area}" → badges row → **Edit profile** / **Get verified** (if not) → completeness checklist card ("Add a photo" · "Get verified" · "Join your first plan" · "Show up once") each tapping to its action → "Upcoming" (my plans, hosting or going) → "Past plans" (private toggle: "Show past plans on my profile") → "Connections · {n}" → "Heading to" row.
6. As labelled.
7. Loading: skeleton. Empty upcoming: "No plans yet" / **Find a plan** · **Post one**. Error: Retry. Offline: cached. Restricted: a banner "Your account is limited. Contact support."
8. Completeness items as above. Badge text: "Verified", "Showed up ×{n}", "Hosted ×{n}".
9. Age is shown only after first join (before that, "Joined {month}"). DOB, phone, email never shown. Profile views do not exist.
10. `you.view {completeness}`, `you.checklist_tap {item}`, `you.edit_tap`, `you.verify_tap`.
11. No profile-view counter exists anywhere in the UI or API.

### S21 · Someone's profile

1. `/profile/[id]` · push or sheet.
2. Do I trust this person enough to join or connect?
3. From S11 host row, S16 avatar, S23. Exit → S26, Connect, S11 (their plans).
4. Reads: `get_profile_view(id, viewer)` returning: first name (full name if connected), photo, age, area, badges, bio and interests if the owner shows them, mutual connections (names only if they're my connections), shared plans ("You both went to {plan} on {date}"), upcoming plans **visible to me** under their reach. Writes: `request_connection`, block/report via S26.
5. Header: back, share, "…" (Report · Block) → avatar, name, "{age} · {area}", badges → mutual line "3 mutual connections: {names}" → "You both went to {plan}" → About → Interests → "Their plans you can see" → footer: **Connect** (enabled only if we've shared a plan or they're a friend of a friend; otherwise hidden) · **Message** (enabled only inside a shared plan chat; otherwise hidden).
6. Connect → pending state "Requested". Message → S16 of the shared plan.
7. Loading: skeleton. Not available (blocked either way, restricted, or not reachable): "This profile isn't available." Error: Retry. Offline: cached.
8. As above. Connect hint when hidden: none (the button is absent, not disabled, to avoid signalling the reason).
9. No location, no distance, no last-active, no "views". Past plans only if the owner enabled them. Connect requires a real-world or graph relationship; there is no cold add.
10. `profile.view {relation}`, `profile.connect`, `profile.report_tap`, `profile.block_tap`.
11. A stranger with no shared plan and no graph path sees no Connect and no Message button.

### S22 · Edit profile

1. `/you/edit` · push.
2. What do I want people going to know?
3. From S20. Exit → save or discard.
4. Writes: name, photo (private bucket, signed URLs), bio ≤ 150, interests, "show interests", "show past plans", area (manual), gender (optional; explained), social link (optional, one).
5. Photo with **Change** → Name → Bio with counter → Interests → Area → Gender row (Woman · Man · Non-binary · Prefer not to say) with helper "Only used for women-only plans, and only once you're verified. Never shown to anyone." → Social link (Instagram/other) → Privacy toggles → **Save**.
6. Save → S20 with toast "Saved".
7. Disabled: Save until valid and changed. Photo upload error: "Couldn't upload. Try another photo." Offline: text edits queue; photo disabled.
8. Helpers as above.
9. Gender is never displayed. Social link shows as an icon; tapping opens the browser with a warning "You're leaving TrueGoing."
10. `profile.edit_save {fields_changed}`, `profile.photo_upload`.
11. Gender is absent from every read model except the eligibility check.

### S23 · Connections

1. `/you/connections` · push.
2. Who do I trust, and who wants to connect?
3. From S20, S19. Exit → S21.
4. Reads: connections, incoming and outgoing requests, "People you've met" (attendees of plans you both showed up at). Writes: accept/decline/remove, request, hashed-contacts match (opt-in).
5. Search within connections → "Requests" (incoming with Accept / Decline) → "People you've met" (from shared plans; **Connect**) → "Connections" list → footer: "Find people you know" → explainer sheet for hashed contact matching (opt-in; "We upload a scrambled version of numbers, never the numbers, and match against people who also opted in.").
6. As labelled.
7. Empty: "No connections yet" / "Connections come from plans you've been to together." / **Find a plan**. Error: Retry. Offline: cached.
8. As above.
9. No search of strangers. Contact matching is opt-in, hashed, and revocable in S25.
10. `connections.view`, `connections.accept`, `connections.request {source}`, `connections.contacts_optin`.
11. Removing a connection downgrades the other side's view of your name to first name only.

### S24 · Heading to

1. `/heading-to` · push.
2. Where am I going next, and what's happening there?
3. From S08 chip, S20. Exit → S08 recentred with a "heading to" context.
4. Reads: my trips, plans in the destination during the window, real "people heading there" bucket. Writes: create/edit/delete trip (city, dates or flexible).
5. "Heading to" → my trips list (city, dates, "{N} plans during your trip") → **Add a trip** → sheet: city search, Dates / Flexible toggle, calendar → Save → trip detail: plans there (rows as S08 with reason "You're heading to {city}"), **Post a plan there**.
6. As labelled.
7. Empty: "Where to next?" / "Add a trip and we'll show plans there before you arrive." Error: Retry. Offline: cached.
8. As above.
9. Trips are private. Hosts in the destination see only an aggregate "{N} people arriving this week" when N ≥ 5, never names.
10. `heading.view`, `heading.add {flexible}`, `heading.plan_tap`.
11. A host in the destination cannot list who is arriving.

### S25 · Settings

1. `/settings` and children · push.
2. How should the app behave for me?
3. From S20 gear.
4. Reads/Writes: preferences (device + server).
5. Groups and rows:
   - **General:** Appearance (System/Dark/Light) · Language · Distance (km/mi).
   - **Alerts:** Push on/off · Plans near you (radius stepper 2–25 km) · Friends' plans · Asks near you · Quiet hours (from–to).
   - **Privacy:** Show past plans · Show interests · Contact matching (on/off, with "Delete my matching data") · Download my data · Blocked people.
   - **Safety:** Trusted contact · Safety tips (→ S27) · Community rules.
   - **Account:** Sign-in methods · Sign out · Delete account.
   - **Support:** Message the founder · Contact support · Rate TrueGoing (visible only after a "Went well" in S18).
   - Footer: version.
6. Delete account → confirmation with the word "DELETE" typed → immediate sign-out; deletion completes server-side within the stated window; chats show "Left" and name becomes "Former member".
7. Loading: values from cache. Error: toast "Couldn't save. Try again." Offline: local settings apply; server-side ones queue with a clock.
8. As above.
9. No "Stealth mode" (nothing to hide from). No "profile views". Blocked people list shows names you blocked; the blocked never see the list.
10. `settings.change {key}`, `settings.delete_account`, `settings.rate_tap`.
11. Rate row is absent until a positive S18 event exists.

### S26 · Report and block

1. `/report` · sheet, with `subject` = plan | person | message.
2. Protect me, and tell TG what happened.
3. From S11, S16, S21. Exit → back with a confirmation toast.
4. Writes: `report(subject, reason, note?)`, `block(user_id)` (immediate, idempotent), and for a plan: `leave_plan` when block is on.
5. "Report {subject}" → "Why are you reporting?" → radios: Spam or scam · Inappropriate content · Safety concern · Fake or misleading · Something else → optional note → line "They won't know who reported them." → toggle "Also block {First name}" (default on for Safety concern) → **Send**.
6. Send → toast "Thanks. We'll look into it." Block → the person disappears from your plans list, chats you share become read-only for them toward you, and you leave shared plans they host.
7. Disabled: Send until a reason is chosen; offline: block works locally and syncs; report queues. Error: Retry.
8. As above.
9. Reporter identity is never revealed. Block state is never revealed to the blocked person; their view of you becomes "not available".
10. `report.send {subject, reason, also_block}`, `block.apply`.
11. After a block, the blocked user's S21 for you and your S21 for them both render "not available".

### S27 · Safety

1. `/safety` · sheet.
2. What do I do to stay safe?
3. From S16 shield, S25, first-join interstitial (shown once before your first "I'm in").
4. Reads: static content.
5. "Safety" → cards: Meet in public · Keep chats in the app until you've met · Tell someone your plans (→ trusted contact setup) · The exact spot unlocks 1 hour before, only for people going · Trust your instincts; leave if it feels off · Report anything that isn't right → **Got it**.
6. Got it → back.
7. n/a (static). Offline: bundled.
8. As above. No "not a dating app" line; the rules are stated positively: "TrueGoing is for plans. Romantic or sexual messages get accounts removed."
9. n/a.
10. `safety.view {source}`.
11. Shown once before the first join; dismissible; reachable later.

### S28 · Manage my plan (host)

1. `/plan/[id]/manage` · push.
2. Who's in, who's asking, and is the plan still right?
3. From S11 (host), S19. Exit → S11, S13 (edit), S16.
4. Reads: plan with exact spot, going list, requests (Asks/Offers), reach and its live estimate. Writes: `accept_request`, `decline_request`, `edit_plan` (time, capacity, text; edits after people join notify them), `widen_reach(level)` (never narrow), `cancel_plan(reason)`, `share_exact_spot`, `end_plan`.
5. Header "Manage plan" → card preview → **Requests ({n})** (Asks/Offers): rows with avatar, first name, mutual count, note, **Accept** / **Decline** → **Going ({n}/{capacity})** with Remove per person → "Exact spot: {address}" with **Share now** → "Who sees it: {level}" with **Widen reach** → sheet showing the newly included audience estimate and "You can't narrow it later" → confirm → **Edit details** → **Cancel plan** → reason chips → confirm.
6. Accept → chat opens for that person; toast. Decline → silent to the requester beyond "not accepted". Widen → new deliveries with reason lines. Cancel → system message + notifications to people going; plan card shows "Cancelled".
7. Loading: skeleton. Empty requests: "No asks yet." Error: Retry. Offline: accept/decline disabled; edits disabled. Restricted host: read-only with the restricted line.
8. As above. Widen confirmation: "Widen to {level}? About {n} more people will see this. You can't narrow it later." **Widen** / Cancel.
9. Requesters' phone/email never shown. The exact spot is visible here only to the host. Declined requesters are not told why.
10. `manage.view`, `manage.accept`, `manage.decline`, `manage.widen {from, to}`, `manage.cancel {reason}`, `manage.spot_share`, `manage.edit {fields}`.
11. Widen is monotonic (server rejects narrowing). Accept is idempotent. Cancel notifies every member within 10 s.

### S29 · Get verified

1. `/verify-identity` · push.
2. Will I prove I'm a real person with this face?
3. From S20, S11 (Verified-only plan gate). Exit → S20 with status.
4. Writes: selfie capture → verification provider; stores only the result (verified: bool, date) and the provider's reference, never the selfie.
5. "Get verified" → "One selfie, under a minute. We compare it with your profile photo and delete it." → **Take a selfie** → camera → processing → result: "You're verified" / "We couldn't verify this. Try again in better light."
6. As labelled.
7. Loading: processing spinner with "Checking…". Error: Retry. Offline: disabled with "Connect to verify".
8. As above.
9. The selfie is not stored by TG. Verification status is public as a badge; nothing else.
10. `verify_id.start`, `verify_id.result {ok}`.
11. No selfie bytes persist in TG storage after the result is stored.

---

## C. Component contracts

| Component | Receives | Never receives |
|---|---|---|
| `PlanRow` / `PlanCard` | A privacy-safe view model: id, emoji, title, area, snappedPoint, relativeTime, spotsLeft, goingPreview (first names + avatar URLs, max 3, real count), vouches, attributes, hostPreview, **reason (required)**, myStatus | Raw DB rows, coordinates, host address, viewer-irrelevant reach data |
| `WhyYouSeeThis` | reasonCode, reasonText, onNotForMe | — (both text and feedback are mandatory) |
| `ReachDial` | current level, allowed levels (monotonic), estimates per level (nullable), onChange | Names of the people counted |
| `PrivacyStrip` | visibleNow[], visibleAfterJoin[], unlockAt? | — |
| `PrimaryPlanCTA` | role, planType, myStatus, spotsLeft, eligibility (ok | reason) | Two verbs at once |
| `GoingStack` | avatars (max 3), realCount | Placeholder avatars |
| `ReasonedNotificationRow` | type, objectIds, composedText, read | Server-composed text containing plan or message content |
| `DensityLine` | countBucket (0, few, n) | Any estimate not computed server-side |

---

## D. Deep links and notification routing

| Link / push type | Target | Pre-check |
|---|---|---|
| `truegoing://plan/{id}` | S11 | viewer may read plan; else "not available" |
| `truegoing://chat/{id}` | S16 | viewer is a member; else "not available" |
| `truegoing://profile/{id}` | S21 | no block either way; else "not available" |
| `truegoing://plan/{id}/meetup` | S17 | viewer is going and within window; else S11 |
| `truegoing://plan/{id}/showed-up` | S18 | viewer was going; else dismiss |
| `https://truegoing.app/p/{slug}` | S03 → S11 after auth | plan is live and public |
| Push `plan_nearby` | S11 | radius and quiet hours were honoured at send time |

Push payload schema: `{ type, plan_id?, chat_id?, user_id?, reason_code? }`. Nothing else.

---

## A. Cross-screen acceptance criteria

1. No screen renders another user's location, distance, or last-active time. (Automated: the view-model types have no such fields.)
2. Every plan card has a non-empty reason. (Automated: rendering without a reason throws in tests.)
3. The exact spot is unreadable by non-members and by members before the unlock window, verified with two accounts.
4. Every "not available" state is byte-identical across its causes (blocked, restricted, out of reach, ended-private).
5. Every data screen has all six states implemented and covered by a component test.
6. Every count shown is either a real server count, a labelled "≈" estimate, or the word "a few".
7. Push payloads contain no text content, verified by a schema test on the sender.
8. Both themes pass contrast checks on every screen.
9. Onboarding is four screens from sign-in to Nearby, with location asked last and explained first.
10. Joining a plan is one tap and idempotent; posting a plan is at most six steps with a valid default on every step.

## Locked decisions (2026-09-23)

- **Vocabulary:** plan · ask · offer · host · people going · connection · Nearby · Chats · Post · You · I'm in · Ask to join · I'll take it · Not for me · Friends · Friends of friends · Nearby · Anyone in {city} · Why you're seeing this.
- **Women-only plans:** may be set only by hosts who are verified women; delivered only to verified women; joinable only by verified women. "Verified woman" = self-declared gender Woman **and** selfie-verified. Verification proves a real, live person matching their photo; it does not verify gender. Misuse (a false declaration) is a reportable offence that leads to restriction.

## Change log

| Date | Change |
|---|---|
| 2026-09-23 | First proposal for the reimagined product. 29 screen contracts, global contracts, component contracts, routing, and acceptance criteria. |
