# Nearcast Codex Blocker Runbook

## Document Control

- **Status:** Derived execution instructions. **Not a governing document.**
- **Precedence:** Below implementation plans. `AGENTS.md` and the documents it names govern every step here; where this runbook and a governing document disagree, the governing document wins.
- **Created:** 2026-08-25. **Rescoped 2026-08-26** from a development runbook to a blocker runbook.
- **Audience:** Codex, running on a machine with Docker, simulators, and the toolchain recorded in `PROJECT_LOG.md`.
- **Mirror:** Mirrored in GitHub issue 17 so it can be read without a checkout. The repository copy is authoritative.

## Ownership — read this first

**Claude owns regular development. Codex clears blockers only.** Founder direction, 2026-08-26, recorded in the Doc 00 decision log.

A blocker is work that cannot be done in Claude's sandbox at all:

| Blocker class | Why Claude cannot do it | Typical request |
|---|---|---|
| Real Supabase stack | The sandbox blocks the Docker image registry | Run the real-stack baseline; regenerate `database.types.ts` |
| Device and simulator | No simulator, emulator, or physical device | Device smoke; anything about layout, keyboards, Realtime delivery, or native storage |
| Signing and store tooling | No signing identity | Development or preview builds, once the founder delivers the credentials |

Everything else — features, schema design, tests, documentation, refactors, CI configuration — is Claude's, including work that a blocker later verifies. **Codex does not pick up feature work, does not extend scope beyond the request it was given, and does not refactor code it was asked to verify.**

Two consequences worth stating plainly:

1. **A failing check is a finding to report, not a task to take on.** Fix it only if the fix is inside the request and smaller than reporting it — a typo, an obviously wrong constant. Anything else: file a GitHub issue with the exact output and stop. Never adjust, skip, or quarantine a test to get green.
2. **Do not develop on top of a blocker fix.** Clear the blocker, record the result, hand it back.

## Standing rules

