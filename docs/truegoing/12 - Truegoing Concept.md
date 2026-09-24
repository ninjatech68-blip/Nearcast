# 12 - Truegoing Concept

**Written 2026-09-24.** The foundation for a clean-slate build of Truegoing. Nothing from the previous app is inherited by default. Good decisions from the previous codebase (`ninjatech68-blip/mobileapp`) and from the MigoMap review are used as references and named where they are used. This document is the source of truth for the concept. Screens, schema, brand and plans come after it and must not contradict it.

Every statement here was agreed in the owner's question-and-answer session on 2026-09-23 and 2026-09-24, except where marked **Recommended, pending owner**.

---

## 1. The promise

**Find a plan near you that fits you, from someone who shows up.**

Truegoing is an interest-based plan app. People post plans, other people ask to join, the host says yes, they meet, both confirm it happened. The headline is always the plan. People are a consequence of the plan, never the thing being browsed.

What it is not: a dating app, a people-discovery app, a social network, an events listing. If a feature makes people look at people instead of plans, it does not belong.

## 2. The four rules that never move

1. **Verified people only can act.** Anyone can look. Only a person who has verified their phone can ask, post or chat.
2. **The host decides.** Every plan requires the host's approval for every person. No open join. Connection happens only after acceptance.
3. **The exact place is hidden until acceptance.** Everyone else sees a rough area, about one kilometre, never the address.
4. **The app never knows where you are.** A person names a neighbourhood. Nothing tracks, stores or watches location.

Everything else in this document can change. (Navigation: four tabs, Plans · Going · Messages · You, ruled 2026-09-24, see `18`.) These four cannot without rewriting the promise.

## 3. Who it is for

Anyone over 18 who wants to do something specific near where they live and would rather do it with someone than alone or not at all. Badminton after work. A board game on Sunday. Coffee before a lecture. The person is not looking for friends or dates; they are looking to do the thing, and a good person to do it with is the bonus.

All user types are welcome. Quality is enforced by what people can do, not by who is let in: unverified people look, verified people act, reliable people are trusted more, no-shows are seen.

## 4. The core loop

1. **Open the app, see plans near you that match your interests.** Map or list depending on how many there are.
2. **Ask to go** with a short note. The host sees your first name, photo, record and note.
3. **Host accepts.** The exact place and the chat unlock for you.
4. **Meet.** Both of you confirm it happened.
5. **Your record grows.** Hosts trust you more, your plans are placed better, and in Layer 2 you earn points.

Posting is the other half of the loop: write one sentence, confirm what, where and when, send. Under ten seconds.

## 5. Discovery: what you see and why

- **Nearby** means within a fixed distance of your **home neighbourhood**. A `Near me now` button asks for location once, converts it to a neighbourhood, and discards the coordinates. Nothing is stored. The app never asks for location on open.
- **Only your interests.** You choose categories; plans in other categories are not shown. If fewer than **6** plans are in view, one line offers `Show plans in other interests too`.
- **Map or list, by density.** Six or more plans in view: map first. Fewer: list first. The other view is one tap away. Above **40** plans in view, markers cluster and show a count.
- **Map markers** are the plan's icon in its category colour at the plan's rough one-kilometre point. Never a person's photo, name or initials on the map.
- **List cards** show icon or image, the host's sentence, start time, rough distance, host's first name and record. Two to three cards per screen. References: Airbnb for the map-list flip, podcast apps for the card.
- **Every plan has a stored reason for reaching you**, and the app shows it whenever the reason is not the obvious one: `You're browsing the map`, `Outside your interests`. A plan in a category you selected needs no line; the row already says why (ruled 2026-09-24).
- **Filters** persist: this week by default, plus category chips. One filter state for map and list.
- **Unverified people** see all of this and can do nothing else. Every card carries `Verify your number to ask`.

## 6. Posting a plan

- A **half-screen sheet** slides up over the map. One text field: `badminton at sector 5 courts tomorrow 7pm`.
- The app extracts **what, where, when** and shows them as three chips. Missing chip turns red; one tap fills it. The tap is the fact; the extraction is a suggestion. The app never posts what the person did not confirm.
- An **icon** is assigned from the words (badminton racket, coffee cup, chess piece), from a drawn set of about thirty under six categories. One tap to change. No emoji.
- **Where** defaults to the home neighbourhood. **When** offers quick picks: tonight, tomorrow evening, this weekend, pick a time.
- **How many** people the host wants. One means a one-to-one plan; more means a group plan.
- **Reach** is fixed and stated once: plans reach people within a fixed distance who share the interest. First plan shows the full explanation; later plans show one line.
- Optional switches: `Show on the map` (on by default), `For women` (see §9).
- Send. The plan is live. Its words freeze the moment someone asks to join.

## 7. Joining, accepting, meeting

- **Ask to go** opens a small sheet: three tap-to-send starter notes (`I can make it`, `First time, is a beginner fine?`, `Can I bring one more?`) or free text. Two taps in the common case. A note, chosen or typed, is always sent.
- The host sees first name, photo, record, note. **Accept** or **Decline** on the row itself and in the notification. Decline is silent; no answer means no.
- On acceptance the exact place and the chat open. The asker can withdraw before acceptance with a visible button.
- After the plan's time, both sides answer `Did it happen?` A meetup counts only when both say yes. That is the only thing that builds a record or earns points.
- Blocking is mutual and immediate. In a group plan the blocker leaves the plan.

## 8. Chat

