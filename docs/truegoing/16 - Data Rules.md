# 16 - Data Rules

**Written 2026-09-24.** What the database holds, who may read and write what, the server-controlled transitions, and the tests that prove the denied paths. Built from [`12`](./12%20-%20Truegoing%20Concept.md), [`13`](./13%20-%20Feature%20Inventory.md) and [`15`](./15%20-%20Screen%20Contracts.md). The previous database (`ninjatech68-blip/mobileapp`, `supabase/`, 59 migrations, 36 pgTAP files, laws L1–L14) is the reference: where it already says the same thing, the rule is **carried** and its existing test is the starting point; where the concept changed, the rule is **new** and needs a failing test before code.

Plain-language summary first, then the detail an engineer builds from.

---

## 0. In one paragraph

The database is the referee. The app can only read what a policy lets it read and can only change things by calling named functions that check every rule before writing. There is no way for the app, or a person with the app's keys, to write a row directly. Every rule that matters to a person's safety has a law, every law has a test that fails when the rule is broken, and the tests run before anything ships.

## 1. Principles (carried)

1. **Clients hold SELECT and EXECUTE only.** No INSERT, UPDATE or DELETE privilege on any table for the app role (L1, table-driven test that enumerates every table).
2. **Every write is a SECURITY DEFINER function** with `search_path = ''`, owned by the database, that checks the caller with `private.assert_actor()` (not restricted, verified, of age) before touching a row.
3. **Every transition is idempotent.** Calling it twice yields the same state and the same result (`idempotency_keys`, carried).
4. **Row-level security on every exposed table**, with explicit policies, and a test for each allowed and each denied path.
5. **Realtime accelerates; PostgreSQL is the truth.** Nothing the app shows comes from a channel that a query could not reproduce.
6. **No coordinate that describes a person exists anywhere** (L2, L14 structural test enumerates every geography column).
7. **Payloads leaving the database for push or analytics carry identifiers only** (outbox tables, carried; the test extends to new fields).

## 2. Laws

A law is a sentence a test can fail. Carried laws keep their number; new laws start at L15.

| # | Law | Status |
|---|---|---|
| L1 | No client write privilege exists on any table | Carried |
| L2 | No coordinate describing a person is readable by another person | Carried |
| L3 | Circle membership is invisible from outside | Carried, dormant (no circles in V1; table stays, feature off) |
| L4 | A meetup counts only when both people have confirmed | Carried |
| L5 | A vouch requires a settled meetup | Carried, dormant (vouches return with the women-only chain, `13` 3.9) |
| L6 | Reach never widens without the host's informed action | Carried; `show_on_map` is that action for the map |
| L7 | Blocking is symmetric and immediate | Carried; extended: the blocker leaves any shared plan (L18) |
| L8 | A delivery cannot exist without a stored, human-readable reason | Carried; the why line |
| L9 | A restriction cannot be self-cleared and stops everything | Carried |
| L10 | A plan's words freeze on the first ask | Carried; extended to `show_on_map` and `for_women` |
| L11 | No image enters storage with metadata or unscanned | Carried |
| L12 | The moderation audit is append-only | Carried |
| L13 | A chat stays open only for the plan's window, plus 24 hours | Amended: fixed window, no proposals (`15` F1) |
| L14 | A plan's exact place is visible only to its host and accepted people | Carried; the coarse point may now cross the wire (L15) |
| **L15** | A plan's public point is on the ~1 km grid; no finer point exists in any client-readable column or function result | New (map browse) |
| **L16** | An unverified account can read plans and nothing else that reaches another person: asking, posting, messaging and connecting accounts refuse it. Writes about itself stay open: name, area, interests, hiding a plan from its own feed, blocking, reporting | New (look but do not touch); landed 2026-09-24 |
| **L17** | A plan room contains only its host and accepted people; no asker, no outsider can read or enumerate it | New (group chat) |
| **L18** | Two people who block each other are never members of the same live plan | New |
| **L19** | A connected social handle is readable only by someone who may also see that plan's exact place | New |
| **L20** | A plan marked for women is delivered to, askable by, and visible in detail to declared women only; the host can remove anyone; a host-confirmed report inside it removes the account permanently | New |
| **L21** | Points move only on a mutual confirmation, once per pair per 30 days, capped per week, and are never readable by anyone but their owner | New, Layer 2, table and law land before the feature |
| **L22** | Every push and analytics payload contains identifiers only: no plan text, message, name, handle or coordinate | Carried, extended |

