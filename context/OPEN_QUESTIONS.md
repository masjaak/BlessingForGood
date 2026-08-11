# Open Questions

## Production V1 release blockers

- [PRODUCTION VISUAL BLOCKER] Local Clerk reports that publishable and secret
  keys do not match the same instance; after owner sign-in, canonical Convex
  provisioning remains at `Menyiapkan akun BFG…`. Restore one matching Clerk
  configuration and this operator's access to canonical Development
  `content-snake-214`, then rerun authenticated customer/admin screenshots. Do
  not switch Convex project or add demo data.

- [PRODUCTION BLOCKER] The linked Vercel project has zero Production environment
  variables. Complete one Production-environment setup with a Clerk Production
  instance/domain/redirects and live keys plus a Production deploy key and
  required environment names for canonical Convex `clean-eel-522`. The current
  historical Production target is errored and no custom domain is assigned.
  Do not merge `main` until names-only preflight passes.
- [ENVIRONMENT ACCESS] Names-only Convex checks for `content-snake-214` and
  `clean-eel-522` were denied. The operation stopped without switching account,
  selecting another project, or creating a deployment.
- [CONTENT APPROVAL] Final brand story, community promise, support details, and
  customer rules remain client-owned copy. Current text is concise product copy,
  not a new business promise.
- [POST-V1 BACKLOG] Reporting, Excel export, Analytics, Content management,
  Settings, and a dedicated audit-log UI are not implemented.

The original PRD pack was located at
`/Users/masjak/Documents/BLESSINGFORGOOD/BFG WEB/context/product/` and audited
read-only for this convergence. It is intentionally not copied wholesale into
the canonical repository.

## Phase 06.4 decisions and blockers

- [BLOCKED BY BUSINESS DECISION] `CANCELLATION_ELIGIBILITY_POLICY`: define the
  final customer cancellation window and approval rules. v0.1 uses a safe
  server boundary: pre-lock/unpaid items may be eligible; batch-locked or
  financially settled items require admin review; fulfilled, cancelled, and
  actively conflicted items are rejected.
- [BLOCKED BY BUSINESS DECISION] `REFUND_DISBURSEMENT_POLICY`: define whether
  and how a recorded `refund_due` obligation may be paid. v0.1 performs no
  bank transfer, cash payout, gateway reversal, or automatic credit.
- [BLOCKED BY BUSINESS DECISION] `DEPOSIT_REFUND_POLICY`: releasing an active
  invoice reservation restores the existing deposit account balance; cash
  withdrawal is not implemented.
- [BLOCKED BY BUSINESS DECISION] `POST_PO_CANCELLATION_POLICY`: after batch
  lock/PO close, the case is preserved and reviewed without rewriting batch
  purchasing history.
- [BLOCKED BY BUSINESS DECISION] `DEFECT_REPLACEMENT_POLICY`: replacement
  execution, supplier return, proof upload, and replacement inventory remain
  outside v0.1.
- [DEFERRED TO PRODUCTION RUNTIME QA] Clerk identity, browser privacy,
  concurrent admin runtime behavior, realtime projections, and cleanup evidence
  remain part of the Production smoke gate.
- [BLOCKED ENVIRONMENT ACCESS] Canonical Convex codegen could not access the
  selected Development project. The local generated API typing was updated for
  the source tree; do not switch projects or run `convex dev` to select another
  deployment.

## Phase 06.3 decisions and blockers

- [BLOCKED BY BUSINESS DECISION] `MANUAL_NON_ACCOUNT_CUSTOMER_POLICY`: decide
  whether BFG may preserve a non-account customer record for assisted orders.
  Phase 06.3 supports only admin-assisted orders for an existing active
  customer `appUsers` record and creates no fake Clerk identity or `appUsers`
  row.
- [DEFERRED] Supplier-specific PO cost, supplier assignment, ordering cutoff,
  and automated procurement are not modeled. The v0.1 purchase summary uses
  assigned customer quantity and price snapshots only.
- [SCALE TRIGGER] The unassigned batch work queue scans at most 200 submitted
  orders/items for v0.1. Add a dedicated roster projection/index when BFG
  volume reaches that ceiling.
- [DEFERRED TO PRODUCTION RUNTIME QA] Clerk identity, browser, realtime, and concurrent
  multi-admin runtime verification remain part of the Production smoke gate.

