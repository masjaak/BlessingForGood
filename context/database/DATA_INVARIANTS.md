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
- Deposit balances cannot become negative; ledger rows are immutable and
  reversal/allocation transitions remain atomic.
- Invoice allocations must match the invoice customer and deposit account.
