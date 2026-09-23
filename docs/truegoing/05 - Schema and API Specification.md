# TrueGoing Schema and API Specification (Reimagined Product)

## Document control

- **Status:** Proposal, saved to the repo 2026-09-23. No migration or function has been changed. Not yet authoritative; see `README.md` in this folder.
- **Written against:** *04 - Screen Contracts.md* (every RPC below is named by a screen), *03 - TrueGoing Reimagined.md* (product).
- **Replaces if adopted:** `supabase/migrations/20260824161306_nearcast_foundation.sql` and the matching sections of `docs/16 - API Contracts.md` and `docs/06 - Permissions and Access Rules.md`.
- **Platform:** Supabase (Postgres 15 + PostGIS, Auth, Realtime, Storage, Edge Functions, pg_cron). Same stack as today.

Tags: **[Certain]** verified in the current repo · **[Likely]** inference · **[Guessing]** gap-filling.

---

## 0. Decisions carried in from the product owner

1. **Vocabulary is locked:** plan · ask · offer · host · people going · connection. Table and function names below use these words. Nothing is called intent, broadcaster, match or recipient.
2. **Women-only plans:** set only by hosts who are verified women; delivered only to verified women; joinable only by verified women. "Verified woman" = `profile_private.gender = 'woman'` **and** `profiles.verified_at is not null`. Selfie verification proves a live person matching their photo; it does not verify gender, so a false declaration is a reportable policy breach handled by restriction, not by technology.
3. **The API and schema spec is written against the screen contracts,** not the current docs.

---

## 1. Migration strategy

**[Certain]** There is no production data: the only migration is a foundation, the seed is three local demo users, and no app screen writes to the database. **Recommendation:** replace the foundation migration with a new one rather than layering `ALTER`s on a model that has the wrong core object (one match per post, `M:123`).

**Keep from the current foundation** (these are right and are carried over with new names):
- The public / context / private split of location and contact data.
- RLS on every table, deny by default, explicit policies.
- Server-controlled lifecycle transitions as `security definer` functions with `search_path = ''`, row locks, and idempotency.
- A stored, human-readable reason per delivery.
- An audit event table per plan.
- The analytics outbox CHECK that bans sensitive keys (`M:212`).
- `updated_at` triggers.

**Fix from the current foundation** (found in the review):
- Recipient-editable rows must not be able to change `plan_id` (the re-point hole, `M:479-480`). All member-side writes go through RPCs; direct `UPDATE` grants are removed.
- `profiles` update is column-limited; users cannot touch `is_restricted` or `verified_at` (`M:425-426`).
- Disclosure of private fields is host-only and readable by members through an RPC (`M:505-508` allowed either party and had no reader).
- The public projection respects restriction and blocks (`M:352-399` did not).

---

## 2. Principles the schema enforces

| # | Principle | Mechanism |
|---|---|---|
| P1 | People are not browsable | No policy or RPC lists profiles by area, interest or gender. `profiles` is readable only for people you share a plan, chat, connection or request with. |
| P2 | No user location | No table stores a user's coordinates. `profile_private.home_cell` is a ≈ 1 km grid cell used only for delivery, never exposed. |
| P3 | Approximate place for plans | `plans.snapped_point` is `ST_SnapToGrid(exact, 0.0027)` (≈ 300 m). `plan_private.exact_point` is host-only until unlock. |
| P4 | Informed reach, one-way | `plans.reach_level` can only increase, enforced by trigger and by `widen_reach`. |
| P5 | Every delivery has a reason | `plan_deliveries.reason_code` and `reason_text` are `not null`. |
| P6 | Real counts only | Counts are computed in SQL from real rows. Estimates are returned in buckets ("few" below 5). |
| P7 | Transitions are server-side | Clients can only insert drafts and their own settings; every state change is an RPC. |
| P8 | Idempotency | Every mutating RPC is safe to call twice; unique keys and `on conflict do nothing` back this up. |
| P9 | Mutual trust records | `showed_up` counts only rows where confirmer ≠ confirmed. |
| P10 | Payload hygiene | Push and analytics payloads are constrained by CHECKs on the outbox tables. |

---

## 3. Enums

```
plan_type          : plan | ask | offer
plan_status        : draft | live | full | started | ended | cancelled | restricted
reach_level        : friends | friends_of_friends | nearby | city          -- ordered
member_status      : going | left | removed
request_status     : pending | accepted | declined | withdrawn
delivery_reason    : friend_going | friend_vouched | friend_hosting | friends_of_friends
                   | nearby_interest | nearby | heading_to | venue_nearby | widened
spot_visibility    : on_unlock | immediate
message_kind       : text | photo | poll | system | spot_share
notification_type  : member_joined | request_received | request_accepted | plan_starting
                   | spot_unlocked | plan_nearby | vouch_received | showed_up_confirmed
                   | connection_request | connection_accepted | plan_cancelled | plan_edited
                   | showed_up_prompt
connection_status  : pending | accepted | declined | removed
report_subject     : plan | profile | message
report_reason      : spam_scam | inappropriate | safety | fake_misleading | other
report_status      : open | reviewing | actioned | dismissed
gender             : woman | man | non_binary | undisclosed
verification_status: none | pending | verified | failed
```

