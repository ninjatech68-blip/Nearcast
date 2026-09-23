# 11 - Fewer Steps, Same Trust

**Written 2026-09-23.** Response to user testing: people who used both apps said MigoMap "gets the job done" with fewer steps. This document takes that verdict seriously and sets step targets for Truegoing's three core jobs without giving up the four things that make it Truegoing: verified people only, host consent, exact place hidden until then, and nobody browsable.

Evidence tags as in `10`. Truegoing counts come from the fixture build captured in [`tg-real-captures-2026-09-23/`](./tg-real-captures-2026-09-23/); MigoMap counts from SS25, SS34–SS37.

---

## 0. Read the test correctly

- [Certain] Nobody can sign in to Truegoing on a real backend (D36, BE-01). Testers used a fixture or seeded build. Their verdict on **flows** stands. Their verdict on **feed relevance** was a verdict on ten seeded accounts, not on delivery.
- [Certain] MigoMap is fewer steps for two different reasons. **Flow design**: one screen to post, time on every card, no explanatory prose. **Mechanism**: no approval, no hidden place, group chat. The first transfers. The second is what your decision record refuses, and it is also why MigoMap needs a paywall, a people list and gender filters to feel useful.
- Target: match MigoMap's step count on posting, come within one tap on joining, and stay ahead on onboarding, while every trust rule keeps holding in PostgreSQL.

## 1. Step counts, today and target

| Job | MigoMap | Truegoing today | Truegoing target |
|---|---|---|---|
| Post a plan | ~5 taps + a sentence, 1 screen | ~12 taps + a sentence: category, text, Next, Where, search, pick, Use this area, When, date, time, Done, Send (captures `28`–`33`) | **4 taps + a sentence, 1 screen** |
| Join a plan | 1 tap, in chat at once | 2 taps + a typed note, then wait (captures `17`–`20`) | **2 taps, no typing in the common case**; 1 tap when the host opened the plan |
| Host accepts | none | Activity → See request → Accept | **1 tap from the push or the Activity row** |
| Onboard | 11+ screens | 4 screens + OTP | **3 screens + OTP** |
| Understand a card | 1 glance | 1 glance + 1 tap for the time | **1 glance** |

---

## 2. Posting: one screen, four taps

[Certain] Today compose is two steps plus two pickers, and step 2 opens with three paragraphs about reach before the two fields (`compose.tsx`, capture `30-compose-2`). MigoMap's is one screen: emoji, sentence, pin, time (SS34–SS37).

**Target screen, top to bottom:**

1. Text field, focused on open, 140 chars. Category chips under it, sentence case, one row that scrolls. [Likely] Pre-highlight a suggested chip from the text (badminton → Sports + outdoors) and let the person correct it. This is classification, not fabrication; the person confirms it.
2. **Where**: prefilled with the home area, one tap to change. Most plans are near home; the picker is the exception, not the path.
3. **When**: four quick picks, `Tonight 7pm · Tomorrow evening · This weekend · Pick a time`, the last opening the native picker. Fixed English labels (`08 §3`).
4. `Send the plan`, enabled the moment text and time exist.

Reach disclosure: the full paragraph shows on a person's **first** plan only, then collapses to one line above the button: `Reaches 20 km. Exact place stays hidden until you accept someone.` D28 is untouched; the fact is still on screen every time, just not three times.

Refuse: sentence stems ("WANT TO …"), which produced "Saransh wants to Looking for…" (SS25). Refuse emoji as category.

Decisions touched: none. Everything here is client-side. Failing tests first on the quick-pick formatter and the chip suggestion.

## 3. Joining: two taps, no typing, host decides

[Certain] `Send request` is dead until a note exists (Principle 28, `join/[id].tsx:149`). The database does not require the note: `request_to_join(in_cast uuid, in_note text default null)` stores `nullif(btrim(in_note), '')`. The requirement is client-only.

**Target sheet:**

