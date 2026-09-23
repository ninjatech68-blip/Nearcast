# MigoMap vs TrueGoing: Experience, UI, Copy, Navigation, Features, UX

**Scope.** This compares only what a user sees and does. Backend and security are out of scope.

**Evidence.**
- MigoMap: `SS#` is a screenshot, numbered 1–38 in upload order.
- TrueGoing (TG): references are to a source file or to a screen I captured in Chromium.

**Caveat on TG.** TG was captured from its web build. Icons show as single letters there (for example "FY" and "S"), so I don't judge icons.

**Before you read the verdicts.** Most TG controls are not wired up.
- Publish does nothing: `preview.tsx:57`.
- Send only closes the sheet: `request/[id].tsx:26`.
- The "Nearby" and "All intents" chips cannot be pressed.
- Opening any card shows the same fixture.

Where a TG row says "(static)", I am judging the design as drawn, not a working feature.

**Verdict key:** **M** = MigoMap is better. **TG** = TrueGoing is better. **=** = tie. **Neither** = both fall short.

---

## 1. End-to-end journey, stage by stage

| # | Stage | MigoMap | TrueGoing | Better | Why |
|---|---|---|---|---|---|
| 1 | First launch | Animated world map with sample plans ("bali · in 2h", "tokyo · now", "3 going") and "welcome to migomap" (SS31) | Opens straight onto the For You feed with 2 fixture cards | **M** | MigoMap shows what the app is for in one screen. TG gives no context. |
| 2 | Value proposition | "find activities near you, join in, and meet travelers wherever you go" (SS31) | Only a footer line: "Private by design. Origins, exact places, and contact details stay hidden…" (`index.tsx:33`) | **M** | MigoMap tells you what you can do. TG leads with what it hides, which is a benefit but not a reason to start. |
| 3 | Sign-in | Apple or phone (SS31) | None | **M** | TG has nothing here. |
| 4 | Legal consent | "By continuing, you agree to our Terms of Service and Privacy Policy" (SS31) | None | **M** | |
| 5 | Profile setup length | 11 or more screens: name and birthday, gender, interests, hometown, photo, bio and social, notifications, rating, "you're in" (SS12, 10, 18, 5, 2, 15, 14, 17, 24) | None | **M** (by default) | MigoMap's flow is too long, but TG has no flow at all. |
| 6 | Progress feedback | Progress bar, Skip on optional steps (SS15, SS18) | n/a | **M** | |
| 7 | Asking for a rating | Star rating prompt with testimonials before the user has done anything (SS17) | None | **TG** | Asking before the user has had any value inflates the score and irritates people. Not asking is the better experience. |
| 8 | Arrival moment | "you're in, PS!" radar with nearby faces and confetti, then "Start Exploring" (SS24) | None | **M** | Uses the person's name and makes arrival feel like an event. |
| 9 | Location permission | Asked after onboarding, on a world map that says "Zoom in to explore" (SS33) | Never asked | **Neither** | MigoMap asks too late, so the first map is empty. TG never asks. |
| 10 | First useful screen | Map full of emoji activity pins near you (SS27) | 2 fixed intent cards (captured `home.png`) | **M** | A lived-in map feels busy. Two cards feel empty. |
| 11 | Browse | Map, "See list", sort, category chips, search (SS27, SS30) | Scrolling list of cards | **M** | More ways in, and faster scanning. |
| 12 | Inspect an item | Bottom-sheet card over the map: emoji, "{name} wants to {text} {time}", "2 going", avatars, **I'm in** (SS25) | Full screen: primitive chip, title, time and area, "Why this reached you", Posted by, What they need, a privacy strip, Request to join / Not relevant (`intent/[id].tsx`) | **=** | MigoMap is faster and keeps you on the map. TG explains more: who posted, why you're seeing it, and what stays hidden. Pick speed or clarity. |
| 13 | Commit | One tap: "I'm in" (SS25) | Request to join, then an optional note, then Send request (static) (`request/[id].tsx`) | **M** for casual plans, **TG** for favours and offers | One tap beats a form for "coffee now". An approval step fits "I need a lift". |
| 14 | After committing | Group chat for the activity (SS6 "Activities" tab) | "Awaiting confirmation" row in Messages (static) (`messages.tsx:21`) | **M** | You go straight into coordinating. TG makes you wait with no feedback. |
| 15 | Coordinate | Chat with camera, gallery, poll, location and a safety shield (SS8) | No thread screen | **M** | |
| 16 | Host your own | "+" → emoji + "want to…" → category → map pin → time (SS35, 34, 37) | Broadcast tab → choose need/offer/want → text → review reach → Broadcast (no-op) (`create.tsx`, `preview.tsx`) | **M** for flow, **TG** for the reach step | MigoMap captures when and where. TG captures who can see it, which MigoMap never asks. |
| 17 | Follow-up and return | Notifications inbox, nearby-activity pushes within a 12 mi radius, friends, trips countdown (SS3, SS9, SS36) | Activity tab with static rows | **M** | MigoMap gives several reasons to come back. TG gives none. |
| 18 | Upsell | Pro paywall, gender-filtered "59 people found · Female · unlock" (SS19, SS21) | None | **TG** (as an experience) | Being blocked by a paywall behind a gender filter feels like a dating app. |
| 19 | Leave or delete | Sign Out, Delete Account (SS13) | None | **M** | |

