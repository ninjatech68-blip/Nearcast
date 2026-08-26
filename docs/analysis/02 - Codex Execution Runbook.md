# Nearcast Codex Execution Runbook

## Document Control

- **Status:** Derived execution instructions. **Not a governing document.**
- **Precedence:** Below implementation plans. `AGENTS.md` and the documents it names govern every step here; where this runbook and a governing document disagree, the governing document wins.
- **Created:** 2026-08-25
- **Baseline commit:** `4aa78a8` on `claude/repo-overview-vxx5d3`
- **Audience:** Codex, running on a machine with Docker, simulators, and the toolchain already recorded in `PROJECT_LOG.md`.
- **Mirror:** This runbook is mirrored in a GitHub issue so it can be read without a checkout. The repository copy is authoritative.

## Standing Rules — read before step 1

1. `AGENTS.md` binds every step: test-first, no fabricated users or activity, no numeric trust score, reach never expands without informed action, exact location and contact details never in discoverable rows or payloads.
2. Work on `claude/repo-overview-vxx5d3` (or a branch cut from it). Never push to `main`. Do not open a pull request unless the founder asks.
3. Record every verification result in `PROJECT_LOG.md` — pass or fail — in the same commit as the work.
4. A failing check is a finding, not an obstacle: fix it if it is small and in scope, otherwise file it as a GitHub issue with the exact output. Never adjust a test to make it pass; never skip, disable, or quarantine one.
5. Do not touch the human-led items (issues #12, #13, #14) or the deferred token/dark-mode remainder (#11). The bypass register in issue #16 says what covers each pending human item.

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
| Database suites | `npm run db:start && npm run db:reset && npm run db:test` | 152 pgTAP assertions across 5 files: foundation 9, phase1 74, journey 25, phase2 18, phase4 26 |
| Database lint | `npx supabase db lint --level warning --schema public,private` | No errors in `public` or `private` |
| Type drift | `npm run db:types && git diff --exit-code -- src/infrastructure/supabase/database.types.ts` | Empty diff. A diff means the hand-written types were wrong: commit the regenerated file and fix any call site the compiler then flags |
| App suite | `npm run verify` | Lint 0 problems, all Vitest and Jest suites pass (35 Jest assertions), iOS export completes |

These same checks run in CI on every pull request; running them locally first keeps CI green.

---

## Step 1 — Real-stack verification (issues #1, #2)

Run the four baseline checks above on the real Supabase stack. This is the first time the migrations, RLS policies, and 152 assertions execute on genuine Supabase rather than the substitute PostgreSQL harness, so treat any divergence as a real finding.

**Watch specifically for** (the harness could have hidden these):

- The `42501` grant-denial assertions on `invitations`, `idempotency_keys`, `moderation_actions`, and `notification_jobs` — they depend on Supabase's default grants not silently re-granting.
- `security definer` functions resolving `extensions.digest` and `extensions.st_astext` under `search_path = ''`.
- `private.is_moderator()` reading `request.jwt.claims -> app_metadata`, shaped by real Supabase Auth.

**Done when:** all four checks green, results recorded in `PROJECT_LOG.md`, issues #1 and #2 closed with the outputs.

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
4. **Deliberate failure states:** kill the network mid-publish (must not claim success); open a bogus `nearcast://i/<uuid>` link (must say "not available" without revealing anything); check the empty feed copy; check dynamic type at a large accessibility size does not truncate privacy copy.
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
