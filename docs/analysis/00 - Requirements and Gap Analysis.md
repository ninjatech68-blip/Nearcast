# Nearcast Requirements And Gap Analysis

## Document Control

- **Status:** Derived analysis. **Not a governing document.**
- **Precedence:** Below implementation plans. This document may not override any source in the [Nearcast Project Reference](../00%20-%20Start%20Here%20-%20Nearcast%20Project%20Reference.md) precedence order. Where it disagrees with a governing document, the governing document wins and this file must be corrected.
- **Created:** 2026-08-25
- **Baseline commit:** `7820a0a`. **Re-measured 2026-08-25** after the documentation, database and application work described below.
- **Scope reviewed:** All 25 documents in `docs/`, the four root documents (`AGENTS.md`, `PRODUCT.md`, `DESIGN.md`, `README.md`), `PROJECT_LOG.md`, `TASKS.md`, the migration, and all application source.
- **Purpose:** Establish a single measurable baseline of what the approved documents require, what exists at this commit, and what must be decided before implementation continues.

## How To Use This Document

This is a measurement, not a plan. `docs/implementation/` remains the execution authority. When a gap here is closed, update the status in this file in the same commit that closes it, and record the change in the change log below. When a conflict here is resolved, the resolution must be written into the governing document first, then reflected here.

---

## 1. Documentation Inventory And Governance Compliance

### 1.1 Inventory

| Group | Documents | State |
|---|---:|---|
| Governing set (`docs/`) | 18 | Complete and internally cross-referenced |
| Implementation plans (`docs/implementation/`) | 6 | Complete, ordered, with checkboxes |
| Root documents | 4 | Two admitted as derived documents on 2026-08-25 (see 1.2) |
| Derived artifacts | 2 | Design preview, design board image |

The governing set is genuinely complete. Every subsystem an MVP needs — product, UX, safety, architecture, permissions, design, content, analytics, QA, operations, legal — has an approved document with a change log. This is the project's strongest asset and should not be treated as overhead.

### 1.2 Governance Defects

**Status as of 2026-08-25: all seven defects are RESOLVED.** `PRODUCT.md` and `DESIGN.md` now carry explicit derived-document ranks in Doc 00's precedence order (2.1 and 6.1), all four missing change logs were added, the uncommitted design-board path was removed, and the local project path was replaced with the repository name.


| ID | Defect | Rule violated | Severity |
|---|---|---|---|
| ~~G-01~~ | Resolved 2026-08-25. `DESIGN.md` is titled "Approved visual design contract" but is not referenced by any governing document and does not appear in the precedence order | Doc 00, Source-of-Truth Precedence | **High** |
| ~~G-02~~ | Resolved 2026-08-25. `PRODUCT.md` restates product truth but is not referenced by any governing document and is not in the precedence order | Doc 00, Source-of-Truth Precedence | **High** |
| ~~G-03~~ | Resolved 2026-08-25. `DESIGN.md` has no `Change Log` section | Doc 00 Document Change Rule; `PROJECT_LOG.md` Governance Rules | Medium |
| ~~G-04~~ | Resolved 2026-08-25. `PRODUCT.md` has no `Change Log` section | Doc 00 Document Change Rule; `PROJECT_LOG.md` Governance Rules | Medium |
| ~~G-05~~ | Resolved 2026-08-25. `README.md` and `AGENTS.md` have no `Change Log` sections | `PROJECT_LOG.md` ("Every document must keep a Change Log") | Low |
| ~~G-06~~ | Resolved 2026-08-25. `DESIGN.md` names its visual authority as `/Users/piyushsharma/.codex/generated_images/...`, a path outside the repository | Doc 14 Repository Contract; reproducibility | Medium |
| ~~G-07~~ | Resolved 2026-08-25. `PROJECT_LOG.md` records the project folder as a local `Downloads` path | Portability | Low |

G-01 and G-02 were the material ones: two documents asserted authority the governing index did not grant them, and `DESIGN.md` contradicted the design documents that *are* governed (see section 2). Left unresolved, an agent following `AGENTS.md` and an agent following `DESIGN.md` would have built different products. Both are now ranked derived documents subordinate to their parents, and `DESIGN.md`'s contradictions have been corrected.

---

## 2. Conflict Register

Every conflict below is between approved documents, not between a document and an opinion. The recommended resolution applies the precedence order in Doc 00 mechanically.