## 2. Navigation and information architecture

| # | Aspect | MigoMap | TrueGoing | Better | Why |
|---|---|---|---|---|---|
| 1 | Tab count | 4: Map, Trips, Chats, Profile (SS27) | 5: For You, Activity, Broadcast, Messages, You (`(tabs)/_layout.tsx:46-50`) | **M** | Fewer, clearer destinations. |
| 2 | Tab labels | Icon only, with a selected pill (SS27) | Icon plus 11pt label | **TG** | Labels are easier to learn and more accessible. |
| 3 | Home | Map | Feed | **M** for a place-based product | Place is the main thing users filter by, so the map should be the home. |
| 4 | Create entry | Floating "+" on Map, Trips and Chats (SS27, SS38, SS6) | Centre "Broadcast" tab that opens a modal (`broadcast.tsx:4`) | **=** | Both are standard. MigoMap's "+" adapts to the screen you're on. |
| 5 | Secondary access | Top-right Friends and Notifications buttons on the map (SS27) | "…" glyph on For You that does nothing (`index.tsx:15`) | **M** | |
| 6 | Where notifications live | Bell icon on the map screen (SS3) | A whole "Activity" tab (bell icon) | **M** | A full tab for notifications is heavy at this stage. |
| 7 | Detail pattern | Bottom sheets over the map (SS16, 21, 22, 25, 34, 35) | Pushed full screens and modals (`_layout.tsx:55-59`) | **M** | Sheets keep your place on the map, and they're quicker to open and dismiss. |
| 8 | Back and close | Round glass back and close buttons, a check to confirm (SS16, 22, 32) | Header back and a TopBar chevron | **=** | |
| 9 | Deep link to a profile | Tap an avatar in a list or chat, see profile, then Message or Add Friend (SS23, SS28, SS29) | Tap "Posted by", see profile, then Request to join (`intent/[id].tsx:28`) | **=** | Both work. They lead to different next actions: MigoMap to talking, TG to joining a plan. |
| 10 | Chat filtering | All, Unread, Activities, DMs, Groups (SS6) | None | **M** | |
| 11 | Notification filtering | All, Requests, Events, Social (SS3) | None | **M** | |
| 12 | Settings location | Gear on Profile, with long grouped sections (SS9, 11, 13) | None | **M** | |
| 13 | Search | Places ("Paris, Tokyo, Bali…"), friends, messages (SS20, SS4, SS6) | None | **M** | |
| 14 | Number of levels | Mostly one sheet deep | Tab, then detail, then profile, then request modal | **M** | Fewer levels to get lost in. |

## 3. Visual UI

