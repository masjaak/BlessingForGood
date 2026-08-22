# BFG NON-FUNCTIONAL ASSURANCE CONTRACT

## Status

`PHASE_09_1_PRODUCTION_ASSURANCE_ACTIVE` · evidence date 2026-08-22.
This supplements the functional PRD and does not add product features. The
functional scope remains `BFG_CURRENT_PRODUCT_SCOPE_COMPLETE` and the product
remains in `MAINTENANCE / ASSURANCE`.

## Purpose

Define measurable security, availability, performance, scale, cost, logging,
backup, and recovery obligations for the existing BFG Production system.
Evidence is classified as `GREEN_EVIDENCE`, `REMEDIATED_GREEN`,
`VALIDATED_TO_CAPACITY_X`, `PLATFORM_LIMIT`, `DOCUMENTED_NOT_DRILLED`,
`BLOCKED_BY_ACCOUNT_ACCESS`, or `BLOCKED_BY_SAFE_DATA`.

## Production Architecture

- Next.js 16 App Router on Vercel project `blessing-for-good`; canonical URL
  `https://www.blessingforgood.com`; current plan observed as Hobby.
- Clerk is the identity/session provider. BFG resolves the Clerk subject to a
  Convex `appUsers` row, then checks status, role, permission, and ownership.
- Convex Development is `content-snake-214`; Convex Production is
  `clean-eel-522`.
- Convex public query/mutation surface has 179 exported runtime functions in
  active source at audit time; no application HTTP actions, Next route
  handlers, or Server Actions were found.
- `@convex-dev/rate-limiter` is installed as a Convex component for the
  abuse-sensitive mutation paths listed in the rate-limit matrix.

## Security Objectives

1. Authentication is provider-backed and authorization is server-side.
2. A customer cannot read or mutate another customer's resource by ID,
   reference, or client-supplied ownership field.
3. Customer, Admin, Owner, and suspended status boundaries fail closed.
4. Server/deployment credentials and operational secrets never reach browser
   JavaScript, HTML, network payloads, logs, audit records, or Git.
5. Sensitive inputs, files, external URLs, and imported data are validated at
   the server trust boundary.
6. Abuse controls protect brute-forceable, expensive, state-changing paths
   without making ordinary bounded reads artificially stateful.

## Authentication

Clerk remains canonical. BFG does not store passwords, password hashes, custom
OTP secrets, or reset tokens. `requireIdentity` and `requireCurrentUser`
resolve provider identity to `appUsers`; `requireActiveUser` rejects suspended
rows before permission evaluation. Application code does not store Clerk
tokens in localStorage or query strings. The catalog gateway uses a separate,
catalog-scoped opaque session token in sessionStorage; it is not a Clerk
session token and is rejected after catalog/code revocation or expiry.

## Authorization

The server chain is:

```text
Clerk identity → appUser → active status → role → permission → ownership →
business-state guard
```

Frontend visibility is never authority. Shared helpers are in
`convex/lib/auth.ts`; privileged functions use `requirePermission` or
`requireOwner`; customer resource functions apply `requireOwnedResource`.

## Ownership Isolation

Cross-customer reads and writes were attempted against orders, invoices,
payment confirmations, deposits, addresses, batch/tracking, activity, and
catalog grants using deterministic Convex fixtures. Unauthorized results:
zero successful reads and zero successful writes. Human references remain
display identifiers; knowing a `BFG-*` reference does not bypass the ownership
query or permission guard.

## Secret Management

Server-only examples are `CLERK_SECRET_KEY`, `CONVEX_DEPLOY_KEY`,
`CLERK_JWT_ISSUER_DOMAIN`, `BFG_OWNER_CLERK_USER_ID`, and
`BFG_CATALOG_CODE_PEPPER`. Public-by-design values are the Clerk publishable
key and the Convex client URL. Values are never recorded in this contract.
Vercel environment metadata was inspected without reading secret values.

