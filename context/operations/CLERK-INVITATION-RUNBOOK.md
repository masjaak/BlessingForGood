# Clerk Development Invitation Runbook

This runbook uses Development only. Do not record invitee email, Clerk ID,
invitation URL, password, token, or auth storage in repository artifacts.

1. In Clerk Development, confirm Restricted Mode, email auth, and Convex
   integration by names/status only.
2. Create or use a Development invitation for a QA identity.
3. Open the invitation URL only in an isolated QA browser context.
4. Complete account acceptance through Clerk's `/sign-up` route.
5. Confirm the first protected Convex request provisions `appUsers` as
   `customer` unless the server bootstrap subject matches.
6. Sign out, sign back in, reload, and confirm the same app user is reused.
7. Confirm owner/admin/customer/suspended behavior using separate Development
   QA identities; never use real customer data.
8. Delete or clean only explicitly created QA records after counts are saved;
   stop if unknown business data is found.

Evidence labels:

- `[CLERK VERIFIED]` means a real Development Clerk action completed.
- `[CONVEX VERIFIED]` means a real authenticated Convex request returned the
  expected identity/authorization behavior.
- `[PREVIEW VERIFIED]` means the same proof ran against current Vercel and
  isolated Convex Preview.
