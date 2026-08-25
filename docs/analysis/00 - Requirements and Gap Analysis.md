# Nearcast Requirements And Gap Analysis

## Document Control

- **Status:** Derived analysis. **Not a governing document.**
- **Precedence:** Below implementation plans. This document may not override any source in the [Nearcast Project Reference](../00%20-%20Start%20Here%20-%20Nearcast%20Project%20Reference.md) precedence order. Where it disagrees with a governing document, the governing document wins and this file must be corrected.
- **Created:** 2026-08-25
- **Baseline commit:** `7820a0a` (`main`, "Remove unused starter assets")
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
| Root documents | 4 | Two are ungoverned (see 1.2) |
| Derived artifacts | 2 | Design preview, design board image |

The governing set is genuinely complete. Every subsystem an MVP needs — product, UX, safety, architecture, permissions, design, content, analytics, QA, operations, legal — has an approved document with a change log. This is the project's strongest asset and should not be treated as overhead.

### 1.2 Governance Defects

| ID | Defect | Rule violated | Severity |
|---|---|---|---|
| G-01 | `DESIGN.md` is titled "Approved visual design contract" but is not referenced by any governing document and does not appear in the precedence order | Doc 00, Source-of-Truth Precedence | **High** |
| G-02 | `PRODUCT.md` restates product truth but is not referenced by any governing document and is not in the precedence order | Doc 00, Source-of-Truth Precedence | **High** |
| G-03 | `DESIGN.md` has no `Change Log` section | Doc 00 Document Change Rule; `PROJECT_LOG.md` Governance Rules | Medium |
| G-04 | `PRODUCT.md` has no `Change Log` section | Doc 00 Document Change Rule; `PROJECT_LOG.md` Governance Rules | Medium |
| G-05 | `README.md` and `AGENTS.md` have no `Change Log` sections | `PROJECT_LOG.md` ("Every document must keep a Change Log") | Low |
| G-06 | `DESIGN.md` names its visual authority as `/Users/piyushsharma/.codex/generated_images/...`, a path outside the repository | Doc 14 Repository Contract; reproducibility | Medium |
| G-07 | `PROJECT_LOG.md` records the project folder as a local `Downloads` path | Portability | Low |

G-01 and G-02 are the material ones. Two documents currently assert authority that the governing index does not grant them, and `DESIGN.md` actively contradicts the design documents that *are* governed (see section 2). Until this is resolved, an agent following `AGENTS.md` and an agent following `DESIGN.md` will build different products.

---

## 2. Conflict Register

Every conflict below is between approved documents, not between a document and an opinion. The recommended resolution applies the precedence order in Doc 00 mechanically. **None of these are resolved. Each needs a decision recorded in the governing document.**

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

| Status | Meaning | Count |
|---|---|---:|
| **Met** | Enforced and correct, though in every case only at the database layer | 11 |
| **Partial** | Schema or UI exists on one side of the boundary, not usable end to end | 29 |
| **Not started** | No schema, no code | 24 |

**User-reachable requirements: 0 of 64.** There is no authentication, so no requirement can be exercised by a person. Everything scored "Met" is met by the database in isolation.

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

| Missing entity | Required by | Blocks |
|---|---|---|
| `verifications` | Doc 05; MUST-003; Doc 04 risk-adaptive verification | Verification state on profiles, medium/elevated-risk gating |
| `devices` | Doc 05; MUST-083 | Push tokens, granular notification preferences |
| `reliability_aggregates` | Doc 05; MUST-062, MUST-063, SHOULD-060 | All contextual reliability |
| `moderation_actions` | Doc 05; MUST-074 | Immutable enforcement audit; pre-alpha safety gate |
| `invitations` | Impl plan 02 Task 1 (`redeem-invite`); Doc 01 invitation-only alpha | Every account creation path |

`invitations` is not in Doc 05's entity list even though invitation-only access is a core product assumption in Doc 00 and Doc 01, and an implementation plan already references `redeem-invite`. **Doc 05 needs amending to add it.**

### 4.1 Schema observations, not defects

