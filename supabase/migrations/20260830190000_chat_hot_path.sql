-- ===============================================================
-- The open-chat hot path, made proportional to what changed.
-- ===============================================================
--
-- An open chat polls every 2.5 seconds, and each tick made four calls.
-- Measured against 400 conversations and a 2,000-message thread — an
-- ordinary size for a chat people actually use — one tick cost about
-- 66ms and 54,000 buffer hits, and twenty ticks left 62,000 dead
-- tuples behind. That is one person, with one chat open. It does not
-- survive contact with a second one.
--
-- Nothing here changes what the app shows. Every fix is the same
-- answer computed against what changed rather than against the whole
-- history:
--
--   1. mark_conversation_read rewrote a receipt row for EVERY message
--      in the thread, every tick: 1,000 upserts, 35,968 buffers, 32ms.
--   2. mark_conversation_delivered did the same: 14,732 buffers, 22ms.
--      Between them they are the dead-tuple firehose, and both were
--      O(thread) when the work is only ever O(what just arrived).
--   3. my_conversations was called to read ONE row and returned all
--      forty, and inside it `latest_match` scanned EVERY match in the
--      table — not just the caller's — on every call.
--
-- The receipts keep a watermark per (conversation, reader) so a tick
-- only looks at messages that arrived since the last one. The scan is
-- deliberately re-run over a minute of overlap: `on conflict` makes
-- re-stamping free, and it means a message that commits a moment out
-- of timestamp order is still picked up rather than silently missing
-- its second tick forever.
-- ===============================================================

-- ---------------------------------------------------------------
-- 1. a delivery watermark, alongside the read one that already exists
-- ---------------------------------------------------------------
-- conversation_reads is already the per-(conversation, reader) row, so
-- delivery belongs beside reading rather than in a table of its own.
alter table public.conversation_reads
  add column if not exists delivered_through timestamptz;

-- How far back a tick re-checks. Long enough to absorb any commit that
-- lands out of timestamp order, short enough to stay a handful of rows.
create or replace function private.receipt_overlap()
returns interval language sql immutable set search_path = '' as $$ select interval '1 minute' $$;

-- The unread count and the receipt sweep both ask "messages in this
-- conversation, after this instant, not mine". Carrying sender_id in
-- the index keeps that from touching the table at all.
create index if not exists messages_conversation_created_sender_idx
  on public.messages (conversation_id, created_at) include (sender_id);

-- ---------------------------------------------------------------
-- 2. delivery: only what has arrived since last time
-- ---------------------------------------------------------------
create or replace function public.mark_conversation_delivered(target_conversation_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  stamp timestamptz := now();
  watermark timestamptz;
begin
  if actor is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.conversations c
    where c.id = target_conversation_id
      and actor in (c.person_low, c.person_high)
  ) then
    raise exception 'not_a_party' using errcode = '42501';
  end if;

  select r.delivered_through into watermark
  from public.conversation_reads r
  where r.conversation_id = target_conversation_id and r.profile_id = actor;

  insert into public.message_receipts (message_id, recipient_id, delivered_at)
  select msg.id, actor, stamp
  from public.messages msg
  where msg.conversation_id = target_conversation_id
    and msg.sender_id is distinct from actor
    and (watermark is null or msg.created_at > watermark - private.receipt_overlap())
  on conflict (message_id, recipient_id) do update
    set delivered_at = coalesce(public.message_receipts.delivered_at, excluded.delivered_at);

  -- last_read_at is not-null, and a row created purely to carry the
  -- delivery watermark must not claim anything has been read. -infinity
  -- is what "read nothing" already means to every reader of this table.
  insert into public.conversation_reads (conversation_id, profile_id, last_read_at, delivered_through)
  values (target_conversation_id, actor, '-infinity'::timestamptz, stamp)
  on conflict (conversation_id, profile_id) do update
    set delivered_through = greatest(
      coalesce(public.conversation_reads.delivered_through, '-infinity'::timestamptz), stamp);
end;
$$;

