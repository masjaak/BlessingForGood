# Decisions

Phase 04.1 records the following approved implementation decisions:

- Clerk Development is the identity provider; Convex owns BFG roles,
  permissions, ownership, and suspension.
- Restricted Mode keeps account admission invite-only; public UX exposes only
  `Masuk` as the account CTA.
- `appUsers` is the server-side identity mapping keyed by verified Clerk
  subject; the owner bootstrap subject is server-only.
- Active Preview must use Clerk identity only. Legacy prototype sessions are
  isolated and disabled.

The remaining prototype decisions below are historical and do not override the
Phase 04.1 identity boundary.

The following implementation choices are prototype-only and are recorded in `PROTOTYPE_ASSUMPTIONS.md`:

- local browser adapter behind explicit prototype mode;
- one catalog access code hashed before storage;
- one-title catalog creation form for the first vertical slice;
- fixed, percentage, or unset invoice deposit requirement;
- append-only local deposit transactions.
