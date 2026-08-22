# BFG THREAT MODEL

Status: `PHASE_09_1_PRODUCTION_ASSURANCE` · reviewed 2026-08-22 · current
Production source anchor `0c5d409c1abffa63be88ee80cc971d8c2253f5ae` before the
assurance correction commit.

## Security Boundary

```text
Clerk identity
  → Convex identity subject
  → BFG appUser
  → active status
  → role
  → permission
  → resource ownership
  → business-state transition
```

The browser is an untrusted client. Hidden routes, disabled buttons,
sessionStorage values, human references, and client-provided role/owner fields
are not authority. Convex function guards and transactional state checks are
the enforcement boundary.

## Actors

| Actor                            | Capability / threat                                                                        | Primary concern                                              |
| -------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------ |
| Anonymous attacker               | Can reach public pages, join submission, Ready Stock reads, and the Secret Catalog gateway | Scraping, spam, code brute force, malformed input            |
| Authenticated Customer           | Own customer permissions and own resources                                                 | IDOR/BOLA, mass assignment, abuse of state-changing paths    |
| Suspended Customer               | May possess old browser state or IDs                                                       | Reuse of stale identity/session                              |
| Revoked Customer                 | May possess old Catalog grant/session/code                                                 | Stale scoped access                                          |
| Malicious Customer               | Valid active identity with hostile inputs                                                  | Cross-customer access, injection, upload, enumeration        |
| Admin                            | Operational permissions, no role/security management                                       | Owner-boundary escalation, excessive data access             |
| Suspended Admin                  | Old privileged browser/session state                                                       | Reuse after suspension                                       |
| Compromised Admin session        | Valid privileged session controlled by attacker                                            | High-impact mutations, bulk actions, data export             |
| Owner                            | Full supported staff/security permissions                                                  | Bootstrap and concentration-of-privilege risk                |
| Compromised browser              | Can alter requests and read browser-delivered data                                         | Client-secret exposure, direct function invocation           |
| Automated bot / scraper          | High-volume public requests                                                                | Resource exhaustion, enumeration, catalog scraping           |
| Credential-stuffing actor        | Targets Clerk authentication                                                               | Provider boundary; not attacked by this audit                |
| Secret Catalog brute-force actor | Repeated invalid access codes                                                              | Code guessing, abuse, timing/error leakage                   |
| Malicious file uploader          | Can reach authorized upload flow or exploit metadata assumptions                           | XSS, oversized files, content-type mismatch                  |
| Malicious Bulk Import operator   | Authorized Admin with hostile CSV                                                          | Formula injection, parser/resource exhaustion, mass mutation |

## Assets

- Customer identity, session boundary, roles, statuses, and permissions.
- Orders, invoices, payment confirmations, deposit balances/history, refunds,
  addresses, batch membership, tracking, activity, and notifications.
- Secret Catalog codes, digests, grants, scoped session tokens, and catalog
  contents.
- Admin and Owner functions, invitations, role changes, settings, content,
  audit records, and operational book/product data.
- Convex Storage files: covers, gallery media, payment proofs, deposit proofs,
  and import artifacts.
- Clerk configuration, Convex deployment credentials, Vercel environment
  values, catalog pepper, Owner bootstrap subject, and operational URLs.

## Trust Boundaries

1. Browser ↔ Next.js/Vercel: all request fields and browser storage are
   attacker-controlled; response HTML/JS is public.
2. Browser ↔ Convex: public query/mutation invocation is possible even when a
   UI control is hidden.
3. Clerk ↔ BFG: a valid provider identity still needs an active BFG appUser.
4. Customer ↔ resource: an object ID/reference is not proof of ownership.
5. Admin ↔ Owner: operational permission is not security-management authority.
6. Upload client ↔ Convex Storage: client MIME metadata and file name are not
   intrinsically trustworthy.
7. Git/Vercel/Convex control planes ↔ Production data: code rollback does not
   restore already-written Convex data or Storage files.

## Threats and Controls

| Threat                                           | Control                                                                   | Evidence / residual                                                      |
| ------------------------------------------------ | ------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Customer reads another customer by ID/reference  | `requireOwnedResource`, owner-derived queries, indexed lookups            | `phase091-security.test.ts`; 0 successful attacks                        |
| Customer invokes Admin mutation directly         | `requirePermission` on Convex function                                    | Direct calls denied in Phase 09.1 suite                                  |
| Admin invokes Owner-only action                  | `requireOwner` and no email/domain shortcut                               | Admin role/suspend/invite attempts denied                                |
| Suspended user reuses session/ID                 | `requireActiveUser` precedes protected access                             | Suspended query/mutation attempts denied                                 |
| Revoked Catalog code/session reused              | Digest-only code/session checks, catalog/code status and expiry           | Existing core tests + Phase 09.1 checks                                  |
| Catalog code brute force                         | Shared global and per-user limiter; constant-time digest compare          | Component-backed limiter; deterministic invalid burst test               |
| Secret in browser bundle                         | Server-only environment naming and build/Production bundle scan           | 0 credential values found                                                |
| Historical Git secret                            | Tracked/history path and regex scan; scanner binary unavailable           | Only `.env.example`/documentation patterns; no active value found        |
| Stored XSS                                       | React escaping, no production HTML injection sink, inert input tests      | 0 production sinks; residual review only                                 |
| SSRF / remote content fetch                      | External Preview stores safe HTTPS metadata only; no server fetch         | Source review; unsafe schemes rejected                                   |
| Upload abuse                                     | Auth/ownership, 5 MB/allowlist/count bounds, safe storage references      | Convex storage validator tests; byte-sniffing optional                   |
| CSV resource/formula abuse                       | 2 MiB/200 rows/5,000 cell cap, strict parser, safe export                 | Bulk import and export tests                                             |
| Unbounded public scan                            | Indexes and `take`/pagination caps                                        | Source/query review; some Admin bulk projections remain bounded ceilings |
| Rate-limit bypass via client headers             | Keys derive from server identity; anonymous public bucket is server-side  | No trusted user-supplied identity header                                 |
| Financial race                                   | Convex transactions, inventory/ledger invariants, idempotent state checks | Deterministic concurrency suite green                                    |
| Control-plane rollback mistaken for data restore | Recovery Playbook explicitly separates code/web and data                  | Backup/RPO/RTO remain not verified                                       |

## Highest Risks

1. Convex plan/usage/backup configuration is `BLOCKED_BY_ACCOUNT_ACCESS`; the
   application cannot claim an operational recovery guarantee without that
   evidence.
2. Profile A public HTTP load stopped at 750 due connection failures and
   latency; Convex realtime/authenticated capacity and queue depth were not
   observable with the current platform access.
3. Upload validation uses Convex Storage metadata and limits; a dedicated
   malware/byte-sniffing pipeline is not part of the current product.
4. The Secret Catalog public gateway intentionally allows anonymous scoped
   access; its safety depends on code entropy, digest comparison, expiry,
   revocation, session scoping, and the new limiter.
5. Some Admin queries are bounded by fixed ceilings rather than cursor
   pagination; this is a known scale ceiling, not an authorization bypass.

## Out of Scope for This Audit

- Credential stuffing or password spraying against Clerk.
- Destructive or uncontrolled Production penetration testing.
- Creating 1,000 Production identities or write-heavy Production data.
- A destructive Production backup restore.
- New product features, payment gateways, automated WhatsApp, redesign, or
  permanent staging delivery workflow.

## Acceptance

The threat model is considered implemented only when every high-risk threat
has either an evidence-backed control or an explicit residual classification.
The final status is in `BFG-PRODUCTION-ASSURANCE-MATRIX.md`.
