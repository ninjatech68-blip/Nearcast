-- ===============================================================
-- Push tokens: add device metadata so ops can target the right phone.
-- ===============================================================
--
-- The token table already tells us WHICH USER owns a token, but not
-- which physical device it came from. That made manual push tests easy
-- to aim at the wrong phone when one person had multiple iOS tokens.
--
-- Add best-effort device metadata and a richer RPC for newer clients,
-- while keeping the original 2-arg RPC working for older builds.
-- ===============================================================

alter table public.device_push_tokens
  add column if not exists device_label text,
  add column if not exists device_model text,
  add column if not exists app_build text;

create or replace function public.register_push_token(
  token text,
  platform text,
  device_label text,
  device_model text,
  app_build text
)
returns void language plpgsql security definer set search_path = '' as $$
#variable_conflict use_variable
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if token is null or char_length(btrim(token)) = 0 then
    return;
  end if;

  insert into public.device_push_tokens (
    token,
    user_id,
    platform,
    device_label,
    device_model,
    app_build,
    updated_at
  )
  values (
    btrim(token),
    uid,
    coalesce(nullif(btrim(platform), ''), 'unknown'),
    nullif(btrim(device_label), ''),
    nullif(btrim(device_model), ''),
    nullif(btrim(app_build), ''),
    now()
  )
  on conflict on constraint device_push_tokens_pkey do update
    set user_id = excluded.user_id,
        platform = excluded.platform,
        device_label = excluded.device_label,
        device_model = excluded.device_model,
        app_build = excluded.app_build,
        updated_at = now();
end;
$$;

grant execute on function public.register_push_token(text, text, text, text, text) to authenticated;
