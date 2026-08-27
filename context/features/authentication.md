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

After authentication, a non-owner identity must match an approved Join request
with a non-`not_ready` invitation lifecycle state by normalized trusted email
before `users.ensureCurrentUser` provisions the customer. Existing active users
and the server-configured owner remain idempotent. A removed Customer retains
its BFG row and Clerk identity but is not active, cannot use protected Customer
operations, and cannot be reactivated by an old approved request; only a new
approved request may restore membership. Google authentication, if
enabled in Clerk, does not bypass this admission check. An active Customer is
redirected away from `/join`; Admin/Owner is never treated as Customer.

The client distinguishes Clerk loading, signed out, Convex loading,
provisioning, authenticated, suspended, removed, admission required,
permission denied, configuration missing, and network failure. Protected
queries do not mount before Convex auth and app-user state are ready.

The Clerk Backend SDK invitation action is server-only and receives
`CLERK_SECRET_KEY` through the Production Convex deploy command. Invitation
failure persists safe retry state; no Clerk URL, token, or provider error is
returned to the browser.