`reach_level` ordering is defined once in `private.reach_rank(reach_level) returns int` (friends = 1 … city = 4).

---

## 4. Tables

Schemas: `public` (RLS-protected, typed for the client), `private` (helpers, never granted to clients). All timestamps `timestamptz`. All PKs `uuid default gen_random_uuid()` unless noted.

### 4.1 Identity and profile

**profiles** (public card; PK = `auth.users.id`)
- `display_name text` 1–60 · `first_name text` generated as `split_part(display_name,' ',1)`
- `avatar_path text` (Storage path; served via signed URL)
- `bio text` ≤ 150 · `area_name text` (e.g. "Sector 8") · `city text`
- `show_interests bool default true` · `show_past_plans bool default false`
- `verified_at timestamptz` · `is_restricted bool default false` · `restricted_reason text` (private in practice: not selected by any client-readable view)
- `age_visible_from timestamptz` (set on first join; S20 rule)
- `onboarding_completed_at timestamptz` · `created_at` · `updated_at`

**profile_private** (PK `profile_id`)
- `birth_date date not null` (18+ enforced in `complete_onboarding`) · `gender gender default 'undisclosed'`
- `phone_e164 text` · `home_cell text` (geohash-6 of the coarse area; never exposed)
- `trusted_contact_name text` · `trusted_contact_phone text`
- `contact_matching_opt_in bool default false`

**profile_settings** (PK `profile_id`)
- `appearance text` · `language text` · `distance_unit text check in ('km','mi') default 'km'`
- `push_enabled bool` · `alert_nearby_radius_km int check between 2 and 25 default 5`
- `alert_friends_plans bool` · `alert_asks_nearby bool` · `quiet_from time` · `quiet_to time`

**interests** (`id`, `slug unique`, `label`, `emoji`, `group`) — seeded reference data.

**profile_interests** (`profile_id`, `interest_id`, PK both).

**verifications** (`id`, `profile_id`, `status verification_status`, `provider_ref text`, `created_at`, `decided_at`). No image bytes are ever stored.

**devices** (`id`, `profile_id`, `platform text`, `push_token text unique`, `last_seen_at`).

**contact_hashes** (`profile_id`, `hash text`, PK both). `hash = sha256(e164 || server_salt)`. Rows exist only while `contact_matching_opt_in`.

**blocks** (`blocker_id`, `blocked_id`, `created_at`, PK both, `check blocker_id <> blocked_id`).

### 4.2 Trust graph

**connections** (`a_id`, `b_id`, `created_at`, `source text check in ('shared_plan','mutual_request','contacts')`, PK (`a_id`,`b_id`), `check a_id < b_id`). One row per pair; `private.are_connected(x,y)` normalises order.

**connection_requests** (`id`, `from_id`, `to_id`, `status connection_status`, `basis text check in ('shared_plan','friends_of_friends','contacts')`, `created_at`, `decided_at`, `unique (from_id, to_id)`).

### 4.3 Plans

**plans**
- `host_id` → profiles · `type plan_type` · `status plan_status default 'draft'`
- `text text` 1–500 · `emoji text` 1–8 chars · `category_id` → interests (category = a top-level interest group)
- `starts_at timestamptz not null` · `ends_at timestamptz not null check (ends_at > starts_at)` · `repeat_weekly bool default false` · `series_id uuid` (links weekly repeats)
- `capacity int check (capacity between 1 and 200)` (null = no limit; asks/offers default 1)
- `women_only bool default false` · `verified_only bool default false` · `connections_only bool default false`
- `check (not women_only or verified_only)` (women-only forces verified-only)
- `reach_level reach_level not null default 'nearby'` · `reach_widened_at timestamptz`
- `area_name text not null` · `city text not null` · `snapped_point geography(point,4326) not null` · `cell text not null` (geohash-6 of snapped point)
- `share_slug uuid unique default gen_random_uuid()` · `public_link_enabled bool default true`
- `version int default 1` · `published_at` · `cancelled_at` · `cancel_reason text` · `created_at` · `updated_at`
- Indexes: `gist (snapped_point)`, `(cell)`, `(status, starts_at)`, `(host_id)`, `(series_id)`.

**plan_private** (PK `plan_id`)
- `exact_point geography(point,4326) not null` · `exact_address text`
- `spot_visibility spot_visibility default 'on_unlock'` · `unlock_at timestamptz generated as (starts_at - interval '1 hour')` (maintained by trigger from `plans.starts_at`)
- `spot_shared_at timestamptz` · `spot_shared_by uuid`

