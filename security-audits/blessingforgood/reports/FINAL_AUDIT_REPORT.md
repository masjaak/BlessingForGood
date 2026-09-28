# Blessingforgood Final Security Audit

**Assessment and release closure date:** 2026-09-28

**Status:** `COMPLETE_WITH_ACCEPTED_RISK`

**Release gate:** `PASS` — verified fixes passed the clean release Preview and safe Production smoke.

## Scope and deployment

Security discovery and authenticated testing were limited to Vercel Preview and Convex Development. After the normal PR #2 Production deployment, the only Production application interactions were non-destructive public-route and header/TLS checks; no Production scans, mutations, or test-account creation were performed.

| Component | Verified target |
| --- | --- |
| Vercel | Ready Preview, `feat/clerk-identity-authorization-v0.1`, source SHA `64e9bfa5c7d710274b9e8e468ce3c163ba8425e` |
| Convex | Development, `dev/masjak`, `https://content-snake-214.convex.cloud` |
| Clerk | Development instance, existing project credentials |
| Clean release Preview | Ready, release SHA `484d4b01fd6c5e9064acd22cb8c31233809bca62`; credential gate PASS |
| Production | Ready deployment `dpl_5KAMZBsi3SEHXGdZ2yLxwH173i69`, `main` SHA `d946fe433841d868c301399f283a9edb2f4e9ac6`; safe GET/HEAD smoke only |

At authenticated audit time, the Ready testing deployment was `https://blessing-for-good-9gb8tm1c8-masjaaks-projects.vercel.app`; it mapped to the verified testing SHA above. The existing Vercel Protection Bypass for Automation was reused without exposing its value or adding it to Git or reports. `VERCEL_AUTOMATION_ACCESS=PASS`: the browser reached the real homepage and `/ready-stock`, loaded Clerk Development, and made Convex Development requests. Preview protection remained enabled.

The clean release Preview for PR #2 was also Ready at source SHA `484d4b01fd6c5e9064acd22cb8c31233809bca62`; its credential gate classified Clerk and Convex as Development and kept the Convex deploy command disabled. Production variable metadata remains Production-scoped. The Production build reported `VERCEL_ENV=production`; repository build logic rejects non-empty `SECURITY_STAGING_MODE` and uses the normal Production Convex deploy command.

The public-surface Nuclei/ZAP/TLS evidence below was collected in the previously documented public audit lane. It was not restarted for this authenticated closure.

## Coverage status

