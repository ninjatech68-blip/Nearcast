# TrueGoing, Reimagined

- **Status:** Source of truth since 2026-09-23 (see `README.md` in this folder).

A product plan, not an implementation plan. It is based on the two comparison documents and on the code as it stood on 2026-09-23.

Tags: **[Certain]** verified in code or screenshots; **[Likely]** strong inference; **[Guessing]** filling a gap.

---

## 0. Where the plan starts

"Better than or equal to MigoMap on everything" is the wrong target, and I've rejected it on purpose.

- **[Likely]** In a nearby-plans app, the product is the density of plans near you. MigoMap has users; TG has none. On density, TG will be worse for a long time, no matter how good the screens are.
- So the plan doesn't chase parity on every row. It sorts MigoMap's features into four buckets:
  - **Adopt as-is:** it works, and nothing about it conflicts with TG.
  - **Adopt, improved:** the idea is good, but TG can do it better.
  - **Deliberately different:** TG solves the same need another way.
  - **Refuse:** it damages users or brand, and it's why TG exists.
- **[Likely]** The single biggest risk isn't a feature gap. It's an empty feed on day one. Half of what's below is about that.

**The essence TG must not lose** (the things that are truly its own):

1. **People are not browsable. Plans are.**
2. **You choose who sees every post,** and the choice is informed.
3. **Every card says why you're seeing it.**
4. **Exact place and contact details are hidden until someone says yes.**
5. **No fake numbers, no fake people, no fake activity.**

Everything else, including the current colour scheme, the word "intent", five tabs, and the one-match-per-post model, is negotiable.

---

## 1. The reimagined product in one paragraph

**TrueGoing is where you find plans near you from people you can trust, and post your own without telling strangers where you are.** Open the app and see a map and list of plans happening nearby, each with a line about why it reached you: a friend is going, a friend vouched, it's near you and matches your interests. Tap "I'm in" and you're in the group chat. Post your own plan in ten seconds and pick how far it travels: friends, friends of friends, nearby, or anyone in your area. Nobody sees your exact spot until they're in. When you meet, the app has your back with a check-in and a trusted contact. Show up, and your profile shows it.

**Positioning line:** *Plans near you. People you can trust. Nobody knows where you are until you say so.*

---

## 2. The core model

### 2.1 Three kinds of post (kept from TG, sharpened)

| Post | Framing | Join model | Example |
|---|---|---|---|
| **Plan** ("I want to") | Open group activity | One-tap **I'm in**, up to a capacity | "Badminton tonight, 2 spots" |
| **Ask** ("I need") | A favour or a hand | **Ask to join** → host accepts | "Someone to help move a sofa Saturday" |
| **Offer** ("I have") | Something to share | **I'll take it** → host accepts | "Spare ticket for the gig" |

- **Why keep three:** MigoMap covers only activities. Asks and offers are the same "nearby, trusted" need, and no competitor covers them well. [Likely] This is TG's broadest lane.
- **What changes:** Plans get a group model with capacity and "N going". The current one-match-per-post limit is dropped for Plans and kept only for Asks and Offers, where one accepted person is the norm. [Certain] that the current schema is one-match-only (`M:123`).

### 2.2 Reach: the ladder becomes a dial

The four levels stay, but they're renamed and explained:

| Today's name | New name | Who it means |
|---|---|---|
| origin_only | **Friends** | People you've connected with |
| adjacent_network | **Friends of friends** | One step out |
| nearby_relevant | **Nearby** | People within your area with matching interests |
| broader_approved | **Anyone in [Chandigarh]** | Everyone in the city who has the app |

**Improvement over both apps:** as you slide the dial, the sheet shows a **real, live estimate** of how many people that reach covers, e.g. "≈ 8 friends · ≈ 40 friends of friends · ≈ 210 nearby". These are counts of real accounts computed on the server, so they're honest. If a number is below a floor (say 5), it shows "a few", not a fake number.

**Default at launch:** "Nearby" is pre-selected while the friend graph is thin. The user still confirms it. That keeps the informed-choice principle and avoids the empty-feed problem.

### 2.3 Trust: earned by showing up

This is the piece MigoMap doesn't have and can't copy quickly.

