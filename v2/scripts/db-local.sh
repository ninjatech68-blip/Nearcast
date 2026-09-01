#!/usr/bin/env bash
# Apply the schema and run the law suite against a plain local PostgreSQL.
#
# No Docker required. Supabase's own stack needs a Docker daemon, which is
# not always available; the parts we care about here -- schema, RLS, grants,
# functions, pgTAP -- are ordinary Postgres and run fine without it.
#
#   ./scripts/db-local.sh start   bring up a throwaway cluster
#   ./scripts/db-local.sh reset   drop, re-apply every migration
#   ./scripts/db-local.sh test    reset, then run every *.test.sql
#   ./scripts/db-local.sh stop    tear the cluster down
set -euo pipefail

PGBIN="${PGBIN:-/usr/lib/postgresql/16/bin}"
PGDIR="${PGDIR:-/var/tmp/nearcast-pg}"
PGPORT="${PGPORT:-55432}"
PGHOST_DIR="${PGHOST_DIR:-/var/tmp}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PSQL="psql -h $PGHOST_DIR -p $PGPORT -U postgres -q -X -v ON_ERROR_STOP=1"

launch() {
  su nobody -s /bin/sh -c "$PGBIN/pg_ctl -D $PGDIR -o '-p $PGPORT -k $PGHOST_DIR -c listen_addresses=' -l $PGDIR/pg.log start" >/dev/null
  for _ in $(seq 1 20); do
    pg_isready -h "$PGHOST_DIR" -p "$PGPORT" -q && return 0
    sleep 0.5
  done
  echo "postgres did not come up; last log lines:" >&2
  tail -20 "$PGDIR/pg.log" >&2
  return 1
}

start() {
  # A data directory is not a running server. The container can be reclaimed
  # between invocations, leaving $PGDIR intact and the postmaster gone -- so
  # ask the server, not the filesystem.
  if pg_isready -h "$PGHOST_DIR" -p "$PGPORT" -q; then
    echo "postgres already up on $PGPORT"; return
  fi
  if [ -d "$PGDIR/base" ]; then
    echo "data directory present, server down -- restarting"
    launch && return
    echo "restart failed; reinitialising" >&2
  fi
  rm -rf "$PGDIR"; mkdir -p "$PGDIR"; chown nobody "$PGDIR"; chmod 700 "$PGDIR"
  su nobody -s /bin/sh -c "$PGBIN/initdb -U postgres -A trust -D $PGDIR" >/dev/null
  launch
  $PSQL -c "alter database postgres set search_path = public, extensions;"
  echo "postgres up on $PGPORT"
}

reset() {
  $PSQL -c "drop schema if exists public cascade; drop schema if exists private cascade; create schema public;"
  $PSQL -f "$ROOT/supabase/tests/bootstrap-local.sql"
  for m in "$ROOT"/supabase/migrations/*.sql; do
    echo "  apply $(basename "$m")"
    $PSQL -f "$m"
  done
}

test_all() {
  reset
  local fail=0 total=0
  for t in "$ROOT"/supabase/tests/database/*.test.sql; do
    echo "  -- $(basename "$t")"
    out=$(psql -h "$PGHOST_DIR" -p "$PGPORT" -U postgres -tA -X -f "$t" 2>&1)
    echo "$out" | grep -E "^not ok" | sed 's/^/     /' || true
    total=$(( total + $(echo "$out" | grep -cE "^ok |^not ok" || true) ))
    fail=$((  fail  + $(echo "$out" | grep -cE "^not ok" || true) ))
  done
  echo
  echo "  $total assertions, $fail failing"
  [ "$fail" -eq 0 ] || exit 1
}

case "${1:-test}" in
  start) start ;;
  reset) start; reset ;;
  test)  start; test_all ;;
  stop)  su nobody -s /bin/sh -c "$PGBIN/pg_ctl -D $PGDIR stop" >/dev/null 2>&1 || true; rm -rf "$PGDIR"; echo "stopped" ;;
  *) echo "usage: $0 {start|reset|test|stop}"; exit 2 ;;
esac
