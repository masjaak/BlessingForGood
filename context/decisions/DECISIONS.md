# Decisions

## Canonical Convex backend correction

- The canonical Convex account is `palevvi@gmail.com`, team is `palevvi`, and
  project is `blessingforgood`. The development reference is `dev/masjak`.

  ```text
  BFG_CANONICAL_CONVEX_TEAM=palevvi
  BFG_CANONICAL_CONVEX_PROJECT=blessingforgood
  BFG_CANONICAL_DEV=content-snake-214
  BFG_CANONICAL_PRODUCTION=clean-eel-522
  ```

- Only this project is authorized for active BFG development. A separate
  similarly named project under another Convex account/team is a duplicate and
  is `NON-CANONICAL`: do not use, deploy, or configure it, and do not delete it
  automatically.
- Configuration failure is a blocker. Never create a new BFG Convex project,
  use a similarly named BFG project, or create a Preview-looking deployment
  manually. Verify the Convex team, project, and deployment before every
  environment operation.

## Production V1 workflow decisions

The following historical workflow decisions are **SUPERSEDED** for the
Production V1 release:

- Preview is a mandatory release gate.
- Staging is required before every Production update.
- A hotfix-branch Preview is acceptable final delivery.
- Prototype runtime can represent customer progress.
- Tests alone prove visual acceptance.

The current decisions are: PRD/mockup plus rendered UI are acceptance
criteria; `main` is the sole Production Git line; Production is the
client-visible delivery; business dummy data remains zero; and functional and
visual gates are both required.

Phase 06.1 records the following approved implementation decisions:

- Book Master is reusable metadata; Secret Catalog is private curation/access;
  Ready Stock is public per-variant availability. These are not parallel book models.
- Variants own format, globally unique ISBN, and positive integer IDR price.
- Books use draft, published, special/private, and archived publication states.
  Only published books with active positive-stock variants are publicly readable.
- Ready Stock quantity is a separate non-negative per-variant record.
- Global book slugs support `/ready-stock/[slug]`.
- `READY_STOCK_ORDER_RECORDING` was open during Phase 06.1, which used a
  contact/help CTA. It is superseded and closed by the Phase 06.7 canonical
  order/reservation policy below.
- Cover metadata remains a reference; durable upload/storage is deferred.

Phase 06.2 records the following approved admission decisions:

- `/join` creates a durable Convex `joinRequests` record, not a Clerk account
  or fake `appUsers` row. Approval only makes manual invitation handoff
  eligible.
- Active normalized email/contact duplicates are blocked generically while
  rejected history remains preserved for a later resubmission.
- Review is `submitted → under_review → approved/rejected`, forward-only, with
  authenticated admin/owner actor and audit events. Invitation acceptance and
  account linking remain outside this phase.

Phase 06.3 records the following approved operations decisions:

- Existing `batches.currentShipmentStage` remains the only batch state
  machine. An unset stage is editable; `po_closed` and later stages lock
  catalog links and roster assignment changes.
- The roster is a server-derived operational projection from orders, order
  items, assignments, and linked catalogs. It does not duplicate ownership or
  create a second order system.
- Admin-assisted orders are allowed only for existing active customer
  `appUsers`, use `orders.source=admin_assisted`, derive price and ownership
  server-side, and enter the canonical order/item/invoice pipeline.
- Non-account manual customers, fake identities, supplier costs, supplier
  procurement automation, and arbitrary price overrides are not implemented.

Phase 06.4 records the following safe exception-domain decisions:

- `orderExceptions` is the canonical item-level operational exception record.
  Original order items, issued invoice items, approved payment confirmations,
  and deposit ledger rows remain historical records and are never deleted or
  rewritten to resolve an exception.
- Customer cancellation is always a request. The server-side eligibility
  boundary may allow a request or require admin review; it rejects fulfilled,
  already-cancelled, or actively-conflicted items. Admin approval is required
  before any resolution or financial effect.
- Phase 06.4's safe resolution set was `remove_item`, `deposit_release`,
  `refund_required`, and `no_action`. Phase 06.7 supersedes that temporary set
  by adding explicit defect replacement and auditable refund payout policy;
  store credit, withdrawal, and gateway reversal remain deferred.
- Partial quantities are supported. An exception blocks only its affected
  quantity; the original `orderItems.quantity` remains unchanged and the
  remaining quantity stays eligible for normal operations.
