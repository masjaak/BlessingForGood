# BFG MONTHLY SECURITY CHECKLIST

Review cadence: first week of each month
Owner: BFG Owner/Admin
Default: read-only observation; no dummy Production data

## Review Rules

- Record evidence and date every check.
- Do not print secret values, raw access codes, tokens, customer records, or
  payment proof contents.
- Use deterministic Development fixtures for mutation-heavy tests.
- Use legitimate existing Production records only where the operation is safe
  and operationally necessary.
- A finding involving exposure, auth bypass, cross-customer access, privilege
  escalation, or financial corruption is immediately `SEV-0` or `SEV-1`.

## Security Matrix

| Surface             | Status | Evidence / next action                                                                                                               |
| ------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| Authentication      | GREEN  | Clerk is the only canonical identity provider; local auth tests and live sign-in shell pass.                                         |
| Admin authorization | GREEN  | Server permission tests pass; live `/admin` redirects signed-out users to Clerk.                                                     |
| Owner authorization | GREEN  | Owner-only role/invitation guards are covered by deterministic auth tests; do not treat a successful Clerk login as Owner authority. |
| Customer ownership  | GREEN  | Orders, invoices, payments, deposit, batch, activity, inbox, and Secret Catalog ownership tests pass.                                |
| Suspension          | GREEN  | Suspended status fails closed in server tests and direct protected calls.                                                            |
| Secret Catalog      | GREEN  | Digest-only storage, pepper, expiry, revoke, scoped sessions, grants, and rate-limit tests pass.                                     |
| Media upload        | GREEN  | Server-side type/size/permission checks cover covers, gallery, payment proof, deposit proof, and import boundaries.                  |
| Financial guards    | GREEN  | Invoice, payment, deposit ledger, refund obligation, reservation, and idempotency tests pass.                                        |
| Environment secrets | GREEN  | High-confidence tracked-secret scan found no committed secret; values were not printed.                                              |
| Dependencies        | GREEN  | `npm audit --omit=dev` is clean after the `nanoid` security patch; release rollout remains subject to normal deployment.             |

## Authentication

- [x] Clerk remains the only authentication provider.
- [x] No email whitelist is used as authority.
- [x] No hardcoded Admin account grants access.
- [x] Successful Clerk login does not auto-create Admin/Owner authority.
- [x] `appUsers` membership/admission remains the BFG authorization boundary.
- [x] Sign-in redirect handling rejects external, protocol-relative, and unsafe
      schemes.

## Authorization / Session / Status

- [x] Signed-out user is denied Admin operations.
- [x] Active Customer is limited to Customer permissions.
- [x] Customer cannot call Admin or Owner-only mutations.
- [x] Owner-only role and access-management actions remain server-guarded.
- [x] Suspended users fail closed on refresh, direct route, API, mutation, and
      new-session paths in deterministic tests.
- [x] Session state is not treated as a substitute for BFG permission checks.
- [ ] If authenticated live UAT is scheduled, use approved identities only and
      record no private customer data in this report.

## Customer Ownership Isolation

Run deterministic A/B checks for:

- [x] Orders and order items.
- [x] Invoices and payment confirmations.
- [x] Deposit accounts, top-ups, and allocations.
- [x] Addresses and profile-owned records.
- [x] Batch membership, roster, and assignments.
- [x] Activity, Inbox, and Notifications.
- [x] Secret Catalog grants and scoped sessions.

Expected result: Customer A cannot read, mutate, or infer Customer B’s
records. Never use another real customer’s Production data for this check.

## Secret Catalog

- [x] Generated and supplied codes are converted to keyed digests.
- [x] Pepper is server-side configuration, not a client value.
- [x] No authoritative plaintext access-code field exists.
- [x] Expiry, revoke, grant, and scoped-session checks are server-side.
- [x] Anonymous and member unlock failures are rate-limited.
- [x] Rate-limit scope and generic failure responses remain intact.
- [x] Audit payloads, analytics, logs, and views do not contain raw codes or
      digests.
- [x] Browser persistence is limited to the intended scoped session boundary.

## Media / Uploads / External Preview

- [x] Cover upload requires Admin book permission and validates stored MIME and
      size.
- [x] Gallery upload requires Admin book permission, validates type/size, and
      prevents duplicate storage references.
- [x] Payment and deposit proof uploads require the owning Customer permission,
      type/size validation, and server-side storage references.
- [x] Bulk Import validates file type/size and retains its atomic/idempotent
      server boundary.
- [x] External Preview accepts HTTPS metadata only.
- [x] `javascript:`, `data:`, `file:`, unsafe schemes, and credential-bearing
      URLs are rejected.
- [x] No automatic fetch, iframe, scrape, or hotlink behavior is introduced.

## Financial Mutation Guards

- [x] IDR values are safe integers.
- [x] Invoice snapshots are preserved.
- [x] Deposit history is append-only.
- [x] Payment approval has one financial consequence.
- [x] Refund obligation and payout remain separate.
- [x] Ready Stock reservation/cancellation/fulfillment is atomic and
      idempotent.
- [x] Invalid invoice/payment/refund/batch transitions are denied.

## Environment / Git Secret Review

- [x] Inspect tracked files, examples, fixtures, documentation, and logs.
- [x] Confirm ignored local environment files are not tracked.
- [x] Check Clerk, Convex, Vercel, GitHub, AWS, Slack, and private-key patterns.
- [x] Report only secret category and location if exposure is found.
- [x] Do not rewrite Git history without explicit approval.

Initial result: no high-confidence secret signature was found in tracked files.
The local environment files were not copied into reports and their values were
not printed.

## Dependency Review

- [x] Inspect `package.json` and `package-lock.json`.
- [x] Run `npm audit --omit=dev`.
- [x] Classify updates as security, bugfix, low-risk, or breaking/defer.
- [x] Prefer the smallest security patch over a major upgrade.
- [x] Run the full relevant regression after a lockfile change.

Initial result: `nanoid` was patched from `3.3.17` to `3.3.18`; audit result is
zero vulnerabilities. The patch is local until released through the canonical
deployment path.

## Evidence Record

| Field                     | Initial review                                                                 |
| ------------------------- | ------------------------------------------------------------------------------ |
| Date                      | 2026-08-22                                                                     |
| Source commit             | `85908d9`                                                                      |
| Local Vitest              | `241/241`                                                                      |
| Local Convex              | `111/111`                                                                      |
| Local Playwright          | `264/264`                                                                      |
| Production data mutation  | None                                                                           |
| Critical security finding | 0                                                                              |
| Known active P0/P1/P2     | 0                                                                              |
| Unverified evidence       | Convex CLI selected-project health check; platform backup/restore capabilities |
