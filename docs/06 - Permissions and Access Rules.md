# Nearcast Permissions Matrix

## Document Control

- **Status:** Mandatory authorization baseline
- **Last updated:** 2026-08-24
- **Security parent:** [Trust, Privacy, and Safety](./04 - Trust Privacy and Safety.md)
- **Governed by:** [Nearcast Documentation Reference](./00 - Start Here - Nearcast Project Reference.md)

## Roles

- **Anonymous viewer:** Opens a valid public share link without authentication.
- **Authenticated recipient:** Eligible user who receives or opens an intent.
- **Origin confirmer:** Authenticated user who confirms support through an origin link.
- **Respondent:** User who submits a response.
- **Accepted participant:** Respondent accepted into a match.
- **Broadcaster:** Creator and controller of the intent.
- **Moderator:** Authorized staff or founder handling safety reports.
- **Blocked user:** User blocked by or blocking another participant.

## Field Visibility Matrix

| Data | Anonymous | Recipient | Confirmer | Respondent | Accepted | Broadcaster | Moderator |
|---|---:|---:|---:|---:|---:|---:|---:|
| Intent public statement | Conditional | Yes | Yes | Yes | Yes | Yes | Yes |
| Intent primitive/category | Conditional | Yes | Yes | Yes | Yes | Yes | Yes |
| Approximate area | Conditional | If eligible | Yes | Yes | Yes | Yes | Yes |
| Exact location | No | No | No | No | If explicitly released | Yes | When required |
| Public timing and expiry | Conditional | Yes | Yes | Yes | Yes | Yes | Yes |
| Price/quantity/requirements | Conditional | Yes | Yes | Yes | Yes | Yes | Yes |
| Origin group name | No | No | No | No | No by default | Optional private label | When reported |
| Origin group membership | No | No | No | No | No | No | When legally/safely required |
| Unique confirmation count | Yes if shared | Yes | Yes | Yes | Yes | Yes | Yes |
| Confirmer identities | No | No | Own only | No | No | Aggregate only | When reported |
| Broadcaster display name | Optional first name | Based on reach | Based on reach | Yes | Yes | Own | Yes |
| Broadcaster verification | Summary | Summary | Summary | Summary | Detail as needed | Own | Yes |
| Broadcaster contact details | No | No | No | No | If explicitly released | Own | When required |
| Respondent response text | No | No | No | Own | Own | Yes | When reported |
| Respondent profile | No | No | No | Own | Shared match view | Yes | When reported |
| Temporary messages | No | No | No | Only after acceptance | Yes | Yes | When reported |
| Reliability summary | No | Contextual summary | Contextual summary | Contextual summary | Contextual summary | Own | Yes |
| Raw feedback | No | No | No | Own submitted | Own submitted | Relevant received summary | Yes |
| Reports and reporter identity | No | No | No | Own reports only | Own reports only | Own reports only | Yes |

`Conditional` means the broadcaster explicitly enabled link visibility for that field. Public link pages must use a dedicated privacy-safe projection, never the full intent row.

## Action Permissions

| Action | Anonymous | Recipient | Confirmer | Respondent | Accepted | Broadcaster | Moderator |
|---|---:|---:|---:|---:|---:|---:|---:|
| View public preview | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| Confirm origin support | No | If valid link | Yes once | No duplicate | No duplicate | No self-confirmation | No |
| Submit response | No | If eligible | If eligible | Once per active response | Already matched | No self-response | No |
| Edit response | No | No | No | Before decision | No | No | No |
| Withdraw response | No | No | No | Before acceptance | Leave match via safety flow | No | No |
| Accept/decline response | No | No | No | No | No | Yes | No |
| Message in temporary room | No | No | No | No until accepted | Yes | Yes | Read only when authorized |
| Edit intent | No | No | No | No | No | Yes | Restrict only |
| Expand/reduce reach | No | No | No | No | No | Yes | Restrict only |
| Resolve/withdraw intent | No | No | No | No | Confirm completion | Yes | Restrict only |
| Block user | No | Yes | Yes | Yes | Yes | Yes | Administrative block |
| Report content/user | No | Yes | Yes | Yes | Yes | Yes | Manage reports |
| Delete intent permanently | No | No | No | No | No | Soft-delete request | Per retention policy |

## Lifecycle Rules

### Draft

Only the broadcaster may read or modify the intent.

### Live

Eligible recipients may read only the projection permitted by reach and privacy settings. The broadcaster may edit, reduce reach, expand reach with confirmation, withdraw, or resolve.

### Response Pending

The broadcaster and respondent may see the response. Other recipients and origin confirmers cannot. The respondent cannot see competing responses.

### Matched

The broadcaster and accepted participant receive temporary-room access and only the sensitive details explicitly released for the match.

### Resolved, Expired, Or Withdrawn

No new responses are allowed. Existing participants retain limited history. Public and feed discovery cease immediately. Safety evidence follows the retention policy.

### Reported

The system may restrict discovery, responses, messaging, or the account while preserving evidence. Reporters do not receive private enforcement details.

## Block Semantics

When either user blocks the other:

- Neither appears in the other's future recommendations.
- Neither can create new responses or messages to the other.
- Existing temporary-room messaging stops immediately.
- Public links reveal no block relationship.
- Existing safety evidence remains available to moderators.

## Enforcement Requirements

- RLS and server-owned functions must enforce this matrix.
- Client-side filtering is an additional presentation layer, not authorization.
- Every role/state combination requires positive and negative automated tests.
- Service-role operations must run only in trusted server environments.
- Sensitive audit access must be logged.

## Change Log

| Date | Change |
|---|---|
| 2026-08-24 | Defined role, field, action, lifecycle, and block permissions |