| Area | Status | Evidence / limit |
| --- | --- | --- |
| Dependencies | **PASS** | Resolved `next@16.3.6`; `npm audit` reported 0 vulnerabilities. |
| HTTP/TLS | **PASS** | Nuclei TLS checks found TLS 1.2/1.3 only, with no weak-cipher or certificate alerts. The certificate chain validates; Preview responses include HSTS, `nosniff`, frame denial, and strict referrer policy. |
| Nuclei | **PASS** | Nuclei 3.11.1, templates 10.4.9; update check found no newer templates. Eleven scoped HTTP templates and seven TLS-only templates completed; no CVE, exposed-file, weak-cipher, or certificate matches. Four HTTP informational matches remain. |
| ZAP Baseline | **PASS** | OWASP ZAP 2.17.0 with updated official add-ons discovered 152 URLs; the final passive summary covered 72 URLs, with 54 checks passed, 7 warning classes, and 0 failures. |
| ZAP Active | **PASS to safe extent** | Five low-strength rules ran for 28 seconds on the Preview bridge; write methods and external redirects were blocked. No failures. |
| Authentication | **PASS** | Official `@clerk/testing` Playwright integration and Clerk Testing Tokens authenticated USER_A, USER_B, ADMIN_TEST, and the existing Development owner. Anonymous gates, separate sessions, logout invalidation, and direct protected routes passed. Temporary identities were removed. |
| Authorization | **PASS** | Known-record two-user tests denied cross-user reads/writes for orders, addresses, invoices, payment confirmations, and batch tracking. Lists and batch views excluded the other user’s records. Forged owner/role fields were rejected. |
| Admin | **PASS** | Customer access to admin routes and admin-only records/mutations was denied. ADMIN_TEST reached dashboard, user management, and reporting; allowed user suspension/reactivation worked. Admin role changes, invitations, and owner-only cleanup queries were denied; owner role promotion and owner-only cleanup succeeded. |
| API / Convex | **PASS** | Applicable role checks covered anonymous identity/address operations; USER_A/USER_B ownership boundaries; admin read/manage operations; and owner-only catalog impact/cleanup. Tests used known Development IDs only. |
| Forms | **PASS** | Anonymous join-form acknowledgement validation and authenticated USER_A/USER_B address forms were exercised. Order submissions and payment confirmation were also exercised through Convex. |
| Uploads | **PASS** | Exact Preview-origin CORS preflight and browser CORS fetch passed. Anonymous/customer uploads were denied with no storage object; ADMIN_TEST upload succeeded, attached to a test book, and was removed. Local streaming-cap and forged-size tests also passed. |
| CSP | **PASS with accepted hardening risk** | Clerk, admin, forms, Convex, and upload flows completed with zero application CSP violations. `unsafe-inline` remains an accepted compatibility risk; `unsafe-eval` is absent. Preview-injected Vercel Live scripts remained blocked. |
| Secrets | **PASS** | Existing Clerk Development credentials were used only through environment variables and were not printed or copied into Git/reports. No service credentials were generated or rotated. The ambiguous key was not used in the audit lane; Production used its existing Production-scoped deploy configuration. |
| Browser / console | **PASS** | Zero application console errors, JavaScript page errors, first-party request failures, or first-party 5xx responses. Two Convex 400 console messages were the expected anonymous/customer upload denials. |
| Network | **PASS** | Clerk Development and Convex Development traffic succeeded, including authenticated Convex WebSocket connections. No unexpected first-party failures were observed. |

## Findings and closure

Open release-blocking severity counts are **Critical 0, High 0, Medium 0**. `SEC-001` remains one accepted Medium risk; there are 0 open High findings, 0 Low findings, and 3 informational observations. Counts group repeated scanner alerts by root cause.

| Finding | Severity | Closure | Evidence |
| --- | --- | --- | --- |
| `SEC-001` — CSP permits inline scripts/styles and broad image/service sources | Medium | **ACCEPTED RISK** | Authenticated Clerk, admin, form, Convex, and upload flows passed with zero application CSP violations. Keep the current policy for compatibility; reassess nonce/hash migration separately. |
| `SEC-002` — Next.js patch level | Informational | **FIXED** | Dependency resolution and the successful production build both report Next.js 16.3.6. |
| `SEC-003` — Upload size enforcement | Medium | **FIXED** | Release regression verifies the 5 MB streaming cap, actual-byte validation, and forged/mismatched-size rejection; authenticated Development upload authorization, CORS, storage, attachment, and cleanup passed. |
| `QA-001` — Blessy collision on narrow screens | QA | **FIXED** | Preview and Production runtime checks at 1440, 768, 390, and 320 CSS pixels show no CTA obstruction or horizontal overflow; Blessy hides when it overlaps homepage copy and reappears after the copy clears. |
| `SEC-004` — `X-Powered-By: Next.js` response header | Low | **FIXED** | `poweredByHeader: false` is in the testing SHA; the post-fix Preview response has no `X-Powered-By` header. |
| ZAP CORS alert on public HTML | Medium scanner alert | **FALSE POSITIVE for tested paths** | An untrusted Origin received `Access-Control-Allow-Origin: *` without `Access-Control-Allow-Credentials`. App source has no global wildcard CORS; the Convex upload action uses an explicit origin allowlist and the exact Preview origin passed live preflight and browser-fetch checks. |
| ZAP SRI / cross-domain script alerts | Medium/Low scanner alerts | **ACCEPTED RISK** | These identify Clerk-hosted Development SDK scripts; pinning a vendor-managed SDK is not practical without controlling its delivery. |
| ZAP redirect alert | Low scanner alert | **FALSE POSITIVE** | `/admin` and `/sign-up` redirect to Vercel Preview authentication; no sensitive redirect data was confirmed. |
| Missing CORP, COEP, and X-Permitted-Cross-Domain-Policies | Informational | **ACCEPTED RISK** | No exploit was demonstrated. COEP may disrupt Clerk/other cross-origin resources; the legacy Flash policy header is informational. |
| ZAP comments, framework, and cache observations | Informational | **NOT APPLICABLE** | Generic framework comments, Next.js identification, and standard static CDN caching. |

