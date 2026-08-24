# Nearcast System Architecture And Data Model

## Document Control

- **Status:** Approved MVP architecture
- **Last updated:** 2026-08-24
- **Tech stack:** Expo, React Native, TypeScript, Supabase, PostgreSQL, PostGIS
- **Governed by:** [Nearcast Documentation Reference](./00 - Start Here - Nearcast Project Reference.md)

## Architecture Goals

- Allow one founder and an AI coding partner to ship and operate the MVP.
- Preserve privacy through server and database enforcement.
- Support relational trust, lifecycle transactions, and geospatial matching.
- Avoid infrastructure that is unnecessary before product validation.
- Keep migration paths open through standard TypeScript, SQL, and PostgreSQL.

## High-Level Architecture

```text
Expo mobile app + Expo Router web fallback
                 |
                 | Supabase SDK / HTTPS / Realtime
                 v
        Server-owned Edge Functions
     matching, acceptance, trust, safety
                 |
                 v
 Supabase Auth + PostgreSQL/PostGIS + Storage
                 |
                 +--> Realtime private match channels
                 +--> Cron/queue jobs
                 +--> Expo Push Service
                 +--> PostHog and Sentry
```

## Client Architecture

- **Expo/React Native/TypeScript:** Shared iOS and Android application.
- **Expo Router:** Mobile navigation, HTTPS link handling, and privacy-safe web fallback.
- **React Hook Form and Zod:** Form state and shared validation schemas.
- **TanStack Query:** Server-state caching only where it simplifies invalidation and retries.
- **React Native StyleSheet and design tokens:** Internal design-system implementation.
- **Local secure storage:** Authentication session and minimal sensitive preferences.
- **Local draft storage:** Unpublished intent drafts only, with explicit clearing on account deletion.

Avoid global client state for server-owned entities. Do not store authorization decisions locally.

## Server Boundary

Simple reads may use Supabase's Data API when RLS is straightforward. The following operations must use server-owned functions:

- Publish intent.
- Expand or reduce reach.
- Generate recipient deliveries.
- Submit origin confirmation.
- Submit and decide responses.
- Create a match and release sensitive details.
- Resolve an intent and update reliability.
- Block or report.
- Moderate content or accounts.
- Send notifications.

Functions must be idempotent and validate both authentication and current lifecycle state.

## Core Data Entities

### Identity

| Entity | Purpose |
|---|---|
| `profiles` | Public and contextual identity separate from auth records |
| `profile_private` | Private contact and sensitive account data |
| `verifications` | Verification type, state, provider reference, and expiry |
| `devices` | Push token, platform, locale, and notification preferences |
| `blocks` | Directional global block relationship |

### Intent

| Entity | Purpose |
|---|---|
| `intents` | Core statement, primitive, lifecycle, broadcaster, expiry |
| `intent_context` | Public structured time, quantity, price, approximate geography |
| `intent_private` | Exact location, private contact, sensitive coordination fields |
| `intent_reach` | Current reach level and disclosure configuration |
| `intent_confirmations` | Unique authenticated origin support |
| `intent_deliveries` | Recipient-specific delivery and explanation snapshot |
| `intent_events` | Append-only lifecycle and material-edit history |

### Response And Coordination

| Entity | Purpose |
|---|---|
| `responses` | Respondent message, qualification, and decision state |
| `matches` | Accepted broadcaster/respondent relationship for one intent |
| `match_disclosures` | Fields explicitly released to a match |
| `conversations` | One temporary room per active match |
| `messages` | Text messages and system events |
| `interaction_outcomes` | Participant-confirmed completion evidence |
| `reliability_aggregates` | Contextual summaries derived from completed outcomes |

### Safety And Operations

| Entity | Purpose |
|---|---|
| `reports` | User safety reports and reason codes |
| `moderation_actions` | Immutable enforcement audit log |
| `notification_jobs` | Idempotent notification queue |
| `analytics_outbox` | Privacy-filtered product event delivery |

## Key Relationships

```text
profile 1---N intents
intent 1---1 intent_context
intent 1---1 intent_private
intent 1---1 intent_reach
intent 1---N confirmations
intent 1---N deliveries
intent 1---N responses
response 0---1 match
match 1---1 conversation
conversation 1---N messages
match 1---N outcomes
profile N---N profile through blocks and completed interactions
```

## Intent State Machine

Allowed transitions:

