# BFG PRODUCTION ASSURANCE MATRIX

Status: `PHASE_09_1_PRODUCTION_ASSURANCE_ACTIVE` · evidence date 2026-08-22.
This matrix separates source/test evidence, safe Production observations, and
platform/account blockers.

| Category                           | Result                      | Evidence                                                                                                                        | Residual / next action                                                                       |
| ---------------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Authentication                     | `GREEN_EVIDENCE`            | Clerk is canonical; no custom password storage; active appUser resolution and suspended checks pass                             | Provider credential-stuffing not tested by policy                                            |
| Customer ownership                 | `GREEN_EVIDENCE`            | Customer A→B order/invoice/payment/deposit/address/batch/activity/catalog attacks: 0 success                                    | Keep server ownership guards in shared helpers                                               |
| Customer → Admin                   | `GREEN_EVIDENCE`            | Direct representative Admin mutations denied in Convex fixture                                                                  | Extend same shared-guard coverage when adding any function                                   |
| Admin → Owner                      | `GREEN_EVIDENCE`            | Admin invitation/role/status/settings/audit attacks denied                                                                      | Owner bootstrap remains a high-value server secret                                           |
| Suspended access                   | `GREEN_EVIDENCE`            | Suspended customer/Admin direct query/mutation attempts denied                                                                  | Public content/Ready Stock remain intentionally public                                       |
| Revoked Catalog                    | `GREEN_EVIDENCE`            | Wrong/revoked code, grant, and old scoped session denied; no stale private projection                                           | Anonymous gateway remains intentionally public-scoped                                        |
| IDOR/BOLA                          | `GREEN_EVIDENCE`            | 0 successful unauthorized reads; 0 successful writes                                                                            | Human references remain non-authoritative by contract                                        |
| Client secret exposure             | `GREEN_EVIDENCE`            | Local build + 17 Production browser chunks: no secret values                                                                    | SDK label false positive documented                                                          |
| Admin/deploy key exposure          | `GREEN_EVIDENCE`            | No `CONVEX_DEPLOY_KEY`, Clerk secret, Owner secret, or private key in browser/source values                                     | Provider rotation age not verified                                                           |
| Hardcoded privileged identity      | `GREEN_EVIDENCE`            | No hardcoded email/Gmail/Clerk ID/privileged allowlist; Owner is server env                                                     | Protect Owner env in platform controls                                                       |
| Git history active secret          | `GREEN_EVIDENCE`            | Only `.env.example` env-like path; regex hits are docs/placeholders                                                             | gitleaks/trufflehog unavailable; install only if approved later                              |
| Stored XSS / unsafe HTML           | `GREEN_EVIDENCE`            | No production HTML injection sink; inert payload tests; React escaping                                                          | Upload byte-sniffing remains optional hardening                                              |
| Unsafe external URL fetch / SSRF   | `GREEN_EVIDENCE`            | External Preview validates safe HTTPS metadata; no backend fetch/iframe/remote image fetch                                      | Recheck if integrations add server fetch                                                     |
| Upload auth bypass                 | `GREEN_EVIDENCE`            | Role/ownership/type/5 MB/count checks and private proof projections covered                                                     | Dedicated malware scanning not implemented                                                   |
| Bulk Import                        | `GREEN_EVIDENCE`            | Parser bounds, atomic confirm, formula-safe export, Admin guard                                                                 | Preview remains bounded query rather than rate-limited mutation                              |
| Rate limiting                      | `REMEDIATED_GREEN`          | Shared component covers catalog, join, order, stock, payment, deposit, uploads, import, invitation                              | Admin low-volume financial mutations are documented candidates, not blanket-limited          |
| Input validation / mass assignment | `GREEN_EVIDENCE`            | Explicit validators/patch fields, bounded strings/arrays/amounts/CSV                                                            | Broad-validator review remains maintenance work where not high risk                          |
| Security headers                   | `GREEN_EVIDENCE`            | Canonical Production emits CSP, HSTS, nosniff, Referrer-Policy, Permissions-Policy, XFO, and COOP; Admin redirect smoke is safe | CSP uses the documented `unsafe-inline` compatibility exception; no production `unsafe-eval` |
| Dependencies                       | `GREEN_EVIDENCE`            | `npm audit --omit=dev` baseline 0 vulnerabilities; final rerun required after docs/code                                         | No runtime scanner dependency added except required Convex limiter component                 |
| Public HTTP scale                  | `VALIDATED_TO_CAPACITY_500` | Post-deployment Profile A passes 10/50/100/300/500; 750 reached with 0 errors but p95 2,552 ms exceeded the 2,000-ms target     | 750 latency stop; 1,000 not run                                                              |
| Authenticated realtime scale       | `BLOCKED_BY_SAFE_DATA`      | No 1,000 Production identities; deterministic tests only                                                                        | Requires safe synthetic identity strategy and platform telemetry                             |
| Mutation correctness               | `GREEN_EVIDENCE`            | Stock/payment/deposit concurrency suite passes in deterministic Convex fixtures                                                 | Throughput not claimed                                                                       |
| Vercel capacity telemetry          | `PLATFORM_LIMIT`            | Hobby plan observed; metrics query returned `payment_required`                                                                  | Upgrade/authorized observability access needed to isolate 750 boundary                       |
| Convex tier/usage                  | `BLOCKED_BY_ACCOUNT_ACCESS` | Current CLI session has no access to selected BFG project                                                                       | Owner/platform account access required                                                       |
| Cost guardrails                    | `BLOCKED_BY_ACCOUNT_ACCESS` | No Convex limit/spend configuration read; no changes made                                                                       | Verify in authorized control plane                                                           |
| Database backup                    | `DOCUMENTED_NOT_DRILLED`    | Official Convex backup/export docs read; deployment setting inaccessible                                                        | Verify cadence/retention and safe restore                                                    |
| Storage recovery                   | `DOCUMENTED_NOT_DRILLED`    | Storage references/rollback boundary documented                                                                                 | Verify included files/export/restore                                                         |
| RPO                                | `BLOCKED_BY_ACCOUNT_ACCESS` | No numeric guarantee without backup cadence evidence                                                                            | Set only after Owner-approved drill                                                          |
| RTO                                | `BLOCKED_BY_ACCOUNT_ACCESS` | No restore drill elapsed time                                                                                                   | Set only after Owner-approved drill                                                          |

## Required Numeric Result

```text
CROSS-CUSTOMER READ LEAK: 0
CROSS-CUSTOMER WRITE: 0
CUSTOMER → ADMIN BYPASS: 0
ADMIN → OWNER BYPASS: 0
SUSPENDED ACCESS: 0
REVOKED SECRET CATALOG ACCESS: 0
ACTIVE BROWSER/ADMIN/DEPLOY SECRET: 0 found
STORED XSS: 0
UNSAFE EXTERNAL FETCH: 0
UPLOAD AUTH BYPASS: 0
```

## Deployment Evidence

Code correction commit `ea724bc2e5503f9bf35b9963bc29ccbcc865b288` was pushed to
`origin/main` and deployed to Vercel Production as
`blessing-for-good-69pspwra1-masjaaks-projects.vercel.app` with state `READY`.
The canonical domain served the new headers and safe Admin redirect, and the
post-deployment read-only load run caused no business mutation. The follow-up
documentation commit records this evidence; no confirmed security fix remains
only in the working tree.
