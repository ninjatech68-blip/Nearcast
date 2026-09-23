# TrueGoing Design, Content and Brand Guidelines

## Document control

- **Status:** Source of truth since 2026-09-23 (see `README.md` in this folder).
- **Written against:** *04 - Screen Contracts.md*, *05 - Schema and API Specification.md*, *03 - TrueGoing Reimagined.md*, and the MigoMap comparison.
- **Relationship to existing docs:** this document says, section by section, what is **retained** from `DESIGN.md`, `docs/07`, `docs/08`, `docs/17` and `PRODUCT.md`, what is **changed**, and what is **new**. If adopted, it replaces `DESIGN.md` and `docs/08` and amends `docs/07` and `docs/17`.

Tags: **[Certain]** verified in repo or screenshots · **[Likely]** inference · **[Guessing]** gap-filling.

---

## 0. Two conflicts you need to know about before reading

1. **The design docs and the code already disagree with each other.** [Certain]
   - `DESIGN.md` specifies native SF Pro / Roboto; the app loads Manrope (`src/app/_layout.tsx:23-27`).
   - `DESIGN.md` defines a full dark palette; the app is locked to light (`app.json:9`).
   - `DESIGN.md` names the tabs Home · Explore · Broadcast · Chat · Profile; the code has For You · Activity · Broadcast · Messages · You (`src/app/(tabs)/_layout.tsx:46-50`).
   - `DESIGN.md` standardises a numeric trust score ("Trust 812 · High trust"); `docs/08` says "Trust context, not trust score". The reimagined product has no score at all.
   This document resolves each of these. Where it does, the choice is marked **Changed**.
2. **The product name is TrueGoing (locked 2026-09-23).** "Nearcast" is retired as a user-facing name. [Certain] 41 files in the repo still say Nearcast; the ones users can see are listed in §13.1 and must change before any build ships.

---

## 1. Summary: retain, change, new

| Area | Retain (from current docs) | Change | New |
|---|---|---|---|
| Thesis | "What is this? Why am I seeing it? What is safe to do next?" | Add a fourth question: **"Who else is going?"**, because social proof is what makes plans happen | — |
| Pillars | Controlled reach · Human reasons · Progressive disclosure · Native trust | **Drop "Resolution over engagement" as worded.** Plans don't "resolve"; they happen. Replace with **"Showing up over scrolling"** | **People are not browsable** as an explicit pillar |
| Colour | The full light and dark palette in `DESIGN.md`, including no purple | Ship dark mode (it's designed, not built) | Category tints for emoji tiles; map style tokens |
| Typography | The 7-step hierarchy and sizes | **Resolve the font conflict:** native SF Pro / Roboto for all UI; Manrope only for the wordmark and onboarding display headings | Lowercase display style for onboarding |
| Shape / space / elevation | All radius, spacing and elevation tokens | Allow one glass surface: round floating buttons over the map (the docs currently forbid glass) | Map overlay tokens |
| Motion | Durations; reduced-motion rules | Allow **one** restrained celebration: the "you're in" moment. Docs currently forbid confetti outright | Haptics table |
| Navigation | Raised centre action; native headers; sheets for reversible decisions | **4 tabs**, not 5; map-first home | Sheet-over-map pattern |
| Trust display | "Never ratings, likes, followers, fake counts" | **Remove the numeric trust score.** Trust is shown as facts: Verified · Showed up ×n · Hosted ×n · mutual connections | Vouch badge; Host and Venue badges |
| Components | IntentCard anatomy, WhyShownChip, PrivacyHint, ReachOptionCard, StatePanel, state priority order | Rename to PlanCard, WhyYouSeeThis, PrivacyStrip, ReachDial | GoingStack, CategoryTile, MapPin, MeetupBanner, ReasonLine |
| Voice | Calm, clear, respectful, transparent; explain before asking | **Warmer.** Add "friendly" and allow contractions, first names and one emoji in headings | Onboarding voice (lowercase, conversational) |
| Terminology | "Reach", "Why you're seeing this", "Trust context" | **Replace** Intent → plan/ask/offer; Broadcast → Post; Match → (none); Response → ask; Confirmation → vouch; Resolve → (none) | showed up · host · people going · connection · Meetup mode |
| Privacy copy | All privacy patterns and the "no lock-screen content" rule | — | Spot-unlock and women-only copy |
| Accessibility | Everything | — | Map accessibility rules |
| Iconography | Rounded outline icons, paired with text for privacy/safety | — | Full symbol map; emoji-as-category rules; pin anatomy |
| Brand | "Calm, credible, human, quietly optimistic, native" | Add **"warm"** and **"honest"** | Wordmark, tagline, mark, tone spectrum, do/don't |

---

## 2. Brand

### 2.1 What the brand stands for
- **Promise:** *Plans near you, from people you can trust. Nobody sees where you are until you say so.*
- **Personality (5 words):** warm · honest · calm · local · protective.
- **Not:** hype, FOMO, dating, "travelers only", gamified, corporate.
- **Retained** from `PRODUCT.md`: calm, credible, human, quietly optimistic, native. **New:** warm, honest. **Why:** [Certain] MigoMap's copy is warm and TG's isn't; that's the one brand dimension where TG lost the comparison.

### 2.2 Name, wordmark, mark
- **Name:** TrueGoing. Written as one word, capital T and G in prose ("TrueGoing"); lowercase in the wordmark ("truegoing").
- **Wordmark:** Manrope Bold, lowercase, tight tracking (−2%). Lowercase reads friendlier and matches the onboarding voice. [Likely] It also distances TG visually from the corporate-serif trust look.
- **Mark:** a rounded map pin whose inner dot is a small check. Meaning: "a plan, confirmed." It doubles as the map's "your position" glyph and the app icon. Rules: one colour, no gradient, minimum 16 pt, never rotated.
- **App icon:** the mark in `onPrimary` on `action.primary` (deep green) for light; the same on dark canvas for the dark variant. No wordmark in the icon.
- **What we don't do:** no 3D icon, no glow, no purple (the docs already forbid it, and [Certain] purple is MigoMap's accent).