- **Connections come from real life.** You connect with someone after you've been to a plan together, or by mutual add, or by importing hashed phone contacts. No cold "Add Friend" on strangers' profiles.
- **Showed up.** After a plan ends, everyone who was there confirms who showed up. Each confirmation is a real, mutual record. A profile shows "Showed up 14 times" and "Hosted 3 plans", never a rating out of five.
- **Vouch.** Any friend can vouch for a plan ("Priya vouches for this"). It doesn't mean they're going; it means they trust the host. Vouches ride with the plan as it travels to friends of friends. [Certain] The schema already has a confirmations table (`M:90-95`) that maps to this.
- **Verified** by selfie (adopt from MigoMap), shown as a badge. Verified-only plans become possible.

---

## 3. What to take from MigoMap, and how

### 3.1 Adopt as-is

| Feature | Evidence | Note |
|---|---|---|
| One-tap **"I'm in"** for open plans | SS25 | The single most important interaction in the app |
| "N going" with avatar stacks | SS25, SS30 | Only real counts |
| Emoji + one-sentence create ("I want to…") | SS35 | Keep TG's need/have/want as the first choice, then MigoMap's sentence |
| Pick location by moving the map under a pin | SS37 | Stores an approximate point publicly, exact point privately |
| Relative time ("now", "tonight", "Sat") | SS30 | Replace "Expires in 7 hours" |
| Category chips with emoji | SS34 | Food & Drinks, Outdoor, Games, Culture, Rides, Help… |
| Report + "Also block" in one sheet | SS22 | With "They won't know who reported them" |
| Skeleton loaders, warm empty states | SS1, SS3, SS4 | |
| Notification pre-prompt with two benefits | SS14 | |
| Nearby-plan alerts with a radius setting | SS9 | |
| Distance unit, language, appearance (System / Dark / Light) | SS9 | TG is light-only today, `app.json:9` |
| Delete account, sign-in methods, legal pages | SS13 | App Store requirements |
| "Message the founder" | SS11 | Cheap, human, right for an early product |
| Glass round icon buttons, sheets with grabber | SS16, SS22 | |
| Progress bar and Skip on optional steps | SS2, SS15 | |
| "you're in, {name}!" arrival moment | SS24 | |
| Welcome message from a real human | SS6 | From the founder, marked as a person, not a brand persona with an age |

### 3.2 Adopt, improved

| MigoMap does | TG does instead | Why it's better |
|---|---|---|
| Map of activity pins at specific spots (SS27) | **Map of plans at approximate spots**, snapped to a neighbourhood grid, clustered when close | Same liveliness, no way to pinpoint a host's location |
| List: "17 Activities Here" (SS30) | **"17 plans near you"** + a reason line on each card | Adds transparency |
| Chat opens for everyone | **Group chat opens the moment you're in.** For Asks and Offers it opens on accept | Keeps speed for plans, protection for favours |
| Profile: photos, bio, interests, PRO badge (SS28) | Profile: photo, bio, interests, **Showed up ×14, Hosted ×3, Verified, mutual friends, plans you both went to** | Trust signals instead of paid status |
| Friends list, Add Friend on strangers (SS4, SS28) | **Connections**: from shared plans, mutual adds, or hashed contacts | The graph reflects real trust |
| Trips: destination, dates, "N going" (SS38) | **"Heading to"**: set a city and dates, see plans there and post ahead; hosts there see "3 people arriving this week" | Same pre-arrival loop, framed around plans rather than browsing travelers |
| Safety sheet with tips (SS7) | **Meetup mode**: 1 hour before, exact spot unlocks for joined people only; optional check-in with a trusted contact; "I'm safe" / "Need help" | Safety becomes a feature, not a leaflet |
| Stealth Mode: hide from the people list (SS9) | No people list, so nothing to hide from. Instead: **Quiet mode** (pause alerts) and **per-post reach** | Control per post is more precise |
| Selfie verification (SS26) | Same, plus **Verified-only plans** as a host option | Gives verification a reason to exist |
| Interest filters on people (SS16) | Interest filters on **plans** | Filters what to do, not who to look at |
| Search by city (SS20) | Search by place, plan, or category | |
| Share activity link (SS25) | Share link that opens a **privacy-safe public page**: title, area, time, first name only | Already in the schema, `M:352-399` |
| Rating prompt with testimonials, pre-use (SS17) | Ask for a store rating **only after the user confirms a plan went well** | Honest ratings, no App Store risk |
| Profile completeness ring (SS26) | Completeness ring, but the items are trust items: photo, verified, first plan, first show-up | Nudges toward the behaviours that make the network work |

