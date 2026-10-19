# BFG — Owner Role Handover (Runbook / 2026-10-19)

**Status: PREPARED; NOT EXECUTED.** Owner target is the **existing BFG app user**
whose verified Clerk Production login corresponds to `madinaastrid96@gmail.com`.

## Access boundaries

- Convex Production: `clean-eel-522` / project `palevvi/blessingforgood`.
- Clerk Production: independent identity provider; find Madina's **Clerk User ID**
  under Users. A matching email is necessary but is **not** sufficient proof of identity.
- BFG `appUsers.role` is the app's permission source. Changing a Clerk email
  alone **does not** transfer the role.
- `BFG_OWNER_CLERK_USER_ID` is a **Convex Production** environment setting used
  when provisioning NEW `appUsers`. Change it separately after the role transaction.
- This does not transfer the external ownership/billing of Clerk, Convex,
  Vercel, Cloudflare, GitHub or the registrar.
- This migration is an **internalQuery/internalMutation**, not a public endpoint.

## Approval & prerequisites (all required)

1. Record BFG owner/business approval and handover date in writing.
2. Capture current Clerk Production owner subject and Madina's Clerk Production
   subject from the **same Clerk instance** (do not paste access tokens or keys).
3. Confirm Madina has personally signed into BFG recently using the intended email.
4. Back up/export Convex Production and record production release SHA.
5. Validate one existing Owner, one recipient (email `madinaastrid96@gmail.com`),
   both active, with correct Clerk IDs. Do not edit `appUsers` by hand.
6. Deployment containing `convex/ownerHandover.ts` must pass CI,
   be reviewed, and be deployed through the normal `main` production workflow.
7. Prepare both BFG sessions for a synchronous UAT, and retain access to
   Convex Deployment Settings for emergency rollback.

## A. Read-only preflight — production

From a checkout authenticated to the correct Convex project:

```bash
npx convex run ownerHandover:preflight \
  '{"newOwnerEmail":"madinaastrid96@gmail.com"}' --prod
```

**Required:** `ready: true`, `blockers: []`. Confirm
`currentOwnerClerkUserId` matches the old Owner in Clerk Production, and
`recipientClerkUserId` matches Madina's identity in Clerk Production.
Also check `currentOwnerAppUserId` and `recipientAppUserId`.

If any comparison is uncertain, STOP. Do not change the env var or run execution.
This step only reads data. The CLI output is sensitive internal account information.

## B. One-time atomic role swap — production

After explicit approval, use all IDs copied from the verified preflight.
The backend rechecks Owner uniqueness, the target email/status, the configured
Owner subject, and the exact IDs within a **single transaction**.

```bash
npx convex run ownerHandover:execute \
  '{"newOwnerEmail":"madinaastrid96@gmail.com","expectedOldOwnerAppUserId":"<OLD_CONVEX_APPUSER_ID>","expectedOldOwnerClerkUserId":"<OLD_CLERK_USER_ID>","expectedNewOwnerAppUserId":"<MADINA_CONVEX_APPUSER_ID>","expectedNewOwnerClerkUserId":"<MADINA_CLERK_USER_ID>","confirmation":"APPROVE_BFG_OWNER_HANDOVER"}' \
  --prod
```

The transaction demotes previous Owner to **active Admin**, promotes Madina to
**Owner**, and writes `owner.handover.completed` to `auditEvents`.
It does not delete users or edit invoices, deposits, orders, or user references.
A repeat call using the old IDs must fail; do not retry blindly.

## C. Immediately synchronize Convex Production owner configuration

```bash
npx convex env set --prod BFG_OWNER_CLERK_USER_ID '<MADINA_CLERK_USER_ID>'
```

Prefer the **Production → Settings → Environment Variables** UI if there is any
uncertainty about the current CLI project target. Double-check it is not
Development (`content-snake-214`). The environment change and DB mutation are
not a distributed transaction, so complete these steps together in a controlled
window. Keep the previous subject recorded privately for rollback.

## D. Authenticated operational verification (do not skip)

1. Madina signs out/in to refresh her Clerk + Convex state.
2. Madina sees **Pemilik** and can perform an Owner-only **read** operation
   (for example see user management and protected role management controls).
3. Former Owner signs out/in and cannot perform Owner-only actions; temporary
   Admin access may remain for handover/rollback.
4. Confirm exactly one `appUsers.role = owner`; check the
   `owner.handover.completed` audit event.
5. Verify basic orders, invoices, DP and permissions are unchanged.
6. If approved and handover acceptance is signed, Madina can suspend/revoke the
   former Admin membership, **after** verifying no operational dependency remains.
7. Record evidence, timestamp, final roles and approvals in the handover agreement.

## E. Controlled rollback, only if necessary

**Do not directly delete or reassign Clerk user IDs.**

If Madina cannot use Owner actions, first confirm her Clerk Production account
and BFG login session, and inspect the audit/roles. If rollback is required:

- Keep the former Owner `appUsers` record **active**, as this runbook does.
- The environment must identify the *current* DB Owner for the reverse transfer.
- Invoke the **same internal mutation in reverse**, using Madina's appUser ID +
  Clerk ID as expected old Owner, and the prior Owner's IDs/email as recipient.
- Then set `BFG_OWNER_CLERK_USER_ID` back to the former Owner's Clerk ID.
- Verify the previous Owner role works and Madina is no longer Owner.
- Document reason and audit event; arrange a fresh transfer attempt separately.

If the env update failed midway and doesn't match the DB Owner, correct it to
the current DB Owner *before* attempting the reverse transaction. Never change
roles in Convex's Data UI without an approved emergency procedure.

## Cleanup

Once the new Owner is fully operational and the transfer is accepted, remove the
temporary `convex/ownerHandover.ts` and its test in a follow-up PR. Leave
`auditEvents` intact. Re-run CI and normal deployment.

**No source-code PR, production role update or environment change constitutes
legal acceptance on its own. Confirm the handover agreement independently.**
