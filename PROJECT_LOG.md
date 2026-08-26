# Nearcast Project Log

This log records important packaging, setup, and version-control decisions for the Nearcast mobile app project.

## Current Project

- Project name: Nearcast App Project
- Repository: `ninjatech68-blip/Nearcast`
- Product: Trust-aware intent broadcasting mobile app
- Build type: Greenfield project with no old app or legacy codebase dependency
- Initial stack: Expo, React Native, TypeScript, Supabase, PostgreSQL/PostGIS
- Source of truth: [Start Here - Nearcast Project Reference](./docs/00%20-%20Start%20Here%20-%20Nearcast%20Project%20Reference.md)

## Version History

| Version | Date | Status | Notes |
|---|---|---|---|
| 0.1.0 | 2026-08-24 | Initial packaged project | Created clean Downloads project folder, normalized documentation names, included app scaffold, Supabase foundation, tests, and AI agent instructions |
| 0.1.1 | 2026-08-24 | Greenfield clarification | Recorded that Nearcast has no old app or legacy codebase dependency |
| 0.1.1 | 2026-08-25 | Documentation baseline established | Added derived requirements and gap analysis measuring all approved documents against commit `7820a0a`; no product behavior changed |
| 0.2.0 | 2026-08-25 | Phase 1 lifecycle delivered | Resolved every documentation conflict, added the Phase 1 database layer and server boundary, added authentication and invitation redemption, and replaced all demo fixtures with real data |
| 0.3.0 | 2026-08-25 | Design-system cutover and functional journey coverage | App now implements the approved Trustworthy Native Clarity palette, shape, motion, and type scale; added a 25-assertion functional journey test of the complete Phase 1 loop |
| 0.4.0 | 2026-08-25 | Coordination surfaces delivered | Broadcaster inbox, coordination room with explicit disclosure release and in-room block/report, and feed relevance feedback — the tested server loop is now walkable in the interface |
| 0.5.0 | 2026-08-25 | Realtime, resolution, and privacy-safe analytics | Private message channels with reconnect refetch, the resolution sheet and outcome confirmation, and the allowlisted analytics module with events wired after server success |
| 0.6.0 | 2026-08-25 | Account deletion and retention | In-product deletion that anonymizes, withdraws, clears, and redacts while preserving safety evidence; retention jobs for aged messages and exact locations |
| 0.7.0 | 2026-08-26 | Owner edits and offline drafts | Material-edit history visible to existing respondents, Zod at the publish boundary, and a local draft that survives restarts and lost connections — cleared on publish and on account deletion |

## Verification Log

