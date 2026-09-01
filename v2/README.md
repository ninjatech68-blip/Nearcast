# Nearcast v2 — foundation

Staged here temporarily. This is meant to become its own repository; it lives
under `v2/` on this branch only so the work is committed and pushed rather than
lost with the container. Extract with `git subtree split` or a plain copy once
the repo exists.

## What this is

The first slice of a rebuild, derived in this order and no other:

1. **Fifteen product decisions**, recorded and dated.
2. **The permissions matrix** — who may see what, in which state, and who may
   change it. Twelve numbered laws.
3. **The law suite** (`supabase/tests/database/laws.test.sql`) — written before
   the schema existed, and demonstrated failing against an empty database.
4. **The schema** (`supabase/migrations/`) — derived from the matrix.

Every assertion traces to a law; every law traces to a decision. A change to the
schema that no law justifies is a bug.

## The governing rule

Clients hold `SELECT` and `EXECUTE`. Nothing else.

There is no `INSERT`, `UPDATE` or `DELETE` grant to any client role on any
table, and no policy for any command but `SELECT`. Every write is a
`SECURITY DEFINER` function.

The previous build granted table-wide writes and relied on row policies to hold
the line. Four privilege escalations followed, each the same shape: a policy
that knew which row you owned and not which column. Granting no write privilege
removes the category — there is no column to scope and no policy to get wrong,
and a new table is safe by default rather than dangerous by default.

`laws.test.sql` enforces this structurally: it enumerates every table in
`public` and fails if any write privilege exists anywhere. A table added
without thought fails the suite.

### The corollary, for functions

Every helper a client may `EXECUTE` answers only about `auth.uid()`. None takes
an argument naming another person. The previous build granted
`is_blocked(a, b)` to every authenticated user, which let anyone ask whether two
strangers had blocked each other. Helpers that do take a person —
`is_blocked`, `is_restricted`, `is_verified` — are never granted; they are
reached only from inside `SECURITY DEFINER` functions, which run as the owner
and need no caller privilege.

## Running it

No Docker required.

```bash
./scripts/db-local.sh test     # apply the schema, run every suite
./scripts/db-local.sh reset    # schema only
./scripts/db-local.sh stop     # tear down
```

Needs PostgreSQL 16 with PostGIS and pgTAP:

```bash
apt-get install -y postgresql-16 postgresql-16-postgis-3 postgresql-16-pgtap
```

`supabase/tests/bootstrap-local.sql` supplies what hosted Supabase provides —
the `auth` schema, `auth.uid()`, `auth.jwt()`, and the `anon` / `authenticated`
roles. It is never applied to a real project.

## Current state

| | |
|---|---|
| Tables | 23 |
| Policies | 19 — all `SELECT` |
| Write functions | 5 |
| Assertions | 40, all passing |

For scale: the previous build reached 53 policies across 34 migrations, with
write grants on 22 tables.

### Built

Identity, verification, areas, interests, restrictions. Circles and membership.
Vouches, blocks. Casts with slots, reach, deliveries, events. Join requests with
the freeze rule. Reports, append-only moderation audit. Devices and the four
operations tables.

### Not built yet

Threads, messages, media, message receipts, plan receipt settlement, delivery
generation, retention jobs, the outbox workers. `plan_receipts` exists as a
table because `vouch_for()` must enforce L5 today rather than remember it later;
nothing settles a receipt yet, so every vouch is correctly refused.

## Laws

| | |
|---|---|
| L1 | No client write privilege exists |
| L2 | No coordinate describing a person is stored or returned |
| L3 | Circle membership is invisible from outside the circle |
| L4 | A receipt exists only when both people have confirmed |
| L5 | A vouch requires a settled receipt |
| L6 | Reach never widens except by an explicit call |
| L7 | Blocked pairs are mutually invisible, immediately |
| L8 | Every delivery carries a stored, human-readable reason |
| L9 | A restricted account can do nothing, and cannot self-clear |
| L10 | A cast's words freeze when someone asks to join |
| L11 | No image enters storage with metadata or unscanned |
| L12 | Moderation actions are append-only |

L4, L11 arrive with the slices that need them. The rest are asserted now.
