# MigoMap vs TrueGoing (Nearcast): Full Comparison

Review only. This document contains no implementation plan, and nothing in the repo was changed.

## How to read this

**Confidence tags**
- **[Certain]** Verified in code (`M` means `supabase/migrations/20260824161306_nearcast_foundation.sql`), in the TG web build I ran, or in a MigoMap screenshot (SS1–SS38, in upload order).
- **[Likely]** A strong inference.
- **[Guessing]** Filling a gap.

**The comparison is lopsided, and every score below reflects that.** MigoMap is a shipped app with live users. TG is a clickable prototype: no screen reads or writes data, and every screen shows hardcoded fixtures (`src/features/native-demo/nearcast-fixtures.ts`). The Supabase client in `src/infrastructure/supabase/client.ts` is never imported. [Certain]

Because of that, TG gets two scores wherever it matters:
- **Delivered** is what a user can actually do today.
- **Designed** is what TG's UI and schema aim at, judged on its merits and not on TG's docs.

**Blind spots**
- **MigoMap:** I only have 38 screenshots. I can't see their backend, performance, retention, or anything off-screen.
- **TG:** I couldn't run an iOS simulator because the container is Linux. The TG screens came from the Expo web build in Chromium, where SF Symbols render as single letters ("FY", "S", "W"). Layout and copy are accurate.

## Scorecard (1 = poor, 5 = excellent)

| # | Area | MigoMap | TG delivered | TG designed | Edge |
|---|---|---|---|---|---|
| 1 | Concept and positioning | 3 | – | 4 | TG on paper |
| 2 | Information architecture and navigation | 4 | 2 | 3 | MigoMap |
| 3 | Onboarding | 2 | 0 | – | MigoMap (by default) |
| 4 | Sign-in and account | 4 | 0 | 1 | MigoMap |
| 5 | Discovery (feed and map) | 5 | 1 | 3 | MigoMap |
| 6 | Creating an activity | 4 | 1 | 3 | MigoMap |
| 7 | Joining and responding | 5 | 0 | 3 | MigoMap |
| 8 | Group model ("N going") | 5 | 0 | 1 | MigoMap |
| 9 | Messaging | 4 | 0 | 3 | MigoMap |
| 10 | Profiles and identity | 3 | 1 | 1 | MigoMap |
| 11 | Social graph (friends) | 3 | 0 | 1 | MigoMap |
| 12 | Notifications | 3 | 0 | 2 | MigoMap |
| 13 | Trips (second loop) | 4 | 0 | 0 | MigoMap |
| 14 | Location privacy | 1 | – | 5 | TG |
| 15 | Personal safety and anti-harassment | 2 | 0 | 4 | TG on paper |
| 16 | Moderation (report and block) | 4 | 0 | 2 | MigoMap |
| 17 | Honesty of numbers and social proof | 2 | 5 | 5 | TG |
| 18 | Transparency ("why am I seeing this") | 1 | 3 | 5 | TG |
| 19 | Monetization | 3 | 0 | 0 | MigoMap |
| 20 | Growth loops and cold start | 4 | 0 | 1 | MigoMap |
| 21 | Visual design | 4 | 3 | 3 | MigoMap |
| 22 | Copy and tone | 3 | 4 | 4 | TG |
| 23 | UI states (loading, empty, error) | 4 | 1 | – | MigoMap |
| 24 | Accessibility | ? | 2 | – | Unknown |
| 25 | Settings and user control | 4 | 0 | – | MigoMap |
| 26 | Backend architecture and data model | ? | 2 | 3 | Unknown |
| 27 | Security (as implemented) | ? | – | 2 | Unknown |
| 28 | Engineering quality and testing | ? | 3 | – | Unknown |
| 29 | App Store and legal compliance | 3 | 1 | – | MigoMap |
| 30 | Analytics and measurability | ? | 0 | 2 | Unknown |

**Bottom line.**
- **MigoMap** wins every area that makes an app usable today. [Certain]
- **TG** wins the areas where MigoMap is weakest: location privacy, safety design, honesty of numbers, and "why am I seeing this". [Certain]
- **But** TG's wins exist in schema and copy, not in anything a user can touch. [Certain]