- `intents.version` exists and is incremented only by `accept_response`. Doc 16 requires an expected-version guard on every mutation; no other function consumes it yet.
- No idempotency-key store exists. Doc 16 requires storing "request fingerprint and result" per actor/operation. Only `notification_jobs.idempotency_key` exists, which serves a different purpose. **This is required infrastructure for `publish-intent` and `submit-response`, and it does not exist.**
- `responses.qualification` is free-form `jsonb`. MUST-041 caps qualifying questions at two; nothing enforces the cap.
- Three read policies (`context_read_visible_intent`, `reach_read_visible_intent`, `confirmations_read_visible_intent`) use a bare `exists (select 1 from public.intents where id = intent_id)`. This relies on `intents`' own RLS applying inside the subquery. It most likely holds, but Doc 10 requires "every allowed case requires at least one corresponding denied case" and no denial test covers these three. **Add explicit negative pgTAP tests rather than reasoning about it.**
- No intent ever reaches `status = 'expired'`. Expiry is enforced only in read predicates (`can_read_intent`, `get_public_intent`), so expired intents correctly disappear — but the stored status drifts from reality, and MUST-062/Doc 09 funnel metrics will later read that column. Impl plan 02 Task 5 lists expiry; no scheduled job exists.

---

## 5. Server Function Gap

Doc 16 defines a mandatory server boundary of **9 functions**. One exists.

| Contract function | State |
|---|---|
| `publish-intent` | **Missing.** No draft→live path exists at all |
| `change-intent-reach` | Missing |
| `submit-response` | Missing |
| `accept-response` | **Built** as SQL function `accept_response`, no idempotency key |
| `resolve-intent` | Missing |
| `release-disclosure` | Missing |
| `send-message` | Missing |
| `create-report` | Missing |
| `delete-account` | Missing |
| `get_public_intent` (query) | **Built**, matches contract projection |

Implementation plans name seven more not in Doc 16: `redeem-invite`, `confirm-intent`, `update-intent`, `close-intent`, `generate-deliveries`, `decide-response`, `process-notifications`. **Doc 16's inventory should be reconciled with the plans** — right now the "mandatory server boundary" is incomplete relative to the work already planned.

### 5.1 The immediate blocker

`intents_update_owner` permits client writes only while `status = 'draft'`, and no function performs draft→live. Combined with the absence of auth, **an intent cannot currently be created by any actor through any path.** This is the single highest-priority gap in the repository.

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

### 8.0 Governance (do first — cheap, and it unblocks decisions)

1. Resolve C-01 (auth method) and record in Doc 15 + impl 02.
2. Resolve C-02 (navigation) and record in Doc 17 + Doc 03, or change the code.
3. Resolve C-03 (trust score) and record in Doc 07 + `DESIGN.md`.
4. Decide `DESIGN.md` / `PRODUCT.md` status (G-01, G-02): either admit them to the precedence order in Doc 00, or demote them to derived artifacts. Add change logs (G-03, G-04, G-05).
5. Amend Doc 05 to add `invitations`; reconcile Doc 16's function inventory with the implementation plans.
6. Tick impl 01 Task 1's CI box; record the CI result in `PROJECT_LOG.md`.

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

| # | Decision | Options | Recommendation |
|---:|---|---|---|
| 1 | Authentication method | Google/Apple · Email-phone OTP | Google/Apple (Doc 02 outranks) |
| 2 | Navigation destinations | 4 per Doc 03/17 · 5 as shipped | Amend docs or fold Messages into Activity — do not leave both |
| 3 | Trust display | Numeric `Trust 812` · Contextual evidence | Contextual (Docs 01/04/08 outrank) |
| 4 | `DESIGN.md` and `PRODUCT.md` status | Admit to precedence order · Demote to derived | Decide explicitly; either is fine, ambiguity is not |
| 5 | Token system cutover | Before Phase 1 · After Phase 1 | After — the rename touches every component |
| 6 | Dark mode | Phase 1 scope · Defer | Defer and amend Doc 10's device matrix |
| 7 | Demo fixtures | Gate behind dev flag now · Accept until Phase 1 | Gate if anyone outside the founder will open a build |

---

## Change Log

| Date | Change |
|---|---|
| 2026-08-25 | Created requirements and gap analysis against commit `7820a0a`; registered 9 documentation conflicts and 7 governance defects; scored 64 MVP MUST requirements |
