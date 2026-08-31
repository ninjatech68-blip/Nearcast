-- ---------------------------------------------------------------
-- Circles on the backend: the last local store.
--
-- The tables and their RLS already exist — a circle is owner-only, and
-- circle_members INSERT is gated in the policy by has_receipt_with, so
-- you can only vouch for someone you've actually made a plan real with.
-- This adds the reads and writes the app needs, keyed off auth.uid():
--
--  - my_circles / create / add / remove: your own circles. add_to_circle
--    is SECURITY DEFINER only to turn the receipt-gate denial into a
--    named error the sheet can explain.
--  - vouches_for_me: circles OTHER people own that contain you. A member
--    cannot read someone else's circle (RLS), so this definer read is
--    the only way to surface a vouch — and it returns owner names only,
--    never which circle or its other members (privacy law).
-- ---------------------------------------------------------------

/** my circles, one row per member (a memberless circle still returns a row). */
create or replace function public.my_circles()
returns table (
  circle_id uuid,
  name text,
  member_id uuid,
  member_first_name text,
  member_area text
)
language sql security definer set search_path = '' as $$
  select
    c.id,
    c.name,
    m.member_id,
    split_part(p.display_name, ' ', 1),
    (select a.name from public.profile_areas a where a.profile_id = m.member_id order by a.created_at limit 1)
  from public.circles c
  left join public.circle_members m on m.circle_id = c.id
  left join public.profiles p on p.id = m.member_id
  where c.owner_id = auth.uid()
  order by c.created_at, p.display_name;
$$;

create or replace function public.create_circle(circle_name text)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  owner uuid := auth.uid();
  new_id uuid;
begin
  if owner is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  if char_length(btrim(circle_name)) < 1 or char_length(btrim(circle_name)) > 60 then
    raise exception 'name_out_of_range' using errcode = '23514';
  end if;
  insert into public.circles (owner_id, name) values (owner, lower(btrim(circle_name)))
  returning id into new_id;
  return new_id;
end;
$$;

/** vouch for someone: add them to a circle you own. receipt-gated. */
create or replace function public.add_to_circle(target_circle uuid, member uuid)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  owner uuid := auth.uid();
begin
  if owner is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  if not exists (select 1 from public.circles c where c.id = target_circle and c.owner_id = owner) then
    raise exception 'not_your_circle' using errcode = '42501';
  end if;
  if member = owner then raise exception 'cannot_add_self' using errcode = '23514'; end if;
  if private.is_blocked(member, owner) then raise exception 'blocked_relationship' using errcode = '42501'; end if;
  if not private.has_receipt_with(owner, member) then
    raise exception 'needs_receipt' using errcode = '42501';
  end if;
  insert into public.circle_members (circle_id, member_id) values (target_circle, member)
  on conflict do nothing;
end;
$$;

create or replace function public.remove_from_circle(target_circle uuid, member uuid)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  owner uuid := auth.uid();
begin
  if owner is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  if not exists (select 1 from public.circles c where c.id = target_circle and c.owner_id = owner) then
    raise exception 'not_your_circle' using errcode = '42501';
  end if;
  delete from public.circle_members where circle_id = target_circle and member_id = member;
end;
$$;

/**
 * Who vouches for me: people whose own circles contain me. Returns
 * their first names and the count — never the circle name or its other
 * members. Someone appears once however many of their circles hold you.
 */
create or replace function public.vouches_for_me()
returns table (voucher_first_name text)
language sql security definer set search_path = '' as $$
  select distinct split_part(p.display_name, ' ', 1)
  from public.circle_members m
  join public.circles c on c.id = m.circle_id
  join public.profiles p on p.id = c.owner_id
  where m.member_id = auth.uid()
    and c.owner_id <> auth.uid()
    and not private.is_blocked(c.owner_id, auth.uid());
$$;

grant execute on function public.my_circles() to authenticated;
grant execute on function public.create_circle(text) to authenticated;
grant execute on function public.add_to_circle(uuid, uuid) to authenticated;
grant execute on function public.remove_from_circle(uuid, uuid) to authenticated;
grant execute on function public.vouches_for_me() to authenticated;
