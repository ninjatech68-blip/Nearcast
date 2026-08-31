# Nearcast Server API Contracts

## Document Control

- **Status:** Mandatory server boundary
- **Last updated:** 2026-08-24
- **Architecture parent:** [System Architecture](./05 - System Architecture.md)
- **Authorization parent:** [Permissions Matrix](./06 - Permissions and Access Rules.md)

## Conventions

Authenticated functions derive the actor from the verified JWT and never accept an actor ID as authority. Mutations accept an idempotency key and expected object version or state. Success returns the canonical object identifier, resulting state, and version. Errors use stable codes: `invalid_input`, `not_authenticated`, `not_authorized`, `not_found`, `stale_state`, `rate_limited`, `restricted`, and `conflict`.

## Function Inventory

| Function | Input | Success | Atomic requirements |
|---|---|---|---|
| `publish_cast` (implemented) | category, statement, area name, radius km, expiry; optional pin, start time, coarse window | the created `intents` row | Owner from `auth.uid()`; rejects a past expiry and an out-of-range radius; rounds the pin to 3dp before storing so no discoverable row carries an exact location |
| `my_feed` (implemented) | — | delivered casts with `reason_text`, `signals`, `score` | Evaluates undelivered live casts through the gate, stores the passing ones in `intent_deliveries`, then returns what that table holds. The stored delivery is also what grants read on the cast |
| `hide_cast` (implemented) | intent ID, not-relevant flag | — | Sets `hidden_at` on the viewer's own delivery row only |
| `change-intent-radius` | intent ID, expected version, target radius in km, confirmation | radius, version | Reject implicit widening; log old/new radius |
| `submit-response` | intent ID, message, qualification, idempotency key | response ID, `pending` | Recheck delivery, eligibility, expiry, blocks, self-response |
| `accept-response` | response ID, expected intent state | match ID, conversation ID, `matched` | Lock response/intent; create one match; idempotently return existing match |
| `resolve-intent` | intent ID, expected state, outcome | `resolved`, version | Stop responses; append event and notification jobs |
| `release-disclosure` | match ID, field names | released fields | Actor owns fields; match active; audit each release |
| `send-message` | conversation ID, body, idempotency key | message ID, created time | Persist before Realtime; reject closed/blocked room |
| `create-report` | subject type/ID, reason, optional details | report ID, `open` | Rate limit; preserve evidence; avoid subject existence leakage |
| `delete-account` | confirmation and re-auth proof | deletion job ID | Revoke sessions, hide content, apply retention policy |

## Public Link Query

`get_public_intent(share_slug)` is the only anonymous intent query. It returns statement, primitive, response action, expiry, permitted structured context, optional first name, and genuine confirmation count. It never returns broadcaster ID, exact geography, address, contact, group identity, confirmer identities, responses, delivery graph, or internal moderation state.

## Validation

Shared Zod schemas live with each feature and are mirrored by database constraints for critical invariants. Edge Functions validate content length and shape before calling database transactions. PostgreSQL remains authoritative for ownership, state, uniqueness, and row visibility.

## Idempotency

Client-generated UUID idempotency keys are scoped to actor and operation. The server stores request fingerprint and result. A repeated key with the same fingerprint returns the original result; a repeated key with a different fingerprint returns `conflict`. Keys are retained at least as long as offline retries can occur.

## Observability And Privacy

Logs contain request ID, actor hash, operation, object ID, result code, duration, and deployment version. They exclude intent text, message bodies, exact coordinates, contact details, access tokens, private-group names, and report narrative.

## Change Log

| Date | Change |
|---|---|
| 2026-08-24 | Defined server mutation inventory, public projection, errors, idempotency, and logging boundaries |
