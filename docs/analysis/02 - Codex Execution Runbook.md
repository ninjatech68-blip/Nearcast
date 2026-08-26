# Nearcast Codex Execution Runbook

## Document Control

- **Status:** Derived execution instructions. **Not a governing document.**
- **Precedence:** Below implementation plans. `AGENTS.md` and the documents it names govern every step here; where this runbook and a governing document disagree, the governing document wins.
- **Created:** 2026-08-25
- **Baseline commit:** `4aa78a8` on `claude/repo-overview-vxx5d3`, moved forward on 2026-08-26 after step 1 merged and the material-edit work landed. Always pull the branch head; the baseline table below is kept current.
- **Audience:** Codex, running on a machine with Docker, simulators, and the toolchain already recorded in `PROJECT_LOG.md`.
- **Mirror:** This runbook is mirrored in a GitHub issue so it can be read without a checkout. The repository copy is authoritative.

## Standing Rules — read before anything else

1. `AGENTS.md` binds every step: test-first, no fabricated users or activity, no numeric trust score, reach never expands without informed action, exact location and contact details never in discoverable rows or payloads.
2. Work on `claude/repo-overview-vxx5d3` (or a branch cut from it). Never push to `main`. Do not open a pull request unless the founder asks.
3. Record every verification result in `PROJECT_LOG.md` — pass or fail — in the same commit as the work.
4. A failing check is a finding, not an obstacle: fix it if it is small and in scope, otherwise file it as a GitHub issue with the exact output. Never adjust a test to make it pass; never skip, disable, or quarantine one.
5. Do not touch the human-led items (issues #12, #13, #14) or the deferred token/dark-mode remainder (#11). The bypass register in issue #16 says what covers each pending human item.
6. If a GitHub issue update returns `403`, that is the known permission gap H-10, not a failure of the step. Record the result in `PROJECT_LOG.md` in the same commit as the work and continue; the issue is updated from the Claude session afterwards.

## Round 2 — start here (2026-08-26)

Step 1 is complete and merged. Two further pieces of work landed after it, and **neither has ever run on real Supabase or on a device**. Do these in order; the numbered steps below are unchanged and still authoritative for the detail.

**Pull first:** `git checkout claude/repo-overview-vxx5d3 && git pull`. Head is `53048e7` or later; version `0.7.0`.

### R-1. Re-run the four baseline checks (highest priority)

The baseline table below has moved: **182 pgTAP assertions across six suites**, and 65 Jest tests. Two specific risks are new, and the checks exist to catch them:

- **`database.types.ts` was hand-edited again.** The `update_intent` entry was written by hand in the same file the generator owns, because this environment still cannot run `supabase gen types`. If `npm run db:types` produces a diff, **the hand-written entry is the defect** — commit the generated file and fix whatever the compiler then flags in `src/features/intents/data/intent-queries.ts`. This is the single most likely thing to be wrong in the branch.
- **A new migration and a new policy.** `supabase/migrations/20260826120000_nearcast_intent_edits.sql` adds `public.update_intent` and the `events_read_material_edits` policy. Run `supabase db lint` over it specifically — the last migration's only real finding was a lint warning the substitute harness could not see.

**Done when:** all four checks green on the real stack, results in `PROJECT_LOG.md`. If the type gate fires, fix and push before starting R-2.

### R-2. Device smoke — now covering two paths that have never executed

Run **Step 2** below in full. It has been extended, and two of its checks exercise code that has never run outside a test:

1. **The local draft store** (`src/features/intents/data/draft-store.ts`) has never touched a real SQLite database. Every unit test ran against a fake. On device:
   - Type a few words in the composer, force-quit the app, reopen it. The words must come back with "Restored from this device."
   - Change the reach on the review screen, go back, return. The reach choice must survive.
   - Publish successfully, then reopen the composer. It must be **empty** — the draft is cleared on publish.
   - Delete a throwaway account with an unfinished draft, sign in as someone else, open the composer. It must be **empty**.
   - If `openDatabaseSync` fails on either platform, the app must still compose and publish normally — every storage call is wrapped, and a broken database must degrade to "no draft", never to a crash. Verify this rather than assuming it.
2. **The offline publish path.** Kill the network mid-publish. Expected: no navigation, no success claim, and exactly this copy — "Your draft is saved on this device. It will not be published until you are online." Then restore the network and press publish again: **exactly one intent must exist**, because the retry reuses the same idempotency key. Check the row count, not just the screen.
3. **The owner edit screen** (`edit/[intentId]`, reachable from intent detail while the intent is draft or live) has never rendered. Walk it: edit the price on an intent that has a pending response, confirm the respondent's detail screen then shows "The price changed after you responded.", and confirm an account with no relationship to the intent sees no history block at all.

**File findings as issues. Do not fix them silently.**

### R-3. Then continue with Step 3 and Step 4

Unchanged. Step 3 (Edge half of account deletion plus `pg_cron`) is the next real build; Step 4 (Maestro) follows. The Maestro flow list in #9 should gain two cases from R-2: draft survives a restart, and an offline publish does not duplicate.

### What is deliberately *not* yours right now

- The structured composer fields (start time, deadline, quantity, requirements). The columns and `update_intent` accept them; the composer does not collect them yet. Leave it — it is queued behind the device pass.
- `process-notifications`. It is the last unbuilt function in the Doc 16 boundary and needs push tokens from a physical device, so it belongs after R-2.
- Anything in the blocked queue in Step 5.

---

## What is needed, exactly

**Hardware and tools** (versions from the working setup recorded in `PROJECT_LOG.md`):

- Node 22, npm 10+
- Docker Desktop or a compatible daemon, running
- Xcode with an iOS Simulator; CocoaPods 1.13.0
- Android SDK platform 36 with the `Nearcast_API_36` AVD, `adb` and `emulator` on PATH
- No paid accounts, no production credentials, no service-role keys. Everything below runs on the local stack.

**Repository state:**

```bash
git clone https://github.com/ninjatech68-blip/Nearcast
cd Nearcast
git checkout claude/repo-overview-vxx5d3
npm ci
cp .env.example .env
```

**Seeded local credentials** (local stack only, created by `supabase/seed.sql`):

- Personas: `asha@nearcast.local`, `dev@nearcast.local`, `mira@nearcast.local` — password `nearcast-local`, used through the labelled development sign-in on the sign-in screen (never available in production).
- Invitation tokens for redemption testing: `local-invite-1`, `local-invite-2` — opened as `nearcast://invite/local-invite-1` by a signed-in user who has no profile yet.
- After `npm run db:start`, copy the printed API URL and publishable key into `.env`.

**Expected baseline before any new work** — if any of these fail, stop and fix or file first:

| Check | Command | Expected |
|---|---|---|
| Database suites | `npm run db:start && npm run db:reset && npm run db:test` | 182 pgTAP assertions across 6 files: foundation 9, phase1 74, journey 25, phase2 18, phase4 26, intent edits 30 |
| Database lint | `npx supabase db lint --level warning --schema public,private` | No errors in `public` or `private` |
| Type drift | `npm run db:types && git diff --exit-code -- src/infrastructure/supabase/database.types.ts` | Empty diff. A diff means the hand-written types were wrong: commit the regenerated file and fix any call site the compiler then flags |
| App suite | `npm run verify` | Lint 0 problems, all Vitest and Jest suites pass (9 Vitest files with 53 tests, 14 Jest suites with 65 tests), iOS export completes |

These same checks run in CI on every pull request; running them locally first keeps CI green.

---

## Step 1 — Real-stack verification (issues #1, #2)

Run the four baseline checks above on the real Supabase stack. This was the first time the migrations, RLS policies, and the pgTAP suites executed on genuine Supabase rather than the substitute PostgreSQL harness, so any divergence is a real finding. **R-1 above repeats this for the work that landed after it.**

**Watch specifically for** (the harness could have hidden these):

- The `42501` grant-denial assertions on `invitations`, `idempotency_keys`, `moderation_actions`, and `notification_jobs` — they depend on Supabase's default grants not silently re-granting.
- `security definer` functions resolving `extensions.digest` and `extensions.st_astext` under `search_path = ''`.
- `private.is_moderator()` reading `request.jwt.claims -> app_metadata`, shaped by real Supabase Auth.

**Done when:** all four checks green, results recorded in `PROJECT_LOG.md`, issues #1 and #2 closed with the outputs.

**Status: complete (2026-08-26).** Executed on the real stack from `codex/issue-17-runbook` and merged into `claude/repo-overview-vxx5d3`. Two real findings, both fixed in that branch: a Supabase lint warning on the enum assignment in `public.close_intent` (fixed with an explicit `public.intent_status` cast) and genuine generated-type drift (fixed by committing the generator output for `database.types.ts`; no call site broke). The 152 assertions, the `42501` grant denials, the `search_path = ''` resolution of `extensions.digest`, and `private.is_moderator()` under real Supabase Auth all behaved as the substitute harness predicted. Issues #1, #2, and #18 are closed; start at step 2.

## Step 2 — Device smoke of the full loop (issue #4)

No screen in this branch has ever rendered on a device. Everything is testable today through the development bypasses — no OAuth credentials, no domain, no staging project needed.

1. `npm run db:start && npm run db:reset`, `.env` filled, `npm run start`.
2. iOS Simulator and the `Nearcast_API_36` AVD side by side (use the `adb reverse` Metro tunnel recorded in `PROJECT_LOG.md` for Android).
3. **Two-persona walk:**
   - Device A: development sign-in as `asha@nearcast.local`. Compose an intent, review, pick `adjacent_network` reach, publish.
   - Device B: development sign-in as `dev@nearcast.local`. Dev confirmed Asha's seeded intent, so a trust connection exists — the new intent should appear in For You **with its delivery reason**. Open detail, respond.
   - Device A: Activity → inbox → accept. Release the exact address. Send a message.
   - **Realtime check (the one thing CI cannot verify):** with both rooms open, a message sent from A must appear on B **without pulling to refresh**. If it only arrives via the 30-second poll, the Realtime publication or channel is broken — file it with logs.
   - Device A: resolve through Nearcast. Device B: the room shows "Did this interaction happen?" — confirm it.
   - Device B: verify Asha's reliability line reads `1 of 1 confirmed interactions were completed` on her profile.
4. **Deliberate failure states:** kill the network mid-publish — it must not claim success, and it must show "Your draft is saved on this device. It will not be published until you are online." Then restore the network and publish again: the same idempotency key is reused, so exactly one intent must exist. Force-quit the app mid-compose and reopen: the draft must come back with "Restored from this device"; open a bogus `nearcast://i/<uuid>` link (must say "not available" without revealing anything); check the empty feed copy; check dynamic type at a large accessibility size does not truncate privacy copy.
5. Also walk: invitation redemption with `local-invite-2` using `mira@nearcast.local` (has a profile — expect "already a member"), sign-out, feed "Not relevant", and account deletion on a throwaway persona.

**Done when:** loop completes on both platforms, findings filed as issues (do not fix silently), screenshots attached to #4, recorded in `PROJECT_LOG.md`.

## Step 3 — Edge half of account deletion, and job scheduling (issue #7, B-8)

The database half is built and tested (`delete_account`, `apply_retention_policy`). Add the server half:

1. **`supabase/functions/delete-account/`** — verify the caller's JWT; call `delete_account('DELETE')` with a client scoped to that JWT (the function derives the actor from `auth.uid()`); then with the service role revoke all of the user's sessions and permanently disable sign-in via the Auth admin API.
   **Critical:** do **not** delete the `auth.users` row. `profiles.id` references it `ON DELETE CASCADE`, and deleting it would destroy the anonymized profile, the redactions, and the suppression trail the tests guarantee. Ban/disable, never delete.
2. **Scheduling** — on the local stack, `pg_cron`: `expire_intents()` every 15 minutes; `apply_retention_policy()` daily. Commit as a migration guarded on the extension's availability, same pattern as the Realtime migration.
3. Test-first where the runtime allows; at minimum, an integration script that exercises the function against the local stack, plus pgTAP for the cron registrations.

**Done when:** deletion from the You screen ends with the session actually revoked, jobs registered, `npm run db:test` still 100%, recorded and commented on #7.

## Step 4 — Maestro flows (issue #9)

Author under `.maestro/`, run against the local stack with the dev sign-in. Cover the ten flows listed in #9; the two-persona walk from step 2 is the template for the core loop. Wire into the release-branch job only — not every PR.

## Step 5 — Blocked queue: check before starting

| Item | Blocked on |
|---|---|
| Real Google/Apple sign-in (#3) | Founder delivers #12 (H-1, H-2) |
| EAS build profiles (#15) | Founder delivers #12 (H-3) |
| Push notifications (B-6 in #6) | Devices write path is buildable now; delivery needs Expo push tokens from a physical device |
| Moderation tooling (B-9 in #7) | Founder decides the moderator-role holder in #14 |
| PostHog/Sentry wiring (B-11 remainder) | Founder delivers #13 (H-6). The client module is ready: one `setTransport()` call |
| MUST-043 Reply | Founder's decision, recorded in implementation plan 04's change log |

## Change Log

| Date | Change |
|---|---|
| 2026-08-25 | Created the Codex execution runbook: prerequisites, baseline expectations, and five ordered steps with exact done-criteria |
| 2026-08-26 | Marked step 1 complete after the real-stack run, recorded its two findings, and pointed execution at step 2 |
| 2026-08-26 | Added the standing rule for the H-10 issue-write gap so a `403` never stalls a step |
| 2026-08-26 | Refreshed the baseline table for the material-edit and offline-draft work: 182 pgTAP assertions across six suites, 65 Jest tests |
| 2026-08-26 | Added the round 2 instruction set: re-verify the hand-edited types and the new migration, then smoke the draft store, the offline publish path, and the owner edit screen on device |
