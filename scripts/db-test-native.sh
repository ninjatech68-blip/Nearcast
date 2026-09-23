#!/usr/bin/env bash
# Run the migrations, seed and pgTAP suite on a throwaway native PostgreSQL
# cluster. Use when Docker (and so `npm run db:test`) is unavailable.
# Requires PostgreSQL 16+ with PostGIS, pgTAP and pg_cron installed, plus pg_prove.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PGBIN="${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
PORT="${PGPORT_NATIVE:-54329}"
DATA="$(mktemp -d)"
RUNAS=()
if [ "$(id -u)" = "0" ]; then RUNAS=(sudo -u postgres); chown postgres "$DATA"; fi

cleanup() { "${RUNAS[@]}" "$PGBIN/pg_ctl" -D "$DATA" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$DATA"; }
trap cleanup EXIT

"${RUNAS[@]}" "$PGBIN/initdb" -D "$DATA" -U postgres --auth=trust >/dev/null
{
  echo "port = $PORT"
  echo "listen_addresses = '127.0.0.1'"
  echo "unix_socket_directories = '$DATA'"
  echo "shared_preload_libraries = 'pg_cron'"
  echo "wal_level = logical"
  echo "cron.database_name = 'postgres'"
} >> "$DATA/postgresql.conf"
"${RUNAS[@]}" "$PGBIN/pg_ctl" -D "$DATA" -l "$DATA/server.log" -w start >/dev/null

PSQL=(psql -h 127.0.0.1 -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q)
"${PSQL[@]}" -f "$ROOT/scripts/db-native/supabase_shim.sql"
for f in "$ROOT"/supabase/migrations/*.sql; do "${PSQL[@]}" -f "$f"; done
"${PSQL[@]}" -f "$ROOT/supabase/seed.sql"
"${PSQL[@]}" -c "create extension if not exists pgtap with schema extensions;"

pg_prove -h 127.0.0.1 -p "$PORT" -U postgres -d postgres --ext .sql -r "$ROOT/supabase/tests/database"
