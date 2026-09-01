-- ===============================================================
-- Coordination: accepting, talking, and confirming you met.
-- ===============================================================
--
-- Closes L4 (a receipt needs both) and L13 (a window widens only by
-- mutual agreement, and never past a month).
--
-- Two clocks, deliberately separate. The cast expires when the
-- activity is over (D6). The thread expires 24 hours AFTER the
-- activity and can be extended (D16). An earlier design of mine tied
-- the thread's survival to the receipt, which conflated "did you meet"
-- with "do you want to keep talking" and made a missed tap destroy a
-- conversation both people wanted.
--
-- Media is not here. Photos and location (D12) arrive with the media
-- slice, which is where L11 lives -- and a shared coordinate needs L2
-- squared with it explicitly rather than in passing.
-- ===============================================================

-- --------------------------------------------------------------
-- 1. the window
-- --------------------------------------------------------------
-- Three tiers and no fourth. The absence of a 'forever' member is the
-- enforcement of D16: there is no value to set, so no code path can
-- set one, and adding one is a migration somebody has to justify.
create type public.chat_window as enum ('initial', 'week', 'month');

create or replace function private.window_rank(w public.chat_window)
returns integer language sql immutable set search_path = '' as $$
  select case w when 'initial' then 0 when 'week' then 1 when 'month' then 2 end;
$$;

-- The window always measures from the activity, never from now. A cast
-- five days out would otherwise lose its thread four days before the
-- thing the thread exists to arrange.
create or replace function private.window_end(base timestamptz, w public.chat_window)
returns timestamptz language sql stable set search_path = '' as $$
  select case w
    when 'initial' then base + interval '24 hours'
    when 'week'    then greatest(base, now()) + interval '7 days'
    when 'month'   then greatest(base, now()) + interval '30 days'
  end;
$$;

-- --------------------------------------------------------------
-- 2. threads
-- --------------------------------------------------------------
create table public.threads (
  id uuid primary key default gen_random_uuid(),
  cast_id uuid not null references public.casts(id) on delete cascade,
  caster_id uuid not null references public.people(id) on delete cascade,
  joiner_id uuid not null references public.people(id) on delete cascade,
  window_tier public.chat_window not null default 'initial',
  -- L13: not null. The predecessor made this nullable, never set it on
  -- insert, and treated null as open -- so every chat displayed a
  -- 24-hour countdown and lived forever. The invariant belongs here,
  -- not in the code that reads it.
  expires_at timestamptz not null,
  window_changed_at timestamptz not null default now(),
  closed_at timestamptz,
  closed_reason text check (closed_reason in ('expired', 'ended', 'blocked')),
  created_at timestamptz not null default now(),
  unique (cast_id, joiner_id),
  check (caster_id <> joiner_id),
  check ((closed_at is null) = (closed_reason is null))
);
create index threads_caster_idx on public.threads (caster_id, expires_at desc);
create index threads_joiner_idx on public.threads (joiner_id, expires_at desc);

create table public.thread_window_proposals (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.threads(id) on delete cascade,
  tier public.chat_window not null,
  proposed_by uuid not null references public.people(id) on delete cascade,
  proposed_at timestamptz not null default now(),
  resolved_at timestamptz,
  accepted boolean,
  check ((resolved_at is null) = (accepted is null))
);
-- one open proposal per thread, enforced by the index rather than by
-- whichever function remembers to check
create unique index thread_one_open_proposal
  on public.thread_window_proposals (thread_id) where resolved_at is null;

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.threads(id) on delete cascade,
  sender_id uuid references public.people(id) on delete set null,
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  is_system boolean not null default false,
  created_at timestamptz not null default now()
);
create index messages_thread_idx on public.messages (thread_id, created_at desc);

