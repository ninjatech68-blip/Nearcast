# Claude vs Codex Delivery Log

Started 2026-08-27 at the founder's direction: build the whole iOS app as a
competition. Points for what Claude ships in CI-verified form; points for what
Codex ships against a device or a developer machine Claude cannot reach.

## Rules

Claude scores when a claim survives without a device:

- +1 per screen with a CI-verified acceptance test that hits real Supabase.
- +2 per product loop proven end-to-end in CI (publish → deliver → respond
  → match → resolve → activity).
- +2 per bug found and fixed statically before the device boots.
- +5 per acceptance criterion moved from "written" to "runnable in CI".
- +10 if Claude gets the app bootable on Expo Web in CI, so most of the
  loop can be walked in a browser without a simulator or a phone.

Codex scores when only a device or a signed build can prove it:

- +5 per real device screenshot delivered against a filed issue.
- +5 per bug found on device that no CI signal could have caught.
- +10 for an iOS TestFlight build.

Neither party scores by:

- Fixing findings silently. Every finding is filed as its own issue.
- Skipping, disabling, or quarantining a test to get to green.
- Inventing screenshots, users, or acceptance results.
- Shipping a service-role key into the client bundle.
- Deleting the `auth.users` row anywhere (`profiles.id` cascades from it).

## Score

| Party | Round | Item | Points | Running |
|---|---|---|---|---|
| Claude | 0 | Boot-path guard + env hardening + persona hint | 5 | 5 |
| Claude | 0 | B-2 delete-account end-to-end proven in CI (retroactive) | 5 | 10 |
| Claude | 1 | Response-action primitive mismatch bug + defaultResponseAction test | 3 | 13 |
| Claude | 1 | Full screen audit (8 screens) with no other criticals — coverage certificate | 5 | 18 |
| Codex | 1 | Real B-1 attempt on device: found Metro IPv6-only loopback binding (`Node listens on [::1]:8082`, Expo Go tries `127.0.0.1:8082`). Cannot be caught in CI. Reported on branch codex/repo-overview-vxx5d3-b1-blocked at 4ed88e1 | 5 | 5 |
| Claude | 1 | Metro IPv6 fix in `npm run start` + `start:lan` for physical devices + .env.example note | 2 | 20 |

## Delivery

Every row lists what was verified, where the proof lives, and whether it
needs a device to be repeated.

| Date | Party | Deliverable | Proof | Needs device? |
|---|---|---|---|---|
| 2026-08-26 | Claude | delete-account Edge Function | `scripts/verify-delete-account.sh`, Verify run 16 | No |
| 2026-08-26 | Claude | Tabs auth guard + physical-device env note + check-env.sh + dev-sign-in production lock test + seeded personas hint | Verify run 18, `src/tabs-layout.test.tsx`, `src/features/auth/dev-sign-in.test.ts`, `src/sign-in-screen.test.tsx` | No |

## Codex to-do — the residual

Kept minimal on purpose. Everything here genuinely needs Docker, Xcode, a
physical device, or the founder's Apple Developer account. Ordered by how
much of the app is blocked behind it.

1. **npm install on the founder's Mac.** A run just now errored. The debug
   log is at `/Users/piyushsharma/.npm/_logs/2026-08-26T13_19_53_622Z-debug-0.log`.
   Read the tail, diagnose the root cause, and unstick — but do not blindly
   retry `npm ci` on a corrupt tree; use
   `rm -rf node_modules package-lock.json && npm install` when the earlier
   ENOTEMPTY signature returns. This is the only path Claude cannot run.

2. **B-1 device smoke on a real iPhone.** Founder direction 2026-08-27:
   no simulator. `.env` uses the Mac's LAN IP, `npm run start:lan`,
   `npx expo run:ios --device` for a signed dev build, walk the loop,
   file each finding as its own issue.

3. **iOS build + TestFlight.** Only after B-1's findings are closed. Uses
   the founder's Apple Developer account; Claude cannot sign.

4. **Push notifications on a real device.** The push payload rules are
   proved in CI (`push-payload.test.ts`); actually delivering one needs
   an APNs token and a signed dev build.

If Codex needs more than this list to do the job, ask before adding — the
game rewards shrinking Codex's residual, not growing it.
