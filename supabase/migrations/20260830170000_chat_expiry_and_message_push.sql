-- ===============================================================
-- The chat window actually closes, and a message actually pings.
-- ===============================================================
--
-- Two things the chat promised and never did.
--
-- 1. EXPIRY WAS DECORATIVE. `conversations.expires_at` was written,
--    counted down in the header, and then never read by anything. A
--    chat whose window closed a week ago still accepted messages and
--    still listed as live. A window that does not close is not a
--    window. Now: the send guard refuses past the expiry, the list
--    reports such a chat as ended the moment it lapses, and a swept
--    job closes it for real so the state is durable rather than
--    recomputed forever.
--
-- 2. A MESSAGE PINGED NOBODY. The outbox only ever carried
--    join_request and join_accepted; `messages` had no trigger at all.
--    Chat felt live only while you were looking at it, because the
--    open thread polls. Close the app and messages arrived in silence.
--
--    A message now enqueues a push for the other party — UNLESS they
--    have that conversation open, which is the one case where a
--    notification is noise. That is the WhatsApp rule, and it needs
--    the server to know who is looking at what, so this adds an
--    explicit presence lease rather than guessing from read receipts.
--
-- Privacy holds throughout: the outbox still stores only a kind and
-- ids, never a word of the message. The copy lives in the sender.
-- ===============================================================

-- ---------------------------------------------------------------
-- 1. one place that decides whether a chat window is open
-- ---------------------------------------------------------------
-- 'always' has no expiry. 'ended' is a hard stop. Everything else
-- lives until expires_at, and a null expiry means it was never set.
create or replace function private.window_is_open(
  chat_mode public.conversation_mode,
  chat_expires_at timestamptz,
  chat_closed_at timestamptz
)
returns boolean language sql stable set search_path = '' as $$
  select chat_closed_at is null
     and chat_mode <> 'ended'
     and (chat_mode = 'always' or chat_expires_at is null or chat_expires_at > now());
$$;