**plan_members** (`plan_id`, `profile_id`, `status member_status default 'going'`, `joined_at`, `left_at`, `removed_by uuid`, PK (`plan_id`,`profile_id`)).

**plan_requests** (asks and offers) (`id`, `plan_id`, `profile_id`, `note text ≤ 300`, `status request_status default 'pending'`, `created_at`, `decided_at`, `unique (plan_id, profile_id)`).

**plan_deliveries** (`id`, `plan_id`, `profile_id`, `reason_code delivery_reason not null`, `reason_text text not null ≤ 120`, `reach_level_at_delivery reach_level`, `delivered_at`, `hidden_at`, `not_for_me_at`, `unique (plan_id, profile_id)`). This is the feed. **No client write policy**; changes go through `feedback_not_for_me`.

**plan_vouches** (`plan_id`, `profile_id`, `created_at`, PK both).

**plan_events** (`id`, `plan_id`, `actor_id`, `event_type text`, `from_status`, `to_status`, `metadata jsonb`, `created_at`). Metadata CHECK forbids keys `text`, `exact_point`, `exact_address`, `phone`.

**plan_outcomes** (`plan_id`, `profile_id`, `went_well bool`, `reason text`, `created_at`, PK (`plan_id`,`profile_id`)).

**showed_up** (`plan_id`, `confirmer_id`, `confirmed_id`, `created_at`, PK all three, `check confirmer_id <> confirmed_id`).

**checkins** (`plan_id`, `profile_id`, `created_at`, PK both). A tap, no coordinates.

### 4.4 Conversations

**conversations** (`id`, `plan_id unique`, `created_at`, `closed_at`). One per plan, created on publish. Ask/offer threads: `conversation_threads` (`id`, `plan_id`, `request_id unique`, `created_at`) — a private thread per accepted request, so requesters never see each other.

**conversation_members** (`conversation_id`, `profile_id`, `joined_at`, `left_at`, `muted bool`, `last_read_at`, PK (`conversation_id`,`profile_id`)). Maintained by triggers from `plan_members` and accepted `plan_requests`.

**messages** (`id`, `conversation_id`, `sender_id` (null for system), `kind message_kind`, `body text ≤ 2000`, `media_path text`, `poll_id`, `created_at`). Index `(conversation_id, created_at)`. `spot_share` messages carry no coordinates in `body`; the spot is fetched by `get_exact_spot`.

**polls** (`id`, `conversation_id`, `question text ≤ 120`, `options jsonb` 2–4 strings, `created_by`, `closes_at`). **poll_votes** (`poll_id`, `profile_id`, `option_index int`, PK (`poll_id`,`profile_id`)).

### 4.5 Trips

**trips** (`id`, `profile_id`, `city text`, `city_point geography`, `starts_on date`, `ends_on date`, `flexible bool`, `created_at`). Private to the owner. Aggregates only through `city_arrivals_bucket`.

### 4.6 Notifications, moderation, analytics

**notifications** (inbox) (`id`, `profile_id`, `type notification_type`, `plan_id`, `chat_id`, `actor_id`, `reason_code delivery_reason`, `read_at`, `created_at`). Text is composed on device. Index `(profile_id, created_at desc)`.

**notification_jobs** (`id`, `profile_id`, `type`, `payload jsonb`, `idempotency_key unique`, `available_at`, `attempts`, `processed_at`). CHECK: payload keys ⊆ {type, plan_id, chat_id, user_id, reason_code}.

**reports** (`id`, `reporter_id`, `subject_type report_subject`, `subject_id uuid`, `reason report_reason`, `note text ≤ 500`, `also_blocked bool`, `status report_status default 'open'`, `reviewer_id`, `created_at`, `decided_at`).

**moderation_actions** (`id`, `profile_id`, `action text check in ('restrict','unrestrict','remove_plan','warn')`, `report_id`, `actor_id`, `note`, `created_at`). Service-role only.

**analytics_outbox** (`id`, `profile_id`, `event text`, `properties jsonb`, `created_at`). CHECK: `properties` has none of `text, body, exact_point, exact_address, phone, display_name, first_name, note`.

---

## 5. Row-level security matrix

Grants: `authenticated` gets `select` on the tables marked R below and `insert`/`update` only where marked. **No table grants `update` or `delete` to clients except the owner-only settings tables.** `anon` gets nothing but `execute` on `get_public_plan`.

