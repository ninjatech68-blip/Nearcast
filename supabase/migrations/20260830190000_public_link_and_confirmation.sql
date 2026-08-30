-- Public link confirmation.
--
-- MUST-023 lets a link recipient confirm that an intent has support from the
-- origin circle "without revealing the circle's membership". The foundation
-- policy let any authenticated user read every row of intent_confirmations,
-- which hands over precisely that membership: the confirmer ids for any intent.
-- A count is the supported signal; the identities behind it are not.
--
-- Reading is narrowed to the viewer's own row, which is the only identity they
-- already know, so the app can still tell someone they have confirmed. The
-- aggregate count reaches the public projection through get_public_intent,
-- which is security definer and returns a number, never a list.

drop policy confirmations_read_visible_intent on public.intent_confirmations;

create policy confirmations_read_own on public.intent_confirmations for select to authenticated
using (confirmer_id = auth.uid());

-- The insert policy gains the two checks it was missing: an expired intent and
-- an intent whose public link is switched off must not accept confirmations.
drop policy confirmations_insert_self on public.intent_confirmations;

create policy confirmations_insert_self on public.intent_confirmations for insert to authenticated
with check (
  confirmer_id = auth.uid()
  and exists (
    select 1
    from public.intents i
    join public.intent_reach r on r.intent_id = i.id
    where i.id = intent_id
      and i.broadcaster_id <> auth.uid()
      and i.status = 'live'
      and i.expires_at > now()
      and r.public_link_enabled
  )
);

-- confirm-intent --------------------------------------------------------------
-- Addressed by share slug, because that is what a link recipient holds. The
-- primary key on (intent_id, confirmer_id) is what makes a count "unique,
-- authenticated people" per MUST-024; this function is idempotent on top of it,
-- so a double tap confirms once and reports the same total.

create or replace function public.confirm_intent(requested_share_slug uuid)
returns table (confirmation_count bigint, viewer_has_confirmed boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  target public.intents;
begin
  if actor is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  if not exists (select 1 from public.profiles where id = actor) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  select i.* into target
  from public.intents i
  join public.intent_reach r on r.intent_id = i.id
  where i.share_slug = requested_share_slug
    and i.status = 'live'
    and i.expires_at > now()
    and r.public_link_enabled;

  if target.id is null then
    raise exception 'not_found' using errcode = 'P0002';
  end if;

  -- A broadcaster confirming their own intent would be fabricating support.
  if target.broadcaster_id = actor then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  insert into public.intent_confirmations (intent_id, confirmer_id)
  values (target.id, actor)
  on conflict (intent_id, confirmer_id) do nothing;

  return query
  select
    (select count(*) from public.intent_confirmations ic where ic.intent_id = target.id),
    true;
end;
$$;

revoke execute on function public.confirm_intent(uuid) from public, anon;
grant execute on function public.confirm_intent(uuid) to authenticated;
