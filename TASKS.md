# Nearcast Task Guide

This file explains the project commands in plain language.

## App Tasks

| Command | What it does |
|---|---|
| `npm install` | Installs the app dependencies |
| `npm run ios:device` | Builds release and installs on a connected iPhone |
| `npm run android:device` | Builds release and installs on a connected Android device |
| `npm run preflight:device` | Checks `.env` is usable from a phone before building |

Real devices and release builds only. The simulator and the Metro dev server
are not used: a release build carries its own JavaScript, so what runs is what
was built.

`npm run start`, `npm run ios`, `npm run android` and `npm run web` remain in
`package.json` for tooling that expects them, and are not part of this
workflow.

## Quality Tasks

| Command | What it does |
|---|---|
| `npm run lint` | Checks code style and common mistakes |
| `npm run typecheck` | Checks TypeScript types |
| `npm run test` | Runs the automated app tests |
| `npm run bundle:ios` | Builds an iOS app bundle for verification |
| `npm run verify` | Runs linting, type checks, tests, and iOS bundling together |

## Database Tasks

| Command | What it does |
|---|---|
| `npm run db:start` | Starts the local Supabase database |
| `npm run db:stop` | Stops the local Supabase database |
| `npm run db:reset` | Rebuilds the local database from migrations and seed data |
| `npm run db:test` | Runs database and permission tests |
| `npm run db:types` | Generates TypeScript types from the local database |

## Change Log

| Date | Change |
|---|---|
| 2026-08-24 | Added a plain-language command guide |
