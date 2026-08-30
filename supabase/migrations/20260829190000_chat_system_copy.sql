-- ===============================================================
-- The chat's own notices, rewritten.
-- ===============================================================
--
-- Same complaint as the push copy: "a request to extend this chat to 7
-- days" is a sentence about a form being submitted, not about two
-- people deciding something. These say what is true and stop.
--
-- A new migration rather than an edit to 20260829180000, because that
-- one may already have been applied — a changed migration file is a
-- schema that silently differs from the one the project actually ran.
-- Only the two function bodies change; nothing structural.
-- ===============================================================

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
        when 'always' then 'this could stay open with no expiry. it takes you both.'
        else 'this could run 7 days. it takes you both.'
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
    when 'ended' then 'this chat is closed. nothing more comes through.'
    when 'week' then 'the window is 7 days now.'
    else 'the window is 24h now.'
  end;
  insert into public.messages (conversation_id, sender_id, body, is_system)
  values (target_conversation_id, actor, note, true);
end;
$$;

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
    values (target_conversation_id, actor, 'the window stays as it is.', true);
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
      when 'always' then 'you both said yes. this one stays open.'
      else 'you both said yes. 7 days.'
    end,
    true
  );
end;
$$;
