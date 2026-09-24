# 14 - Brand, Design and Content Direction

**Written 2026-09-24.** How Truegoing looks, sounds and behaves, written against [`12 - Truegoing Concept`](./12%20-%20Truegoing%20Concept.md) and [`13 - Feature Inventory`](./13%20-%20Feature%20Inventory.md). Screen contracts and the design system are built from this document. Where it borrows from the previous app it says so; everything else is new.

---

## 1. Brand core

**Name:** Truegoing. One word, capital T only. Never "TrueGoing", never "TG" in anything a user sees.

**Promise:** Find a plan near you that fits you, from someone who shows up.

**Personality, in three words:** plain, warm, reliable. The app talks like a friend who is good at organising: says what will happen, does not oversell, shows up.

**Positioning line for the App Store:** Plans near you, with people who show up.

**What the brand is not:** a dating product, a social network, a nightlife brand, a "community". None of those words appear in the app or the store listing.

## 2. Voice and tone (ruled 2026-09-24: Airbnb's register, our disclosures)

Airbnb's product voice is the model: warm, direct, sentence case, second person, short headings that read like a friend talking, no exclamation marks in the product, numbers stated plainly. Truegoing writes in that register with one addition Airbnb does not need: every action that touches another person carries a line saying who sees what. That line is a business rule, not a tone choice, and it stays.

Register, by example:

| Airbnb says | Truegoing says |
|---|---|
| Where to? | What's the plan? |
| Start your search | Find a plan |
| Show 128 places | Show 12 plans |
| Clear all | Clear all |
| Guest favourite | Regular host |
| Reserve | Ask to go |
| You won't be charged yet | If Aarav doesn't reply, that's a no |
| Message host | Message Aarav |
| Your trips | Your plans |
| Wishlists | Saved (later) |
| Log in or sign up | Log in or sign up |

The rules below hold in that register, and the build has a test that fails when copy breaks them.

- **Say what is shared and what happens next.** Every action that touches another person states, in one line, who sees what. `Aarav sees your first name, photo and this note.`
- **Sentence case** for everything: titles, buttons, labels, chips. The only capitals are names and the start of a sentence.
- **No exclamation marks. No emoji in copy. No "please". No "sorry".** Nothing here is exciting enough for an exclamation mark, and flatness is the trust signal.
- **No inflated numbers.** Real counts or none. Never "100+ people", never "join thousands". If a count is approximate, say `about 12` or show `≈`.
- **No pressure.** Never "don't miss out", never "last chance", never a countdown.
- **Short.** A button is one to three words. A helper line is one sentence. A sheet has at most two lines of explanation above its button.
- **Exit words, fixed:** `Done` when nothing is lost · `Never mind` when something typed or picked is discarded · `Back` when the previous step is kept. Never a bare `×` as the only way out. `Not for me` dismisses a plan.
- **Refusals are stated as facts, not apologies.** `Verify your number to ask.` not `Sorry, you need to verify first!`
- **Silence is a message.** A declined ask says nothing to the asker. The copy says so up front: `No answer means no.`

### Vocabulary

| Use | Never |
|---|---|
| plan | event, activity, cast, post |
| ask to go · ask | join, RSVP, apply, request |
| host | organiser, creator, poster |
| going · people going | attendees, members, participants |
| showed up · no-show | attended, flaked, ghosted |
| neighbourhood | location, area, zone |
| exact place | venue, address, pin |
| chat | thread, DM, message board |
| record | score, rating, reputation |
| connected accounts | verified socials, linked profiles |
| for women | women-only, ladies |
| verify your number | get verified, unlock |

## 3. Copy deck for the moments that matter

Rewritten 2026-09-24 after the owner's review: the goal is a first-time user who never needs an explanation. The rule behind each line is unchanged. The lines are shown in place on the visual review page (`visual/truegoing-screens.html`).