---

## 1. Concept and positioning
- **MigoMap.** "Find activities near you, join in, and meet travelers wherever you go" (SS31). It targets travelers plus locals. The core objects are activities and trips.
  - It also runs a people-discovery layer: a nearby-people list, gender and age filters, and profile views (SS16, SS21, SS23, SS26).
  - That makes it a hybrid of activity app and people-browsing app. It says "not a dating app" (SS7) while paywalling a gender filter (SS21). [Certain] that both exist; [Likely] they undermine each other.
- **TG.** "Trust-aware intent network": you post a request, offer, or plan (`intent.ts:3`) and share it through a reach ladder that starts with trusted circles and widens to nearby people and approved areas (`preview.tsx:8-13`; `M:8`).
  - It is narrower and more principled. People are never browsable; only intents are.
- **Verdict.** TG's concept is more defensible, because the gap it targets is MigoMap's weak spot. MigoMap's concept is simpler to explain. "I need / I offer / I want to" (`create.tsx:9-13`) is also broader than "activities", which dilutes TG's focus. [Likely]

## 2. Information architecture and navigation
- **MigoMap.** 4 tabs: Map, Trips, Chats, Profile (SS27). Header shortcuts for Friends and Notifications (SS27). Create is a floating "+" on the map (SS27) and on Trips and Chats (SS6, SS38). Most tasks happen in bottom sheets over the map (SS16, SS21, SS25, SS34, SS35).
- **TG.** 5 tabs: For You, Activity, Broadcast, Messages, You (`(tabs)/_layout.tsx:46-50`). Broadcast is a tab that redirects to a modal (`broadcast.tsx:4`). Intent, profile, and request are pushed screens (`_layout.tsx:55-59`).
- **Verdict.** MigoMap's sheet-over-map model keeps context and feels fast. TG's 5 tabs are conventional. "Activity" (a bell icon) and "Messages" will overlap once requests turn into chats. [Likely] A create action as a tab is a well-understood pattern, not a flaw.

## 3. Onboarding
- **MigoMap.** Twelve steps before the user sees anything useful: welcome, Apple or phone sign-in, name and birthday, gender, interests, hometown, photo, bio and social link, notification pre-prompt, a star-rating prompt with testimonials, a "you're in" radar, then location permission on the map (SS31, SS12, SS10, SS18, SS5, SS2, SS15, SS14, SS17, SS24, SS33). [Certain]
  - Good: a progress bar (SS2, SS5, SS10), Skip on optional steps (SS15, SS18), a personal "you're in, PS!" (SS24).
  - Bad:
    - Too long. [Likely] Drop-off is high; I have no data.
    - It asks for a rating before any use (SS17).
    - The birthday picker's placeholder is "14 june 1968" (SS12). [Certain] It's an odd default.
    - Location comes last, so the first map is "Zoom in to explore" (SS33).
    - Gender is justified as "helps us match you with the right people" (SS10), which is dating language.
- **TG.** None. Nothing exists. [Certain]
- **Verdict.** MigoMap wins by default. Its sequence is still a good list of things *not* to copy.

## 4. Sign-in and account
- **MigoMap.** Apple and phone sign-in (SS31). Settings has Sign-in Methods, Restore Purchases, Delete Account, and Sign Out (SS11, SS13). [Certain]
- **TG.**
  - No auth UI. [Certain]
  - Backend auth has only email turned on. Phone sign-up is disabled and no SMS provider is configured (`supabase/config.toml:257-259, 289-292`). Apple is disabled (`:322-324`). [Certain]
  - There is a place to store a phone number (`profile_private.phone_e164`, `M:24`), but no phone sign-in to fill it.
- **Verdict.** MigoMap, clearly.

## 5. Discovery (feed and map)
- **MigoMap.**
  - The home screen is a live map with emoji activity pins and the host's avatar (SS27).
  - "See list" opens "17 Activities Here" with sort (Popular), categories (All, Food, Outdoor), distance, relative time ("now", "tomorrow", "on Saturday"), and avatars with "N going" (SS30).
  - Search by place (SS20).
  - [Certain] It is dense, scannable, and has a strong sense of place.