| Table | Read | Client insert | Client update | Notes |
|---|---|---|---|---|
| profiles | self; or a *relationship* exists: shared plan membership, accepted request on your plan or theirs, shared conversation, connection, pending connection request, plan you can see hosted by them; and no block either way | self (`id = auth.uid()`) | self, columns: display_name, avatar_path, bio, area_name, city, show_* | `verified_at`, `is_restricted`, `age_visible_from` are trigger/RPC-only (column privileges) |
| profile_private | self | self | self, columns: gender, phone, trusted_contact_*, contact_matching_opt_in | `birth_date` write only via `complete_onboarding`; `home_cell` via `set_home_area` |
| profile_settings | self | self | self | |
| interests | all authenticated | — | — | reference data |
| profile_interests | self; others if `profiles.show_interests` and profile readable | self | — (delete self) | |
| verifications | self | — | — | Edge Function writes as service role |
| devices | self | self | self | |
| contact_hashes | none (RPC only) | — | — | |
| blocks | blocker | blocker | — (delete blocker) | blocked never sees the row |
| connections | either party | — | — | RPC only |
| connection_requests | from or to | — | — | RPC only |
| plans | host; or `private.can_see_plan(plan_id, auth.uid())` (see §6.1) | host, `status = 'draft'` | host, `status = 'draft'`, columns excluding reach_level/status | all other changes via RPC |
| plan_private | host only | host with draft | host with draft | members read via `get_exact_spot` |
| plan_members | members of the same plan; host | — | — | RPC only |
| plan_requests | requester; host | — | — | RPC only |
| plan_deliveries | recipient; host | — | — | RPC only (`feedback_not_for_me`) |
| plan_vouches | anyone who can see the plan | — | — | RPC only |
| plan_events | host | — | — | |
| plan_outcomes | self | — | — | RPC only |
| showed_up | self as confirmer; self as confirmed (read-only count) | — | — | RPC only |
| checkins | members of the plan | — | — | RPC only |
| conversations / threads | members | — | — | |
| conversation_members | members of that conversation | — | self: muted, last_read_at | |
| messages | conversation members while `left_at is null` | member, `sender_id = auth.uid()`, `kind in ('text','photo','poll')`, conversation open, sender not restricted | — | `system`, `spot_share` are RPC/trigger only |
| polls / poll_votes | members | poll: member; vote: RPC | — | |
| trips | self | self | self | |
| notifications | self | — | self: read_at | |
| notification_jobs, moderation_actions, analytics_outbox | none | — | — | service role; analytics via `track_event` RPC |
| reports | reporter | reporter | — | |

**Helper predicates** (`private` schema, `security definer`, `stable`, `search_path=''`):
- `is_blocked(a, b)` — either direction.
- `are_connected(a, b)`.
- `is_friend_of_friend(a, b)` — exists c with `are_connected(a,c) and are_connected(c,b)`.
- `is_verified_woman(p)`.
- `can_see_plan(plan_id, viewer)` — §6.1.
- `has_relationship(a, b)` — the profile-read rule above.
- `reach_rank(level)`.

---

## 6. Core algorithms

### 6.1 Who can see a plan (`can_see_plan`)

A viewer can read a plan when **all** hold:
1. `status in ('live','full','started')` **or** viewer is a member/host (members keep seeing ended plans for 24 h; host always).
2. Not blocked either way with the host.
3. Not `women_only`, or viewer `is_verified_woman`.
4. Not `verified_only`, or viewer `verified_at is not null`.
5. Not `connections_only`, or viewer is connected or friend-of-friend of host.
6. **One of:** a non-hidden delivery to the viewer exists; the viewer is a member; the viewer has a request; the viewer is a connection of the host (friends always see friends' plans within the plan's reach ≥ friends); the plan's reach is `city` and the viewer's `city` matches; the plan's reach is `nearby` and the viewer's `home_cell` is within `alert_nearby_radius_km`-capped 25 km of `snapped_point`.

Rule 6 lets `list_nearby_plans` return plans that were never delivered (for example after a user changes area) while `plan_deliveries` remains the record of *why* it reached them. Every returned card still carries a reason; if no delivery row exists, the reason is computed on the fly (`nearby`, `city`, `friend_hosting`) and a delivery row is inserted so the reason is stored.

### 6.2 Delivery fan-out (`private.deliver_plan(plan_id, from_level, to_level)`)

Runs inside `publish_plan` and `widen_reach`. Recipients are computed per level and inserted into `plan_deliveries` with `on conflict do nothing`:

| Level | Recipients | reason_code / text |
|---|---|---|
| friends | `connections` of host | `friend_hosting` / "{Host first name} is hosting" |
| friends_of_friends | friends of the host's friends, excluding friends | `friends_of_friends` / "Friends of friends" |
| nearby | profiles whose `home_cell` is within min(their `alert_nearby_radius_km`, 25 km) of `snapped_point` **and** (share an interest with `category_id` → `nearby_interest` "Near you · {interest}", else `nearby` "Near you"); plus profiles with a trip covering `starts_at` in `plans.city` → `heading_to` "You're heading to {city}" | |
| city | profiles with `profiles.city = plans.city` not already delivered | `widened` / "Anyone in {city}" |

Filters applied to every level: exclude host; exclude blocked either way; exclude `is_restricted`; if `women_only`, keep only `is_verified_woman`; if `verified_only`, keep only verified; if `connections_only`, keep only levels ≤ friends_of_friends.

