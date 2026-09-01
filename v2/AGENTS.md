# Nearcast

A trust-aware intent network. It lets an intent move beyond a closed group
without exposing the group, fabricating activity, or silently expanding reach.

## Where the truth is

This repository is the only source of truth. Read in this order:

1. `docs/01 - Decisions.md` — fifteen product decisions, plus three framing ones.
2. `docs/02 - Permissions Matrix.md` — who may see and change what. Twelve laws.
3. `docs/03 - Open Questions.md` — four decisions that are **not** made. The
   defaults recorded there are mine, not the product's. Do not treat one as
   settled, and do not build past Q3 without an answer.
4. `supabase/tests/database/laws.test.sql` — the laws as assertions.
5. `supabase/migrations/` — the schema the laws specify.

**There is a predecessor repository (`ninjatech68-blip/Nearcast`).** It is
read-only reference and describes a *different product* — intents, anonymous
viewers, public share links, respondents, matches. Its `docs/` tree is stamped
mandatory and is wrong for this codebase. Read it for design work that was
measured and worked; never for product rules, schema, or permissions.

## The derivation order, which is not optional

Decision → law → assertion → schema. In that order, and the assertion is written
before the thing it tests.

A table, column, policy or function that no law justifies is a bug, even if it
works. If you need something the laws do not cover, the laws change first — and
a law changing means a decision changed, which is not yours to make alone.

## The governing rule

**Clients hold `SELECT` and `EXECUTE`. Nothing else.**

No `INSERT`, `UPDATE` or `DELETE` grant to any client role on any table. No
policy for any command but `SELECT`. Every write is a `SECURITY DEFINER`
function with `set search_path = ''`.

Every helper a client may `EXECUTE` answers only about `auth.uid()`. If you find
yourself writing a granted function that takes an argument naming another
person, stop: that is an oracle, and it is the specific mistake that put a
readable `is_blocked(a, b)` in the predecessor.

`laws.test.sql` enforces both structurally. A new table added without thought
fails the suite.

## Non-negotiable product rules

- Never fabricate users, confirmations, responses, availability, or activity
  counts.
- Never widen reach without an explicit user action.
- Never expose circle identity or membership from outside the circle.
- Never store a coordinate that describes a person. Areas have centroids;
  people do not have positions.
- Every delivery carries a stored, human-readable reason, written when the
  delivery is made — not computed when a screen renders.
- Push and analytics payloads carry no cast text, message content, coordinates,
  contact details, or circle names.

## Engineering rules

- TypeScript strict. Feature-local modules. Domain rules pure — independent of
  React Native and of Supabase.
- Validate external input with Zod, and enforce the same invariant again in
  PostgreSQL. The database is the last line, not the first.
- Write the failing assertion before the behaviour. If a test passes the first
  time you run it, find out why before believing it.
- Mutation-check anything load-bearing: break the rule on purpose and confirm
  the suite catches it. A test that cannot fail is worse than no test, because
  it is counted.
- Never commit `.env`, service-role keys, tokens, or production data.

## Running the database

No Docker required.

```bash
./scripts/db-local.sh test     # apply the schema, run every suite
./scripts/db-local.sh reset    # schema only
./scripts/db-local.sh stop     # tear down
```

Needs PostgreSQL 16 with PostGIS and pgTAP.

This covers schema, RLS, grants, functions and types. It does **not** run
GoTrue, PostgREST, Realtime or Storage — so a passing suite is a claim about the
database, not about the API. Function signatures in particular must be checked
against a real project: PostgREST sends JSON numbers, and a `smallint` parameter
that passes locally is uncallable in production.

## Definition of done

Acceptance criteria pass; the negative permission path is tested, not just the
positive one; the laws still pass; documentation still matches; and the
verification output is recorded. A UI state is incomplete without loading,
empty, error, offline, disabled and restricted handling where applicable.
