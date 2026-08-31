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

Three revenue lines, one per payer: businesses pay for showed-up customers, regular users pay for capacity and identity, hosts pay for infrastructure. Sequenced by the density each needs.

### What Nearcast never sells (the moat is trust)

- No third-party ad networks, and no targeting on intent content, ever. What people cast is never an advertising signal.
- No paid reach for people, no boosts, no placement. Human reach expands only by informed user action (product law); selling it fabricates relevance.
- No unlabeled promotion. Anything commercial is visibly a DEAL in its own color, mutable per business, and capped.
- No paywalled safety, privacy, or trust features. Receipts, vouches, blocking, and reveal controls are free forever.
- No engagement rent: nothing that charges to avoid a bad outcome (streak repair, panic expiry extensions).

### Line 1 — Deal casts: local perishable inventory (businesses pay)

Local businesses hold inventory that dies on the clock: the empty 3–5pm court, the end-of-day bakery shelf, the dead-Tuesday salon chair. Expiring inventory is native to a product whose core mechanic is "gone at 6pm". So businesses don't buy attention; they cast deals, and the trust system applies to them at full strength.

**Mechanics:**
- A fourth verb, **DEAL**, with its own color — never dressed as a human cast. From verified local businesses only, geo-bound to the areas a user already approved.
- Hard frequency cap (at most 1 deal per 10 casts in the feed) plus a per-business mute that is permanent and one tap. The "why you" line stays honest: `why you: 400m from your area · deals: on`.
- Businesses get receipts too, public: redemptions, honored rate, flake rate. A business that posts bait builds a visible record of it.
- Claiming a deal is a join; redeeming it is the both-sides confirm. Same plan-room flow, same receipt event.

**Pricing — pay per person who shows up, never per impression:**
- ₹X per confirmed redemption (category-priced; a ₹40 coffee redemption prices differently than a ₹600 court slot). Zero showed-up = zero owed, which makes the sales pitch one sentence: *you pay only when a customer is standing in your shop.*
- Plus a flat verification fee (one-time) and an optional storefront subscription (₹499–999/mo) for standing deals, scheduling, and redemption analytics.
- This is Nearcast charging for its own core metric — plans made real — so the incentive to inflate impressions never exists structurally.

**Why businesses retain:** performance pricing means the bill is proof of value; churn only happens when deals stop working, which is the honest outcome. **Why users tolerate it:** deals are opt-outable per business and globally, capped, labeled, and genuinely local-cheap — the badminton group actually wants the off-peak court rate.

**The line this walks:** deal casts are commerce in the feed, full stop. What keeps them on the right side: the cap, the label, the mute, geo-binding to user-approved areas, targeting on location only (never on cast content or history), and business receipts making bad actors self-evident. If any of those six erodes, this line is ads and the product is dead. They go in the community policy as invariants, not settings.

### Line 2 — Nearcast Plus: capacity and identity (regular users pay)

Free covers the whole trust loop: cast, join, coordinate, confirm, block. Plus sells more room and more self, never more reach into other people's feeds:

1. **Plan ahead.** Free casts live same-day; Plus casts up to 7 days out ("badminton saturday" cast on tuesday). The single most-requested capacity in any plans product.
2. **More live casts.** Free: 2 at a time. Plus: 6. Pure capacity, no ranking effect.
3. **More areas + travel mode.** Free: 2 approved areas. Plus: 5, plus a temporary "listening in {city}" while traveling. This widens what *you hear*, not who hears you — consumption-side, so it breaks no reach law.
4. **Poster styles.** A small set of cast poster treatments (textures, type scale variants within the system) and recap themes. Identity spend is the most durable Gen Z purchase (the Nitro pattern); it distorts nothing because color still encodes the verb.
5. **Skip history.** See and un-skip the last 30 casts you passed on.

Pricing: ₹99/month or ₹699/year India; $2.99/$19.99 elsewhere. **Retention:** plan-ahead and travel mode embed into the weekly habit (cancel and next week's plans get harder); poster styles retain the way identity always does — quietly.

### Line 3 — Nearcast Standing: host infrastructure (organizers pay)

Unchanged from the original proposal, now positioned as the top tier (includes Plus): standing casts that recast weekly with held spots, headcount + waitlist, split collection at accept (UPI; a convenience fee on collection is the fourth revenue line), host record, co-hosts. ₹249/month including Plus. Retention argument stands: cancelling breaks infrastructure that six regulars depend on — utility owed to real people, never guilt.

### Sequencing — by the density each line needs

1. **Plus first** (any density): capacity limits and cosmetics work with 100 users; lowest ops, validates willingness to pay.
2. **Standing second** (host maturity): gate on hosts running ≥2 plans/week organically; instrument repeat-host share, money-fronted share, and headcount-chaos deaths to rank its features.
3. **Deals last** (neighborhood density): a deal cast needs enough users inside one area to redeem — gate on an area crossing ~500 weekly-active users before selling the first business. Selling deals into an empty neighborhood burns the merchant and the pitch.

Nothing monetizes until the free loop shows the one number that matters: **weekly plans-made-real per active user.**

## Change Log

| Date | Change |
|---|---|
| 2026-08-27 | Initial pending-screens and monetization proposal |
