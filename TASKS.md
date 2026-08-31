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

The database is a hosted Supabase project. Two things once, then these commands
act on it:

```bash
supabase link --project-ref <ref>
export SUPABASE_DB_URL="postgresql://postgres:...@db.<ref>.supabase.co:5432/postgres"
```

The connection string is in the dashboard under Project Settings -> Database ->
Connection string (URI). It contains the database password, so it is exported in
the shell and never committed — not even to `.env`, which npm does not read for
scripts. Put the export line in `~/.zshrc` to keep it across sessions.

## Demo Data

`supabase/seeds/demo-feed.sql` fills a staging project with demo intents so the
home feed can be scrolled. It is not a migration and no command applies it
automatically. Run it deliberately:

```bash
psql "$SUPABASE_DB_URL" -f supabase/seeds/demo-feed.sql
```

Staging only. It refuses to run once the project holds real responses or
matches, and never against a project a real tester uses. See "Demo Data" in
`AGENTS.md` for why the boundary matters.

## Invitations

Nearcast is invite-only, and the alpha cohort is approved by the team rather
than grown by members, so there is no invite button in the app. An invitation is
issued from the database:

```bash
psql "$SUPABASE_DB_URL" -c "select * from public.issue_invite('alpha tester 1');"
```

That prints the token and its expiry **once**. It is stored only as a hash, so a
lost token is reissued, never looked up. Send it to the person out of band; they
paste it into the invite step after signing in with their email code.

Never build the hash by hand. `issue_invite` generates the token, hashes it and
records the row in one step; a hand-written hash that is subtly wrong produces a
token that silently does not work.

To let a signed-in person issue invitations from a client instead, set
`nearcast_role` to `operator` in that user's **app** metadata, using the service
role — the dashboard's user editor or the admin API. It must not go in user
metadata: a client can write its own user metadata, so a role kept there is one
any member can award themselves.

## Change Log

| Date | Change |
|---|---|
| 2026-08-24 | Added a plain-language command guide |
| 2026-08-31 | Added the demo feed seed and its staging-only boundary |
| 2026-08-31 | Added the invitation-issuing runbook |
