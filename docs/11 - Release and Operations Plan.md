# Nearcast Release And Operations Guide

## Document Control

- **Status:** Approved pre-beta operations baseline
- **Last updated:** 2026-08-24
- **Governed by:** [Nearcast Documentation Reference](./00 - Start Here - Nearcast Project Reference.md)

## Environments

### Local

- Local Supabase services and database.
- Seeded synthetic users and intents.
- Mock notification delivery.
- Development analytics disabled or isolated.

### Staging

- Independent Supabase project.
- Development iOS and Android bundle identifiers.
- Real push delivery to registered test devices.
- Isolated PostHog and Sentry environments.
- No production personal data.

### Production

- Independent Supabase project and secrets.
- Production app identifiers and signing credentials.
- Least-privilege access for founder operations.
- Automated backups, monitoring, and alerting.

Data must never be copied from production into local or staging without irreversible anonymization.

## Source Control And Branching

- `main` must remain releasable.
- Use short-lived feature branches.
- Require passing CI before merge.
- Commit lockfiles and migration files.
- Tag mobile releases using semantic versions.
- Do not amend or rewrite published release history.

## Database Change Process

1. Create a versioned migration.
2. Add or update RLS and database tests in the same change.
3. Apply from a clean local database.
4. Apply to staging and run integration tests.
5. Review query plans for matching and feed changes.
6. Back up production before destructive or irreversible migrations.
7. Deploy additive schema before dependent client code.
8. Remove old schema only after all supported clients stop using it.

Use expand-and-contract migrations for client compatibility.

## Mobile Release Process

1. Update version and release notes.
2. Pass CI and staging E2E tests.
3. Build signed applications with EAS.
4. Distribute to internal testing.
5. Complete manual privacy, notification, deep-link, and account-deletion smoke tests.
6. Release to closed alpha cohort.
7. Monitor crashes, API errors, RLS denials, notification failures, reports, and key funnel health.
8. Expand cohort only after the observation window passes.

Use over-the-air updates only for compatible JavaScript and asset changes. Native dependency, permission, entitlement, or configuration changes require a store build.

## Feature Flags

Use flags for:

- New reach levels.
- New intent primitives or fields.
- Ranking changes.
- Phone verification.
- Media attachments.
- Experimental trust evidence.

Flags must have owner, purpose, default, target cohort, success metric, and removal date. Safety controls may not be disabled by client-controlled flags.

## Observability

### Product

- Intent publication and resolution funnel.
- Matching response and acceptance rates.
- Notification delivery and open-to-action rates.
- Blocks, reports, and restrictions.

### Application

- Mobile crashes and unhandled errors.
- Edge Function error rate and latency.
- Database query latency and lock contention.
- Realtime connection and message usage.
- Queue depth and retry count.
- Authentication and OTP errors.

### Security

- Repeated authorization denial patterns.
- Rate-limit activation.
- Suspicious link enumeration.
- Privileged moderator access.
- Unexpected exact-location or contact-field access.

## Alert Levels

| Level | Trigger | Response |
|---|---|---|
| Critical | Privacy disclosure, account takeover, data corruption | Disable affected feature, preserve evidence, notify affected users as required |
| High | Core loop unavailable, reports failing, widespread auth failure | Pause rollout and restore service |
| Medium | Elevated errors, delayed notifications, matching degradation | Investigate within the same working day |
| Low | Minor regression or isolated failure | Add to prioritized backlog |

## Incident Response

1. Confirm and classify severity.
2. Stop further harm through flag, policy, credential rotation, or rollback.
3. Preserve relevant logs and audit records.
4. Restore safe service.
5. Determine affected users and notification obligations.
6. Document timeline, root cause, and corrective actions.
7. Add regression tests before closing.

Do not delete evidence during an active safety or security incident.

## Backup And Recovery

- Enable managed daily backups before alpha data is valuable.
- Define initial recovery objectives as RPO 24 hours and RTO 8 hours for closed alpha.
- Test restoration into staging before inviting external users.
- Document storage-file recovery separately because database backups may not include stored objects.
- Export critical configuration and secrets inventory securely.

## Moderation Operations

- Review severe reports immediately when notified.
- Review other alpha reports within one working day.
- Use documented reason codes and actions.
- Never access private messages or exact location without a report, support request, or documented operational need.
- Record every privileged access and enforcement decision.

## Cost Controls

- Configure Supabase spend limits and usage alerts.
- Rate-limit authentication and notification abuse.
- Monitor Realtime peak connections and message throughput.
- Cap image size and storage retention.
- Sample nonessential analytics only after volume warrants it.
- Avoid adding paid search, chat, or AI services before a validated need.

## Operational Runbooks Required Before Public Beta

- Authentication outage.
- Push-notification failure.
- Database degradation.
- Realtime failure.
- Privacy incident.
- Harmful-content report.
- Account recovery and deletion.
- Lost signing credential or leaked secret.

## Change Log

| Date | Change |
|---|---|
| 2026-08-24 | Defined environments, migrations, releases, observability, incidents, recovery, and moderation operations |