- **TG.**
  - Delivered: two fixed cards. The "Nearby" and "All intents" chips don't respond (`index.tsx:19-26`). Tapping either card opens the same badminton detail, because the route ignores `id` (`intent/[id].tsx:6,16-21`). [Certain]
  - Designed:
    - Each card shows its type, title, time and area, a trust line ("One trusted connection"), and a highlighted "Why this reached you: …" box (captured `home.png`; `native-ui.tsx:73`).
    - The schema stores a reason per delivery (`M:97-107`).
    - There is no map, and no way to fetch intents by area.
    - Nothing ever creates a delivery: there is no insert policy or function (`M:474-480`). The feed can't be populated. [Certain]
- **Verdict.** MigoMap by a wide margin. TG's reason line is better information design than anything MigoMap shows. [Likely] Text-only cards without a map will still feel less alive for a location-based app.

## 6. Creating an activity
- **MigoMap.** A bottom sheet over the map:
  1. an emoji plus "WANT TO" free text (SS35)
  2. one of 13 categories (SS34)
  3. place, by dragging the map under a fixed pin (SS37)
  4. time (not captured)

  [Certain] It is fast and playful. One bug: the display template glues "wants to" onto free text, giving "Saransh **wants to Looking for** a morning cycling partner" (SS25). [Certain]
- **TG.**
  - Delivered: a type chip, a 500-character text box with a counter, a "Review intent" button that stays disabled until there's text, and a review screen with 4 reach options (`create.tsx`, `preview.tsx`).
  - The reach option can't be changed; "Adjacent network" is always selected (`preview.tsx:39`).
  - The expiry is hardcoded (`preview.tsx:30`).
  - Publish does nothing (`preview.tsx:57`). [Certain]
  - There is no time, place, category, or emoji input.
- **Verdict.** MigoMap's flow is faster and complete. TG's explicit "Who can see this?" step is a real differentiator. MigoMap never tells the creator who will see their activity. [Certain, based on the SS34/SS35/SS37 captures]

## 7. Joining and responding
- **MigoMap.** One green "I'm in" button (SS25). No approval is visible. [Certain] This is the most important interaction in the app, and it's frictionless.
- **TG.**
  - Designed: "Request to join" leads to a note field and "Send request", with "Aarav will see your first name and response" (`request/[id].tsx:16-26`).
  - Backend: responses and a host-side `accept_response` step that is safe to repeat and checks blocks (`M:277-350`).
  - Delivered: the note is never read, and Send only closes the screen (`:19, :26`). [Certain]
- **Verdict.** For casual plans, MigoMap's one tap is better. TG's request-and-approve step fits higher-stakes requests and offers. It adds friction MigoMap doesn't have.

## 8. Group model ("N going")
- **MigoMap.** Every activity and trip shows how many are going ("2 going", "10 going", "19 going") with avatars (SS25, SS30, SS36, SS38). [Certain]
- **TG.** The schema allows exactly one match per intent (`matches.intent_id unique`, `M:123`). The first acceptance moves the intent to "matched" (`M:329-346`). The schema can't represent group plans at all. [Certain]
- **Verdict.** This is the largest structural difference between the two products, not a UI detail.

## 9. Messaging
- **MigoMap.**
  - Chat list with All, Unread, Activities, DMs, and Groups filters, unread badges, and search (SS6).
  - The composer has camera, gallery, poll, and location (SS8).
  - A safety shield in the thread header (SS8).
  - A verified official account sends a welcome message (SS6, SS8).
  - [Certain]
- **TG.**
  - Delivered: a static "Active rooms" row. There is no thread screen and no send. [Certain]
  - Designed: one conversation per match. Only the two parties can read or post, and only while it's open (`M:140-157, 510-518`).
  - Realtime is on in config, but no table publishes to it, so messages won't stream. [Certain]
  - Chat unlocks only after acceptance ("Messages appear after acceptance", `messages.tsx:32`). That is a safety positive.
