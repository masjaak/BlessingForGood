# Security Decisions

## ADR-SEC-001 — Active Security Testing

**Decision:** active application security testing runs against Vercel Preview
with Clerk Development and Convex Development, not Production.

**Reason:** active tests can mutate records and identities. Production receives
safe, read-only smoke checks only.

## ADR-SEC-002 — Vercel Protection

**Decision:** keep Preview protection enabled. Automation uses authorized
Vercel bypass/session access from a protected environment.

**Reason:** Preview should remain access-controlled while allowing repeatable
browser and scanner checks. Never save bypass values in Git or reports.

## ADR-SEC-003 — Clerk

**Decision:** use Clerk Development and the official `@clerk/testing`
Playwright helpers for automated sign-in tests.

**Reason:** dedicated test identities avoid Production accounts and browser
dashboard login automation.

## ADR-SEC-004 — Convex

**Decision:** use the canonical Convex Development deployment for security
testing when an isolated Preview deploy key is unavailable. Do not use an
ambiguous deploy key.

**Reason:** a Preview build must never guess a Convex target or deploy to
Production. The Development build path validates the target and disables
Convex deploy.

## ADR-SEC-005 — CSP

**Decision:** retain the current inline CSP allowance as an accepted
hardening risk.

**Reason:** authenticated regression passed with zero application CSP
violations. Consider nonce/hash-based CSP where technically appropriate and
retest the complete authenticated flow before changing the policy.

## ADR-SEC-006 — Vercel Build Target Guard

**Decision:** keep the credential-gated Vercel build wrapper. Preview accepts
only the verified non-Production path; Production keeps the existing Clerk
Production synchronization and Convex Production deploy behavior.

**Reason:** the guard prevents Preview builds from using Production
credentials or deploying Convex Production. `SECURITY_STAGING_MODE=convex-dev`
is accepted only for `VERCEL_ENV=preview` and does not run in Production.
