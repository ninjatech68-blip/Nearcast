-- ===============================================================
-- Extending a chat window takes BOTH people.
-- ===============================================================
--
-- The copy has always said "you both agreed to keep this chat open",
-- and the system message said so after ONE person tapped it. That is
-- the app telling someone their counterpart agreed to something they
-- were never asked. A longer window is more exposure for both sides;
-- it is not one person's to grant.
--
-- What needs consent, and what does not:
--
--   LONGER  (day -> week, day/week -> always)  proposal, then accept.
--   SAME or SHORTER (-> week from always, -> day)  immediate. Pulling
--           your own exposure in never needs the other person's
--           permission.
--   ENDED   immediate, always, by either side alone. Leaving a
--           conversation can never be something you have to negotiate.
--
-- A proposal is one row on the conversation, not a message: it can be
-- superseded, withdrawn or declined without leaving a thread of dead
-- offers behind. The system messages that accompany it name no one —
-- both parties already know who is in the room.
-- ===============================================================

alter table public.conversations
  add column if not exists proposed_mode public.conversation_mode,
  add column if not exists proposed_by uuid references public.profiles(id) on delete set null,
  add column if not exists proposed_at timestamptz;

-- a proposal is only ever for a longer window, and only ever open
alter table public.conversations drop constraint if exists conversations_proposal_shape;
alter table public.conversations
  add constraint conversations_proposal_shape check (
    (proposed_mode is null and proposed_by is null and proposed_at is null)
    or (proposed_mode in ('week', 'always') and proposed_by is not null and proposed_at is not null)
  );

/** how much exposure a window carries. higher is longer. */
create or replace function private.mode_rank(m public.conversation_mode)
returns integer language sql immutable set search_path = '' as $$
  select case m when 'ended' then 0 when 'day' then 1 when 'week' then 2 when 'always' then 3 end;
$$;

-- ---------------------------------------------------------------
-- set_conversation_mode: applies, or proposes
-- ---------------------------------------------------------------
create or replace function public.set_conversation_mode(
  target_conversation_id uuid,
  next_mode public.conversation_mode
)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  is_party boolean;
  current_mode public.conversation_mode;
  next_expiry timestamptz;
  note text;
begin
  if actor is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  select auth.uid() in (m.broadcaster_id, m.participant_id), c.mode
    into is_party, current_mode
  from public.conversations c join public.matches m on m.id = c.match_id
  where c.id = target_conversation_id;
  if is_party is null then raise exception 'conversation_not_found' using errcode = 'P0002'; end if;
  if not is_party then raise exception 'not_a_party' using errcode = '42501'; end if;
  if current_mode = 'ended' then raise exception 'conversation_ended' using errcode = '23514'; end if;

  -- LONGER: ask, do not act.
  if next_mode <> 'ended' and private.mode_rank(next_mode) > private.mode_rank(current_mode) then
    update public.conversations
    set proposed_mode = next_mode, proposed_by = actor, proposed_at = now()
    where id = target_conversation_id;

    insert into public.messages (conversation_id, sender_id, body, is_system)
    values (
      target_conversation_id,
      actor,
      case next_mode
        when 'always' then 'a request to keep this chat open with no expiry. it changes when you both agree.'
        else 'a request to extend this chat to 7 days. it changes when you both agree.'
      end,
      true
    );
    return;
  end if;

  -- SAME, SHORTER or ENDED: apply now, and any open proposal is moot.
  next_expiry := case next_mode
    when 'day' then now() + interval '24 hours'
    when 'week' then now() + interval '7 days'
    else null
  end;
  update public.conversations
  set mode = next_mode,
      expires_at = case when next_mode = 'ended' then expires_at else next_expiry end,
      closed_at = case when next_mode = 'ended' then now() else closed_at end,
      proposed_mode = null, proposed_by = null, proposed_at = null
  where id = target_conversation_id and mode <> 'ended';

  note := case next_mode
    when 'ended' then 'this chat is ended. no new messages.'
    when 'week' then 'chat window set to 7 days.'
    else 'chat window set to 24h.'
  end;
  insert into public.messages (conversation_id, sender_id, body, is_system)
  values (target_conversation_id, actor, note, true);
end;
$$;