### 3.3 Deliberately different

| Need | MigoMap | TG |
|---|---|---|
| Making a thin city feel alive | Round-number badges ("100+ people") and a busy pin map | **Density honesty + density building.** "12 plans this week in Sector 17" when true. Below the floor: "Be the first to post in your area" with a one-tap starter plan. Plus a hosts programme (§5). |
| Knowing who's around | People Nearby list with distance | **"Who's around" as a number, not a list**: "38 people nearby have interests like yours". Never names, never distance. |
| Women's safety | A gender filter on people (paid) | **Host-set plan attributes:** "Women only", "Verified only", "Friends of friends only". Attributes belong to the plan, not to browsing people. |
| Revenue | Pay to see people | See §7 |

### 3.4 Refuse

| Feature | Why |
|---|---|
| Named people list with distance (SS23) | Location-safety risk. Contradicts principle 1. |
| Gender-gated paywall (SS21) | Dating-app mechanic that pushes unwanted attention. |
| Profile-view counter and notifications (SS26, SS9) | Rewards looking at people. |
| Pre-use rating prompt (SS17) | Manipulative. |
| Brand account presented as a 25-year-old person (SS28) | Fake person. |
| Weekly billing as the default (SS19) | Refund and churn magnet. |
| "helps us match you with the right people" as a reason to ask gender (SS10) | Dating language. TG asks gender only to enable women-only plans, and says so. |

---

## 4. The reimagined app, screen by screen

### 4.1 Navigation

- **4 tabs:** **Nearby** (map + list) · **Chats** · **Post** (centre, big) · **You**.
- Notifications move to a bell on Nearby, with a badge.
- Everything that isn't a tab is a bottom sheet over the map: plan card, filters, create flow, report.
- Drop the "Activity" tab. [Certain] Today it's static and its name clashes with "activity".

### 4.2 Onboarding: four screens, value in under a minute

1. **Sign in:** Apple or phone. Terms line underneath.
2. **"What should we call you?"** name + date of birth (18+ gate). One screen.
3. **"What do you like doing?"** interest chips with emoji. Skippable.
4. **"Where are you?"** an explainer *before* the system prompt: "We show plans around you. We never show anyone where you are." Then the prompt.
5. → **Nearby**, immediately.

Photo, bio, gender, hometown, social link, and notifications are asked **later, at the moment they matter**:
- Photo: asked before your first "I'm in" ("People going will want to recognise you").
- Notifications: asked after your first join ("Get told when the plan changes").
- Gender: asked only if you try to join a women-only plan or host one.
- Bio and social: on the profile, with the completeness ring.

### 4.3 Nearby (home)

- **Top half:** a map of plan pins (emoji + host avatar) at approximate spots, clustered. Tap a pin for the card.
- **Bottom sheet, half open by default:** "17 plans near you", sort by *Soonest / Popular / Closest*, chips *All · Tonight · Food · Outdoor · Games · Help…*
- **Each row:** emoji, title, "Sector 8 · tonight 8pm", avatar stack "3 going", and the **reason line** in small green text: "Priya is going", "Near you · Badminton", "Vouched by Arjun".
- **Header:** search, bell, and a small **"Heading to"** chip if a trip is set.
- **Empty (honest):** "Nothing near you yet. 4 plans in Panchkula this week →" and "Post the first plan in Sector 8" with three one-tap starters: *Coffee now · Walk this evening · Badminton this weekend*.

### 4.4 Plan card (sheet)

