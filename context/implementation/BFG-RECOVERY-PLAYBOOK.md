# BFG RECOVERY PLAYBOOK

Status: `READY FOR OPERATIONS; PLATFORM CAPABILITIES NOT VERIFIED`
Owner: BFG Owner/Admin
Canonical services: Vercel `masjaaks-projects/blessing-for-good`; Convex
Development `content-snake-214`; Convex Production `clean-eel-522`

## Recovery Principles

- Protect people and data before restoring availability.
- Preserve evidence before changing state.
- Use the last known good Git commit and Vercel deployment.
- Do not assume a code rollback reverses Convex data already written.
- Do not create dummy business records for diagnosis.
- Do not claim backups, point-in-time restore, Storage recovery, RPO, or RTO
  until the platform capability and access path are directly verified.
- Keep customer data, proof files, secrets, and access codes out of reports.

## Current Recovery Inventory

| Area                    | Current understanding                                                                                                                                  | Readiness        |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------- |
| Git                     | Source and context are protected by the canonical Git repository and `main`.                                                                           | READY            |
| Vercel                  | Production deployment history and aliases are observable through the authenticated CLI; prior deployment can be identified for rollback.               | READY            |
| Convex functions/schema | Canonical Production is `clean-eel-522`; local deterministic tests pass, but the non-interactive `convex:check` could not access the selected project. | WATCH            |
| Convex tables           | Business data is hosted in Convex application tables. Data restore capability is not independently verified.                                           | NOT VERIFIED     |
| Convex Storage          | Covers, gallery, and proof references may point to Convex Storage. Asset recovery/export capability is not independently verified.                     | NOT VERIFIED     |
| Secrets                 | Environment values are not stored in context. Rotation/revocation must follow the provider’s operational controls.                                     | READY TO RESPOND |

No Backup/Restore Admin UI is part of Phase 09.

## Severity Definitions

| Severity | Definition                                                                                                                      |
| -------- | ------------------------------------------------------------------------------------------------------------------------------- |
| SEV-0    | Security compromise, sensitive-data exposure, auth bypass, privilege escalation, cross-customer access, or financial corruption |
| SEV-1    | Production unavailable or a critical business flow completely broken                                                            |
| SEV-2    | Major workflow degraded with a safe workaround                                                                                  |
| SEV-3    | Non-critical defect or responsive issue                                                                                         |
| SEV-4    | Cosmetic/minor UX issue                                                                                                         |

Financial corruption is `SEV-0` when sensitive or material; otherwise it is at
least `SEV-1` until impact is understood.

## First Actions for Every Incident

1. Confirm impact and timestamp.
2. Identify affected users and domain without copying private records.
3. Stop further damage if needed: pause the affected operational action or
   release; do not perform speculative mutations.
4. Preserve deployment IDs, commit SHAs, safe log references, and screenshots.
5. Identify the last known good source/deployment and whether Convex data was
   changed.
6. Fix or roll back through the safest reversible path.
7. Verify the affected boundary and critical invariants.
8. Document root cause, scope, action, evidence, and follow-up.

## Production Service Outage

- Confirm canonical-domain status from an independent network path.
- Inspect the latest Vercel deployment state, build status, aliases, and recent
  error logs.
- Compare the current deployment with the last known good deployment.
- If the failure is web-only and rollback is safe, promote the last known good
  Vercel deployment or revert through Git.
- Verify public routes, Clerk sign-in, Admin denial, Customer shell, and the
  critical smoke matrix.
- If Convex is implicated, do not repeatedly retry mutations; preserve the
  error and escalate with the canonical deployment identifiers.

## Bad Vercel Deploy

- Record deployment ID, source commit, target, aliases, build state, and error
  window.
- Check whether the deployment changed only web code or also invoked the
  configured Convex deploy step.
- Roll back to the last known good Vercel deployment when no data migration is
  involved.
- If Git revert is needed, use the normal `main` release path and run the full
  relevant regression before redeploying.
- Re-run live route/auth smoke after the rollback.

## Bad Convex Function Deploy

- Classify as `SEV-1` if a critical flow is unavailable; `SEV-0` if it exposes
  data, bypasses auth, or corrupts financial state.
- Stop further affected mutations and preserve the deployment/error evidence.
- Determine whether schema/function code changed and whether any writes
  occurred after the deploy.
- Prefer a backward-safe corrective function deploy. Do not assume source
  rollback repairs data.
- Re-run deterministic auth, ownership, financial, Secret Catalog, and affected
  business-flow tests before reopening the operation.

## Application Regression

- Reproduce with a deterministic fixture or read-only route.
- Identify the source contract, state machine, and blast radius.
- Do not patch the visible symptom in multiple callers when a shared guard is
  the source of truth.
- Use Red → Green → Refactor, rendered QA for visual changes, and post-deploy
  smoke.

## Data Corruption Suspicion

- Freeze destructive follow-up actions and manual corrections.
- Preserve affected IDs only in restricted incident records; use redacted
  references in context.
