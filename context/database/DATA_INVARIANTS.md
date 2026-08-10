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

## Catalog and orders

- Access codes are keyed digests; plaintext codes never enter documents or
  audit metadata.
- A grant requires authenticated app-user identity, valid code, open catalog,
  and unexpired/revocable grant state.
- Customer B cannot inherit customer A's grant.
- Order creation derives `customerUserId` from the authenticated app user and
  calculates totals/snapshots inside one mutation.
- Order edits remain limited to submitted orders before the catalog close.
- Existing price, order status, tracking, and fulfillment invariants remain
  unchanged from Phase 03.

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