Later reason upgrades: when a friend of a recipient joins or vouches, a trigger updates that recipient's delivery to `friend_going` "{Name} is going" / `friend_vouched` "Vouched by {Name}" (a stronger reason replaces a weaker one; the history stays in `plan_events`).

Each new delivery enqueues a `plan_nearby` notification job **only if** the recipient's settings allow it and the plan is within their radius, and never inside quiet hours (deferred to `quiet_to`).

### 6.3 Reach estimate (`reach_estimate(plan_draft_id)`)

Returns, for each level, `{ level, bucket }` where bucket is `'few'` (< 5) or an integer rounded to the nearest 10 above 50, computed with the same recipient query as 6.2 but `count(*)` only. Runs as the host; never returns identities.

### 6.4 Spot unlock

`get_exact_spot(plan_id)` returns `exact_point` and `exact_address` when: caller is host; or caller is a `going` member **and** (`spot_visibility = 'immediate'` or `now() >= unlock_at` or `spot_shared_at is not null`). Otherwise raises `spot_locked`. A pg_cron job every minute inserts a `spot_unlocked` system message and notification for plans whose `unlock_at` just passed.

### 6.5 Trust counts

- `showed_up_count(profile)` = `count(distinct plan_id) from showed_up where confirmed_id = profile`.
- `hosted_count(profile)` = plans with status `ended` where host = profile and at least one `showed_up` row exists for that plan.
- Both are exposed only through `get_profile_view`.

### 6.6 Snapping

`snapped_point = ST_SnapToGrid(exact_point::geometry, 0.0027, 0.0027)::geography` (≈ 300 m at 30° N). `cell = ST_GeoHash(snapped_point, 6)`. Distances shown to clients are computed from `snapped_point` and bucketed by the client per G2.

---

## 7. RPC catalogue

Conventions: all functions are `security definer`, `set search_path = ''`, `revoke execute from public, anon` then `grant execute to authenticated` unless stated. Every mutation locks the target row `for update`, checks `is_restricted`, and writes a `plan_events` row where a plan is involved. Errors are raised with `errcode 'P0001'` and a stable `message` code from §8; the client maps codes to copy.

### 7.1 Account and onboarding

| Function | Args | Screen | Preconditions | Effects | Idempotent |
|---|---|---|---|---|---|
| `complete_onboarding` | `display_name, birth_date, interest_ids[], home_cell?, area_name?, city?` | S04–S07 | age ≥ 18 (`underage`) | upsert profiles, profile_private, profile_interests; set `onboarding_completed_at` | yes (upsert) |
| `set_home_area` | `lat, lng` **or** `area_name, city` | S06, S08 | — | stores geohash-6 cell only; raw lat/lng discarded | yes |
| `register_device` | `platform, push_token` | app start | — | upsert devices | yes |
| `update_settings` | `patch jsonb` | S25 | keys ⊆ settings columns | update | yes |
| `set_gender` | `gender` | S22 | — | update profile_private | yes |
| `set_trusted_contact` | `name, phone` | S17, S25 | — | update profile_private | yes |
| `request_verification` (Edge) | selfie (multipart) | S29 | not already verified | provider call; on success sets `verified_at`; never stores bytes | yes (pending guard) |
| `delete_account` (Edge) | — | S25 | — | anonymises profile to "Former member", deletes private rows, leaves plans, revokes tokens, schedules auth user deletion | yes |
| `track_event` | `event, properties jsonb` | all | outbox CHECK | insert analytics_outbox | n/a |

### 7.2 Discovery

| Function | Args | Screen | Returns |
|---|---|---|---|
| `list_nearby_plans` | `center_cell?, radius_km 2–25, when, types[], category_ids[], only{verified,women_only,network}, sort, cursor, limit ≤ 50` | S08, S09, S10 | `plan_card[]` (§9) for plans passing `can_see_plan`, ordered by sort; inserts missing delivery rows with computed reasons |
| `nearby_density` | `cell, radius_km` | S07, S08 | `{ this_week_bucket, nearest_area_name?, nearest_area_bucket? }` — buckets only |
| `get_plan_card` | `plan_id` | S11 | one `plan_card` with the caller's reason and `my_status`; raises `not_available` if `can_see_plan` fails (one code for all causes) |
| `get_public_plan` | `share_slug` | S03 | anon-callable. `{ id, emoji, title, area_name, city, starts_at, type, host_first_name, verified, going_bucket }`. Returns nothing if not live/full, expired, `public_link_enabled = false`, host restricted, or `women_only` (women-only plans are never public) |
| `search_plans` | `query, cell, radius_km, limit` | S10 | `plan_card[]` by trigram match on `text`, restricted by `can_see_plan` |
| `feedback_not_for_me` | `plan_id` | S08, S11 | sets `not_for_me_at`, `hidden_at`; records to a per-user `category` down-weight (used by sort) |

### 7.3 Posting and hosting