## Phase 06.2 decisions and blockers

- [OPEN BUSINESS/PRIVACY DECISION] `JOIN_REQUEST_RETENTION_POLICY`: define
  retention, access, and disposal rules for admission records containing
  contact details. Phase 06.2 preserves history and adds no public deletion.
- [DEFERRED] Clerk invitation execution, invitation acceptance evidence, and
  safe `joinRequest` → `appUser` linking remain manual identity-lifecycle work.
  Approval only sets `invitationStatus=ready`.
- [DEFERRED INFRASTRUCTURE] Rate limiting and bot controls need stable
  infrastructure. Phase 06.2 uses server validation, normalization, bounded
  duplicate checks, generic duplicate errors, and acknowledgement gating.

## Phase 06.1 decisions and blockers

- [BLOCKED BY BUSINESS DECISION] `READY_STOCK_ORDER_RECORDING`: decide whether a
  Ready Stock purchase creates an existing order type, a dedicated order source,
  or remains externally recorded. Reservation/sold transitions and checkout must
  wait for this decision.
- [DEFERRED] Durable cover upload/storage. Phase 06.1 keeps the existing optional
  image-reference boundary and stores no binary/base64 content.
- [SCALE TRIGGER] Public/admin Book Master queries are bounded to 200 source rows
  and 100 public results. Add pagination/search indexes when real inventory reaches
  that ceiling.
- [RESOLVED FOR COVERAGE AUDIT] The original product pack remains outside the
  canonical Git repository but was found in the supplied local BFG source and
  audited read-only. The current PRD/mockup matrices record its applicable scope.

## Phase 05.1 status

Phase 05.1 is **IMPLEMENTATION COMPLETE** with **GREEN** local validation:
65 Vitest tests and 38 Convex tests pass.
Runtime integration QA is **DEFERRED TO PRODUCTION RUNTIME QA**. Production readiness is
**NOT READY**.

The payment domain is intentionally manual: customers submit confirmation
metadata, active admin/owner users review it, and Convex records the decision.
The existing append-only deposit ledger remains separate from approved external
payment amounts.

### Staging backlog

The following have no real Production runtime proof yet:

- Clerk Development sign-in and Clerk JWT → Convex identity;
- customer submission, duplicate prevention, rejection/resubmission;
- admin/owner review, approval, rejection, and audit history;
- suspension denial and Customer A/B payment isolation;
- deposit-plus-transfer settlement, invoice projection, and stale approval;
- proof-reference behavior, realtime updates, browser/responsive QA, and
  authenticated Playwright;
- runtime logs, guarded business-data cleanup, and final zero-data check.

These are release/staging gates, not transient Preview blockers for feature
development.

### Payment policy questions

- approved partial-payment and cancellation/correction policy beyond v0.1
  rejection/resubmission;
- final payment-method taxonomy and proof-upload/storage provider;
- refund, withdrawal, chargeback, accounting, tax, and reconciliation policy.

## Phase 04.1 status transition

Phase 04.1 implementation is **IMPLEMENTED** and local validation is **GREEN**.
Runtime integration QA is **DEFERRED TO PRODUCTION RUNTIME QA**. Production readiness is
**NOT READY**.

[SUPERSEDED] The previous rule that Phase 04.1 could not proceed until a
transient branch-specific Preview reached `READY` is retired.

The unresolved real Clerk, ownership, browser, operational, runtime-log, and
cleanup checks are staging acceptance work, not blockers to feature
development. See `context/implementation/STAGING-QA-PLAN.md`.

[BLOCKED] The canonical GitHub repository does not include the product context pack referenced by `FILE_MANIFEST.md`.

The following remain open and were not silently resolved:

- approved brand copy and official logo/mascot asset roles;
- [RESOLVED IN REPOSITORY] customer/admin/owner authentication and
  authorization wiring;
- [RESOLVED FOR PHASE 03.1] Convex core schema and isolated dev/Preview deployment boundary;
- Production Convex deployment, Production Clerk identity, and Production
  authorization boundary;
- catalog access-code rate limiting and expiry policy;
- [RESOLVED FOR PHASE 05.1 IMPLEMENTATION] manual payment confirmation and
  review workflow; remaining deposit/refund/cancellation/legal policy is still
  open;
- final ready-stock inventory behavior;
- final mockup-to-screen mapping.
