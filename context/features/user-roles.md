# User Roles Feature

## Roles

- `customer`: own account and business data.
- `admin`: operational management without user-role management.
- `owner`: admin permissions plus user/security management.

Roles and status are server-owned Convex fields. New non-owner users default to
`customer`. Only the configured owner Clerk subject can bootstrap `owner`.

## Owner controls

`/admin/users` supports paginated/filterable user listing, customer/admin role
changes, suspension, and reactivation. It does not send invitations, delete
Clerk users, reset passwords, enforce MFA, or change owner roles.

Suspension blocks protected Convex functions while preserving public browsing
and sign-out. Owners cannot suspend themselves or another owner.

## Admission review

Active admins and owners can review `/admin/join-requests`. Approval starts
the automatic server-side Clerk invitation reconciliation and does not require
Clerk Dashboard access. It does not grant Secret Catalog access or change a
role outside the canonical `appUsers` provisioning path. Customers and
suspended admins cannot review admission requests.