| Function | Args | Screen | Preconditions | Effects |
|---|---|---|---|---|
| `create_plan_draft` | `type, text, emoji, category_id, starts_at, ends_at, repeat_weekly, capacity, women_only, verified_only, connections_only, exact_lat, exact_lng, exact_address, spot_visibility, area_name, city` | S13 | not restricted; `women_only` requires host `is_verified_woman` (`women_only_not_allowed`); `women_only ⇒ verified_only`; asks/offers force `capacity = 1` | inserts `plans` (draft, snapped point, cell) + `plan_private`. Returns `plan_id` |
| `reach_estimate` | `plan_id` | S13 step 5 | host | `{level, bucket}[]` |
| `publish_plan` | `plan_id, reach_level, expected_version` | S13 step 6 | host; draft; `starts_at > now() - 1h`; version matches (`stale`) | status → live, `published_at`, `reach_level`; create conversation + host membership; `deliver_plan(null, level)`; if `repeat_weekly`, create `series_id` and schedule next occurrence via cron | idempotent: re-call on a live plan returns it |
| `edit_plan` | `plan_id, patch, expected_version` | S28 | host; live/full; patch ⊆ {text, emoji, starts_at, ends_at, capacity ≥ current going} | update, version+1, system message, `plan_edited` notifications to members |
| `widen_reach` | `plan_id, to_level` | S28 | host; `reach_rank(to) > reach_rank(current)` (`cannot_narrow`); `connections_only ⇒ to ≤ friends_of_friends` | reach_level, `reach_widened_at`, `deliver_plan(current, to)` |
| `share_exact_spot` | `plan_id` | S16, S28 | host; live/full/started | `spot_shared_at`; system `spot_share` message; `spot_unlocked` notifications |
| `cancel_plan` | `plan_id, reason` | S28 | host; not ended | status → cancelled; close conversation after 24 h; notify members |
| `remove_member` | `plan_id, profile_id` | S28 | host | member status → removed; leaves conversation; no notification text beyond "removed" |
| `accept_request` | `request_id` | S28 | host; pending; plan live; not blocked; capacity | request → accepted; member row; private thread; notify requester. Idempotent: accepted returns same |
| `decline_request` | `request_id` | S28 | host; pending | → declined; requester notified as "not accepted" only |

### 7.4 Joining and participating

| Function | Args | Screen | Preconditions | Effects |
|---|---|---|---|---|
| `join_plan` | `plan_id` | S11 | `type = 'plan'`; `can_see_plan`; live; `starts_at > now()`; not host; not blocked; not restricted; attribute checks (`women_only_required`, `verified_required`, `connections_required`); capacity (`plan_full`) | lock plan; insert member (`on conflict` → return existing); status → full if at capacity; add to conversation; system message; `member_joined` to host; reason upgrades for recipient's friends | yes |
| `leave_plan` | `plan_id` | S11, S16 | member | status → left; conversation `left_at`; system message; status full → live if below capacity | yes |
| `request_to_join` | `plan_id, note?` | S12 | `type in (ask, offer)`; `can_see_plan`; live; attribute checks; not blocked | insert request (`duplicate_request` on conflict); notify host | yes |
| `withdraw_request` | `request_id` | S11 | requester; pending | → withdrawn | yes |
| `vouch_plan` / `unvouch_plan` | `plan_id` | S11 | connected to host; `can_see_plan` | insert/delete vouch; reason upgrades for voucher's friends; `vouch_received` to host | yes |
| `get_exact_spot` | `plan_id` | S16, S17 | §6.4 | `{ lat, lng, address }` or `spot_locked` | n/a |
| `checkin` | `plan_id` | S17 | member; within [-15 min, ends_at] | insert; system message "{first name} is here" | yes |
| `confirm_showed_up` | `plan_id, confirmed_ids[]` | S18 | member; plan ended or started > 1 h ago; ids ⊆ members; excludes self | insert rows `on conflict do nothing`; `showed_up_confirmed` notifications | yes |
| `rate_plan` | `plan_id, went_well, reason?` | S18 | member | upsert outcome; if `went_well` and first for this user, set `profiles.rating_prompt_eligible_at` | yes |

### 7.5 Chat

| Function | Args | Preconditions | Effects |
|---|---|---|---|
| `send_message` | `conversation_id, kind in (text, photo), body?, media_path?` | member, open, not restricted | insert; Realtime broadcast via publication |
| `create_poll` | `conversation_id, question, options[2..4], closes_at?` | member | insert poll + poll message |
| `vote_poll` | `poll_id, option_index` | member; open | upsert vote |
| `mark_read` | `conversation_id` | member | `last_read_at = now()` |
| `mute_conversation` | `conversation_id, muted` | member | update |

Direct `insert` on `messages` is also permitted by policy for `text`/`photo` so the client can use the standard insert path with optimistic IDs; `send_message` exists for parity and for server-side rate limiting (`rate_limited` above 30 messages/min).

