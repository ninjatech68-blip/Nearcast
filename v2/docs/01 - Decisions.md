# Decisions

Every law in `02 - Permissions Matrix.md` traces to a decision here, and every
table and function in `supabase/migrations/` traces to a law. A change to the
schema that no decision justifies is a bug — that is the whole point of writing
these down.

These were settled in conversation on 2026-09-01. Where a decision was made
against a recommendation of mine, that is recorded, because the reasoning
matters more than the outcome if we ever revisit it.

---

## Framing

**F1 — The previous build does not stay live during the rebuild.**
No dual-running, no data migration path, no compatibility burden. This is why
the schema could be redesigned rather than ported.

**F2 — The product model is broadly unchanged, with refinements.**
This is not a new product. It is the same product with the accumulated
assumptions removed.

**F3 — The schema is redesigned, not ported.**
The previous schema reached 53 policies across 34 migrations with table-wide
write grants on 22 tables, and four privilege escalations followed from that
shape. Porting it would port the shape.

---

## Product

**D1 — Discovery has two levels: circles, or nearby.**
There is no global feed and no city-wide broadcast. A cast either goes to
circles you chose, or to people near the area you cast from who share the
interest. Nothing else exists, so nothing else can be added by accident.

**D2 — A cast produces pair threads only.**
No group chat. Every conversation is between two people. This is what makes
blocking tractable and what keeps a cast from becoming a room.

**D3 — Circles are first-class and user-created.**
Not tags, not saved filters. A circle is a thing you make and put people in,
and it is the unit reach is expressed in.

**D4 — No live location. Approved areas only.**
A person claims named areas. The schema stores a centroid per area and nothing
else — no device location, no last-seen point, no trail. A cast is broadcast
*from* one of the caster's own areas, which is what a `nearby` radius is
measured against. This is a structural commitment, not a setting: there is no
column anywhere that could hold a person's position.

**D5 — Slots, with a pair thread each.**
A cast says how many people it can take. Each accepted person gets their own
thread with the caster. Slots are the mechanism that makes a cast finite.

**D6 — A cast expires at the activity's own time.**
Not a fixed TTL, not a scroll-based decay. The thing is over when the thing is
over. (Currently `happens_at + 3 hours`; the grace period is a knob, the
principle is not.)

**D7 — A receipt exists only when both people confirm.**
One-sided attendance is not evidence. If one person confirms and the other does
not, nothing is recorded — not a partial receipt, not a pending one. This is
what stops receipts from being farmable.

**D8 — Verification is phone OTP. No invites.**
Signup is open. I recommended invite-gating and was wrong: the trust graph
seeds from usage — you appear nearby, you meet, a receipt settles, a circle
forms — rather than from who let you in. Invites would have made the graph
a copy of an existing social graph, which is the thing this product is
supposed to route around.

**D9 — Reach targets specific circles.**
When casting to circles, you pick which ones. Not "all my circles", not a
default. The reach is an explicit act every time.

**D10 — Vouches are explicit, and separate from circles.**
Being in someone's circle is not a vouch. A vouch is its own deliberate
statement, and it requires a settled receipt (D7) — you can only vouch for
someone you actually met. I recommended dropping vouches entirely and was
wrong: with open signup (D8), a vouch is the only mechanism that says a
stranger is all right.

**D11 — Moderation is founder-only: restrict, and remove.**
No community moderation, no reputation scores, no auto-actions. Two verbs.
Restriction lives on its own table so there is nothing on a person's own row
for them to clear.

**D12 — Chat carries photos and location, as the previous build did.**
Not video, not files, not voice. Location in a message is a place you are
sharing deliberately, which is categorically different from D4's prohibition
on tracking.

**D13 — Blocking is symmetric, and the thread closes explicitly.**
Blocking is not a mute. Both people disappear from each other immediately, and
any open thread is closed rather than silently abandoned — the other person
sees that it ended, not a conversation that stopped replying.

**D14 — A cast is editable until someone acts, then frozen.**
Once a person has asked to join, the words they responded to cannot change.
Freezing is not a courtesy; it is what makes a join request mean something.

**D15 — Retention is short by default; receipts persist.**
Messages, media and delivery rows age out. Receipts are the durable layer,
because they are what vouching and trust rest on. Nothing else needs to be kept
to make the product work, so nothing else is.

---

## What is deliberately absent

Recorded because the absence is a decision, and because an absent feature is
otherwise indistinguishable from an unbuilt one:

dating mechanics · anonymous participation · public maps of people · stories or
reels · follower and popularity counts · voice or video calls · payments or
marketplace · advertising · business broadcasting · algorithmic recommendation ·
background location tracking · public group chat · multi-city discovery
