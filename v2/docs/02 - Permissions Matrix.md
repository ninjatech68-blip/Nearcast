# Permissions Matrix

Who may see what, and who may change it. This is the authorization baseline;
where it and the schema disagree, one of them is a bug and this document is
usually not the one.

Every row below was read out of `supabase/migrations/`, not recalled. The law
suite (`supabase/tests/database/laws.test.sql`) asserts the laws directly, so
this document is checkable rather than aspirational.

---

## The governing rule

**Clients hold `SELECT` and `EXECUTE`. Nothing else.**

There is no `INSERT`, `UPDATE` or `DELETE` grant to any client role on any
table, and no policy for any command but `SELECT`. Every write is a
`SECURITY DEFINER` function.

The previous build granted table-wide writes and relied on row policies to hold
the line. Four privilege escalations followed, each the same shape: a policy
that knew which *row* you owned and not which *column*. Granting no write
privilege removes the category — there is no column to scope, no policy to get
wrong, and a table added without thought is inert rather than dangerous.

### The corollary, for functions

**Every helper a client may `EXECUTE` answers only about `auth.uid()`.**

None takes an argument naming another person. The previous build granted
`is_blocked(a, b)` to every authenticated user, which let anyone ask whether two
strangers had blocked each other — an oracle, reachable by anyone, over the
safety graph. Helpers that do take a person (`is_blocked`, `is_restricted`,
`is_verified`) are never granted; they are reached only from inside
`SECURITY DEFINER` functions, which run as the owner and need no caller
privilege.

Seven helpers are granted, and all seven are caller-scoped:
`in_circle(circle)` · `related_to(other)` · `can_read_cast(cast)` ·
`is_moderator()` · `in_thread(thread)` · `thread_open(thread)` ·
`may_see_place(cast)`.

`coarse_point()` is deliberately **not** granted. A client that could ask the
server to coarsen arbitrary points could binary-search the grid boundaries — a
smaller leak than the venue, but a free one.

---

## The fourteen laws

| | Law | Traces to | Asserted |
|---|---|---|---|
| **L1** | No client write privilege exists, on any table | F3 | yes — structurally, over every table in `public` |
| **L2** | No coordinate exists outside the three permitted places, each gated | D4, D17 | yes — structurally, over every geography column |
| **L3** | Circle membership is invisible from outside the circle | D3 | yes |
| **L4** | A receipt exists only when both people have confirmed | D7 | yes |
| **L5** | A vouch requires a settled receipt | D10 | yes |
| **L6** | Reach never widens except by an explicit call | D1, D9 | yes |
| **L7** | Blocked pairs are mutually invisible, immediately | D13 | yes |
| **L8** | Every delivery carries a stored, human-readable reason | D1 | yes |
| **L9** | A restricted account can do nothing, and cannot self-clear | D11 | yes |
| **L10** | A cast's words freeze when someone asks to join | D14 | yes |
| **L11** | No image enters storage with metadata or unscanned | D12 | *pending* — arrives with the media slice |
| **L12** | Moderation actions are append-only | D11 | yes |
| **L13** | A chat window widens only by mutual agreement, and never past one month | D16 | yes |
| **L14** | A cast's exact place and place name are visible only to its caster and to accepted participants | D17 | yes |

L1 is table-driven on purpose: it enumerates every table in `public` and fails
if any write privilege exists anywhere. A table added without thought therefore
fails the suite rather than quietly shipping a write surface.

L13 has four parts, and each is asserted separately because each has its own way
of going wrong: widening needs both parties; a proposer cannot accept their own
proposal; no window may exceed one month; and **a thread with no expiry cannot
exist**. That last one is not defensive pedantry — the predecessor made
`expires_at` nullable and treated null as open, so every chat displayed a
24-hour countdown and never expired. The invariant belongs in the column, not in
the code that reads it.

---

## Read access, by table

Everything below is `SELECT` only. There is no other kind of policy.