### 7.6 Connections and trips

| Function | Args | Preconditions | Effects |
|---|---|---|---|
| `request_connection` | `to_id` | basis exists: shared `showed_up` or shared going membership on an ended plan, or `is_friend_of_friend`, or contact match; not blocked | insert request (`duplicate_request`); notify |
| `respond_connection` | `request_id, accept bool` | recipient | accepted → insert connections; notify |
| `remove_connection` | `other_id` | connected | delete; other side's view downgrades to first name |
| `upsert_contact_hashes` | `hashes text[]` | opt-in on | replace rows for caller |
| `match_contacts` | — | opt-in on | returns profiles (first name, avatar) where both parties opted in and hashes intersect; caps at 200; never returns the hash |
| `list_people_met` | — | — | attendees of plans the caller showed up at, not yet connected |
| `upsert_trip` / `delete_trip` | `city, city_point, starts_on, ends_on, flexible` | — | trips |
| `city_arrivals_bucket` | `city, from, to` | caller hosts a live plan in that city | `'few'` or a rounded count; never identities |

### 7.7 Safety and moderation

| Function | Args | Effects |
|---|---|---|
| `block_user` | `blocked_id` | insert block; remove caller from plans hosted by blocked and vice-versa memberships; hide deliveries both ways; withdraw pending requests/connection requests both ways. Idempotent |
| `unblock_user` | `blocked_id` | delete block |
| `report` | `subject_type, subject_id, reason, note?, also_block bool` | insert report; if `also_block`, call `block_user`; enqueue moderation notification (service) |

### 7.8 Notifications

| Function | Args | Effects |
|---|---|---|
| `list_notifications` | `segment, cursor` | rows for caller; device composes text |
| `mark_notifications_read` | `ids[]?` (null = all) | update |

### 7.9 Scheduled jobs (pg_cron)

| Job | Cadence | Action |
|---|---|---|
| `plans_start_and_end` | every minute | live/full → started at `starts_at`; started → ended at `ends_at`; enqueue `plan_starting` (T-60 min), `showed_up_prompt` (T+2 h), close conversations at ended + 24 h |
| `spot_unlock` | every minute | §6.4 system message + notification |
| `weekly_repeats` | daily | for `repeat_weekly` series, create next week's draft copy and publish with the same reach; host can stop the series from S28 |
| `expire_drafts` | daily | delete drafts older than 7 days |
| `quiet_hours_release` | every 15 min | release deferred `notification_jobs` |
| `analytics_flush` | every 5 min | Edge Function pulls `analytics_outbox` |

---

## 8. Error codes

Stable strings raised as the exception message; the client never shows them raw.

`underage` · `not_available` · `stale` · `plan_full` · `plan_not_live` · `plan_started` · `duplicate_request` · `already_member` · `not_member` · `not_host` · `cannot_narrow` · `women_only_not_allowed` · `women_only_required` · `verified_required` · `connections_required` · `blocked` · `restricted` · `spot_locked` · `rate_limited` · `invalid_capacity` · `invalid_time` · `no_basis_for_connection` · `opt_in_required`

`not_available` is deliberately shared by: no delivery/reach, blocked either way, host restricted, ended-private, women-only for a non-eligible viewer. The client shows one identical state (S11 acceptance criterion 4).

---

## 9. View models returned to the client

**`plan_card`** (from `list_nearby_plans`, `get_plan_card`, `search_plans`):
```
id, type, status, emoji, title(text), category { slug, label, emoji },
area_name, city, snapped_lat, snapped_lng, distance_bucket ('lt1' | 'approx' + km),
starts_at, ends_at, repeat_weekly,
capacity, going_count, spots_left,
going_preview: [{ first_name, avatar_url }] (max 3, connections show full name),
vouches_preview: [{ first_name }] (max 3), vouch_count,
women_only, verified_only, connections_only, is_venue,
host: { id, first_name (or display_name if connected), avatar_url, verified },
reason: { code, text }                      -- never null
my_status: 'none' | 'going' | 'requested' | 'host' | 'left',
eligibility: { ok: bool, code?: error_code },
share_slug (host only)
```
Never present: exact point, address, host phone, full attendee list for asks/offers, other viewers' reasons.

**`profile_view`** (from `get_profile_view(id)`):
```
id, name (first or full per relationship), avatar_url, age (if age_visible_from <= now()), area_name,
verified, showed_up_count, hosted_count,
bio, interests[] (if show_interests),
mutual_connections: { count, names[] (only my own connections) },
shared_plans: [{ plan_id, title, date }],
their_visible_plans: plan_card[] (filtered by can_see_plan),
relationship: 'self' | 'connected' | 'pending_out' | 'pending_in' | 'met' | 'friend_of_friend' | 'none',
can_connect: bool, can_message: { ok, conversation_id? }
```
Never present: gender, birth_date, location, last active, profile view counts.

---