| Date | Check | Result | Notes |
|---|---|---|---|
| 2026-08-24 | App verification | Passed | `npm run verify` completed lint, TypeScript, Vitest, and iOS export successfully |
| 2026-08-24 | Documentation integrity | Passed | Checked 29 markdown files; 0 missing change logs and 0 broken markdown links |
| 2026-08-24 | Dependency audit | Open warning | `npm audit --omit=dev` reports 11 moderate transitive `uuid` warnings through Expo config tooling; available force-fix is breaking |
| 2026-08-24 | Database verification | Blocked | Docker daemon is not running, so local Supabase database tests cannot start yet |
| 2026-08-24 | App verification | Passed | Fresh `npm run verify` completed lint, TypeScript, 4 Vitest files with 10 tests, and iOS export successfully |
| 2026-08-24 | Database start | Blocked | `npm run db:start` failed because the Docker API socket at `~/.docker/run/docker.sock` is unavailable |
| 2026-08-24 | Component test renderer | Selected | Added Expo Jest with React Native Testing Library and `test-renderer` for React Native component interaction tests |
| 2026-08-24 | Database verification | Passed | `npm run db:start`, `npm run db:reset`, and `npm run db:test` passed after fixing intent RLS recursion |
| 2026-08-24 | Database lint | Passed with extension caveat | `npx supabase db lint --level warning --schema public,private` found no Nearcast schema errors; all-schema lint only reported Supabase-managed PostGIS extension internals |
| 2026-08-24 | Database types | Passed | `npm run db:types` generated `src/infrastructure/supabase/database.types.ts` from the local database |
| 2026-08-25 | Device-flow verification | Blocked | iOS development build failed because CocoaPods is unavailable; Android verification is blocked because `adb` and `emulator` are not installed or not on `PATH` |
| 2026-08-25 | Local mobile tooling | Installed | Installed CocoaPods 1.13.0, Eclipse Temurin JDK 21.0.12.1, Android SDK platform-tools/emulator/platform 36/build-tools 36, NDK 27.1.12297006, CMake 3.22.1, and the `Nearcast_API_36` AVD |
| 2026-08-25 | Device-flow verification | Passed | iOS development build rendered the private preview route in Simulator; Android development build rendered the same preview route on `Nearcast_API_36` after setting the local React Native debug host to the `adb reverse` Metro tunnel |
| 2026-08-25 | Android runtime warnings | Resolved | Replaced render-time font hook usage with effect-scoped font loading and moved home safe-area handling to `react-native-safe-area-context`; final Android preview screenshot showed no warning overlay and logcat had no React state-update warning |
| 2026-08-25 | Physical iOS signing setup | In progress | Wired the iOS project to the logged-in personal team `Q2234855S8` and changed the development bundle identifier to `com.piyushsharma.nearcast.dev` so the app can be installed on a physical iPhone |
| 2026-08-25 | Composer keyboard UX | Resolved | Added keyboard dismissal and scroll-friendly handling to the intent composer so the review action remains reachable while typing |
| 2026-08-25 | Home feed UX | Resolved | Replaced the explainer-style home page with an honest `For You` empty-feed shell and bottom navigation for `For You`, `Broadcast`, `Activity`, and `You` |
| 2026-08-25 | Native homepage UX pass | Resolved | Reworked the homepage as a native-style `For You` tab with grouped feed sections and moved primary navigation to Expo Router tabs |
| 2026-08-25 | Native minimal design direction | Approved for exploration | Captured product truth in `PRODUCT.md` and generated a cohesive native minimal screen board for homepage, detail, profile, request, composer, review/reach, activity, and messages |
| 2026-08-25 | Native minimal page build | Resolved | Built the first native minimal page set with five-tab navigation, intent detail, broadcaster profile, request sheet, composer, review/reach, activity, and messages using shared UI primitives |
| 2026-08-25 | Continuous integration | Passed | GitHub Actions Verify run 1 on commit `7820a0a` completed with both the app and database jobs green from a clean clone; closes the last open item in Foundation Task 1 |
| 2026-08-25 | Full documentation review | Completed | Reviewed all 25 governed documents, the four root documents, the migration, and all application source against commit `7820a0a`; recorded results in `docs/analysis/00 - Requirements and Gap Analysis.md` |
| 2026-08-25 | Requirements coverage baseline | Recorded | Of 64 MVP MUST requirements: 11 met at the database layer, 29 partial, 24 not started; 0 reachable by a user because authentication does not exist |
| 2026-08-25 | Documentation conflict audit | Open | Registered 9 conflicts between approved documents (C-01 to C-09) and 7 governance defects (G-01 to G-07); C-01 authentication method, C-02 navigation model, and C-03 numeric trust score block Phase 1 and need decisions |
| 2026-08-25 | Documentation conflict audit | Closed | All 9 conflicts and all 7 governance defects resolved and written into the governing documents; decisions recorded in the Doc 00 decision log |
| 2026-08-25 | App verification | Passed | `npm run verify` completed lint, TypeScript, 17 Vitest assertions, 15 Jest component assertions, and the iOS export |
| 2026-08-25 | Database verification | Passed | Both migrations applied to a clean database with seed; 9 of 9 foundation and 74 of 74 Phase 1 pgTAP assertions passed |
| 2026-08-25 | Database tooling | Substituted | The Supabase container stack could not start because the environment blocks the Docker image registry; tests ran against local PostgreSQL 16 with an equivalent auth schema, `auth.uid()`, and anon/authenticated/service_role bootstrap |
| 2026-08-25 | Generated database types | Hand-extended | `npm run db:types` needs the same blocked container, so `database.types.ts` was extended by hand to match the migration; re-run `npm run db:types` on a Docker-capable machine to confirm no drift |
| 2026-08-25 | Server boundary coverage | Recorded | 14 of the 16 functions in the API contract now exist; `generate-deliveries` and `process-notifications` remain unbuilt and belong to Phases 2 and 3 |
| 2026-08-25 | Demo fixtures | Removed | `src/features/native-demo/` deleted; every screen now reads real data or renders an honest loading, empty, error, or restricted state |
| 2026-08-25 | Outstanding work handoff | Recorded | Split into environment-blocked, unbuilt scope, and human-led in `docs/analysis/01 - Codex Handoff and Human Actions.md`; 11 agent-executable and 3 human-led items opened as GitHub issues 1 to 15 |
| 2026-08-25 | Delivery generation | Passed | Built `generate_deliveries` test-first with 18 pgTAP assertions covering reach tiers, blocks, restriction, hidden deliveries, idempotent reruns, origin-only, lapsed intents, and the audit event; wired into the publish flow |
| 2026-08-25 | Human-item bypasses | Recorded | Development-only password sign-in (gated from production), configuration-driven share base URL with scheme fallback, and seeded local invitation tokens keep testing active while H-1, H-2, H-4, and H-5 remain pending |
| 2026-08-25 | App verification | Passed | `npm run verify` completed lint, TypeScript, 21 Vitest assertions, 18 Jest component assertions, and the iOS export |
| 2026-08-25 | Database verification | Passed | All three migrations plus seed applied to a clean database; 9 foundation, 74 Phase 1, and 18 Phase 2 pgTAP assertions passed (101 of 101) on the substitute harness |
| 2026-08-25 | Semantic token cutover | Passed | Replaced the app token layer with the approved native semantic palette, radius (card 20, button 14), motion (press 120, sheet 240, page 300), and the approved type scale on Manrope; 15 files swept, splash aligned to `#F7F3EA`, Broadcast rendered as the raised tab action; dark palette carried as data with a parity test |
| 2026-08-25 | Phase 1 functional journey | Passed | New 25-assertion pgTAP journey drives the complete two-user loop exclusively through the public functions: redemption, publish, anonymous link, confirmation, delivery with reason, response, acceptance, progressive disclosure, messaging, notification hygiene, resolution, and reliability |
| 2026-08-25 | Full verification after cutover | Passed | `npm run verify` green (25 Vitest, 18 Jest, iOS export); clean-database run green with 126 of 126 pgTAP assertions across four suites |
| 2026-08-25 | Coordination surfaces | Passed | Built the broadcaster inbox (accept/decline with neutral declined status), the coordination room (pinned intent header, per-field disclosure release, block and report, read-only when closed, five-second interim poll pending Realtime), and the feed not-relevant action; 29 Jest component assertions pass |
| 2026-08-25 | Test-runner leak | Fixed | TanStack Query's default five-minute mutation GC timer held the Jest worker open; the shared test client now zeroes gcTime on both caches and the runner exits cleanly |
| 2026-08-25 | Requirement gap raised | Open | MUST-043's broadcaster Reply action has no schema path before a match exists; recorded in implementation plan 04 for a governing-document decision |
| 2026-08-25 | Realtime channels | Passed | Messages join the supabase_realtime publication behind an existence guard (a recorded no-op on the plain-PostgreSQL harness); the room subscribes per conversation, refetches from PostgreSQL on every event and on reconnect, unsubscribes on unmount, and keeps a thirty-second poll only as a dead-socket safety net |
| 2026-08-25 | Resolution and outcomes | Passed | Resolution sheet offers the four factual outcomes plus withdraw with an honest reliability note; the room asks "Did this interaction happen?" once resolved, with a dispute path; 31 Jest component assertions pass |
| 2026-08-25 | Privacy-safe analytics | Passed | Client module enforces the Doc 09 taxonomy as per-event allowlists with substring prohibited-key rejection and drop-whole-event semantics; 7 Vitest assertions prove prohibited sample data is rejected; transport is a bounded buffer until the PostHog project exists (H-6) |
| 2026-08-25 | Full verification | Passed | `npm run verify` fully clean (8 Vitest files, 31 Jest assertions, iOS export); clean-database run green at 126 of 126 including the guarded realtime migration |
| 2026-08-25 | Account deletion | Passed | `delete_account` anonymizes the profile, withdraws open intents, deletes drafts, clears exact fields, redacts sent responses and messages, removes confirmations and deliveries, and records a suppression row — while preserving filed reports and the other party's messages; idempotent on repeat, and a deleted account is barred from every mutation function; 26 pgTAP assertions |
| 2026-08-25 | Retention jobs | Passed | `apply_retention_policy` deletes messages 90 days after a room closes and clears exact location and contact fields 30 days after an intent closes; remaining Doc 04 rows join as their windows become reachable |
| 2026-08-25 | Full verification | Passed | `npm run verify` fully clean (8 Vitest files, 35 Jest assertions including the two-step deletion flow, iOS export); clean-database run green at 152 of 152 across five suites |
| 2026-08-25 | CI gates widened | Added | The Verify database job now also runs `supabase db lint` and regenerates `database.types.ts` on the real stack, failing on any drift — turning the two open real-stack verification items into pull-request gates |
| 2026-08-26 | Codex runbook Step 1 baseline | Passed after Docker recovery | In `codex/issue-17-runbook`, Docker Desktop initially hung at the server response and #18 was filed; terminating the stale Docker backend and relaunching Docker restored the daemon. `npm run db:start && npm run db:reset && npm run db:test` passed with 152 of 152 pgTAP assertions. `npx supabase db lint --level warning --schema public,private` first found an enum assignment warning in `public.close_intent`; adding an explicit `public.intent_status` cast made lint return no schema errors. `npm run db:types` found real generated-type drift, so `database.types.ts` was regenerated and committed. Final `npm run verify` passed lint, typecheck, 8 Vitest files with 32 tests, 10 Jest suites with 35 tests, and iOS export. GitHub issue comments and issue-closing updates for #1, #2, #17, and #18 returned `403` with the available MCP integration/token, so the branch commit is the recorded treatment trail until repo issue-write permissions are restored. |
| 2026-08-26 | Step 1 integration | Passed | Merged `codex/issue-17-runbook` into `claude/repo-overview-vxx5d3` without rewriting its history. Reviewed both real findings: the `public.intent_status` cast in `close_intent` is behaviour-preserving, and the regenerated `database.types.ts` adds the six tables and the function signatures the hand-written copy had missed. `npx tsc --noEmit` clean against the generated types, so no call site depended on the drifted shapes. Substitute-harness rebuild from empty database green at 152 of 152 (foundation 9, phase1 74, journey 25, phase2 18, phase4 26) with the cast applied; `npm run verify` clean end to end including the iOS export. Issue updates Codex could not post were completed from this session: #1, #2, and #18 closed with the outputs, #17 commented with Step 1 complete |

