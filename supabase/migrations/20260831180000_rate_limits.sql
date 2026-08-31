-- ---------------------------------------------------------------
-- Rate limits.
--
-- MUST-077: rate limits must protect authentication, intent creation,
-- responses, messaging and reporting. Only one of those was protected —
-- invitation redemption, which counts its own attempts. Authentication is
-- covered outside this schema: GoTrue rate-limits one-time-code sends and
-- the client already surfaces "email rate limit exceeded". The other four
-- had nothing.
--
-- Implemented as triggers rather than checks inside the four server
-- functions. Reports are inserted through a policy rather than a function,
-- so a function-level check would have missed them entirely, and a trigger
-- covers every path into the table including ones added later.
--
-- Counting happens BEFORE the event is recorded, and the record is written
-- only when the operation proceeds. That ordering is deliberate: a `raise`
-- rolls back the whole call, so recording first and then raising would
-- undo the very row the limit depends on and leave the counter at zero
-- forever. That bug is why invitation attempts return an outcome instead
-- of raising.
--
-- An actor with no `auth.uid()` is not rate limited. That is the migration,
-- the seed and the test suite writing as the owner, none of which is a
-- client. A limit is per authenticated person by definition.
-- ---------------------------------------------------------------

create table private.rate_events (
  id bigint generated always as identity primary key,
  actor_id uuid not null,
  operation text not null,
  occurred_at timestamptz not null default now()
);

create index rate_events_lookup
  on private.rate_events (actor_id, operation, occurred_at desc);

-- Not client-readable. RLS on with no policies denies every authenticated
-- path; only the definer triggers below touch it.
alter table private.rate_events enable row level security;

comment on table private.rate_events is
  'One row per rate-limited action. Rows older than the longest window are '
  'dead weight and can be pruned on any schedule; nothing reads them.';

create or replace function private.enforce_rate(
  operation text,
  max_events integer,
  window_length interval
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  recent integer;
begin
  if actor is null then
    return;
  end if;

  select count(*) into recent
  from private.rate_events e
  where e.actor_id = actor
    and e.operation = enforce_rate.operation
    and e.occurred_at > now() - window_length;

  if recent >= max_events then
    raise exception 'rate_limited' using errcode = '53400';
  end if;

  insert into private.rate_events (actor_id, operation)
  values (actor, enforce_rate.operation);
end;
$$;

-- The four limits. Sized to be invisible to a person using the app and
-- obstructive to a script: a busy caster publishes a handful a day, and a
-- busy conversation is dozens of messages an hour, not hundreds.

create or replace function private.rate_limit_intents()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform private.enforce_rate('publish-intent', 10, interval '1 hour');
  return new;
end;
$$;

create or replace function private.rate_limit_responses()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform private.enforce_rate('submit-response', 30, interval '1 hour');
  return new;
end;
$$;

create or replace function private.rate_limit_messages()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform private.enforce_rate('send-message', 120, interval '1 hour');
  return new;
end;
$$;

create or replace function private.rate_limit_reports()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform private.enforce_rate('submit-report', 10, interval '1 hour');
  return new;
end;
$$;

create trigger rate_limit_intents
  before insert on public.intents
  for each row execute function private.rate_limit_intents();

create trigger rate_limit_responses
  before insert on public.responses
  for each row execute function private.rate_limit_responses();

create trigger rate_limit_messages
  before insert on public.messages
  for each row execute function private.rate_limit_messages();

create trigger rate_limit_reports
  before insert on public.reports
  for each row execute function private.rate_limit_reports();

revoke execute on function private.enforce_rate(text, integer, interval) from public, anon, authenticated;
