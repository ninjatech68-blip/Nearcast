-- ===============================================================
-- Realtime for responses: a request arrives without a manual refresh.
-- ===============================================================
--
-- messages already stream over Realtime, so an open chat updates live.
-- A request to join a cast did not: it landed in `responses`, which was
-- not published, so the activity page and the rail count only saw it on
-- the next pull. This adds responses to the publication so the app can
-- react the moment one arrives.
--
-- RLS still decides who receives a row, so a subscriber only ever wakes
-- for responses on their own casts (and their own sent ones). Guarded on
-- the publication existing, like the messages migration, so the headless
-- local database still applies it.
-- ===============================================================

do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'responses'
    ) then
      execute 'alter publication supabase_realtime add table public.responses';
    end if;
  end if;
end $$;