| 2026-08-26 | Material-edit history | Passed | New suite `nearcast_intent_edits.test.sql` at 30 of 30, taking the substitute-harness total to 182 across six suites. The suite caught one mis-specified assertion of mine — a price sent without a currency is legitimate when the intent already has one — which was corrected by pointing that check at the draft, where neither exists. `npm run verify` clean: lint, typecheck, 8 Vitest files with 47 tests, 12 Jest suites with 47 tests, iOS export |
| 2026-08-26 | Offline drafts | Passed | Local SQLite draft store with 5 Jest assertions over a fake database, 6 Vitest assertions over the pure parse and network-failure logic, and screen tests covering restore, continuous save, clear-on-publish, clear-on-deletion, the honest offline message, and idempotency-key reuse across a retry. `npm run verify` clean: 9 Vitest files with 53 tests, 14 Jest suites with 65 tests, iOS export |
| 2026-08-26 | Round 2 R-1 real-stack baseline | Passed | In `codex/issue-17-round2`, `npm ci` completed. Docker was responsive. `npm run db:start && npm run db:reset && npm run db:test` passed with 182 of 182 pgTAP assertions across six suites, including `nearcast_intent_edits.test.sql`. `npx supabase db lint --level warning --schema public,private` returned no schema errors for the new material-edit migration and policies. `npm run db:types && git diff --exit-code -- src/infrastructure/supabase/database.types.ts` produced no diff, so the hand-edited `update_intent` entry already matched the generator. `npm run verify` passed lint, typecheck, 9 Vitest files with 53 tests, 14 Jest suites with 65 tests, and iOS export. |
| 2026-08-26 | Prebuild side effects | Resolved at source | Round 2 R-2 stalled because `expo prebuild` rewrote `app.json` and `package.json` in the working tree. Two real gaps caused it: `app.json` carried no `android.package`, so prebuild invented one on every run, and its `version` still read `0.6.0` against `package.json` at `0.7.0`. Both are now explicit — the Android application id is pinned to `com.piyushsharma.nearcast.dev`, matching the iOS development identifier, so a prebuild is a no-op against a clean tree. The production identifier remains a founder decision under H-1 (#12). `userInterfaceStyle: "light"` stays pinned per C-08. `npm run verify` clean after the change |
| 2026-08-26 | Design-system branch triage | Ported | Reviewed `claude/design-system-access-6391fd` (5 commits from the pre-Phase-1 `main`, 48 files). Ported the four pure modules that encode governance rules as executable checks — `trust.ts` (refuses score-shaped, popularity-shaped and guarantee-shaped lines, per C-03), `privacy.ts` (detects coordinates, street addresses, door numbers, emails and phone numbers), `state.ts` (single resolved component state), and `accents.ts` rewritten against the shipped token API and taking a palette rather than an appearance. 40 ported assertions pass unchanged. Deliberately not ported: the fifth `messages` tab (C-02 resolved the tab bar to four), `appearance.tsx` and appearance switching (C-08 and issue #11 defer dark beyond the first alpha), and its `tokens.ts`, `button.tsx`, `state-panel.tsx` and screen edits, all of which moved on after `7820a0a`. The component library is still to triage |
| 2026-08-26 | Privacy warning at review | Passed | `findPrivacyViolations` now runs over the statement on the review screen and warns — never blocks — before publishing. The words are the broadcaster's own; the database and disclosure rules are what actually keep exact location and contact details out of discoverable rows. 4 new screen assertions, including one proving publishing still proceeds |
| 2026-08-26 | Continuous integration | Widened | `verify.yml` now also runs on pushes to `claude/**` and `codex/**`. The type-drift and `supabase db lint` gates added in `4aa78a8` had never executed in CI, because the workflow only triggered on pull requests and pushes to `main`, and no pull request has been opened |
| 2026-08-26 | Full verification | Passed | Substitute harness 182 of 182 across six suites; `npm run verify` clean with 13 Vitest files (93 tests), 14 Jest suites (69 tests), and the iOS export |
| 2026-08-26 | Continuous integration | Passed | Verify run 2 on `feee6ff` — the first run ever on a working branch — completed with both jobs green. The database job started real Supabase, applied every migration and the seed, ran `supabase test db`, ran `supabase db lint`, and regenerated `database.types.ts` with no diff. The two gates added in `4aa78a8` have now executed for the first time, and the real-stack baseline no longer depends on someone running it by hand. Run: https://github.com/ninjatech68-blip/Nearcast/actions/runs/32950564763 |
| 2026-08-26 | Scheduled jobs | Passed | New suite `nearcast_scheduled_jobs.test.sql` at 9 of 9, taking the harness total to 190 across seven suites. Expiry every fifteen minutes and retention daily, declared in `private.scheduled_jobs()` and applied to `pg_cron` by a guarded, idempotent block. The registration assertion defers its `cron.job` lookup to run time, because a plain `case` still parses the branch referencing a relation the harness does not have; where the extension is absent the suite says so rather than claiming a pass |
| 2026-08-26 | Account deletion, server half | Written, not yet executed | `supabase/functions/delete-account/` verifies the caller's JWT, calls `delete_account` with the caller's own token, then revokes sessions and bans the account with the service role. The `auth.users` row is never deleted — `profiles.id` cascades from it, and deleting it would destroy the anonymized profile, the redactions and the suppression trail. The client now invokes the function instead of the RPC, with a distinct honest message for the case where the data was deleted but the session survived; 3 new Jest assertions. `tsconfig.json` and the ESLint config now exclude `supabase/functions`, which is Deno rather than React Native. **The function has never run against a stack**: authoring it needs no Docker, executing it does |
| 2026-08-26 | Push payload boundary | Passed | `src/features/notifications/push-payload.ts` decides what a notification may say: generic copy plus the three ids, for exactly the five events `private.queue_notification` is called with. An unknown event returns null, so a newer server queuing something unfamiliar produces silence rather than an invented notification. 10 Vitest assertions, including that no payload carries an exact location or contact details, that a decline stays neutral with no private reasoning, and that no copy celebrates or presses. Also added the `@/` alias to the Vitest config so a pure module can import another by its usual path. Token acquisition and the sending worker are not built — they need a physical device |

## Governance Rules

- Every meaningful product or engineering decision must be reflected in the relevant document.
- Every document must keep a `Change Log`.
- Every code change should be committed with a clear message.
- Never fabricate Nearcast users, responses, confirmations, or activity counts.
- Never expose private group identity or contact details without explicit permission.
- Build Nearcast from scratch from this repository and approved documents only.

## Change Log

| Date | Change |
|---|---|
| 2026-08-24 | Created project log for the packaged Nearcast project |
| 2026-08-24 | Added greenfield build clarification |
| 2026-08-25 | Recorded local mobile tooling installation, device-flow verification, and Android warning cleanup |
| 2026-08-25 | Recorded composer keyboard and home feed UX updates |
| 2026-08-25 | Recorded native homepage UX pass |
| 2026-08-25 | Recorded native minimal design-system exploration checkpoint |
| 2026-08-25 | Recorded native minimal page implementation checkpoint |
| 2026-08-25 | Recorded first green CI run and closed the final Foundation Task 1 checkbox |
| 2026-08-25 | Added `docs/analysis/00 - Requirements and Gap Analysis.md` and linked it from the documentation map |
| 2026-08-25 | Opened the documentation conflict register; resolutions must be written into the governing documents before implementation continues |
| 2026-08-25 | Closed the conflict register; recorded the authentication, navigation, trust-display, derived-document and dark-mode decisions in the Doc 00 decision log |
| 2026-08-25 | Added the Phase 1 migration, 74 pgTAP assertions, and 14 of the 16 contract functions |
| 2026-08-25 | Added Google and Apple sign-in, invitation redemption, session handling, and route guards |
| 2026-08-25 | Adopted TanStack Query for server state and removed all demo fixtures |
| 2026-08-25 | Added the Codex handoff plan and opened the matching GitHub issues; human-led items remain with the founder |
| 2026-08-25 | Built explainable delivery generation and the development bypasses that keep testing active while human items are pending |
| 2026-08-25 | Executed the semantic token cutover by founder direction and added the Phase 1 functional journey suite |
| 2026-08-25 | Delivered the inbox, coordination room, disclosure release, in-room safety actions, and feed relevance feedback |
| 2026-08-25 | Delivered Realtime channels, the resolution and outcome flow, and the allowlisted analytics module |
| 2026-08-25 | Delivered the database half of account deletion, the first retention jobs, and the in-product deletion flow |
| 2026-08-25 | Widened CI to enforce type-drift and database lint on the real Supabase stack |
| 2026-08-25 | Added the Codex execution runbook (`docs/analysis/02`) and opened it as GitHub issue 17, the single entry point for local execution |
| 2026-08-26 | Recorded the Codex runbook Step 1 real-stack baseline, lint fix, generated-type drift correction, and final verification |
| 2026-08-26 | Integrated the Codex Step 1 branch, re-verified the merged tree, and closed the real-stack verification items |
| 2026-08-26 | Delivered MUST-017: Zod at the publish boundary, `update_intent`, respondent-visible material-edit history, and the owner edit screen |
| 2026-08-26 | Delivered MUST-015: offline draft persistence, cleared on publish and on account deletion, with honest offline publish copy |
| 2026-08-26 | Recorded Round 2 R-1 real-stack baseline verification |
| 2026-08-26 | Pinned the Android application id and aligned the app version so a prebuild no longer dirties the working tree |
| 2026-08-26 | Adopted the ownership model: Claude develops, Codex clears blockers only |
| 2026-08-26 | Ported the governance-guard modules from the design-system exploration branch and added the review-screen privacy warning |
| 2026-08-26 | Widened CI to run on working branches, so the real-stack gates finally execute without a pull request |
| 2026-08-26 | Delivered the server half of account deletion and the scheduled maintenance jobs |
| 2026-08-26 | Added the push payload and preference boundary, the privacy rule for anything that leaves the server as a notification |