- Emoji, **"Badminton tonight"**, host avatar and first name, Verified tick if verified.
- "Sector 8 area · tonight 8:00 pm · 2 spots left"
- Avatar stack: "Priya, Arjun and 1 more are going"
- **Reason line:** "Why you're seeing this: Priya is going." ("Not for me" link next to it.)
- Vouches: "Vouched by Arjun".
- Plan attributes as small tags: Women only · Verified only · Friends of friends.
- Privacy strip: **Exact spot unlocks 1 hour before, for people going.**
- **Primary button: I'm in.** For Asks: **Ask to join**, with an optional note. Share and Report icons.

### 4.5 Post (create)

Steps in one sheet, with a progress bar. Target: ten seconds for the default path.

1. **I want to / I need / I have**, then a sentence: "I want to… *play badminton tonight*" with an emoji picker that auto-suggests from the text.
2. **When:** Now · Tonight · Tomorrow · Pick, plus **Repeat weekly** (recurring plans build density).
3. **Where:** drag the map under a pin. Small note: "People see the area. The exact spot unlocks for people going, 1 hour before."
4. **Who can join:** capacity (2, 4, 8, no limit) and attributes (Women only, Verified only).
5. **Who sees it:** the reach dial with live counts. Default: Nearby.
6. **Post.** Confirmation: "Posted to ≈ 210 people nearby. We'll tell you when someone's in."

### 4.6 Chats

