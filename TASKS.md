# Nearcast Task Guide

This file explains the project commands in plain language.

## Build And Install

| Command | What it does |
|---|---|
| `npm install` | Installs the app dependencies |
| `npm run build:preview` | Cloud release build on EAS, installable on registered devices |
| `npm run build:production` | Cloud release build for TestFlight and the App Store |
| `npm run ios:build` | Local Xcode release build, installed over USB |
| `npm run preflight:release` | Checks the environment points at the hosted project before a build |

There is no development server and no simulator target. A development build
fetches its JavaScript from whatever answers on port 8081, which has already
put another project's app on a phone here. Release builds embed the bundle, so
the app runs anywhere, and that is the only shape a tester can be given.

## Quality

| Command | What it does |
|---|---|
| `npm run lint` | Checks code style and common mistakes |
| `npm run typecheck` | Checks TypeScript types |
| `npm run test` | Runs the app tests |
| `npm run db:test` | Runs the database and permission tests |
| `npm run bundle:ios` | Builds an iOS bundle, to prove the app bundles |
| `npm run verify` | Everything above, in one command |

`npm run verify` is the gate before claiming a change is done.

## Database

| Command | What it does |
|---|---|
| `npm run db:push` | Applies migrations to the hosted Supabase project |
| `npm run db:test` | Applies every migration to a throwaway database and runs pgTAP against it |
| `npm run db:types` | Regenerates `database.types.ts` from the migrations in this repository |
| `npm run db:test:hosted` | Runs pgTAP against the hosted project, for a final check |
| `npm run db:stop` | Stops and removes the throwaway test database |

`db:test` and `db:types` need no Docker, no credentials and no network. They
start a plain PostgreSQL on a spare port, apply the migrations in `git`, and
throw it away. Two consequences worth knowing:

- **Generated types match the repository, not a server.** Regenerating is
  reproducible, and a type that disagrees with the migrations is a real
  failure rather than a stale project.
- **A green `db:test` describes the SQL in this branch.** It does not prove
  the hosted project has the same schema — `db:push` is what makes that
  true, and `db:test:hosted` is what confirms it.

`db:push` and `db:test:hosted` do need the hosted project. Once:

```bash
supabase link --project-ref <ref>
export SUPABASE_DB_URL="postgresql://postgres:...@db.<ref>.supabase.co:5432/postgres"
```

The connection string is in the dashboard under Project Settings → Database →
Connection string (URI). It carries the database password, so it is exported in
the shell and never committed — not even to `.env`, which npm does not read for
scripts. Put the export in `~/.zshrc` to keep it.

## Change Log

| Date | Change |
|---|---|
| 2026-08-24 | Added a plain-language command guide |
| 2026-08-31 | Removed the development-server commands; documented the hermetic database tasks and the hosted push |
