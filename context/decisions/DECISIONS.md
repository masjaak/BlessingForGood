# Decisions

## Minor stability tuning — 2026-08-29

- GBP supplier cost remains stored as integer pence at Book Variant level. Admin
  enters pounds with a dot as the canonical separator, accepts at most two
  decimals, and safely normalizes a mobile comma separator. Existing pence
  values read back as pound values in internal displays and exports. GBP remains
  internal supplier data and is not added to public or Customer projections.
- Archived Secret Catalog restoration is one authorized `archived → draft`
  mutation on the same Catalog. It preserves Catalog data and history, does not
  reopen Customer access, and leaves the existing `closed → open` reopen guards
  unchanged.
- The affected Book Master variant-create grid uses the existing design system
  and responsive breakpoints. No shared form primitive was changed.

## Removed admission Admin projection — 2026-08-27

- The default Admin `Permintaan bergabung` queue is a current operational
  projection, not the Join Request history authority.
- `joinRequests.listForAdmin` excludes requests with `removedAt` in both its
  default and status-filtered paths. It does not delete or rewrite the
  historical Join Request, appUser, invitation, or audit records.
- `users.findApprovedJoinRequest` remains a separate current-admission
  resolver. Its removed-request exclusion continues to protect invitation,
  login, and membership reconciliation while a new approved request remains
  discoverable.

## Membership removal and reapply P0 — 2026-08-27

- Clerk identity and BFG membership remain separate lifecycle authorities.
  `joinRequests.removeMember` is the Admin/Owner-controlled BFG membership
  revocation and never calls Clerk user deletion.
- `appUsers.status=removed` is the membership tombstone. It preserves the
  canonical app-user ID, member code, ownership references, and business/audit
  history; `suspended` remains a distinct temporary-access state.
- Approved requests and accepted invitation facts remain historical after
  removal, but removed requests are excluded from duplicate prevention and
  `users.ensureCurrentUser` reconciliation. Only a new approved request may
  reactivate membership.
- The existing Clerk subject reuses its removed Customer row and member code
  after new approval. A new Clerk subject creates a new Customer row/code so
  the former subject remains auditable. Pending Clerk invitations are revoked
  best effort; accepted invitations are never rewritten.
- Removal is one atomic BFG mutation with one `membership.removed` audit event;
  Admin/Owner targets are rejected and historical business records are never
  hard-deleted.

## Membership admission root closure P0 — 2026-08-27

- Preserve Convex custom-template forwarding from `5ca0bf4`; it is required
  for the intended Clerk/Convex authentication contract and is not rolled
  back merely because that template omits email.
- Recover missing admission identity server-side from Clerk Backend using the
  already authenticated Clerk subject. Only the verified primary email may be
  offered to the canonical reconciliation transaction.
- `userProvisioning.ensureCurrentUser` is the root authenticated caller;
  `users.ensureCurrentUser` plus `admitApprovedJoinRequest` remains the single
  membership implementation. Account, Join, Ready Stock, Buku Saya, Tagihan,
  and Admin projections may not create sibling reconcilers.
- A failed Clerk Backend lookup is an unresolved/retryable authentication
  handoff, not evidence that the Customer must Join again. Existing active,
  suspended, Admin, and Owner records remain authoritative.
- Invitation observability reuses one safe browser-to-server correlation ID;
  raw Clerk tickets, subjects, email addresses, JWTs, and secrets are never
  logged.

## Real Clerk ticket acceptance P0 — 2026-08-27

- The invitation action sets Clerk's supported custom redirect to BFG's
  invite-only `/sign-up` route. The route must process `__clerk_ticket` before
  any signed-in redirect can return a stale session to `/account`.
- A signed-in browser opening an invitation ticket is treated as a possible
  account mismatch. BFG never activates the ticket's applicant under the
  existing subject; the supported recovery is explicit sign-out and ticket
  restart.
- `ConvexProductProvider` is the canonical authenticated bootstrap caller for
  `users.ensureCurrentUser`. No second membership reconciler is introduced.
- Membership UI states are explicit: `AUTH_LOADING`,
  `MEMBERSHIP_RECONCILING`, `NO_APPLICATION`, `PENDING`,
  `APPROVED_INVITATION_PENDING`, `ACTIVE`, and `SUSPENDED`.
- Production diagnostics are privacy-safe and observational only; they do not
  change admission, authorization, ownership, or Clerk identity behavior.

## Operational reconciliation — 2026-08-26

- Join approval is one BFG Admin mutation followed by a private, server-side
  Clerk Backend SDK reconciliation action. Exact existing identities and
  pending invitations are reused; a new invitation is created at most once
  for the approved normalized email, and failure is a safe retryable state.
