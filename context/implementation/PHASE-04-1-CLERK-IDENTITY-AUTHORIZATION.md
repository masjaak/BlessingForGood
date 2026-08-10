# Phase 04.1 — Clerk Identity and Authorization

## Decision

Clerk Development provides BFG identity. Convex provides BFG business
authorization. Application roles live in Convex. Restricted Mode keeps account
admission invite-only. Prototype sessions are deprecated for active Preview.
Production authentication is not configured.

## Delivered in the repository

- Reused Clerk middleware, provider, and shell; removed public signup CTA.
- Added current Clerk sign-in/sign-up route components and invite-only copy.
- Added `ConvexProviderWithClerk`, auth state handling, and fail-closed Preview
  provider selection.
- Added `convex/auth.config.ts`, `appUsers`, owner bootstrap, role/status
  validation, centralized permissions, authorization helpers, and audit rows.
- Migrated active business ownership and actor references from prototype
  sessions to app users.
- Added secret catalog grant isolation, customer profile/address ownership,
  atomic default-address handling, route guards, and owner user management.
- Disabled legacy anonymous session exports for active functions.
- Added synthetic identity/authorization tests and Clerk-aware Playwright
  configuration with no committed auth storage.

## Evidence and gate

[CONVEX VERIFIED] Development codegen, zero-data ownership preflight, and 32
Convex tests pass. [REPOSITORY] Web checks, 59 Vitest tests, and Next.js build
pass locally. [SUPERSEDED] Names-only inspection confirms the Vercel Preview
credentials and project-level Convex Preview default names. [PREVIEW BUILD]
The retrigger build selected isolated Convex Preview `robust-cheetah-853` and
generated 18 static pages, but failed because `CLERK_JWT_ISSUER_DOMAIN` was
unset in that generated deployment. [BLOCKED] Completion remains open until
the configured Preview auth environment is applied there, then real
Development invitation, authenticated Convex identity, and Clerk Playwright
QA are verified.

## Next milestone

Phase 04.2 — Invitation Management, MFA & Identity Hardening.
