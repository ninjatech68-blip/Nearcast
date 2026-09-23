# Nearcast Project Log

This log records important packaging, setup, and version-control decisions for the Nearcast mobile app project.

## Current Project

- Project name: TrueGoing (codename Nearcast)
- Project folder: `/Users/piyushsharma/Downloads/Nearcast-App-Project-2026-08-24`
- Product: Trust-aware intent broadcasting mobile app
- Build type: Greenfield project with no old app or legacy codebase dependency
- Initial stack: Expo, React Native, TypeScript, Supabase, PostgreSQL/PostGIS
- Source of truth: [Start Here - Nearcast Project Reference](./docs/00%20-%20Start%20Here%20-%20Nearcast%20Project%20Reference.md)

## Version History

| Version | Date | Status | Notes |
|---|---|---|---|
| 0.1.0 | 2026-08-24 | Initial packaged project | Created clean Downloads project folder, normalized documentation names, included app scaffold, Supabase foundation, tests, and AI agent instructions |
| 0.1.1 | 2026-08-24 | Greenfield clarification | Recorded that Nearcast has no old app or legacy codebase dependency |
| docs | 2026-09-23 | TrueGoing redesign adopted | MigoMap competitive review; product renamed TrueGoing; `docs/truegoing/` made the source of truth; earlier docs marked superseded. No app or schema code changed. |

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
| 2026-09-23 | T2 domain rules | Passed | 60 unit tests; caught a locale bug ("Sept") |
| 2026-09-23 | T3 design system | Passed | Tokens with light/dark and AA contrast checks, 13 components with 38 tests in both themes, non-blocking fonts, dev gallery captured on web in both themes. Device-only features (Liquid Glass, SF Symbols) not yet seen on a phone |
| 2026-09-23 | T1 database foundation | Passed with caveat | New TrueGoing migration: 22 tables, RLS, triggers. 79/79 pgTAP on native PostgreSQL 16 via `npm run db:test:native`; three deliberate mutations each caught; `supabase db lint` clean; types regenerated. Supabase Docker images unavailable (registry 403), so `npm run db:test` on the real stack is pending in CI |
| 2026-09-23 | T0 rename | Passed | `npm run verify` passed: lint, typecheck, 17 Vitest and 12 Jest tests, iOS export. `app.config.ts` resolves `com.truegoing.app` (production/preview) and `com.truegoing.app.dev` (development). Native device build not run: no macOS in the cloud container |
| 2026-09-23 | Web build capture | Done | Exported the web build and captured 9 routes in Chromium for the competitive review; no iOS simulator available in the cloud container |
| 2026-08-25 | Native minimal page build | Resolved | Built the first native minimal page set with five-tab navigation, intent detail, broadcaster profile, request sheet, composer, review/reach, activity, and messages using shared UI primitives |

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
| 2026-09-23 | Recorded the TrueGoing redesign and the change of source of truth |
| 2026-09-23 | Recorded T0: TrueGoing identity and bundle ID `com.truegoing.app` |
| 2026-09-23 | Recorded T1 and the native database test harness |
| 2026-09-23 | Recorded T2 and T3 |
