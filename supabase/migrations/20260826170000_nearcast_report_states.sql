-- Align the report states with Doc 04 (MUST-074).
--
-- The schema shipped with 'reviewing', which Doc 04 does not define, and was
-- missing 'restricted' and 'escalated', which it does. Doc 04 is a safety
-- document and outranks the schema, so the enum follows the document. Any
-- existing 'reviewing' row means the same thing as 'restricted': visibility
-- limited while the review happens.
create type public.report_status_documented as enum (
  'open', 'restricted', 'actioned', 'dismissed', 'escalated'
);

alter table public.reports alter column status drop default;
alter table public.reports
  alter column status type public.report_status_documented
  using (
    case when status::text = 'reviewing' then 'restricted' else status::text end
  )::public.report_status_documented;
alter table public.reports alter column status set default 'open';

drop type public.report_status;
alter type public.report_status_documented rename to report_status;

-- Restoration is an action like any other and must be auditable.
alter table public.moderation_actions drop constraint if exists moderation_actions_action_check;
alter table public.moderation_actions add constraint moderation_actions_action_check
  check (action in (
    'warn', 'remove_content', 'reduce_reach', 'require_verification',
    'restrict', 'suspend', 'dismiss', 'escalate', 'restore'
  ));
