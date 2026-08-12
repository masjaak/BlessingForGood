# Authentication Feature

Clerk is the BFG identity provider. Invitation admission keeps the system
invite-only. Convex verifies the Clerk JWT, then BFG provisions/resolves
`appUsers` and applies application authorization.

Public users can browse `/`, `/community`, `/how-to-order`, `/help`, and
`/ready-stock`. `/join` accepts a pre-account Blessfriends request without
creating a Clerk account. Customer account pages render signed-out BFG states
before offering `/sign-in`; private data queries and admin resources remain
server-authorized. `/catalog` is a public token gateway whose private query
requires a valid scoped catalog session. `/sign-up` only renders when Clerk
supplies a valid invitation ticket; a public visit redirects home and cannot
create an arbitrary `appUsers` row.

After authentication, a non-owner identity must match an approved,
`invitationStatus=ready` Join request by normalized email before
`users.ensureCurrentUser` provisions the customer. Existing active users and
the server-configured owner remain idempotent. Google authentication, if
enabled in Clerk, does not bypass this admission check.

The client distinguishes Clerk loading, signed out, Convex loading,
provisioning, authenticated, suspended, admission required, permission denied,
configuration missing, and network failure. Protected queries do not mount
before Convex auth and app-user state are ready.

[DEFERRED TO STAGING] Real invitation acceptance and authenticated browser
evidence remain pending stable staging QA.
