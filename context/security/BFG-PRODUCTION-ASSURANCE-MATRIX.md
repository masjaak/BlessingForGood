# BFG PRODUCTION ASSURANCE MATRIX

Status: `PHASE_09_2_TARGETED_ASSURANCE_ACTIVE` · evidence date 2026-08-22.
This matrix separates source/test evidence, safe Production observations, and
platform/account blockers.

| Category                           | Result                              | Evidence                                                                                                                                                     | Residual / next action                                                                                    |
| ---------------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| Authentication                     | `GREEN_EVIDENCE`                    | Clerk is canonical; no custom password storage; active appUser resolution and suspended checks pass                                                          | Provider credential-stuffing not tested by policy                                                         |
| Customer ownership                 | `GREEN_EVIDENCE`                    | Customer A→B order/invoice/payment/deposit/address/batch/activity/catalog attacks: 0 success                                                                 | Keep server ownership guards in shared helpers                                                            |
| Customer → Admin                   | `GREEN_EVIDENCE`                    | Direct representative Admin mutations denied in Convex fixture                                                                                               | Extend same shared-guard coverage when adding any function                                                |
| Admin → Owner                      | `GREEN_EVIDENCE`                    | Admin invitation/role/status/settings/audit attacks denied                                                                                                   | Owner bootstrap remains a high-value server secret                                                        |
| Suspended access                   | `GREEN_EVIDENCE`                    | Suspended customer/Admin direct query/mutation attempts denied                                                                                               | Public content/Ready Stock remain intentionally public                                                    |
| Revoked Catalog                    | `GREEN_EVIDENCE`                    | Wrong/revoked code, grant, and old scoped session denied; no stale private projection                                                                        | Anonymous gateway remains intentionally public-scoped                                                     |
| IDOR/BOLA                          | `GREEN_EVIDENCE`                    | 0 successful unauthorized reads; 0 successful writes                                                                                                         | Human references remain non-authoritative by contract                                                     |
| Client secret exposure             | `GREEN_EVIDENCE`                    | Local build + 17 Production browser chunks: no secret values                                                                                                 | SDK label false positive documented                                                                       |
| Admin/deploy key exposure          | `GREEN_EVIDENCE`                    | No `CONVEX_DEPLOY_KEY`, Clerk secret, Owner secret, or private key in browser/source values                                                                  | Provider rotation age not verified                                                                        |
| Hardcoded privileged identity      | `GREEN_EVIDENCE`                    | No hardcoded email/Gmail/Clerk ID/privileged allowlist; Owner is server env                                                                                  | Protect Owner env in platform controls                                                                    |
| Git history active secret          | `GREEN_EVIDENCE`                    | Gitleaks v8.30.1 scanned 177 reachable commits with 0 findings; TruffleHog v3.96.0 found 0 verified secrets and one deterministic test URI                   | Keep the dedicated history scan in release assurance                                                      |
| Current filesystem secret review   | `BLOCKED_PENDING_ROTATION`          | Dedicated scanners found only ignored local env-file candidates; no raw values were retained in evidence                                                     | Owner/provider review and rotation/revocation, then rerun both scanners                                   |
| Stored XSS / unsafe HTML           | `GREEN_EVIDENCE`                    | No production HTML injection sink; inert payload tests; React escaping                                                                                       | Image decode and decompression-bomb defenses remain bounded residual risks                                |
| Unsafe external URL fetch / SSRF   | `GREEN_EVIDENCE`                    | External Preview validates safe HTTPS metadata; no backend fetch/iframe/remote image fetch                                                                   | Recheck if integrations add server fetch                                                                  |
| Upload auth bypass                 | `GREEN_EVIDENCE_LOCAL`              | Shared server upload endpoint, purpose-bound storage claims, existing role/ownership/rate-limit checks, and deterministic unauthorized/reuse tests pass      | Not deployed; canonical Convex access required before release                                             |
| Upload content integrity           | `GREEN_EVIDENCE_LOCAL`              | JPEG/PNG/WebP/PDF signatures, declared MIME/extension consistency, bounded headers, structural checks, corrupt-file rejection, and safe error responses pass | Full image decode/dimension-bomb defense remains residual risk                                            |
| CSV binary masquerade              | `GREEN_EVIDENCE_LOCAL`              | Server parser rejects NUL payloads while preserving UTF-8/BOM, 2 MiB, 200-row, 5,000-character-cell, and exact-header contracts                              | Not deployed; canonical Convex access required before release                                             |
| Upload storage ownership           | `GREEN_EVIDENCE_LOCAL`              | A storage ID requires a server-created purpose/owner claim and is consumed by the attach/submit mutation                                                     | Existing legacy unattached blobs need lifecycle review                                                    |
| Dedicated malware scanning         | `NOT_REQUIRED_CURRENT_THREAT_MODEL` | Authenticated controlled uploads and sensitive proof privacy were evaluated; no public malware-analysis service was used                                     | Reconsider for anonymous uploads, higher volume, document expansion, observed abuse, or compliance demand |
| Bulk Import                        | `GREEN_EVIDENCE`                    | Parser bounds, atomic confirm, formula-safe export, Admin guard                                                                                              | Preview remains bounded query rather than rate-limited mutation                                           |
| Rate limiting                      | `REMEDIATED_GREEN`                  | Shared component covers catalog, join, order, stock, payment, deposit, uploads, import, invitation                                                           | Admin low-volume financial mutations are documented candidates, not blanket-limited                       |
| Input validation / mass assignment | `GREEN_EVIDENCE`                    | Explicit validators/patch fields, bounded strings/arrays/amounts/CSV                                                                                         | Broad-validator review remains maintenance work where not high risk                                       |
| Security headers                   | `GREEN_EVIDENCE`                    | Canonical Production emits CSP, HSTS, nosniff, Referrer-Policy, Permissions-Policy, XFO, and COOP; Admin redirect smoke is safe                              | CSP uses the documented `unsafe-inline` compatibility exception; no production `unsafe-eval`              |
| Dependencies                       | `GREEN_EVIDENCE`                    | `npm audit --omit=dev` returned 0 vulnerabilities after the Phase 09.1 code commit                                                                           | No runtime scanner dependency added except required Convex limiter component                              |
| Public HTTP scale                  | `VALIDATED_TO_CAPACITY_500`         | Post-deployment Profile A passes 10/50/100/300/500; 750 reached with 0 errors but p95 2,552 ms exceeded the 2,000-ms target                                  | 750 latency stop; 1,000 not run                                                                           |
| Authenticated realtime scale       | `BLOCKED_BY_SAFE_DATA`              | No 1,000 Production identities; deterministic tests only                                                                                                     | Requires safe synthetic identity strategy and platform telemetry                                          |
| Mutation correctness               | `GREEN_EVIDENCE`                    | Stock/payment/deposit concurrency suite passes in deterministic Convex fixtures                                                                              | Throughput not claimed                                                                                    |
| Vercel capacity telemetry          | `PLATFORM_LIMIT`                    | Hobby plan observed; metrics query returned `payment_required`                                                                                               | Upgrade/authorized observability access needed to isolate 750 boundary                                    |
| Convex tier/usage                  | `BLOCKED_BY_ACCOUNT_ACCESS`         | Current CLI session has no access to selected BFG project                                                                                                    | Owner/platform account access required                                                                    |
| Cost guardrails                    | `BLOCKED_BY_ACCOUNT_ACCESS`         | No Convex limit/spend configuration read; no changes made                                                                                                    | Verify in authorized control plane                                                                        |
| Database backup                    | `BLOCKED_BY_ACCOUNT_ACCESS`         | Current CLI identity cannot inspect the canonical BFG team/project; no manual backup was run                                                                 | Owner access checkpoint; verify plan, completion, cadence, retention, and size                            |
| Storage recovery                   | `BLOCKED_BY_ACCOUNT_ACCESS`         | File Storage inclusion and restore were not directly verifiable; no backup or restore was attempted                                                          | Owner access checkpoint; verify Storage inclusion and isolated restore                                    |
| RPO                                | `BLOCKED_BY_ACCOUNT_ACCESS`         | No actual backup cadence or completed backup evidence                                                                                                        | Set only after Owner-approved backup verification                                                         |
| RTO                                | `BLOCKED_BY_ACCOUNT_ACCESS`         | No isolated restore drill elapsed time                                                                                                                       | Set only after Owner-approved drill                                                                       |

