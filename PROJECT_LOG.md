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