| Moment | Copy |
|---|---|
| Sign in | `Your phone number` · `We text you a code. Nobody on Truegoing ever sees your number.` · `Send code` · `Continue with Apple` · `Continue with Google` · `Apple or Google gets you in. You still add your number before you can ask to go or post.` |
| Interests | `What are you into?` · `You'll only see plans that match. Change this any time.` · `Under Sports & outdoors` (sub-interests) · `Next` |
| Neighbourhood | `Where do you live, roughly?` · `We save your neighbourhood, not your address. It's how we find plans near you.` · `Suggested from your location. We don't keep the location itself.` · `Show my plans` |
| Unverified banner | `You can look. To ask or post, add your number.` · `Add` |
| Sparse feed | `Not many plans this week.` · `Show more interests` |
| Card | sentence · `Thu 7pm · about 2 km` · `✓ Aarav · 31 plans · showed up 97%` · `Shown because you're into badminton` |
| Why line, browsing | `Shown because you're browsing the map` |
| Plan details | `2 of 4 going` · `You see a rough distance for now. If Aarav accepts you, you get the exact place and the chat.` · `Ask to go` · `Not for me` |
| Ask sheet | `Ask to go` · `Pick a line or write your own.` · starters `I can make it` · `First time, is a beginner fine?` · `Can I bring one more?` · `Aarav sees your first name, photo, record and this note. If Aarav doesn't reply, that's a no.` · `Send` · `Never mind` |
| Ask sent | `Sent. Aarav will accept or decline. We'll tell you here.` |
| Accepted | `You're in. Here's the exact place and the chat.` |
| Host, new ask | `Riya asked to go` · note · `Accept` · `Decline` |
| Post sheet | placeholder `What's the plan?` · `We picked these out. Tap one to change it.` · chips what · where · when · how many · `Show on the map` · `For women only` · `People nearby who like badminton will see this. Only the people you accept see the exact place.` · `Post plan` |
| Post sheet, missing | red chips `Where?` `When?` · `Add a place and a time so people know where to be.` · quick picks `Tonight 7pm` · `Tomorrow evening` · `This weekend` · `Pick a time` |
| For women, on the card | `For women. Everyone here said they're a woman. The host can remove anyone.` |
| Chat opener | `Everyone here is going.` · `Share your number after you've met, not before.` · `Meet in a public place the first time.` · `Report anything off. They won't know it was you.` |
| Chat quick lines | `Running late` · `I'm here` |
| Pinned plan | `Thu 7pm · Sector 5 Sports Complex, Court 3` · `Exact place · Add to calendar · Directions` |
| Did it happen | `Did you meet Aarav?` · `Yes` · `No` (a No asks one follow-up: `Did you go?`) |
| Record | `31 plans · showed up 97%` |
| Regular host | `Regular host` · `Five plans that happened.` |
| You | `WHAT HOSTS SEE` card · `Connected accounts · Instagram · shown after a yes` · `Your plans` · `Blocked · Nobody` · `Settings` |
| Cancel plan | `Cancel this plan?` · `Everyone going will be told.` · `Cancel plan` · `Keep it` |
| Withdraw ask | `Take back your ask?` · `Aarav won't be told.` · `Take it back` · `Keep it` |
| Block | `Block Aarav?` · `You won't see each other or message again. You'll leave any plan you share.` · `Block` · `Keep it` |
| Report | `What happened?` · reasons · `They won't know who reported them.` · `Also block` |
| Delete account | `Delete your account?` · `Everything goes. Your number can't come back for 30 days.` |
| Weekly digest push | `3 plans in your interests this weekend` |
| Monthly recap | `You met 4 people in September.` |

Placeholder names are examples; real copy substitutes the real first name.

## 4. Visual direction (ruled by the owner 2026-09-24: Airbnb-like)

**Principle: warm, white, three-dimensional. Native iOS underneath.** The owner ruled the look and feel should follow Airbnb's 2025 direction. What that means here, in order of importance:

1. **Plan icons are small three-dimensional objects**, rendered with light, depth and a soft shadow, the way Airbnb's category and service icons are. They do the job photographs do elsewhere: a plan card with a badminton racket you could pick up reads instantly and warmly. One icon per sub-interest, about fifty, plus six category icons. Flat outline icons remain only for navigation and marks, as in Airbnb.
2. **White surfaces, soft shadows, generous rounding.** Cards sit on white with a shadow, not on grey with a border. Corners are 20 points on cards, 28 on sheets, pills for chips and the search bar. Dark mode keeps the same shapes with a thin border in place of the shadow.
3. **A category row at the top of Plans**, the icons in a scrolling line with a label under each and a black underline on the selected one, exactly the Airbnb pattern. Under it the map or list.
4. **A search pill** at the top: `Near Sector 5 · This week · Badminton, Games, Cycling`, one tap to change any part. It replaces the segmented neighbourhood control.
5. **Ink buttons, orange tick.** Airbnb's interface is black text and black buttons on white with its brand colour used sparingly; ours is the same, with the orange tick as the brand moment. The Ink ruling stands.
6. **Liquid Glass** for the tab bar and sheets on iOS 26 and later, the system material below (`17`).

**The icon set, and how it gets made.** [Certain] Airbnb's icons are 3D renders made by illustrators. The placeholder set on the visual page (`visual/icons-3d/`) is built from the outline glyphs on shaded tiles so screens can be judged today; it is not the final art. The final set comes from one of two routes, the owner's choice:

- **Commission a 3D illustrator** (ruled as the route: the set must match Airbnb's render style, which no pack does). Brief: about fifty-six objects on a shared 3D stage, three-quarter view, soft studio light from the top left, matte plastic with a subtle gloss, one dominant colour per category family with two or three accent colours per object, no text, no people, no faces, transparent background, delivered at 3x for 56 and 40 point display plus a 1024 app icon. Consistency matters more than detail: same camera, same light, same material across all fifty-six. Reference: Airbnb's 2025 category icons. Estimate: two to four weeks for a freelance illustrator.
- **License a 3D icon pack** that covers sport, food, music, games and learning objects in one consistent style, and commission only the missing pieces. Faster and cheaper; the risk is a look shared with other apps.

Either way the tiles are replaced one for one; the code refers to icons by name from `manifest.json`, so no screen changes when the art arrives.

**Type.** SF Pro throughout at heavier weights for headings (Airbnb's Cereal is proprietary and SF Pro is what its iOS app reads as), Dynamic Type at every size. Facts (record, time, distance) in SF Mono at small sizes.

### Colour (ruled by the owner 2026-09-24: Airbnb's roles, Truegoing's hue)

Airbnb's colour system is adopted role for role. The one deliberate difference is the hue in the brand slot: Truegoing coral `#FF5C39`, not Airbnb's Rausch `#FF385C`. Same layout, same icon style and the same colour together would be Airbnb's trade dress; changing the hue keeps the look and stays on the right side of that line.

| Role | Light | Dark | Use |
|---|---|---|---|
| Text | `#222222` | `#F7F7F7` | All primary text |
| Muted | `#717171` | `#B0B0B0` | Secondary text, the why line, timestamps |
| Line | `#DDDDDD` | `#333333` | Dividers, input outlines, dark-mode card borders |
| Surface | `#FFFFFF` | `#000000` | Screens |
| Card | `#FFFFFF` with shadow `0 6px 18px rgba(0,0,0,.08)` | `#1A1A1A` with a `Line` border | Cards, sheets, the search pill |
| Fill | `#F7F7F7` | `#1A1A1A` | Secondary buttons, inputs |
| Brand | `#FF5C39` | `#FF7A5C` | The primary button as a gradient `#FF5C39 → #E8453C → #D93A4A`, the verified tick, the active tab |
| Secondary action | `#222222` | `#F7F7F7` | Selected chips and segments, Accept, the post button, sent bubbles |
| Settled | `#17442E` | `#3FA36B` | Showed-up, confirmed |
| Warning | system red | system red | No-show, cancel, block |

Rules carried from Airbnb: one gradient button per screen at most; black for everything else that is pressed or selected; the brand colour never fills a surface. Contrast checked at 4.5:1 for text and 3:1 for icons in both modes; `#717171` on white passes for body sizes and is never used under 13 points.

**Category colours** are the base hue of each category's 3D icons and its map disc. They are never used for text or buttons:

| Category | Colour |
|---|---|
| Social | `#FF4D1D` |
| Sports and outdoors | `#1B9C5A` |
| Food and drinks | `#E0A100` |
| Music and nightlife | `#6A4CFF` |
| Games | `#0E8FD6` |
| Learning and making | `#C4457A` |

Every pairing is checked for 4.5:1 text contrast and 3:1 icon contrast in both modes before it ships. Colour is never the only carrier of meaning; the icon and the label carry it too.

### Type

SF Pro throughout, with Dynamic Type at every size. No custom font in the first version; a display face can be considered later once the product has a face of its own. Facts about people (record, distance, time) may use SF Mono at small sizes so numbers line up and read as facts rather than prose.

Scale: system text styles only (Large Title, Title 2, Headline, Body, Subheadline, Footnote, Caption). No custom sizes.

### Icons

- **UI icons:** SF Symbols, always with a label or an accessibility label. Never an icon alone as the only way to understand a control.
- **Marks:** the verified tick (accent), `For women` mark, `Regular host` mark. Three marks, no more.

### Imagery

Plan photos are optional and later (`13` 1.4). Until then the icon on the category colour is the image. Never stock photography of happy groups. App Store screenshots show the real app with real-looking plans and first names only.

## 5. Components

| Component | What it is | Rules |
|---|---|---|
| **Plan card** | White card with shadow, 20-point corners; the 3D plan icon at 56 points, the host's sentence in Headline, start time and rough distance in Footnote mono, host first name and record, why line | Two to three per screen. Whole card taps to the plan. No buttons on the card |
| **Map marker** | Category-coloured disc with the plan icon; cluster shows a count | Never a face, initials or name |
| **Plan sheet** | Half-screen sheet from a marker or card: full card, host row, host's note, reach line, `Ask to go` | Swipe down to dismiss; nothing lost |
| **Post sheet** | Half-screen sheet: one text field, three chips, how many, two switches, `Send` | Rises from the `+` button; expands to full only if the keyboard needs it |
| **Ask sheet** | Half-screen: starters, field, one disclosure line, `Send`, `Never mind` | `Send` enabled once a starter is tapped or text exists |
| **Bar button** | Full-width, ink (paper in dark), one action | One per screen at most |
| **Quiet action** | Text button, no fill | For the exit and the secondary action |
| **Category row** | Scrolling row of 3D icons with labels, black underline on the selected one | The Airbnb pattern; sits under the search pill on Plans |
| **Filter sheet** | Full-screen sheet: When chips, Your interests checkboxes with `Show plans in other interests too`, Plan type chips; footer `Clear all` underlined and a gradient button with a live count `Show 12 plans` | Airbnb's filter sheet; no distance control because reach is fixed |
| **Empty state** | Three 3D icons fanned as the illustration, one-line title, one line of fact, one gradient button, one quiet action | Airbnb's empty-state pattern with our objects |
| **Search pill** | `Near Sector 5 · This week · Badminton, Games, Cycling` in a shadowed pill | One tap to change any part |
| **Chips** | Sentence case pills, one row that scrolls, white with a light shadow | Selected chip is ink with paper text |
| **Why line** | Footnote, secondary colour, on every plan | Product law; never omitted |
| **Record row** | Tick, first name, `31 plans · showed up 97%` | Facts in mono; never a star rating |
| **Activity row** | What happened, who, when, one inline action | Accept and decline live on the row |
| **Banner** | One line, dismissible where allowed | Used for `Verify your number to ask` and offline |

## 6. Layout and navigation

- **Five tabs in the system tab bar** (Liquid Glass, minimising on scroll, on iOS 26+): Plans · Going · Post · Messages · You, Airbnb's structure with posting in the centre (`18`).
- **Plans** opens on map or list by density (`12 §5`). The switch is a segmented control at the top; filters are chips under it.
- **Sheets over screens.** Posting, asking and plan detail are sheets; they never navigate away from the map.
- **Back is the system back.** No custom gesture is the only way out.
- **One primary action per screen.** If a screen needs two bar buttons, it is two screens.

## 7. Motion and haptics

- System transitions only. Sheets spring; cards do not animate on scroll.
- Haptics at four moments: ask sent (light), accepted (success), meetup confirmed (success), block or cancel (warning). Nowhere else.
- No confetti, no celebrations, no badges dropping in. The recap is text.

## 8. The six states

Every screen contract lists all six before it is designed:

| State | Rule |
|---|---|
| Loading | Skeleton of the real layout, never a spinner alone. Under 300 ms shows nothing |
| Empty | Names the reason and offers one action. Empty is never presented as failed |
| Error | Says what failed in plain words and offers retry. Never a code |
| Offline | Banner; what is cached stays readable; asks and messages queue and say so |
| Disabled | Visible but dimmed, with the reason in a line beneath (`Verify your number to ask`) |
| Restricted | For unverified people and for women-only plans: the screen shows what exists and says plainly what is needed |

## 9. Accessibility

Dynamic Type at every size including accessibility sizes, with layouts that reflow rather than truncate. VoiceOver labels on every control, written as the action (`Ask to go`, `Accept Riya`). Contrast as in §4. Every colour meaning has a text or icon twin. Reduced Motion respected. Minimum tap target 44 points.

## 10. App icon and store

- **Icon:** a single 3D object from the plan set (the place mark or the showed-up mark) on a white or coral ground, in the same render style as the icons, no letters. Tested at 60 points on a busy home screen, light and dark.
- **Store name:** `Truegoing: plans near you`.
- **Subtitle:** `With people who show up`.
- **Screenshots:** five, real screens, one sentence each in the voice: `See plans near you that fit you.` · `Ask in two taps. The host decides.` · `The exact place unlocks when you're in.` · `Chat with the people going.` · `Your record is what you actually did.`

## 11. Guardrails

Never: people on a map · faces on markers · follower, like or view counts · hearts · star ratings · leaderboards · countdowns · "community" as the promise · dating language · nightlife gradients · emoji as icon or in copy · stock photos of groups · an exclamation mark anywhere.

Always: the why line · the disclosure line before any action that touches a person · exact place hidden until acceptance · real counts or none · light and dark · Dynamic Type · sentence case.

## 12. How this is enforced in the build

- A **copy test** runs over every user-facing string: no `!`, no emoji, no `please`, no `sorry`, sentence case on buttons and titles, exit words from the fixed set, vocabulary from §2 and none from the "never" column.
- A **contrast test** computes every text and icon pairing in both modes.
- A **screen contract** exists before a screen is built, with the six states and its copy filled in.
- **Design tokens** live in one file; no colour, size or spacing is written anywhere else.

## 13. What comes next

`15 - Screen Contracts`: one contract per screen for everything marked V1 in `13`, written in this voice with these components and all six states. Then the data rules, then the iOS build plan.