### 2.3 Tagline and secondary lines
- Primary: **Plans near you. People you can trust.**
- Secondary (App Store, welcome): *Nobody sees where you are until you say so.*
- Never use: "meet travelers", "discover people", "who's around you", "find your tribe".

### 2.4 Tone spectrum
| Moment | Tone | Example |
|---|---|---|
| Onboarding | Warm, lowercase, first person plural | "what should we call you?" |
| Nearby / plan cards | Plain, factual, quick | "Sector 8 · tonight 8 pm · 2 spots left" |
| Privacy and safety | Clear, protective, active voice | "Exact spot unlocks 1 hour before, for people going." |
| Errors and restrictions | Neutral, non-accusatory, one action | "Couldn't post. Your draft is saved." |
| Celebration | Brief, personal, once | "you're in, Priya!" |
| Moderation and legal | Formal, sentence case, no emoji | "Your account is limited right now." |

---

## 3. Colour

**Retained in full:** the light and dark semantic palettes in `DESIGN.md` (canvas `#F7F3EA` / `#0E1714`, primary `#0F5E46` / `#65D0A1`, info navy, amber warning, coral danger, on-colour tokens). They already meet AA and already have a dark mode. **Changed:** dark mode ships (System default). **[Certain]** The app is pinned light today.

### 3.1 New: semantic roles the reimagined product needs
| Token | Light | Dark | Use |
|---|---|---|---|
| `color.action.join` | = `action.primary` | = `action.primary` | "I'm in". One green for consent, kept from the docs. |
| `color.background.reason` | = `background.info` | = `background.info` | The "Why you're seeing this" line. Navy = explanation, kept. |
| `color.background.trust` | = `background.success` | = `background.success` | Verified, Showed up, Vouched badges |
| `color.background.meetup` | `#FFF5DF` (warning) | `#35270F` | Meetup banner and countdown. Amber = "time-bound", not danger |
| `color.map.plan` | `#0F5E46` ring | `#65D0A1` ring | Pin ring around the emoji tile |
| `color.map.me` | `#1E5D8C` | `#8EB8E5` | The user's own dot. Blue is the platform convention; it is never used for other people |

### 3.2 New: category tints (for emoji tiles and pins)
Each top-level category gets a muted tint pair (light / dark) at ~12% saturation so emoji stay legible. Tints are decorative, never semantic; nothing depends on reading them.

