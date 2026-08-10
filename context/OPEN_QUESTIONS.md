# Open Questions

## Phase 04.1 runtime gate

[BLOCKED] Repository implementation is complete for the identity/RBAC model,
but current-branch Preview still needs real Clerk Development invitation and
authenticated browser evidence. This is a verification gate, not a reason to
invent fallback configuration.

[SUPERSEDED] Names-only inspection confirms the Vercel Preview Clerk keys,
`CONVEX_DEPLOY_KEY`, and the three project-level Convex Preview default names.

[BLOCKED] The retrigger build for commit `9a6eb84` selected the real isolated
Convex Preview deployment `robust-cheetah-853` but failed because
`CLERK_JWT_ISSUER_DOMAIN` was unset there. The local Convex CLI account cannot
inspect that generated deployment, so its value was not guessed or changed.

[BLOCKED] The canonical GitHub repository does not include the product context pack referenced by `FILE_MANIFEST.md`.

The following remain open and were not silently resolved:

- approved brand copy and official logo/mascot asset roles;
- [RESOLVED IN REPOSITORY] customer/admin/owner authentication and
  authorization wiring;
- [RESOLVED FOR PHASE 03.1] Convex core schema and isolated dev/Preview deployment boundary;
- Production Convex deployment, Production Clerk identity, and Production
  authorization boundary;
- catalog access-code rate limiting and expiry policy;
- deposit, refund, cancellation, payment-verification, and legal rules;
- final ready-stock inventory behavior;
- final mockup-to-screen mapping.
