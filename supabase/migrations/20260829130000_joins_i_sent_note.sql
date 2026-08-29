-- ===============================================================
-- Surface the note the joiner wrote back to the joiner.
-- ===============================================================
--
-- joins_i_sent() drives the "WAITING ON" section — the casts you asked
-- to join. It returned the cast and the caster but not the note you
-- wrote, so a person could not see what they said when they showed
-- interest. Add r.message as `note`.
--
-- The return signature changes, so the function is dropped and
-- recreated (create-or-replace cannot alter a function's out columns).
-- ===============================================================

drop function if exists public.joins_i_sent();

create function public.joins_i_sent()
returns table (
  response_id uuid,
  intent_id uuid,
  cast_statement text,
  caster_id uuid,
  caster_first_name text,
  note text,
  status public.response_status,
  created_at timestamptz
)
language sql security definer set search_path = '' as $$
  select
    r.id,
    i.id,
    i.statement,
    i.broadcaster_id,
    split_part(p.display_name, ' ', 1),
    r.message,
    r.status,
    r.created_at
  from public.responses r
  join public.intents i on i.id = r.intent_id
  join public.profiles p on p.id = i.broadcaster_id
  where r.respondent_id = auth.uid()
    and r.status in ('pending', 'accepted')
  order by r.created_at desc;
$$;

grant execute on function public.joins_i_sent() to authenticated;
