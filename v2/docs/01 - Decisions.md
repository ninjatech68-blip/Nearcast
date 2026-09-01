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

**D4 — No live location. Approved areas, and named venues.**
A person claims named areas. The schema stores a centroid per area and nothing
else — no device location, no last-seen point, no trail.

An area means only *where I want to hear about things*. It is **not** a
broadcast origin: a cast carries its own venue and measures its radius from
there (D17). This changed after the fact — the original wording had a cast
broadcast from one of the caster's own areas, which was wrong about the product.

A structural commitment, not a setting: there is no column anywhere that could
hold a person's position, and the law suite enumerates every coordinate column
in the schema and fails on a fourth.

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

**D16 — A chat window is short by default, and widens only by mutual agreement.**

A thread opens when someone is accepted into a slot, and expires **24 hours
after the activity** — `happens_at + 24h`, floored at `now() + 24h` so a cast
happening imminently still gets a full day. Not 24 hours from when the thread
opens: a cast five days out would otherwise lose its thread four days before the
thing it exists to arrange.

Either party may propose extending to **7 days** or **1 month**. The other must
affirmatively accept. Silence is refusal, and a refusal is never reported as
one — the thread says only that the window is unchanged, so declining costs
nothing socially. One open proposal at a time, and a declined proposal cannot be
re-made within the current window; without that, a consent mechanism becomes a
nagging mechanism.

Narrowing or ending the window is unilateral. Only widening needs both.

**There is no permanent option.** A month is renewable indefinitely, so nothing
is ever lost — but no thread persists without someone deciding, again, that it
should. Permanent chat would promote messages to a durable layer that D15 says
they are not, and it is a one-way door: data kept forever is data that can be
breached, compelled, and must be moderated. Two people who become real friends
will move to a messenger, which is the right outcome. Nearcast is where a
connection starts, not where it lives.

The thread shows the time remaining.

**A thread with no expiry cannot exist.** This is stated as an invariant because
the predecessor got it wrong in a way that reading the code did not reveal:
`conversations.mode` defaulted to `'day'`, so the app displayed a 24-hour
countdown, while `expires_at` was nullable with no default and no insert ever
set it — and the guard treated null as open, while the sweeper skipped nulls.
Every chat in Build 15 showed a countdown and lived forever. The default failed
*open*, which is the wrong direction, and is exactly the class of mistake the
governing rule exists to make impossible.

This replaces an earlier proposal of mine that gated thread survival on a
settled receipt. That conflated two different questions — *did you meet* and *do
you want to keep talking* — and made a missed confirmation silently destroy a
conversation both people wanted. They are separate questions with separate
mechanisms: the receipt's only job is vouching (D7, D10), and thread lifetime is
independent of cast lifetime.

**D17 — A cast's venue is revealed on acceptance, never before.**

Creating a cast takes a category, a description, a **venue**, a date and time,
and a **radius measured from that venue**. Someone inside the radius sees the
cast in their feed with an approximate distance — "approx 3 km away" — and
nothing more. On acceptance they get the detail page with the exact point and
the place name from the map, and the chat opens.

**The venue is stored at two precisions, and this is not an implementation
detail.** A distance from a known point to an unknown one puts the venue on a
circle; three distances fix it exactly. Measurements are free, because approved
areas are self-declared and unlimited — one account plants three areas across
the city and reads three distances straight off its own feed. Without a
defence, a stranger who was never accepted recovers the café and the time.

So the cast row carries the venue snapped to a ~1 km grid, and that coarse
point is what matching and the displayed distance both use. The exact point,
and the place name, live in a separate gated table. Trilaterating the feed
recovers a cell.

The place name is gated exactly as the point is. "Third Wave Coffee, 100ft
Road" *is* the venue; a text column is not a lesser disclosure than two floats.

What this cannot fix, and does not pretend to: receiving a cast at all tells
you that you are within its radius. That is inherent to location-based
delivery. The question was only ever precision.

Two consequences, both accepted deliberately:

- **The radius floor rises from 500 m to 2 km.** A 500 m radius against a 1 km
  cell is noise. Tighter casts stop being possible.
- **A cast is no longer tied to an area the caster has claimed.** That coupling
  quietly stopped one account blanketing a city; restriction and reporting
  carry it now, as they do in every events product.

**D18 — Chat is free-form.**
Once the thread opens, the two people exchange whatever they like, as they
would in any messenger. The product does not police the content of a
conversation between two people who have agreed to meet. This makes the chat
the most sensitive store in the system, which is why D16's window and the
delete-on-close rule matter more, not less.

---

## What is deliberately absent

Recorded because the absence is a decision, and because an absent feature is
otherwise indistinguishable from an unbuilt one:

dating mechanics · anonymous participation · public maps of people · stories or
reels · follower and popularity counts · voice or video calls · payments or
marketplace · advertising · business broadcasting · algorithmic recommendation ·
background location tracking · public group chat · multi-city discovery
