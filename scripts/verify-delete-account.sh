#!/usr/bin/env bash
# B-2 acceptance script: the delete-account Edge Function against the local
# Supabase stack. Drives the flow with curl and psql rather than the app, so
# it can run headless in CI. See docs/analysis/02 - Codex Execution Runbook.md.
set -euo pipefail

eval "$(npx supabase status -o env)"
: "${API_URL:?not set — is supabase running?}"
: "${ANON_KEY:?not set}"
: "${SERVICE_ROLE_KEY:?not set}"
: "${DB_URL:?not set}"

say() { printf '\n==> %s\n' "$*"; }

# --- fresh throwaway persona, created via the admin API so the auth state is
#     complete (identities, encrypted_password, email_confirmed_at) without
#     relying on the seed's shape.
say "Creating a throwaway persona through the admin API"
CREATE=$(curl -sf -X POST "$API_URL/auth/v1/admin/users" \
  -H "apikey: $SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email":"delete-target@nearcast.test","password":"nearcast-local","email_confirm":true}')
USER_ID=$(echo "$CREATE" | jq -r .id)
[ -n "$USER_ID" ] && [ "$USER_ID" != "null" ] || { echo "admin create failed: $CREATE"; exit 1; }
echo "    user id: $USER_ID"

# Also stand up their profile row and the private companion, so deletion has
# something to anonymize and clear.
psql "$DB_URL" -q -c "insert into public.profiles (id, display_name, city) values ('$USER_ID', 'Delete Target', 'Bengaluru');" >/dev/null
psql "$DB_URL" -q -c "insert into public.profile_private (profile_id, adult_affirmed_at, phone_e164) values ('$USER_ID', now(), '+915555550101');" >/dev/null

# --- safety evidence that must survive. A report the persona filed.
say "Filing a report the persona owns; this must survive their deletion"
psql "$DB_URL" -q -c "insert into public.reports (reporter_id, subject_type, subject_id, reason_code) values ('$USER_ID', 'intent', '10000000-0000-0000-0000-000000000101', 'spam');" >/dev/null

# --- sign in
say "Signing in with password to obtain a user JWT"
SIGNIN=$(curl -sf -X POST "$API_URL/auth/v1/token?grant_type=password" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email":"delete-target@nearcast.test","password":"nearcast-local"}')
ACCESS=$(echo "$SIGNIN" | jq -r .access_token)
[ -n "$ACCESS" ] && [ "$ACCESS" != "null" ] || { echo "sign-in failed: $SIGNIN"; exit 1; }

# --- call the function
say "POST /functions/v1/delete-account"
RESPONSE=$(curl -sf -X POST "$API_URL/functions/v1/delete-account" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ACCESS" \
  -H "Content-Type: application/json" \
  -d '{"confirmation":"DELETE"}')
echo "    response: $RESPONSE"
echo "$RESPONSE" | jq -e '.ok == true' >/dev/null || { echo "function did not report ok"; exit 1; }

# --- session dead
say "Same access token must be refused now"
STATUS=$(curl -s -o /dev/null -w '%{http_code}' -X GET "$API_URL/auth/v1/user" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ACCESS")
case "$STATUS" in
  401|403) echo "    revoked ($STATUS)" ;;
  *) echo "session was NOT revoked: got $STATUS"; exit 1 ;;
esac

# --- sign-in refused
say "Sign-in with the same password must be refused (banned, not deleted)"
RETRY=$(curl -s -X POST "$API_URL/auth/v1/token?grant_type=password" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email":"delete-target@nearcast.test","password":"nearcast-local"}')
if echo "$RETRY" | jq -e '.access_token' >/dev/null 2>&1; then
  echo "sign-in succeeded when it should have been refused: $RETRY"
  exit 1
fi
echo "    refused"

# --- the invariants
say "auth.users row must still exist — profiles.id cascades from it"
COUNT=$(psql "$DB_URL" -tAc "select count(*) from auth.users where id = '$USER_ID'")
[ "$COUNT" = "1" ] || { echo "SERIOUS: auth.users row was destroyed"; exit 1; }

say "Profile is anonymized and deleted_at is set"
NAME=$(psql "$DB_URL" -tAc "select display_name from public.profiles where id = '$USER_ID'")
[ "$NAME" = "Deleted member" ] || { echo "profile not anonymized: got '$NAME'"; exit 1; }
DELETED_AT=$(psql "$DB_URL" -tAc "select deleted_at from public.profiles where id = '$USER_ID'")
[ -n "$DELETED_AT" ] || { echo "deleted_at not set"; exit 1; }
echo "    display_name='Deleted member', deleted_at=$DELETED_AT"

say "profile_private is cleared (contact detail must not survive deletion)"
PP=$(psql "$DB_URL" -tAc "select count(*) from public.profile_private where profile_id = '$USER_ID' and phone_e164 is not null")
[ "$PP" = "0" ] || { echo "phone_e164 survived deletion"; exit 1; }

say "account_deletions suppression row exists"
SUPPRESSED=$(psql "$DB_URL" -tAc "select count(*) from public.account_deletions where profile_id = '$USER_ID'")
[ "$SUPPRESSED" = "1" ] || { echo "account_deletions row missing"; exit 1; }

say "Safety evidence survives: the report they filed is still there"
REPORT=$(psql "$DB_URL" -tAc "select count(*) from public.reports where reporter_id = '$USER_ID'")
[ "$REPORT" = "1" ] || { echo "report was destroyed with the account"; exit 1; }

say "pg_cron registrations for the scheduled jobs"
JOBS=$(psql "$DB_URL" -tAc "select jobname || '|' || schedule from cron.job where jobname like 'nearcast_%' order by jobname")
echo "$JOBS" | grep -qx 'nearcast_apply_retention_policy|17 3 \* \* \*' || { echo "retention schedule wrong: $JOBS"; exit 1; }
echo "$JOBS" | grep -qx 'nearcast_expire_intents|\*/15 \* \* \* \*' || { echo "expire schedule wrong: $JOBS"; exit 1; }
echo "    $JOBS"

printf '\n==> B-2 verification passed.\n'
