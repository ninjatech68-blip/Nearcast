begin;
create extension if not exists pgtap with schema extensions;
select plan(3);

-- Reproduce the pre-migration mess: TWO conversations for one pair, each
-- with its own match + a message, then run the same merge the migration
-- does and assert they fold into one with both messages kept.

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) values
  ('00000000-0000-0000-0000-0000000000f1','00000000-0000-0000-0000-000000000000','authenticated','authenticated','dd1@x','',now(),now()),
  ('00000000-0000-0000-0000-0000000000f2','00000000-0000-0000-0000-000000000000','authenticated','authenticated','dd2@x','',now(),now());
insert into public.profiles (id, display_name) values
  ('00000000-0000-0000-0000-0000000000f1','Aay'), ('00000000-0000-0000-0000-0000000000f2','Bee');

-- two casts, two responses, two matches, two conversations (the old shape)
insert into public.intents (id, broadcaster_id, category, statement, status, expires_at, published_at) values
  ('f0000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000f1','sports','one','matched', now()+interval '2 days', now()),
  ('f0000000-0000-0000-0000-0000000000a2','00000000-0000-0000-0000-0000000000f1','food','two','matched', now()+interval '2 days', now());
insert into public.responses (id, intent_id, respondent_id, message, status) values
  ('f0000000-0000-0000-0000-0000000000b1','f0000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000f2','in','accepted'),
  ('f0000000-0000-0000-0000-0000000000b2','f0000000-0000-0000-0000-0000000000a2','00000000-0000-0000-0000-0000000000f2','in','accepted');
insert into public.matches (id, intent_id, response_id, broadcaster_id, participant_id, conversation_id) values
  ('f0000000-0000-0000-0000-0000000000c1','f0000000-0000-0000-0000-0000000000a1','f0000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000f1','00000000-0000-0000-0000-0000000000f2', null),
  ('f0000000-0000-0000-0000-0000000000c2','f0000000-0000-0000-0000-0000000000a2','f0000000-0000-0000-0000-0000000000b2','00000000-0000-0000-0000-0000000000f1','00000000-0000-0000-0000-0000000000f2', null);

-- the unique index is already in place from the migration; drop it to
-- recreate the duplicate state, exactly as the hosted DB looked.
drop index if exists public.conversations_pair_uq;

insert into public.conversations (id, match_id, person_low, person_high, mode, created_at) values
  ('f0000000-0000-0000-0000-0000000000d1','f0000000-0000-0000-0000-0000000000c1',
    least('00000000-0000-0000-0000-0000000000f1'::uuid,'00000000-0000-0000-0000-0000000000f2'::uuid),
    greatest('00000000-0000-0000-0000-0000000000f1'::uuid,'00000000-0000-0000-0000-0000000000f2'::uuid),'day', now() - interval '2 hours'),
  ('f0000000-0000-0000-0000-0000000000d2','f0000000-0000-0000-0000-0000000000c2',
    least('00000000-0000-0000-0000-0000000000f1'::uuid,'00000000-0000-0000-0000-0000000000f2'::uuid),
    greatest('00000000-0000-0000-0000-0000000000f1'::uuid,'00000000-0000-0000-0000-0000000000f2'::uuid),'day', now() - interval '1 hour');
update public.matches set conversation_id = 'f0000000-0000-0000-0000-0000000000d1' where id = 'f0000000-0000-0000-0000-0000000000c1';
update public.matches set conversation_id = 'f0000000-0000-0000-0000-0000000000d2' where id = 'f0000000-0000-0000-0000-0000000000c2';
insert into public.messages (conversation_id, sender_id, body, is_system) values
  ('f0000000-0000-0000-0000-0000000000d1','00000000-0000-0000-0000-0000000000f1','from chat one', false),
  ('f0000000-0000-0000-0000-0000000000d2','00000000-0000-0000-0000-0000000000f1','from chat two', false);

select is((select count(*)::int from public.conversations
  where person_low = least('00000000-0000-0000-0000-0000000000f1'::uuid,'00000000-0000-0000-0000-0000000000f2'::uuid)),
  2, 'two duplicate-pair conversations exist before the merge');

-- the merge, verbatim from the migration
do $$
declare keeper uuid; loser uuid;
begin
  for keeper, loser in
    select first_value(id) over w, id
    from public.conversations where person_low is not null
    window w as (partition by person_low, person_high order by created_at, id)
  loop
    if keeper is null or loser = keeper then continue; end if;
    update public.matches set conversation_id = keeper where conversation_id = loser;
    update public.messages set conversation_id = keeper where conversation_id = loser;
    delete from public.conversation_reads where conversation_id = loser;
    delete from public.conversations where id = loser;
  end loop;
end $$;

select is((select count(*)::int from public.conversations
  where person_low = least('00000000-0000-0000-0000-0000000000f1'::uuid,'00000000-0000-0000-0000-0000000000f2'::uuid)),
  1, 'they collapse into a single chat');
select is(
  (select count(*)::int from public.messages
     where conversation_id = 'f0000000-0000-0000-0000-0000000000d1'),
  2, 'both chats'' messages survive on the keeper (the older conversation)');

select finish();
rollback;
