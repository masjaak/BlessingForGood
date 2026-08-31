# BFG Stable Staging QA Plan

> **SUPERSEDED for Production V1 (2026-08-11).** Retained as historical
> planning context only. Production V1 uses rendered local/Production QA and
> `main` → Vercel Production; staging is not a release gate.

## Objective

Provide the single integration gate for Phase 04.1 and Phase 05.1 after
implementation and local validation are complete. This plan is runtime
evidence for staging; it does not configure staging infrastructure or approve
Production.

## Entry criteria

- Phase 04.1 implementation is present on the approved integration state.
- `npm run check` passes with zero lint errors and warnings.
- `npm run convex:test` passes.
- `git diff --check` passes.
- Staging uses one stable Vercel deployment and one stable Convex backend.
- Clerk is configured for the intended staging identity environment.
- Staging starts with zero unknown business records.
- QA identities and test data are explicitly identified without recording
  passwords, tokens, emails, invitation URLs, or provider IDs.

## Environment topology

```text
feat/*  →  develop  →  stable staging  →  approved release  →  main/Production
```

Staging must use:

- one stable Vercel deployment;
- one stable Convex staging backend;
- Clerk configuration appropriate for staging;
- no Production credentials or shared Production data.

Branch-specific Preview deployments are optional diagnostics only.

## Authentication QA

- Signed-out public routes remain usable.
- Clerk Development/staging sign-in establishes a session.
- Convex accepts the Clerk JWT.
- `ctx.auth.getUserIdentity()` succeeds.
- The first authenticated request provisions one `appUser`.
- Repeated sign-in does not create duplicates.
- Sign-out and subsequent sign-in work.
- Real invitation acceptance is verified and the new user defaults to
  `customer`.
- Customer can submit an eligible manual payment confirmation and see its
  submitted, under-review, approved, or rejected state.

## Authorization QA

- Owner can use approved operational and user-management routes.
- Customer cannot use admin or owner-only actions.
- Admin can use operational routes, Users read/status operations, Settings,
  and Audit; role/invitation/revocation and ownership-critical actions remain
  Owner-only.
- Suspension denies protected BFG queries and mutations.
- Reactivation restores access.
- Self-suspension and removal of the last active owner are denied.
- Negative checks exercise backend boundaries, not hidden navigation only.

## Ownership QA

Using two authenticated customers:

- Customer B cannot read or mutate Customer A’s catalog grant.
- Customer B cannot access Customer A’s orders, tracking, invoices, deposits,
  profile, or addresses.
- Direct URL and direct backend access attempts are denied.
- Ownership is derived server-side from the authenticated `appUser`.
- Catalog access codes are separate from Clerk authentication and raw codes are
  never stored.
- Customer B cannot read, update, approve, reject, or resubmit Customer A's
  payment confirmation.

## Operational QA

Verify approved admin/owner workflows for:

- catalog management;
- batch assignment;
- shipment and fulfillment tracking;
- invoice creation, issue, and void;
- deposit credit, allocation, release, and eligible reversal.
- payment confirmation queue, review, approval, rejection, and history;
- rejected-payment resubmission and suspended-user denial.

Verify audit events for privileged actions.

## Financial invariant QA

- Monetary values remain integer IDR.
- Invoice snapshots and totals remain server-authoritative.
- Deposit ledger operations remain append-only.
- Available and reserved balances remain consistent.
- Invalid transitions and unauthorized mutations are rejected.
- Approved external payment plus allocated deposit cannot exceed the invoice
  total; stale approvals are rejected without partial writes.
- Approval updates confirmation, invoice payment projection, and audit history
  atomically; rejected evidence remains available.
- No refund, withdrawal, or unapproved policy is invented during QA.

## Realtime QA

- Admin/owner tracking changes appear for the authorized customer context.
- Fulfillment changes preserve history and transition invariants.
- Deposit/invoice updates propagate through Convex realtime behavior.
- Payment submission/review and invoice payment-state updates propagate to the
  authorized browser contexts.
- Separate browser contexts do not receive another customer’s data.

## Responsive/browser QA

Run the supported automated and manual smoke matrix at:

- 375×812;
- 768×1024;
- 1024×768;
- 1440×900.

Verify public routes, signed-out redirects, authenticated owner/admin/customer
flows, protected data boundaries, console/page errors, and responsive layout.
Playwright auth storage must remain uncommitted.

## Security QA

- No anonymous Preview identity or admin access code remains active.
- Clerk failure fails closed rather than entering demo mode.
- Server-side auth, role, permission, ownership, and suspension checks execute.
- No secret, JWT, cookie, password, invitation URL, or provider ID enters logs,
  screenshots, artifacts, or Git.
- Production remains outside the staging test path.

## Phase 05.1 deferred backlog

These checks are intentionally not required on transient branch Preview:

- real Clerk Development/staging sign-in and Clerk JWT → Convex verification;
- owner/customer provisioning, admin promotion, owner-only authorization, and
  suspension during payment operations;
- invitation acceptance followed by first payment confirmation request;
- token-only catalog session followed by Customer A/B payment and invoice
  isolation; token-only browse still does not create customer ownership;
- payment submission, admin queue review, approval/rejection, audit history,
  rejection/resubmission, stale approval, and deposit-plus-transfer totals;
- browser/responsive and authenticated Playwright coverage;
- runtime logs, guarded cleanup, and zero-data verification.

## Data cleanup

- Tag every QA-created business record before creation.
- Delete only explicitly tagged staging QA business records.
- Do not truncate tables globally.
- Do not delete unknown, manual, real-user, or Production data.
- Test Clerk identities may remain only when documented as staging QA users and
  detached from business records.
- Verify business tables return to the intended zero-data state.

## Exit criteria

- Every authentication, authorization, ownership, operational, financial,
  realtime, browser, security, and cleanup check above has pass evidence.
- Expected negative authorization errors are distinguished from real failures.
- Staging runtime logs contain no unexpected errors or secrets.
- Business QA data is cleaned and zero-data verification is recorded.
- Local validation remains green after any legitimate fixes.
- Documentation records exact safe evidence and remaining limitations.

## Production handoff criteria

Production handoff requires:

- staging exit criteria complete;
- explicit Production architecture and credential review;
- approved Production Clerk and Convex configuration;
- approved release from `main`;
- separate Production data and zero-data verification;
- explicit approval to deploy.

Phase 04.2 and Production work remain out of scope until this staging gate is
approved.
