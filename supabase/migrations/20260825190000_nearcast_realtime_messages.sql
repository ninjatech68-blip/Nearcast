-- Realtime delivery for coordination messages (Doc 05: Realtime accelerates
-- delivery; PostgreSQL remains the source of truth).
--
-- Messages are added to the supabase_realtime publication so accepted
-- participants receive INSERTs on their room's private channel. RLS on
-- public.messages already scopes what each subscriber can see, and every
-- message is persisted through send_message before any broadcast.
--
-- Guarded: the publication exists only on a Supabase stack. On a plain
-- PostgreSQL test harness this migration is a recorded no-op.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'messages'
     ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end $$;
