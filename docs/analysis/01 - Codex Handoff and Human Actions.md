# Nearcast Codex Handoff And Human Actions

## Document Control

- **Status:** Derived plan. **Not a governing document.**
- **Precedence:** Below implementation plans, alongside [Requirements and Gap Analysis](./00%20-%20Requirements%20and%20Gap%20Analysis.md). It may not override any governing source, and it may not introduce product behavior that `docs/` does not already require.
- **Created:** 2026-08-25
- **Baseline commit:** `8bb303c` on `claude/repo-overview-vxx5d3`
- **Purpose:** Record everything the Claude Code session could not complete, split by *why*, with an executable plan for each. Work items marked `codex` are tracked as GitHub issues on this repository and are ready to pick up. Work items marked `human-led` stay with the founder and must not be attempted by an agent.

## How To Use This Document

Every item below has a matching GitHub issue. The issue carries the executable detail; this document carries the reasoning and the ordering. **Execution now starts from the [Codex Execution Runbook](./02%20-%20Codex%20Execution%20Runbook.md)** (mirrored in GitHub issue 17), which sequences the currently actionable steps with exact expected outputs.

Two rules apply to every `codex` item, from `AGENTS.md` and Doc 14:

1. Write the failing test before the production behaviour.
2. Run `npm run verify`, and `npm run db:reset && npm run db:test` for any database change, before claiming the item complete. Record the result in `PROJECT_LOG.md`.

---

## 1. Why This Document Exists

The Claude Code session ran in a sandboxed cloud container. Three classes of work were left undone, and they need different owners:

| Class | Why it stopped | Owner |
|---|---|---|
| **A. Environment-blocked** | The container blocks the Docker image registry and has no simulator, device, or signing identity. The work is ordinary and well understood; it simply could not run here. | `codex`, locally |
| **B. Out of delivered scope** | Phase 2 to Phase 4 of the roadmap. Not attempted, by design — Phase 1 was the agreed slice. | `codex` |
| **C. Human-led** | Accounts, credentials, domains, money, and legal judgement. No agent should hold these. | Founder |

Class A matters most and is listed first, because two of its items **verify work that is currently unverified**.

---

## 2. Class A — Blocked By This Environment

The container returned `403 Forbidden` from `production.cloudfront.docker.com` for every image layer, so `npx supabase start` could not run. Local PostgreSQL 16 with PostGIS and pgTAP was substituted, plus a hand-written bootstrap providing the `auth` schema, `auth.uid()`, and the `anon` / `authenticated` / `service_role` roles. All 83 database assertions pass against that harness. It is faithful, but it is not Supabase.

### A-1. Regenerate `database.types.ts` and reconcile drift — **highest priority** · [#1](https://github.com/ninjatech68-blip/Nearcast/issues/1)

`npm run db:types` needs the same blocked container, so the generated types file was **extended by hand** to match the Phase 1 migration. It typechecks and the app compiles against it, but it has never been produced by the generator.

This is the single least-trustworthy artefact in the repository. Everything the app does against the new tables and functions is typed against a file a human wrote from memory of the SQL.

**Plan:** run `npm run db:start && npm run db:reset && npm run db:types`, diff the result against the committed file, and treat any difference as a defect in the hand-written version. Fix call sites if argument names or nullability differ. Re-run `npm run verify`.

**Update 2026-08-25: now CI-enforced.** The Verify workflow's database job regenerates the types on the real stack and fails on any drift, so the first pull-request run executes this check without a local machine. A local run remains useful only for fixing whatever the gate finds.

**Closed 2026-08-26.** Executed on the real stack in `codex/issue-17-runbook` and merged. The generator did find drift — the hand-written file was missing `account_deletions`, `devices`, `idempotency_keys`, `invitations`, `moderation_actions`, and `notification_jobs`, among other differences — and the generated file replaced it. No call site broke: `tsc --noEmit` is clean against the generated types.

### A-2. Re-run the database suites on the real Supabase stack · [#2](https://github.com/ninjatech68-blip/Nearcast/issues/2)

Confirm the 9 foundation and 74 Phase 1 assertions pass under `supabase test db` rather than the substitute harness, and run `npx supabase db lint --level warning --schema public,private` to catch anything the local cluster's defaults hid.

