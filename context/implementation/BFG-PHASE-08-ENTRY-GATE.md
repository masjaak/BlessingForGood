# BFG PHASE 08 ENTRY GATE

Status: **PASS FOR ENTRY PREPARATION ONLY**
Implementation status: **NOT STARTED**
Reconciled: 2026-08-15

This gate says the Phase 07.1 baseline is safe to use as the starting point for
a separately approved Phase 08 Source Contract. It does not authorize any
Phase 08 implementation in this task.

## Current Stable Baseline

- HEAD/origin baseline: `d9aad899a440592504117c6b57c02cd15bdec355`.
- Convex Development: `content-snake-214`.
- Convex Production: `clean-eel-522`.
- Vercel Production: `dpl_D3MCiwvhvA2WZorUg7HLMFG6SnBs` (`READY`).
- Canonical domain: `https://www.blessingforgood.com`.
- Tests: Vitest `194/194`, Convex `94/94`, Playwright `180/180`; TypeScript,
  ESLint, format, build PASS.
- Supplied real-flow evidence: admission, product/media/projection, Secret
  Catalog access/revoke, order, invoice/Tagihan, notification, and ownership
  isolation PASS.

## Unfinished Source Requirements

These are classified, not silently omitted:

- approved bulk catalog/order import with explicit mapping, validation,
  duplicate, rollback, and audit policy;
- multiple media/gallery and external preview metadata contract;
- advanced analytics beyond the current bounded report;
- full backup/restore operating procedure beyond current bounded export;
- cross-domain Admin search/index contract.

The current minimum versions of reporting, Excel-compatible export, structured
content, settings, event-backed Notifications/Inbox, multi-Admin access, and
activity/audit are already in the current baseline and are not reopened as
generic Phase 08 work.

## Candidate Scope

Candidate details and priorities are in
[`BFG-PHASE-08-CANDIDATES.md`](BFG-PHASE-08-CANDIDATES.md). No candidate has
been implemented by this task.

## Dependencies

- An approved Phase 08 Source Contract with source rows and explicit non-goals.
- Existing Clerk/Convex/Vercel environment separation.
- Security and financial invariant indexes in this directory.
- The current state-machine and Admin ↔ Customer matrices.
- A decision on import/media/search/analytics contracts before schema changes.
- Designated QA identities and intentional test records where real UAT needs
  populated states; never fabricate Production records.

## Explicit Non-goals

- No payment gateway or automatic bank settlement.
- No official or unofficial WhatsApp automation/blasts.
- No full social chat.
- No replacement of Clerk/Convex authority.
- No role/authentication weakening.
- No financial ledger rewrite or manual settlement shortcut.
- No Phase 08 UI, schema, mutation, route, or migration in this task.
- No aesthetic rebuild of a correct Phase 07.1 system.

## Security Invariants

Clerk remains identity authority; `appUsers` remains BFG admission/role/status/
ownership authority; Convex guards every sensitive query/mutation; missing and
suspended users fail closed; Secret Catalog codes remain digest-only,
expiring, revocable, rate-limited, and scoped; customer projections remain
owned; notification/Inbox rows remain recipient-scoped; file proofs remain
private; audit remains append-only; no dummy Production data is allowed.

## Financial Invariants

Integer IDR, immutable commercial snapshots, approved-payment-only settlement,
append-only deposit ledger, no negative available balance, atomic Ready Stock
reservation, exception adjustments without rewriting history, separate refund
obligation/payout, partial-safe payout retry, and no overpayment remain locked.

## Visual Invariants

Use canonical Logo-1 and approved mascot assets; preserve Admin one-row shell,
customer desktop header, mobile logo-only header, five-link bottom nav,
page-aware skeleton geometry, shared buttons/frames/icons, Indonesian-first
copy, and direct mockup-to-render comparison.

## Required Tests for Any Future Phase 08 Work

- red regression for each new state/guard/consequence;
- Convex authorization, ownership, invalid-transition, and projection tests;
- component/action tests for loading, error, success, and disabled states;
- route reachability and responsive Playwright checks;
- rendered mockup comparison where visual source exists;
- full current baseline with no count or gate regression;
- real flow acceptance using intentional records, or explicit
  `BLOCKED_BY_DATA`/`BLOCKED_EXTERNAL` evidence.

## Required Production Acceptance

For any candidate that changes product behavior:

`TDD → local rendered QA → full regression → main → Vercel/Convex Production
→ real role-scoped flow → Admin projection → customer projection → audit and
notification check → context update`.

Preview-only delivery is not closure. A deployment without real acceptance is
`PRODUCTION_DEPLOYED`, not `REAL_PRODUCTION_VERIFIED`.

## Known Data Blockers

Future candidate UAT may require an intentionally created catalog/product,
customer, invoice, or payout state. If the required record does not naturally
exist, stop at `BLOCKED_BY_DATA`; do not seed dummy Production data. External
Clerk MFA/identity configuration remains `BLOCKED_EXTERNAL` when it cannot be
verified by the available operator session.

## Gate Result

`PHASE_08_ENTRY_GATE: PASS` for source-controlled entry preparation.
`PHASE_08_IMPLEMENTATION: NOT_STARTED`.