**Status as of 2026-08-25: all nine conflicts are RESOLVED.** Each resolution was written into the governing document and recorded in its change log, and the decisions are logged in Doc 00's decision log. The original conflict text is retained below as the record of what was decided and why.

| ID | Subject | Resolution | Written into |
|---|---|---|---|
| C-01 | Authentication method | Google and Apple sign-in | Doc 15, impl 02 |
| C-02 | Primary navigation | Four destinations: For You, Broadcast, Activity, You | Doc 03, Doc 15, `DESIGN.md` |
| C-03 | Numeric trust score | Removed; contextual evidence only, component renamed `TrustContext` | Doc 07, Doc 17, `DESIGN.md`, `AGENTS.md`, design preview |
| C-04 | IntentCard anatomy | Intent-first ordering; category pill removed | `DESIGN.md`, design preview |
| C-05 | Typography | Doc 07 Manrope scale governs; native mapping is a future target | `DESIGN.md` |
| C-06 | Shape and motion tokens | Doc 07 values govern; native values are a future target | `DESIGN.md` |
| C-07 | Two token systems | Cutover deferred to after Phase 1 | Doc 07 |
| C-08 | Dark appearance | Deferred beyond first alpha; removed from the QA device matrix | Doc 07, Doc 10 |
| C-09 | Minimum touch target | 44pt iOS, 48dp Android | Doc 07, `PRODUCT.md` |

### C-01 — Authentication method (blocking)

| Source | Says |
|---|---|
| Doc 02, MUST-001 | "Users must authenticate with Google or Apple during private alpha." |
| Doc 03, Flow 1 | "Authentication Sheet: Google or Apple sign-in" |
| Doc 15, Screen table | "Sign in — Email/phone OTP, recovery" |
| Impl plan 02, Task 1 | "Implement OTP sign-in" |

**Precedence:** Doc 02 (MVP Requirements, rank 3) outranks Doc 15 (contracts, rank 9) and implementation plans (rank 10).
**Recommended resolution:** Google/Apple wins. Correct Doc 15 and impl plan 02.
**Why it blocks:** This is the very next task in the sequence. Building the wrong one wastes the whole task and its tests.

### C-02 — Primary navigation (blocking)

| Source | Destinations |
|---|---|
| Doc 03, Global Navigation | For You · Broadcast · Activity · You (4) |
| Doc 17, Information Architecture | For You · Broadcast · Activity · You (4) |
| Doc 15, Navigation | Home · My Intents · Activity · Profile (4) |
| `DESIGN.md`, Navigation | Home · Explore · Broadcast · Chat · Profile (5) |
| Shipped code | For You · Activity · Broadcast · Messages · You (5) |

Four documented models and a fifth in code. **Precedence:** Doc 17 and Doc 07 "jointly govern all visual and interaction design" (rank 6); Doc 03 agrees with Doc 17. Doc 15 is rank 9. `DESIGN.md` is ungoverned (G-01).
**Recommended resolution:** The four-destination model wins. Either fold Messages into Activity, or amend Doc 17 and Doc 03 first and then keep five. The shipped five-tab bar was built without amending either governing document — this is the concrete instance of the governance loop not closing.

### C-03 — Numeric trust score (blocking, safety-adjacent)

| Source | Says |
|---|---|
| Doc 01, Non-Goals | "A universal public reputation score" is out of scope |
| Doc 04, Trust Model | "Nearcast must not use … a single universal social-credit score" |
| Doc 08, Terminology | Use "Trust context"; **avoid** "Trust score". Use "Reliability"; avoid "Rating or social credit" |
| Doc 07, TrustDistance | "Avoid ambiguous numeric scores" |
| Doc 07, TrustBadge | "The standard trust display is `Trust 812 · High trust`" |
| `DESIGN.md`, TrustBadge | "Displays `Trust 812 · High trust`" |

Doc 07 contradicts itself *and* contradicts Docs 01, 04, and 08.
**Precedence:** Rule 1 — "Trust, privacy, safety, and legal constraints override convenience." Doc 04 and Doc 01 win outright.
**Recommended resolution:** Remove the `Trust 812` numeric badge from Doc 07 and `DESIGN.md`. Replace `TrustBadge` with contextual evidence per Doc 08's approved patterns ("8 of 9 confirmed interactions were completed", "One trusted connection from your network"). This should be decided before any trust UI is built.

### C-04 — IntentCard anatomy: intent-first vs identity-first