-- ---------------------------------------------------------------
-- the other side answers
-- ---------------------------------------------------------------
/**
 * Accept or decline the open proposal. Only the party who did NOT make
 * it may accept — otherwise "both agreed" would mean one person tapping
 * twice. The proposer may still call this with accept = false, which
 * withdraws their own offer.
 */
create or replace function public.respond_to_mode_proposal(
  target_conversation_id uuid,
  accept boolean
)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  is_party boolean;
  proposer uuid;
  wanted public.conversation_mode;
  next_expiry timestamptz;
begin
  if actor is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  select auth.uid() in (m.broadcaster_id, m.participant_id), c.proposed_by, c.proposed_mode
    into is_party, proposer, wanted
  from public.conversations c join public.matches m on m.id = c.match_id
  where c.id = target_conversation_id;
  if is_party is null then raise exception 'conversation_not_found' using errcode = 'P0002'; end if;
  if not is_party then raise exception 'not_a_party' using errcode = '42501'; end if;
  if wanted is null then raise exception 'no_open_proposal' using errcode = 'P0002'; end if;
  if accept and proposer = actor then
    raise exception 'proposer_cannot_accept' using errcode = '42501';
  end if;

  if not accept then
    update public.conversations
    set proposed_mode = null, proposed_by = null, proposed_at = null
    where id = target_conversation_id;
    insert into public.messages (conversation_id, sender_id, body, is_system)
    values (target_conversation_id, actor, 'the chat window stays as it is.', true);
    return;
  end if;

  next_expiry := case wanted when 'week' then now() + interval '7 days' else null end;
  update public.conversations
  set mode = wanted,
      expires_at = next_expiry,
      proposed_mode = null, proposed_by = null, proposed_at = null
  where id = target_conversation_id and mode <> 'ended';

  insert into public.messages (conversation_id, sender_id, body, is_system)
  values (
    target_conversation_id,
    actor,
    case wanted
      when 'always' then 'you both agreed to keep this chat open. no expiry now.'
      else 'you both agreed to a 7 day window.'
    end,
    true
  );
end;
$$;
grant execute on function public.respond_to_mode_proposal(uuid, boolean) to authenticated;

-- ---------------------------------------------------------------
-- the list carries the open proposal, and whose it is
-- ---------------------------------------------------------------
drop function if exists public.my_conversations();
create or replace function public.my_conversations()
returns table (
  conversation_id uuid,
  intent_id uuid,
  cast_title text,
  other_id uuid,
  other_first_name text,
  mode public.conversation_mode,
  expires_at timestamptz,
  last_message text,
  last_at timestamptz,
  unread_count bigint,
  other_last_read_at timestamptz,
  proposed_mode public.conversation_mode,
  proposed_by_me boolean
)
language sql security definer set search_path = '' as $$
  select
    c.id,
    i.id,
    i.statement,
    case when m.broadcaster_id = auth.uid() then m.participant_id else m.broadcaster_id end,
    split_part(p.display_name, ' ', 1),
    c.mode,
    c.expires_at,
    (select case
              when msg.media_kind = 'gif' then 'GIF'
              when msg.media_kind = 'image' then 'photo'
              when msg.latitude is not null and char_length(btrim(msg.body)) = 0 then 'location'
              else msg.body
            end
       from public.messages msg where msg.conversation_id = c.id
       order by msg.created_at desc limit 1),
    coalesce(
      (select created_at from public.messages msg where msg.conversation_id = c.id order by msg.created_at desc limit 1),
      c.created_at
    ),
    (select count(*) from public.messages msg
      where msg.conversation_id = c.id
        and msg.sender_id <> auth.uid()
        and msg.created_at > coalesce(
          (select r.last_read_at from public.conversation_reads r
            where r.conversation_id = c.id and r.profile_id = auth.uid()),
          '-infinity'::timestamptz)),
    (select r.last_read_at from public.conversation_reads r
      where r.conversation_id = c.id
        and r.profile_id = case when m.broadcaster_id = auth.uid() then m.participant_id else m.broadcaster_id end),
    c.proposed_mode,
    (c.proposed_by = auth.uid())
  from public.conversations c
  join public.matches m on m.id = c.match_id
  join public.intents i on i.id = m.intent_id
  join public.profiles p
    on p.id = case when m.broadcaster_id = auth.uid() then m.participant_id else m.broadcaster_id end
  where auth.uid() in (m.broadcaster_id, m.participant_id)
  order by 9 desc;
$$;
grant execute on function public.my_conversations() to authenticated;
