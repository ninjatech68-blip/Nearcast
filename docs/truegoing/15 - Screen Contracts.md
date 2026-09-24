# 15 - Screen Contracts

**Written 2026-09-24.** One contract per screen for everything marked V1 in [`13 - Feature Inventory`](./13%20-%20Feature%20Inventory.md), built from [`12 - Truegoing Concept`](./12%20-%20Truegoing%20Concept.md) and [`14 - Brand, Design and Content Direction`](./14%20-%20Brand%20Design%20and%20Content%20Direction.md). Copy is final unless struck. Every screen lists its six states; a screen without all six is not done.

Conventions: **Shows** is what is on screen. **Does** is what a tap can do. **Rules** are the invariants the database also enforces. **States** are loading · empty · error · offline · disabled · restricted. Where a state is the same as another screen's, it says so. Names are placeholders for the real first name.

Global rules that apply to every screen and are not repeated: the visual language is Airbnb's roles with Truegoing's hue (`14 §4`): one gradient primary button per screen at most, black for selected and secondary, white cards with shadow, 3D plan icons as the picture, empty states illustrated with three of them; sentence case; exit words `Done` / `Never mind` / `Back`; Dynamic Type reflows, never truncates; every control has a VoiceOver label naming the action; the six states are visible states, never a spinner alone; nothing user-facing carries an exclamation mark, an emoji or a bare error code.

---

## A. Getting in

### A1 · Sign in
**Shows:** `Your phone number` · field with country code, default `+91` · `We text you a code. Nobody on Truegoing ever sees your number.` · `Send code` · `or` · `Continue with Apple` · `Continue with Google` · footer `Apple or Google gets you in. You still add your number before you can ask to go or post.`
**Does:** Send code → A2. Apple/Google → provider sheet → A3 with name prefilled (Google photo offered later on A7). Field validates on the fly; `Send code` enables at a plausible number.
**Rules:** Apple button first on iOS. Email from a provider is stored as an auth identity only. No social graph is ever requested.
**States:** loading: button shows `Sending…`, field locked · empty: n/a · error: `That number didn't work. Check it and try again.` under the field; provider cancel returns silently · offline: banner `You're offline. Connect to sign in.`, buttons disabled · disabled: `Send code` until number plausible · restricted: after 5 codes in an hour, `Too many tries. Try again in an hour.`

### A2 · Code
**Shows:** `Enter the code` · `Sent to +91 98765 43210 · Change` · six boxes · `Send again` (enabled after 30 s, counts down) · `Back`.
**Does:** Auto-submits on the sixth digit. Change → A1 with the number kept.
**Rules:** Verification is this code (the four rules, §2.1). Correct code marks the phone verified.
**States:** loading: boxes lock, `Checking…` · error: boxes shake once, `That code didn't match.` · offline: as A1 · disabled: `Send again` during countdown · restricted: `Too many tries. Try again in an hour.` · empty: n/a

### A3 · Name and date of birth
**Shows:** `What should we call you?` · first-name field (prefilled from Apple/Google, editable) · `Your date of birth` · date picker · `Only your first name is shown. Your birthday is only used to check you're 18 or over.` · `Next`.
**Does:** Next → A4.
**Rules:** Under 18 cannot proceed; the account is not created (18+ gate in the database).
**States:** loading: n/a · empty: `Next` disabled until both fields valid · error: name over 40 characters: `Keep it under 40 characters.`; under 18: `Truegoing is for people 18 and over.` and `Next` stays disabled · offline: can fill; `Next` queues and shows `Saved. Will send when you're back online.` · disabled: as empty · restricted: n/a

