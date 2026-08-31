#!/usr/bin/env bash
#
# The local database stack, without Docker.
#
# `supabase start` needs a Docker daemon. Where there isn't one — a CI
# box, a locked-down laptop, this container — the same work can be done
# against a plain local PostgreSQL: apply the migrations, run the pgTAP
# suite, regenerate the types. Same SQL, same assertions, same generator
# the Supabase CLI runs inside its container.
#
# What it is NOT: a substitute for the real stack. There is no GoTrue,
# no PostgREST, no Realtime, no Storage. It covers schema, RLS,
# functions, triggers and types — the things `db:reset`, `db:test` and
# `db:types` cover — and nothing else.
#
#   ./scripts/db-local.sh reset   apply every migration to a fresh database
#   ./scripts/db-local.sh test    run the pgTAP suite (implies reset)
#   ./scripts/db-local.sh types   regenerate database.types.ts (implies reset)
#   ./scripts/db-local.sh psql    open a shell on the running database
#   ./scripts/db-local.sh stop    stop the server and remove its data
#
# Requires postgresql 16, postgis and pgtap:
#   macOS   brew install postgresql@16 postgis pgtap
#   debian  apt-get install postgresql-16 postgresql-16-postgis-3 postgresql-16-pgtap pgtap
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PGDATA_ROOT="${NEARCAST_PGDATA:-${TMPDIR:-/tmp}/nearcast-localdb}"
PGPORT="${NEARCAST_PGPORT:-55432}"
PGDB=nearcast
TYPES_OUT="$ROOT/src/infrastructure/supabase/database.types.ts"

# ---------------------------------------------------------------
# find the postgres binaries. homebrew and debian both hide them.
# ---------------------------------------------------------------
find_bindir() {
  if command -v pg_ctl >/dev/null 2>&1; then dirname "$(command -v pg_ctl)"; return; fi
  for candidate in \
    /opt/homebrew/opt/postgresql@16/bin \
    /usr/local/opt/postgresql@16/bin \
    /usr/lib/postgresql/16/bin \
    /usr/lib/postgresql/*/bin
  do
    [ -x "$candidate/pg_ctl" ] && { echo "$candidate"; return; }
  done
  cat >&2 <<'MISSING'
db:test needs PostgreSQL 16 and pg_prove, and neither is on this machine.

This is a prerequisite of the database suite only. `npm run verify` does not
need it, and CI runs the suite in its own job, so nothing is blocked by
skipping it here.

To run it locally on macOS:

  brew install postgresql@16 postgis pgtap
  brew link --overwrite postgresql@16

On Debian or Ubuntu:

  sudo apt-get install -y postgresql-16 postgresql-16-postgis-3 postgresql-16-pgtap pgtap

Nothing starts on boot and nothing persists: the script creates a database
on a spare port, applies the migrations from git, and removes it again.
MISSING
  exit 1
}
BIN="$(find_bindir)"
export PATH="$BIN:$PATH"

# initdb refuses to run as root, so under root we borrow the postgres user.
AS_PG=""
if [ "$(id -u)" = "0" ] && id postgres >/dev/null 2>&1; then
  AS_PG="postgres"
fi
run_pg() {
  if [ -n "$AS_PG" ]; then su "$AS_PG" -c "PATH='$PATH' $*"; else eval "$*"; fi
}

running() { pg_isready -h 127.0.0.1 -p "$PGPORT" -q >/dev/null 2>&1; }

start_server() {
  running && return 0
  rm -rf "$PGDATA_ROOT"
  mkdir -p "$PGDATA_ROOT"
  [ -n "$AS_PG" ] && chown "$AS_PG" "$PGDATA_ROOT"
  run_pg "initdb -D '$PGDATA_ROOT/data' -U postgres --auth=trust" >/dev/null
  run_pg "pg_ctl -D '$PGDATA_ROOT/data' -o '-p $PGPORT -c listen_addresses=127.0.0.1' -l '$PGDATA_ROOT/server.log' start" >/dev/null
  for _ in $(seq 1 30); do running && break; sleep 0.3; done
  running || { echo "server did not start; see $PGDATA_ROOT/server.log" >&2; exit 1; }
}

PSQL="psql -h 127.0.0.1 -p $PGPORT -U postgres -v ON_ERROR_STOP=1 -q"

do_reset() {
  start_server
  $PSQL -d postgres -c "drop database if exists $PGDB" -c "create database $PGDB" >/dev/null
  # pgTAP's functions live in `extensions`; without this they stop
  # resolving the moment a test switches role.
  $PSQL -d "$PGDB" -c "alter database $PGDB set search_path = public, extensions" >/dev/null
  $PSQL -d "$PGDB" -f "$ROOT/supabase/local/bootstrap.sql" >/dev/null
  for migration in "$ROOT"/supabase/migrations/*.sql; do
    echo "  applying $(basename "$migration")"
    $PSQL -d "$PGDB" -f "$migration" >/dev/null
  done
  echo "database ready on port $PGPORT"
}

do_test() {
  do_reset
  command -v pg_prove >/dev/null 2>&1 || {
    echo "pg_prove not found. install pgtap (brew install pgtap / apt-get install pgtap)." >&2
    exit 1
  }
  pg_prove -h 127.0.0.1 -p "$PGPORT" -U postgres -d "$PGDB" "$ROOT"/supabase/tests/database/*.sql
}

do_types() {
  do_reset
  # the CLI's `gen types` shells out to Docker even with --db-url, so we
  # call the generator it runs in that container directly. Same package,
  # same template, no daemon.
  node "$ROOT/scripts/gen-types.mjs" "postgresql://postgres@127.0.0.1:$PGPORT/$PGDB" > "$TYPES_OUT"
  echo "wrote $TYPES_OUT"
}

case "${1:-}" in
  reset) do_reset ;;
  test)  do_test ;;
  types) do_types ;;
  psql)  start_server; exec psql -h 127.0.0.1 -p "$PGPORT" -U postgres -d "$PGDB" ;;
  stop)
    running && run_pg "pg_ctl -D '$PGDATA_ROOT/data' stop -m fast" >/dev/null || true
    rm -rf "$PGDATA_ROOT"
    echo "stopped"
    ;;
  *) sed -n '2,30p' "$0" | sed 's/^#\{1,2\} \{0,1\}//'; exit 1 ;;
esac