| Category | Light tint | Dark tint |
|---|---|---|
| Food & drinks | `#F6E7DA` | `#3A2A1E` |
| Outdoors & sport | `#E3F0E6` | `#1E3326` |
| Games | `#EAE6F5` (the only violet-ish tint; muted, never used for actions) | `#2A2637` |
| Culture & learning | `#EAF2FA` | `#142A3A` |
| Help & favours | `#FFF5DF` | `#35270F` |
| Social & nightlife | `#F8E4EA` | `#3A1F2A` |
| Wellness | `#E6F3F1` | `#1B302D` |
| Rides & travel | `#E8ECF2` | `#232A33` |

### 3.3 Map style
- Muted, low-contrast basemap (Apple Maps "muted standard" on iOS; a custom Google style on Android): roads light grey, parks desaturated green, water desaturated blue, labels secondary text colour. **Why:** [Certain] MigoMap's saturated dark map fights its pins; TG's pins should be the only saturated thing on the map.
- Dark mode uses the platform dark basemap with the same desaturation.

---

## 4. Typography

**Retained:** the hierarchy (`largeTitle 34/41` … `micro 11/16`).

**Changed (resolves the conflict):**
- **UI text:** SF Pro (iOS), Roboto (Android). Native fonts render faster, respect Dynamic Type perfectly, and look "native trust", which is a pillar.
- **Display:** Manrope Bold only for (a) the wordmark, (b) onboarding headings, (c) the "you're in" moment, (d) the empty-state headings. Manrope is the brand voice; SF/Roboto is the reading voice.
- [Certain] Today Manrope is loaded for everything and the fonts gate the whole app on load (`_layout.tsx:43`). Restricting it to display removes that gate from the hot path.

**New rules:**
- Onboarding headings are lowercase (`"where are you?"`). Everywhere else, sentence case.
- Numbers use tabular figures (`fontVariant: tabular-nums`) in countdowns, capacity, counts.
- Relative time is `bodyStrong` when it's "now" or within 2 hours, otherwise `body`.
- Minimum body size 16; `micro` (11) only for badges and tab labels, never for privacy or safety copy.

---

## 5. Shape, spacing, elevation, motion, haptics

**Retained:** radius (`card 20`, `row 14`, `button 14`, `pill 999`), spacing scale, elevation cap.

**Changed:**
- **Glass allowed in one place:** round floating buttons over the map (search, bell, recenter, back/close on the location picker). Everywhere else glass stays banned. **Why:** [Certain] MigoMap's glass buttons over the map read well; on solid surfaces glass is noise.
- **Celebration allowed in one place:** the onboarding "you're in" screen and the first "I'm in", limited to a 600 ms rings-expanding animation on the mark. No confetti, no streaks, no repeating loops. Reduced motion: static.

**New: motion table**
| Token | Duration | Curve | Use |
|---|---|---|---|
| `motion.press` | 120 ms | ease-out | Button press scale 0.98 |
| `motion.sheet` | 240 ms | spring (damping 0.9) | Sheets in and out |
| `motion.page` | 300 ms | ease-in-out | Push and modal |
| `motion.pin` | 180 ms | spring | Pin appears on the map; scale from 0.6 |
| `motion.join` | 600 ms | ease-out | Rings around the mark after "I'm in" |
| `motion.skeleton` | 1200 ms loop | linear | Shimmer; off under reduced motion |

**New: haptics table** (iOS `UIImpactFeedbackGenerator` levels; Android equivalents)
| Event | Haptic |
|---|---|
| I'm in | medium |
| Post | medium |
| Spot unlocked (foreground) | light |
| Error | notification error |
| Toggle reach dial stop | selection |
| Long-press chat row | light |

---

## 6. Layout and navigation

**Retained:** raised centre action; native large-title headers on top-level screens; compact back header on pushed screens; sheets for reversible decisions; full-screen flow for multi-step creation.

**Changed:**
- **4 tabs:** Nearby · Chats · Post · You. (Docs said 5; code has 5 different ones.) Notifications move to a bell on Nearby.
- **Map-first home.** Nearby is a map with a half-open sheet. **Why:** [Certain] "sense of place" was MigoMap's biggest UI advantage; a text feed can't show density.