-- ---------------------------------------------------------------
-- 3. reading: bounded by the watermark that was already there
-- ---------------------------------------------------------------
create or replace function public.mark_conversation_read(target_conversation_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  reader uuid := auth.uid();
  stamp timestamptz := now();
  watermark timestamptz;
begin
  if reader is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  if not exists (
    select 1 from public.conversations c
    where c.id = target_conversation_id and reader in (c.person_low, c.person_high)
  ) then
    raise exception 'not_a_party' using errcode = '42501';
  end if;

  select least(
           coalesce(r.last_read_at, '-infinity'::timestamptz),
           coalesce(r.delivered_through, '-infinity'::timestamptz))
    into watermark
  from public.conversation_reads r
  where r.conversation_id = target_conversation_id and r.profile_id = reader;

  insert into public.conversation_reads (conversation_id, profile_id, last_read_at, delivered_through)
  values (target_conversation_id, reader, stamp, stamp)
  on conflict (conversation_id, profile_id) do update
    set last_read_at = greatest(public.conversation_reads.last_read_at, excluded.last_read_at),
        delivered_through = greatest(
          coalesce(public.conversation_reads.delivered_through, '-infinity'::timestamptz),
          excluded.delivered_through);

  insert into public.message_receipts (message_id, recipient_id, delivered_at, read_at)
  select msg.id, reader, stamp, stamp
  from public.messages msg
  where msg.conversation_id = target_conversation_id
    and msg.sender_id is distinct from reader
    and (watermark is null
         or watermark = '-infinity'::timestamptz
         or msg.created_at > watermark - private.receipt_overlap())
  on conflict (message_id, recipient_id) do update
    set delivered_at = coalesce(public.message_receipts.delivered_at, excluded.delivered_at),
        read_at = greatest(
          coalesce(public.message_receipts.read_at, '-infinity'::timestamptz), excluded.read_at);
end;
$$;

-- ---------------------------------------------------------------
-- 4. one definition of a conversation row, two ways in
-- ---------------------------------------------------------------
-- The old body ran five correlated subqueries per row, computed the
-- last message twice, and built `latest_match` from a DISTINCT ON over
-- every match in the table before throwing all but the caller's away.
-- Same columns, same values: laterals correlated to the caller's own
-- conversations, so every lookup is an index seek against one chat.
create or replace function private.conversation_rows(target_conversation_id uuid default null)
returns table (
  conversation_id uuid, intent_id uuid, cast_title text, other_id uuid,
  other_first_name text, mode public.conversation_mode, expires_at timestamptz,
  last_message text, last_at timestamptz, unread_count bigint, other_last_read_at timestamptz,
  proposed_mode public.conversation_mode, proposed_by_me boolean, plan_count bigint
)
language sql security definer stable set search_path = '' as $$
  with mine as (
    select c.*, case when c.person_low = auth.uid() then c.person_high else c.person_low end as other
    from public.conversations c
    where auth.uid() in (c.person_low, c.person_high)
      and (target_conversation_id is null or c.id = target_conversation_id)
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
    newest.preview,
    coalesce(newest.created_at, mine.created_at),
    unread.tally,
    theirs.last_read_at,
    case when private.window_is_open(mine.mode, mine.expires_at, mine.closed_at)
         then mine.proposed_mode else null end,
    (mine.proposed_by = auth.uid()),
    plans.tally
  from mine
  join public.profiles p on p.id = mine.other
  left join public.conversation_reads ours
    on ours.conversation_id = mine.id and ours.profile_id = auth.uid()
  left join public.conversation_reads theirs
    on theirs.conversation_id = mine.id and theirs.profile_id = mine.other
  left join lateral (
    select case when msg.media_kind = 'gif' then 'GIF'
                when msg.media_kind = 'image' then 'photo'
                when msg.latitude is not null and char_length(btrim(msg.body)) = 0 then 'location'
                else msg.body end as preview,
           msg.created_at
    from public.messages msg
    where msg.conversation_id = mine.id
    order by msg.created_at desc, msg.id desc
    limit 1
  ) newest on true
  left join lateral (
    select m.intent_id, i.statement
    from public.matches m join public.intents i on i.id = m.intent_id
    where m.conversation_id = mine.id
    order by m.created_at desc
    limit 1
  ) lm on true
  left join lateral (
    select count(*) as tally
    from public.messages msg
    where msg.conversation_id = mine.id
      and msg.sender_id <> auth.uid()
      and msg.created_at > coalesce(ours.last_read_at, '-infinity'::timestamptz)
  ) unread on true
  left join lateral (
    select count(*) as tally from public.matches m2 where m2.conversation_id = mine.id
  ) plans on true;
$$;
revoke execute on function private.conversation_rows(uuid) from public, anon;

drop function if exists public.my_conversations();
create or replace function public.my_conversations()
returns table (
  conversation_id uuid, intent_id uuid, cast_title text, other_id uuid,
  other_first_name text, mode public.conversation_mode, expires_at timestamptz,
  last_message text, last_at timestamptz, unread_count bigint, other_last_read_at timestamptz,
  proposed_mode public.conversation_mode, proposed_by_me boolean, plan_count bigint
)
language sql security definer set search_path = '' as $$
  select * from private.conversation_rows(null) order by last_at desc;
$$;
grant execute on function public.my_conversations() to authenticated;

/**
 * One conversation's row.
 *
 * The open chat needs its own metadata on every poll tick and was
 * getting it by asking for the whole list and filtering in JavaScript —
 * so a person with forty chats paid for forty rows, with their
 * aggregates, to read one. Same columns, same values, one row.
 */
create or replace function public.conversation_summary(target_conversation_id uuid)
returns table (
  conversation_id uuid, intent_id uuid, cast_title text, other_id uuid,
  other_first_name text, mode public.conversation_mode, expires_at timestamptz,
  last_message text, last_at timestamptz, unread_count bigint, other_last_read_at timestamptz,
  proposed_mode public.conversation_mode, proposed_by_me boolean, plan_count bigint
)
language sql security definer set search_path = '' as $$
  select * from private.conversation_rows(target_conversation_id);
$$;
grant execute on function public.conversation_summary(uuid) to authenticated;