**Plan:** `npm run db:start && npm run db:reset && npm run db:test`, then the lint. Any divergence from the 83/83 recorded on 2026-08-25 is a real finding and should be fixed before Class B work begins.

**Update 2026-08-25: now CI-enforced.** The database job runs every migration, the seed, all pgTAP suites (152 assertions at this writing), and `supabase db lint` on genuine Supabase for every pull request. The Realtime *subscription delivery* is the one part CI cannot exercise; that stays with the device pass (#4).

**Closed 2026-08-26.** All 152 assertions passed on genuine Supabase, matching the substitute harness exactly. The lint found one real warning — an untyped enum assignment in `public.close_intent` — fixed with an explicit `public.intent_status` cast. Realtime subscription delivery remains open in #4.

### A-3. Configure the Google and Apple auth providers and verify sign-in end to end · [#3](https://github.com/ninjatech68-blip/Nearcast/issues/3)

`signInWithProvider` is written against Supabase's OAuth flow but has never completed a real round trip: no provider is configured in `supabase/config.toml`, and no client IDs exist.

**Plan:** configure both providers for the local stack, complete a real sign-in on iOS and Android development builds, and verify that `redeem_invite` creates the profile and the route guard releases the feed. Depends on **H-1** and **H-2** for real credentials.

### A-4. Device smoke test of the Phase 1 loop · [#4](https://github.com/ninjatech68-blip/Nearcast/issues/4)

No screen written in this session has ever rendered on a device or simulator. Typecheck, unit tests, component tests and the iOS bundle all pass, which catches a great deal but not layout, safe areas, keyboard behaviour, or the OAuth sheet.

**Plan:** iOS Simulator and the `Nearcast_API_36` AVD already recorded in `PROJECT_LOG.md`. Walk sign-in, invitation redemption, composer, review and reach, publish, feed, intent detail, response. Capture the failures; do not fix silently.

### A-5. Maestro end-to-end harness · [#9](https://github.com/ninjatech68-blip/Nearcast/issues/9)

Doc 10 requires mobile E2E for the core loop and lists ten flows. None exists.

**Plan:** add Maestro, implement the authentication, create-preview-publish, shared-link, respond, accept, coordinate, resolve, block and report flows, and wire them into the release branch job described in Doc 10.

### A-6. EAS build profiles · [#15](https://github.com/ninjatech68-blip/Nearcast/issues/15)

`eas.json` does not exist. Doc 11 requires development, preview and production profiles.

**Plan:** create the profiles, produce a development and a preview binary for both platforms, and record the outcome. Depends on **H-1** and **H-3**.

---

## 3. Class B — Not Yet Built

These were never in the delivered slice. The database boundary for several of them already exists, so the remaining work is smaller than it looks — check each issue before assuming otherwise.

### Phase 2 — Discovery and controlled reach

| ID | Item | Issue | Note |
|---|---|---|---|
| B-1 | `generate-deliveries` with PostGIS eligibility and ranking | [#5](https://github.com/ninjatech68-blip/Nearcast/issues/5) | **The feed is empty without this.** Deliveries currently have to be inserted by hand. This is the highest-value Class B item. |
| B-2 | Feed hide, save and not-relevant actions | [#6](https://github.com/ninjatech68-blip/Nearcast/issues/6) | `intent_deliveries.hidden_at` and `feedback` already exist with an update policy; only the UI and mutation are missing. |

### Phase 3 — Responses and coordination

| ID | Item | Issue | Note |
|---|---|---|---|
| B-3 | Broadcaster inbox: `RequestCard`, accept, reply, decline | [#6](https://github.com/ninjatech68-blip/Nearcast/issues/6) | `decide_response` exists and is tested. UI only. |
| B-4 | Coordination room screen | [#6](https://github.com/ninjatech68-blip/Nearcast/issues/6) | `send_message` exists and is tested. UI only. |
| B-5 | Realtime private channels | [#6](https://github.com/ninjatech68-blip/Nearcast/issues/6) | Persist before broadcast; Postgres stays the source of truth. |
| B-6 | `process-notifications`, Expo Push, and a `devices` write path | [#6](https://github.com/ninjatech68-blip/Nearcast/issues/6) | `notification_jobs` is already populated by the response and message functions. |

### Phase 4 — Resolution, trust and safety

All five are tracked in [#7](https://github.com/ninjatech68-blip/Nearcast/issues/7).

| ID | Item | Note |
|---|---|---|
| B-7 | Resolution and outcome confirmation UI | `close_intent` and `confirm_interaction_outcome` exist and are tested. UI only. |
| B-8 | `delete-account` and retention jobs | MUST-004. The only contract function with no implementation at all. |
| B-9 | Moderation queue and moderator tooling | `moderation_actions` exists as an insert-only audit with no client grant; `private.is_moderator()` reads app metadata. |
| B-10 | Prohibited-content controls and the minors gate | MUST-075, MUST-076. Pre-alpha safety gate. |
| B-11 | Analytics module, PostHog, Sentry scrubber | `analytics_outbox` already rejects prohibited keys at the database; nothing emits events yet. |

### Cross-cutting

| ID | Item | Issue | Note |
|---|---|---|---|
| B-12 | Offline draft persistence | [#8](https://github.com/ninjatech68-blip/Nearcast/issues/8) | MUST-015. `expo-sqlite` is already a dependency and unused. |
| B-13 | Universal links and the share action | [#8](https://github.com/ninjatech68-blip/Nearcast/issues/8) | MUST-020, MUST-021. Depends on **H-4** for a domain. |
| B-14 | Zod validation at the publish boundary and material-edit history | [#8](https://github.com/ninjatech68-blip/Nearcast/issues/8) | MUST-017. Server validates; the shared schema layer Doc 05 requires is thin. |
| B-15 | Missing CI gates | [#9](https://github.com/ninjatech68-blip/Nearcast/issues/9) | Doc 10 requires eight; `verify.yml` runs five. Missing: integration tests, analytics schema validation, secret scanning. |
| B-16 | Accessibility pass | [#10](https://github.com/ninjatech68-blip/Nearcast/issues/10) | MUST-090 to MUST-093. Dynamic type, reduced motion, VoiceOver and TalkBack over the core loop. |
| B-17 | Token cutover and dark appearance | [#11](https://github.com/ninjatech68-blip/Nearcast/issues/11) | The C-07 and C-08 resolutions deferred both past Phase 1. Track, do not start early: the rename touches every component. |

---

## 3.1 Bypasses In Place — human items no longer block testing

Recorded 2026-08-25. The human items in Class C are monitored separately and are **not** development blockers. Each pending item has a deliberate, clearly-labelled bypass so building, testing, and review continue; the bypass is removed when the human item lands.

| Pending human item | Bypass | Removal trigger |
|---|---|---|
| H-1, H-2 OAuth credentials | Development-only password sign-in against the seeded personas (`src/features/auth/dev-sign-in.ts`), gated out of production and rendered as a labelled testing entrance on the sign-in screen | Real providers verified in [#3](https://github.com/ninjatech68-blip/Nearcast/issues/3) |
| H-4 share domain | `EXPO_PUBLIC_SHARE_BASE_URL` is optional; `buildShareLink` falls back to `nearcast://i/<slug>` scheme links | Set the variable when the domain exists; no code change |
| H-5 staging project | The local Supabase stack is the test environment, with seeded personas and two seeded invitation tokens (`local-invite-1`, `local-invite-2`) | Staging created in [#13](https://github.com/ninjatech68-blip/Nearcast/issues/13) |
| H-10 Codex issue-write permission | Codex records every result in `PROJECT_LOG.md` in the same commit as the work, and the Claude session mirrors it onto the issue | Issue read/write granted to the Codex integration; tracked in [#16](https://github.com/ninjatech68-blip/Nearcast/issues/16) |

Also delivered on 2026-08-25, ahead of the handoff order: `generate_deliveries` ([#5](https://github.com/ninjatech68-blip/Nearcast/issues/5)) is built with 18 pgTAP assertions and wired into the publish flow, so the For You feed populates end to end locally. Remaining on #5: real-stack verification, PostGIS distance bands, and the full ranking signals.

## 4. Class C — Human-Led, Monitored Separately

No agent should attempt these. They need an identity, a payment method, or a legal judgement. Several Class A and B items are blocked until they land.

| ID | Item | Issue | Blocks |
|---|---|---|---|
| H-1 | Apple Developer account, App ID, and the Sign in with Apple capability | [#12](https://github.com/ninjatech68-blip/Nearcast/issues/12) | A-3, A-6 |
| H-2 | Google Cloud OAuth client for Android, iOS and web | [#12](https://github.com/ninjatech68-blip/Nearcast/issues/12) | A-3 |
| H-3 | Expo organisation and EAS credentials | [#12](https://github.com/ninjatech68-blip/Nearcast/issues/12) | A-6 |
| H-4 | A domain for `https://nearcast.app/i/:shareSlug`, with hosting for the no-app fallback | [#13](https://github.com/ninjatech68-blip/Nearcast/issues/13) | B-13, and MUST-020 cannot be met without it |
| H-5 | Supabase staging and production projects, with secrets held outside agent tooling | [#13](https://github.com/ninjatech68-blip/Nearcast/issues/13) | Phase 0 exit gate, Doc 11 |
| H-6 | PostHog and Sentry projects | [#13](https://github.com/ninjatech68-blip/Nearcast/issues/13) | B-11 |
| H-7 | Legal review of Terms and Privacy Policy against Doc 12, including India-specific obligations | [#14](https://github.com/ninjatech68-blip/Nearcast/issues/14) | Public beta |
| H-8 | Moderation rota, support contact, and store privacy declarations | [#14](https://github.com/ninjatech68-blip/Nearcast/issues/14) | Pre-alpha safety gate |
| H-9 | Selecting and inviting the 30 to 50 person Bengaluru alpha cohort | [#14](https://github.com/ninjatech68-blip/Nearcast/issues/14) | Phase 5 |
| H-10 | Issue read/write on this repository for the integration Codex authenticates as — a permissions grant only, needing no credentials, keys, or repository write beyond issues | [#16](https://github.com/ninjatech68-blip/Nearcast/issues/16) | Nothing; it makes Codex able to close its own work instead of relying on a manual relay |

Doc 14 already lists most of these as human-owned. This document does not change their status; it records what they block.

---

## 5. Suggested Order

Verification first, because two items check work that is currently unverified, and one of them could invalidate app code.

```text
#1   A-1  regenerate types and reconcile     <- before any further app work
#2   A-2  database suites on the real stack
  |
#12  H-1 H-2 -----> #3  A-3  auth providers, real sign-in
  |
#4   A-4  device smoke test of the Phase 1 loop
  |
#5   B-1  generate-deliveries                <- the feed is empty until this exists
  |
#6   B-2 B-3 B-4 B-5 B-6    Phase 2 feedback and Phase 3, mostly UI over existing functions
  |
#7   B-7 B-8 B-9 B-10 B-11  Phase 4 safety and telemetry
  |
#9   A-5 Maestro E2E and B-15 CI gates       <- once the loop is stable enough to assert on
  |
#10  B-16 accessibility     #8  B-12 B-13 B-14
  |
#15  A-6  EAS builds  ->  Phase 5 closed alpha
```

Issue [#11](https://github.com/ninjatech68-blip/Nearcast/issues/11) (B-17) sits outside this chain by decision.

Start B-17 only when no feature work is in flight.

## 6. What "Done" Means For A Codex Item

Doc 14's Definition of Done applies unchanged. In practice, for each issue:

- The acceptance criteria in the issue pass.
- Positive **and** negative permission paths are tested; Doc 10 requires a denied case for every allowed case.
- Retries cannot duplicate a consequential record.
- Loading, empty, error, offline and restricted states exist where the screen reads data.
- Analytics and push payloads contain no intent text, message body, exact coordinate, contact detail, or private-group name.
- Governing documents are updated in the same change, not afterwards.
- `npm run verify` output, and `npm run db:test` where relevant, is recorded in `PROJECT_LOG.md`.

## Change Log

| Date | Change |
|---|---|
| 2026-08-25 | Created the Codex handoff, splitting outstanding work into environment-blocked, unbuilt scope, and human-led, with a suggested order and matching GitHub issues |
| 2026-08-25 | Added the bypass register: development sign-in, configurable share base, and local-stack testing keep development active while human items stay a monitoring track |
| 2026-08-25 | Pointed execution at the new runbook, which sequences the actionable steps with exact expected outputs |
| 2026-08-26 | Closed A-1 and A-2 with the real-stack results and recorded the two defects the run found |
| 2026-08-26 | Added H-10, the Codex issue-write permission gap, with the reporting relay that covers it meanwhile |
