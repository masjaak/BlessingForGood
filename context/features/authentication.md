# Authentication Feature

Clerk Development is the BFG identity provider for Phase 04.1. Restricted
Mode and invitation admission keep the system invite-only. Convex verifies the
Clerk JWT, then BFG provisions/resolves `appUsers` and applies application
authorization.

Public users can browse `/`, `/community`, `/how-to-order`, `/help`, and
`/ready-stock`. `/join` accepts a pre-account Blessfriends request without
creating a Clerk account. Protected customer/admin resources redirect
signed-out users to `/sign-in`. `/sign-up` exists for valid invitation
acceptance and is not a public signup CTA.

The client distinguishes Clerk loading, signed out, Convex loading,
provisioning, authenticated, suspended, permission denied, configuration
missing, and network failure. Protected queries do not mount before Convex
auth and app-user state are ready.

[DEFERRED TO STAGING] Real invitation acceptance and authenticated browser
evidence remain pending stable staging QA.
