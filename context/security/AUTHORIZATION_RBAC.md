# BFG Authorization and RBAC

## Roles

Roles are stored in Convex `appUsers.role`:

- `customer`: catalog access plus own orders, tracking, invoices, deposits,
  payment confirmations, profile, and addresses.
- `admin`: operational catalog, book, order, batch, tracking, invoice, and
  deposit, and payment-confirmation management, plus Users read/status,
  operational Settings, and read-only Audit access. Admin cannot manage roles,
  invitations, revocations, or ownership authority.
- `owner`: all Admin permissions plus user role changes, staff
  invitations/revocations, and other ownership-critical access.

The permission sets are centralized in `convex/lib/auth.ts`. Raw role checks do
not define authorization in feature functions.

## Permission keys

```text
catalog.read       catalog.manage       books.read          books.manage
orders.read.own    orders.read.all      orders.manage       batches.read
batches.manage     tracking.read.own    tracking.read.all   tracking.manage
invoices.read.own  invoices.read.all    invoices.manage     deposits.read.own
deposits.read.all  deposits.manage      customers.read     customers.manage
users.read         users.manage_roles   users.suspend       settings.manage
audit.read
```

`owner` receives the union of the admin and customer sets plus
`users.manage_roles` and the Owner-only invitation/access operations. `admin`
receives operational permissions plus `users.read`, `users.suspend`,
`settings.manage`, and `audit.read`, but not role/invitation authority.
`customer` receives only own-data permissions.

## Server helpers

`convex/lib/auth.ts` provides:

- `requireIdentity`
- `requireCurrentUser`
- `requireActiveUser`
- `requirePermission`
- `requireAdminOrOwner`
- `requireOwner`
- `requireOwnedResource`

Every active helper starts with `ctx.auth.getUserIdentity()` and resolves the
subject through `appUsers`. Client Clerk IDs, app-user IDs used as identity
claims, roles, permissions, email, localStorage state, and ownership claims
are not trusted.

Payment confirmation functions intentionally reuse invoice permissions. A
customer's invoice ownership is checked before reading or submitting; only an
active admin/owner can review, approve, or reject. Suspension is enforced by
the shared active-user helper.

Join requests are the public pre-account boundary. Anonymous visitors may only
submit a server-validated request; they cannot read requests or review them.
Active admins/owners use `customers.read` for the operational queue and
`customers.manage` for forward-only review transitions. Customers and
suspended admins are denied. Approval means invitation eligibility only: it
does not create an `appUser`, role, ownership relationship, or catalog grant.

`joinRequests.removeMember` requires `customers.manage`, targets only a
Customer membership, and rejects Admin/Owner targets. It preserves the Clerk
identity and historical business ownership rows while changing the canonical
Customer status to `removed`. The shared active-user guard denies removed
users, and old approved admissions are excluded from reconciliation; a new
approved request is required for reactivation.

Phase 06.3 operational rules use `tracking.read.all` and `tracking.manage` for
admin/owner batch rosters, assignment changes, and purchase summaries. Full
rosters never mount for customers; customer tracking remains owned-order
scoped. `orders.createAssisted` and its customer selector use
`orders.manage`; the target must be an existing active customer, and the
result is still a normal customer-owned order.

Ready Stock public reads are the explicit exception to identity requirements.
They expose only the server-derived published/positive-stock projection.
Book Master, variants, publication state, and inventory mutations require
`books.manage`; customers cannot use the former broad book/variant admin reads.

## Admin System boundary

Active Admins see and may enter `/admin/users`, `/admin/settings`, and
`/admin/audit`. Users listing and eligible non-owner suspend/reactivate use
`users.read`/`users.suspend`; settings update is limited to the existing
operational allowlist; audit is read-only. Staff invitations, invitation
revocation, role changes, Owner targets, self-escalation, and any future
ownership transfer remain Owner-only. The entire Settings section is not a
proxy for a future owner-critical action; such actions must receive their own
capability guard.

## Owner protections

- The owner bootstrap subject is server-only and is never returned to the
  client.
- `users.updateRole` accepts only `customer` and `admin` targets; owners cannot
  be promoted, demoted, or replaced through this phase.
- Admins and Owners cannot suspend themselves or any Owner. This preserves at
  least one active Owner because Owner suspension/demotion is unavailable.
- Privileged changes write audit events with safe metadata only.

## Evidence

[CONVEX VERIFIED] Convex tests cover missing identity, client role injection,
customer/admin/owner permissions, admin role-management denial, owner role
management, self-suspension, owner protection, suspension, and cross-customer
ownership isolation.