| Table | Who can read it | Predicate |
|---|---|---|
| `people` | anyone related to you | `related_to(id)` |
| `person_verification` | you | `person_id = auth.uid()` |
| `person_areas` | you | `person_id = auth.uid()` |
| `person_interests` | you | `person_id = auth.uid()` |
| `account_restrictions` | moderator only | `is_moderator()` — **not** the restricted person (L9) |
| `circles` | people inside it | `in_circle(id)` (L3) |
| `circle_members` | people inside it | `in_circle(circle_id)` (L3) |
| `vouches` | the voucher | `voucher_id = auth.uid()` |
| `blocks` | the blocker | `blocker_id = auth.uid()` — the blocked person is never told |
| `casts` | caster, and people delivered to | `can_read_cast(id)` |
| `cast_reach` | the caster | recipients never learn how they were targeted |
| `cast_reach_circles` | the caster | recipients never learn which circle (L3) |
| `cast_deliveries` | the recipient | `person_id = auth.uid()` |
| `cast_events` | the caster | |
| `join_requests` | both parties | |
| `plan_receipts` | both parties | `auth.uid() in (person_a, person_b)` |
| `reports` | the reporter, and moderators | |
| `moderation_actions` | moderators | append-only (L12) |
| `devices` | you | push tokens are never readable by another person |
| `cast_places` | caster, and accepted participants only | `may_see_place(cast_id)` (L14) — **not** people it was merely delivered to, and **not** pending requesters |
| `threads` | the two parties | `auth.uid() in (caster_id, joiner_id)` |
| `thread_window_proposals` | the two parties | |
| `messages` | the two parties | |
| `thread_reads` | the two parties | |

Two absences are deliberate and load-bearing:

- **`account_restrictions` is invisible to the person it describes.** Combined
  with there being no write path, a restricted account has nothing to read and
  nothing to clear (L9).
- **`cast_reach` and `cast_reach_circles` are caster-only.** A recipient sees
  *that* a cast reached them and the reason it did, never the targeting that
  selected them. This is what keeps a delivery reason from leaking a circle's
  existence (L3, L8).

---

## Write access, complete

Fifteen functions. This is the entire mutation surface available to a client.

| Function | What it does | Refuses when |
|---|---|---|
| `publish_cast(...)` | creates a cast, its venue, its reach, and its deliveries | unverified or restricted; bad or missing venue; radius outside 2–20 km; circle is not yours; no circle selected; slots out of range; time in the past |
| `edit_cast(cast, statement)` | changes the words | someone has asked to join (L10); not yours |
| `request_to_join(cast, note)` | asks for a slot | not delivered to you; cast not live; already asked |
| `vouch_for(person)` | records a vouch | no settled receipt exists (L5) |
| `block_person(person)` | blocks, symmetrically | — |
| `hide_cast(cast, not_relevant)` | removes a delivery from your feed | not delivered to you |
| `accept_join_request(request)` | accepts, and opens the pair thread | not the caster; already decided; cast full; blocked |
| `decline_join_request(request)` | declines | not the caster; already decided |
| `propose_window(thread, tier)` | asks to widen | not a party; thread closed; not a widening; a proposal is open; this tier was already refused in this window |
| `respond_to_window(thread, accept)` | agrees or does not | not a party; no open proposal; **you are the proposer** |
| `narrow_window(thread, tier)` | shortens it, unilaterally | not a party; not a narrowing |
| `end_thread(thread)` | closes it, unilaterally | not a party |
| `send_message(thread, body)` | sends | not a party; window closed; blocked |
| `mark_read(thread)` | moves your read cursor | not a party |
| `confirm_met(thread)` | your half of a receipt | not a party; the activity has not happened |
| `my_feed(before, page_size)` | reads your deliveries | *(read-only; listed because it is `SECURITY DEFINER`)* |

`my_feed` bypasses RLS by construction, because it needs `is_blocked`, which is
never granted to a client. Its `where` clause therefore carries the whole
restriction: `person_id = auth.uid()` is the first condition and there is no
path around it. Every row it returns, RLS would have allowed anyway.

Delivery generation is **not** on this list. `generate_deliveries`,
`eligible_for` and `cast_origin` live in `private` and are granted to nobody:
who a cast reaches is the server's judgement, and `cast_origin` returns a point
(L2).

---

## Roles

There are three, and one of them is not a role.

- **`anon`** — holds nothing. No policy names it; no function is granted to it.
  There is no anonymous read path into this product at all.
- **`authenticated`** — the entire surface above.
- **moderator** — not a database role. `is_moderator()` reads
  `app_metadata.moderator` from the JWT, because `user_metadata` is writable by
  the user it describes and would be a self-service escalation.
