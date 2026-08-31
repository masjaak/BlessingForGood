# User Roles Feature

## Roles

- `customer`: own account and business data.
- `admin`: operational management plus Users read/status operations,
  operational Settings, and read-only Activity/Audit; no role, invitation,
  revocation, or ownership authority.
- `owner`: all Admin permissions plus user/security operations that are
  explicitly Owner-only.

Roles and status are server-owned Convex fields. New non-owner users default to
`customer`. Only the configured owner Clerk subject can bootstrap `owner`.

## Admin System access

Active Admins can open `/admin/users`, `/admin/settings`, and `/admin/audit`.
Users provides paginated/filterable listing plus eligible non-owner
suspension/reactivation. Settings is limited to the current operational
allowlist. Audit is read-only.

## Owner controls

Owners additionally manage customer/admin role changes and staff
invitation/revocation. Neither role can delete Clerk users, reset passwords,
enforce MFA, change Owner roles, self-promote, or transfer ownership in this
phase.

Suspension blocks protected Convex functions while preserving public browsing
and sign-out. Owners cannot suspend themselves or another owner.

## Admission review

Active admins and owners can review `/admin/join-requests`. Approval starts
the automatic server-side Clerk invitation reconciliation and does not require
Clerk Dashboard access. It does not grant Secret Catalog access or change a
role outside the canonical `appUsers` provisioning path. Customers and
suspended admins cannot review admission requests.