| # | Element | MigoMap | TrueGoing | Better | Why |
|---|---|---|---|---|---|
| 1 | Theme | Dark, with a System appearance option (SS9) | Light only (`app.json:9` `"userInterfaceStyle":"light"`) | **M** | Evening and outdoor use, and user choice. |
| 2 | Accent colours | Periwinkle for primary actions, coral "+", green "I'm in" (SS27, SS25) | Deep green (#176B50) plus a pale trust-green (`tokens.json`) | **=** | MigoMap's colours are more lively. TG's feel calm and trustworthy. They fit different brands. |
| 3 | Typography | Heavy rounded display type, lowercase headlines ("show us that smile") (SS2) | Manrope, sentence case, large bold "For You" (captured) | **M** | MigoMap has more personality. TG is clean but generic. |
| 4 | Illustration | 3D emoji everywhere: camera, bell, race car, confetti (SS2, 14, 18, 24) | None; placeholder initials | **M** | Warmth and a quick sense of category. |
| 5 | Activity marker | Emoji plus host avatar badge, on the map and in lists (SS27, SS30) | Text chip ("I need", "I want to") | **M** | Readable at a glance. A text chip reads like a form field. |
| 6 | Cards | Compact list rows with right-aligned time and "N going" (SS30) | Large cards with chip, title, meta, trust line, reason box and CTA (captured) | **M** for density, **TG** for clarity | You see 6 items at once on MigoMap versus about 2 on TG. |
| 7 | Social proof visuals | Overlapping avatar stacks, "2 going 🎉" (SS25, SS30) | None | **M** | |
| 8 | Trust visuals | Verified tick, PRO badge (SS28) | Green "Why this reached you" box, privacy strip (Area approximate / Exact place hidden / Contact hidden / Origin private) (`native-ui.tsx:73,133-136`) | **TG** | Explains privacy instead of showing status. |
| 9 | Buttons | Full-width pill CTAs, glass circle icon buttons (SS2, SS16) | Full-width green pill, text-link CTAs on cards | **M** | More consistent, and larger tap targets. |
| 10 | Sheets | Rounded sheets with grabber, header X and check (SS16, 22) | Modal screens with a system header | **M** | |
| 11 | Choice controls | Emoji chips (interests, types, gender filter), radio rows (SS18, 34, 16, 22) | Radio rows for reach, chips for primitive (captured `preview.png`) | **=** | |
| 12 | Imagery | Destination photos, profile photos, a world map on profiles (SS38, SS28) | None | **M** | |
| 13 | Density vs. whitespace | Dense but organised | Airy | **M** for a discovery app | Browsing needs volume on screen. |
| 14 | Overall polish | High and consistent | Early design-system stage | **M** | |

## 4. UX patterns and states

| # | Pattern | MigoMap | TrueGoing | Better | Why |
|---|---|---|---|---|---|
| 1 | Loading | Skeleton rows (SS1) | Blank until fonts load (`_layout.tsx:43`) | **M** | |
| 2 | Empty states | "Nothing here yet · Your notifications will show up as they come in"; "No friends yet · Start connecting with travelers around you"; "Where to next?" (SS3, 4, 38) | "No responses yet · When someone is interested, you will see it here."; "Messages appear after acceptance" (static) | **=** | Both are well written. MigoMap's point you to an action more often. |
| 3 | Error and offline | Not seen | None | **Neither** | |
| 4 | Input validation | Continue stays disabled until valid; green check on name (SS2, 5, 12) | "Review intent" stays disabled until text is entered; 0/500 counter (`create.tsx:54,60`) | **=** | |
| 5 | Pickers | Wheel date picker, map-pin place picker, Dates/Flexible toggle (SS12, 37, 32) | None | **M** | |
| 6 | Time display | Relative: "now", "tomorrow", "on Saturday", "in 9 days" (SS30, 36) | Mixed: "Tonight, 8:00 PM", "Expires in 7 hours", "Expires today" | **M** | Relative times are faster to read. TG's "Expires…" makes you think about when it disappears, not when it happens. |
| 7 | Distance display | "4.8 mi", "7.2 mi" on activities **and on people** (SS30, SS23) | Area names only ("Indiranagar area") | **TG** | An area is enough to decide. Exact distance to a person is a safety risk. |
| 8 | Friction to join | 1 tap | 3 steps | **M** for casual plans | |
| 9 | Safety at the moment it matters | Shield in the chat header opens safety tips (SS8, SS7) | Privacy strip on every intent; "Hidden until accepted" | **=** | MigoMap helps when you're about to meet. TG reassures before you engage. |
| 10 | Report | Sheet with 4 reasons, "user won't know", and an "Also block {name}" toggle (SS22) | None | **M** | Best practice. |
| 11 | Feedback on relevance | None | "Not relevant" link (static) plus a reason line | **TG** | Lets users shape their own feed. |
| 12 | Control over audience | Stealth Mode, "Hide from the nearby list" (SS9) | A reach choice per intent (static) | **TG** | Control per post beats hiding yourself entirely. |
| 13 | Pre-permission explainer | Notifications: "don't miss a thing" with 2 benefits (SS14). Location: none, it goes straight to the system prompt (SS33) | None | **M** | |
| 14 | Paywall behaviour | Shows a count, then blocks the list (SS21) | None | **TG** | Showing a count and then blocking the list feels manipulative. |
| 15 | Keyboard handling | Keyboard covers content in sheets (SS7, SS20, SS32, SS36) | Composer handles keyboard dismissal (PROJECT_LOG entry) | **TG** | MigoMap leaves the keyboard open on screens that aren't typing screens. |
| 16 | Personalisation | Uses your name ("you're in, PS!", "hey ps!") (SS24, SS6) | Initials "PS" only | **M** | |

## 5. Features

| # | Feature | MigoMap | TrueGoing | Better | Why |
|---|---|---|---|---|---|
| 1 | Activity map | ✅ (SS27) | ❌ | **M** | |
| 2 | Activity list, sort, categories | ✅ Popular / All / Food / Outdoor… (SS30) | Static pills | **M** | |
| 3 | Create activity | ✅ emoji, text, 13 types, map pin, time | Text + type only; publish does nothing | **M** | |
| 4 | Audience / reach choice | ❌ | ✅ 4 levels (static) | **TG** | TG's main idea. |
| 5 | "Why you're seeing this" | ❌ | ✅ per card | **TG** | |
| 6 | One-tap join | ✅ | ❌ | **M** | |
| 7 | Request with a note | ❌ | ✅ (static) | **TG** | Useful when there's more at stake. |
| 8 | Group attendance ("N going") | ✅ | ❌ | **M** | |
| 9 | Group chat | ✅ | ❌ | **M** | |
| 10 | DMs | ✅ (Message on any profile) | ❌; chat only after acceptance | **=** | MigoMap is more open. TG's rule is safer. |
| 11 | Chat extras (poll, photos, location) | ✅ (SS8) | ❌ | **M** | |
| 12 | Friends | ✅ add, search, sent requests (SS4, 9) | ❌ | **M** | |
| 13 | Nearby people list | ✅ with distance (SS23) | ❌ (deliberately) | **TG** | Prevents people being browsed and stalked. |
| 14 | People filters (gender, age, interests) | ✅ (SS16) | ❌ | **TG** | They make it feel like a dating app. Interest filters on *activities* would be fine. |
| 15 | Profiles | ✅ photos, bio, interests, age, city, visited-world map (SS28, 29) | Name, area, trust line (static) | **M** | |
| 16 | Profile completeness meter | ✅ 33% (SS26) | ❌ | **M** | Nudges people to finish their profile. |
| 17 | Profile views | ✅ counter plus notifications (SS26, 9) | ❌ | **TG** | It encourages checking who looked at you. |
| 18 | Selfie verification | ✅ (SS26) | ❌ | **M** | |
| 19 | Trips (destination plus dates) | ✅ (SS20, 32, 36, 38) | ❌ | **M** | |
| 20 | Notifications inbox | ✅ tabbed (SS3) | Static Activity tab | **M** | |
| 21 | Nearby-activity push with a radius | ✅ 12 mi (SS9) | ❌ | **M** | |
| 22 | Stealth mode | ✅ (SS9) | n/a (no people list) | **TG** | TG doesn't need it because it has no people list. |
| 23 | Safety tips | ✅ (SS7, 13) | Privacy strip only | **M** | |
| 24 | Report and block | ✅ (SS22, 9) | ❌ | **M** | |
| 25 | Share | ✅ profile and activity (SS25, 26) | Icon only (static) | **M** | |
| 26 | Social link on profile | ✅ Instagram (SS15) | ❌ | **M** | |
| 27 | Units and language | ✅ km/mi, language (SS9) | ❌ | **M** | |
| 28 | Subscription | ✅ Pro (SS19) | ❌ | **M** (as a business) | |
| 29 | Refer and earn / partner | ✅ (SS11) | ❌ | **M** | |
| 30 | Message the founder / support | ✅ (SS11) | ❌ | **M** | |
| 31 | Welcome message | ✅ from the official account (SS6) | ❌ | **M** | The inbox isn't empty on day one. |

**Count.** MigoMap wins 23 of these rows, TrueGoing wins 7, and 1 is a tie. All 7 TG wins come from privacy, relevance, or leaving out something harmful.

## 6. Copy, screen by screen

| # | Moment | MigoMap copy | TrueGoing copy | Better | Why |
|---|---|---|---|---|---|
| 1 | Tagline | "find activities near you, join in, and meet travelers wherever you go" | "Private by design. Origins, exact places, and contact details stay hidden until permission changes." | **M** | MigoMap names benefits with verbs. TG's line is abstract and uses jargon ("Origins", "permission changes"). |
| 2 | Home title | (map, no title) / "17 Activities Here" | "For You" / "Around you" | **M** | A specific count and a place beat a generic label. |
| 3 | Create prompt | "WANT TO" + placeholder "play some cards…" (SS35) | "What do you need, offer, or want to do?" + "Share a clear and specific intent..." | **M** | MigoMap's example teaches by showing. TG's asks three questions at once and says "intent". |
| 4 | Type choice | 13 categories with emoji: "Food & Drinks", "Outdoor & Active", "Ridesharing"… (SS34) | "I need" / "I offer" / "I want to" | **=** | TG's framing is original and covers favours. MigoMap's describes the activity itself. Ideally you'd have both. |
| 5 | Audience | none | "Who can see this?" + "Trusted circles / Adjacent network / Relevant nearby / Broader approved" | **TG** for the question, **Neither** for the options | The question is great. "Adjacent network" and "Broader approved" are internal system terms, not how people talk. |
| 6 | Final CTA | "Continue" / (create flow) | "Review intent" / "Broadcast intent" | **M** | "Broadcast" sounds loud and one-way, the opposite of TG's positioning. |
| 7 | Item headline | "{Saransh} wants to {Looking for a morning cycling partner} {tomorrow}" (SS25) | "Two people for badminton tonight" | **TG** | MigoMap's template creates a grammar error ("wants to Looking for"). |
| 8 | Join CTA | "I'm in" | "Request to join" | **M** | Short, human, and committed. |
| 9 | Decline | (close X) | "Not relevant" | **TG** | You can decline without it feeling rude. |
| 10 | Trust line | "✓ verified", "PRO" | "One trusted connection" / "Connected through Kavya" | **TG** | Tells you how you're connected, not what someone paid for. |
| 11 | Why shown | none | "Why this reached you: You play nearby on weekday evenings." | **TG** | |
| 12 | Hidden info | none | "Hidden until accepted. Exact place and contact details." | **TG** | |
| 13 | Request sheet | n/a | "Aarav will see your first name and response." / "Exact contact details stay hidden" | **TG** | Tells you exactly what the other person will see. |
| 14 | Onboarding headers | "what should we call you?", "what's your gender?", "what interests you?", "where's home?", "show us that smile", "tell your story", "don't miss a thing" | n/a | **M** | Warm and conversational, with one idea per screen. |
| 15 | Onboarding helper text | "let's get your profile started 👋", "this will be shown on your profile", "helps us match you with the right people 🤝" | n/a | **M**, except the gender line | "match you with the right people" is dating language. |
| 16 | Empty notifications | "Nothing here yet · Your notifications will show up as they come in" | "No responses yet · When someone is interested, you will see it here." | **=** | |
| 17 | Empty messages | n/a (welcome DM) | "Messages appear after acceptance · Once there is mutual interest, you can coordinate here." | **TG** | Explains the rule. MigoMap never has an empty inbox because of the welcome DM. |
| 18 | Empty friends | "No friends yet · Start connecting with travelers around you" | n/a | **M** | |
| 19 | Welcome message | "hey ps! welcome to migomap 🙌 people around you are hiking… find something that sounds fun and just show up… see you out there ✨" (SS8) | n/a | **M** | Friendly and tells you how to use the app. |
| 20 | Safety | "MigoMap is not a dating app… Romantic messages get you banned." / "Share your number after you've met, not before." / "If it feels off, leave. You don't need a reason." (SS7) | Privacy strip labels | **M** | Concrete, memorable rules. |
| 21 | Report | "Why are you reporting?" / "The user won't know who reported them" / "Also block {name}" | n/a | **M** | |
| 22 | Paywall | "Unlock MigoMap Pro 🎉", "See all nearby travelers", "Upgrade Now 👋" | n/a | **Neither** | Using "👋" on a payment button is too flippant. Selling "see all nearby travelers" frames people as the product. |
| 23 | Account placeholder | n/a | "Privacy controls and preferences will appear here as account setup is built." | **M** | Placeholder copy talking about how the app is built should never reach users. |
| 24 | Case and voice | Lowercase and playful for headings; sentence case in the rest of the UI | Sentence case, calm, explanatory | **=** | Different brands. TG's voice is right for trust but needs more warmth. |
| 25 | Emoji in copy | Frequent (👋🤝🎯🙌✨🎉) | None | **M** (for engagement) | In moderation it adds warmth. |
| 26 | Units | Miles in India (SS9, SS23) | Area names | **TG** | MigoMap's default doesn't match the local market. |
| 27 | Grammar | "wants to Looking for" (SS25); "a thing" line wraps oddly | Clean | **TG** | |

## 7. Vocabulary: which words to adopt

This section assumes "word adoption" means which terms TG should use.

| Concept | MigoMap says | TrueGoing says | Adopt | Why |
|---|---|---|---|---|
| The thing you post | "activity", "event" (used interchangeably) | "intent" | **"plan"**, or "plans" in lists | "Intent" is jargon. MigoMap mixes "activity" and "event" (SS30 vs SS22/34), which is inconsistent. "Plan" is what people say ("any plans tonight?"). |
| Posting it | "+", "New Event" | "Broadcast", "Broadcast intent" | **"Post"** or **"Share a plan"** | "Broadcast" contradicts "you choose who can see this". |
| Joining | "I'm in" | "Request to join" | **"I'm in"** for open plans; **"Ask to join"** when the host approves | "Ask" is softer than "Request". |
| Participant count | "2 going" | none | **"2 going"** | Short and universal. |
| Declining | X | "Not relevant" | **"Not for me"** | Friendlier, and still gives the relevance signal. |
| Type choice | 13 categories | "I need / I offer / I want to" | **Keep TG's three**, and add categories as a second step | TG's framing is unique and covers favours as well as activities. |
| Audience levels | none | "Trusted circles / Adjacent network / Relevant nearby / Broader approved" | **"Friends / Friends of friends / Nearby / Anyone in [area]"** | People understand these without explanation. |
| Why you see it | none | "Why this reached you" | **"Why you're seeing this"** | More common phrasing, same idea. |
| People | "travelers" | "broadcaster", "connection" | **"host"** for the poster, **"people"** otherwise | "Broadcaster" is system language. "Travelers" leaves out locals. |
| Home tab | Map | "For You" | **"Nearby"** | Says what's there. |
| Inbox tab | "Chats" | "Messages" | **"Chats"** | Shorter, and implies group chats. |
| Activity tab | (bell, Notifications) | "Activity" | **"Notifications"**, or fold it into Chats | "Activity" clashes with "activity" as the thing you post. |
| Privacy promise | "Stealth Mode" | "Private by design", "Hidden until accepted" | **"Hidden until you say yes"** | Active voice, and makes clear the user is in control. |
| Confirmation | "you're in, PS!" | none | **Adopt** | |
| Safety | "not a dating app", "meet in public" | none | **Adopt the safety rules**, not the dating disclaimer | |

## 8. Overall

| Dimension | Better | Why, in one line |
|---|---|---|
| End-to-end experience | **MigoMap** | It works from sign-in to meeting up. TG stops at a button that does nothing. |
| Navigation | **MigoMap** | 4 tabs, map home, sheets instead of stacks. |
| Visual UI | **MigoMap** | Dark mode, emoji category markers, avatar social proof, polish. |
| UX patterns | **MigoMap** (speed) / **TG** (control) | One-tap join and relative times, versus a reach choice and a reason on every card. |
| Features | **MigoMap** | Wins 23 of 31 feature rows. |
| Copy: warmth | **MigoMap** | Conversational, emoji, personal. |
| Copy: clarity and trust | **TG** | Says exactly what's shown, what's hidden, and why. No grammar bugs. |
| Vocabulary | **Neither** | MigoMap is inconsistent (activity vs event). TG uses system jargon (intent, broadcast, adjacent network). |
| Safety as experienced | **TG** (design) | No people list, no exact distance to people, chat only after acceptance. But none of it is working yet. |

**One-line verdict.** MigoMap is the better app today on almost every experience dimension. TG has the better ideas on audience control, transparency, and privacy, but it expresses them in jargon and none of them work yet.

## Change log

| Date | Change |
|---|---|
| 2026-09-23 | Created and saved to the repo |