-- A read cursor, not per-message receipts. These are pair threads: what
-- the other person needs to know is "seen up to here", and one row per
-- person per thread says it without a row per message.
create table public.thread_reads (
  thread_id uuid not null references public.threads(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (thread_id, person_id)
);

-- --------------------------------------------------------------
-- 3. helpers -- caller-scoped, per the corollary
-- --------------------------------------------------------------
create or replace function private.in_thread(t uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.threads
     where id = t and auth.uid() in (caster_id, joiner_id)
  );
$$;

create or replace function private.thread_open(t uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.threads
     where id = t and closed_at is null and expires_at > now()
  );
$$;

-- --------------------------------------------------------------
-- 4. rls -- SELECT only, parties only
-- --------------------------------------------------------------
alter table public.threads enable row level security;
alter table public.thread_window_proposals enable row level security;
alter table public.messages enable row level security;
alter table public.thread_reads enable row level security;

create policy threads_read_parties on public.threads for select to authenticated
using (auth.uid() in (caster_id, joiner_id));
create policy proposals_read_parties on public.thread_window_proposals for select to authenticated
using (private.in_thread(thread_id));
create policy messages_read_parties on public.messages for select to authenticated
using (private.in_thread(thread_id));
create policy reads_read_parties on public.thread_reads for select to authenticated
using (private.in_thread(thread_id));

-- --------------------------------------------------------------
-- 5. accepting opens the thread
-- --------------------------------------------------------------
create or replace function public.accept_join_request(in_request uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare me uuid := private.assert_actor();
        req public.join_requests;
        target public.casts;
        taken integer;
        new_id uuid;
begin
  select * into req from public.join_requests where id = in_request for update;
  if req.id is null then raise exception 'request_not_found' using errcode = 'P0002'; end if;
  select * into target from public.casts where id = req.cast_id for update;

  -- only the caster decides. The requester accepting themselves would
  -- be the whole point of the mechanism defeated.
  if target.caster_id <> me then raise exception 'not_your_cast' using errcode = '42501'; end if;
  if req.state <> 'pending' then raise exception 'already_decided' using errcode = '23514'; end if;
  if private.is_blocked(me, req.person_id) then
    raise exception 'not_your_cast' using errcode = '42501';
  end if;

  select count(*) into taken from public.join_requests
   where cast_id = req.cast_id and state = 'accepted';
  if taken >= target.slots then raise exception 'cast_full' using errcode = '23514'; end if;

  update public.join_requests set state = 'accepted', decided_at = now() where id = in_request;

  insert into public.threads (cast_id, caster_id, joiner_id, window_tier, expires_at)
  values (req.cast_id, me, req.person_id, 'initial',
          private.window_end(target.happens_at, 'initial'))
  returning id into new_id;

  insert into public.messages (thread_id, sender_id, body, is_system)
  values (new_id, null, 'this chat closes 24 hours after the plan. you can both agree to keep it longer.', true);

  insert into public.cast_events (cast_id, actor_id, event) values (req.cast_id, me, 'join_accepted');
  insert into public.notification_outbox (person_id, kind, object_id, idempotency_key)
  values (req.person_id, 'join_accepted', new_id, 'accepted:' || in_request::text);
  return new_id;
end;
$$;

create or replace function public.decline_join_request(in_request uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare me uuid := private.assert_actor();
        req public.join_requests;
begin
  select * into req from public.join_requests where id = in_request for update;
  if req.id is null then raise exception 'request_not_found' using errcode = 'P0002'; end if;
  if not exists (select 1 from public.casts where id = req.cast_id and caster_id = me) then
    raise exception 'not_your_cast' using errcode = '42501';
  end if;
  if req.state <> 'pending' then raise exception 'already_decided' using errcode = '23514'; end if;
  update public.join_requests set state = 'declined', decided_at = now() where id = in_request;
  -- Q2 stands: the requester is not told they were passed over by name.
end;
$$;

-- --------------------------------------------------------------
-- 6. the window: widening needs both, narrowing needs one
-- --------------------------------------------------------------
create or replace function public.propose_window(in_thread uuid, in_tier public.chat_window)
returns void language plpgsql security definer set search_path = '' as $$
declare me uuid := private.assert_actor();
        th public.threads;
begin
  select * into th from public.threads where id = in_thread for update;
  if th.id is null or me not in (th.caster_id, th.joiner_id) then
    raise exception 'not_a_party' using errcode = '42501';
  end if;
  if not private.thread_open(in_thread) then
    raise exception 'thread_closed' using errcode = '23514';
  end if;
  if private.window_rank(in_tier) <= private.window_rank(th.window_tier) then
    raise exception 'not_a_widening' using errcode = '23514';   -- narrowing is its own verb
  end if;
  if exists (select 1 from public.thread_window_proposals
              where thread_id = in_thread and resolved_at is null) then
    raise exception 'proposal_already_open' using errcode = '23514';
  end if;
  -- One ask per tier per window. Without this a consent mechanism
  -- becomes a nagging mechanism, and the neutral decline below would be
  -- protecting nobody.
  --
  -- >= and not >. now() is transaction_timestamp, so a proposal made in
  -- the same transaction as the window change carries an identical
  -- timestamp, and a strict > would silently let the refused tier back
  -- in. "Since the window last changed" includes the instant it changed.
  if exists (select 1 from public.thread_window_proposals
              where thread_id = in_thread and tier = in_tier
                and accepted is false and proposed_at >= th.window_changed_at) then
    raise exception 'already_refused' using errcode = '23514';
  end if;

  insert into public.thread_window_proposals (thread_id, tier, proposed_by)
  values (in_thread, in_tier, me);

  insert into public.messages (thread_id, sender_id, body, is_system)
  values (in_thread, null,
    case in_tier when 'week' then 'this could run 7 days. it takes you both.'
                 else 'this could run a month. it takes you both.' end, true);
end;
$$;

create or replace function public.respond_to_window(in_thread uuid, in_accept boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare me uuid := private.assert_actor();
        th public.threads;
        prop public.thread_window_proposals;
begin
  select * into th from public.threads where id = in_thread for update;
  if th.id is null or me not in (th.caster_id, th.joiner_id) then
    raise exception 'not_a_party' using errcode = '42501';
  end if;
  select * into prop from public.thread_window_proposals
   where thread_id = in_thread and resolved_at is null for update;
  if prop.id is null then raise exception 'no_open_proposal' using errcode = 'P0002'; end if;
  if prop.proposed_by = me then
    raise exception 'proposer_cannot_accept' using errcode = '42501';
  end if;

  update public.thread_window_proposals
     set resolved_at = now(), accepted = in_accept where id = prop.id;

  if not in_accept then
    -- D16: silence and refusal look the same from the other side. The
    -- thread says the window is unchanged, never that someone said no.
    insert into public.messages (thread_id, sender_id, body, is_system)
    values (in_thread, null, 'the window stays as it is.', true);
    return;
  end if;

  update public.threads
     set window_tier = prop.tier,
         expires_at = private.window_end(
           (select happens_at from public.casts where id = th.cast_id), prop.tier),
         window_changed_at = now()
   where id = in_thread;

  insert into public.messages (thread_id, sender_id, body, is_system)
  values (in_thread, null,
    case prop.tier when 'week' then 'you both said yes. 7 days.'
                   else 'you both said yes. a month.' end, true);
end;
$$;

-- Narrowing and ending take one person. Only widening is a joint act --
-- nobody needs the other's permission to want less of something.
create or replace function public.narrow_window(in_thread uuid, in_tier public.chat_window)
returns void language plpgsql security definer set search_path = '' as $$
declare me uuid := private.assert_actor();
        th public.threads;
begin
  select * into th from public.threads where id = in_thread for update;
  if th.id is null or me not in (th.caster_id, th.joiner_id) then
    raise exception 'not_a_party' using errcode = '42501';
  end if;
  if private.window_rank(in_tier) >= private.window_rank(th.window_tier) then
    raise exception 'not_a_narrowing' using errcode = '23514';
  end if;

  update public.threads
     set window_tier = in_tier,
         expires_at = least(expires_at, private.window_end(
           (select happens_at from public.casts where id = th.cast_id), in_tier)),
         window_changed_at = now()
   where id = in_thread;
  update public.thread_window_proposals
     set resolved_at = now(), accepted = false
   where thread_id = in_thread and resolved_at is null;
end;
$$;

create or replace function public.end_thread(in_thread uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare me uuid := private.assert_actor();
begin
  update public.threads set closed_at = now(), closed_reason = 'ended'
   where id = in_thread and closed_at is null and me in (caster_id, joiner_id);
  if not found then raise exception 'not_a_party' using errcode = '42501'; end if;
  insert into public.messages (thread_id, sender_id, body, is_system)
  values (in_thread, null, 'this chat is closed. nothing more comes through.', true);
end;
$$;

-- --------------------------------------------------------------
-- 7. messages
-- --------------------------------------------------------------
create or replace function public.send_message(in_thread uuid, in_body text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare me uuid := private.assert_actor();
        th public.threads;
        new_id uuid;
begin
  select * into th from public.threads where id = in_thread;
  if th.id is null or me not in (th.caster_id, th.joiner_id) then
    raise exception 'not_a_party' using errcode = '42501';
  end if;
  if not private.thread_open(in_thread) then
    raise exception 'window_closed' using errcode = '23514';
  end if;
  if private.is_blocked(th.caster_id, th.joiner_id) then
    raise exception 'not_a_party' using errcode = '42501';       -- L7
  end if;

  insert into public.messages (thread_id, sender_id, body)
  values (in_thread, me, btrim(in_body)) returning id into new_id;

  insert into public.notification_outbox (person_id, kind, object_id, idempotency_key)
  values (case when me = th.caster_id then th.joiner_id else th.caster_id end,
          'message', new_id, 'msg:' || new_id::text);
  return new_id;
end;
$$;

create or replace function public.mark_read(in_thread uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare me uuid := private.assert_actor();
begin
  if not private.in_thread(in_thread) then
    raise exception 'not_a_party' using errcode = '42501';
  end if;
  insert into public.thread_reads (thread_id, person_id, last_read_at)
  values (in_thread, me, now())
  on conflict (thread_id, person_id) do update set last_read_at = now();
end;
$$;

-- --------------------------------------------------------------
-- 8. L4 -- a receipt exists only when both have confirmed
-- --------------------------------------------------------------
create or replace function public.confirm_met(in_thread uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare me uuid := private.assert_actor();
        th public.threads;
        lo uuid; hi uuid;
        happened timestamptz;
begin
  select * into th from public.threads where id = in_thread;
  if th.id is null or me not in (th.caster_id, th.joiner_id) then
    raise exception 'not_a_party' using errcode = '42501';
  end if;
  select happens_at into happened from public.casts where id = th.cast_id;
  if happened > now() then
    raise exception 'has_not_happened' using errcode = '23514';
  end if;

  lo := least(th.caster_id, th.joiner_id);
  hi := greatest(th.caster_id, th.joiner_id);

  insert into public.plan_receipts (cast_id, person_a, person_b)
  values (th.cast_id, lo, hi) on conflict do nothing;

  -- Idempotent by coalesce: confirming twice is the same as once. Two
  -- taps from one person is not two people.
  update public.plan_receipts
     set confirmed_a_at = case when me = lo then coalesce(confirmed_a_at, now()) else confirmed_a_at end,
         confirmed_b_at = case when me = hi then coalesce(confirmed_b_at, now()) else confirmed_b_at end
   where cast_id = th.cast_id and person_a = lo and person_b = hi;

  update public.plan_receipts
     set settled_at = now()
   where cast_id = th.cast_id and person_a = lo and person_b = hi
     and confirmed_a_at is not null and confirmed_b_at is not null
     and settled_at is null;
end;
$$;

-- --------------------------------------------------------------
-- 9. blocking closes the thread, explicitly (D13, L7)
-- --------------------------------------------------------------
create or replace function public.block_person(in_person uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  if in_person = me then raise exception 'cannot_block_self' using errcode = '23514'; end if;
  insert into public.blocks (blocker_id, blocked_id) values (me, in_person)
  on conflict do nothing;

  -- D13: not a mute. Any open thread between them ends, and says so,
  -- rather than becoming a conversation that stopped replying.
  insert into public.messages (thread_id, sender_id, body, is_system)
  select id, null, 'this chat is closed. nothing more comes through.', true
    from public.threads
   where closed_at is null
     and ((caster_id = me and joiner_id = in_person) or (caster_id = in_person and joiner_id = me));

  update public.threads set closed_at = now(), closed_reason = 'blocked'
   where closed_at is null
     and ((caster_id = me and joiner_id = in_person) or (caster_id = in_person and joiner_id = me));
end;
$$;

-- --------------------------------------------------------------
-- 10. the sweeper
-- --------------------------------------------------------------
-- Service role. Expiry has to be enforced by something that runs, not
-- only by a predicate that reads -- the predecessor's expiry was
-- decorative for exactly this reason.
create or replace function private.close_expired_threads(max_rows integer default 500)
returns integer language plpgsql security definer set search_path = '' as $$
declare closed integer;
begin
  with due as (
    select id from public.threads
     where closed_at is null and expires_at <= now()
     order by expires_at limit greatest(max_rows, 1)
  )
  update public.threads t set closed_at = now(), closed_reason = 'expired'
    from due where t.id = due.id;
  get diagnostics closed = row_count;
  return closed;
end;
$$;

-- --------------------------------------------------------------
-- 11. grants
-- --------------------------------------------------------------
grant select on public.threads, public.thread_window_proposals,
                public.messages, public.thread_reads to authenticated;
revoke insert, update, delete, truncate, references
  on public.threads, public.thread_window_proposals,
     public.messages, public.thread_reads from authenticated, anon;

grant execute on function
  public.accept_join_request(uuid), public.decline_join_request(uuid),
  public.propose_window(uuid, public.chat_window),
  public.respond_to_window(uuid, boolean),
  public.narrow_window(uuid, public.chat_window),
  public.end_thread(uuid),
  public.send_message(uuid, text), public.mark_read(uuid),
  public.confirm_met(uuid)
  to authenticated;

-- in_thread and thread_open are caller-scoped, so RLS may call them
grant execute on function private.in_thread(uuid), private.thread_open(uuid)
  to authenticated;

revoke execute on function
  private.close_expired_threads(integer),
  private.window_end(timestamptz, public.chat_window)
  from public, anon, authenticated;