- **Verdict.** MigoMap. TG's "chat only after mutual acceptance" rule is safer. MigoMap lets anyone "Message" anyone from a profile (SS28, SS29).

## 10. Profiles and identity
- **MigoMap.**
  - World-map header with visited pins, photo, name, verified badge, PRO badge, age and city (SS28, SS29).
  - About me, photos, interest chips (SS29).
  - Message and Add Friend buttons.
  - Own profile has a completeness ring ("33%"), a profile-view counter, "Get verified" by selfie, Edit, and Share (SS26).
- **TG.**
  - Delivered: an initials avatar, name, area, "One trusted connection", "Contact details hidden until accepted", and the user's current intent (`profile/[id].tsx`). The route ignores `id`.
  - Own profile: "PS · Private alpha", with a placeholder line (`you.tsx:16-20`).
  - Schema: the profile has only a display name, avatar path, and city (`M:12-20`). There are no fields for age, bio, interests, photos, or verification. [Certain]
- **Verdict.** MigoMap's profiles are richer. Its PRO badge on profiles (SS28) turns paying into social status, which adds friction to trust. TG's profile shows trust context instead of attractiveness signals. That fits its concept, but there's almost nothing there.

## 11. Social graph (friends)
- **MigoMap.** Friends list with search, Add Friend, and Sent Requests (SS4, SS28, SS9). Growth is framed as "Start connecting with travelers around you" (SS4). [Certain]
- **TG.** No friends table. The reach reasons "adjacent_trust_connection" and "Connected through Kavya" (`M:101`; fixtures) assume a trust graph that doesn't exist. [Certain]
- **Verdict.** MigoMap has a simple graph. TG's whole concept depends on a graph it hasn't modelled.

## 12. Notifications
- **MigoMap.**
  - Pre-permission explainer (SS14).
  - Inbox with All, Requests, Events, and Social tabs, and an empty state (SS3).
  - Settings for push, nearby activity within a set radius (12 mi), and profile views (SS9).
- **TG.** A server-side job queue only (`notification_jobs`, `M:191-202`). There is no inbox, no push token storage, and no worker. The Activity tab shows static rows. [Certain]
- **Verdict.** MigoMap. Its "notify me about nearby activity within X miles" setting is a strong retention lever. [Likely]

## 13. Trips (second loop)
- **MigoMap.**
  - Trending destinations with photos and "N going" (SS38).
  - "Where to?" search with a going count per city (SS20).
  - Fixed or flexible dates (SS32).
  - "My Trips" countdown ("in 9 days", SS36).
- **TG.** Nothing, and nothing in the schema. [Certain]
- **Verdict.** MigoMap. Trips give it a reason to open the app before arriving somewhere, and TG has no equivalent. [Likely]

## 14. Location privacy
- **MigoMap.**
  - Asks for precise location (SS33).
  - Shows named people with photos and distance to a tenth of a mile ("Mitali Thakur · 1.6 mi", SS23).
  - Activity pins sit at specific spots on the map (SS25, SS27). [Certain]
  - [Likely] Distances accurate to 0.1 mi, read from several positions, can narrow down where a person is. The only mitigation is an opt-in Stealth Mode (SS9).
- **TG.**
  - Exact place, address, and contact details live in a separate table only the owner can read (`M:72-79, 452-453`).
  - Discoverable intents carry only an approximate area and point (`M:56-67`).
  - The public share link returns no location data (`M:352-399`).
  - People have no location at all; profiles hold only city text (`M:16`).
  - The UI says "Area approximate · Exact place hidden · Contact hidden · Origin private" (`native-ui.tsx:133-136`). [Certain]
- **Verdict.** TG, decisively. It's the one area where TG's design is clearly better than a shipped competitor's.

## 15. Personal safety and anti-harassment
- **MigoMap.**
  - Good: a Safety sheet (meet in public, keep chats in the app, tell someone your plans, trust your instincts, "not a dating app", SS7), selfie verification (SS26), and Stealth Mode (SS9).
  - Bad: the mechanics work against the message.
    - A paid gender filter over a people list (SS21).
    - Gender collected "to match you" (SS10).
    - Profile-view notifications (SS9).
    - Anyone can message anyone (SS28, SS29).
  - [Likely] Women carry most of the unwanted attention in this setup.
