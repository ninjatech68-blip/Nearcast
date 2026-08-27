# Pending Screens And Monetization Plan

Status: proposal. Grounded in the v2 frontend on `claude/mobile-app-design-impl-wbbo2z` (feed, compose, detail sheet, join sheet, activity, you, recap — all on fixtures) and the product laws in `AGENTS.md`.

## Part 1 — Pending pages

Ordered by what breaks the product loop if missing, not by effort. Every page reuses the seven v2 primitives (poster, bar, sheet, row, tag, field, bars); a page needing an eighth is mis-designed.

### P0 — the loop does not close without these

**1. Plan room** — `/plan/[id]`
The payoff surface. Opens after mutual acceptance. Shows: who is in (first names + receipts bars), the reveal block (exact place + contact, visible only here, per the privacy law), time confirmation, and the one action that powers Signal: "it happened" — both sides confirm, which writes a receipt. States: matched (reveal ready), waiting (you confirmed, they haven't), confirmed (receipt written, stamp), ended. This page is where receipts come from; nothing else in the product may fabricate one.

**2. Cast manage view** — broadcaster's own cast, extends `/cast/[id]` when `by == me`
Responses list with accept / pass per person (each row: first name, note, receipts bars — trust facts at the accept moment, symmetric with the join moment). Also: end cast early. No edit — casts are immutable; end and recast. States: no responses yet, responses pending, spots filled (auto-ends new requests), ended.

**3. Onboarding + invite redemption** — `/welcome`, `/invite/[code]`
The trust graph starts here; without invites there is no origin circle. Flow: sign in (Apple + phone) → claim first name → invite code or link ("Kavya vouches for you" — the vouch is the onboarding moment) → pick approximate area → contextual notifications ask (at first cast, not at launch). New users start mid-signal per the Signal guardrails. State: no invite → waitlist explanation, honest, no fake scarcity.

**4. Circles** — `/circles`, `/circles/[id]`, create + invite sheet
List your circles (name, member count), circle detail (members of your own circles are visible to you; membership is never visible outside — product law), create circle, invite link share sheet, vouch management. This is also where "3 circles vouch for you" resolves when tapped.

### P1 — trust and self-serve completeness

**5. Receipts log** — `/receipts` (from the receipts row on You)
The permanent log: one row per plan made real (what, when, with how many). Facts only, reverse-chronological, no charts.

**6. Report / block sheet** — overflow action on cast detail and plan room
Required by the community policy doc before any real users. Two-step sheet: reason rows → confirmation. Block takes effect silently (blocked person sees nothing change — no retaliation surface).

**7. Settings editors** — areas (add/remove approved neighborhoods), quiet hours (time pickers), blocked list. Sub-sheets from You rows that currently dead-end.

### P2 — polish, post-alpha

**8. Recap archive** — `/recap/[month]` for past months, from the recap poster.
**9. Notifications inbox refinements** — activity is the inbox; deep-link handling from push (payloads carry ids only, never intent text — product law).

Explicitly not building: public profiles, follower anything, a browse/search surface (discovery is the feed, full stop), and any DM system outside a matched plan room.

## Part 2 — Business model

### What Nearcast never sells (the moat is trust)

- No ads. Intent data is the most monetizable and most betraying data there is; the first ad ends the product.
- No paid reach, boosts, or placement. Reach expands only by informed user action (product law); selling it fabricates relevance.
- No paywalled safety, privacy, or trust features. Receipts, vouches, blocking, and reveal controls are free forever.
- No engagement rent: nothing that charges to avoid a bad outcome (streak repair, expiry extensions bought under pressure).

These four are marketing as much as ethics: "we can't be paid to show you to strangers" is a sentence competitors cannot say.

### The recommendation: charge the host, keep joining free forever

In every plans product, one person does the work: books the court, fronts the money, chases confirmations. That person gets 10x the value and already pays real money (court fees, tickets) through the app's flow. Joiners are the network; they stay free.

**Nearcast Standing** (working name) — for people who run things:

1. **Standing casts.** "Badminton, every tuesday, 7pm" recasts itself to the same reach; regulars can hold a spot. This is the anchor feature: it turns a cast into an institution.
2. **Spots + waitlist.** Set headcount; the cast auto-fills, waitlist promotes on a drop-out, everyone gets honest state ("you're 2nd in line").
3. **Collect the split.** "₹80 each" collected at accept (UPI first). Nearcast fronts nothing; it moves the awkward money conversation into the flow. Later, a small convenience fee on collection is the second revenue line.
4. **Host record.** The host's receipts get depth: plans run, fill rate, regulars. Private by default like all of Signal; shareable as a recap-style poster if the host wants.
5. **Co-hosts.** A standing cast can name a second host who can accept and confirm.

Pricing hypothesis: ₹199/month or ₹1,499/year in India; $4.99/$39 elsewhere. One tier, no feature ladder. First standing cast free for a month so the habit forms before the paywall.

### Why this retains (the honest version)

Subscription churn dies when cancellation breaks a commitment to other people. A host who cancels doesn't lose an app feature; their Tuesday game loses its infrastructure — the recurring cast, the held spots, the waitlist, the split collection — and six regulars notice. The value also re-proves itself on a weekly physical cadence, which is the opposite of the "forgot I subscribed" failure mode. This is positive lock-in: the cost of leaving is real utility owed to real people, never guilt mechanics, which stay banned.

### Sequencing and validation

Do not build any of this until the free loop shows one number: **weekly plans-made-real per active user**. Monetization work starts when the alpha shows hosts running ≥2 plans/week organically. Then instrument three questions: what share of plans have a repeat host (ceiling for Standing), what share involve money fronted by one person (ceiling for Collect), and how many casts die from headcount chaos (Spots demand). Each Standing feature maps to one of those measurements; build in the order the numbers rank them.

## Change Log

| Date | Change |
|---|---|
| 2026-08-27 | Initial pending-screens and monetization proposal |
