# Join Requests Feature

Status: automatic Clerk invitation, membership activation, and Admin
membership removal are implemented in the canonical Production path.

## Boundary

`/join` is a public request-for-access form, not public signup. A join request
is not a Clerk account, an `appUsers` row, or Secret Catalog access. Approval
starts the server-side Clerk invitation reconciliation inside BFG Admin.

## Stored record

`joinRequests` stores the minimum v0.1 admission information:

```text
name
email + normalizedEmail
contact + normalizedContact
city?
note?
source
acknowledged
 status
 invitationStatus
onboardingPath?
 submittedAt
reviewedAt?
reviewedByUserId?
reviewNote?
rejectionReason?
createdAt
updatedAt
clerkInvitationId?
invitationSentAt?
invitationError?
removedAt?
removedByUserId?
removalReason?
```

Email is lowercased. Contact normalization trims, lowercases, and removes
spaces, periods, parentheses, and hyphens; it does not attempt international
phone parsing. This deterministic convention is only for v0.1 duplicate
detection.

## Lifecycle

```text
submitted → under_review → approved
                         ↘ rejected
```

Review transitions are forward-only. A rejected applicant may submit a new
request; the original row and audit events remain preserved. An approved row
uses `invitationStatus=pending`; the private Clerk action first resolves an
exact existing identity. Existing identity routes to `onboardingPath=sign_in`
without creating a signup invitation; a missing identity routes to
`onboardingPath=sign_up`, reuses one exact pending invitation, or creates one
invitation when needed. `ready` remains a legacy retryable state.

## Public workflow

Visitors provide name, email, WhatsApp/phone, optional city, optional note, and
an acknowledgement that submission does not create an account. The public
mutation validates and normalizes server-side, blocks an existing non-removed
submitted, under-review, or approved email/contact match, and blocks a matching
active Customer membership. It returns only a safe request identifier/status
response. A pending duplicate receives retry/review guidance; an approved
duplicate receives invitation/login guidance. Public queries cannot list or
read requests. The primary `bookInterest` value accepts the current practical
taxonomy plus legacy `Children Books`, `Collector Books`, and `Novel` values
without invalidating existing requests.

Authenticated users see an already-a-member state instead of the form.

## Admin workflow

`/admin/join-requests` is available to active admin/owner users. It supports
status filtering, bounded queue search, start review, approve, reject,
invitation retry, and Remove member. Its default operational projection hides
requests marked with `removedAt`; the Join Request and removal history remain
stored. All actions derive the reviewer from verified `appUsers`, write the
BFG state and audit event in one mutation, and reject stale transitions.
Approval and membership removal do not require Clerk Dashboard access.

Approved applicants remain pending until the server-side action records either
`sign_in_required` for an existing identity or one delivered signup
invitation. Invitation URLs, tokens, or auth storage are never stored in
Convex or repository artifacts. Explicit resend revokes the current pending
Clerk invitation before creating one replacement.

An approved Customer can be removed by Admin without deleting the Clerk
identity or any business record. Removal keeps the original approved row and
invitation fact as history, marks the admission as removed, deactivates the
Customer `appUsers` row, and writes one `membership.removed` audit event. A
removed request is excluded from duplicate and authenticated admission lookup;
the same email must submit and receive approval for a new request before the
membership can become active again. Pending Clerk invitations are revoked on a
best-effort server action; accepted invitations remain accepted history.

## Privacy and retention

Applicant contact data is admin-only and is never returned by an anonymous
query. Duplicate errors are generic. v0.1 preserves requests and review
history; `JOIN_REQUEST_RETENTION_POLICY` remains an open business/privacy
decision. Rate limiting remains an infrastructure/staging backlog; the current
boundary is deterministic validation and duplicate protection.
