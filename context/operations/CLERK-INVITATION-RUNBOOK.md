# Clerk Development Invitation Runbook

## Current BFG Admin workflow

The normal workflow is entirely inside BFG:

```text
Join Request → Admin review → Setujui → BFG sends/reuses Clerk invitation
→ BFG `/sign-up?__clerk_ticket=...` → authenticated bootstrap → active Customer
```

`joinRequests.approve` is audited and idempotent. The private Clerk Backend
SDK action resolves an exact existing identity or pending invitation before
creating one invitation. Admin uses `Kirim ulang undangan` only for a safe
failed/legacy state; opening Clerk Dashboard is not a routine step.

The Production Convex deployment receives `CLERK_SECRET_KEY` from the
server-only Vercel environment. No invitation URL, token, secret, or provider
error is stored or shown.

This runbook uses Development only. Do not record invitee email, Clerk ID,
invitation URL, password, token, or auth storage in repository artifacts.

1. In Clerk Development, confirm Restricted Mode, email auth, and Convex
   integration by names/status only.
2. Create or use a Development invitation for a QA identity.
3. Open the invitation URL only in an isolated QA browser context.
4. Complete account acceptance through BFG's invite-only `/sign-up` route.
5. If another Clerk session is already active, verify BFG shows the account
   mismatch message and `[Gunakan akun yang diundang]`; do not continue as the
   existing account. Use the action to sign out and restart the ticket.
6. Confirm the first protected Convex request provisions `appUsers` as
   `customer` unless the server bootstrap subject matches.
7. Sign out, sign back in, reload, and confirm the same app user is reused.
8. Confirm owner/admin/customer/suspended behavior using separate Development
   QA identities; never use real customer data.
9. Delete or clean only explicitly created QA records after counts are saved;
   stop if unknown business data is found.

## Historical Development acceptance verification

For an approved Development record, use the invitation delivered by BFG and
complete Clerk sign-up in an isolated QA browser context. The first trusted
authenticated BFG request provisions `appUsers` as `role=customer`,
`status=active`, and links the approved request. Do not create a second Clerk
identity or use a manual dashboard invitation to bypass the BFG path.

Evidence labels:

- `[CLERK VERIFIED]` means a real Development Clerk action completed.
- `[CONVEX VERIFIED]` means a real authenticated Convex request returned the
  expected identity/authorization behavior.
- `[PREVIEW VERIFIED]` means the same proof ran against current Vercel and
  isolated Convex Preview.
