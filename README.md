# Nearcast

Nearcast is a mobile trust-aware intent network. A person can create an intent in the context of a trusted circle, collect genuine support, and deliberately extend it to relevant people without exposing the source group.

## Build Status

This is a greenfield project. Nearcast must be built from this repository and the documents in `docs/`; there is no old app or legacy codebase to migrate, reuse, or treat as a source of truth.

## Start Here

- [Documentation Map](./docs/README.md): plain-language guide to every Nearcast document
- [Project Log](./PROJECT_LOG.md): version history, verification notes, and governance record
- [Task Guide](./TASKS.md): human-readable explanation of app, quality, and database commands
- [Nearcast Project Reference](./docs/00%20-%20Start%20Here%20-%20Nearcast%20Project%20Reference.md): source-of-truth order for product and engineering decisions

## Stack

- Expo SDK 57, React Native, Expo Router, TypeScript
- Supabase Auth, PostgreSQL/PostGIS, Edge Functions, and Realtime
- Zod at trust boundaries, Vitest for domain tests, pgTAP for database and RLS tests

## Local Setup

```bash
npm install
cp .env.example .env
npm run start
```

Start the database separately with a Docker-compatible runtime:

```bash
npm run db:start
npm run db:reset
npm run db:test
npm run db:types
```

Use the local API URL and publishable key printed by `npm run db:start` in `.env`. Never place a service-role key in the mobile app.

## Repository Map

- `src/app/`: Expo Router screens and navigation only
- `src/features/`: feature UI, application logic, and domain rules
- `src/design-system/`: machine-readable tokens and reusable UI primitives
- `src/infrastructure/`: Supabase and device integrations
- `supabase/migrations/`: reproducible database changes
- `supabase/tests/database/`: pgTAP schema and RLS tests
- `docs/`: approved product, design, engineering, and implementation documents with human-readable names
- `AGENTS.md`: mandatory instructions for AI coding agents

## Verification

```bash
npm run verify
npm run db:test
```

Read [Start Here - Nearcast Project Reference](./docs/00%20-%20Start%20Here%20-%20Nearcast%20Project%20Reference.md) before changing behavior.