## Required Numeric Result

```text
CROSS-CUSTOMER READ LEAK: 0
CROSS-CUSTOMER WRITE: 0
CUSTOMER → ADMIN BYPASS: 0
ADMIN → OWNER BYPASS: 0
SUSPENDED ACCESS: 0
REVOKED SECRET CATALOG ACCESS: 0
ACTIVE BROWSER SECRET: 0 found in inspected bundle/HTML
ACTIVE ADMIN/DEPLOY SECRET IN GIT HISTORY: 0 found
CURRENT FILESYSTEM SECRET REVIEW: REQUIRED for ignored local env material
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

## Phase 09.2 Release Boundary

The upload hardening commit is local and tested, but it has not been pushed or
deployed. Convex access remains blocked, so the required Convex deployment and
the dependent Vercel release were intentionally not attempted. The current
Production deployment therefore remains the previously verified Phase 09.1
application, not this Phase 09.2 upload implementation.

Dedicated scanner evidence is split by scope:

```text
GITLEAKS GIT HISTORY: PASS
GITLEAKS CURRENT FILESYSTEM: 7 findings in ignored local env files
TRUFFLEHOG GIT: 0 verified; 1 unverified deterministic test URI
TRUFFLEHOG CURRENT FILESYSTEM: 0 verified; 4 unverified candidates
P3 FINAL: BLOCKED_PENDING_SECRET_ROTATION_REVIEW
```

## Phase 09.2 Upload Content Integrity Evidence

This is an infrastructure/security correction only. It adds no Customer,
Admin, Catalog, Order, financial, or Product Media workflow.

### Upload surface inventory

| Surface           | Authoritative path                                                    | Accepted content                             |
| ----------------- | --------------------------------------------------------------------- | -------------------------------------------- |
| Book Cover        | Staff upload endpoint → purpose-bound claim → server action attach    | JPEG, PNG, WebP                              |
| Product Gallery   | Staff upload endpoint → purpose-bound claim → server action attach    | JPEG, PNG, WebP                              |
| Payment proof     | Customer upload endpoint → invoice-owned claim → server action submit | JPEG, PNG, WebP, existing PDF proof contract |
| Deposit proof     | Customer upload endpoint → deposit-owned claim → server action submit | JPEG, PNG, WebP, existing PDF proof contract |
| Bulk Import       | Existing bounded CSV parser                                           | UTF-8/BOM CSV only; no binary NUL payload    |
| Other file inputs | No additional BFG file input found in the source trace                | Not applicable                               |

### Server validation contract

The shared validator applies authorization and existing rate limits, checks the
declared size before reading content, reads only a bounded header, detects
JPEG/PNG/WebP/PDF signatures, and rejects unknown or inconsistent content. The
declared MIME type, filename extension, and detected type must agree. Browser
`File.type` is treated as a declaration, not proof. SVG is not an approved
format and is rejected.

The custom HTTP upload path validates the body before `ctx.storage.store`. A
server-created purpose/owner claim is required before any attach/submit path;
the claim is consumed atomically by the validated mutation. A storage ID alone
does not authorize attachment. If claim registration fails after a store, the
new blob is deleted. Abandoned but valid claims from a user who stops before
attachment are a lifecycle item for a future cleanup policy; no legitimate
attached media is deleted by this change.

CSV retains the existing UTF-8/BOM, 2 MiB, 200-row, 5,000-character-cell, and
exact-header contract. The server additionally rejects NUL/binary masquerade
payloads. Safe rejection messages do not expose parser stack traces.

Deterministic local fixtures cover valid JPEG/PNG/WebP, MIME/extension
mismatches, text/random/truncated files, oversized files, unsupported SVG,
CSV NUL, binary CSV masquerade, unauthorized users, cross-owner storage IDs,
and existing upload rate-limit paths. Full image decoding and pixel-dimension
limits were not added because the current runtime has no required image
decoder; bounded signatures and structural checks are the current ceiling.

### Malware scanning decision

| Option                                                   | Benefit                                                                                  | Cost / risk                                                                                            |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Signature, structure, authorization, and size validation | Immediate gap closure with no third-party data transfer, low latency, and no new service | Does not detect every malicious or polyglot payload; current image decode ceiling remains              |
| Private ClamAV-style service                             | Broader malware coverage under BFG control                                               | Service operations, queue/latency, patching, file retention, and deployment/data-residency work        |
| Private commercial scanning API                          | Managed detection and operational coverage                                               | Cost, privacy/data-processing review, latency, vendor dependency, retention, and residency obligations |

Current decision: `NOT_REQUIRED_CURRENT_THREAT_MODEL`. BFG uploads are
authenticated and controlled, and payment/deposit evidence may contain private
information; no file is sent to VirusTotal or another public analysis service.
Reconsider private scanning if anonymous uploads, materially higher volume,
PDF/document expansion, external contributors, an observed malicious upload,
enterprise compliance, or public file sharing becomes part of the threat
model.
