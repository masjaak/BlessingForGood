# Known Limitations

- The canonical GitHub repository does not contain the product context files listed in its own manifest.
- Official logo, mascot, and mockup assets are committed and mapped; book-cover source assets are still not approved.
- The local adapter is intentionally browser-local, starts empty, and remains an explicit local-development fallback;
  Vercel Preview uses Convex when its injected URL is valid and otherwise fails closed.
- Convex Preview sessions are anonymous, expiring prototype sessions, not Clerk identity or Production authorization.
- Catalog access-code attempts have safe keyed verification and bounded admin-code attempts; distributed catalog
  rate limiting remains a later security phase.
- Existing browser-local records are not migrated into Convex automatically.
- Preview Demo Mode is QA-only, is not authentication, and must remain absent/disabled in Production.
- Admin and customer identity are not production authentication.
- Invoice/deposit behavior is a foundation and does not process money.
- WhatsApp is represented by a generated handoff link only.
- `BookCover` uses a neutral typographic fallback until approved cover image persistence is designed.
- Catalog creation is intentionally one-title-per-form; richer publisher/book management is deferred.
- Batch/cargo tracking, order fulfillment, invoice, and append-only deposit persistence are implemented in Phase
  03.2. Payment settlement, upload, email, and WhatsApp API persistence remain deferred to later phases.
- Shipment and fulfillment correction workflows are forward-only prototypes; backward correction and detailed
  reassignment audit history are deferred.
- Invoice numbering is collision-safe for Preview but is not final accounting numbering policy. Invoice calculations
  do not add shipping, customs, tax, discount, or exchange-rate lines.
- Deposit accounts and allocations are operational ledger projections, not payment settlement, bank reconciliation,
  refunds, withdrawals, or final financial policy.
- Books, Customers, Content, and Settings remain clearly marked unavailable in the admin navigation. Batch tracking,
  orders, and invoices are active Preview operational surfaces.
- Full manual keyboard and contrast review remains a follow-up; automated accessible-name, heading, form, focus,
  and browser-error checks pass.
- Next.js reports the unrelated `/Users/masjak/package-lock.json` as an ignored parent lockfile; the repository build still succeeds with the canonical local lockfile, so the parent file remains untouched.
