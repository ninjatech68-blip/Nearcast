# Nearcast Task Guide

This file explains the project commands in plain language.

## App Tasks

| Command | What it does |
|---|---|
| `npm install` | Installs the app dependencies |
| `npm run start` | Opens the Expo development server |
| `npm run ios` | Starts the app in an iOS simulator |
| `npm run android` | Starts the app in an Android emulator |
| `npm run web` | Starts the app in a browser |

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