## 3. Tables

**Machine names (decided at M0, 2026-09-24):** the database keeps `cast` as its internal name for a plan, exactly as the previous product did; renaming 59 migrations, every function body and 36 test files would risk 859 passing assertions for no user-visible value. Only **new** tables, functions and API fields use the `plan` vocabulary where it reads naturally. The tables below are listed under their intended names; where an existing table is meant, the current name is given in brackets on first use. Grouped by who they belong to. **Reads** says who may select rows; **Writes** is always "functions only".

### People

| Table | Holds | Reads |
|---|---|---|
| `people` | id, first name, about (80), photo path, created | Anyone verified may read first name, about, photo, created of anyone not blocked either way |
| `person_private` | phone hash, e164 (encrypted), instagram handle, woman_declared, email identity | Owner only. Handle also via `handle_for()` under L19 |
| `person_verification` | verified_at, attempts | Owner; `is_verified()` for gates |
| `person_age` | date of birth, of_age | Owner; `is_of_age()` for gates (carried) |
| `person_areas` | neighbourhood label, coarse centre | Owner only (L2) |
| `person_interests` | category, sub-interest | Owner only; delivery reads server-side |
| `person_settings` | notification switches ×8, `show_woman_mark` | Owner only |
| `person_devices` / `devices` | push tokens, device names | Owner only (carried) |
| `person_recovery`, `person_auth_events` | carried as is | Owner |
| `account_restrictions` | restriction kind, since, reason id | Owner sees that one exists; moderators see all (carried) |
| `blocked_phones` | phone hash held 30 days after deletion or removal | Nobody; functions only |
| `blocks` | blocker, blocked, at | Owner sees own; `is_blocked()` used everywhere |
| `person_standing` (new) | plans_hosted, plans_joined, showed_up_rate, regular_host_since | Anyone verified may read another's standing (it is the record) |
| `person_points` (new, Layer 2) | balance, weekly_earned, last_pair_credit | Owner only (L21) |

### Plans

| Table | Holds | Reads |
|---|---|---|
| `plans` | id, host, sentence (140), category, sub_interest, icon (allow-list), happens_at, expires_at, capacity (1–20), `show_on_map`, `for_women`, frozen_at, cancelled_at | Delivered readers via `my_feed`/`plans_on_map` (L15); host fully |
| `plan_places` | exact place text, exact point (private) | Host; accepted people via `may_see_place()` (L14) |
| `plan_public_point` | coarse point (~1 km grid), neighbourhood label | Delivered or browsing verified readers (L15) |
| `plan_reach` | kind (fixed radius), radius_m | Host |
| `plan_deliveries` | plan, person, reason text, delivered_at, hidden_at | The person, own rows (L8) |
| `plan_events` | append-only lifecycle | Nobody directly; functions and retention |
| `join_requests` | plan, asker, note, state (asked · accepted · declined · withdrawn · removed), at | Asker own; host for own plans |
| `plan_receipts` | plan, a, b, a_confirmed, b_confirmed, settled_at, no_show_by | Each party own (L4) |
| `area_labels` | gazetteer, carried; supplemented at runtime by iOS reverse geocoding on device | Anyone |

### Chat

| Table | Holds | Reads |
|---|---|---|
| `threads` | plan, kind (pair · room), a, b (pair), opened_at, read_only_at | Members only via `in_thread()` (L17) |
| `thread_members` (new) | thread, person, joined_at, left_at | Members only |
| `messages` | thread, sender, kind (text · photo · location · system), body, media path, reply_to, at | Members (L17) |
| `message_reactions`, `thread_reads`, `thread_presence` | carried | Members |

