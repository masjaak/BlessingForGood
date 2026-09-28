# Security Report

## Scope

- Public-surface audit Preview: `https://blessing-for-good-ok0w5nhqd-masjaaks-projects.vercel.app`, SHA `6b81f409880cb86611bc899fb632021621015946`.
- Authenticated closure Preview: current Ready deployment `https://blessing-for-good-9gb8tm1c8-masjaaks-projects.vercel.app`, branch `feat/clerk-identity-authorization-v0.1`, SHA `64e9bfa5c7d710274b9e8e468ce3c163ba8425e`.
- Backend: Convex Development (`dev/masjak`); Clerk Development.
- After the normal Vercel Production deployment, the app received only safe GET/HEAD smoke requests; no Production scans, account creation, or mutations were performed.
- Release PR #2 merged to `main` at `d946fe433841d868c301399f283a9edb2f4e9ac6`; Production deployment `dpl_5KAMZBsi3SEHXGdZ2yLxwH173i69` reached Ready from that SHA.
- The current Preview’s existing Vercel Protection Bypass for Automation was reused for Playwright. Preview protection stayed enabled; the bypass value was not emitted or recorded.
- Nuclei and ZAP targeted the prior public-surface Preview through `127.0.0.1:18765`. The bridge forwarded only `GET`, `HEAD`, and `OPTIONS`; write methods returned 405 and external redirects were blocked. Those scans were not restarted for this closure.

## Tools and results

| Tool | Version | Installation method | Result |
| --- | --- | --- | --- |
| Nuclei HTTP | 3.11.1 | Official ProjectDiscovery binary installed under `/private/tmp`; checksum verified. Templates updated with `nuclei -ut -ud`; no newer release was available. | 11 selected read-only HTTP templates; template version 10.4.9. Four informational matches; no CVE/exposure matches. |
| Nuclei TLS | 3.11.1 | Same verified binary and template set. | Seven TLS handshake templates found TLS 1.2 and TLS 1.3 only; no weak-cipher or certificate alerts. |
| OWASP ZAP | 2.17.0 | Official OWASP ZAP application bundle under `/private/tmp`; checksum verified; bundled Java 17 runtime. Official add-on update completed. | Spider found 152 URLs; final passive summary covered 72 URLs with 54 PASS, 7 warning classes, 0 FAIL. |
| ZAP active scan | 2.17.0 | OWASP Automation Framework plan using the installed bundle. | Five selected rules, low strength, one worker, 250 ms delay, 28 seconds; all requests remained in Preview scope. |
| Authenticated Playwright | `@clerk/testing` 2.2.19, Playwright | Existing Development Clerk credentials supplied only through environment variables; official Clerk Playwright helpers and Testing Tokens. | 119 live checks passed against the current Ready Preview and Convex Development; cleanup passed. |

Nuclei template selection covered four Next.js CVE checks, public configuration/exposure checks, Vercel source/config checks, HTTP security headers, CSP, and technology identification. It excluded destructive, brute-force, denial-of-service, and out-of-scope templates.

ZAP’s explicit official add-on update completed and downloaded the current add-on releases before the final run. Startup still emitted a stale background-update-check notice; the automation plan and reports completed successfully afterward.

## Findings

| ID | Severity | Observation | Disposition |
| --- | --- | --- | --- |
| SEC-001 | Medium | CSP contains `unsafe-inline` for script/style and broad image/service source expressions. | **ACCEPTED RISK** — authenticated Clerk, admin, forms, Convex, and upload flows passed with zero application CSP violations. Retain the policy; assess nonce/hash migration separately. |
| SEC-002 | Informational | Next.js patch level. | **FIXED** — Next.js resolves to 16.3.6; build passed. |
| SEC-003 | Medium | Upload size enforcement. | **FIXED** — the 5 MB streaming cap validates actual bytes and rejects forged/mismatched size declarations; local regression and authenticated Development upload checks passed. |
| SEC-004 | Low | `X-Powered-By: Next.js`. | **FIXED** — removed with `poweredByHeader: false`; absent from post-fix Preview response. |
| ZAP-01 | Medium scanner alert | Wildcard CORS response on public HTML. | **FALSE POSITIVE on tested public pages** — no credentials header; source has no global wildcard and the upload endpoint uses an origin allowlist. The exact Preview origin passed live upload preflight and browser CORS checks. |
| ZAP-02 | Medium/Low scanner alerts | Missing SRI and cross-domain script inclusion for Clerk-hosted Development SDK. | **ACCEPTED RISK** — vendor-managed script delivery. |
| ZAP-03 | Low scanner alert | Redirects from protected routes. | **FALSE POSITIVE** — redirect is to Vercel Preview authentication; no sensitive data leak confirmed. |
| NUC-INFO-01 | Informational | Missing Cross-Origin-Resource-Policy. | **ACCEPTED RISK** — no exploit demonstrated. |
| NUC-INFO-02 | Informational | Missing Cross-Origin-Embedder-Policy. | **ACCEPTED RISK** — enabling COEP without an authenticated integration regression could break Clerk or other cross-origin resources. |
| NUC-INFO-03 | Informational | Missing X-Permitted-Cross-Domain-Policies. | **ACCEPTED RISK** — legacy Flash policy header; no Flash integration is used. |

