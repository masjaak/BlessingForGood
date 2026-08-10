# BFG Data Invariants

## Identity and ownership

- One `appUsers` row exists per Clerk subject.
- New non-owner identities become `customer`; the owner role requires the
  server-side bootstrap subject match.
- Existing role and status are preserved on re-login.
- Suspended users remain suspended and cannot use protected functions.
- At least one active owner remains because owners cannot be demoted or
  suspended in this phase.
- Active business ownership references `appUsers`, never prototype sessions,
  client Clerk subjects, emails, or client roles.
- Customers can read/mutate only their own grants, orders, tracking, invoices,
  deposits, profile, and addresses.
- Join requests never create fake `appUsers` or business ownership. Their
  applicant contact fields are normalized server-side before duplicate checks.
- For one normalized email or contact, at most one `submitted`, `under_review`,
  or `approved` request may exist. Rejected history remains and may be followed
  by a new request.
- Join-request review is forward-only: `submitted → under_review → approved`
  or `rejected`; stale or double review attempts are rejected.
- Approval sets invitation eligibility only. It does not create a Clerk account,
  assign a role, link an `appUser`, or grant Secret Catalog access.

## Catalog and orders

- Access codes are keyed digests; plaintext codes never enter documents or
  audit metadata.
- A grant requires authenticated app-user identity, valid code, open catalog,
  and unexpired/revocable grant state.
- Customer B cannot inherit customer A's grant.
- Order creation derives `customerUserId` from the authenticated app user and
  calculates totals/snapshots inside one mutation.
- `orders.source` is optional for legacy documents and normalizes to
  `customer_self_service` at read time; new assisted orders use
  `admin_assisted`.
- Admin-assisted orders require an active existing customer `appUsers` record.
  Customer ownership and item price are derived server-side; fake Clerk users,
  fake `appUsers`, and client price overrides are forbidden.
- Assisted order submission keys are required, bounded, and unique for the
  assisted-order mutation; a repeated key cannot create a second order.
- Order edits remain limited to submitted orders before the catalog close.
- Existing price, order status, tracking, and fulfillment invariants remain
  unchanged from Phase 03.
- A public Ready Stock item requires a `published` book, active publisher,
  active variant, inventory record, and quantity greater than zero.
- Draft, special/private, archived, inactive, and zero-stock data is never
  returned by the anonymous Ready Stock query.
- A book slug is globally unique; a variant ISBN is globally unique; one book
  cannot repeat a format.
- Variant price is a positive safe integer IDR value. Ready Stock quantity is a
  safe non-negative integer and is updated atomically with its audit event.

## Customer account data

- At most one profile exists per app user.
- An app user with addresses has exactly one default address.
- Creating or selecting a default clears other defaults atomically.
- Removing the default promotes the newest remaining address atomically.
- Clearing the only default is rejected.
- Profile/address CRUD derives the current user and rejects cross-customer IDs.

## Operations and finance

- Operational history is append-only where previously defined; actor fields
  are authenticated app users.
- A batch roster is derived from submitted `orders`, `orderItems`, catalog
  links, and `orderItemBatchAssignments`; it is not a second ownership model.
- An order item has at most one assignment row per batch. Assignment quantity
  is positive and the sum across batches cannot exceed the ordered quantity.
- Assignment, unassignment, and moves require an active admin/owner, a valid
  linked catalog, a submitted order, and an editable non-archived batch.
  `po_closed` and later shipment stages reject roster changes.
- A move validates both batches and writes the source removal and target
  assignment in one mutation; an existing target assignment is rejected.
- Invoice snapshots and status transitions remain server-validated.
- Invoice lifecycle and payment state are separate. External verified payment
  and allocated deposit amounts are non-negative integer IDR components.
- `invoices.outstandingAmount` equals
  `totalAmount - allocatedDepositAmount - verifiedPaymentAmount` and cannot
  become negative.
- Deposit balances cannot become negative; ledger rows are immutable and
  reversal/allocation transitions remain atomic.
- Invoice allocations must match the invoice customer and deposit account.

## Payment verification

- A payment confirmation belongs to exactly one invoice and the invoice's
  server-derived `customerUserId`.
- At most one `submitted` or `under_review` confirmation exists per invoice.
- Reviewed confirmation evidence is preserved; approval/rejection is not an
  in-place overwrite of a prior attempt.
- Approval rechecks the current outstanding amount and cannot double-count an
  already approved confirmation or deposit allocation.
- Rejection requires a reason and permits a later new attempt according to the
  current v0.1 policy.
- Suspended customers cannot read or write payment confirmations.