ZAP grouped 9 alert records in its final JSON report, including 2 informational records. Its summary reported 7 warning classes, 54 passes, and no failures. The post-fix scan no longer reports the `X-Powered-By` issue.

## Regression

The authenticated Preview regression completed **119 checks with cleanup PASS**. Three focused local suites passed: `phase091-security.test.ts`, `uatCleanup.test.ts`, and `upload-http.test.ts` (21 tests). The earlier audit’s format, lint, typecheck, 780 tests, production build, and `npm audit` (0 vulnerabilities) remain recorded; the build prerendered `/ready-stock` and resolved Next.js 16.3.6.

Live public-page checks returned HTTP 200 and rendered the homepage, `/ready-stock`, `/catalog`, `/community`, and `/how-to-order`. Responsive evidence is in `evidence/`. In the authenticated run, 19 Vercel Live injected script blocks and six related CSP events were observed; the application policy correctly blocked them. The two remaining console resource errors were expected upload-denial responses. Application console errors and application CSP violations were zero.

## Production smoke — 2026-09-28

PR #2 merged normally to `main` at `d946fe433841d868c301399f283a9edb2f4e9ac6`. Vercel Production deployment `dpl_5KAMZBsi3SEHXGdZ2yLxwH173i69` reached Ready from that SHA at 2026-09-28 06:11:45 Asia/Jakarta. Production configuration remained scoped to Production; no values were read, copied, or changed.

The non-destructive browser smoke passed for `/`, `/ready-stock`, `/catalog`, `/community`, `/help`, `/how-to-order`, `/join`, and `/sign-in` (HTTP 200). Anonymous `/admin` redirected to `/sign-in`. The Ready Stock CTA and mobile Catalog/home navigation worked. At 1440×900, 768×1024, 390×844, and 320×720 there was no horizontal overflow; visible images rendered; Blessy did not obstruct the CTA or important copy and reappeared after the hero copy cleared.

Application-origin console errors, CSP runtime failures, first-party 5xx responses, and critical first-party request failures were all 0. Browser-extension errors at 768 px were excluded as tooling noise. HTTPS returned HTTP 200 with TLS verification result 0; HSTS, CSP, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, and `Permissions-Policy` were present, and `X-Powered-By` was absent. No accounts, form submissions, uploads, active scans, or Production mutations were performed.

## Release decision

`RELEASE_GATE=PASS`, `PRODUCTION_DEPLOY=PASS`, and `PRODUCTION_SMOKE=PASS`. Authenticated coverage is complete for the tested roles and known Development records. `SEC-001` remains an accepted Medium hardening risk and is not a release blocker. `SEC-002`, `SEC-003`, and `QA-001` are fixed. PR #2 merged at the Production SHA above.

No service credentials were generated or rotated, and no credential value was emitted into logs or reports. Existing Development credentials were supplied to the testing process through environment variables. The audit lane did not use the unknown deploy key; the normal Production deployment used the existing Production-scoped Vercel configuration. Temporary Clerk identities, addresses, catalog, batch, orders, invoices, confirmations, deposit entries, book/media upload, and related test records were cleaned up; app membership/join-request lifecycle records are soft-removed by the application.