```text
draft -> live
draft -> withdrawn
live -> matched
live -> resolved
live -> expired
live -> withdrawn
matched -> resolved
matched -> expired
matched -> withdrawn
live/matched -> restricted
restricted -> previous safe state or withdrawn
```

Transitions must use database transactions and reject stale expected states.

## Matching Pipeline

### Eligibility Filters

- Intent is live and not expired.
- Reach allows delivery to the candidate.
- Candidate is within geographic and timing constraints.
- Candidate meets explicit eligibility requirements.
- No block exists in either direction.
- Neither account nor intent is restricted.
- Candidate has not hidden or already acted on the intent.

### Ranking Signals

- Trust distance.
- Geographic relevance using PostGIS.
- Timing and expiry proximity.
- Intent primitive and interest relevance.
- Prior successful interaction context.
- Recency.
- Recipient feedback and fatigue limits.

### Explanation

Every delivery stores a privacy-safe explanation code and rendered explanation, such as `nearby_interest_match` or `adjacent_trust_connection`. Ranking without an explainable delivery reason is not permitted in the MVP.

## Geospatial Model

- Store discovery geography as PostGIS `geography` with precision appropriate to an area, not an address.
- Store exact coordination geography in `intent_private` with stricter RLS.
- Use GIST indexes for radius and boundary queries.
- Return distance bands or rounded distance where exact distance could reveal location.
- Avoid sending raw coordinates to clients unless the accepted disclosure explicitly requires navigation.

## Realtime And Messaging

- Use private channels authorized by match membership.
- Persist every user-visible message before broadcast.
- Treat Realtime as delivery acceleration, not the source of truth.
- Fetch missed messages from PostgreSQL after reconnect.
- Do not implement presence, typing indicators, media messages, or voice notes in MVP.
- Unsubscribe from channels when rooms close or screens unmount.

## Notifications

Use an outbox/queue pattern:

```text
domain transaction
  -> insert notification job with idempotency key
  -> worker evaluates preferences and privacy
  -> send through Expo Push Service
  -> record provider result
  -> retry transient failures with capped backoff
```

Push payloads contain object IDs and generic copy only. They must not contain intent text, messages, contact details, or exact location.

## Storage

- Store avatars and optional intent images in separate buckets.
- Validate MIME type, extension, dimensions, and size.
- Use signed URLs for restricted media.
- Strip image metadata where practical.
- Do not accept arbitrary documents in MVP.

## Security Architecture

- Enable RLS and explicit grants for every exposed table.
- Use separate policies for select, insert, update, and delete.
- Use `USING` and `WITH CHECK` for updates.
- Never use user-editable metadata for authorization.
- Keep service-role and provider secrets in server environments only.
- Put privileged functions in a non-exposed schema and restrict execution.
- Validate input with shared Zod schemas and database constraints.
- Add per-IP and per-user rate limits.
- Log security events without logging sensitive content.

## Environments And Deployment

- **Local:** Local Supabase, mocked push provider, seed accounts.
- **Staging:** Separate Supabase project, development app identifiers, test analytics.
- **Production:** Isolated Supabase project, production app identifiers, restricted secrets.

Schema changes flow through versioned migrations. EAS creates mobile builds. GitHub Actions run linting, type checks, unit tests, database tests, and migration verification before deployment.

## Scale Plan

### Alpha To 10K DAU

Use one managed Postgres instance, indexed queries, Edge Functions, and Supabase Realtime.

### 10K To 100K DAU

Measure query plans, precompute recipient deliveries, add queue workers, tune connection limits, and introduce read replicas only where needed.

### Beyond 100K DAU

Evaluate a dedicated TypeScript API, specialized notification workers, feed materialization, and chat service extraction based on measured bottlenecks. Do not preselect these changes.

## Architecture Non-Goals

- Microservices.
- Kubernetes.
- Kafka.
- Graph database.
- Elasticsearch.
- Client-side authorization.
- AI-first matching.
- Custom WebSocket infrastructure.

## Architecture Acceptance Gate

- Full lifecycle works transactionally.
- Permissions Matrix has automated database tests.
- Matching excludes blocked and ineligible users.
- Reconnect retrieves persisted messages.
- Push payload audit finds no sensitive content.
- Database backup can be restored into staging.
- Account deletion removes or anonymizes required records.

## Change Log

| Date | Change |
|---|---|
| 2026-08-24 | Established modular-monolith architecture, data model, matching, and deployment baseline |