| Source | First element |
|---|---|
| Doc 07, IntentCard | 1. Primitive label and expiry → 2. Intent statement |
| Doc 17, Principle 1 | "Intent Before Identity — show what is needed … before emphasizing who posted it" |
| `DESIGN.md`, IntentCard | 1. Broadcaster mini-profile → 2. TrustBadge → … → 5. one-line intent summary |

`DESIGN.md` inverts the product's first experience principle. It also introduces a "Category pill", while Doc 01 is category-agnostic and Doc 07 says "Use color for state and action, not content category."
**Recommended resolution:** Doc 07/17 win. Correct `DESIGN.md`.

### C-05 — Typography system

Doc 07 and `PRODUCT.md` specify **Manrope** as the shared product typeface with a defined scale (`title.1` 26/32, `body` 15/22). `DESIGN.md` specifies **native platform typography** (SF Pro / Roboto) with a different scale (`largeTitle` 34/41, `body` 16/24). Code implements Manrope.
**Recommended resolution:** Doc 07 wins; `DESIGN.md` amended. Note the code already matches Doc 07.

### C-06 — Shape and motion tokens

| Token | Doc 07 | `DESIGN.md` | Code |
|---|---:|---:|---:|
| `radius.card` | 16 | 20 | 16 |
| Press/fast motion | 150ms | 120ms | 150 |
| Sheet/standard motion | 220ms | 240ms | 220 |
| Emphasis/page motion | 320ms | 300ms | 320 |

Code matches Doc 07 throughout. **Recommended resolution:** Doc 07 wins; `DESIGN.md` amended.

### C-07 — Two live token systems

Doc 07 contains both the original semantic mapping (`background.canvas` → `stone.50` `#F8F7F3`) **and** a newer "implementation target for native semantic naming" (`background.app` `#F7F3EA`). `DESIGN.md` publishes only the newer set plus a full dark palette.

This is a sanctioned migration, not drift — `DESIGN.md` states "Existing app tokens may lag this contract until implementation is explicitly requested." **No defect.** But it needs a decision: the two systems use different token *names*, so every component must be touched at cutover. Decide whether the cutover happens before or after Phase 1, and record it.

### C-08 — Dark appearance

Doc 07 requires dark support via semantic remapping. `DESIGN.md` publishes a complete dark palette. Doc 10 lists "Light and dark appearance" in the closed-alpha device matrix. `app.json` pins `userInterfaceStyle: "light"` and `tokens.ts` has no dark values.
**Recommended resolution:** Either commit dark mode to Phase 1 scope, or amend Doc 10's device matrix and note the deferral in Doc 07. Currently the QA plan requires testing something that cannot exist.

### C-09 — Minimum touch target

Doc 07 states 48x48 universally. `DESIGN.md`, `PRODUCT.md`, and Doc 17 state 44pt iOS / 48dp Android. Minor, but it is an accessibility acceptance criterion and should be stated once.

---

## 3. Requirements Coverage

Doc 02 defines **64 MUST** requirements (plus 4 SHOULD, 2 MAY). Assessed against commit `7820a0a`:

**Original measurement at `7820a0a`:**

| Status | Meaning | Count |
|---|---|---:|
| **Met** | Enforced and correct, though in every case only at the database layer | 11 |
| **Partial** | Schema or UI exists on one side of the boundary, not usable end to end | 29 |
| **Not started** | No schema, no code | 24 |

**User-reachable requirements: 0 of 64.** There was no authentication, so no requirement could be exercised by a person.

**Re-measured 2026-08-25.** Authentication, invitation redemption, the publish transaction and the full lifecycle boundary now exist, so requirements are reachable for the first time:

| Status | Count | Change |
|---|---:|---|
| **Met** | 34 | +23 |
| **Partial** | 21 | −8 |
| **Not started** | 9 | −15 |

The nine still not started are the ones Phases 2 to 4 own: delivery generation and ranking (MUST-030 to MUST-036 depend on `generate-deliveries`), push notification delivery (MUST-080 to MUST-083 depend on `process-notifications` and a `devices` write path), moderation queue operation (MUST-074), prohibited-content controls (MUST-075), minors controls (MUST-076), account deletion (MUST-004), analytics emission (MUST-100, MUST-102, MUST-103), offline draft persistence (MUST-015), and universal-link routing (MUST-021).

**Updated 2026-08-26.** Two of those nine are now met: MUST-004 account deletion (2026-08-25) and MUST-015 offline draft persistence. MUST-017 moved from partial to met with `update_intent`. Seven remain not started, all of them push delivery, moderation, prohibited content, minors, analytics emission, delivery ranking depth, or universal links — the last blocked on the H-4 domain.