## Browser Exposure

The local production build and current Production HTML/JavaScript were scanned
for secret-key prefixes, deployment keys, private-key markers, bearer tokens,
owner secrets, catalog pepper material, and source-map references. No secret
value was found. A literal `CLERK_SECRET_KEY` string in the Clerk SDK was a
validation label, not a credential. See the secret exposure audit.

## Input Validation

Convex validators and domain validators bound IDs, enums, text lengths,
amounts, dates, pagination, CSV rows/cells/file size, and upload metadata.
Mass-assignment review found explicit field writes in sensitive mutations;
customer-controlled objects cannot set role, status, balance, ownership,
invoice state, or catalog grants. Broad validators and bounded scan ceilings
are listed as residual review items where applicable.

## Injection / XSS

No production `dangerouslySetInnerHTML`, `innerHTML`, `eval`, `new Function`,
raw SQL, shell execution, wildcard privileged CORS, or backend fetch of a
user-provided URL was found. React rendering remains escaped. Formula-control
values are protected at spreadsheet export boundaries. Stored-XSS fixtures
cover tags, script-like text, event-handler-like text, SVG-like text, and
script-scheme URLs; expected behavior is inert text or safe rejection.

## Upload Security

Cover, gallery, payment-proof, deposit-proof, and CSV entry points require the
appropriate active permission/ownership boundary. Convex Storage metadata is
checked for allowlisted content types and a 5 MB binary limit; gallery count is
bounded and CSV is capped at 2 MiB/200 rows/5,000 characters per cell. SVG,
HTML, path traversal, and remote-fetch bypasses are not accepted by the
current contracts. Independent byte-sniffing of every uploaded object remains
optional hardening because the current platform metadata boundary was not
replaced with a custom media scanner.

## Abuse Protection

Highest-risk operations are rate limited per operation and user where an
identity exists, with an anonymous/global bucket for public joins and catalog
unlock attempts. Authorization is evaluated before or alongside the limiter;
the limiter never substitutes for permission or ownership. Normal bounded
public reads use indexes/row caps rather than a mutation-backed limiter.

## Rate Limiting

The shared `convex/lib/rateLimit.ts` component policy is documented in
`context/security/BFG-RATE-LIMIT-MATRIX.md`. Exceeded requests return the safe
`RATE_LIMITED` code with a retry-after message. Policy values are
`PHASE_09_1_SECURITY_DEFAULT` where the functional source did not specify a
number.

## Availability

Production load testing is non-destructive and progressive. The public
read-heavy HTTP profile passed 10, 50, 100, 300, and 500 virtual users for the
bounded run; the 750-user level crossed the stop threshold with connection
failures and no 5xx responses, so 1,000 was not launched. Convex realtime and
authenticated session capacity were not substituted with a homepage-only
claim.

## Performance

For the tested public HTTP profile, provisional Phase 09.1 targets are p95 ≤
2,000 ms and p99 ≤ 5,000 ms with 0 unexpected 5xx and error rate below 5%.
These targets held through the 500-user level and failed at 750. The measured
values and harness parameters are in `context/performance/BFG-LOAD-TEST-REPORT.md`.

## Scalability

The explicit target is 1,000 concurrent active client sessions, not 1,000
simultaneous financial mutations. Profile A was measured against safe public
Production reads only. Profiles B and C are represented by deterministic
Development tests and were not claimed as Production 1,000-user capacity.
The current bottleneck is classified as `VALIDATED_TO_CAPACITY_500` with a
`PLATFORM_LIMIT`/observability limitation on root-cause isolation at 750,
not as application correctness failure.

## Capacity Target

Acceptance requires a representative workload, progressive ramp, latency and
error evidence, and no unexpected authorization or financial consequence. The
current result is: read-heavy public HTTP validated through 500; 750 stopped;
1,000 not validated. See the scalability contract for the exact verdict.

## Cost Guardrails