- Tabs: All · Plans · Asks · Unread.
- A plan's chat exists from the moment it's posted; the host is in it alone until someone joins.
- Composer: text, photo, poll ("8pm or 8:30?"), and **Share exact spot** (host only; this is how the exact place is released, and it's recorded).
- **System messages** for join, leave, spot unlocked, plan starting, and "How did it go?".
- Shield in the header → Meetup mode and Safety.

### 4.7 Meetup mode (new)

- Turns on one hour before a plan you're going to.
- Exact spot appears, with directions.
- Optional: "Share this plan with a trusted contact" (a text message with the plan, area and time, no other people's details).
- After: "Did you make it? Who showed up?" (a tap per avatar). This builds the Showed-up record.
- "Something felt off" → report, block, or "Call someone", right there.

### 4.8 You (profile)

- Photo, name, age, area. Badges: Verified · Showed up ×14 · Hosted ×3.
- **Completeness ring** with trust items.
- Bio, interests, your upcoming plans, past plans (private by default).
- Connections, Heading to, Settings.
- On someone else's profile: mutual connections, "You both went to Badminton on 12 Sep", their upcoming plans you can see, **Connect** (only if you've shared a plan or they're a friend of a friend), and **Message** only inside a shared plan chat.

### 4.9 Notifications

- Types: someone's in, someone asked to join, accepted, plan starting, spot unlocked, new plan near you (radius setting), a friend posted, vouch received, show-up confirmed.
- Every "new plan near you" notification includes the reason, and contains no plan text or coordinates. [Certain] That matches the existing payload rule in `M:212`.

### 4.10 Settings

- Appearance (System / Dark / Light), language, km/mi.
- Alerts: plans near you within [5 km], friends' plans, quiet hours.
- Privacy: who can see my past plans, hashed-contact matching on/off.
- Account: sign-in methods, blocked people, delete account.
- Safety: trusted contact, safety tips, community rules.
- Support: message the founder, contact support, rate (only shown after a confirmed good plan).
- Version.

---

## 5. Cold start: making the first city feel alive without lying

[Likely] on all of this; it's strategy, not code.

1. **One city first** (Chandigarh Tricity: MigoMap's screenshots show real activity there, SS23/SS27/SS30, so demand exists).
2. **Hosts programme:** 20 to 30 real hosts, recruited in person, who each run one recurring plan a week (badminton Tuesdays, coffee walks Saturdays). Their profiles carry a **Host** badge that says what it is.
3. **Recurring plans** make every week's calendar non-empty without anyone inventing anything.
4. **Starter plans** with one tap from the empty state, so a first-time user posts in three seconds.
5. **Honest density numbers:** "12 plans this week within 5 km" when true; "Be the first" when not.
6. **Vouch-driven spread:** every host's plan is vouched by other hosts, so it travels to friends of friends.
7. **A real welcome:** a message from the founder as a person, with a photo of their own plan this week.
8. **Heading to:** travelers set the city before arriving, so hosts see demand ahead of time.
9. **Partner venues** (adopt MigoMap's "Become a Partner"): cafés and courts can host plans with a Venue badge and a fixed spot. Their exact location is public because it's a business.

---

## 6. Vocabulary (final)

| Use | Instead of |
|---|---|
| **plan · ask · offer** | intent, activity, event |
| **Post** | Broadcast |
| **I'm in · Ask to join · I'll take it** | Request to join |
| **Not for me** | Not relevant |
| **Friends · Friends of friends · Nearby · Anyone in [city]** | Trusted circles, Adjacent network, Relevant nearby, Broader approved |
| **Why you're seeing this** | Why this reached you |
| **host · people going** | broadcaster, participant, recipient |
| **Exact spot unlocks for people going** | Hidden until accepted |
| **Showed up · Hosted · Vouched** | (new) |
| **Nearby · Chats · Post · You** | For You · Activity · Broadcast · Messages · You |

---

## 7. Monetization (later, and never selling people)

| Idea | Who pays | Why it fits |
|---|---|---|
| **Boost a plan** to "Anyone in the city" | Host | Reach is still chosen explicitly; you're paying for distance, not for people |
| **Host tools** (recurring plans, capacity waitlists, co-hosts, attendance history) | Regular hosts | Serves the people who create density |
| **Venue partner plans** | Venues | Fixed-location, business-hosted plans with a badge |
| **Heading-to premium:** post ahead in multiple cities, see demand | Frequent travelers | |
| Not: paying to see or filter people, profile views, read receipts as status | | |

Billing default: monthly, never weekly. Trial before charge.

---

## 8. Priorities

**P0: the loop, honest and safe.** Nothing else matters until two strangers can post, join, chat and meet.
- Sign in (Apple, phone) · 4-screen onboarding · Nearby map + list with reason lines · Post flow with reach dial · I'm in / Ask to join · Group chat with realtime · Exact-spot unlock for people going · Report + block · Honest empty states · Analytics funnel.

**P1: reasons to come back.**
- Notifications with radius · Meetup mode + Showed up · Vouch · Connections from shared plans · Profile with trust badges + completeness ring · Filters, search, sort · Recurring plans and starter plans · Dark mode · Settings incl. delete account.

**P2: trust depth and the second loop.**
- Selfie verification + Verified-only plans · Women-only plans · Hashed contacts · Heading to · Share link with the public page · Trusted contact in Meetup mode · Post-plan rating prompt.

**P3: growth and revenue.**
- Hosts programme tooling · Venue partners · Boost · Host tools · Refer a friend (invite, not "earn").

**Drop from today's TG:** the "Activity" tab, the word "intent" and "broadcast", light-only theme, the always-selected reach row, the request form as the only way to join, one match per post.

---

## 9. Where TG ends up against MigoMap

| Dimension | Outcome |
|---|---|
| Speed of core loop | **Equal.** Same one-tap join, same ten-second post. |
| Discovery surface | **Equal on form, better on trust.** Map + list, plus a reason on every card. |
| Density | **Worse for a long time.** Mitigated by hosts, recurring plans, and honest empty states. No way round this. |
| Safety | **Better, structurally.** No people list, approximate spots, timed unlock, meetup mode, host-set plan attributes. |
| Trust signals | **Better.** Showed-up records and vouches versus PRO badges and profile views. |
| Onboarding | **Better.** 4 screens versus 11+. |
| Breadth | **Better.** Asks and offers, not only activities. |
| Travel loop | **Equal.** Heading to versus Trips. |
| Visual warmth | **Equal**, once dark mode, emoji markers and avatar stacks exist. |
| Revenue | **Slower, cleaner.** No paid access to people. |

---

## 10. Risks

- **[Likely] Density.** The hosts programme is the whole bet. Without 20 committed hosts in one city, none of the trust features have anything to run on.
- **[Likely] Friction from principles.** Timed spot unlock and no cold DMs are safer and slightly slower. Watch drop-off at the join step and be ready to loosen for open plans.
- **[Guessing] Women-only plans** need policy: who can set them, what verification is required, how misuse is handled.
- **[Certain] Everything above changes what the docs and schema say today.** That's intended, and it's a decision for you.

## Change log

| Date | Change |
|---|---|
| 2026-09-23 | Created and saved to the repo |
