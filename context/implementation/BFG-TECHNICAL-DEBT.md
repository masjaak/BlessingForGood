# BFG TECHNICAL DEBT REGISTER

This register records observed operational uncertainty or maintenance risk. An
entry is not automatic implementation work. Status values are `OBSERVE`,
`PLAN`, `FIX NEXT MAINTENANCE`, or `REQUIRES NEW PROJECT`.

## Closure update — 2026-08-26

The historical eight cover assertion failures are reconciled in the current
Playwright contract (`284/284`). The remaining cover observation is only a
legitimate populated-cover visual UAT opportunity; it is not an active test or
product failure.

| ID        | Area                  | Observation                                                                                                                 | Risk / business impact                                                                                          | Urgency           | Evidence                                                                                  | Recommended future action                                                                                                        | Status  |
| --------- | --------------------- | --------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ----------------- | ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------- |
| TD-09-001 | Convex operations     | `npm run convex:check` cannot access the selected project in the current non-interactive environment.                       | Convex health/codegen evidence is incomplete; accidental project switching is a larger risk than the check gap. | P2 operational    | Command returned selected-project access error and refused non-interactive configuration. | Verify the canonical operator auth/context for `content-snake-214` without selecting another deployment or exposing keys.        | PLAN    |
| TD-09-002 | Cover UAT             | A populated live cover still needs a legitimate stored cover for visual content acceptance.                                  | Populated cover/preview UAT remains data-limited; the current presentation and fallback contract is green.       | P3                | Historical raw-image assertions reconciled; full current Playwright passes `284/284`.    | Run one approved live populated-cover check when client data exists; do not fabricate an asset.                              | OBSERVE |
| TD-09-003 | Recovery              | Convex table/Storage backup, restore, RPO, and RTO capabilities are not directly verified.                                  | Recovery guarantees cannot currently be stated.                                                                 | P1 readiness      | Platform capability was not independently verified in this pass.                          | Owner-approved platform verification and documented evidence; no Admin UI by default.                                            | PLAN    |
| TD-09-004 | Observability access  | Vercel CLI evidence works, but the configured Vercel connector returned scope `403`.                                        | Redundant runtime-log access is unavailable through that connector.                                             | P3                | CLI authenticated as `masjaak`; connector scope mismatch.                                 | Re-authenticate connector only if operationally useful; retain CLI as the current path.                                          | OBSERVE |
| TD-09-005 | Next.js build warning | Local build/E2E emits the framework advisory that the mascot image uses `loading="eager"` and could use priority semantics. | Low performance/observability noise; no functional defect demonstrated.                                         | P4                | Warning appears in local Next development/build output.                                   | Revisit only with measured performance evidence or a user-visible regression.                                                    | OBSERVE |
| TD-09-006 | Bulk Import UAT       | Real 3–5-book Production pilot remains deferred by user data.                                                               | Persistence, audit, draft/inactive safety, and customer non-leakage remain unclaimed in real data.              | P2 data readiness | Existing Phase 08 contract and current maintenance playbook.                              | Run the approved pilot when legitimate CSV/product data is supplied; no fabricated records.                                      | OBSERVE |

## Excluded from Debt

Advanced Analytics, Backup / Restore Admin UI, and Cross-domain Admin Search are
`OPTIONAL_FUTURE` capabilities, not bugs or maintenance debt. New roles,
Catalog semantics, Batch lifecycle, financial workflows, payment gateway,
WhatsApp automation, Customer navigation, Admin IA, and visual redesign require
new approved requirements.