- Compare append-only audit/ledger history and current projections.
- Determine whether the issue is a duplicate consequence, invalid transition,
  ownership leak, or display/projection defect.
- Obtain Owner approval for any corrective mutation. Every correction must be
  auditable and source-backed.

## Secret Compromise

- Classify `SEV-0`.
- Do not print or copy the exposed value.
- Identify category and exposure location only.
- Revoke/rotate the affected Clerk, Convex, Vercel, storage, or integration
  credential through the provider’s approved control.
- Review access, audit, deployment, and repository history for use of the
  credential.
- Remove exposure from current tracked files with an approved change. Do not
  rewrite Git history without explicit approval.
- Re-run the secret scan and security checklist.

## Auth / Privacy Incident

For an auth bypass, privilege escalation, Secret Catalog leak, or cross-customer
access:

- classify `SEV-0`;
- stop the affected route/mutation if safe;
- preserve actor, timestamp, deployment, and safe audit references;
- verify affected permission and ownership guards;
- rotate/revoke sessions or credentials as appropriate;
- assess minimum necessary user notification with the Owner;
- do not continue normal maintenance until containment and verification are
  complete.

## Storage / Media Incident

- Determine whether the issue affects cover/gallery media or private payment /
  deposit proof.
- Stop unsafe upload, URL, or exposure paths.
- Verify storage ownership, MIME/type/size checks, and URL generation.
- Do not expose proof URLs or copy media into an incident report.
- Record Convex Storage recovery as `NOT VERIFIED` until directly tested through
  an approved platform procedure.

## Rollback Readiness

Before a risky release, record:

- last known good Git SHA;
- last known good Vercel deployment ID and aliases;
- whether Convex functions/schema were deployed;
- whether a data migration or financial mutation was possible;
- exact post-rollback smoke checks.

The current known-good Production anchor is deployment
`dpl_8tZaUD7jxYxg96N6NhYZzCjmUwtU`, source commit `85908d9`, with Vercel state
`READY`. This is a rollback reference, not a claim that Convex data can be
rolled back with it.

## Incident Record

Create a restricted incident record with:

```text
Incident ID
Severity
Opened / contained / resolved timestamps
Affected domain and minimum necessary scope
Last known good commit/deployment
Observed evidence
Containment
Fix or rollback
Verification
Root cause
Follow-up owner and due date
```

Never include raw secrets, access codes, payment evidence, or unnecessary
customer-identifying data.

## Phase 09.1 Recovery Assurance Addendum — 2026-08-22

Status: `DOCUMENTED_NOT_DRILLED / BLOCKED_BY_ACCOUNT_ACCESS`.

The official Convex backup/restore documentation was reviewed during Phase
09.1. It describes consistent manual backups/export, optional inclusion of
files, retention behavior, and restore/import procedures that vary by current
plan. It also makes clear that code/configuration/environment values and
scheduled jobs are not restored as application data. The current local Convex
CLI session is authenticated to a different team and cannot access BFG
Production `clean-eel-522`, so the actual plan, backup cadence, retention,
usage limits, and configured backup inventory remain **NOT VERIFIED**. No
Production restore was attempted.

Official references:

- [Convex backup and restore](https://docs.convex.dev/database/backup-restore)
- [Convex production limits](https://docs.convex.dev/production/state/limits)
- [Convex usage limits](https://docs.convex.dev/production/usage-limits)

### What Each Rollback Restores

| Mechanism                              | Restores                                                                       | Does not restore                                                          |
| -------------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| Git revert / known-good commit         | Application source and context                                                 | Convex table rows, Convex Storage files, external provider state          |
| Vercel deployment rollback             | Next.js/web deployment and aliases                                             | Convex data, Storage files, financial consequences, provider sessions     |
| Convex function/schema deploy rollback | Function/schema code according to the supported deployment path                | Already-written business data, Storage objects, external side effects     |
| Convex backup/export restore           | Only the data/files included by the selected supported backup/export procedure | Code/config/env/scheduled jobs; exact scope requires account verification |

### RPO / RTO

```text
DATABASE RPO: NOT VERIFIED
STORAGE RPO: NOT VERIFIED
DATABASE RTO: NOT VERIFIED
STORAGE RTO: NOT VERIFIED
DRILL: DOCUMENTED_NOT_DRILLED
```

Do not state `RPO=0` or a minute-level RTO. A supported numeric target can be
set only after Owner-authorized access confirms backup cadence/retention and a
safe non-Production restore drill measures data validation and elapsed time.

### Required Safe Drill

1. Confirm the authorized BFG Convex team/project and current tier.
2. Create or select an approved non-Production target; do not overwrite live
   Production.
3. Take/export a consistent snapshot with approved file scope.
4. Restore/import to the non-Production target.
5. Validate schema, representative non-sensitive invariants, references, and
   file availability without copying customer data into reports.
6. Record elapsed time, gaps, retention, operator steps, and rollback limits.
7. Set RPO/RTO only from that evidence and update this playbook.

The Phase 09.1 load test did not create data and does not alter this recovery
status.
