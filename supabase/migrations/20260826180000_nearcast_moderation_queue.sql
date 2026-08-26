-- Moderation queue and moderator tooling (MUST-074, Doc 04).
--
-- Authorisation comes from `app_metadata` through `private.is_moderator()`.
-- User metadata is client-writable and must never grant anything.
--
-- Two things need review: reports people filed, and content the prohibited
-- classifier held. Both appear in one queue, so nothing is restricted and then
-- forgotten.

create or replace function public.moderation_queue()
returns table (
  kind text,
  item_id uuid,
  subject_type text,
  subject_id uuid,
  reason_code text,
  detail text,
  created_at timestamptz
)
language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_moderator() then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  return query
    select 'report'::text,
           r.id,
           r.subject_type,
           r.subject_id,
           r.reason_code,
           r.details,
           r.created_at
    from public.reports r
    where r.status in ('open', 'restricted')

    union all

    -- Content the classifier held. The statement is included because a
    -- moderator cannot judge what they cannot read; the function is
    -- moderator-gated and every read is a deliberate, audited act.
    select 'restricted_intent'::text,
           i.id,
           'intent'::text,
           i.id,
           coalesce(latest.metadata ->> 'category', 'unspecified'),
           i.statement,
           i.created_at
    from public.intents i
    join lateral (
      select e.metadata
      from public.intent_events e
      where e.intent_id = i.id and e.event_type = 'restricted_pending_review'
      order by e.created_at desc
      limit 1
    ) as latest on true
    where i.status = 'restricted'

    order by 7 asc;
end;
$$;

revoke execute on function public.moderation_queue() from public, anon;
grant execute on function public.moderation_queue() to authenticated;

/**
 * Decide a report. Every decision writes an immutable audit row containing
 * actor, timestamp, reason code, affected object and action, and captures the
 * subject's state at the moment of the decision so a restriction can be
 * explained later.
 */
create or replace function public.moderate_report(
  target_report_id uuid,
  action text,
  reason_code text
)
returns public.reports language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := private.require_actor();
  target public.reports;
  next_status public.report_status;
  captured jsonb;
begin
  if not private.is_moderator() then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  if action not in ('dismiss', 'restrict', 'action', 'escalate') then
    raise exception 'invalid_input' using errcode = '22000';
  end if;
  if reason_code is null or btrim(reason_code) = '' then
    raise exception 'invalid_input' using errcode = '22000';
  end if;

  select * into target from public.reports where id = target_report_id for update;
  if target.id is null then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  -- A decided report stays decided. Reopening is a new report, not a silent
  -- overwrite of the record.
  if target.status not in ('open', 'restricted') then
    raise exception 'stale_state' using errcode = '40001';
  end if;

  next_status := case action
    when 'dismiss' then 'dismissed'
    when 'restrict' then 'restricted'
    when 'action' then 'actioned'
    when 'escalate' then 'escalated'
  end::public.report_status;

  -- What the subject looked like when the decision was made.
  captured := case target.subject_type
    when 'intent' then coalesce(
      (select jsonb_build_object('status', i.status, 'restricted_from', i.restricted_from)
       from public.intents i where i.id = target.subject_id),
      jsonb_build_object('subject', 'missing'))
    else jsonb_build_object('subject_type', target.subject_type)
  end;

  if action = 'restrict' and target.subject_type = 'intent' then
    update public.intents
    set status = 'restricted',
        restricted_from = case when status in ('live', 'matched') then status else 'live' end,
        version = version + 1
    where id = target.subject_id and status <> 'restricted';
  end if;

  update public.reports set status = next_status where id = target.id
  returning * into target;

  insert into public.moderation_actions
    (report_id, moderator_id, subject_type, subject_id, action, reason_code, captured_state)
  values (target.id, actor, target.subject_type, target.subject_id,
          case action when 'action' then 'remove_content' else action end,
          reason_code, captured);

  return target;
end;
$$;

revoke execute on function public.moderate_report(uuid, text, text) from public, anon;
grant execute on function public.moderate_report(uuid, text, text) to authenticated;

/**
 * Lift a restriction, returning the intent to the state it was restricted
 * from. Doc 04 requires the safe state to be captured so it can be restored;
 * this is the other half of that promise.
 */
create or replace function public.restore_intent(
  target_intent_id uuid,
  reason_code text
)
returns public.intents language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := private.require_actor();
  target public.intents;
begin
  if not private.is_moderator() then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  if reason_code is null or btrim(reason_code) = '' then
    raise exception 'invalid_input' using errcode = '22000';
  end if;

  select * into target from public.intents where id = target_intent_id for update;
  if target.id is null then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  if target.status <> 'restricted' then
    raise exception 'stale_state' using errcode = '40001';
  end if;

  insert into public.moderation_actions
    (moderator_id, subject_type, subject_id, action, reason_code, captured_state)
  values (actor, 'intent', target.id, 'restore', reason_code,
          jsonb_build_object('status', target.status, 'restricted_from', target.restricted_from));

  update public.intents
  set status = coalesce(target.restricted_from, 'live'),
      restricted_from = null,
      version = version + 1
  where id = target.id
  returning * into target;

  insert into public.intent_events (intent_id, actor_id, event_type, from_status, to_status, metadata)
  values (target.id, actor, 'restriction_lifted', 'restricted', target.status,
          jsonb_build_object('reason_code', reason_code));

  return target;
end;
$$;

revoke execute on function public.restore_intent(uuid, text) from public, anon;
grant execute on function public.restore_intent(uuid, text) to authenticated;

-- A report is evidence. Its author may file it and see that it exists, but
-- editing or deleting it is not theirs to do — and a grant with no matching
-- policy fails silently, which is a worse answer than a refusal.
revoke update, delete on public.reports from authenticated;

-- Moderation outcomes are the audit trail. Nobody rewrites them, moderators
-- included: the functions above insert through `security definer`.
revoke insert, update, delete on public.moderation_actions from authenticated;