- **TG.**
  - Designed:
    - No people browsing.
    - Chat only after acceptance.
    - Contact details hidden until they are deliberately released (`match_disclosures`, `M:132-138`).
    - Block checks when reading an intent, responding, and accepting (`M:239-275, 487-498, 325`).
  - Delivered: none of it. [Certain]
- **Verdict.** TG's design is safer at the structural level. MigoMap relies on warnings and toggles.

## 16. Moderation (report and block)
- **MigoMap.**
  - Report Event offers four reasons, "The user won't know who reported them", and a one-tap "Also block {name}" (SS22).
  - Blocked Users list (SS9), plus Community Guidelines and Safety Tips (SS13). [Certain]
- **TG.**
  - A reports table that users can write to and read only their own rows (`M:180-189, 527-530`).
  - A blocks table (`M:29-35`).
  - No UI.
  - No reviewer role or workflow.
  - Nothing ever sets an intent's `restricted` status. [Certain]
- **Verdict.** MigoMap. Its combined report-and-block sheet is best practice.

## 17. Honesty of numbers and social proof
- **MigoMap.**
  - Round-number claims: "100+ people" (SS27), "100K+ travelers" (SS17), "100+ People Nearby" (SS23).
  - Every trending trip shows "10 going" (SS38). [Certain] that the numbers are identical. [Guessing] whether they're inflated.
  - Testimonials on the rating prompt (SS17).
  - The welcome DM comes from an official account shown with a "PRO" badge and an age ("25 · pwd", SS28). That's a brand account presented like a person. [Certain]
- **TG.** The only live number is the character counter (`create.tsx:54`). The public link reports real confirmation counts (`M:390`). The analytics table blocks sensitive fields (`M:212`). [Certain]
- **Verdict.** TG. Honest numbers matter more once an app's reputation depends on safety.

## 18. Transparency ("why am I seeing this")
- **MigoMap.** None visible. There's no reason shown for an activity or person being shown to you. [Certain, within the screenshots]
- **TG.** A reason on every card in the UI, and a reason code plus text stored per delivery (`native-ui.tsx:73`; `M:101-102`). There's also a "Not relevant" feedback column (`M:105`), though the button in the UI does nothing (`native-ui.tsx:155`). [Certain]
- **Verdict.** TG. MigoMap has nothing comparable.

## 19. Monetization
- **MigoMap.**
  - "MigoMap Pro": ₹299/week pre-selected and labelled POPULAR, ₹115/week billed monthly ("Save 61%"), and a yearly plan (SS19).
  - Features: see all nearby travelers, message anywhere, see who viewed you, advanced filters, priority listing, read receipts (SS19).
  - The gender-filter paywall (SS21). "Refer and Earn: get paid for bringing people in" (SS11). "Become a Partner" for businesses (SS11). [Certain]
  - [Likely] Several revenue lines, but the pricing leans on dark patterns: weekly billing as the default, and paid access to people filtered by gender.
- **TG.** No monetization, and no subscription tables. [Certain]
- **Verdict.** MigoMap earns money. Its model sells access to people, which TG's concept rules out. TG would need a different model. [Likely]

## 20. Growth loops and cold start
- **MigoMap.**
  - A welcome DM so the inbox isn't empty (SS6).
  - A map that looks busy at once in a dense city (SS27).
  - Trending trips (SS38).
  - Share on profiles and activities (SS25, SS26).
  - Refer and Earn (SS11).
  - The rating prompt feeds App Store ranking (SS17).
  - Instagram handle collected at onboarding (SS15).
- **TG.**
  - Designed: a public share link per intent that works without sign-in (`M:48, 352-399`).
  - Structural cold-start problem: intents start visible only to your own circle (`M:83`), and there is no friends graph and no way to create deliveries. [Certain] A new user in a new city sees nothing. [Likely]
- **Verdict.** MigoMap. TG's reach ladder is its main idea and also its biggest obstacle to growth.