1. `AGENTS.md` binds every step: test-first, no fabricated users or activity, no numeric trust score, reach never expands without informed action, exact location and contact details never in discoverable rows or payloads.
2. Work on `claude/repo-overview-vxx5d3` or a branch cut from it. Never push to `main`. Do not open a pull request unless the founder asks.
3. Record every verification result in `PROJECT_LOG.md` — pass or fail — in the same commit as the work.
4. A `403` on a GitHub issue update is the known permission gap H-10, not a failure. Record it in `PROJECT_LOG.md` and continue; the issue is updated from the Claude session afterwards.
5. Do not touch the human-led items (issues #12, #13, #14) or the deferred dark-appearance work (#11).
6. Leave the working tree clean. `expo prebuild` writes to `app.json` and `package.json`; both now declare everything prebuild needs, so a prebuild against a clean tree is a no-op. If either file still comes back modified, that is a finding — report it, do not commit it.

## When the local environment is the blocker

An environment failure is a finding like any other: record it in `PROJECT_LOG.md` and report it. It is not a Nearcast defect, and it must not be logged as a verification result — but a silent stall is worse than a recorded blocker.

**Recovery sequence**, in order. Stop as soon as `npm ci` completes and the CLI is present.

```bash
# 1. Nothing may be holding files open — ENOTEMPTY on rmdir usually means a
#    watcher or bundler still has the tree.
pkill -f "expo start"; pkill -f metro; watchman shutdown-server 2>/dev/null

# 2. Disk. Tarball corruption during install is often a full volume.
df -h /

# 3. Clean install from the lockfile. Never delete package-lock.json:
#    `npm ci` needs it, and regenerating it is a repository change.
rm -rf node_modules
npm cache clean --force
npm ci

# 4. Prove the CLI actually landed rather than assuming it did.
ls node_modules/.bin/supabase && npx supabase --version
```

**If a container is unhealthy, check whether we use it at all.** Supabase starts a stack; Nearcast uses a fraction of it. Storage was disabled on 2026-08-26 after its health check blocked `db reset` — nothing in the app touches it. If another container fails the same way, say which one: the fix may be to stop starting it rather than to make it healthy.

**If the machine is small, exclude services per run rather than editing the config.** Docker's VM memory is the constraint, not the host's. Three unused containers were removed from `config.toml` on 2026-08-26 because nothing used them; Studio and the mail catcher are different — they are useful, and turning them off for everyone to suit one machine is the wrong trade. Exclude them for a single run instead:

```bash
supabase start -x studio,mailpit          # B-2 needs postgres, auth, rest, edge-runtime
supabase start -x studio,mailpit,realtime # B-2 only; B-1 needs realtime
```

Run `supabase start --help` for the exact service names this CLI version accepts rather than guessing. **The real fix is Docker Desktop → Settings → Resources → Memory at 6 GB or more**; 3.8 GiB was measured on a developer machine on 2026-08-26 and is not enough for the stack plus Metro plus a simulator. Excluding services is how to make progress before that setting changes, not a substitute for it.

**The database work does not need `node_modules`.** The `db:*` scripts are thin wrappers around the Supabase CLI, and the CLI reads `supabase/config.toml`, the migrations and the seed — all repository files. With a broken install, use the standalone CLI and call it directly:

```bash
brew install supabase/tap/supabase
supabase start && supabase db reset && supabase test db
```

So when npm is broken, **B-2 is still fully doable and B-1 is not** — Metro needs the install, the database does not. Do B-2 rather than stalling on both.

## Open blocker queue

Work these in order. Nothing else is yours right now.

### B-1. Device smoke of the full loop (issue #4) — **highest priority**

Everything else in the product is verified by CI or by the substitute harness. This is not, and three paths in it have never executed outside a test.

**Setup:** `npm run db:start && npm run db:reset`, `.env` filled from the printed URL and publishable key, `npm run start`. iOS Simulator and the `Nearcast_API_36` AVD side by side; use the `adb reverse` Metro tunnel recorded in `PROJECT_LOG.md` for Android.

**1. The two-persona loop.**

- Device A: development sign-in as `asha@nearcast.local` (password `nearcast-local`). Compose, review, pick `adjacent_network`, publish.
- Device B: development sign-in as `dev@nearcast.local`. Dev confirmed Asha's seeded intent, so a trust connection exists — the intent must appear in For You **with its delivery reason**. Open detail, respond.
- Device A: Activity → inbox → accept. Release the exact address. Send a message.
- **Realtime, the one thing CI cannot verify:** with both rooms open, a message from A must appear on B **without pulling to refresh**. If it only arrives on the 30-second poll, the publication or the channel is broken — file it with logs.
- Device A: resolve through Nearcast. Device B: confirm the interaction happened. Asha's profile must then read `1 of 1 confirmed interactions were completed`.

**2. The local draft store** — `src/features/intents/data/draft-store.ts` has never touched a real SQLite database.

- Type a few words, force-quit, reopen. The words must return, with "Restored from this device."
- Change the reach on review, go back, return. The choice must survive.
- Publish successfully, reopen the composer. It must be empty.
- Delete a throwaway account that has an unfinished draft, sign in as someone else, open the composer. It must be empty.
- If `openDatabaseSync` fails on either platform, the app must still compose and publish. Every storage call is wrapped so a broken database degrades to "no draft" rather than a crash — **verify that, do not assume it**.

**3. The offline publish path.** Kill the network mid-publish. Expected: no navigation, no success claim, and exactly this copy — "Your draft is saved on this device. It will not be published until you are online." Restore the network, publish again: **exactly one intent must exist**, because the retry reuses the same idempotency key. Check the row count in the database, not the screen.

**4. The owner edit screen** (`edit/[intentId]`, from intent detail while draft or live) has never rendered.

- Edit the price on an intent with a pending response. The screen must say how many people have responded and that they will be told.
- The respondent's detail screen must then show "The price changed after you responded."
- An unrelated account must see no history block at all.
- A `matched` intent must refuse editing.

**5. The privacy warning at review.** Compose a statement containing a street address. The review screen must warn before publishing — and must still let the publish through. The words are the broadcaster's own.

**6. Deliberate failure states.** A bogus `nearcast://i/<uuid>` link must say "not available" without revealing whether anything exists. Check the empty feed copy, and check that dynamic type at the largest accessibility size does not truncate privacy or safety copy.

**Known and expected, do not file:** account deletion now calls the `delete-account` Edge Function, which is **not served by `npm run db:start`**. Unless you are also running `npx supabase functions serve delete-account`, deleting an account will fail with a transport error and show "Your account could not be deleted right now." That is the expected result during B-1, not a bug — proving the function works is B-2. The local draft clearing does not happen in that case either, because it only runs after the server confirms; check draft clearing through the publish path instead.

**Done when:** the loop completes on both platforms, findings are filed as separate issues with screenshots on #4, and the result is recorded in `PROJECT_LOG.md`. Do not fix findings silently.

### B-2. Run the delete-account Edge Function against the local stack (issue #7)

Written 2026-08-26 and **never executed** — authoring a Deno function needs no Docker, running one does. This is the second-highest blocker after the device smoke.

```bash
npm run db:start && npm run db:reset
npx supabase functions serve delete-account
```

Sign in as a throwaway persona, delete the account from the You screen, then check all of these:

- The response is `{ ok: true }`.
- The session is dead: the same access token is refused afterwards.
- Sign-in with that account is refused — the user is banned, **not deleted**.
- The `auth.users` row still exists, and so do the anonymized profile ("Deleted member"), the redacted responses and messages, and the `account_deletions` suppression row. If any of those are gone, the function deleted the user row and that is a serious finding: `profiles.id` cascades from it.
- Reports filed by the deleted account survive, and blocks still apply.

Also confirm the two `pg_cron` jobs registered: `select jobname, schedule from cron.job where jobname like 'nearcast_%'` must return `nearcast_expire_intents` at `*/15 * * * *` and `nearcast_apply_retention_policy` at `17 3 * * *`.

**Done when:** the checks above pass or are filed as findings, and the result is recorded in `PROJECT_LOG.md` and commented on #7.

### B-3. Real-stack baseline — CI does this now

**Verify run 2 on `feee6ff` proved CI can do the whole thing itself:** real Supabase started, every migration and the seed applied, `supabase test db`, `supabase db lint`, and `database.types.ts` regenerated with no diff — both jobs green. This is no longer a standing request.

Run it locally only when CI cannot answer the question: a failure you need to reproduce interactively, or a change CI has not seen yet.

```bash
npm run db:start && npm run db:reset && npm run db:test
npx supabase db lint --level warning --schema public,private
npm run db:types && git diff --exit-code -- src/infrastructure/supabase/database.types.ts
npm run verify
```

`database.types.ts` is hand-maintained in Claude's sandbox because the generator needs Docker. **A diff means the hand-written entry is wrong:** commit the generated file, fix whatever the compiler then flags, and say what changed.

CI now runs both jobs on every push to `claude/**` and `codex/**`, so this is a fallback for when a CI answer is not enough, not a routine step.

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
| App suite | `npm run verify` | Lint 0 problems, all Vitest and Jest suites pass (13 Vitest files with 93 tests, 14 Jest suites with 69 tests), iOS export completes |

These same checks run in CI on every pull request; running them locally first keeps CI green.

---

## Work that is no longer Codex's

Kept for history. These were runbook steps before the 2026-08-26 rescope; they are now Claude's, and Codex should not start them.

| Was | Now |
|---|---|
| Step 1 — real-stack verification (#1, #2) | Complete. Both issues closed 2026-08-26 |
| Step 3 — Edge half of account deletion and `pg_cron` (#7) | Claude's to write; Codex may be asked to run it against the local stack |
| Step 4 — Maestro flows (#9) | Claude's to author; Codex runs them on devices |

The `auth.users` warning from the old step 3 still stands wherever deletion is touched: `profiles.id` cascades from it, so deleting the row would destroy the anonymized profile, the redactions and the suppression trail the tests guarantee. **Ban or disable, never delete.**

## Blocked on the founder — not Codex's, and not Claude's

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