-- ---------------------------------------------------------------
-- 2. the send guard refuses a lapsed window
-- ---------------------------------------------------------------
create or replace function private.assert_can_send(target_conversation_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  sender uuid := auth.uid();
  is_party boolean;
  is_open boolean;
  has_lapsed boolean;
begin
  if sender is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  select auth.uid() in (c.person_low, c.person_high),
         private.window_is_open(c.mode, c.expires_at, c.closed_at),
         c.mode <> 'ended' and c.closed_at is null
    into is_party, is_open, has_lapsed
  from public.conversations c
  where c.id = target_conversation_id;
  if is_party is null then raise exception 'conversation_not_found' using errcode = 'P0002'; end if;
  if not is_party then raise exception 'not_a_party' using errcode = '42501'; end if;
  if not is_open then
    -- a chat someone closed reads differently from one that ran out,
    -- and the app says so, so the two get their own errors.
    if has_lapsed then
      raise exception 'conversation_expired' using errcode = '23514';
    end if;
    raise exception 'conversation_ended' using errcode = '23514';
  end if;
  return sender;
end;
$$;

-- ---------------------------------------------------------------
-- 3. a lapsed window cannot be re-opened either
-- ---------------------------------------------------------------
-- Extending is a change to a chat that is still running. Once the
-- window has passed there is nothing to extend: the pair start a new
-- plan, or they do not.
create or replace function private.assert_window_open(target_conversation_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  is_open boolean;
  has_lapsed boolean;
begin
  select private.window_is_open(c.mode, c.expires_at, c.closed_at),
         c.mode <> 'ended' and c.closed_at is null
    into is_open, has_lapsed
  from public.conversations c where c.id = target_conversation_id;
  if is_open is null then raise exception 'conversation_not_found' using errcode = 'P0002'; end if;
  if is_open then return; end if;
  if has_lapsed then raise exception 'conversation_expired' using errcode = '23514'; end if;
  raise exception 'conversation_ended' using errcode = '23514';
end;
$$;

-- ---------------------------------------------------------------
-- 4. close what has lapsed, for real
-- ---------------------------------------------------------------
-- The guards above make an expired chat behave as ended from the
-- instant it lapses. This writes that down, so the row itself is the
-- truth rather than something every reader has to recompute, and so
-- the pair see the closing note in the thread.
create or replace function public.close_expired_conversations(max_rows integer default 500)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  closed_ids uuid[];
begin
  with lapsed as (
    select c.id from public.conversations c
    where c.mode <> 'ended'
      and c.closed_at is null
      and c.mode <> 'always'
      and c.expires_at is not null
      and c.expires_at <= now()
    order by c.expires_at
    limit greatest(1, coalesce(max_rows, 500))
    for update skip locked
  ),
  shut as (
    update public.conversations c
    set mode = 'ended',
        closed_at = c.expires_at,
        proposed_mode = null, proposed_by = null, proposed_at = null
    from lapsed where c.id = lapsed.id
    returning c.id
  )
  select coalesce(array_agg(id), '{}') into closed_ids from shut;

  if array_length(closed_ids, 1) is null then return 0; end if;

  -- the thread says why it stopped. system messages carry no sender.
  insert into public.messages (conversation_id, sender_id, body, is_system)
  select id, null, 'the window on this chat closed. nothing more comes through.', true
  from unnest(closed_ids) as id;

  return array_length(closed_ids, 1);
end;
$$;
revoke execute on function public.close_expired_conversations(integer) from public, anon, authenticated;
grant execute on function public.close_expired_conversations(integer) to service_role;

-- ---------------------------------------------------------------
-- 5. presence: who is looking at which chat, right now
-- ---------------------------------------------------------------
-- A lease, not a flag. The open screen renews it; if the app is killed
-- or loses the network the lease simply runs out and notifications
-- resume on their own. Nothing here is guessed from read receipts,
-- which move for reasons that have nothing to do with a screen being
-- in front of someone.
create table if not exists public.conversation_presence (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  active_until timestamptz not null,
  updated_at timestamptz not null default now(),
  primary key (conversation_id, profile_id)
);
create index if not exists conversation_presence_active
  on public.conversation_presence(conversation_id, active_until);

alter table public.conversation_presence enable row level security;
-- a person may see only their own presence; writes go through the RPCs.
drop policy if exists presence_owner_read on public.conversation_presence;
create policy presence_owner_read on public.conversation_presence
  for select to authenticated using (profile_id = auth.uid());

-- how long one heartbeat vouches for. The screen renews well inside
-- this, so a lease only lapses when the screen is really gone.
create or replace function private.presence_lease()
returns interval language sql immutable set search_path = '' as $$ select interval '30 seconds' $$;

/** I am looking at this chat. Renews my lease. */
create or replace function public.touch_conversation_presence(target_conversation_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  viewer uuid := auth.uid();
begin
  if viewer is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  if not private.is_conversation_party(target_conversation_id) then
    raise exception 'not_a_party' using errcode = '42501';
  end if;
  insert into public.conversation_presence (conversation_id, profile_id, active_until, updated_at)
  values (target_conversation_id, viewer, now() + private.presence_lease(), now())
  on conflict (conversation_id, profile_id) do update
    set active_until = now() + private.presence_lease(), updated_at = now();
end;
$$;
grant execute on function public.touch_conversation_presence(uuid) to authenticated;

/** I closed the chat, or the app went to the background. Drop the lease now. */
create or replace function public.clear_conversation_presence(target_conversation_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  viewer uuid := auth.uid();
begin
  if viewer is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  update public.conversation_presence
  set active_until = now(), updated_at = now()
  where conversation_id = target_conversation_id and profile_id = viewer;
end;
$$;
grant execute on function public.clear_conversation_presence(uuid) to authenticated;

create or replace function private.is_watching(target_conversation_id uuid, watcher uuid)
returns boolean language sql stable set search_path = '' as $$
  select exists (
    select 1 from public.conversation_presence p
    where p.conversation_id = target_conversation_id
      and p.profile_id = watcher
      and p.active_until > now()
  );
$$;

-- ---------------------------------------------------------------
-- 6. the outbox learns about chats
-- ---------------------------------------------------------------
alter table public.notification_outbox
  add column if not exists conversation_id uuid references public.conversations(id) on delete cascade;

alter table public.notification_outbox drop constraint if exists notification_outbox_kind_check;
alter table public.notification_outbox
  add constraint notification_outbox_kind_check
  check (kind in ('join_request', 'join_accepted', 'chat_message'));

-- one un-drained chat ping per (recipient, conversation). Ten messages
-- in ten seconds is one notification, not ten — the ping says "there is
-- something to read", and that stays true however many arrive.
create unique index if not exists notification_outbox_chat_pending_uq
  on public.notification_outbox (recipient_id, conversation_id)
  where kind = 'chat_message' and delivery_status = 'pending';

-- ---------------------------------------------------------------
-- 7. a message enqueues a ping, unless they are already reading it
-- ---------------------------------------------------------------
create or replace function private.enqueue_chat_message()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  recipient uuid;
  chat public.conversations;
begin
  -- a system note is the app talking to itself; nobody needs waking.
  if new.is_system or new.sender_id is null then return new; end if;

  select * into chat from public.conversations where id = new.conversation_id;
  if chat.id is null or chat.person_low is null or chat.person_high is null then return new; end if;

  -- a chat whose window has closed does not ping. The message should
  -- not exist, but a trigger is not the place to argue about it.
  if not private.window_is_open(chat.mode, chat.expires_at, chat.closed_at) then return new; end if;

  recipient := case when chat.person_low = new.sender_id then chat.person_high else chat.person_low end;
  if recipient is null or recipient = new.sender_id then return new; end if;

  -- THE RULE: they have this chat open, so they are already looking at
  -- the thing the notification would point them to.
  if private.is_watching(new.conversation_id, recipient) then return new; end if;

  insert into public.notification_outbox (recipient_id, kind, conversation_id)
  values (recipient, 'chat_message', new.conversation_id)
  on conflict do nothing;  -- a ping is already waiting for this pair

  return new;
end;
$$;

drop trigger if exists trg_enqueue_chat_message on public.messages;
create trigger trg_enqueue_chat_message
  after insert on public.messages
  for each row execute function private.enqueue_chat_message();

-- ---------------------------------------------------------------
-- 8. the list tells the truth about a lapsed window
-- ---------------------------------------------------------------
-- Reported as ended from the instant it lapses, so the app disables the
-- composer without waiting for the sweeper to come round.
drop function if exists public.my_conversations();
create or replace function public.my_conversations()
returns table (
  conversation_id uuid, intent_id uuid, cast_title text, other_id uuid,
  other_first_name text, mode public.conversation_mode, expires_at timestamptz,
  last_message text, last_at timestamptz, unread_count bigint, other_last_read_at timestamptz,
  proposed_mode public.conversation_mode, proposed_by_me boolean, plan_count bigint
)
language sql security definer set search_path = '' as $$
  with mine as (
    select c.*, case when c.person_low = auth.uid() then c.person_high else c.person_low end as other
    from public.conversations c
    where auth.uid() in (c.person_low, c.person_high)
  ),
  latest_match as (
    select distinct on (m.conversation_id) m.conversation_id, m.intent_id, i.statement, m.created_at
    from public.matches m join public.intents i on i.id = m.intent_id
    where m.conversation_id is not null
    order by m.conversation_id, m.created_at desc
  )
  select
    mine.id,
    lm.intent_id,
    coalesce(lm.statement, ''),
    mine.other,
    split_part(p.display_name, ' ', 1),
    case when private.window_is_open(mine.mode, mine.expires_at, mine.closed_at)
         then mine.mode else 'ended'::public.conversation_mode end,
    mine.expires_at,
    (select case when msg.media_kind = 'gif' then 'GIF'
                 when msg.media_kind = 'image' then 'photo'
                 when msg.latitude is not null and char_length(btrim(msg.body)) = 0 then 'location'
                 else msg.body end
       from public.messages msg where msg.conversation_id = mine.id
       order by msg.created_at desc limit 1),
    coalesce((select created_at from public.messages msg where msg.conversation_id = mine.id
              order by msg.created_at desc limit 1), mine.created_at),
    (select count(*) from public.messages msg
      where msg.conversation_id = mine.id and msg.sender_id <> auth.uid()
        and msg.created_at > coalesce(
          (select r.last_read_at from public.conversation_reads r
            where r.conversation_id = mine.id and r.profile_id = auth.uid()), '-infinity'::timestamptz)),
    (select r.last_read_at from public.conversation_reads r
      where r.conversation_id = mine.id and r.profile_id = mine.other),
    -- an open proposal on a lapsed window is not an open proposal
    case when private.window_is_open(mine.mode, mine.expires_at, mine.closed_at)
         then mine.proposed_mode else null end,
    (mine.proposed_by = auth.uid()),
    (select count(*) from public.matches m2 where m2.conversation_id = mine.id)
  from mine
  join public.profiles p on p.id = mine.other
  left join latest_match lm on lm.conversation_id = mine.id
  order by 9 desc;
$$;
grant execute on function public.my_conversations() to authenticated;

-- ---------------------------------------------------------------
-- 9. sweep on a schedule, next to the other chat upkeep
-- ---------------------------------------------------------------
do $$
begin
  if to_regnamespace('cron') is null then
    raise notice 'chat expiry: pg_cron not installed — skipping schedule';
    return;
  end if;
  if exists (select 1 from cron.job where jobname = 'close-expired-conversations') then
    perform cron.unschedule('close-expired-conversations');
  end if;
  perform cron.schedule(
    'close-expired-conversations',
    '*/5 * * * *',
    $cron$ select public.close_expired_conversations(500) $cron$
  );

  -- a lease is worthless the moment it lapses; keep the table small.
  if exists (select 1 from cron.job where jobname = 'prune-conversation-presence') then
    perform cron.unschedule('prune-conversation-presence');
  end if;
  perform cron.schedule(
    'prune-conversation-presence',
    '23 * * * *',
    $cron$ delete from public.conversation_presence where active_until < now() - interval '1 day' $cron$
  );
  raise notice 'chat expiry: sweeper + presence prune scheduled';
end
$$;

-- ---------------------------------------------------------------
-- 10. extending or ending needs a window that is still open
-- ---------------------------------------------------------------
-- Both of these only ever checked mode = 'ended'. A chat that ran out
-- of time is just as over, so they route through the same guard as a
-- send and give the same two errors.

CREATE OR REPLACE FUNCTION public.set_conversation_mode(target_conversation_id uuid, next_mode conversation_mode)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  actor uuid := auth.uid();
  is_party boolean;
  current_mode public.conversation_mode;
  next_expiry timestamptz;
  note text;
begin
  if actor is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  select auth.uid() in (c.person_low, c.person_high), c.mode into is_party, current_mode
  from public.conversations c where c.id = target_conversation_id;
  if is_party is null then raise exception 'conversation_not_found' using errcode = 'P0002'; end if;
  if not is_party then raise exception 'not_a_party' using errcode = '42501'; end if;
  perform private.assert_window_open(target_conversation_id);

  if next_mode <> 'ended' and private.mode_rank(next_mode) > private.mode_rank(current_mode) then
    update public.conversations
    set proposed_mode = next_mode, proposed_by = actor, proposed_at = now()
    where id = target_conversation_id;
    insert into public.messages (conversation_id, sender_id, body, is_system)
    values (target_conversation_id, actor,
      case next_mode when 'always' then 'this could stay open with no expiry. it takes you both.'
                     else 'this could run 7 days. it takes you both.' end, true);
    return;
  end if;

  next_expiry := case next_mode when 'day' then now() + interval '24 hours'
                                when 'week' then now() + interval '7 days' else null end;
  update public.conversations
  set mode = next_mode,
      expires_at = case when next_mode = 'ended' then expires_at else next_expiry end,
      closed_at = case when next_mode = 'ended' then now() else closed_at end,
      proposed_mode = null, proposed_by = null, proposed_at = null
  where id = target_conversation_id and mode <> 'ended';

  note := case next_mode when 'ended' then 'this chat is closed. nothing more comes through.'
                         when 'week' then 'the window is 7 days now.' else 'the window is 24h now.' end;
  insert into public.messages (conversation_id, sender_id, body, is_system)
  values (target_conversation_id, actor, note, true);
end;
$function$;

CREATE OR REPLACE FUNCTION public.respond_to_mode_proposal(target_conversation_id uuid, accept boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  actor uuid := auth.uid();
  is_party boolean;
  proposer uuid;
  wanted public.conversation_mode;
  next_expiry timestamptz;
begin
  if actor is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  select auth.uid() in (c.person_low, c.person_high), c.proposed_by, c.proposed_mode
    into is_party, proposer, wanted
  from public.conversations c where c.id = target_conversation_id;
  if is_party is null then raise exception 'conversation_not_found' using errcode = 'P0002'; end if;
  if not is_party then raise exception 'not_a_party' using errcode = '42501'; end if;
  perform private.assert_window_open(target_conversation_id);
  if wanted is null then raise exception 'no_open_proposal' using errcode = 'P0002'; end if;
  if accept and proposer = actor then raise exception 'proposer_cannot_accept' using errcode = '42501'; end if;

  if not accept then
    update public.conversations set proposed_mode = null, proposed_by = null, proposed_at = null
    where id = target_conversation_id;
    insert into public.messages (conversation_id, sender_id, body, is_system)
    values (target_conversation_id, actor, 'the window stays as it is.', true);
    return;
  end if;

  next_expiry := case wanted when 'week' then now() + interval '7 days' else null end;
  update public.conversations
  set mode = wanted, expires_at = next_expiry,
      proposed_mode = null, proposed_by = null, proposed_at = null
  where id = target_conversation_id and mode <> 'ended';
  insert into public.messages (conversation_id, sender_id, body, is_system)
  values (target_conversation_id, actor,
    case wanted when 'always' then 'you both said yes. this one stays open.'
                else 'you both said yes. 7 days.' end, true);
end;
$function$;