- `Ask to go` opens the sheet as today. Under the field, three tap-to-send starters: `I can make it` · `First time, is a beginner fine?` · `Can I bring one more?` One tap on a starter sends. Free text stays for people who want it.
- One paragraph, not three: `Aarav sees your first name and this note, nothing else, until they accept. No answer means no.`
- I disagree with removing the note entirely. Here's what I'd do instead: starters, so the common case is two taps and the host still receives a sentence to decide on. The risk in a blank ask is what MigoMap shows on SS25: people land in plans with nothing said, and hosts cannot tell who to accept.

Decision touched: Principle 28 wording (note must exist) becomes "a note, typed or chosen, must exist". Record it before shipping. No schema change.

## 4. The bridge: host-opened plans (Decide)

This is the one mechanism change that gets Truegoing to MigoMap's one-tap join without losing the quality.

- At compose, an off-by-default toggle: **`Anyone verified can join`**. Turning it on is the host's informed action. The line under it: `People you'd otherwise approve one by one join at once and see the place.`
- For a reader, an opened plan shows `I'm going` instead of `Ask to go`. One tap: the join is accepted server-side in the same transaction, the exact place unlocks (D17 still holds: reveal on acceptance, acceptance is just immediate), and the pair thread opens (D2 holds).
- Everything else stays: verified-only delivery, radius, interest match, slots (D5), pair threads, block and report, no headcount shown to strangers (D29).

What it needs: a decision entry (D52 draft), a law assertion that an open plan still never reveals the place to a non-accepted person, a column `casts.open_join boolean not null default false`, `request_to_join` branching to accept when the cast is open and the actor passes `private.assert_actor()`, pgTAP for allowed and denied paths, and the toggle plus the `I'm going` button. Idempotent, as all writes are.

Why this is better than MigoMap's one tap: the host chose it, per plan, and only verified people can take it. MigoMap gives one tap to everyone on every plan and then sells filters to cope with the result.

## 5. Host acceptance: one tap

[Certain] Today a request is a row in Activity with a `REVIEW` stamp that opens the request before `Accept` appears (capture `23b`). Put `Accept` and `Decline` on the row itself, and in the push's action buttons where the platform allows. The note is already on the row; nothing else is needed to decide.

## 6. Feed: the card answers everything

Covered in `10` rows 8, 10, 15. Restated as the step it removes: today a reader taps every poster to learn when it happens. Start time on the poster removes one tap from every decision, on every plan, for every person. It is the highest-leverage change in this document and it is a formatter.

## 7. Onboarding: three screens

[Certain] Today: name, age, home area, interests (captures `03`–`09`). Merge name and date of birth on one screen; both are one field. Keep home area and interests as their own screens because each carries a disclosure line that must be read. Three screens plus OTP. Nothing to decide.

---

## 8. What stays refused, and why the testers will not miss it

| MigoMap mechanism | Why it feels fast | What replaces it |
|---|---|---|
| One-tap join on every plan | No consent step | Host-opened plans (§4) give the same tap where the host wants it |
| Group chat per activity | Everyone in one room | Pair threads with the plan pinned at the top: time, place once unlocked, `Did it happen?` |
| Exact pin before joining | No unlock step | Approximate distance on the card; exact place on acceptance, immediate on open plans |
| People nearby list | Browse instead of wait | Plans are the unit; delivery does the browsing. Nothing to add. |
| "N going" avatar stacks | Social proof at a glance | Host's reliability facts on the card, which are real |

---

## 9. Order

1. Poster start time (§6). Formatter, tests, one afternoon.
2. Compose on one screen with quick picks and prefilled area (§2). Client only.
3. Join starters and one-paragraph sheet (§3). Client only, plus the Principle 28 wording change.
4. Accept on the Activity row and in the push (§5). Client only.
5. Onboarding merge (§7). Client only.
6. **Decide** host-opened plans (§4), then decision → law → assertion → schema → UI.

Steps 1–5 do not touch a decision or the database. They can ship before the SMS provider is chosen and be waiting when sign-in works.