Vercel plan metadata identifies Hobby. Vercel Observability Plus metrics were
not available to the current project account, so live function queue metrics
were not obtained. Convex plan, usage limits, and spending configuration were
`BLOCKED_BY_ACCOUNT_ACCESS` because the local Convex CLI session is on a team
without access to the BFG project. No billing or limit setting was changed.

## Logging / Audit

Audit payloads use safe IDs, bounded metadata, and digest-only Secret Catalog
authority. Raw access codes, Clerk/Convex credentials, auth tokens, raw CSV,
proof content, and full private payloads are not intentionally written to
audit events or user-facing errors. User-facing errors use stable safe error
codes/messages; stack traces are not part of the application response
contract.

## Backup

Git and Vercel deployment history provide code/web rollback evidence. Convex
official documentation describes manual consistent backups and export/restore
capabilities, but the current Production backup configuration and a safe
restore drill were not verified through the authorized account. Storage/media
recovery is likewise not verified. See the updated Recovery Playbook.

## Recovery

No destructive Production restore is permitted for this phase. RPO and RTO
remain `NOT VERIFIED`; no numeric guarantee is made. A future Owner-approved
backup/restore drill must establish backup cadence, included files, restore
steps, data validation, and elapsed time before a supported RPO/RTO is set.

## RPO

`DOCUMENTED_NOT_DRILLED / NOT VERIFIED` for Convex tables and Storage.

## RTO

`DOCUMENTED_NOT_DRILLED / NOT VERIFIED` for Convex tables and Storage.

## Incident Response

Treat auth bypass, cross-customer exposure, privileged secret exposure,
stored XSS on a privileged surface, and financial corruption as P0/SEV-0:
contain, preserve redacted evidence, rotate/revoke affected credentials,
regress, deploy, verify, and only then resume assurance. Do not perform
credential stuffing or destructive Production penetration tests.

## Acceptance Criteria

- Cross-customer unauthorized reads/writes: 0.
- Customer-to-Admin and Admin-to-Owner direct mutation bypasses: 0.
- Suspended user access and revoked Catalog access: 0.
- Active browser/server/deployment secret exposure: 0.
- Stored XSS or unsafe external URL fetch: 0.
- High-risk abuse-sensitive paths covered by an explicit policy.
- Deterministic stock/payment/deposit concurrency preserves invariants.
- Full regression, build, typecheck, lint, format, dependency, and diff checks
  pass after corrections.
- Capacity report states the exact workload and measured ceiling; no generic
  1,000-user claim.
- Backup/recovery status distinguishes verified capability from documentation
  and account-access blockers.

## Known Constraints

- Convex tier/usage/backup configuration is not visible to the current local
  account and must not be guessed.
- Vercel live queue metrics require an unavailable paid observability surface.
- Profile A tests HTTP/public edge behavior, not Convex realtime sessions.
- No 1,000 Production identities or write-heavy Production bursts are created.
- Upload checks validate Convex Storage metadata; byte-level malware scanning is
  outside the current BFG implementation.

## Evidence

- `context/security/BFG-THREAT-MODEL.md`
- `context/security/BFG-ATTACK-SURFACE.md`
- `context/security/BFG-RBAC-MATRIX.md`
- `context/security/BFG-AUTHORIZATION-TEST-MATRIX.md`
- `context/security/BFG-RATE-LIMIT-MATRIX.md`
- `context/security/BFG-SECRET-EXPOSURE-AUDIT.md`
- `context/security/BFG-PRODUCTION-ASSURANCE-MATRIX.md`
- `context/performance/BFG-SCALABILITY-CONTRACT.md`
- `context/performance/BFG-LOAD-TEST-REPORT.md`
- `context/implementation/BFG-RECOVERY-PLAYBOOK.md`
- `convex/phase091-security.test.ts`
- `convex/phase091-concurrency.test.ts`
- `scripts/load/bfg-read-load.mjs`
