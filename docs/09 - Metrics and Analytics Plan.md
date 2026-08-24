# Nearcast Analytics And Measurement Plan

## Document Control

- **Status:** Approved measurement baseline
- **Last updated:** 2026-08-24
- **Proposed tool:** PostHog
- **Governed by:** [Nearcast Documentation Reference](./00 - Start Here - Nearcast Project Reference.md)

## Measurement Objective

Analytics exists to determine whether Nearcast helps users resolve intents through relevant people beyond their initial closed circle without creating unacceptable privacy or safety costs.

Do not optimize for session duration, feed depth, raw notification opens, or total broadcasts without resolution quality.

## North-Star Metric

**Weekly externally resolved intents:** Unique intents resolved through Nearcast with at least one accepted participant who was not an origin confirmer at publication time.

## Core Questions

| Question | Decision informed |
|---|---|
| Can users publish a valid intent quickly? | Simplify or revise creation flow |
| Do origin circles genuinely confirm intents? | Improve WhatsApp bridge and confirmation meaning |
| Does controlled expansion produce relevant responses? | Change reach levels and matching |
| Can recipients understand why they saw an intent? | Improve explanations and provenance |
| Do accepted responses lead to completed outcomes? | Improve qualification and trust evidence |
| Does a successful resolution create repeat use? | Validate retention mechanism |
| Do privacy and safety costs remain acceptable? | Restrict reach, categories, or launch scale |

## Funnel Definitions

### Broadcaster Funnel

```text
intent_draft_started
 -> intent_previewed
 -> intent_published
 -> intent_shared
 -> origin_confirmation_received
 -> reach_changed
 -> response_received
 -> response_accepted
 -> intent_resolved
```

### Recipient Funnel

```text
intent_link_opened or intent_card_viewed
 -> intent_detail_viewed
 -> recommendation_reason_viewed
 -> response_started
 -> response_submitted
 -> response_accepted
 -> interaction_completed
```

## Event Naming

Use lowercase object-action names. Put context in properties rather than creating category-specific event names.

## Event Taxonomy

| Event | Trigger | Allowed properties |
|---|---|---|
| `account_authenticated` | Successful sign-in | method, is_new_user |
| `onboarding_completed` | Required onboarding ends | steps_completed, area_precision_band |
| `intent_draft_started` | Composer receives first meaningful input | entry_point |
| `intent_details_confirmed` | Structured details accepted | primitive, has_area, has_time, has_price, requirement_count |
| `intent_previewed` | Recipient preview opened | primitive, reach_level |
| `intent_published` | Server commits live intent | intent_id, primitive, reach_level, expiry_hours, area_bucket |
| `intent_shared` | Share action completed | intent_id, channel |
| `intent_link_opened` | Valid shared link opened | intent_id, authenticated, referrer_class |
| `origin_confirmation_submitted` | Unique confirmation committed | intent_id, confirmation_position_bucket |
| `reach_change_previewed` | Reach comparison opened | intent_id, from_level, to_level |
| `reach_changed` | Server commits reach change | intent_id, from_level, to_level, direction |
| `intent_card_viewed` | Card receives qualified impression | intent_id, explanation_code, position_bucket |
| `intent_detail_viewed` | Detail view becomes active | intent_id, source |
| `recommendation_reason_viewed` | Explanation expanded | intent_id, explanation_code |
| `intent_feedback_submitted` | Save/hide/not relevant | intent_id, feedback_type |
| `response_started` | Response composer begins | intent_id, action_type |
| `response_submitted` | Server commits response | intent_id, response_id, action_type, qualification_count |
| `response_decided` | Accept or decline commits | intent_id, response_id, decision, decision_latency_bucket |
| `match_created` | Acceptance creates match | intent_id, match_id, trust_distance_bucket |
| `coordination_message_sent` | Message persists | match_id, message_type |
| `intent_resolution_submitted` | Broadcaster chooses outcome | intent_id, resolution_type, lifetime_bucket |
| `interaction_completion_confirmed` | Participant confirms completion | intent_id, match_id, confirmed |
| `user_blocked` | Block commits | relationship_context, reason_group |
| `safety_report_submitted` | Report commits | object_type, reason_group, immediate_block |
| `notification_opened` | Notification deep link opens | notification_type, object_type |

## Prohibited Analytics Data

Never send:

- Intent text.
- Response text.
- Messages.
- Exact latitude or longitude.
- Address.
- Email or phone number.
- Public display name.
- Private-group name or membership.
- Contact details.
- Authentication token.
- Free-text report details.

Use random internal IDs, coarse area buckets, controlled enums, and quantity bands.

## Derived Metrics

- Draft-to-publish conversion.
- Median authenticated time to publish.
- Share rate after publication.
- Origin-confirmation rate.
- External delivery-to-response rate.
- Response acceptance rate.
- Acceptance-to-completion rate.
- Published-to-resolved rate.
- Median time to first useful response.
- Weekly repeat broadcaster rate after resolution.
- Explanation-open and not-relevant rate by explanation code.
- Reports and blocks per 100 accepted matches.

## Cohorts

- Broadcasters with externally resolved first intent.
- Broadcasters with no response before expiry.
- Recipients who responded through a shared link.
- Recipients who responded through For You.
- Users with one completed interaction.
- Users with a safety report or block event.

Do not create cohorts based on sensitive traits or inferred protected characteristics.

## Instrumentation Rules

- Emit business events after server success, not optimistic UI action.
- Use idempotency keys to prevent duplicate server events.
- Version event schemas.
- Validate allowed properties in a shared TypeScript analytics module.
- Separate development, staging, and production projects.
- Disable session replay on screens containing intent text, messages, location, reports, or private profile data.

## Dashboard Set

### Product Health

Weekly external resolutions, publication volume, resolution rate, median response time, repeat broadcasters.

### Core Funnel

Draft through resolution, segmented by entry point, reach level, and primitive.

### Matching Quality

Delivery, detail view, response, acceptance, completion, hide/not-relevant, explanation code.

### Trust And Safety

Blocks, reports, restrictions, no-shows, privacy incidents, and category/reach concentration.

### Reliability

Event delivery lag, duplicate event rate, missing required properties, and schema errors.

## Validation Checklist

- Each event fires once after the documented trigger.
- IDs correlate across the funnel without exposing PII.
- No prohibited fields appear in payloads.
- Offline retries do not duplicate events.
- Account deletion behavior is verified.
- Production dashboard filters exclude development traffic.

## Change Log

| Date | Change |
|---|---|
| 2026-08-24 | Defined north star, funnels, event taxonomy, privacy restrictions, and dashboards |
