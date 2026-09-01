# Nearcast — client

Ported from Build 15 (`ninjatech68-blip/Nearcast` at `fd2d6bb`), which is
frozen and read-only. 32 screens, 26 test files, 204 tests.

## Fixtures-first, by design

The app runs with **no backend**. `remoteEnabled()` returns false when no
Supabase env is present, and `casts/store.ts` hydrates the whole feed from
`features/casts/fixtures.ts`. Every screen, sheet and menu is reachable and
functional on local state.

This is not scaffolding to throw away. It is the seam the real API attaches
to: no screen imports Supabase — all 32 read from the store layer, so
swapping fixtures for `v2/supabase`'s sixteen functions changes the stores
and nothing above them.

```bash
npm install
npm run start        # no .env needed; runs on fixtures
npx vitest run       # 204 tests
```

## What a fixture may not do

A fixture may stand in for data. It may **not** stand in for a promise.

Build 15 shipped `report/[id].tsx` telling people "a human reads every
report" over a `setTimeout` and no server, and shipped blocking that only
ever wrote to device-local state. Those are not fixtures, they are lies, and
they reached testers.

So: any screen whose action has no real implementation must say so on the
screen, in plain words, until it does. A fixture build is for settling how
the product looks and moves. It is not for rehearsing claims we cannot keep.

## Screens carrying decisions we have since overturned

These were built against the old product and must be corrected before the UI
is called final. See `../docs/01 - Decisions.md`.

| Screen | Built for | Now |
|---|---|---|
| `chat/[id].tsx` | modes `day` / `week` / `always` | `initial` / `week` / `month`, **no permanent** (D16) |
| `index.tsx` | no venue, no distance | "approx 3 km away", from a coarsened point (D17) |
| `cast/[id].tsx` | location visible to all | revealed on acceptance only (D17, L14) |
| `compose.tsx` | no venue, no radius floor | venue + place name + radius, minimum 2 km (D17) |
| `reflect/[id].tsx` | one-sided attendance | both confirm or nothing (D7, L4) |
| `report/[id].tsx` | fixture with a false promise | must say what it does |
| `invite/[key].tsx` | invite-gated signup | **delete** — signup is open (D8) |
