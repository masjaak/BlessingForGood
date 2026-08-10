# Known Limitations

- Real Clerk invitation acceptance, Convex JWT verification, ownership,
  operational, browser, runtime-log, and cleanup evidence are deferred to the
  stable staging gate; local synthetic identity tests are not runtime proof.
- No Convex Preview-looking deployment is an active BFG environment or a
  manual development target. The canonical project is the only authorized
  backend; if its configuration fails, do not create a new project or select a
  similarly named project from another account/team.
- The current Playwright Clerk suite requires non-secret QA identity
  configuration and Development-only test infrastructure. It never commits
  storage state or credentials.
- Invitation management, password reset, Clerk-user deletion, owner role
  changes, MFA enforcement, and Production authentication are Phase 04.2 or
  later.
- Legacy `prototypeSessions` code remains isolated until all historical test
  dependencies are retired. Its active exports fail closed.
- Catalog access-code rate limiting, automatic payment settlement, uploads, email,
  WhatsApp API, refunds, tax/customs/shipping policy, and final accounting
  numbering remain deferred.
- Phase 05.1 implements manual payment confirmation and review only. Real
  Clerk-to-Convex payment runtime, browser, realtime, runtime-log, and
  zero-data cleanup evidence is deferred to stable staging.
- Phase 06.2 preserves join-request history while `JOIN_REQUEST_RETENTION_POLICY`
  remains open. Infrastructure rate limiting, Clerk invitation execution and
  acceptance, and verified `joinRequest` → `appUser` linking are not implemented.
- Phase 06.3 supports admin-assisted orders only for an existing active
  customer `appUsers` record. `MANUAL_NON_ACCOUNT_CUSTOMER_POLICY` is open;
  no fake Clerk identity or fake `appUsers` row is created.
- Batch purchase summaries use assigned customer quantity and price snapshots;
  supplier costs, supplier assignment, ordering cutoffs, procurement
  automation, and Ready Stock order recording are not modeled.
- The v0.1 unassigned batch queue scans at most 200 submitted orders/items.
  Add a dedicated roster projection/index when BFG volume reaches this
  documented ceiling. Post-lock correction/reopen workflow is also deferred.
- Payment proof is a reference abstraction; durable file storage/upload is not
  implemented. Payment method taxonomy, cancellation, corrections, and final
  accounting policy remain open.
- The local adapter is allowed only as an explicit local-development fallback;
  missing canonical Convex configuration is unavailable rather than anonymous.
- Next.js may report the unrelated parent lockfile outside this repository;
  the canonical repository build still succeeds.
- `READY_STOCK_ORDER_RECORDING` is unresolved. Public Ready Stock ends at a
  contact/help CTA; no checkout, reservation, or sale transition exists.
- Book Master/public search uses a documented 200-row server scan and 100-item
  public result ceiling. Add pagination/search-specific indexes when real data
  reaches that boundary.
- Cover metadata is a reference only. Durable upload/storage and external image
  host policy remain deferred.
- Phase 06.4 records cancellation requests, OOS/defect/admin cases, append-only
  financial adjustments, deposit releases, and refund obligations. It does
  not execute cash refunds, withdrawals, gateway reversals, store credit,
  replacements, proof uploads, or Ready Stock order exceptions.
- Final cancellation eligibility, refund disbursement, deposit refund,
  post-PO cancellation, and defect replacement policies remain blocked by
  business decision. Authenticated browser, realtime, and concurrent-admin
  runtime evidence remains deferred to stable staging.
