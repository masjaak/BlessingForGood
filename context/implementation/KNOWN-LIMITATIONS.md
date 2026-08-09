# Known Limitations

- Real Clerk invitation acceptance and current Vercel/Convex Preview browser
  evidence are pending; local synthetic identity tests are not runtime proof.
- The current Playwright Clerk suite requires non-secret QA identity
  configuration and Development-only test infrastructure. It never commits
  storage state or credentials.
- Invitation management, password reset, Clerk-user deletion, owner role
  changes, MFA enforcement, and Production authentication are Phase 04.2 or
  later.
- Legacy `prototypeSessions` code remains isolated until all historical test
  dependencies are retired. Its active exports fail closed.
- Catalog access-code rate limiting, payment settlement, uploads, email,
  WhatsApp API, refunds, tax/customs/shipping policy, and final accounting
  numbering remain deferred.
- The local adapter is allowed only as an explicit local-development fallback;
  Preview without Convex configuration is unavailable rather than anonymous.
- Next.js may report the unrelated parent lockfile outside this repository;
  the canonical repository build still succeeds.
