begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

select has_table('public', 'notification_preferences', 'preferences are stored');
select has_function('private', 'wants_notification', 'and consulted before queueing');

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) values
  ('00000000-0000-0000-0000-0000000000C8','00000000-0000-0000-0000-000000000000','authenticated','authenticated','caster8@x','',now(),now()),
  ('00000000-0000-0000-0000-0000000000C9','00000000-0000-0000-0000-000000000000','authenticated','authenticated','joiner9@x','',now(),now());

insert into public.profiles (id, display_name) values
  ('00000000-0000-0000-0000-0000000000C8','Caster Eight'),
  ('00000000-0000-0000-0000-0000000000C9','Joiner Nine');

/**
 * Absent row means enabled. That is what makes this migration a no-op for
 * every member who already exists: nobody is silently switched off, and no
 * backfill is needed.
 */
select is(
  private.wants_notification('00000000-0000-0000-0000-0000000000C8', 'join_request'),
  true,
  'a member who never opened the setting still gets notified'
);

insert into public.notification_preferences (profile_id, kind, enabled)
values ('00000000-0000-0000-0000-0000000000C8', 'join_request', false);

select is(
  private.wants_notification('00000000-0000-0000-0000-0000000000C8', 'join_request'),
  false,
  'switching a kind off is respected'
);

select is(
  private.wants_notification('00000000-0000-0000-0000-0000000000C8', 'chat_message'),
  true,
  'and it is granular: the other kinds are untouched'
);

-- End to end: the trigger consults it.
insert into public.intents (id, broadcaster_id, category, statement, status, expires_at, published_at)
values ('90000000-0000-0000-0000-0000000000C8','00000000-0000-0000-0000-0000000000C8','social',
        'Anyone for a walk','live', now() + interval '1 day', now());

insert into public.responses (intent_id, respondent_id, message)
values ('90000000-0000-0000-0000-0000000000C8','00000000-0000-0000-0000-0000000000C9','I am in');

select is_empty(
  $$select 1 from public.notification_outbox
    where recipient_id = '00000000-0000-0000-0000-0000000000C8' and kind = 'join_request'$$,
  'a join request queues nothing for a caster who switched that kind off'
);

update public.notification_preferences set enabled = true
where profile_id = '00000000-0000-0000-0000-0000000000C8' and kind = 'join_request';

insert into public.intents (id, broadcaster_id, category, statement, status, expires_at, published_at)
values ('90000000-0000-0000-0000-0000000000C7','00000000-0000-0000-0000-0000000000C8','social',
        'Another walk','live', now() + interval '1 day', now());

insert into public.responses (intent_id, respondent_id, message)
values ('90000000-0000-0000-0000-0000000000C7','00000000-0000-0000-0000-0000000000C9','me too');

select isnt_empty(
  $$select 1 from public.notification_outbox
    where recipient_id = '00000000-0000-0000-0000-0000000000C8' and kind = 'join_request'$$,
  'and queues again once it is switched back on'
);

-- What a person chooses to be told about is theirs alone.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000C9","role":"authenticated"}';

select is_empty(
  $$select 1 from public.notification_preferences
    where profile_id = '00000000-0000-0000-0000-0000000000C8'$$,
  'nobody can read anyone else''s notification preferences'
);

select * from finish();
rollback;
