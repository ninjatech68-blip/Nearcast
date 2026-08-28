-- ---------------------------------------------------------------
-- Attendance on the backend: receipts and flakes.
--
-- This closes the trust loop the app exists for. After a plan's start
-- time, each side reports who showed; attendance_outcome (already in
-- the schema) turns those reports into a receipt, a flake, withdrawn,
-- disputed, or unverified — never an opinion, always the rule.
--
-- What this adds is the read/write around it: report presence, list
-- the plans I still owe a report on, list my own past plans with their
-- outcome, and the shared-history counts a caster sheet shows. The
-- outcome logic is untouched; these are the shaped reads and the one
-- guarded write.
-- ---------------------------------------------------------------

/**
 * Report whether someone showed. Either party of the plan may report
 * the other; you cannot report yourself, and silence is never a report.
 * Idempotent on (intent, reporter, subject): changing your mind
 * overwrites, it does not stack.
 */
create or replace function public.report_presence(
  target_intent uuid,
  subject uuid,
  report public.presence_report
)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  reporter uuid := auth.uid();
begin
  if reporter is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if reporter = subject then
    raise exception 'cannot_report_self' using errcode = '23514';
  end if;

  -- both reporter and subject must be parties to this plan: the
  -- broadcaster, or someone matched into it.
  if not (
    exists (select 1 from public.intents i where i.id = target_intent and i.broadcaster_id = reporter)
    or exists (select 1 from public.matches m where m.intent_id = target_intent and m.participant_id = reporter)
  ) then
    raise exception 'not_a_party' using errcode = '42501';
  end if;
  if not (
    exists (select 1 from public.intents i where i.id = target_intent and i.broadcaster_id = subject)
    or exists (select 1 from public.matches m where m.intent_id = target_intent and m.participant_id = subject)
  ) then
    raise exception 'subject_not_a_party' using errcode = '23514';
  end if;

  insert into public.presence_reports (intent_id, reporter_id, subject_id, report)
  values (target_intent, reporter, subject, report)
  on conflict (intent_id, reporter_id, subject_id)
  do update set report = excluded.report, created_at = now();
end;
$$;

/**
 * Plans whose start has passed where I still owe a report on the other
 * side. One row per (plan, person-I-owe): the broadcaster owes each
 * participant, a participant owes the broadcaster.
 */
create or replace function public.plans_to_report()
returns table (
  intent_id uuid,
  title text,
  area text,
  starts_at timestamptz,
  subject_id uuid,
  subject_first_name text
)
language sql security definer set search_path = '' as $$
  -- I broadcast: owe each participant I have not yet reported
  select i.id, i.statement, ctx.approximate_place, ctx.starts_at,
         m.participant_id, split_part(p.display_name, ' ', 1)
  from public.matches m
  join public.intents i on i.id = m.intent_id
  join public.intent_context ctx on ctx.intent_id = i.id
  join public.profiles p on p.id = m.participant_id
  where i.broadcaster_id = auth.uid()
    and m.closed_at is null
    and ctx.starts_at is not null and ctx.starts_at < now()
    and not exists (
      select 1 from public.presence_reports r
      where r.intent_id = i.id and r.reporter_id = auth.uid() and r.subject_id = m.participant_id
    )
  union all
  -- I joined: owe the broadcaster
  select i.id, i.statement, ctx.approximate_place, ctx.starts_at,
         i.broadcaster_id, split_part(p.display_name, ' ', 1)
  from public.matches m
  join public.intents i on i.id = m.intent_id
  join public.intent_context ctx on ctx.intent_id = i.id
  join public.profiles p on p.id = i.broadcaster_id
  where m.participant_id = auth.uid()
    and m.closed_at is null
    and ctx.starts_at is not null and ctx.starts_at < now()
    and not exists (
      select 1 from public.presence_reports r
      where r.intent_id = i.id and r.reporter_id = auth.uid() and r.subject_id = i.broadcaster_id
    );
$$;

/**
 * My past plans with my computed outcome and who else was there.
 * Newest first — the receipts screen.
 */
create or replace function public.my_receipts()
returns table (
  intent_id uuid,
  title text,
  area text,
  starts_at timestamptz,
  outcome public.attendance_result,
  other_names text[]
)
language sql security definer set search_path = '' as $$
  with mine as (
    -- intents I broadcast that had at least one match
    select distinct i.id
    from public.intents i
    join public.matches m on m.intent_id = i.id
    join public.intent_context ctx on ctx.intent_id = i.id
    where i.broadcaster_id = auth.uid()
      and ctx.starts_at is not null and ctx.starts_at < now()
    union
    -- intents I joined
    select m.intent_id
    from public.matches m
    join public.intent_context ctx on ctx.intent_id = m.intent_id
    where m.participant_id = auth.uid()
      and ctx.starts_at is not null and ctx.starts_at < now()
  )
  select
    i.id,
    i.statement,
    ctx.approximate_place,
    ctx.starts_at,
    public.attendance_outcome(i.id, auth.uid()),
    (
      select array_agg(split_part(p.display_name, ' ', 1))
      from (
        select m.participant_id as person from public.matches m where m.intent_id = i.id
        union
        select i.broadcaster_id
      ) parties
      join public.profiles p on p.id = parties.person
      where parties.person <> auth.uid()
    )
  from mine
  join public.intents i on i.id = mine.id
  join public.intent_context ctx on ctx.intent_id = i.id
  order by ctx.starts_at desc;
$$;

/**
 * Shared history with one person: how many past plans we were both in,
 * how many became receipts for both of us, how many carried a flake on
 * either side. Drives the caster sheet's "with you" line.
 */
create or replace function public.shared_history_with(person uuid)
returns table (plans integer, receipts integer, flakes integer)
language sql security definer set search_path = '' as $$
  with shared as (
    -- a plan we were both in: one of us broadcast, the other joined,
    -- either direction; start passed.
    select i.id
    from public.intents i
    join public.intent_context ctx on ctx.intent_id = i.id
    join public.matches m on m.intent_id = i.id
    where ctx.starts_at is not null and ctx.starts_at < now()
      and (
        (i.broadcaster_id = auth.uid() and m.participant_id = person)
        or (i.broadcaster_id = person and m.participant_id = auth.uid())
      )
  ),
  outcomes as (
    select
      public.attendance_outcome(s.id, auth.uid()) as mine,
      public.attendance_outcome(s.id, person) as theirs
    from shared s
  )
  select
    (select count(*)::int from shared),
    (select count(*)::int from outcomes where mine = 'receipt' and theirs = 'receipt'),
    (select count(*)::int from outcomes where mine = 'flake' or theirs = 'flake');
$$;

grant execute on function public.report_presence(uuid, uuid, public.presence_report) to authenticated;
grant execute on function public.plans_to_report() to authenticated;
grant execute on function public.my_receipts() to authenticated;
grant execute on function public.shared_history_with(uuid) to authenticated;