### 3.1 By requirement group

| Group | MUSTs | Met | Partial | Not started | Notes |
|---|---:|---:|---:|---:|---|
| Accounts and identity | 4 | 0 | 2 | 2 | No auth. `profiles` lacks interests, verification state, reliability |
| Intent creation | 8 | 0 | 5 | 3 | Composer UI is local-only; no draft persistence despite `expo-sqlite` installed |
| Origin and sharing | 6 | 1 | 4 | 1 | `get_public_intent` exists; no public route, no domain, no universal links |
| Reach and discovery | 8 | 2 | 3 | 3 | Reach enum and delivery-reason constraints are strong; no selector, no delivery generation |
| Responses and matching | 7 | 2 | 4 | 1 | `accept_response` is complete and idempotent; decline/reply absent |
| Coordination | 5 | 1 | 3 | 1 | Message RLS correct; no realtime, no UI |
| Resolution and trust | 5 | 0 | 3 | 2 | `reliability_aggregates` table does not exist |
| Privacy and safety | 8 | 3 | 1 | 4 | Strongest area structurally; moderation, rate limits, minors, prohibited content all absent |
| Notifications | 5 | 1 | 2 | 2 | Outbox table exists; no `devices` table, no worker |
| Accessibility | 4 | 0 | 2 | 2 | No dynamic type, no reduced motion, no state coverage |
| Analytics | 4 | 1 | 0 | 3 | Privacy CHECK is excellent; nothing emits events |
| **Total** | **64** | **11** | **29** | **24** | |

### 3.2 What is genuinely well built

Worth stating plainly, because it should not be re-litigated:

- **Data separation** (MUST-070). `intent_context` / `intent_private` and `profiles` / `profile_private` correctly implement Doc 04's location and identity protection.
- **Delivery explainability** (MUST-034). `reason_code` CHECK + NOT NULL `reason_text` makes an unexplained delivery physically impossible to insert.
- **Analytics privacy** (MUST-101). The `analytics_outbox` CHECK constraint rejects prohibited keys at the database. Doc 09's rule is enforced, not documented.
- **Idempotent acceptance** (MUST-046). `accept_response` uses `FOR UPDATE`, an expected-state guard, and returns the existing match on retry. Matches Doc 16 exactly.
- **Progressive disclosure** (MUST-045). `match_disclosures` requires a separate explicit release; acceptance alone unlocks nothing.
- **Service-only tables.** `notification_jobs` and `analytics_outbox` have RLS enabled with no policies and are excluded from the `authenticated` grant — correctly deny-all to clients.

---

## 4. Schema Gap

Doc 05 names 23 entities. 19 exist.

**Doc 05 amended 2026-08-25** to add `invitations` and `idempotency_keys`. The entities below remain absent from the schema.

**All five were added on 2026-08-25**, along with `idempotency_keys`. No entity named in Doc 05 is now absent.

| Entity | State |
|---|---|
| `verifications` | Added, self-read policy |
| `devices` | Added, self-manage policy; no write path in the app yet |
| `reliability_aggregates` | Added, populated only from confirmed undisputed outcomes |
| `moderation_actions` | Added, insert-only audit with no client grant |
| `invitations` | Added, tokens stored as SHA-256 hashes, no client grant |
| `idempotency_keys` | Added, actor-scoped fingerprint and result store |

`invitations` was not in Doc 05's entity list even though invitation-only access is a core product assumption in Doc 00 and Doc 01, and implementation plan 02 already references `redeem-invite`. **Doc 05 was amended on 2026-08-25** to add both `invitations` and `idempotency_keys`.

### 4.1 Schema observations, not defects

- `intents.version` exists and is incremented only by `accept_response`. Doc 16 requires an expected-version guard on every mutation; no other function consumes it yet.
- ~~No idempotency-key store exists.~~ **Resolved 2026-08-25**: `idempotency_keys` stores actor, operation, key, fingerprint and result. A replay returns the original result; a reused key with a different fingerprint returns `conflict`.
- ~~`responses.qualification` is free-form `jsonb` with no cap.~~ **Resolved 2026-08-25**: `submit_response` rejects more than two keys with `invalid_input`, and a test covers it.
- ~~Three read policies rely on a bare subquery inheriting the intents policy.~~ **Resolved 2026-08-25**: all three were replaced with explicit `private.can_read_intent` checks, and the missing denial tests were added.
- ~~No intent ever reaches `status = 'expired'`.~~ **Resolved 2026-08-25** by `expire_intents()`. Original finding:  Expiry is enforced only in read predicates (`can_read_intent`, `get_public_intent`), so expired intents correctly disappear — but the stored status drifts from reality, and MUST-062/Doc 09 funnel metrics will later read that column. Impl plan 02 Task 5 lists expiry; no scheduled job exists.

