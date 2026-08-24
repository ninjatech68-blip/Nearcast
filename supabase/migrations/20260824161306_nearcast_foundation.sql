+-- Nearcast foundation: trust-aware intent lifecycle and privacy boundaries.
create extension if not exists postgis with schema extensions;
create extension if not exists pgcrypto with schema extensions;
create schema if not exists private;

create type public.intent_primitive as enum ('request', 'offer', 'plan');
create type public.intent_status as enum ('draft', 'live', 'matched', 'resolved', 'expired', 'withdrawn', 'restricted');
create type public.reach_level as enum ('origin_only', 'adjacent_network', 'nearby_relevant', 'broader_approved');
create type public.response_status as enum ('pending', 'accepted', 'declined', 'withdrawn');
create type public.report_status as enum ('open', 'reviewing', 'actioned', 'dismissed');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 60),
  avatar_path text,
  city text,
  is_restricted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profile_private (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  phone_e164 text,
  contact_preferences jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table public.blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create table public.intents (
  id uuid primary key default gen_random_uuid(),
  broadcaster_id uuid not null references public.profiles(id) on delete cascade,
  primitive public.intent_primitive not null,
  statement text not null check (char_length(btrim(statement)) between 1 and 500),
  status public.intent_status not null default 'draft',
  restricted_from public.intent_status check (restricted_from in ('live', 'matched')),
  response_action text not null check (char_length(btrim(response_action)) between 1 and 40),
  expires_at timestamptz not null,
  published_at timestamptz,
  resolved_at timestamptz,
  share_slug uuid not null default gen_random_uuid() unique,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (expires_at > created_at),
  check ((status = 'restricted') = (restricted_from is not null))
);

create table public.intent_context (
  intent_id uuid primary key references public.intents(id) on delete cascade,
  starts_at timestamptz,
  deadline_at timestamptz,
  quantity numeric check (quantity > 0),
  price_minor bigint check (price_minor >= 0),
  currency char(3),
  approximate_place text,
  approximate_geography extensions.geography(point, 4326),
  requirements jsonb not null default '[]'::jsonb,
  check ((price_minor is null) = (currency is null))
);

create index intent_context_geography_idx
  on public.intent_context using gist (approximate_geography);

create table public.intent_private (
  intent_id uuid primary key references public.intents(id) on delete cascade,
  exact_geography extensions.geography(point, 4326),
  exact_address text,
  private_contact text,
  coordination_notes text,
  updated_at timestamptz not null default now()
);

create table public.intent_reach (
  intent_id uuid primary key references public.intents(id) on delete cascade,
  level public.reach_level not null default 'origin_only',
  public_link_enabled boolean not null default true,
  show_broadcaster_first_name boolean not null default true,
  expanded_at timestamptz,
  updated_at timestamptz not null default now()
);

create table public.intent_confirmations (
  intent_id uuid not null references public.intents(id) on delete cascade,
  confirmer_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (intent_id, confirmer_id)
);

create table public.intent_deliveries (
  id uuid primary key default gen_random_uuid(),
  intent_id uuid not null references public.intents(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  reason_code text not null check (reason_code in ('origin_recipient', 'adjacent_trust_connection', 'nearby_interest_match', 'broader_approved_match')),
  reason_text text not null check (char_length(btrim(reason_text)) between 1 and 160),
  delivered_at timestamptz not null default now(),
  hidden_at timestamptz,
  feedback text check (feedback in ('not_relevant')),
  unique (intent_id, recipient_id)
);

create table public.responses (
  id uuid primary key default gen_random_uuid(),
  intent_id uuid not null references public.intents(id) on delete cascade,
  respondent_id uuid not null references public.profiles(id) on delete cascade,
  message text not null check (char_length(btrim(message)) between 1 and 1000),
  qualification jsonb not null default '{}'::jsonb,
  status public.response_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (intent_id, respondent_id)
);

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  intent_id uuid not null unique references public.intents(id) on delete cascade,
  response_id uuid not null unique references public.responses(id) on delete cascade,
  broadcaster_id uuid not null references public.profiles(id) on delete cascade,
  participant_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  closed_at timestamptz,
  check (broadcaster_id <> participant_id)
);

create table public.match_disclosures (
  match_id uuid not null references public.matches(id) on delete cascade,
  field_name text not null check (field_name in ('exact_geography', 'exact_address', 'private_contact', 'coordination_notes')),
  released_by uuid not null references public.profiles(id),
  released_at timestamptz not null default now(),
  primary key (match_id, field_name)
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null unique references public.matches(id) on delete cascade,
  created_at timestamptz not null default now(),
  closed_at timestamptz
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid references public.profiles(id) on delete set null,
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  is_system boolean not null default false,
  created_at timestamptz not null default now()
);

create index messages_conversation_created_idx
  on public.messages (conversation_id, created_at);

create table public.interaction_outcomes (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  completed boolean not null,
  disputed boolean not null default false,
  created_at timestamptz not null default now(),
  unique (match_id, reporter_id)
);

create table public.intent_events (
  id bigint generated always as identity primary key,
  intent_id uuid not null references public.intents(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  event_type text not null,
  from_status public.intent_status,
  to_status public.intent_status,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  subject_type text not null check (subject_type in ('profile', 'intent', 'response', 'message')),
  subject_id uuid not null,
  reason_code text not null,
  details text check (char_length(details) <= 1000),
  status public.report_status not null default 'open',
  created_at timestamptz not null default now()
);

create table public.notification_jobs (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  event_type text not null,
  object_type text not null,
  object_id uuid not null,
  idempotency_key text not null unique,
  attempts smallint not null default 0,
  available_at timestamptz not null default now(),
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.analytics_outbox (
  id bigint generated always as identity primary key,
  event_name text not null,
  actor_id uuid,
  object_id uuid,
  properties jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  delivered_at timestamptz,
  check (not (properties ?| array['intent_text', 'message', 'exact_coordinates', 'contact_information', 'private_group_name']))
);

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
create trigger intents_set_updated_at before update on public.intents
for each row execute function public.set_updated_at();
create trigger responses_set_updated_at before update on public.responses
for each row execute function public.set_updated_at();

create or replace function private.is_blocked(left_profile uuid, right_profile uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.blocks
    where (blocker_id = left_profile and blocked_id = right_profile)
       or (blocker_id = right_profile and blocked_id = left_profile)
  );
$$;

create or replace function public.accept_response(
  response_to_accept uuid,
  expected_intent_status public.intent_status
)
returns public.matches
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_response public.responses;
  selected_intent public.intents;
  accepted_match public.matches;
begin
  select * into selected_response
  from public.responses
  where id = response_to_accept
  for update;

  if selected_response.id is null then
    raise exception 'response_not_found' using errcode = 'P0002';
  end if;

  select * into selected_intent
  from public.intents
  where id = selected_response.intent_id
  for update;

  if selected_intent.broadcaster_id <> auth.uid() then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  select * into accepted_match
  from public.matches
  where response_id = selected_response.id;

  if accepted_match.id is not null then
    return accepted_match;
  end if;

  if selected_intent.status <> expected_intent_status or selected_intent.status <> 'live' then
    raise exception 'stale_intent_state' using errcode = '40001';
  end if;

  if selected_response.status <> 'pending' then
    raise exception 'response_not_pending' using errcode = '23514';
  end if;

  if private.is_blocked(selected_intent.broadcaster_id, selected_response.respondent_id) then
    raise exception 'blocked_relationship' using errcode = '42501';
  end if;

  insert into public.matches (
    intent_id, response_id, broadcaster_id, participant_id
  ) values (
    selected_intent.id, selected_response.id, selected_intent.broadcaster_id, selected_response.respondent_id
  ) returning * into accepted_match;

  update public.responses set status = 'accepted'
  where id = selected_response.id;

  update public.intents set status = 'matched', version = version + 1
  where id = selected_intent.id;

  insert into public.conversations (match_id) values (accepted_match.id);
  insert into public.intent_events (
    intent_id, actor_id, event_type, from_status, to_status
  ) values (
    selected_intent.id, auth.uid(), 'response_accepted', 'live', 'matched'
  );

  return accepted_match;
end;
$$;

create or replace function public.get_public_intent(requested_share_slug uuid)
returns table (
  id uuid,
  share_slug uuid,
  primitive public.intent_primitive,
  statement text,
  response_action text,
  expires_at timestamptz,
  published_at timestamptz,
  starts_at timestamptz,
  deadline_at timestamptz,
  quantity numeric,
  price_minor bigint,
  currency char(3),
  approximate_place text,
  broadcaster_first_name text,
  confirmation_count bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    i.id,
    i.share_slug,
    i.primitive,
    i.statement,
    i.response_action,
    i.expires_at,
    i.published_at,
    c.starts_at,
    c.deadline_at,
    c.quantity,
    c.price_minor,
    c.currency,
    c.approximate_place,
    case when r.show_broadcaster_first_name then split_part(p.display_name, ' ', 1) else null end,
    (select count(*) from public.intent_confirmations ic where ic.intent_id = i.id)
  from public.intents i
  join public.intent_context c on c.intent_id = i.id
  join public.intent_reach r on r.intent_id = i.id
  join public.profiles p on p.id = i.broadcaster_id
  where i.share_slug = requested_share_slug
    and i.status = 'live'
    and i.expires_at > now()
    and r.public_link_enabled;
$$;

alter table public.profiles enable row level security;
alter table public.profile_private enable row level security;
alter table public.blocks enable row level security;
alter table public.intents enable row level security;
alter table public.intent_context enable row level security;
alter table public.intent_private enable row level security;
alter table public.intent_reach enable row level security;
alter table public.intent_confirmations enable row level security;
alter table public.intent_deliveries enable row level security;
alter table public.responses enable row level security;
alter table public.matches enable row level security;
alter table public.match_disclosures enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.interaction_outcomes enable row level security;
alter table public.intent_events enable row level security;
alter table public.reports enable row level security;
alter table public.notification_jobs enable row level security;
alter table public.analytics_outbox enable row level security;

create policy profiles_read_authenticated on public.profiles for select to authenticated
using (not private.is_blocked(id, auth.uid()));
create policy profiles_insert_self on public.profiles for insert to authenticated
with check (id = auth.uid());
create policy profiles_update_self on public.profiles for update to authenticated
using (id = auth.uid()) with check (id = auth.uid());

create policy profile_private_self on public.profile_private for all to authenticated
using (profile_id = auth.uid()) with check (profile_id = auth.uid());

create policy blocks_read_own on public.blocks for select to authenticated
using (blocker_id = auth.uid());
create policy blocks_insert_own on public.blocks for insert to authenticated
with check (blocker_id = auth.uid());
create policy blocks_delete_own on public.blocks for delete to authenticated
using (blocker_id = auth.uid());

create policy intents_read_owner_or_delivery on public.intents for select to authenticated
using (
  broadcaster_id = auth.uid()
  or (
    status in ('live', 'matched')
    and expires_at > now()
    and not private.is_blocked(broadcaster_id, auth.uid())
    and (
      exists (select 1 from public.intent_deliveries d where d.intent_id = id and d.recipient_id = auth.uid() and d.hidden_at is null)
      or exists (select 1 from public.responses r where r.intent_id = id and r.respondent_id = auth.uid())
      or exists (select 1 from public.matches m where m.intent_id = id and m.participant_id = auth.uid())
    )
  )
);
create policy intents_insert_owner on public.intents for insert to authenticated
with check (broadcaster_id = auth.uid() and status = 'draft');
create policy intents_update_owner on public.intents for update to authenticated
using (broadcaster_id = auth.uid() and status = 'draft')
with check (broadcaster_id = auth.uid() and status = 'draft');

create policy context_read_visible_intent on public.intent_context for select to authenticated
using (exists (select 1 from public.intents i where i.id = intent_id));
create policy context_write_owner on public.intent_context for all to authenticated
using (exists (select 1 from public.intents i where i.id = intent_id and i.broadcaster_id = auth.uid() and i.status = 'draft'))
with check (exists (select 1 from public.intents i where i.id = intent_id and i.broadcaster_id = auth.uid() and i.status = 'draft'));

create policy private_intent_owner_read on public.intent_private for select to authenticated
using (exists (select 1 from public.intents i where i.id = intent_id and i.broadcaster_id = auth.uid()));
create policy private_intent_owner_write on public.intent_private for all to authenticated
using (exists (select 1 from public.intents i where i.id = intent_id and i.broadcaster_id = auth.uid() and i.status = 'draft'))
with check (exists (select 1 from public.intents i where i.id = intent_id and i.broadcaster_id = auth.uid() and i.status = 'draft'));

create policy reach_read_visible_intent on public.intent_reach for select to authenticated
using (exists (select 1 from public.intents i where i.id = intent_id));
create policy reach_write_owner on public.intent_reach for all to authenticated
using (exists (select 1 from public.intents i where i.id = intent_id and i.broadcaster_id = auth.uid() and i.status = 'draft'))
with check (exists (select 1 from public.intents i where i.id = intent_id and i.broadcaster_id = auth.uid() and i.status = 'draft'));

create policy confirmations_read_visible_intent on public.intent_confirmations for select to authenticated
using (exists (select 1 from public.intents i where i.id = intent_id));
create policy confirmations_insert_self on public.intent_confirmations for insert to authenticated
with check (
  confirmer_id = auth.uid()
  and exists (select 1 from public.intents i where i.id = intent_id and i.broadcaster_id <> auth.uid() and i.status = 'live')
);
create policy confirmations_delete_self on public.intent_confirmations for delete to authenticated
using (confirmer_id = auth.uid());

create policy deliveries_read_recipient_or_owner on public.intent_deliveries for select to authenticated
using (
  recipient_id = auth.uid()
  or exists (select 1 from public.intents i where i.id = intent_id and i.broadcaster_id = auth.uid())
);
create policy deliveries_update_recipient on public.intent_deliveries for update to authenticated
using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());

create policy responses_read_parties on public.responses for select to authenticated
using (
  respondent_id = auth.uid()
  or exists (select 1 from public.intents i where i.id = intent_id and i.broadcaster_id = auth.uid())
);
create policy responses_insert_recipient on public.responses for insert to authenticated
with check (
  respondent_id = auth.uid()
  and status = 'pending'
  and exists (
    select 1 from public.intents i
    join public.intent_deliveries d on d.intent_id = i.id
    where i.id = intent_id and i.status = 'live' and i.expires_at > now()
      and i.broadcaster_id <> auth.uid() and d.recipient_id = auth.uid()
      and not private.is_blocked(i.broadcaster_id, auth.uid())
  )
);
create policy responses_update_respondent_pending on public.responses for update to authenticated
using (respondent_id = auth.uid() and status = 'pending')
with check (respondent_id = auth.uid() and status in ('pending', 'withdrawn'));

create policy matches_read_parties on public.matches for select to authenticated
using (broadcaster_id = auth.uid() or participant_id = auth.uid());
create policy disclosures_read_parties on public.match_disclosures for select to authenticated
using (exists (select 1 from public.matches m where m.id = match_id and auth.uid() in (m.broadcaster_id, m.participant_id)));
create policy disclosures_insert_releaser on public.match_disclosures for insert to authenticated
with check (released_by = auth.uid() and exists (select 1 from public.matches m where m.id = match_id and auth.uid() in (m.broadcaster_id, m.participant_id)));

create policy conversations_read_parties on public.conversations for select to authenticated
using (exists (select 1 from public.matches m where m.id = match_id and auth.uid() in (m.broadcaster_id, m.participant_id)));
create policy messages_read_parties on public.messages for select to authenticated
using (exists (select 1 from public.conversations c join public.matches m on m.id = c.match_id where c.id = conversation_id and auth.uid() in (m.broadcaster_id, m.participant_id)));
create policy messages_insert_parties on public.messages for insert to authenticated
with check (
  sender_id = auth.uid() and not is_system
  and exists (select 1 from public.conversations c join public.matches m on m.id = c.match_id where c.id = conversation_id and c.closed_at is null and auth.uid() in (m.broadcaster_id, m.participant_id))
);

create policy outcomes_read_parties on public.interaction_outcomes for select to authenticated
using (exists (select 1 from public.matches m where m.id = match_id and auth.uid() in (m.broadcaster_id, m.participant_id)));
create policy outcomes_insert_self on public.interaction_outcomes for insert to authenticated
with check (reporter_id = auth.uid() and exists (select 1 from public.matches m where m.id = match_id and auth.uid() in (m.broadcaster_id, m.participant_id)));

create policy events_read_owner on public.intent_events for select to authenticated
using (exists (select 1 from public.intents i where i.id = intent_id and i.broadcaster_id = auth.uid()));
create policy reports_insert_self on public.reports for insert to authenticated
with check (reporter_id = auth.uid());
create policy reports_read_self on public.reports for select to authenticated
using (reporter_id = auth.uid());

grant usage on schema public to anon, authenticated;
revoke all on schema private from public;
grant usage on schema private to authenticated;
grant select, insert, update, delete on public.profiles, public.profile_private, public.blocks,
  public.intents, public.intent_context, public.intent_private, public.intent_reach,
  public.intent_confirmations, public.intent_deliveries, public.responses, public.matches,
  public.match_disclosures, public.conversations, public.messages, public.interaction_outcomes,
  public.intent_events, public.reports to authenticated;
grant usage, select on all sequences in schema public to authenticated;
revoke execute on function public.accept_response(uuid, public.intent_status) from public, anon;
revoke execute on function public.get_public_intent(uuid) from public;
revoke execute on function private.is_blocked(uuid, uuid) from public, anon;
grant execute on function public.accept_response(uuid, public.intent_status) to authenticated;
grant execute on function public.get_public_intent(uuid) to anon, authenticated;
grant execute on function private.is_blocked(uuid, uuid) to authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;
