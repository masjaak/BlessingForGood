# Open Questions

## Phase 04.1 status transition

Phase 04.1 implementation is **IMPLEMENTED** and local validation is **GREEN**.
Runtime integration QA is **DEFERRED TO STAGING**. Production readiness is
**NOT READY**.

[SUPERSEDED] The previous rule that Phase 04.1 could not proceed until a
transient branch-specific Preview reached `READY` is retired.

The unresolved real Clerk, ownership, browser, operational, runtime-log, and
cleanup checks are staging acceptance work, not blockers to feature
development. See `context/implementation/STAGING-QA-PLAN.md`.

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