- **One-to-one plans** open a private thread between host and accepted person.
- **Group plans** open one room for the host and all accepted people, created at the first acceptance. Askers are never in it. Each member still has a private thread with the host, one tap away.
- The plan is pinned at the top of every thread: sentence, start time, exact place, `Did it happen?` when the time passes.
- Four safety lines open every new thread, including `Share your number after you've met, not before.`
- Text, photos, location. Reply and reactions. No polls, voice, video, invites or forwarding. Threads go read-only some time after the plan ends.

## 9. Women-only plans (ruled by the owner 2026-09-24)

- Entry is **self-declaration**: one switch, no proof, no friction. [Certain] No sign-in provider returns gender, so there is no free verification.
- The promise is worded truthfully: `For women. Everyone here declared they are a woman. Hosts can remove anyone.` Never "verified women".
- Hosts approve every ask and can remove anyone from the plan and the chat at any time.
- One strike: a report in a women-only plan confirmed by the host removes the account permanently; the phone number cannot return.
- Upgrade path, later and free: a vouch chain gives a `confirmed` mark, and hosts may restrict a plan to confirmed women. Optional, never forced.

## 10. Profile

- **Everyone sees:** first name, photo, neighbourhood, interests, one line about you, member since, marks (phone verified, woman-declared where relevant, `accounts connected` as a count), record: plans hosted, plans joined, showed-up rate.
- **After acceptance:** connected social handles themselves, and plans you have in common.
- **Only you:** points balance, blocked people, settings, monthly recap.
- **Never:** followers, likes, who viewed you, photo gallery, age (18+ gate only), gender (women-only eligibility only).
- Connected accounts are called that. They are not verification. Phone is the verification.

## 11. Incentives

Goal: people make plans on Truegoing and show up. Rewards exist only for the meetup, never for the post.

**Layer 1, ships at launch, costs nothing.** Standing, not points.
- Showed-up rate visible to hosts when they decide.
- Five hosted plans that happened makes a `regular host`; their plans are placed first in their area.
- Weekly digest: `3 plans in your interests this weekend`.
- Monthly recap: `You met 4 people in Panchkula`.
- A bigger nudge for the first plan.

**Layer 2, ships when Layer 1 works, costs nothing.** Truegoing points, private to the person.
- Earned only when both confirm a meetup. Host 30, joiner 20.
- Same pair again within 30 days earns nothing. A no-show costs 50. Weekly cap 200.
- Spent inside the app: pin your plan to the top of your area for 24 hours, a host frame on your card, early access to features.
- No cash, no transfer, no leaderboard, never a public number.

**Layer 3, deferred.** Partner-paid vouchers per city against the same points. Not designed until a partner exists. Nothing in Layers 1 and 2 depends on it.

Numbers are starting points to tune, not findings.

## 12. Platform and build

- **iOS native** (Swift, SwiftUI, MapKit, native sheets and navigation). Android after iOS is done.
- **Backend reused as the reference:** Supabase and PostgreSQL, with the rules enforced in the database (row-level security, server-controlled transitions, tests for allowed and denied paths). The previous app's database and its 731 tests are the reference for §2, §7, §8 and §10, not the previous screens.
- **Sign-in:** phone code, plus Apple and Google for account creation with the name prefilled. Phone remains the verification that unlocks acting.
- **Push and analytics payloads** carry identifiers only: no plan text, names, messages or coordinates.

## 13. Brand and voice

- **Name:** Truegoing.
- **Voice, kept from the previous app:** say exactly what is shared and what happens next. Sentence case. No exclamation marks, no emoji in copy, no "please", no inflated numbers. Real counts or none.
- **The why line** on every plan, kept.
- **Colour, type and marks:** open, to be designed against this document.
- **Never:** people on a map, follower or popularity counts, hearts, dating language, "community" as the main promise.

## 14. Deliberately absent

People list or search. One-tap join without the host. Exact place before acceptance. Live location. Group chat for people who were not accepted. Profile views, followers, PRO badges. Paid rewards for posting. Public leaderboards. Emoji as category. Sentence templates that rewrite the person's words. Multi-city browsing before there are users in one city.

## 15. References used

- Previous Truegoing codebase: the four rules, delivery by neighbourhood and interest, host approval with a note, place hidden until acceptance, mutual confirmation, the why line, the voice, the database and tests.
- MigoMap: one-screen posting, time on every card, map and list with persistent filters, half-screen sheets, icons for visual identity, fewer steps everywhere. Refused: one-tap join, people list, going counts, popularity sort, paywall, persona DMs.
- Airbnb: map-list switching by density. Podcast and music apps: the card.

## 16. Open items

| # | Item | Owner's call needed |
|---|---|---|
| 1 | Women-only as recommended in §9 | Ruled yes, 2026-09-24 |
| 2 | Launch city. The app is available everywhere and works everywhere (iOS resolves any location to a neighbourhood name offline). Seeding, the first digest and the first partners are concentrated in one city until its map is full. | Name it before the build's third milestone |
| 3 | Layer 2 numbers after Layer 1 has data | Later |
| 4 | Text-message provider for phone codes | Choose one; nothing ships without it |

## 17. What comes next, in order

1. Owner decides the feature inventory in `13`.
2. Screen contracts for the loop in §4 to §8, written against this document.
3. Brand and design system: colour, type, icons, components.
4. Data rules: which tables, who may read and write what, tests for denied paths, carried from the previous database where it already says the same thing.
5. iOS build plan with milestones: sign in and see plans; post and ask; accept, chat and confirm; Layer 1 standing; women-only; Layer 2 points.

Nothing is built until steps 1 to 4 exist.
