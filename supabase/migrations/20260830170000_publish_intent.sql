-- Publishing an intent.
--
-- API Contracts lists `publish-intent` as taking a draft ID. Mobile Screen
-- Contracts requires the composer's draft to remain local and private, and the
-- two sit at the same precedence rank, so the privacy constraint decides: there
-- is no server-side draft row to name. Publish therefore carries the draft's
-- content and creates the live intent in one transaction.
--
-- The idempotency key does the work the draft ID would have done, and does it
-- better: a device-local draft identifier could not deduplicate a retry issued
-- from a second device, whereas the key is scoped to the actor. `expected
-- version` belongs to the edit path, where a row already exists to be stale
-- against; a first publish has no prior version to check.

create or replace function public.publish_intent(
  intent_primitive public.intent_primitive,
  intent_statement text,
  intent_response_action text,
  intent_expires_at timestamptz,
  reach public.reach_level default 'origin_only',
  link_enabled boolean default true,
  show_first_name boolean default true,
  context_starts_at timestamptz default null,
  context_deadline_at timestamptz default null,
  context_quantity numeric default null,
  context_price_minor bigint default null,
  context_currency char(3) default null,
  context_approximate_place text default null,
  context_requirements jsonb default '[]'::jsonb,
  private_exact_address text default null,
  private_contact text default null,
  private_coordination_notes text default null,
  request_key uuid default null
)
returns table (
  intent_id uuid,
  intent_share_slug uuid,
  intent_status public.intent_status,
  intent_version integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  trimmed_statement text := btrim(intent_statement);
  trimmed_action text := btrim(intent_response_action);
  request_fingerprint text;
  stored public.request_idempotency;
  created public.intents;
begin
  if actor is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  -- A verified identity is not a member. Only a redeemed invitation creates a
  -- profile, and only a member may broadcast.
  if not exists (select 1 from public.profiles where id = actor) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  if char_length(trimmed_statement) < 1 or char_length(trimmed_statement) > 500 then
    raise exception 'invalid_input' using errcode = '22023';
  end if;

  if char_length(trimmed_action) < 1 or char_length(trimmed_action) > 40 then
    raise exception 'invalid_input' using errcode = '22023';
  end if;

  if intent_expires_at <= now() then
    raise exception 'invalid_input' using errcode = '22023';
  end if;

  if (context_price_minor is null) <> (context_currency is null) then
    raise exception 'invalid_input' using errcode = '22023';
  end if;

  request_fingerprint := encode(
    extensions.digest(
      trimmed_statement || ':' || trimmed_action || ':' ||
      intent_primitive::text || ':' || intent_expires_at::text || ':' || reach::text,
      'sha256'
    ),
    'hex'
  );

  if request_key is not null then
    select * into stored
    from public.request_idempotency i
    where i.actor_id = actor
      and i.operation = 'publish-intent'
      and i.request_key = publish_intent.request_key;

    if stored.actor_id is not null then
      if stored.fingerprint <> request_fingerprint then
        raise exception 'conflict' using errcode = '23505';
      end if;

      select * into created
      from public.intents
      where id = (stored.result ->> 'intent_id')::uuid;

      return query
      select created.id, created.share_slug, created.status, created.version;
      return;
    end if;
  end if;

  insert into public.intents (
    broadcaster_id, primitive, statement, status, response_action,
    expires_at, published_at
  ) values (
    actor, intent_primitive, trimmed_statement, 'live', trimmed_action,
    intent_expires_at, now()
  ) returning * into created;

  insert into public.intent_context (
    intent_id, starts_at, deadline_at, quantity, price_minor, currency,
    approximate_place, requirements
  ) values (
    created.id, context_starts_at, context_deadline_at, context_quantity,
    context_price_minor, context_currency, nullif(btrim(context_approximate_place), ''),
    coalesce(context_requirements, '[]'::jsonb)
  );

  -- Written to the separate private table, never to intent_context, so the
  -- public projection has no path to these values.
  insert into public.intent_private (
    intent_id, exact_address, private_contact, coordination_notes
  ) values (
    created.id,
    nullif(btrim(private_exact_address), ''),
    nullif(btrim(private_contact), ''),
    nullif(btrim(private_coordination_notes), '')
  );

  insert into public.intent_reach (
    intent_id, level, public_link_enabled, show_broadcaster_first_name
  ) values (
    created.id, reach, link_enabled, show_first_name
  );

  insert into public.intent_events (
    intent_id, actor_id, event_type, from_status, to_status
  ) values (
    created.id, actor, 'intent_published', 'draft', 'live'
  );

  -- Analytics carries shape, never content. The table's own check rejects the
  -- forbidden keys; the properties here avoid the statement entirely rather
  -- than relying on that check to catch a mistake.
  insert into public.analytics_outbox (event_name, actor_id, object_id, properties)
  values (
    'intent_published',
    actor,
    created.id,
    jsonb_build_object(
      'primitive', intent_primitive::text,
      'reach_level', reach::text,
      'has_approximate_place', nullif(btrim(context_approximate_place), '') is not null,
      'has_private_details',
        nullif(btrim(private_exact_address), '') is not null
        or nullif(btrim(private_contact), '') is not null
        or nullif(btrim(private_coordination_notes), '') is not null
    )
  );

  if request_key is not null then
    insert into public.request_idempotency (
      actor_id, operation, request_key, fingerprint, result
    ) values (
      actor,
      'publish-intent',
      publish_intent.request_key,
      request_fingerprint,
      jsonb_build_object('intent_id', created.id, 'share_slug', created.share_slug)
    );
  end if;

  return query select created.id, created.share_slug, created.status, created.version;
end;
$$;

revoke execute on function public.publish_intent(
  public.intent_primitive, text, text, timestamptz, public.reach_level, boolean,
  boolean, timestamptz, timestamptz, numeric, bigint, char(3), text, jsonb,
  text, text, text, uuid
) from public, anon;

grant execute on function public.publish_intent(
  public.intent_primitive, text, text, timestamptz, public.reach_level, boolean,
  boolean, timestamptz, timestamptz, numeric, bigint, char(3), text, jsonb,
  text, text, text, uuid
) to authenticated;