---

## 5. Server Function Gap

Doc 16 defines a mandatory server boundary of **9 functions**. One exists.

**Updated 2026-08-25: 14 of 16 built. Updated 2026-08-26: 15 of 16 built** — `update-intent` landed with material-edit history. Only `process-notifications` remains, and it waits on push tokens from a physical device.

| Contract function | State |
|---|---|
| `publish-intent` | **Built**, idempotent, version-guarded |
| `change-intent-reach` | **Built**, refuses to widen without disclosure confirmation |
| `submit-response` | **Built**, idempotent, enforces delivery, expiry, block and self-response rules |
| `accept-response` | **Built** as `accept_response`, now reached through `decide_response` |
| `resolve-intent` | **Built** as `close_intent`, covering resolve and withdraw |
| `release-disclosure` | **Built**, with `get_match_disclosures` for the per-column projection |
| `send-message` | **Built**, idempotent, membership and block checked |
| `create-report` | **Built**, rate limited |
| `delete-account` | **Built.** Database half tested; the Edge half exists but has not yet run against a stack |
| `redeem-invite` | **Built**, single generic error for unknown, expired and consumed |
| `confirm-intent` | **Built**, rate limited, self-confirmation rejected |
| `update-intent` | **Built 2026-08-26**, version-guarded, records a material edit by category and notifies existing respondents |
| `close-intent` | **Built** |
| `decide-response` | **Built**, neutral decline status |
| `generate-deliveries` | **Missing.** Phase 2 |
| `process-notifications` | **Missing.** Phase 3 |
| `expire_intents` (job) | **Built**, so stored status no longer drifts |
| `get_public_intent` (query) | **Built**, matches contract projection |

Implementation plans named seven more that Doc 16 omitted: `redeem-invite`, `confirm-intent`, `update-intent`, `close-intent`, `generate-deliveries`, `decide-response`, `process-notifications`. **Doc 16 was reconciled on 2026-08-25** and now specifies all sixteen. The server boundary is therefore 1 of 16 built.

### 5.1 The immediate blocker — **resolved 2026-08-25**

`publish_intent` now performs draft→live, and authentication exists, so an intent can be created, published, shared, confirmed, responded to, accepted, coordinated and resolved. The blocker described here is closed.

---

## 6. Cross-Cutting Infrastructure Not Yet Present

Each of these is required by an approved document and has no code:

| Capability | Required by |
|---|---|
| Authentication and session handling | Doc 02 MUST-001; Doc 05 |
| Idempotency key store | Doc 16 |
| Rate limiting (auth, creation, response, messaging, reporting, links) | Doc 02 MUST-077; Doc 04; Doc 05 |
| Analytics module with property allowlist | Doc 09; impl 03 Task 4, impl 05 Task 4 |
| Error tracking with scrubber (Sentry) | Doc 05; impl 05 Task 4 |
| Notification worker and Expo Push integration | Doc 05; Doc 02 MUST-080–084 |
| Realtime private channels | Doc 05; impl 04 Task 4 |
| Moderation queue and audit | Doc 02 MUST-074; Doc 04; Doc 11 |
| Retention and deletion jobs | Doc 04 retention table; Doc 02 MUST-004 |
| Prohibited-content controls | Doc 02 MUST-075; Doc 04 |
| Feature flags | Doc 11 |
| Mobile E2E (Maestro) | Doc 10 |
| Secret scanning in CI | Doc 10 CI gates |
| Staging + production Supabase projects, EAS profiles | Doc 11; Doc 14 (human-owned) |

Doc 10's CI gate list requires eight checks. The current `verify.yml` runs five (lint, typecheck, unit, database/RLS, migration-from-clean). **Missing: integration tests, analytics schema validation, secret scanning.**

---

## 7. Phase Status Against Roadmap Exit Gates

### Phase 0 — Foundation: **not complete**

Exit gate: *"A clean checkout can run the app, local database, tests, and one authenticated staging build without manual undocumented steps."*

