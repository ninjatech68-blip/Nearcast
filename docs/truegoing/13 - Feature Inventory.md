# 13 - Feature Inventory

**Written 2026-09-24.** Every feature the app needs or might need, beyond the core loop already settled in [`12 - Truegoing Concept`](./12%20-%20Truegoing%20Concept.md). Each row has my recommendation. The owner marks each **V1** (first App Store version), **Later**, or **Never**. Nothing here overrides the four rules in `12 §2`.

Recommendation key: **V1** ship in the first version · **Later** after V1 has users · **Never** conflicts with the concept.

---

## 1. Plans

| # | Feature | What it is, plainly | Recommendation | Why |
|---|---|---|---|---|
| 1.1 | Share a plan by link | Host or anyone accepted sends a link on WhatsApp; the receiver lands on the plan (rough area only), verifies, asks | **V1** | The cheapest way new people arrive. Every top consumer app grew through this |
| 1.2 | Cancel a plan | Host cancels; everyone accepted is told; chat goes read-only | **V1** | Expected; without it hosts ghost |
| 1.3 | Edit a plan | Only until the first ask; after that the words freeze | **V1** | Keeps an ask meaningful |
| 1.4 | Plan photo | Optional image on the plan card, moderated | **Later** | Icons carry V1; photos need moderation |
| 1.5 | Recurring plans | "Every Tuesday 7pm" | **Later** | Real demand from sports hosts; adds complexity |
| 1.6 | Save for later | Bookmark a plan without asking | **Later** | Nice, not needed |
| 1.7 | Waitlist when full | Ask when slots are full; auto-offer if someone drops | **Later** | Needs volume first |
| 1.8 | Add to calendar | One tap into iOS Calendar after acceptance | **V1** | Trivial on native; helps show-ups |
| 1.9 | Running late | Quick messages in chat: `Running 10 min late`, `I'm here` | **V1** | Show-up rate is the product |
| 1.10 | Plan expiry | A plan disappears a few hours after its time | **V1** | Kept from the previous app |
| 1.11 | Text search | Search plans by words | **Later** | Filters cover V1 |
| 1.12 | Venue suggestions | Partners suggest a place for a plan | **Never in V1** | Belongs with incentives Layer 3 |

## 2. Discovery

| # | Feature | What it is | Recommendation | Why |
|---|---|---|---|---|
| 2.1 | Sub-interests | Badminton under Sports, coffee under Food | **V1** | Fixes "sports" delivering cricket to a badminton player; the icon keyword list is most of the vocabulary |
| 2.2 | Multiple home neighbourhoods | Home and work, for example | **Later** | One is enough to start |
| 2.3 | Near me now | One-shot location to neighbourhood, discarded | **V1** | Settled in `12 §5` |
| 2.4 | Plans in another city | Browse a city you are travelling to | **Later** | Multi-city before one city is full spreads thin |
| 2.5 | New-plan push | "A plan you'd like was just posted" | **V1** | Capped at one a day; the single most useful notification |

## 3. People, trust and safety

| # | Feature | What it is | Recommendation | Why |
|---|---|---|---|---|
| 3.1 | Report | Reasons, "they won't know who reported", block in the same flow | **V1** | Not optional |
| 3.2 | Block | Mutual, immediate, closes chats, blocker leaves shared plans | **V1** | Settled |
| 3.3 | Blocked list | See and unblock | **V1** | Expected |
| 3.4 | Moderation console | Your queue of reports with the evidence and one-tap remove | **V1** | Reports without a queue are reports nobody reads |
| 3.5 | Account deletion | In-app, permanent, phone cannot return for 30 days | **V1** | Apple requires it |
| 3.6 | Data export | Download what the app holds on you | **Later** | Required by law in some markets; not day one in India |
| 3.7 | Safety tips page | The four chat lines and more | **V1** | Cheap |
| 3.8 | Connected accounts | Instagram and others, shown after acceptance | **V1** | Settled in `12 §10` |
| 3.9 | Vouch chain for women-only | Optional `confirmed` mark | **Later** | Settled in `12 §9` |
| 3.10 | Selfie liveness check | Paid third-party | **Never** | Owner: no paid verification |

## 4. Notifications, exactly these

| # | Push | Recommendation |
|---|---|---|
| 4.1 | Someone asked to join your plan | **V1** |
| 4.2 | Your ask was accepted | **V1** |
| 4.3 | New message | **V1** |
| 4.4 | Plan starts in one hour | **V1** |
| 4.5 | Did it happen? (after the plan) | **V1** |
| 4.6 | A plan you'd like was posted (one a day) | **V1** |
| 4.7 | Weekly digest | **V1**, Layer 1 |
| 4.8 | Monthly recap | **V1**, Layer 1 |

Payloads carry identifiers only. Each kind has its own switch in Settings. No marketing pushes, ever.

## 5. Account and settings

| # | Feature | Recommendation | Why |
|---|---|---|---|
| 5.1 | Phone code sign-in | **V1** | The verification |
| 5.2 | Apple and Google sign-in, name prefilled | **V1** | Settled; phone still required to act |
| 5.3 | Change phone number | **V1** | People change numbers |
| 5.4 | Devices signed in, sign out remotely | **Later** | |
| 5.5 | Notification switches per kind | **V1** | |
| 5.6 | Terms, privacy, community guidelines | **V1** | Store requirement |
| 5.7 | Help and contact | **V1** | One email, one form |
| 5.8 | Language | **Later** | English at launch, km, +91 default |

## 6. Platform quality

| # | Feature | Recommendation | Why |
|---|---|---|---|
| 6.1 | Dark mode | **V1** | Native iOS apps that ignore the system setting look broken |
| 6.2 | Dynamic Type | **V1** | Accessibility and App Store review |
| 6.3 | VoiceOver labels on every control | **V1** | Same |
| 6.4 | Offline: read what you have, queue asks and messages | **V1** | Trains and basements exist |
| 6.5 | Six states per screen: loading, empty, error, offline, disabled, restricted | **V1** | Part of every screen contract |
| 6.6 | Haptics on ask, accept, confirm | **V1** | Cheap, native |
| 6.7 | Widgets, Live Activities for a plan starting soon | **Later** | Delightful, not needed |
| 6.8 | iPad | **Never in V1** | Phone product |
| 6.9 | Analytics with identifiers only | **V1** | You need to see the funnel; nothing personal leaves |

## 7. Incentives (from `12 §11`)

| # | Feature | Recommendation |
|---|---|---|
| 7.1 | Showed-up rate visible to hosts | **V1** |
| 7.2 | Regular host placement | **V1** |
| 7.3 | Weekly digest, monthly recap | **V1** |
| 7.4 | First-plan nudge | **V1** |
| 7.5 | Points, private, mutual-confirm only | **Later** (Layer 2) |
| 7.6 | Partner vouchers | **Later** (Layer 3) |

## 8. Never

People list or search. Follow, friends, followers. Profile views. Likes or hearts. Public leaderboards. Popularity sort. Exact place before acceptance. Live or background location. Group chat for non-accepted people. Paid verification. Marketing pushes. Emoji as category. Rewriting the person's words.

---

## Count

Recommended V1: 44 items. Later: 14. Never: 3 plus the standing list. The V1 count is what "top 1%" costs; each item is small, but none can be skipped without a visible hole.

## Owner's decisions

Mark any row you want moved. Unmarked rows stand as recommended. Then `14 - Brand, Design and Content Direction` follows.
