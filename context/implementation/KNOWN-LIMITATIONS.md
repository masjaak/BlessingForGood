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
- Payment proof is a reference abstraction; durable file storage/upload is not
  implemented. Payment method taxonomy, cancellation, corrections, and final
  accounting policy remain open.
- The local adapter is allowed only as an explicit local-development fallback;
  Preview without Convex configuration is unavailable rather than anonymous.
- Next.js may report the unrelated parent lockfile outside this repository;
  the canonical repository build still succeeds.
- `READY_STOCK_ORDER_RECORDING` is unresolved. Public Ready Stock ends at a
  contact/help CTA; no checkout, reservation, or sale transition exists.
- Book Master/public search uses a documented 200-row server scan and 100-item
  public result ceiling. Add pagination/search-specific indexes when real data
  reaches that boundary.
- Cover metadata is a reference only. Durable upload/storage and external image
  host policy remain deferred.
