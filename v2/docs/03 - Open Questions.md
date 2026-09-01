# Open Questions

Three decisions are unmade. Each has a default recorded below, which is what the
schema does today. **A default is not a decision** — it is what I chose so the
build could continue, and it is marked so that a future session does not mistake
it for something you settled.

None of the three blocks work.

If one of these is answered, move it into `01 - Decisions.md` with a number and
delete it here.

---

## Q1 — How much does a delivery reason say?

**Status:** unanswered. Default in place.

Today, a reason is one of two fixed strings:

- `you are in a circle of theirs`
- `near you, and you are into <category>`

The circle reason deliberately does not name the circle, because naming it would
leak the circle's existence and shape to someone who can already see they were
included (L3). But "a circle of theirs" is vaguer than a person might want, and
the vagueness may read as evasive rather than protective.

The tension is real: a more specific reason is a better product and a worse
privacy guarantee. I defaulted to the guarantee.

**What would settle it:** whether a recipient seeing "you are in their badminton
circle" is acceptable when the caster chose that circle deliberately.

---

## Q2 — Does the caster see a decline, or a hide?

**Status:** unanswered. Default in place.

Today, `hide_cast` records `hidden_at` and an optional `not_relevant` flag, and
nothing surfaces either to the caster.

Showing declines makes reach legible to the caster and is honest about what
happened. It also turns a feed into a scoreboard, and creates pressure to
respond that the product does not otherwise apply. Build 15's own principle —
no popularity counters — argues for the current default.

**What would settle it:** whether a caster needs to distinguish "nobody saw it"
from "people saw it and passed", and whether that need survives knowing it makes
passing visible.

---

## Q3 — What happens to a thread when its cast dies?

**Answered 2026-09-01. Now D16.** The question was wrong: it assumed the cast
had to govern the thread because the cast created it. Thread lifetime is
independent of cast lifetime, and a chat window is short by default and widens
only by mutual agreement. The number is kept rather than reused so that earlier
references still resolve.

---

## Q4 — Is there a limit on open join requests?

**Status:** unanswered. Default: no limit.

Nothing today stops a person asking to join every cast delivered to them. That
is cheap to do and expensive to receive, and it is the obvious first abuse of an
open-signup product (D8).

A limit is easy to add and hard to choose. Too low and it punishes people who
are simply active; too high and it does not bind. It also interacts with
restriction (D11) — a rate limit and a moderator action are different tools for
overlapping problems, and it is not obvious which should carry this.

**What would settle it:** whether we expect this abuse before launch or intend
to watch for it. Watching is defensible; the schema records enough to detect it.
