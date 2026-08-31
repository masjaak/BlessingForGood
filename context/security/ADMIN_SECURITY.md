# BFG Admin Security

## Boundary

`/admin/*` requires a Clerk session in the Next.js admin layout, an active
Convex `appUsers` record, and an admin or owner permission. Active Admins may
use `/admin/users`, `/admin/settings`, and `/admin/audit` for their intended
operational capabilities. User role/invitation/revocation actions and
ownership-critical settings remain Owner-only at the specific server boundary.
`/admin/join-requests` is available to active admins and owners for admission
review; it does not create Clerk accounts or grant catalog access.

Navigation is convenience only. Convex permission checks remain mandatory for
all reads and mutations.

Phase 06.3 batch detail is an admin-only operational projection. It can show
cross-customer roster data and purchase quantities because the actor has
`tracking.read.all`; customers continue to receive only their own order-linked
tracking. Assisted order creation requires `orders.manage` and an existing
active customer `appUsers` record. Non-account manual customers are not
created.

Book, variant, publication, and Ready Stock mutations use `books.manage` after
active-user/suspension checks. Slug, ISBN, format, integer price, stock, and
reference validity are checked server-side. Privileged mutations write safe
audit events; public reads write no audit rows.

## Admin user/access operations

Implemented at `/admin/users`:

- paginated listing;
- role/status filters;
- eligible customer/admin suspension;
- eligible customer/admin reactivation.

These reads/status operations use `users.read` and `users.suspend`, so an
active Admin can operate them. Customer/admin role changes, staff invitations,
and invitation revocation remain Owner-only; Admin cannot self-promote,
change an Owner, or transfer ownership.

## Operational settings

`/admin/settings` is available to active Admins and Owners. The current page
contains only the allowlisted store/contact/manual-payment settings and uses
`settings.manage`. Any future ownership transfer, billing ownership,
provider-credential replacement, destructive reset, or equivalent authority
change must receive a separate Owner-only guard rather than hiding the whole
Settings section.

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

Phase 06.3 operations write `batch.item_assigned`,
`batch.item_assignment_updated`, `batch.item_unassigned`, `batch.item_moved`,
and `order.admin_assisted_created`. Metadata contains IDs, quantities, and
status-safe references only; it does not include catalog access codes or
unnecessary contact data.

JWTs, Clerk secrets, session tokens, catalog access codes, invitation URLs,
passwords, and raw identity claims are never audit metadata.

## Suspension

A suspended user may still hold a Clerk session and use public pages and
sign-out. `requireActiveUser` rejects protected Convex operations, and the
client does not mount protected business queries while suspended.

This includes payment confirmation reads/submission and all admin review
mutations.

## Phase 06.4 exception operations

The `/admin/exceptions` queue and admin order detail use Convex permission
checks on every query/mutation. Admins and owners can open OOS/defect/admin
cancellation cases, review them, choose an allowed resolution, reject, or
resolve. Customer cancellation is a request only. Customer-facing projections
omit internal notes, rejection reasons, and actor IDs.

## Phase 06.7 policy operations

Ready Stock order creation is customer-owned and requires an active customer;
inventory reservation and release are server-side only. Ready Stock cannot be
assigned to a supplier Batch PO. `/admin/refunds` is available to admins and
owners with `refunds.manage`; payout creation, processing, success, and failure
are state-checked mutations. Customers can request a deposit refund only for
their own unallocated available balance and can read only safe refund status.

Refund payout methods, references, and failure notes are withheld from
customer projections. Non-account assisted orders remain rejected, and Join
requests remain retained audit history without automatic deletion.

Resolution writes preserve immutable order/invoice/payment/deposit history and
record exception events plus audit events. Refund obligations and payout
records remain separate; the admin payout action records an authorized transfer
without rewriting payment history or performing a gateway reversal. Suspended
admins are denied by the same active-user guard.
