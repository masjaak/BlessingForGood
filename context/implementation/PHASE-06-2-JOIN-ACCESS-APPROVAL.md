# Phase 06.2 — Request Access, Join Blessfriends, and Admin Approval

Status: IMPLEMENTATION COMPLETE locally.

## Objective

Provide the pre-account admission bridge from a public BFG visitor to a
reviewed applicant eligible for a manual Clerk invitation, without enabling
public signup or granting catalog access.

## Implemented

- `joinRequests` Convex table with status/invitation boundaries and duplicate
  lookup indexes;
- anonymous `/join` submission with server validation, normalization,
  acknowledgement, generic errors, and zero-data-safe success state;
- admin/owner `/admin/join-requests` queue with status filter and bounded
  applicant search;
- atomic submitted → under_review → approved/rejected transitions;
- required rejection reason, reviewer/timestamp fields, audit events, and
  stale/double-review protection;
- approved `invitationStatus=ready` handoff state without Clerk API automation;
- public/admin navigation entry points and updated PRD/context coverage.

## Decisions

- A join request is not a Clerk account, `appUsers` row, role, catalog grant,
  or business ownership relationship.
- Email and WhatsApp/phone are required for the manual invitation handoff.
- Duplicate submitted, under-review, or approved normalized email/contact
  matches are rejected generically. Rejected applicants may submit a new row.
- No `withdrawn`, `invited`, or `accepted` state is implemented without backed
  behavior.
- Applicant history is preserved while `JOIN_REQUEST_RETENTION_POLICY` stays
  open.

## Security

`joinRequests.submit` is the only public write and returns no applicant data.
Admin/owner reads require `customers.read`; review mutations require
`customers.manage`. Customers and suspended admins are denied. Audit metadata
contains action/target only; contact data, invitation URLs, and tokens are not
logged.

## Validation and deferred work

Local validation is green: 75 Vitest tests, 48 Convex tests, lint with zero
warnings, typecheck, Next.js build, and `git diff --check`.

Real Clerk invitation acceptance, browser/runtime proof, rate limiting, final
retention/privacy policy, and account linking remain deferred to stable
staging or a later identity-lifecycle phase. No Preview, staging, Production,
or `main` operation is part of Phase 06.2.