- `appUsers.role/status` is the sole membership authority. `/join` derives its
  state from the same resolver as the Customer shell; active and suspended
  Customers never see a new Join form, and Admin/Owner never receives Customer
  mutation authority.
- Customer checkout authority is exact, not visual: only an authenticated
  active Customer may call `orders:createReadyStock` or the Customer preorder
  mutation. Admin/Owner browse access does not grant Customer mutation rights;
  their supported path is Admin-assisted order creation.
- `secretCatalogs.reopen` is a guarded lifecycle action. A closed catalog may
  reopen only when its close deadline is still valid and no linked Batch has a
  locked shipment stage. Missing linked history also fails closed.
- Batch Catalog links are source eligibility only. Derived counts summarize
  submitted non-Ready-Stock order items; Assignment remains an explicit Admin
  decision and Purchase Summary remains derived from assignments.
- `po_closed` cannot be recorded for an empty Batch Roster. Existing shipment
  stage names and transition rules remain the only Batch state machine.
- Hard deletion is an exception for unused draft/pristine records. Referenced
  or historical entities retain their lifecycle action, and financial/audit
  history is never deleted. All user-triggered destructive/state changes use
  the shared BFG confirmation primitive.

## Client UAT Round 3 — 2026-08-25

- Unknown Google identities never transfer into opaque Clerk sign-up. The
  existing Clerk invite-only path uses supported `transferable=false`; BFG
  supplies localized rejection copy and `/join`/alternate-account actions.
- `joinRequests.submit` is intentionally public and remains separate from
  Clerk identity, `appUsers`, Customer activation, and Secret Catalog access.
  Known duplicate states may be explained precisely without exposing request
  lists or internal errors.
- Activity keeps one shared presentation and adds only an additive audience
  projection (`admin` or `customer`) to prevent role elevation from widening
  the customer feed. Legacy rows infer audience from their safe destination.
- Book interest remains one value. New taxonomy labels are additive; `Children
  Books`, `Collector Books`, and `Novel` remain valid legacy values.

## Client UAT Round 2 maintenance decisions — 2026-08-24

- Upload security remains authoritative. `image/jpg`, `image/pjpeg`, and MIME
  parameters are normalized to canonical `image/jpeg`; binary signature,
  extension, dimensions, size, ownership, claim, and rate-limit checks remain
  required.
- Ready Stock self-service and Admin-assisted orders share the existing
  canonical `orders.source=ready_stock` reservation path. Admin assistance may
  target only an existing active BFG Customer and never creates a ghost user.
- `batches.etaCargoMonth` stores `YYYY-MM`; the UI may localize month/year, but
  it must not promise a guaranteed arrival date.
- `appUsers.memberCode` is a stable display/search identifier with uniqueness
  retry. It is not an authentication token, authorization input, or secret.
- Publisher purchase export remains derived from roster assignments. The
  existing Excel-compatible CSV stack is retained; GBP supplier cost is
  optional integer pence at the Book Variant level and Customer price remains
  integer IDR.

## Global Button System — 2026-08-22

- `src/components/ui.tsx` is the single application button family:
  `Button`, `LinkButton`, `IconButton`, `LinkIconButton`, `ToggleButton`, and
  `ActionGroup`.
- The locked variants are `primary`, `secondary`, `tertiary`, and `danger`;
  `quiet` is retired. Navigation semantics stay links and mutations stay
  buttons.
- Shared button tokens own 40px compact desktop density, 44px default/icon
  touch targets, 48px large CTAs, complete interaction states, loading
  announcements, and action spacing. Page CSS cannot introduce button colors,
  radii, hover rules, or individual button margins.
- This is a visual/interaction contract only. RBAC, ownership, state-machine
  validation, rate limits, idempotency, and server authority remain unchanged.

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

The historical Phase 06.2 admission wording below is superseded by the
automatic invitation and activation decision above; it remains retained as
historical source evidence.

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

## Customer Account responsive navigation closure — 2026-08-26

- The canonical Customer Account destinations remain `/account/profile`,
  `/account/addresses`, and `/account/notifications`. At the existing mobile
  breakpoint, they are presented in one stacked Account hub together with
  Clerk account management and sign-out; essential actions must not depend on
  portrait versus landscape orientation.
- Account management uses Clerk's supported `openUserProfile` flow and
  sign-out uses Clerk `signOut({ redirectUrl: "/" })`. No custom authentication
  mechanism or Clerk configuration surface is exposed.
- The existing five-item Customer bottom navigation and desktop header remain
  the primary shell navigation. No horizontal Account tab strip is introduced.
