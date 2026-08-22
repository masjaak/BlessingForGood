# BFG PRODUCTION ASSURANCE MATRIX

Status: `PHASE_09_2_FINAL_ASSURANCE` · evidence date 2026-08-22.
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
| Admin/deploy key exposure          | `GREEN_EVIDENCE`                    | No `CONVEX_DEPLOY_KEY`, Clerk secret, Owner secret, or private key in browser/source values; provider rotation/update evidence recorded                     | Repeat after credential changes                                                                            |
| Hardcoded privileged identity      | `GREEN_EVIDENCE`                    | No hardcoded email/Gmail/Clerk ID/privileged allowlist; Owner is server env                                                                                  | Protect Owner env in platform controls                                                                    |
| Git history active secret          | `GREEN_EVIDENCE`                    | Gitleaks v8.30.1 scanned 177 reachable commits with 0 findings; TruffleHog v3.96.0 found 0 verified secrets and one deterministic test URI                   | Keep the dedicated history scan in release assurance                                                      |
| Current filesystem secret review   | `GREEN_EVIDENCE`                    | Local candidates moved outside Git; provider rotation/update completed; final Gitleaks/TruffleHog scans found no privileged secret                           | Keep restricted operator storage and rescan after credential changes                                      |
| Stored XSS / unsafe HTML           | `GREEN_EVIDENCE`                    | No production HTML injection sink; inert payload tests; React escaping                                                                                       | Image decode and decompression-bomb defenses remain bounded residual risks                                |
| Unsafe external URL fetch / SSRF   | `GREEN_EVIDENCE`                    | External Preview validates safe HTTPS metadata; no backend fetch/iframe/remote image fetch                                                                   | Recheck if integrations add server fetch                                                                  |
| Upload auth bypass                 | `GREEN_EVIDENCE_PRODUCTION`        | Shared server upload endpoint, purpose-bound storage claims, existing role/ownership/rate-limit checks, deterministic tests, and canonical Convex deploy pass | No unsafe fixture was uploaded to Production; live mutation remains intentionally data-safe              |
| Upload content integrity           | `GREEN_EVIDENCE_PRODUCTION`        | JPEG/PNG/WebP/PDF signatures, MIME/extension consistency, full bounded body, dimension/pixel bounds, structural/corrupt rejection, and production build pass | General image-processing stack remains out of scope                                                     |
| CSV binary masquerade              | `GREEN_EVIDENCE_PRODUCTION`        | Server parser rejects NUL/binary masquerade while preserving UTF-8/BOM, 2 MiB, 200-row, 5,000-character-cell, and exact-header contracts                    | No fake Production import was created                                                                      |
| Upload storage ownership           | `GREEN_EVIDENCE_PRODUCTION`        | Storage claims are server-created, purpose/owner-bound, consumed atomically, and deployed to `clean-eel-522`                                                  | Existing legacy unattached blobs need lifecycle review                                                    |
| Dedicated malware scanning         | `NOT_REQUIRED_CURRENT_THREAT_MODEL` | Authenticated controlled uploads and sensitive proof privacy were evaluated; no public malware-analysis service was used                                     | Reconsider for anonymous uploads, higher volume, document expansion, observed abuse, or compliance demand |
| Bulk Import                        | `GREEN_EVIDENCE`                    | Parser bounds, atomic confirm, formula-safe export, Admin guard                                                                                              | Preview remains bounded query rather than rate-limited mutation                                           |
| Rate limiting                      | `REMEDIATED_GREEN`                  | Shared component covers catalog, join, order, stock, payment, deposit, uploads, import, invitation                                                           | Admin low-volume financial mutations are documented candidates, not blanket-limited                       |
| Input validation / mass assignment | `GREEN_EVIDENCE`                    | Explicit validators/patch fields, bounded strings/arrays/amounts/CSV                                                                                         | Broad-validator review remains maintenance work where not high risk                                       |
| Security headers                   | `GREEN_EVIDENCE`                    | Canonical Production emits CSP, HSTS, nosniff, Referrer-Policy, Permissions-Policy, XFO, and COOP; Admin redirect smoke is safe                              | CSP uses the documented `unsafe-inline` compatibility exception; no production `unsafe-eval`              |
| Dependencies                       | `GREEN_EVIDENCE`                    | Clean release `npm audit --omit=dev` returned 0 vulnerabilities; Vercel Production build completed                                                           | No runtime scanner dependency added except required Convex limiter component                              |
| Public HTTP scale                  | `VALIDATED_TO_CAPACITY_500`         | Post-deployment Profile A passes 10/50/100/300/500; 750 reached with 0 errors but p95 2,552 ms exceeded the 2,000-ms target                                  | 750 latency stop; 1,000 not run                                                                           |
| Authenticated realtime scale       | `BLOCKED_BY_SAFE_DATA`              | No 1,000 Production identities; deterministic tests only                                                                                                     | Requires safe synthetic identity strategy and platform telemetry                                          |
| Mutation correctness               | `GREEN_EVIDENCE`                    | Stock/payment/deposit concurrency suite passes in deterministic Convex fixtures                                                                              | Throughput not claimed                                                                                    |
| Vercel capacity telemetry          | `PLATFORM_LIMIT`                    | Hobby plan observed; metrics query returned `payment_required`                                                                                               | Upgrade/authorized observability access needed to isolate 750 boundary                                    |
| Convex tier/usage                  | `PARTIAL_EVIDENCE`                  | Canonical access is green; project metadata did not expose a plan label, while the real export/import path completed                                        | Recheck plan/usage in the canonical dashboard during maintenance                                         |
| Cost guardrails                    | `NOT_VERIFIED`                      | No spending-limit mutation was made and no billing change was authorized                                                                                     | Verify before enabling automated backups                                                                   |
| Database backup                    | `GREEN_EVIDENCE`                    | Production snapshot export completed from `clean-eel-522`, was readable, and imported into an isolated target                                                | Manual export cadence is not automatic/guaranteed                                                        |
| Storage recovery                   | `GREEN_EVIDENCE`                    | Export used `--include-file-storage`; `_storage` and five Storage files imported and references resolved                                                     | Repeat after provider/storage policy changes                                                             |
| RPO                                | `MANUAL_NOT_GUARANTEED`             | One completed manual snapshot is evidenced; no automatic cadence was evidenced                                                                              | Tighten only after periodic backups are enabled and verified                                            |
| RTO                                | `GREEN_EVIDENCE`                    | Isolated import took 19 seconds; operational target includes detection, validation, configuration recovery, deploy/alias, and smoke margin                | Re-measure after material data/plan changes                                                             |

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
CURRENT FILESYSTEM SECRET REVIEW: 0 unknown privileged findings
STORED XSS: 0
UNSAFE EXTERNAL FETCH: 0
UPLOAD AUTH BYPASS: 0
```

## Historical Deployment Evidence

Code correction commit `ea724bc2e5503f9bf35b9963bc29ccbcc865b288` was pushed to
`origin/main` and deployed to Vercel Production as
`blessing-for-good-69pspwra1-masjaaks-projects.vercel.app` with state `READY`.
The canonical domain served the new headers and safe Admin redirect, and the
post-deployment read-only load run caused no business mutation. The follow-up
documentation commit records this evidence; no confirmed security fix remains
only in the working tree.

## Historical Phase 09.2 Release Boundary

The preceding section records the pre-closure state. It is retained as
historical evidence; the final release evidence follows.

Historical scanner evidence before provider closure was split by scope:

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
declared size before reading content, validates the complete bounded body,
detects JPEG/PNG/WebP/PDF signatures, checks image dimensions/pixel bounds, and
rejects unknown or inconsistent content. The
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
dimension-bomb headers, and existing upload rate-limit paths. A general image
processing stack was not added; the byte-level dimension and pixel bounds are
the current runtime-compatible ceiling.

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

## Phase 09.2 Final Release Evidence — 2026-08-22

### Release anchor

```text
final security source commit: 3f39bbc18bd4f1ce93f566f6386042c1bef51412
security implementation commit: 91634b4530ff58cfeee1f43bb92e8d5de8987075
origin/main: 3f39bbc18bd4f1ce93f566f6386042c1bef51412
working tree: unrelated user maintenance changes preserved and excluded
```

The release was built from a detached clean worktree containing only the
committed security/docs snapshot. The shared working tree was never reset or
stashed.

### Production deployment

```text
Convex: clean-eel-522, canonical team palevvi, deployed successfully
Vercel: dpl_HNK9pUeocNNq271UJ2vCECjrPgfr
Vercel state: READY
Vercel target: production
Vercel URL: blessing-for-good-q6jlhpdrj-masjaaks-projects.vercel.app
canonical aliases: www.blessingforgood.com, blessingforgood.com
Vercel build: production Next build passed; Convex deploy step passed
```

### Live route and security smoke

```text
/: 200
/how-to-order: 200
/catalog: 200
/ready-stock: 200
/sign-in: 200
/admin: 307 signed-out boundary
```

The canonical response included CSP, HSTS, X-Content-Type-Options `nosniff`,
Referrer-Policy, Permissions-Policy, X-Frame-Options, and COOP. Vercel
error-level logs for the new deployment over the verification window returned
zero records.

The Production HTML and 16 browser JavaScript assets were scanned without
printing contents: exact Clerk server-key match `0`, exact Convex deploy-key
match `0`, server-key-shaped values `0`, and privileged environment-name
matches `0`. A legitimate upload mutation was not invented for this gate;
Production upload regression is therefore `GREEN_DETERMINISTIC_NO_SAFE_REAL_DATA`
with deployment and live route/header evidence above.

### Final matrix

```text
P1 recovery: GREEN_EVIDENCE
P3 credentials: GREEN_EVIDENCE
P4 upload hardening: GREEN_EVIDENCE_PRODUCTION
authentication/RBAC/ownership: GREEN_EVIDENCE
successful IDOR/BOLA attacks: 0
client/server privileged secret exposure: 0 confirmed
upload authorization bypass: 0
known runtime dependency vulnerabilities: 0
high-risk rate limits: GREEN
security headers: GREEN
```
