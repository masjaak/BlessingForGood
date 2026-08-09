# BFG Admin Security

## Boundary

`/admin/*` requires a Clerk session in the Next.js admin layout, an active
Convex `appUsers` record, and an admin or owner permission. `/admin/users` is
owner-only both in the UI guard and in every Convex user-management function.

Navigation is convenience only. Convex permission checks remain mandatory for
all reads and mutations.

## Owner user management

Implemented at `/admin/users`:

- paginated listing;
- role/status filters;
- customer → admin promotion;
- admin → customer demotion;
- customer/admin suspension;
- customer/admin reactivation.

Not implemented in this phase: invitation sending/resending/revocation,
Clerk-user deletion, password reset, owner promotion/demotion, and MFA
enforcement.

## Audit events

At minimum, these identity events are written:

```text
user.promoted
user.demoted
user.suspended
user.reactivated
```

Existing privileged catalog, tracking, invoice, and deposit mutations record
authenticated actor IDs. Audit rows contain `actorUserId`, `action`,
`targetType`, `targetId`, `createdAt`, and optional safe string metadata.

JWTs, Clerk secrets, session tokens, catalog access codes, invitation URLs,
passwords, and raw identity claims are never audit metadata.

## Suspension

A suspended user may still hold a Clerk session and use public pages and
sign-out. `requireActiveUser` rejects protected Convex operations, and the
client does not mount protected business queries while suspended.