## 10. Realtime, Storage, Edge Functions

**Realtime publication** `supabase_realtime`: `messages`, `conversation_members`, `plan_members`, `notifications`. RLS applies to Realtime reads, so members only receive their own conversations.

**Storage buckets** (all private; access via signed URLs minted by RLS-checked policies):
- `avatars/{profile_id}/...` — owner write; read for anyone with `has_relationship` or who can see a plan the owner hosts/joined (policy mirrors `profiles`).
- `chat-media/{conversation_id}/...` — members read/write; lifecycle deletes 30 days after the conversation closes.

**Edge Functions**
- `verify-identity` — receives the selfie, calls the provider with the profile photo, writes `verifications` and `profiles.verified_at`, discards bytes.
- `push-sender` — drains `notification_jobs`, sends APNs/FCM with the constrained payload.
- `delete-account` — orchestrates §7.1.
- `analytics-flush` — ships `analytics_outbox` to the analytics store.
- `moderation-webhook` (later) — receives reviewer decisions and writes `moderation_actions`.

**Auth config changes:** enable Apple (`config.toml:322`), enable phone sign-up with an SMS provider (`:257`, `:289`), disable email/password for the app, keep anonymous sign-ins off.

---

## 11. Privacy invariants and the tests that prove them (pgTAP)

Each is one or more assertions in `supabase/tests/database/`, run by `npm run db:test`.

1. **No user location:** `information_schema.columns` has no `geography` or `lat/lng` column on `profiles`, `profile_private`, `devices`, `checkins`.
2. **Approximate only:** for every live plan, `ST_Distance(snapped_point, exact_point) <= 450 m` and `snapped_point` is on the grid.
3. **Exact spot locked:** as a going member before `unlock_at`, `get_exact_spot` raises `spot_locked`; after `unlock_at`, it returns; as a non-member it raises `not_available`.
4. **Reason required:** inserting a delivery without a reason fails; every card from `list_nearby_plans` has a non-null reason.
5. **No re-pointing:** as a recipient, `update plan_deliveries set plan_id = …` affects 0 rows and `update plan_requests set plan_id = …` affects 0 rows (no grant).
6. **Reach is one-way:** `widen_reach` to a lower level raises `cannot_narrow`; a direct `update plans set reach_level` as host affects 0 rows.
7. **Women-only:** a plan with `women_only` is not delivered to a verified man, an unverified woman, or an undisclosed profile; `join_plan` raises `women_only_required` for each; `get_public_plan` returns no row; `create_plan_draft` with `women_only` by a non-eligible host raises `women_only_not_allowed`.
8. **Profiles not browsable:** as an authenticated user with no relationships, `select count(*) from profiles` = 1 (self).
9. **Blocks:** after `block_user`, both parties' `get_plan_card`/`get_profile_view` raise `not_available`; the blocked user cannot see the block row; both are removed from each other's plans.
10. **Self-restriction:** `update profiles set is_restricted = false` as the owner affects 0 rows.
11. **Mutual show-up:** `confirm_showed_up` with self in the list ignores self; `showed_up_count` is 0 when only the subject confirmed.
12. **Idempotency:** calling `join_plan`, `publish_plan`, `accept_request`, `block_user`, `confirm_showed_up` twice yields one row each.
13. **Capacity race:** two concurrent `join_plan` on a 1-spot plan produce exactly one member and one `plan_full`.
14. **Public projection:** `get_public_plan` as anon returns only the listed columns (assert column set), nothing for a restricted host, nothing for `women_only`.
15. **Payload hygiene:** inserting `notification_jobs.payload` with a `text` key fails; inserting `analytics_outbox.properties` with `display_name` fails.
16. **Outsider denied:** an account with no relationship reads 0 rows from `plans`, `messages`, `plan_members`, `plan_requests`, `plan_deliveries`.
17. **Requester isolation:** two requesters on the same ask cannot read each other's requests or threads.
18. **Delete account:** after `delete_account`, the profile reads "Former member", `profile_private` has no row, memberships are `left`, and messages remain attributed to "Former member".

---

## 12. Open items for the API author

1. **SMS provider** for phone OTP (Twilio is configured but disabled and empty, `config.toml:289-292`).
2. **Verification provider** for `verify-identity`; the contract requires no image retention.
3. **Geocoder** for S06 manual area, S10 place search and S13 address; results are stored as `area_name`/`city` text plus the snapped point only.
4. **Rate limits** beyond messages: posts per day, requests per day, reports per day. Suggested: 10 / 20 / 10.
5. **Moderation tooling** is service-role SQL in this spec; a reviewer UI is out of scope.

## Change log

| Date | Change |
|---|---|
| 2026-09-23 | First proposal. Replaces the foundation model with plans, members, requests, deliveries, connections, conversations, trust records and moderation; 60+ RPCs; RLS matrix; fan-out, unlock and estimate algorithms; 18 privacy invariants with tests. |