**New: the sheet-over-map pattern**
- Sheet detents: `peek` (title + first row, 22%), `half` (50%, default), `full` (92%).
- Map interactions never close the sheet below `peek`.
- Any sheet that opens from the map (plan card, filters, search, report) stacks over the list sheet and returns to the previous detent on close.
- One sheet at a time on top of the list sheet.

**New: tab icons** (SF Symbols / Material Symbols)
| Tab | SF Symbol | Material | Label |
|---|---|---|---|
| Nearby | `map` / `map.fill` | `map` | Nearby |
| Chats | `bubble.left.and.bubble.right` / `.fill` | `forum` | Chats |
| Post | `plus` in a raised filled circle | `add` | Post |
| You | `person.crop.circle` / `.fill` | `account_circle` | You |

Tab labels are always visible (docs and MigoMap differ here; [Likely] labels help first-time users and screen readers).

---

## 7. Iconography, emoji, avatars, badges

### 7.1 System icons
**Retained:** rounded outline icons, consistent 1.5 pt stroke, paired with text for privacy and safety actions, no gamification badges.

**New: canonical symbol map** (SF Symbol → Material Symbol)
| Meaning | SF | Material |
|---|---|---|
| Back | `chevron.left` | `arrow_back` |
| Close | `xmark` | `close` |
| Confirm (sheet header) | `checkmark` | `check` |
| Search | `magnifyingglass` | `search` |
| Filters | `line.3.horizontal.decrease` | `tune` |
| Notifications | `bell` | `notifications` |
| Share | `square.and.arrow.up` | `share` |
| Report | `flag` | `flag` |
| Block | `hand.raised` | `block` |
| Safety | `shield` | `shield` |
| Location (plan area) | `mappin.and.ellipse` | `location_on` |
| Exact spot locked | `lock` | `lock` |
| Exact spot unlocked | `lock.open` | `lock_open` |
| Recenter | `location` | `my_location` |
| Time | `clock` | `schedule` |
| Repeats | `repeat` | `repeat` |
| Capacity | `person.2` | `group` |
| Reach | `dot.radiowaves.left.and.right` | `radar` |
| Why you're seeing this | `info.circle` | `info` |
| Not for me | `eye.slash` | `visibility_off` |
| Verified | `checkmark.seal.fill` | `verified` |
| Showed up | `figure.walk` | `directions_walk` |
| Hosted | `star.circle` | `stars` |
| Vouch | `hand.thumbsup` | `thumb_up` |
| Connection | `person.2.wave.2` | `handshake` |
| Women only | `person.fill` + label (never a gender glyph alone) | `person` + label |
| Camera / gallery / poll | `camera`, `photo`, `chart.bar` | `photo_camera`, `image`, `poll` |
| Trusted contact | `person.badge.shield.checkmark` | `contact_emergency` |
| Settings | `gearshape` | `settings` |