## 21. Visual design
- **MigoMap.**
  - Dark theme, periwinkle accent, coral create button, green "I'm in".
  - 3D emoji throughout (SS2, SS14, SS18).
  - Bold lowercase headlines, glass-effect round buttons, a map-first home.
  - Appearance setting (System) (SS9).
  - Consistent and a little playful, clearly aimed at a young travel audience. [Certain]
- **TG.**
  - Light theme only: `userInterfaceStyle: "light"` (`app.json:9`), and no dark tokens (`tokens.json`). [Certain]
  - Off-white canvas, deep green accent, Manrope font, cards with soft borders (captured `home.png`, `preview.png`; `tokens.json`).
  - Calm, trustworthy, closer to a civic or utility app.
  - Placeholder letters stand in for icons in the web build.
- **Verdict.** MigoMap is more polished and more emotionally engaging. TG looks trustworthy but plain, and the missing dark mode is a gap for an app used in the evening. [Likely]

## 22. Copy and tone
- **MigoMap.** Casual, lowercase, and warm: "show us that smile", "where's home?", "tell your story", "don't miss a thing", "see you out there ✨" (SS2, SS5, SS15, SS14, SS8). Flaws:
  - The "wants to Looking for" grammar bug (SS25).
  - Mixed units: miles in India (SS9, SS23).
  - Dating-leaning phrasing (SS10).
- **TG.** Clear and reassuring, and consistent about privacy: "You choose who can see this.", "Hidden until accepted.", "Messages appear after acceptance." (`create.tsx:56`, `intent/[id].tsx:64`, `messages.tsx:32`). Flaws:
  - The word "intent" is jargon ("New intent", "Review intent", "Broadcast intent").
  - "Broadcast" sounds loud and one-way.
  - [Likely] Neither word matches how people talk about plans.
- **Verdict.** TG's copy is more trustworthy. MigoMap's is more inviting. TG loses points for its vocabulary.

## 23. UI states (loading, empty, error)
- **MigoMap.** Skeleton loaders (SS1). Friendly empty states ("Nothing here yet", "No friends yet", "Where to next?", SS3, SS4, SS38). Disabled Continue buttons until fields are valid (SS2, SS5). A locked state on the paywall (SS21). No error or offline states were captured.
- **TG.**
  - Loading: only a font gate that renders nothing (`_layout.tsx:43`).
  - Disabled: one button, "Review intent" (`create.tsx:60`).
  - Empty: rows that are always shown, not triggered by missing data (`activity.tsx:16-22`, `messages.tsx:29-35`).
  - No error, offline, or restricted states. [Certain]
- **Verdict.** MigoMap.

## 24. Accessibility
- **MigoMap.** Can't be assessed from screenshots. [Guessing] Several spots look like low contrast: grey-on-dark placeholders (SS5, SS15), and "Clear" in SS16.
- **TG.**
  - 11 accessibility labels and roles, for example "Go back" and "Open intent: {title}" (`native-ui.tsx:30, 63, 116`).
  - The disabled button reports its state to screen readers (`button.tsx:18`).
  - Dark text on a light background.
  - Tab labels are only 11pt (`(tabs)/_layout.tsx:32`).
  - [Likely] A reasonable base. Untested with VoiceOver.
- **Verdict.** Can't call it.

## 25. Settings and user control
- **MigoMap.** Appearance, language, km/mi, Stealth Mode, and notification settings (including radius); sent requests, blocked users, restore purchases, sign-in methods; message the founder, contact support, review, Instagram; refer and earn, partner; guidelines, safety, terms, privacy; delete account, sign out, and a version number (SS9, SS11, SS13). [Certain] Very complete. "Message the Founder" is a nice touch for an early-stage app.
- **TG.** None ("Privacy controls and preferences will appear here…", `you.tsx:20`). [Certain]
- **Verdict.** MigoMap.

