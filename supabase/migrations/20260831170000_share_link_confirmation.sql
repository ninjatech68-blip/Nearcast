-- ---------------------------------------------------------------
-- The public share link, and genuine confirmation.
--
-- MUST-020 to MUST-025 describe the mechanism the product is named for:
-- an intent travels beyond a closed group, a recipient sees enough to
-- decide, and a signed-in recipient can confirm that the intent has
-- support from the origin circle WITHOUT learning who is in that circle.
--
-- `get_public_intent` already projected the safe fields and was granted to
-- anon, and `intent_confirmations` already had an insert policy that
-- refuses self-confirmation. Nothing in the app called either, so the
-- whole mechanism was schema with no surface.
--
-- Two things were missing, and one was wrong.
-- ---------------------------------------------------------------

-- WRONG: every authenticated user could read every confirmation row.
--
--   confirmations_read_visible_intent  USING (exists (select 1 from intents
--                                            where id = intent_id))
--
-- The row carries `confirmer_id`, so that policy let anyone enumerate who
-- confirmed what. MUST-023 is specifically that a recipient learns the
-- intent has support without learning the circle's membership, and this
-- disclosed exactly the membership it protects. The count is not the
-- problem; the identities are.
--
-- Narrowed to the viewer's own row. Counting is `get_public_intent`'s job:
-- it is SECURITY DEFINER, so it can aggregate what no client may read.
drop policy if exists confirmations_read_visible_intent on public.intent_confirmations;

create policy confirmations_read_self on public.intent_confirmations
  for select to authenticated
  using (confirmer_id = auth.uid());

-- MISSING: a way to confirm.
--
-- A function rather than a bare insert, for two reasons. The client cannot
-- read the count any more, so it needs the fresh one handed back in the
-- same round trip. And the link carries a share slug, not an intent id, so
-- resolving the slug server-side keeps internal ids out of the client.
--
-- Idempotent: confirming twice is the same single confirmation. The
-- primary key on (intent_id, confirmer_id) is what makes MUST-024 true —
-- a count is unique authenticated people, not clicks.
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

  -- Confirmation is an act by a member. A signed-in stranger with no
  -- redeemed invitation has no profile for the row to reference.
  if not exists (select 1 from public.profiles where id = actor) then
    raise exception 'not_a_member' using errcode = '42501';
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

  -- Confirming your own intent would be fabricating support for it.
  if target.broadcaster_id = actor then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  insert into public.intent_confirmations (intent_id, confirmer_id)
  values (target.id, actor)
  on conflict (intent_id, confirmer_id) do nothing;

  return query
    select
      (select count(*) from public.intent_confirmations ic where ic.intent_id = target.id),
      exists (
        select 1 from public.intent_confirmations ic
        where ic.intent_id = target.id and ic.confirmer_id = actor
      );
end;
$$;

-- MISSING: a way for a viewer to know whether they already confirmed,
-- before confirming. The narrowed select policy covers this from the
-- client, but only for a member reading their own row, and the public
-- screen needs it keyed by slug rather than intent id.
create or replace function public.viewer_has_confirmed(requested_share_slug uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.intent_confirmations ic
    join public.intents i on i.id = ic.intent_id
    where i.share_slug = requested_share_slug
      and ic.confirmer_id = auth.uid()
  );
$$;

revoke execute on function public.confirm_intent(uuid) from public, anon;
grant execute on function public.confirm_intent(uuid) to authenticated;
revoke execute on function public.viewer_has_confirmed(uuid) from public, anon;
grant execute on function public.viewer_has_confirmed(uuid) to authenticated;

-- ---------------------------------------------------------------
-- The caster needs their own share slug to share anything.
--
-- `my_casts` did not project it, so the app had no way to build the link
-- MUST-020 requires. Adding it here rather than exposing `intents` to the
-- client keeps the slug reachable only for a cast you own: the function is
-- already filtered to `broadcaster_id = auth.uid()`.
--
-- `share_link_enabled` comes with it, because a caster who switched the
-- public link off should not be offered a share action that produces a
-- link nobody can open.
-- ---------------------------------------------------------------
drop function if exists public.my_casts();

create or replace function public.my_casts()
returns table (
  intent_id uuid,
  category public.cast_category,
  statement text,
  area text,
  starts_at timestamptz,
  expires_at timestamptz,
  status public.intent_status,
  pending_count bigint,
  matched_count bigint,
  share_slug uuid,
  share_link_enabled boolean
)
language sql
security definer
set search_path = ''
as $$
  select
    i.id,
    i.category,
    i.statement,
    c.approximate_place,
    c.starts_at,
    i.expires_at,
    i.status,
    (select count(*) from public.responses r where r.intent_id = i.id and r.status = 'pending'),
    (select count(*) from public.matches m where m.intent_id = i.id and m.closed_at is null),
    i.share_slug,
    coalesce(r2.public_link_enabled, false)
  from public.intents i
  left join public.intent_context c on c.intent_id = i.id
  left join public.intent_reach r2 on r2.intent_id = i.id
  where i.broadcaster_id = auth.uid()
    and i.status in ('live', 'matched')
    and i.expires_at > now()
  order by i.published_at desc nulls last, i.created_at desc;
$$;

revoke execute on function public.my_casts() from public, anon;
grant execute on function public.my_casts() to authenticated;