### A4 · What you're into
**Shows:** `What are you into?` · `You'll only see plans that match. Change this any time.` · six category chips · on tapping a category, `Under Sports & outdoors` with its sub-interest chips · `Next`.
**Does:** Toggle chips. Next → A5. Categories with no sub-interest chosen deliver the whole category.
**Rules:** At least one category. Delivery filters on these; nothing outside them is shown (the "Show more interests" line on B2 is the only exception, and it is the person's tap).
**States:** empty: `Next` disabled, helper `Pick at least one.` · loading, error, offline: as A3 · disabled: as empty · restricted: n/a

### A5 · Your neighbourhood
**Shows:** `Where do you live, roughly?` · `We save your neighbourhood, not your address. It's how we find plans near you.` · a field showing the suggested neighbourhood, `Change` · `Suggested from your location. We don't keep the location itself.` · `Show my plans`.
**Does:** On open, one location permission ask with the system prompt; on grant, resolve to a neighbourhood name on the device and discard the coordinates. Deny → field empty, `Type your neighbourhood` → A6. Change → A6. Show my plans → B1/B2.
**Rules:** The stored value is a neighbourhood name and its centre, snapped to a coarse grid. No raw coordinate is ever sent.
**States:** loading: `Finding your neighbourhood…` in the field · empty: field empty, button disabled, `Type your neighbourhood` · error: `Couldn't work out your neighbourhood. Type it instead.` · offline: search unavailable, `Connect to look up a neighbourhood.` · disabled: button until a neighbourhood is set · restricted: location denied is not an error; it is the empty state

### A6 · Neighbourhood search
**Shows:** search field, results list of neighbourhood names with city, `Use my location` row at top, `Never mind`.
**Does:** Tap a result → back with it set. Use my location → same one-shot as A5.
**States:** loading: skeleton rows · empty: `No neighbourhood by that name. Try the area or the city.` · error: `Search isn't working right now. Try again.` · offline: `Connect to search.` · disabled: n/a · restricted: n/a

### A7 · Photo, optional (first time only, after A5)
**Shows:** `Add a photo?` · `Hosts see it when you ask to go. You can skip this.` · Google photo if available with `Use this` · `Choose a photo` · `Skip`.
**Does:** Skip is a first-class button. Photo goes through moderation (blur until approved is not shown to the person; approval is usually seconds).
**States:** loading: upload progress ring on the photo · error: `That photo didn't upload. Try another.` · offline: `Saved. Uploads when you're back online.` · empty, disabled, restricted: n/a

---

## B. Plans

### B1 · Plans, map
**Shows:** header: segmented `Map | List`, `Near Sector 5 ▾`. Filter chips: `This week` (default on), sub-interests the person chose, `All mine`. Map centred on the home neighbourhood, never on the device. Markers: category-coloured disc with the plan icon at the plan's coarse point; own live plan carries `LIVE`. Clusters above 40 in view show `N plans`. Floating `+`. Tab bar Plans · Activity · You.
**Does:** Tap marker → B3 sheet. Tap cluster → zoom, or B2 filtered to the cluster if already at max zoom. `Near Sector 5 ▾` → sheet: the person's neighbourhood(s), `Near me now` (one-shot, discarded), `Add a place` (later). `+` → C1. Filters persist across sessions.
**Rules:** Default view is map when 6 or more plans are in view at open, else B2. No person, photo, initials or name on a marker. Only plans within reach of the chosen neighbourhood, in the person's interests, live, `Show on the map` true.
**States:** loading: map tiles with grey placeholder markers, `Looking for plans…` chip · empty (0 in view): B2 opens instead; if the person switches to map, an inline card `No plans on the map here this week.` · `Show more interests` · error: `Couldn't load plans. Pull down to try again.` card over the map · offline: last loaded markers stay, banner `You're offline. Showing what we had.` · disabled: n/a · restricted (unverified): full map, banner `You can look. To ask or post, add your number.` · `Add`; `+` dimmed

### B2 · Plans, list
**Shows:** same header and chips. Cards: icon on category colour, the host's sentence, `Thu 7pm · about 2 km`, `✓ Aarav · 31 plans · showed up 97%`, why line `Shown because you're into badminton`. Two to three per screen. Sparse banner when under 6: `Not many plans this week.` · `Show more interests`.
**Does:** Tap card → B3. Swipe left → `Not for me` (hides, sends a not-relevant signal). Pull to refresh.
**Rules:** Order is fixed and published: start time ascending within `This week`; ties by distance. No popularity sort, ever.
**States:** loading: three skeleton cards · empty: illustration of three 3D icons from the person's interests fanned together · `Quiet here this week` · `Nobody's posted a badminton, chess or cycling plan near Sector 5 yet. You could be first.` · gradient `Post a plan` · quiet `Show plans in other interests too` · error: `Couldn't load plans.` · `Try again` · offline: cached cards, banner as B1 · disabled: n/a · restricted: banner as B1; cards fully readable

### B3 · Plan details (sheet)
**Shows:** grab handle · icon, sentence, `Thu 7pm · about 2 km · 2 of 4 going` · host row: photo, `✓ Aarav`, `31 plans · showed up 97% · since March`, `›` → D1 · host's note · `You see a rough distance for now. If Aarav accepts you, you get the exact place and the chat.` · why line · `Ask to go` · `Not for me`. For a women-only plan, a line above the buttons: `For women. Everyone here said they're a woman. The host can remove anyone.`
**Does:** Ask to go → B4. Not for me → dismisses and hides. Host row → D1. Swipe down → back to map/list, nothing lost. Share (top right) → system share sheet with the plan link (rough area only).
**Rules:** No exact place, no address, no attendee names to a non-accepted person. "2 of 4 going" is the only count and it is real.
**States:** loading: skeleton sheet · empty: n/a · error: `This plan isn't available any more.` · `Done` (cancelled or expired) · offline: cached details, `Ask to go` says `Ask to go (sends when online)` · disabled: after asking, `Ask to go` becomes `Asked · waiting for Aarav` with `Take back` quiet action · restricted (unverified): `Ask to go` replaced by `Add your number to ask` → A1 flow; women-only plan and the person has not declared: `This plan is for women.` with no button

### B4 · Ask to go (sheet)
**Shows:** `Ask to go` · `Pick a line or write your own.` · starter chips `I can make it` · `First time, is a beginner fine?` · `Can I bring one more?` · note field (140) · `Aarav sees your first name, photo, record and this note. If Aarav doesn't reply, that's a no.` · `Send` · `Never mind`.
**Does:** Tap a starter → fills the field, `Send` enabled. Send → B3 in its asked state, toast `Sent. Aarav will accept or decline. We'll tell you here.`
**Rules:** A note, chosen or typed, always accompanies an ask. The host receives first name, photo, record, note; nothing else.
**States:** loading: `Send` → `Sending…` · empty: `Send` disabled until a starter or text · error: `That didn't send. Your note is still here.` · `Try again` · offline: `Send` → `Send when online`; queued, B3 shows `Asked · sends when you're back online` · disabled: as empty · restricted: cannot reach this sheet (B3 handles)

### B6 · Filters (full-screen sheet)
**Shows:** `×` · `Filters` · **When**: chips `This week` (on) · `Today` · `This weekend` · `Any time` · **Your interests**: a checkbox per chosen sub-interest, all on by default, plus `Show plans in other interests too` off · **Plan type**: `Any` (on) · `One to one` · `Group` · `For women` (shown only to declared women) · footer: `Clear all` underlined · gradient button `Show 12 plans` with the live count.
**Does:** Every change updates the count without leaving the sheet. `Show N plans` applies and closes. `Clear all` returns to the defaults. `×` discards changes (`Never mind` semantics, no confirmation because the previous state is one tap away).
**Rules:** Filters only narrow what delivery already produced; nothing here widens reach. `Show plans in other interests too` is the one exception and it is the person's explicit tap. Filter state persists across sessions and is shared by map and list.
**States:** loading (count): the button shows `Show plans` until the count arrives, under 300 ms · empty (count 0): button reads `No plans match` and is disabled; `Clear all` stays live · error: count line `Couldn't check. Try again.` with the button still applying · offline: counts from the cached feed, banner · disabled: as empty · restricted (unverified): identical; filters are a read

### B5 · Share a plan (system)
**Shows:** system share sheet with text `Badminton after work, need two · Thu 7pm near Sector 5 · truegoing.app/p/…`.
**Rules:** The link opens B3 in the app or a web page with the same rough information and `Get Truegoing`. Never the exact place.
**States:** n/a beyond system.

---

## C. Posting

### C1 · Post a plan (sheet)
**Shows:** grab handle · text field focused, placeholder `What's the plan?`, 140 characters · `We picked these out. Tap one to change it.` · chips: what (icon + sub-interest), where (default home neighbourhood), when, how many (default 2) · `Show on the map` switch, on · `For women only` switch, off; shown only if the person declared woman · reach line `People nearby who like badminton will see this. Only the people you accept see the exact place.` (full paragraph on the first plan ever) · `Post plan`.
**Does:** Typing updates chips live. Tap what → sub-interest picker; where → C2; when → C3; how many → stepper 1–20. Post → C4 toast, sheet closes, B1/B2 shows the plan with `LIVE`.
**Rules:** The tap on a chip is the fact; extraction is a suggestion. A plan needs what, where, when. Words freeze at the first ask. `Show on the map` locks at the first ask. Reach is fixed.
**States:** loading: `Post plan` → `Posting…` · empty: chips grey, `Post plan` disabled · error (missing): red chips `Where?` `When?`, line `Add a place and a time so people know where to be.`, quick picks shown; (send failed): `That didn't post. Everything you typed is still here.` · offline: `Post plan` → `Post when online`; queued with a banner on B2 `Your plan will post when you're back online.` · disabled: as empty · restricted (unverified): the `+` on B1 opens a short sheet `Add your number to post a plan.` · `Add` · `Not now`

### C2 · Where is the plan?
**Shows:** `Where is the plan?` · search field · `Sector 5, Panchkula (your neighbourhood)` row first · results · optional `Exact place` field: `Sector 5 Sports Complex, Court 3` · `Only people you accept see this.` · `Done`.
**Does:** Pick a neighbourhood; type an exact place.
**Rules:** Neighbourhood is public at coarse grid; exact place is private until acceptance.
**States:** as A6, plus disabled: `Done` until a neighbourhood is picked

### C3 · When
**Shows:** quick picks `Tonight 7pm` · `Tomorrow evening` · `This weekend` · `Pick a time` → system date-time picker · `Done`.
**Rules:** Must be in the future; at most 30 days ahead. Fixed English day names.
**States:** error: `Pick a time in the next 30 days.` · disabled: `Done` until set · others n/a

### C4 · Posted (toast, then B1/B2)
**Shows:** toast `Posted. We'll tell you when someone asks to go.` If push is off: `Posted. Turn on notifications to hear when someone asks.` · `Turn on` · `Not now`.
**Rules:** Never promise a notification that cannot arrive.

---

## D. People

### D1 · Host or member profile
**Shows:** photo, `✓ Aarav`, `Sector 5 · since March`, one line about, `12 plans hosted · 19 joined · showed up 97%`, interests chips, `Regular host` mark if earned, `For women` declared mark where relevant, `Connected accounts · 1` (count only, or the handles if you have been accepted on a shared plan), `Live plans` (their public plans), `block · report` as quiet text at the foot.
**Does:** Tap a live plan → B3. Block → D2. Report → D3.
**Rules:** Nothing social: no followers, no views, no likes. Handles visible only after acceptance on a shared plan.
**States:** loading: skeleton · empty (no plans): `No live plans.` · error: `Couldn't load this profile.` · offline: cached · disabled: n/a · restricted: a blocked person's profile never opens; deep link shows `This profile isn't available.`

### D2 · Block (alert)
**Shows:** `Block Aarav?` · `You won't see each other or message again. You'll leave any plan you share.` · `Block` (destructive) · `Keep it`.
**Rules:** Mutual, immediate, silent to the other side. Blocker leaves shared plans; host blocking a member removes the member.
**States:** loading: `Blocking…` · error: `That didn't work. Try again.` · offline: queued, applied locally at once

### D3 · Report
**Shows:** `What happened?` · reasons list (harassment, fake profile, not who they said, no-show pattern, something else) · optional text · `They won't know who reported them.` · `Also block` switch, on · `Send report` · `Never mind`.
**Rules:** A report inside a women-only plan confirmed by the host removes the account permanently.
**States:** loading, error, offline as D2 · empty: `Send report` disabled until a reason · restricted: n/a

---

## E. Activity

### E1 · Activity
**Shows:** `Activity` · chips `Needs you · N` (default) · `Waiting` · `Your plans` · `Chats`.
Needs you rows: `Riya asked to go` + note + plan, `Accept` · `Decline` on the row; `Did you meet Aarav?` + plan, `Yes` · `No` on the row. Waiting rows: `Asked Aarav · Badminton after work · Thu 7pm` with `Take back`. Your plans rows: plan, `1 going, 2 asked`, `Cancel`. Chats: threads with last line and unread dot.
**Does:** Every action on the row, no long press. Row tap → the plan (B3 host view) or the chat (F1).
**Rules:** Decline is silent to the asker. `Did it happen?` appears after the plan's time and disappears after 7 days unanswered. Accept fails cleanly when slots are full: `This plan is full.`
**States:** loading: skeleton rows per chip · empty: Needs you `Nothing needs you right now.`; Waiting `You haven't asked to go anywhere yet.` · `Find a plan`; Your plans `You haven't posted a plan.` · `Post a plan`; Chats `Chats open when an ask is accepted.` · error: `Couldn't load activity.` · `Try again` · offline: cached rows, actions queue with `Will send when online` · disabled: Accept when full · restricted (unverified): only `Your plans` and `Chats` exist and are empty with the verify banner

### E2 · Ask review (row tap, optional)
**Shows:** Riya's card as on D1 plus her note, `Accept` · `Decline`.
**States:** as E1

### E3 · Did it happen? (sheet or push action)
**Shows:** `Did you meet Aarav?` · `Yes` · `No`. On No: `Did you go?` · `I went` · `I didn't go`.
**Rules:** A meetup counts only when both say Yes. "I didn't go" is a no-show on the person answering. Answers are never shown to the other person directly.
**States:** loading: `Saving…` · error: `That didn't save. Try again.` · offline: queued, `Saved. Sends when online.`

### E4 · Cancel plan (alert)
**Shows:** `Cancel this plan?` · `Everyone going will be told.` · `Cancel plan` (destructive) · `Keep it`.
**Rules:** Accepted people get a push; chat goes read-only with a system line `Aarav cancelled this plan.`

---

## F. Chat

### F1 · Thread
**Shows:** header: back, plan sentence, `3 going` (members only) · pinned plan: icon, `Thu 7pm · Sector 5 Sports Complex, Court 3`, `Exact place · Add to calendar · Directions` · opener (once, at the top): `Everyone here is going.` · `Share your number after you've met, not before.` · `Meet in a public place the first time.` · `Report anything off. They won't know it was you.` · messages with first names in a group · quick lines `Running late` · `I'm here` · camera · location · field `Message`.
**Does:** Send text, photo, location. Reply, react. Header tap → members list (F2). In a group, `Message Aarav privately` from the header.
**Rules:** One-to-one plans: one private thread. Group plans: one room for host and accepted people, created at first acceptance; askers never in it. Exact place visible only here and on the accepted person's B3. Read-only after the plan's time plus 24 hours: system line `This plan has ended. The chat is read-only.` Photos moderated on upload.
**States:** loading: skeleton bubbles · empty (no messages yet): opener only, plus `Say hello.` placeholder · error: failed bubble with `Didn't send · Tap to retry` · offline: bubbles marked `Sending when online`; reading works · disabled: field after the thread ends · restricted: a person removed or blocked sees `You're no longer in this plan.` and the thread closes

### F2 · Members
**Shows:** host first, `Host` tag; members with photo, name, record; for each, `›` → D1.
**Rules:** Only members see this list. Count is real.
**States:** as F1

---

## G. You

### G1 · You
**Shows:** `You` · `Edit` · card `WHAT HOSTS SEE`: photo, `✓ Piyush`, `Sector 5 · since March`, one line, `12 hosted · 19 joined · showed up 97%`, interest chips, marks · rows: `Connected accounts · Instagram · shown after a yes ›` · `Your plans · 1 live · 31 past ›` · `Blocked · Nobody ›` · `Settings ›`.
**Does:** Edit → G2. Rows → G3–G6.
**Rules:** The card is exactly what a host sees when you ask. Points (Layer 2) appear here later, only to you.
**States:** loading: skeleton card · empty (new account): record shows `No plans yet`, no marks · error: `Couldn't load your profile.` · offline: cached · disabled: n/a · restricted (unverified): card shows `Not verified` in place of the tick with `Add your number`

### G2 · Edit profile
**Shows:** photo with `Change`, first name, one line about (80), interests → A4 as a sheet, neighbourhood → A6.
**States:** as A3/A7 · error: `Keep your line under 80 characters.`

### G3 · Connected accounts
**Shows:** `Instagram` field (handle without @) · `Shown to people you're meeting, after they're accepted. Never before.` · `Save` · `Remove`.
**Rules:** Stored owner-only; read through the same gate as the exact place. No follower counts, no previews.
**States:** error: `Handles use letters, numbers, dots and underscores.` · offline: queued

### G4 · Your plans
**Shows:** `Live` and `Past` sections; each row → B3 host view; past rows show `Happened · 3 met` or `Didn't happen`.
**States:** empty: `You haven't posted a plan.` · `Post a plan`

### G5 · Blocked
**Shows:** list, `Unblock` on each row, `They won't be told.`
**States:** empty: `Nobody.`

### G6 · Settings
**Shows:** `Phone number · +91 …` → change flow (A1/A2 for the new number) · `Notifications` with a switch per kind: someone asked · accepted · new message · plan starts in an hour · did it happen · a plan you'd like · weekly digest · monthly recap · `Woman` declaration switch with `Lets you see and post plans for women.` · `Terms and privacy` · `Community guidelines` · `Help` (one email shown as text with copy) · `Delete account` at the foot.
**States:** notifications off at the system level: each switch shows `Off in iPhone Settings · Open Settings`

### G7 · Delete account (alert, then confirm)
**Shows:** `Delete your account?` · `Everything goes. Your number can't come back for 30 days.` · `Delete` (destructive) · `Keep it`. Second step: type `DELETE`.
**Rules:** Everything owned is removed; threads show `Account deleted` to others; the phone hash is held 30 days to block re-entry.

---

## H. System surfaces

### H1 · Push notifications
Exactly eight, each with its own switch; payloads carry identifiers only. Titles: `Riya asked to go` · `Aarav said yes` · `Aarav: Court 3, bring…` (text is fetched on open, never in the payload; the payload says `New message`) · `Badminton after work starts in an hour` · `Did you meet Aarav?` (with `Yes` · `No` actions) · `A plan you'd like: badminton Thu 7pm` · `3 plans in your interests this weekend` · `You met 4 people in September.`

### H2 · Offline banner
One line across the top of any screen: `You're offline. Showing what we had.` Disappears on reconnect; queued actions send and toast `Sent.`

### H3 · Force update / maintenance
`Truegoing needs an update to keep working.` · `Update` — and — `We're fixing something. Back soon.` Nothing else on screen.

### H4 · Moderation console (owner, web)
Queue of reports: reporter (hidden from the reported), reported, reason, evidence (the thread excerpt, the plan), one-tap `Remove account` · `Warn` · `Dismiss`; a `women-only` badge on reports from women-only plans that triggers the one-strike rule. Not in the app.

---

## Acceptance for every contract

A screen is done when: all six states are implemented and screenshot-tested in light and dark at default and largest Dynamic Type; every string passes the copy test in `14 §12`; every action that touches another person shows its disclosure line; the rule under **Rules** has a failing test in the database before the screen ships; VoiceOver reads every control as its action.

## What comes next

`16 - Data Rules`: tables, who may read and write what, the server-controlled transitions, and the denied-path tests, carried from the previous database where it already says the same thing. Then `17 - iOS Build Plan`.