Rules: never invent a custom glyph when a platform symbol exists; never use a heart (dating connotation); never use a fire or flame (MigoMap's "trending" glyph, SS36; it implies hype).

### 7.2 Emoji as category markers (new)
**Why:** [Certain] MigoMap's emoji-plus-avatar pins are its most legible element. **Rules:**
- Emoji appear only as the **plan's emoji** (chosen or auto-suggested) and as **category chips**. Never in body copy, buttons, errors or notifications; at most one in a heading.
- Render platform emoji (Apple on iOS, Noto on Android). Do not ship a 3D emoji set: it adds ~megabytes and a licensing dependency. [Likely] MigoMap uses Microsoft's Fluent 3D set; TG doesn't need it.
- Emoji sit on a **CategoryTile**: 44 pt circle (list) or 40 pt (pin), category tint background, emoji at 24 pt.
- Auto-suggestion maps keywords → emoji (badminton → 🏸, coffee → ☕, lift → 🚗). The host can always change it.
- Emoji must never encode meaning on their own: the plan text and category label carry the meaning.

### 7.3 Avatars
- Circle, 40 pt in rows, 56 pt on the plan card, 96 pt on profiles.
- **Initials fallback** in `background.surfaceMuted` with `text.secondary`, never a generic silhouette.
- **GoingStack:** up to 3 overlapping avatars (−8 pt), then "+n" only if `n` is real. No placeholder avatars ever.
- Verified tick sits bottom-right of the avatar at 40 pt and above, `action.primary` on `onPrimary` seal.

### 7.4 Map pin anatomy
```
[ CategoryTile 40pt, emoji 22pt, ring 2pt color.map.plan ]
   └ host avatar 18pt, bottom-right, white 1.5pt border
```
- Clusters: a 44 pt circle with the count ("7") in `bodyStrong`, tint = most common category.
- Selected pin scales 1.15 and lifts (elevation.card).
- Pins never show a name or distance. Tapping opens the plan card sheet.
- The user's own position is `color.map.me` with a soft pulse (off under reduced motion). No other person is ever drawn on the map.

### 7.5 Badges (new, replaces the trust score)
| Badge | Where | Form |
|---|---|---|
| Verified | avatar tick; profile | seal icon + "Verified" |
| Showed up ×n | profile, host row on the card | walk icon + "Showed up ×14" |
| Hosted ×n | profile | star icon + "Hosted ×3" |
| Vouched by … | plan card | thumbs-up + names |
| Host | profile of programme hosts | pill "Host" with an info tap: "Hosts run regular plans in {city}." |
| Venue | plan card, pin | pill "Venue"; venue plans may show an exact spot |
| Women only · Verified only · Friends of friends | plan card | neutral pills, text only |

Never: numeric scores, stars out of five, "PRO", "Popular", "Trending", "Hot" 🔥.

---

## 8. Core components (anatomy and rules)

**Retained with renames:** IntentCard → **PlanCard**; WhyShownChip → **WhyYouSeeThis** (now a line, not a chip, always visible, never behind a tap); PrivacyHint → **PrivacyStrip**; ReachOptionCard → **ReachDial**; DeliveryReasonRow → **ReasonLine**; StatePanel and the state-priority order (`disabled > loading > error > offline > pressed > focused > selected > success > default`) stay as written.

### PlanRow (list) and PlanCard (sheet)
```
Row:   [CategoryTile] Title (bodyStrong, 1 line)              [time, right, secondary]
                      area · distance bucket (caption)        [GoingStack + "3 going"]
                      ReasonLine (caption, info colour)        "Not for me"
Card:  grabber · back share report close
       emoji 56 · title (screenTitle) · "area · time · spots left"
       host row (avatar, "Hosted by {name}", Verified) → profile
       attribute pills
       GoingStack + sentence
       "Vouched by …" + Vouch
       WhyYouSeeThis box + Not for me
       PrivacyStrip (lock icon) "Exact spot unlocks 1 hour before, for people going."
       [Asks/Offers] details block
       sticky footer: PrimaryPlanCTA (+ Chat when in)
```
Rules: one primary verb; the reason is mandatory; no distance under 1 km more precise than "under 1 km"; attendee list for asks/offers is never rendered.

### PrimaryPlanCTA
Full-width pill, 52 pt, `action.join`. Copy by state is defined in S11. Disabled shows the reason under it in `caption`. Loading replaces the label with a spinner and keeps width.

### ReachDial
Four stops on a horizontal track, labels under each, live "≈ n" above the active stop; stops left of the current level are locked (padlock) after publish. Selecting a stop reads the estimate aloud for screen readers.

### PrivacyStrip
Lock icon + one sentence in `caption`, `background.surfaceMuted`. Variants: locked, unlocks-at, unlocked, immediate (venue).

### MeetupBanner
Amber surface, clock icon, "Starts in 42 min · Spot unlocked" or "Spot unlocks in 1 h 12 m", tap → Meetup mode.

### DensityLine
Text only: "{n} plans near you this week" / "A few plans near you this week" / "Be the first to post a plan near you". Never a number under 5.

### Empty / Error / Offline panels
Retained from StatePanel. Empty panels may use Manrope display headings and **no illustration of people**. Illustration, when used, is the mark and abstract rings.

---

## 9. Content and voice

### 9.1 Voice
**Retained** from `docs/08`: calm, clear, respectful, transparent, useful; explain consequential behaviour before asking; never promotional, mysterious, judgmental, or urgent without a real deadline.

**Changed:** add **friendly**. Concretely:
- Contractions are fine ("you're", "we'll", "couldn't").
- First names in system messages and toasts ("Priya is in").
- Onboarding headings are lowercase and conversational.
- One emoji in a heading is allowed (onboarding, "you're in", empty states). None anywhere else.
- **Why:** [Certain] every warmth row in the comparison went to MigoMap; TG's copy was clear but cold.

### 9.2 Writing principles (retained, plus two)
- Lead with the user's state; familiar words; explain why; state privacy consequences directly; specific verbs; distinguish facts, estimates and trust signals; never imply guaranteed safety; neutral rejection language.
- **New:** *Say who else.* Where a plan has people going, say so before anything else about it.
- **New:** *Numbers are real, or they are words.* "≈ 40", "a few", or nothing. Never "100+".

### 9.3 Terminology (replaces the `docs/08` table)
| Use | Meaning | Never |
|---|---|---|
| plan | an open group activity someone hosts | intent, event, activity (as a noun for the object), meetup |
| ask | a favour or a hand you need | request, need (as a noun) |
| offer | something you have to share | listing |
| post (verb) | publish a plan, ask or offer | broadcast, share (for publishing), blast |
| host | the person who posted | broadcaster, creator, organiser |
| people going / going | those who joined | attendees, participants, members, matches |
| I'm in | join an open plan | join, RSVP, attend |
| ask to join · I'll take it | request on an ask/offer | apply, respond |
| connection | someone you've connected with | friend (in UI; "Friends" is only the reach label), follower |
| Friends · Friends of friends · Nearby · Anyone in {city} | the four reach levels | trusted circles, adjacent network, relevant nearby, broader approved |
| reach | how far a post travels (retained) | audience, visibility |
| Why you're seeing this | the reason line (retained) | why this reached you, recommended for you |
| vouch | a connection endorses a plan | confirm, like, upvote |
| showed up | confirmed attendance by others | reliability score, rating |
| Verified | selfie-verified real person | trusted, safe, ID-checked |
| exact spot | the precise place | exact location, address (unless it's an address) |
| area | the approximate place | location, neighbourhood (fine in prose) |
| Meetup mode | the pre-plan safety screen | safety mode, live mode |
| not for me | hide and down-rank | not relevant, dismiss, hide |
| restricted / limited | moderation state (user-facing: "limited") | banned, suspended, under review (in UI) |

### 9.4 Button vocabulary (replaces `docs/08`)
- **Create:** Post · Next · Back · Keep draft · Discard · Widen reach · Edit details · Cancel plan · Share spot now · Post again
- **Join:** I'm in · Ask to join · I'll take it · Leave · Withdraw · Open chat
- **Trust:** Vouch · Connect · Accept · Decline · Remove connection · Get verified
- **Safety:** Report · Block · Tell someone your plans · I'm here · Get help
- **Generic allowed:** Continue (onboarding only), Retry, Done, Cancel, Not now, Got it. **Never:** Submit, OK, Broadcast, Apply, Confirm (as a button label).

### 9.5 Reason lines (closed set)
"{Name} is going" · "Vouched by {Name}" · "{Name} is hosting" · "Friends of friends" · "Near you · {interest}" · "Near you" · "You're heading to {city}" · "Hosted by a venue near you" · "Anyone in {city}". New reasons require a product decision, not a copy edit.

### 9.6 Time, distance, numbers
- Time: "now" (started, still open) · "in 20 min" (< 60) · "tonight 8 pm" (today, from 5 pm) · "today 1:30 pm" (today, before 5 pm) · "tomorrow 7:30 am" · "Sat 6 pm" (< 7 days) · "12 Oct" (beyond) · "ended". 12-hour with lowercase am/pm; fixed English month and weekday abbreviations until localisation.
- Distance: for plans only; "under 1 km", "≈ 3 km", "≈ 12 km"; unit from settings; never decimals.
- Counts: "a few" for 1–4 when the count is of people the viewer can't see individually (density, arrivals, estimates); real integers from 5. "N going" on a plan card is exact because those people are shown. Estimates are prefixed "≈".
- Capacity: "2 spots left" · "1 spot left" · "Full" · "No limit".

### 9.7 Status labels (replaces `docs/08` table)
| State | Label | Supporting copy |
|---|---|---|
| Draft | Draft | Only you can see this. |
| Live | Live | Reaching {reach label}. |
| Full | Full | No spots left. People can still see it. |
| Started | Happening now | — |
| Ended | Ended | Chat stays open for a day. |
| Cancelled | Cancelled | {Host} cancelled this plan. |
| Limited (restricted) | Limited | Some actions are unavailable right now. |

### 9.8 Empty, error, offline (canonical)
- Nearby, none: **Nothing near you yet** / "Post the first plan in {area}, or check {nearby area}." / Post the first plan
- Nearby, filtered: **No plans match** / Clear filters
- Chats: **No chats yet** / "Join a plan and its chat opens right here." / Find a plan
- Notifications: **Nothing here yet** / "We'll tell you when someone's in, or when a plan pops up near you."
- Connections: **No connections yet** / "Connections come from plans you've been to together."
- Heading to: **Where to next?** / "Add a trip and we'll show plans there before you arrive."
- Error: **Couldn't load** / "Check your connection and try again." / Retry
- Offline banner: "You're offline. We'll send this when you're back."
- Post failure: "Couldn't post. Your draft is saved." / Retry
- Not available: **This isn't available** / "It may have ended or isn't shared with you." (one text for every cause)

### 9.9 Privacy and safety copy (canonical)
- "People see the area. The exact spot unlocks for people going, 1 hour before."
- "Nobody sees where you are. Plans show an area, not your location."
- "{Host} will see your first name, your photo and this note. Your contact details stay hidden until they accept."
- "This plan is for verified women. Get verified →"
- "Only used for women-only plans, and only once you're verified. Never shown to anyone."
- "They won't know who reported them."
- "Share your number after you've met, not before."
- "If it feels off, leave. You don't need a reason."
- Never: "100% safe", "trusted user", "verified means safe", "we've checked everyone".

### 9.10 Notifications (retained rules, new examples)
Rules retained: name the real state change; no sensitive content on the lock screen; deep-link to the object; never manufactured FOMO ("We miss you", "People are waiting").
- "Priya is in · Badminton tonight"
- "Someone asked to join your ask" (host; requester's name only in-app)
- "Badminton tonight starts in 1 hour"
- "Spot unlocked · Badminton tonight"
- "New plan near you · ☕ Coffee walk · Near you"
- "Arjun vouched for your plan"
- "Arjun confirmed you showed up"
- "How did Badminton tonight go?"

### 9.11 Localisation
- en-IN first. Hindi and Punjabi are the next locales for the launch city [Likely]. All strings in a catalogue from day one; allow 30% expansion; no meaning in capitalisation or punctuation; km default in India (MigoMap defaults to miles, SS9, which is wrong for the market).

---

## 10. Imagery and illustration

- **No stock faces, ever.** Faces on TG are real users' avatars, shown only where G2 allows. The onboarding radar and welcome art use rings, dots and the mark. **Why:** [Certain] MigoMap shows strangers' faces on the welcome radar (SS24) and testimonial photos (SS17); TG's honesty rule forbids implied people.
- **Example pins** on the welcome screen carry an "Examples" caption.
- **Destination photos** (Heading to) are licensed or user-contributed and credited; never used to imply activity ("10 going" only if true).
- **Illustration style:** flat, two-tone (primary + tint), rounded geometry, no characters. Used only in onboarding and empty states.
- **Photos in chat** are members-only and never surface outside the thread.

---

## 11. Accessibility (retained, plus map rules)

Retained in full from `DESIGN.md` and `docs/17`: AA contrast, dynamic type without truncating trust/privacy/safety copy, labels that describe action and state, 44/48 targets, safe areas and IME insets, reduced motion preserves state feedback.

**New for the map:**
- Every pin is an accessibility element: "Plan: {title}, {area}, {time}, {n} going. Double-tap to open."
- A "List" toggle is always reachable so the map is never the only path.
- Clusters read "{n} plans here. Double-tap to zoom."
- The sheet's detent changes are announced ("Plans list, half open").
- Colour-blind check on category tints is not required because tints carry no meaning; the ring and emoji do.

---

## 12. Learnings from MigoMap, as design rules

| Learning | Rule in this guideline |
|---|---|
| Emoji + avatar pins make a map legible at a glance (SS27) | §7.2, §7.4 |
| One-tap "I'm in" is the whole product (SS25) | §8 PrimaryPlanCTA; §9.4 |
| Relative time beats absolute (SS30) | §9.6 |
| Sheets over the map keep context (SS16–25) | §6 |
| Glass round buttons work over maps (SS16) | §5 (allowed only there) |
| Lowercase, warm onboarding copy (SS2, SS5) | §4, §9.1 |
| Personal arrival moment (SS24) | §5 celebration, without faces |
| Report + "Also block" in one sheet (SS22) | S26 copy in §9.9 |
| Skeletons and honest empty states (SS1, SS3) | §8 panels |
| Welcome DM makes day one feel alive (SS6) | Founder message, as a person, in §2.4 tone |
| **Refuse:** faces and distances of strangers (SS23) | §7.3, §7.4, §10 |
| **Refuse:** purple as the trust colour, PRO badges (SS28) | §2.2, §7.5 |
| **Refuse:** "100+ people", "100K+ travelers" (SS17, SS27) | §9.2, DensityLine |
| **Refuse:** flame/"trending" glyphs (SS36) | §7.1 |
| **Refuse:** template concatenation bugs ("wants to Looking for", SS25) | plan title is the host's sentence; the stem is never re-rendered in front of it |
| **Refuse:** miles in India (SS9) | §9.11 |

---

## 13. Governance: what changes where

| Document | Action |
|---|---|
| `DESIGN.md` | Replace with §2–§8 and §11 of this guideline |
| `docs/08 - Writing and Content Guide.md` | Replace with §9 |
| `docs/07 - Design System Specification.md` | Amend: tabs, fonts, glass and celebration exceptions, badges instead of score |
| `docs/17 - Mobile App Design Foundation.md` | Amend: map-first navigation, pillars |
| `PRODUCT.md` | Amend: name, brand commitments (add warm, honest), terminology list |
| `src/design-system/tokens.json` | Add dark palette (already specified in DESIGN.md), category tints, map tokens; switch `app.json` `userInterfaceStyle` to `automatic` |
| `AGENTS.md` non-negotiables | Unchanged. Every rule here is compatible with them. |

### 13.1 Rename to TrueGoing (locked)

**User-visible, must change before any build** [Certain, from the repo]:
| Where | Today | Becomes |
|---|---|---|
| `app.json` `name` | Nearcast | TrueGoing |
| `app.json` `slug` | nearcast | truegoing |
| `app.json` `scheme` (deep links) | `nearcast://` | `truegoing://` (the contracts already use this) |
| `app.json` iOS `bundleIdentifier` | `com.piyushsharma.nearcast.dev` | **`com.truegoing.app` (locked 2026-09-23).** Development builds use `com.truegoing.app.dev` so both can sit on one phone. Apple does not allow a bundle ID to change after submission. |
| `app.json` Android `package` | not set | `com.truegoing.app` (same ID; Play also treats it as permanent) |
| App icon, splash, favicon (`assets/images/*`) | Expo placeholders | the mark in §2.2 |
| Share domain | `nearcast.app/i/…` (docs/15) | `truegoing.app/p/…` |
| Any UI copy saying "Nearcast" | — | TrueGoing |

**Internal, can change later without user impact:** `package.json` name, the migration filename, docs titles, `AGENTS.md`, `README.md`, `PROJECT_LOG.md`, local seed emails (`@nearcast.local`). Renaming the migration file is free today because there is no deployed database.

**Before launch, outside the repo** [Likely]: check the name is clear to use as a trademark in India (class 9 and 42), reserve the domain and the App Store / Play Store names, and the Instagram handle. I haven't checked any of these.

## Change log

| Date | Change |
|---|---|
| 2026-09-23 | Bundle ID locked: `com.truegoing.app` (iOS and Android). |
| 2026-09-23 | TrueGoing locked as the brand name; rename checklist added (§13.1). |
| 2026-09-23 | First proposal: brand, colour, type, motion, navigation, iconography, components, content, imagery, accessibility, with retain/change/new against the existing docs and learnings from MigoMap. |
| 2026-09-23 | Refined time and count rules while implementing T2 (§9.6) |
