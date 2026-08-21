# BFG Monthly Maintenance Report

## Month

2026-08 — initial Phase 09 baseline, reviewed 2026-08-22 (Asia/Jakarta)

## Production Baseline

- Phase 08: `COMPLETE`; Phase 09: `ACTIVE — OPERATIONS & MAINTENANCE`.
- Starting source commit: `85908d912dc9a071eac67a27e7c81bf9ab4bb247`.
- Production remains on the same source/deployment anchor; no deployment or
  business-data mutation was made during this review.
- `origin/main` matched the starting commit at review start.
- Product mode: `MAINTENANCE`; feature development is paused unless explicitly
  approved.

## Security

Security critical findings: `0` in the reviewed source tree. High-confidence
tracked-secret scan: `0`. No raw code, token, credential, payment proof, or
private customer data was copied into this report.

## Dependencies

`npm audit --omit=dev` initially identified one high transitive `nanoid` advisory
(`3.3.17`). The lockfile was patched to `3.3.18`; the audit then reported
`0 low / 0 moderate / 0 high / 0 critical`. No major upgrade was taken. The
lockfile patch is not yet in Production because this baseline pass did not
perform a release.

## Auth / RBAC

`GREEN` — Clerk remains canonical; appUser status/role/permission is the BFG
authority; deterministic auth, suspension, Owner-only, Admin, and ownership
tests pass. Live `/admin` redirects signed-out traffic to Clerk with a safe
redirect target. Authenticated live role UAT remains controlled and is not
claimed by an unauthenticated HTTP check.

## Secret Catalog

`GREEN` — keyed digest and pepper boundaries, expiry, revoke, grant, scoped
session, rate limit, plaintext non-storage, and non-disclosure assertions are
covered by the Convex suite. No Production unlock or grant mutation was used.

## Financial Invariants

`GREEN` — integer IDR, invoice snapshots, append-only deposit consequences,
payment idempotency, refund/payout separation, and Ready Stock reservation
invariants remain covered by deterministic tests. No financial Production
record was created or altered.

## Business Flow Smoke

`GREEN` for deterministic/local evidence: Vitest `241/241`, Convex `111/111`,
and Playwright `264/264`. The matrix covers Auth, Join, Books, Secret Catalog,
Orders, Invoices, Payments, Batch, Activity, Customer/Admin boundaries, and
configured responsive widths. Production mutation-heavy UAT remains data-limited
by policy.

## Responsive

`GREEN` for current deterministic evidence at customer widths `375/390/430/768/1440`
and Admin widths `768/834/1024/1280/1440`. No unexpected body horizontal
overflow was reported; intentional internal table scrolling remains allowed.

## Vercel

`GREEN` — authenticated CLI verified project `masjaaks-projects/blessing-for-good`,
canonical aliases, and deployment `dpl_8tZaUD7jxYxg96N6NhYZzCjmUwtU` as
`READY` for source commit `85908d9`. The last-hour Production error query
returned zero entries. The Vercel connector itself returned a scope `403`, so
CLI is the evidence path for this review.

## Convex

`WATCH` — canonical Development `content-snake-214` and Production
`clean-eel-522` identifiers are confirmed in repository/Vercel configuration;
local Convex tests are `111/111`. The required `npm run convex:check` was
attempted but could not access the selected project in the non-interactive
environment. No alternate project was selected and no Production data was
mutated.

## Errors

Vercel CLI returned zero error entries for the current Production deployment in
the last hour. Full historical Vercel/Convex error history and client-side
telemetry are not claimed where the available access path does not expose them.
The local Next advisory about the mascot image is recorded as low-priority debt,
not an active outage.

## Audit

`GREEN` for deterministic audit assertions and review scope. Monthly review
targets role changes, invitations, Secret Catalog access, payment decisions,
refunds, deposit adjustments, and sensitive Book/Catalog actions. Direct
Production audit-record inspection was not performed because read-only Convex
CLI access was unavailable.

## Recovery Readiness

`READY WITH WATCH ITEMS` — the recovery procedure is documented in
[`BFG-RECOVERY-PLAYBOOK.md`](../implementation/BFG-RECOVERY-PLAYBOOK.md).
Git and Vercel rollback references are available. Convex table/Storage backup,
restore, RPO, and RTO capabilities remain explicitly `NOT VERIFIED`.

## Technical Debt

New entries: Convex CLI access, populated cover UAT, platform recovery
verification, Vercel connector scope, a low-priority Next warning, and the
user-data-dependent Bulk Import pilot. See
[`BFG-TECHNICAL-DEBT.md`](../implementation/BFG-TECHNICAL-DEBT.md).

## Incidents

No incident opened. No known active P0/P1/P2 issue.

## Changes Made

- Added the Phase 09 operations model, security checklist, recovery playbook,
  technical-debt register, and this report.
- Updated canonical source/status/decision context.
- Applied the minimal `nanoid` lockfile security patch.
- Changed no Product business behavior and did not deploy or mutate Production.

## Deferred

- Populated Gallery UAT.
- Populated External Preview UAT.
- Real approved Settings values.
- Editable Production Batch path.
- Safe invoice-cancellation path.
- Safe deposit-allocation path.
- Bulk Import Production CSV pilot.
- Direct Convex CLI health evidence and platform backup/restore verification.

## Final Health

`WATCH` — no known active P0/P1/P2 issue; source, local regression, public
domain, and Vercel deployment are healthy. Watch items are the unverified
Convex CLI/platform recovery evidence, legitimate data-limited UAT, and the
pending Production release of the dependency patch.