- Invoice adjustments are append-only exception financial records. Issued
  invoice snapshots retain the original total and expose a derived adjusted
  total, outstanding amount, overpayment, and refund obligation. Phase 06.4
  recorded obligations only; Phase 06.7 adds a separate payout record without
  deleting payment history.
- `deposit_release` reuses existing allocation release semantics and is
  idempotent through active-allocation state. It releases the invoice's active
  reservations as one explicit operational choice; it does not withdraw cash.
- Ready Stock did not create canonical orders in Phase 06.4. Phase 06.7 now
  uses canonical `orders` and `orderItems`, so the same exception history can
  apply without creating a parallel commerce system.

Phase 04.1 records the following approved implementation decisions:

- Clerk Development is the identity provider; Convex owns BFG roles,
  permissions, ownership, and suspension.
- Restricted Mode keeps account admission invite-only; public UX exposes only
  `Masuk` as the account CTA.
- `appUsers` is the server-side identity mapping keyed by verified Clerk
  subject; the owner bootstrap subject is server-only.
- Active Preview must use Clerk identity only. Legacy prototype sessions are
  isolated and disabled.

## Homepage / Join / Secret Catalog V3 decisions

- Homepage discovery is a short mobile-first story: three anchored quick
  paths, native horizontal story cards, current order explanation, and a Join
  CTA. Official logo and Blessy assets remain the only brand visuals.
- Public signup is disabled at both surfaces: Clerk sign-in renders with
  `withSignUp=false`, and `/sign-up` requires Clerk's `__clerk_ticket` invitation
  parameter. A valid invitation completion remains allowed.
- A non-owner Clerk identity may provision an `appUsers` customer only when its
  normalized email matches an approved, invitation-ready `joinRequests` row.
  Authentication alone never grants BFG membership or catalog access.
- New Secret Catalog codes are generated with Web Crypto, returned only in the
  immediate admin mutation result, and stored only as peppered HMAC digests.
  `catalogAccess.revokeCode` prevents new grants; existing grants retain the
  current expiry/closed-catalog behavior until their authoritative checks fail.
- V3.1 supersedes the customer prerequisite of `authenticated member + code`:
  `/catalog` is a public gateway, valid codes create catalog-scoped opaque
  sessions without Clerk, and `getUnlocked` validates that session on every
  private query. Existing member grants remain for backward-compatible owned
  preorder authorization; token-only browse does not create customer identity.
- Join captures name, email, normalized phone, area/city, one primary book
  interest, and optional note. `BFG_JOIN_WHATSAPP_GROUP_URL` is returned only
  after the request mutation commits; missing configuration produces a safe
  continuation message rather than a dummy link.

The remaining prototype decisions below are historical and do not override the
Phase 04.1 identity boundary.

The following implementation choices are prototype-only and are recorded in `PROTOTYPE_ASSUMPTIONS.md`:

- local browser adapter behind explicit prototype mode;
- one catalog access code hashed before storage;
- one-title catalog creation form for the first vertical slice;
- fixed, percentage, or unset invoice deposit requirement;
- append-only local deposit transactions.

## Phase 06.7 business policy closure

- Ready Stock uses the canonical `orders`/`orderItems`/`invoices` flow with
  `orders.source=ready_stock`; anonymous owned orders are not supported.
- Ready Stock inventory quantity is on-hand. Reserved quantity is tracked by
  an explicit reservation row and derived available quantity; creation is an
  atomic server reservation and no automated payment expiry is introduced.
- Pre-PO customer cancellation remains a request plus admin review. After PO
  commitment, admin must record recoverable value, including zero or partial
  recovery; no automatic full refund is promised.
- Ready Stock cancellation releases an active reservation before fulfillment;
  fulfillment consumes the reservation. Fulfilled orders use defect/other
  exception paths rather than normal cancellation.
- Defect resolution prefers explicit replacement with a bounded reference;
  refund fallback creates an obligation without deleting the original item.
- Refund obligations and payouts are separate canonical records. Payouts are
  pending/processing/paid/failed, support safe retries and partial settlement,
  and never overwrite payment history.
- Deposit refunds are limited to unallocated available deposit. Payout holds
  and successful release/debit or failed release are append-only ledger
  consequences; the balance projection is never manually edited.
- Non-account manual customers remain unsupported. Admin-assisted orders still
  require an existing active customer `appUsers` record.
- Join requests are retained as admission/audit history. No automatic privacy
  deletion or cron is introduced in Phase 06.7.
