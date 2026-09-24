# 14 - Brand, Design and Content Direction

**Written 2026-09-24.** How Truegoing looks, sounds and behaves, written against [`12 - Truegoing Concept`](./12%20-%20Truegoing%20Concept.md) and [`13 - Feature Inventory`](./13%20-%20Feature%20Inventory.md). Screen contracts and the design system are built from this document. Where it borrows from the previous app it says so; everything else is new.

---

## 1. Brand core

**Name:** Truegoing. One word, capital T only. Never "TrueGoing", never "TG" in anything a user sees.

**Promise:** Find a plan near you that fits you, from someone who shows up.

**Personality, in three words:** plain, warm, reliable. The app talks like a friend who is good at organising: says what will happen, does not oversell, shows up.

**Positioning line for the App Store:** Plans near you, with people who show up.

**What the brand is not:** a dating product, a social network, a nightlife brand, a "community". None of those words appear in the app or the store listing.

## 2. Voice and tone

Kept from the previous app, because it was its best asset. These are rules, and the build has a test that fails when copy breaks them.

- **Say what is shared and what happens next.** Every action that touches another person states, in one line, who sees what. `Aarav sees your first name, photo and this note.`
- **Sentence case** for everything: titles, buttons, labels, chips. The only capitals are names and the start of a sentence.
- **No exclamation marks. No emoji in copy. No "please". No "sorry".** Nothing here is exciting enough for an exclamation mark, and flatness is the trust signal.
- **No inflated numbers.** Real counts or none. Never "100+ people", never "join thousands". If a count is approximate, say `about 12` or show `≈`.
- **No pressure.** Never "don't miss out", never "last chance", never a countdown.
- **Short.** A button is one to three words. A helper line is one sentence. A sheet has at most two lines of explanation above its button.
- **Exit words, fixed:** `Done` when nothing is lost · `Never mind` when something typed or picked is discarded · `Back` when the previous step is kept. Never a bare `×` as the only way out.
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

| Moment | Copy |
|---|---|
| Sign in | `Your number` · `We text a code. Your number is never shown to anyone.` · `Continue` |
| First open, unverified | banner on every card: `Verify your number to ask.` |
| Interests | `What are you into?` · `Pick as many as you like. You only see plans that match.` |
| Home neighbourhood | `Where do you live, roughly?` · `Stored as a neighbourhood, never your exact position. It decides which plans reach you.` |
| Empty feed | `Quiet here this week.` · `Show plans in other interests too` · `Post a plan` |
| Why line | `Near you · into sports` · `You're browsing the map` |
| Ask sheet | `Ask to go` · starters `I can make it` · `First time, is a beginner fine?` · `Can I bring one more?` · `Aarav sees your first name, photo and this note. No answer means no.` · `Send` · `Never mind` |
| Ask sent | `Sent. Aarav decides.` |
| Accepted | `You're going. The exact place and the chat are open.` |
| Host, new ask | row: `Riya asked to go` · note · `Accept` · `Decline` |
| Post sheet | placeholder `What's the plan?` · chips `what · where · when` · `How many?` · `Show on the map` · `For women` · `Send` |
| Reach line | `Reaches people nearby who share the interest. Only people you accept see the exact place.` |
| For women, on the plan | `For women. Everyone here declared they are a woman. The host can remove anyone.` |
| Chat opener | `Everyone here is going.` · `Share your number after you've met, not before.` · `Meet in a public place the first time.` · `Block ends the chat for both of you.` · `Report anything that feels off; they won't know it was you.` |
| Did it happen | `Did you meet Aarav?` · `Yes` · `No` · `Didn't go` |
| Record | `31 plans · showed up 97%` |
| Regular host | `Regular host` with a line: `Five plans that happened.` |
| Cancel plan | `Cancel this plan?` · `Everyone going will be told.` · `Cancel plan` · `Keep it` |
| Withdraw ask | `Withdraw?` · `Aarav won't be told.` · `Withdraw` · `Keep it` |
| Block | `Block Aarav?` · `Neither of you can see or message the other. You'll leave any plan you share.` · `Block` · `Keep it` |
| Report | `What happened?` reasons · `They won't know who reported them.` · `Also block` |
| Delete account | `Delete your account?` · `Everything goes. Your number can't come back for 30 days.` |
| Weekly digest push | `3 plans in your interests this weekend` |
| Monthly recap | `You met 4 people in September.` |

Placeholder names are examples; real copy substitutes the real first name.

## 4. Visual direction

**Principle: native iOS first, Truegoing on top.** System navigation, sheets, lists, haptics and type. The brand lives in one accent, six category colours, the plan icons and the voice. A person should feel they are on an iPhone, and know within a second which app it is.

### Colour

Light and dark are both first-class. Backgrounds are the system's; brand colours sit on them.

| Token | Light | Dark | Use |
|---|---|---|---|
| Accent | `#FF4D1D` | `#FF6A3D` | Primary button, selected state, the tick |
| Ink | system label | system label | All text |
| Surface | system background | system background | Screens |
| Card | system secondary background | system secondary background | Cards, sheets |
| Settled | `#17442E` | `#3FA36B` | Confirmed meetups, showed-up |
| Warning | system red | system red | No-show, cancel, block |

The accent is kept from the previous brand on purpose: it is the one visual asset people remembered. Cream backgrounds are dropped; system backgrounds respect dark mode.

**Category colours**, used only for plan icons, map markers and the thin stripe on a card:

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
- **Plan icons:** a drawn set of about thirty, one per sub-interest, two-tone, sized for a card, a map marker and a chat header. Consistent stroke, rounded, no faces, no people. Emoji are never used as icons.
- **Marks:** the verified tick (accent), `For women` mark, `Regular host` mark. Three marks, no more.

### Imagery

Plan photos are optional and later (`13` 1.4). Until then the icon on the category colour is the image. Never stock photography of happy groups. App Store screenshots show the real app with real-looking plans and first names only.

## 5. Components

| Component | What it is | Rules |
|---|---|---|
| **Plan card** | Icon on category colour, the host's sentence in Headline, start time and rough distance in Footnote mono, host first name and record, why line | Two to three per screen. Whole card taps to the plan. No buttons on the card |
| **Map marker** | Category-coloured disc with the plan icon; cluster shows a count | Never a face, initials or name |
| **Plan sheet** | Half-screen sheet from a marker or card: full card, host row, host's note, reach line, `Ask to go` | Swipe down to dismiss; nothing lost |
| **Post sheet** | Half-screen sheet: one text field, three chips, how many, two switches, `Send` | Rises from the `+` button; expands to full only if the keyboard needs it |
| **Ask sheet** | Half-screen: starters, field, one disclosure line, `Send`, `Never mind` | `Send` enabled once a starter is tapped or text exists |
| **Bar button** | Full-width, accent, one action | One per screen at most |
| **Quiet action** | Text button, no fill | For the exit and the secondary action |
| **Chips** | Sentence case, one row that scrolls | Selected chip uses the accent |
| **Why line** | Footnote, secondary colour, on every plan | Product law; never omitted |
| **Record row** | Tick, first name, `31 plans · showed up 97%` | Facts in mono; never a star rating |
| **Activity row** | What happened, who, when, one inline action | Accept and decline live on the row |
| **Banner** | One line, dismissible where allowed | Used for `Verify your number to ask` and offline |

## 6. Layout and navigation

- **Three destinations in a tab bar:** Plans (map or list), Activity (asks, messages, your plans), You. A floating `+` posts a plan from anywhere on Plans.
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

- **Icon:** accent background, a single white mark derived from the plan-icon stroke, no letters. Tested at 60 points on a busy home screen.
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