### Safety and operations

| Table | Holds | Reads |
|---|---|---|
| `reports` | reporter, reported, plan, reason, text, evidence snapshot, `in_women_plan`, at | Moderators; reporter sees own without evidence |
| `moderation_actions` | append-only (L12) | Moderators |
| `moderator_views` | who looked at what, append-only | Moderators |
| `notification_outbox`, `push_deliveries` | identifiers only (L22) | Workers |
| `analytics_outbox` | identifiers and event names only (L22) | Workers |
| `idempotency_keys`, `rate_limits`, `rate_caps` | carried | Functions |

Dropped from the previous schema for V1: `venues`, `venue_offers` (Layer 3), `circles`, `circle_members`, `plan_reach_circles`, `thread_window_proposals` (L13 amended), `plan_notes` (folded into `plans.sentence` and the host note field), `vouches` stays but unused.

## 4. Transitions (write functions)

All `SECURITY DEFINER`, `search_path = ''`, idempotent by request key, gated by `assert_actor()` unless stated. **Refuses** lists the denied paths each one must have a test for.

| Function | Does | Refuses |
|---|---|---|
| `start_verification(phone)` · `confirm_verification(code)` | Carried. Marks the phone verified | Rate cap; blocked phone hash (30 days) |
| `link_provider(name_claim, photo_claim)` (new) | Creates the account from Apple/Google, prefills first name | Any write beyond `people.first_name` and a pending photo |
| `set_my_profile(first_name, about, photo)` | Carried + about | Unverified (L16); about > 80 |
| `set_my_areas(label, coarse_point)` | Carried; snaps to grid server-side too | A point finer than the grid (L2) |
| `set_my_interests(categories, sub_interests)` | Carried + sub-interests | Empty set |
| `set_woman_declared(bool)` (new) | Self-declaration | Nothing; it is a declaration |
| `set_instagram_handle(text)` (new) | Owner-only field | Regex fail; unverified |
| `publish_plan(sentence, category, sub, icon, when, capacity, neighbourhood, exact_place, show_on_map, for_women)` | Creates the plan, coarse point, deliveries with reasons | Unverified (L16); `for_women` by a non-declared host (L20); when > 30 days or past; icon not in allow-list; capacity outside 1–20 |
| `edit_plan(...)` | Until `frozen_at` | After first ask (L10) |
| `cancel_plan(plan)` | Host cancels; notifies accepted; thread read-only | Non-host |
| `request_to_join(plan, note)` | Ask with note | Unverified (L16); blocked either way (L7); host asking own plan; plan full, expired, cancelled; women plan by non-declared (L20); empty note |
| `withdraw_join_request(plan)` | Silent withdraw | After acceptance → becomes `leave_plan` |
| `accept_join_request(plan, asker)` | Accepts; opens pair thread; opens or joins room; unlocks place | Non-host; full; blocked; asker no longer verified |
| `decline_join_request(plan, asker)` | Silent decline | Non-host |
| `remove_from_plan(plan, person)` (new) | Host removes an accepted person; leaves room; place access revoked | Non-host |
| `leave_plan(plan)` (new) | Accepted person leaves; room and place revoked | Host (must cancel instead) |
| `hide_plan(plan)` | Not for me; stores not-relevant | None |
| `confirm_met(plan, other, answer, went)` | Both-sided confirmation; settles receipt; updates standing; Layer 2 credits points under L21 | Before the plan's time; twice with different answers (first stands) |
| `send_message(thread, body)` · `send_media` · `send_location` · `send_reply` · `react_to_message` | Carried, extended to rooms | Non-member (L17); read-only thread; blocked pair |
| `block_person(person)` | Symmetric block; closes pair threads; **leaves shared live plans** (L18); revokes place and handle access | Self |
| `unblock_person(person)` | Carried | None |
| `create_report(person, plan, reason, text, also_block)` | Report with evidence snapshot; flags `in_women_plan` | Self |
| `moderate_remove_account`, `moderate_restrict`, `moderate_unrestrict`, `moderate_dismiss` | Carried; `remove_account` adds the phone hash to `blocked_phones` | Non-moderator (`assert_moderator`) |
| `confirm_women_plan_report(report)` (new, moderator or the plan's host) | One strike: removes the account permanently (L20) | Not the host, not a moderator; report not from a women plan |
| `delete_my_account()` | Carried; adds phone hash for 30 days; threads show `Account deleted` | None |
| `register_push_token`, `set_notification_switch(kind, on)` | Carried + per-kind switch | Unknown kind |

Every function that touches another person writes a `plan_events` or `moderation_actions` row.

## 5. Reads (functions and views)

| Read | Returns | Never returns |
|---|---|---|
| `my_feed(lens)` | Delivered live plans in fixed order: sentence, category, sub, icon, happens_at, coarse distance, host first name, host standing, verified mark, `for_women`, reason text, capacity and going count | Exact place, exact point, asker names, other readers |
| `plans_on_map(bbox, lens, mine_or_all)` (new, L15) | Same fields plus the coarse point, capped per call, `show_on_map = true` only, live only; `all` includes plans not delivered to the caller with reason `browsing` | Anything finer than the grid; any person's position |
| `plan_detail(plan)` | Feed fields plus host note, going count, the caller's own ask state; exact place if `may_see_place()` | Exact place otherwise; women plan detail to a non-declared caller beyond the card line (L20) |
| `get_public_profile(person)` | First name, photo, about, since, standing, marks, live plans, `connected_accounts_count` | Handle unless `handle_for()` allows; anything about a blocked pair |
| `handle_for(person, plan)` (new, L19) | Instagram handle if caller `may_see_place(plan)` and neither blocks the other | Otherwise null |
| `my_activity()` | Needs-you rows (asks on my plans, did-it-happen), waiting rows, my plans, threads with unread counts | Others' asks; declined states to the asker |
| `my_conversations()`, `conversation_messages_page()` | Carried, extended to rooms with member first names | Non-member (L17) |
| `thread_members(thread)` (new) | Members with standing | To non-members |
| `my_standing()` · `my_points()` | Own record; own balance | Anyone else's points (L21) |
| `moderation_queue()` etc. | Carried; adds the `in_women_plan` badge | To non-moderators |

## 6. Who can do what

| | Unverified | Verified | Declared woman | Host of the plan | Accepted on the plan | Moderator |
|---|---|---|---|---|---|---|
| Read plans, map, cards | yes | yes | yes | yes | yes | yes |
| Read a women plan's detail | card line only | card line only | yes | yes | yes | yes |
| Ask to go | no (L16) | yes | yes | n/a | n/a | n/a |
| Ask to go on a women plan | no | no (L20) | yes | n/a | n/a | n/a |
| Post a plan | no (L16) | yes | yes | n/a | n/a | n/a |
| Post a women plan | no | no (L20) | yes | n/a | n/a | n/a |
| See exact place | no | no | no | yes | yes (L14) | with audit |
| Read or write the room | no | no | no | yes | yes (L17) | evidence only |
| See a handle | no | no | no | of accepted people | of host and members (L19) | no |
| Accept, decline, remove | no | no | no | yes | no | no |
| Confirm met | no | if accepted | if accepted | yes | yes | no |
| Report, block | read-only block list | yes | yes | yes | yes | yes |
| Remove an account | no | no | no | via confirmed women-plan report (L20) | no | yes |

## 7. Denied-path tests (the minimum set)

Each is one pgTAP assertion that must fail before the code exists and pass after.

1. App role cannot INSERT, UPDATE or DELETE on any table (L1, enumerates all tables including the new ones).
2. No client-readable column or function result carries a coordinate finer than the grid (L2, L15; enumerates every geography column).
3. Unverified caller: `publish_plan`, `request_to_join`, `send_message`, `set_instagram_handle` each raise (L16).
4. Verified non-declared caller cannot ask on or read the detail of a `for_women` plan; declared caller can (L20).
5. Non-declared host cannot publish a `for_women` plan (L20).
6. Asker not yet accepted cannot read the room, its members or its messages; accepted member can; removed member cannot after removal (L17).
7. Block between two accepted members: the blocker's acceptance becomes `left`, they are no longer a thread member, `may_see_place` and `handle_for` return false/null for both directions (L7, L18, L19).
8. `handle_for` returns the handle only when `may_see_place` is true for the same plan (L19).
9. `edit_plan` and changing `show_on_map` or `for_women` raise after the first ask (L10).
10. `plans_on_map` never returns a plan with `show_on_map = false`, an expired or cancelled plan, or a person row (L15).
11. `confirm_met` before `happens_at` raises; a receipt settles only when both confirm; `no_show_by` set only from the answering person's own `went = false` (L4).
12. Points: a second confirmation for the same pair within 30 days credits nothing; weekly cap holds; another person's balance is unreadable (L21).
13. A host-confirmed report from a women plan calls `remove_account` and the phone hash lands in `blocked_phones`; `start_verification` for that hash raises for 30 days (L20).
14. Push and analytics outbox rows contain no plan sentence, message body, first name, handle or coordinate (L22, checks every column by name and by regex over jsonb).
15. Thread write after `read_only_at` raises; `read_only_at = happens_at + 24h` (L13).
16. `delete_my_account` removes people, private, areas, interests, handle, tokens; leaves receipts and moderation rows anonymised; blocks re-verification 30 days.
17. Restricted caller: every write raises; `moderate_unrestrict` is the only way out (L9).
18. Every `plan_deliveries` row has a non-empty reason (L8).

## 8. Retention and purge (carried, adjusted)

Deliveries hidden or expired purged after 30 days. Messages kept 90 days after `read_only_at`, then body removed, row kept for evidence hashes. Media purged with messages. `plan_events` 180 days. Outboxes purged once delivered. `blocked_phones` 30 days. Reports and moderation actions never purged (L12). Points ledger kept 12 months.

## 9. Payload hygiene (L22)

Push: `{kind, plan_id?, thread_id?, request_id?}` and a title from a fixed template that may include a first name only for kinds 1, 2 and 5 (`15` H1); the message push says `New message` and the app fetches the body. Analytics: event name, ids, category, coarse neighbourhood label, counts. Never: sentence, note, message, handle, phone, exact place, any point.

## 10. What is ported and how

- **Port as is (machine names kept, see §3):** verification, age gate, areas and coarse grid, interests, deliveries with reasons, join requests, accept/decline/withdraw, `may_see_place`, receipts and `confirm_met`, blocks, reports, moderation, devices, outboxes, idempotency, rate limits, retention, the L1/L2/L14 structural tests.
- **Amend:** threads (add rooms and members; drop window proposals), `casts_for_person` (add `show_on_map`, `for_women`, sub-interest match), `my_feed` (fixed order, coarse point), block (leave shared plans).
- **New:** `person_private` with handle and declaration, `person_standing`, `person_points`, `plan_public_point`, `plans_on_map`, `handle_for`, `remove_from_plan`, `leave_plan`, `confirm_women_plan_report`, `link_provider`, per-kind notification switches.
- **Drop for V1:** circles, vouches (table kept, dormant), venues and offers, chat window proposals, cast notes as a separate table.

Order of work: structural laws first (L1, L2, L15, L22 tests over the new schema), then ports, then amendments, then new functions, each with its denied tests. `db test` and `db contract` green before the iOS client reads a single row.

## 11. Open items for the owner

| # | Item | Default if unanswered |
|---|---|---|
| 1 | Message retention after a chat ends | 90 days as above |
| 2 | Reach radius value (fixed) | 20 km, as the previous app |
| 3 | Photo moderation provider (L11) | The previous app's scan path |
| 4 | Whether a host may re-open a cancelled plan | No |

## What comes next

`17 - iOS Build Plan`: milestones from sign-in to Layer 1 standing, each with the contracts it implements, the laws it depends on, and its exit test.