ZAP also reported generic framework comments, Next.js identification, and ordinary CDN caching; all are **NOT APPLICABLE**. ZAP's post-fix report contains no `X-Powered-By` alert.

## Authentication and authorization review

The current Ready Preview was opened through the existing supported Vercel automation bypass. Playwright reached the real application homepage and `/ready-stock`; Clerk Development loaded and Convex Development requests and WebSocket connections succeeded. Preview protection was not disabled.

The official `@clerk/testing` Playwright helper and Clerk Testing Tokens authenticated temporary USER_A, USER_B, and ADMIN_TEST identities plus the existing Development owner. Users were created only in Clerk Development using Clerk test-email conventions; no normal Clerk Dashboard login was automated. Their Playwright state was held in ignored local files and removed after the run.

Live checks passed for anonymous route/API gates, distinct sessions, logout invalidation, and direct protected routes. Cross-user known-ID reads/writes were denied for addresses, orders, invoices, payment confirmations, and batch tracking; own-resource lists and batch views excluded the other user’s records. Forged role/ownership fields were rejected. ADMIN_TEST reached dashboard, user-management, and reporting pages; customer attempts at admin routes and records were denied. Admins could suspend/reactivate customers but could not change roles, invite staff, or access owner-only cleanup queries; owner promotion and owner-only cleanup worked.

The app's backend operations are Convex queries/mutations and the Convex upload HTTP action; no Next.js `route.ts` handlers were found. Live authenticated calls exercised the important user, address, order, invoice, payment, deposit, batch, catalog, and upload operations against known Development records.

Authenticated address forms, join-form validation, order submission, and payment confirmation were exercised. Upload preflight allowed the exact Preview origin and required headers. Anonymous and customer upload attempts returned 400 without creating storage; ADMIN_TEST uploaded a valid image, attached it to a scoped test book, and removed it. The 5 MB streaming cap and forged-size handling also passed the local upload HTTP regression tests.

## HTTP, TLS, and secrets

Preview responses include HSTS (`max-age=63072000; includeSubDomains; preload`), `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, strict referrer policy, and a restrictive permissions policy. `X-Powered-By` is absent after remediation. Nuclei detected TLS 1.2 and 1.3; its templates found no TLS 1.0/1.1 support, weak cipher suites, expired/mismatched/self-signed certificate, or untrusted certificate root. OpenSSL also validated the Vercel wildcard certificate chain.

Production release verification: `VERCEL_ENV=production`; Clerk and Convex environment metadata target Production, with no values read or changed. The production build rejects any non-empty `SECURITY_STAGING_MODE` and uses the normal Production Convex deploy path. The safe browser smoke returned HTTP 200 for public routes, HTTPS TLS verification result 0, HSTS/CSP/`X-Content-Type-Options`/`X-Frame-Options`/`Referrer-Policy`/`Permissions-Policy` present, and `X-Powered-By` absent. No active scanner or mutation was run against Production.

Existing Clerk Development service credentials were loaded directly into the test process through environment variables and were never printed or copied into Git or reports. No service credentials were generated or rotated. The audit lane did not use the ambiguous Vercel `CONVEX_DEPLOY_KEY`; the normal Production deployment used its existing Production-scoped deploy configuration. Temporary Clerk identities, app memberships, addresses, catalog, batch, orders, invoices, confirmations, deposit entries, uploaded media, and test books were cleaned up; app membership/join-request lifecycle rows are soft-removed by the application.

The authenticated browser run reported zero application console errors, JavaScript page errors, first-party request failures, first-party 5xx responses, or application CSP violations. Nineteen Vercel Live injected script errors and six related policy violation events were blocked by the application CSP; two Convex 400 resource errors were expected upload denials. Clerk returned no 4xx/5xx responses during the run.
