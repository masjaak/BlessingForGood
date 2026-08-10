# BFG Admin Security

## Boundary

`/admin/*` requires a Clerk session in the Next.js admin layout, an active
Convex `appUsers` record, and an admin or owner permission. `/admin/users` is
owner-only both in the UI guard and in every Convex user-management function.
`/admin/join-requests` is available to active admins and owners for admission
review; it does not create Clerk accounts or grant catalog access.

Navigation is convenience only. Convex permission checks remain mandatory for
all reads and mutations.

Book, variant, publication, and Ready Stock mutations use `books.manage` after
active-user/suspension checks. Slug, ISBN, format, integer price, stock, and
reference validity are checked server-side. Privileged mutations write safe
audit events; public reads write no audit rows.

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

Phase 05.1 payment review writes `payment_confirmation.submitted`,
`payment_confirmation.review_started`, `payment_confirmation.approved`, and
`payment_confirmation.rejected` events. Amount and invoice references are safe
metadata; proof contents, secrets, and credentials are not logged.

Phase 06.2 join-request review writes `join_request.review_started`,
`join_request.approved`, and `join_request.rejected` events. Join-request audit
metadata contains no contact data, invitation URLs, or tokens.

JWTs, Clerk secrets, session tokens, catalog access codes, invitation URLs,
passwords, and raw identity claims are never audit metadata.

## Suspension

A suspended user may still hold a Clerk session and use public pages and
sign-out. `requireActiveUser` rejects protected Convex operations, and the
client does not mount protected business queries while suspended.

This includes payment confirmation reads/submission and all admin review
mutations.