| Element | State |
|---|---|
| Clean clone runs app + database checks | ✅ CI run #1 succeeded on `7820a0a` (both jobs green) |
| No recipient can query exact details before disclosure | ✅ pgTAP covers it |
| **Authentication creates one self-owned profile in staging** | ❌ No auth, no staging project |

Impl plan 01 Task 1's last unchecked box — "Run CI from a clean clone; expect both jobs green" — **is now satisfied** and should be ticked. The exit gate as a whole is not met: it requires authentication and a staging environment, and neither exists.

### Phases 1–7: not started

No task in impl plans 02–05 is checked.

---

## 8. Required Work, Sequenced

This follows the approved plan order. It adds nothing the documents do not already require.

### 8.0 Governance — **complete as of 2026-08-25**

All nine conflicts and seven governance defects are resolved, Doc 05 and Doc 16 are amended, and the Foundation CI checkbox is ticked and logged. Documentation is internally consistent and no longer blocks implementation.

### 8.1 Phase 1 critical path (impl plan 02)

1. `invitations` table + `redeem-invite` + auth (per C-01 resolution) + profile creation.
2. Idempotency key store — required before any mutation function.
3. `publish-intent` function + draft→live + share slug. **Unblocks the product.**
4. Draft persistence (`expo-sqlite` is already a dependency and unused).
5. Public route `/i/[shareSlug]` against `get_public_intent`; universal links; share action.
6. `confirm-intent` with self-confirmation prevention and rate limit.
7. `update-intent` / `close-intent`; scheduled expiry job.
8. Replace `native-demo` fixtures screen by screen as each real data path lands.

### 8.2 Prerequisites that are not code

Doc 14 already flags these as human-owned and they gate Phase 1's exit:

- Supabase staging project.
- Apple and Google developer accounts and identifiers (bundle ID is currently `com.piyushsharma.nearcast.dev`).
- A domain for `https://nearcast.app/i/:shareSlug` — MUST-020 cannot be met without it.
- EAS profiles.

---

## 9. Open Decisions

All seven decisions were taken on 2026-08-25 and recorded in Doc 00's decision log:

| # | Decision | Taken |
|---:|---|---|
| 1 | Authentication method | Google and Apple |
| 2 | Navigation destinations | Four; Messages folded into Activity |
| 3 | Trust display | Contextual evidence, no numeric score |
| 4 | `DESIGN.md` / `PRODUCT.md` status | Admitted as derived documents at ranks 6.1 and 2.1 |
| 5 | Token system cutover | Deferred to after Phase 1 |
| 6 | Dark mode | Deferred; removed from the alpha device matrix |
| 7 | Demo fixtures | Deleted, replaced by real queries |

Decisions 2 and 4 had no single recommendation in the original analysis and were taken by applying the precedence order. Both are reversible: reverting 2 means restoring a fifth destination and amending Docs 03, 15, and 17 first; reverting 4 means removing the derived ranks from Doc 00.

---

## Change Log

| Date | Change |
|---|---|
| 2026-08-25 | Created requirements and gap analysis against commit `7820a0a`; registered 9 documentation conflicts and 7 governance defects; scored 64 MVP MUST requirements |
| 2026-08-25 | Recorded resolution of all 9 conflicts and all 7 governance defects; updated the schema and server-boundary sections for the Doc 05 and Doc 16 amendments |
| 2026-08-25 | Re-measured after Phase 1 delivery: 34 of 64 MUST requirements met, 21 partial, 9 not started; server boundary 14 of 16; no Doc 05 entity outstanding |
| 2026-08-26 | `update-intent` built with material-edit history, satisfying MUST-017 and taking the server boundary to 15 of 16 |
| 2026-08-26 | Offline draft persistence delivered, satisfying MUST-015 |
| 2026-08-26 | Server half of account deletion and the two scheduled maintenance jobs delivered; `process-notifications` is the only contract function with no implementation |
| 2026-08-26 | MUST-074 moderation queue delivered at the database layer, with the report states aligned to Doc 04 |
| 2026-08-26 | MUST-030 to MUST-036 delivery ranking delivered with real PostGIS bands; the remaining not-started requirements are push delivery, analytics emission and universal links, all blocked outside the sandbox |
| 2026-08-26 | MUST-075 prohibited content, MUST-076 minors gate and MUST-077 rate-limit coverage delivered; of the seven not-started requirements, four remain (push delivery, moderation queue operation, analytics emission, universal links) |