## 26. Backend architecture and data model
- **MigoMap.** Unknown. It uses Apple Maps (SS25, SS27).
- **TG.**
  - Stack: Supabase with Postgres and PostGIS.
  - 19 tables with a clean split between public, context, and private data (`M:12-213`).
  - Every intent change is recorded in an event log (`M:169-178`).
  - Intents carry a version number to catch conflicting edits (`M:49`).
  - Server-side accept step (`M:277-350`).
  - Missing:
    - Nothing publishes, withdraws, resolves, expires, or widens an intent's reach; no scheduled jobs.
    - No Edge Functions and no storage buckets.
    - No realtime publication.
    - Only one participant per intent.
    - No tables for friends, interests, photos, age, subscriptions, or push devices. [Certain]
- **Verdict.** TG's foundation is careful where it exists. It covers perhaps a quarter of what a MigoMap-equivalent needs. [Likely]

## 27. Security (as implemented)
- **MigoMap.** Unknown.
- **TG.**
  - Access control (RLS) is on for every table (`M:401-419`). Signed-out users can only call the public share function (`M:532-546`).
  - Holes:
    - A recipient can edit their delivery row and point it at any intent, which then grants read access to that intent. Updates are checked only by recipient and allowed on every column (`M:479-480, 535-539`).
    - The same re-pointing problem exists on responses (`M:499-501`).
    - Users can clear their own `is_restricted` flag (`M:425-426`).
    - Either party can mark any private field as released, and the other party still has no way to read it (`M:505-508`).
    - The public share link ignores restricted broadcasters (`M:352-399`).
  - [Certain]
- **Verdict.** Good intent, with real holes that would matter as soon as there is real data.

## 28. Engineering quality and testing
- **MigoMap.** Unknown. It is at v0.0.80 (build 67) (SS13), so it's still pre-1.0 while shipping. [Certain]
- **TG.**
  - TypeScript strict mode, Expo SDK 57, input validation with Zod, pure domain modules (`intent.ts`, `lifecycle.ts`), and a CI verify workflow (`.github/workflows/verify.yml`).
  - Unit and component tests exist.
  - The database tests are 9 checks, mostly "table exists". Nothing tests accept, blocks, messages, or an outsider being denied (`supabase/tests/database/nearcast_foundation.test.sql`).
  - The "future expiry" test doesn't actually check that the date is in the future (`intent.test.ts:10` vs `intent.ts:11-16`).
  - The domain modules aren't used by any screen. [Certain]
- **Verdict.** TG's engineering is tidy for its size. Test coverage is shallow where it matters most.

## 29. App Store and legal compliance
- **MigoMap.**
  - Has delete account, terms, privacy, restore purchases, and an 18+ age range (SS13, SS16, SS19).
  - Risks:
    - A custom rating prompt with testimonials before any use (SS17). [Likely] This conflicts with Apple's guidance on review prompts.
    - Weekly auto-renew as the default (SS19). [Likely] This draws refund and complaint volume.
- **TG.** No age gate, no delete account, no legal pages, and a development bundle ID (`app.json:11`). [Certain] It isn't at submission stage.
- **Verdict.** MigoMap.

## 30. Analytics and measurability
- **MigoMap.** Unknown. [Guessing] It has analytics.
- **TG.** An outbox table with a privacy CHECK (`M:204-213`). Nothing writes to it and there is no pipeline. [Certain]
- **Verdict.** TG can't measure anything yet.

---

## Summary

**What MigoMap does better**
1. It ships.
2. One-tap "I'm in".
3. Group "N going".
4. A map-first home.
5. A 10-second create flow.
6. Trips as a second reason to open the app.
7. Complete settings, report, and block.
8. Real monetization.
9. Cold-start tricks: the welcome DM and the look of a busy map.

**What TG does better**
1. Location privacy by structure.
2. No browsing of people.
3. Chat only after mutual acceptance.
4. Stated reasons for why you see something.
5. Only real numbers.
6. An explicit "who can see this" choice at creation.

**Shared weakness.** Neither is honest about the cold start. MigoMap shows round-number crowd claims. TG's reach ladder has no graph to spread through. [Likely]

**The uncomfortable part.** Every advantage TG has is a *restriction*. Restrictions only count once people are using the product. Today TG's advantages protect users it doesn't have. [Certain] about the current state; [Likely] about how it plays out.
