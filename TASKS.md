# Nearcast Task Guide

This file explains the project commands in plain language.

## App Tasks

| Command | What it does |
|---|---|
| `npm install` | Installs the app dependencies |
| `npm run build:preview` | Cloud release build, installable on registered devices |
| `npm run build:production` | Cloud release build for the stores |
| `npm run preflight:release` | Checks `.env` points at the hosted project before building |

Nothing runs locally. No simulator, no Metro dev server, no local database. A
build that depends on one machine being reachable cannot be given to a tester.

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
| `npm run db:push` | Applies migrations to the hosted Supabase project |
| `npm run db:test` | Runs database and permission tests against `SUPABASE_DB_URL` |
| `npm run db:types` | Generates TypeScript types from the linked project |

The database is a hosted Supabase project. `supabase link --project-ref <ref>`
once, then these commands act on it. `SUPABASE_DB_URL` is the project's
connection string and is a secret: keep it out of git.

## Change Log

| Date | Change |
|---|---|
| 2026-08-24 | Added a plain-language command guide |
