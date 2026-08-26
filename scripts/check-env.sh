#!/usr/bin/env bash
#
# Compare .env against the running local Supabase so the client is not
# silently pointed at nothing on first boot. The publishable key rotates every
# `supabase db reset`, and a stale key in .env produces confusing "invalid
# JWT" errors from every screen. This surfaces that before Metro starts.
#
# Usage: bash scripts/check-env.sh
#
# Exit codes: 0 all clear, 1 something the founder must fix.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$REPO_ROOT/.env"

if [ ! -f "$ENV_FILE" ]; then
  echo "error: $ENV_FILE is missing. Copy .env.example to .env and try again."
  exit 1
fi

# shellcheck disable=SC1090
set -a; . "$ENV_FILE"; set +a

: "${EXPO_PUBLIC_SUPABASE_URL:?EXPO_PUBLIC_SUPABASE_URL is missing from .env}"
: "${EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY:?EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY is missing from .env}"
: "${EXPO_PUBLIC_APP_ENV:?EXPO_PUBLIC_APP_ENV is missing from .env}"

if [ "$EXPO_PUBLIC_APP_ENV" != "local" ]; then
  echo "note: EXPO_PUBLIC_APP_ENV=$EXPO_PUBLIC_APP_ENV. This check is meaningful only for local."
  exit 0
fi

echo "==> Reading the running Supabase stack"
if ! STATUS=$(cd "$REPO_ROOT" && npx supabase status -o env 2>&1); then
  echo "error: 'supabase status' failed. Is the local stack running? Try: npm run db:start"
  echo "$STATUS"
  exit 1
fi

RUNNING_URL=$(echo "$STATUS" | awk -F= '/^API_URL=/{gsub(/"/,"",$2); print $2}')
RUNNING_KEY=$(echo "$STATUS" | awk -F= '/^ANON_KEY=/{gsub(/"/,"",$2); print $2}')

if [ -z "$RUNNING_URL" ] || [ -z "$RUNNING_KEY" ]; then
  echo "error: could not parse API_URL or ANON_KEY out of 'supabase status -o env'."
  echo "$STATUS"
  exit 1
fi

FAIL=0

# Port must match. Host may differ (LAN IP for a physical device is expected
# and correct — see .env.example).
ENV_PORT=$(echo "$EXPO_PUBLIC_SUPABASE_URL" | sed -E 's|^https?://[^:/]+:?([0-9]*).*|\1|')
RUN_PORT=$(echo "$RUNNING_URL"              | sed -E 's|^https?://[^:/]+:?([0-9]*).*|\1|')
if [ "${ENV_PORT:-}" != "${RUN_PORT:-}" ]; then
  echo "error: .env URL port ($ENV_PORT) does not match the running stack ($RUN_PORT)."
  echo "       .env:      $EXPO_PUBLIC_SUPABASE_URL"
  echo "       running:   $RUNNING_URL"
  FAIL=1
fi

ENV_HOST=$(echo "$EXPO_PUBLIC_SUPABASE_URL" | sed -E 's|^https?://([^:/]+).*|\1|')
if [ "$ENV_HOST" != "127.0.0.1" ] && [ "$ENV_HOST" != "localhost" ]; then
  echo "note: .env host is $ENV_HOST (not 127.0.0.1). Expected only when testing on a physical device;"
  echo "      the iOS simulator wants 127.0.0.1. See .env.example."
fi

if [ "$EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY" != "$RUNNING_KEY" ]; then
  echo "error: EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY does not match the running stack's ANON_KEY."
  echo "       This is what causes 'invalid JWT' errors on every screen after a db reset."
  echo "       Fix: copy ANON_KEY from 'npx supabase status -o env' into .env."
  FAIL=1
fi

# The service-role key must never end up in the client bundle. Fail loud if
# .env carries it under either name.
if [ "${EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY:-}" = "${SERVICE_ROLE_KEY:-}" ] && [ -n "${SERVICE_ROLE_KEY:-}" ]; then
  echo "error: EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY equals the service-role key. Never ship this in a client."
  FAIL=1
fi

if [ "$FAIL" -ne 0 ]; then
  exit 1
fi

echo "==> .env matches the running Supabase stack. Safe to boot."
