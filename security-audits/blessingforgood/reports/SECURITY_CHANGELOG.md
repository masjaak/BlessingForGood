# Security Changelog

## 2026-09-28 — release and audit closure

- Corrected Vercel Preview scope for safe Development configuration so the clean release branch receives Clerk Development and Convex Development without copying or exposing credential values.
- Latest PR #2 Preview reached Ready at release SHA `484d4b01fd6c5e9064acd22cb8c31233809bca62`; credential gate and focused release smoke passed.
- PR #2 merged normally to `main` at `d946fe433841d868c301399f283a9edb2f4e9ac6`.
- Vercel Production deployment `dpl_5KAMZBsi3SEHXGdZ2yLxwH173i69` reached Ready from that SHA at 2026-09-28 06:11:45 Asia/Jakarta.
- Production metadata confirmed Clerk configuration and Convex deploy key remain scoped to Production; build reported `VERCEL_ENV=production` and used the normal Production Convex deploy path. No values were read or changed.
- Safe Production smoke passed public routes, mobile navigation/CTA, sign-in entry, anonymous admin redirect, 1440/768/390/320 responsive checks, QA-001, zero application console/CSP errors, zero first-party 5xx/request failures, and HTTPS/TLS. HSTS, CSP, nosniff, frame, referrer, and permissions headers were present; `X-Powered-By` was absent. No active scanners, account creation, uploads, or mutations were run.
- Final status: `SEC-001=ACCEPTED_RISK`; `SEC-002=FIXED`; `SEC-003=FIXED`; `QA-001=FIXED`; Critical/High/Medium release-blocking findings: 0.
- Security architecture, audit playbook, release checklist, decisions, audit template, and preflight harness preserve the Preview Development / Production separation and future audit entrypoint.
- No service credentials were generated, rotated, copied, or recorded.

## 2026-09-27

- Confirmed Ready Preview deployment `https://blessing-for-good-ok0w5nhqd-masjaaks-projects.vercel.app` uses testing branch SHA `6b81f409880cb86611bc899fb632021621015946`.
- Confirmed Vercel Production remains on `main` at `58a4ff6e157fa4c9be78ebdbcb92e5a07591dcab`; no Production app traffic or mutation was performed.
- Re-ran public browser route and responsive checks; stored six Preview screenshots under `reports/evidence/`.
- Re-ran 11 safe Nuclei templates after the `X-Powered-By` fix: no CVE or exposed-file matches; four informational observations.
- Ran seven TLS-only Nuclei templates against the single Preview hostname: TLS 1.2/1.3 detected; no weak-cipher or certificate alerts.
- Updated official ZAP add-ons and reran the final scan: 152 spider discoveries, 72 URLs in passive summary, 54 passes, 7 warning classes, 0 failures; 28-second active scan.
- Verified Preview security headers, CSP, TLS certificate-chain validation, and untrusted-Origin CORS behavior.
- The initial public-surface run recorded authenticated Clerk, authorization, admin, form, upload, and network coverage as gaps. The gaps were closed in the authenticated closure below.
- No service credentials were generated or rotated. Existing Development credentials were used only through environment variables and were not printed or exposed; the ambiguous `CONVEX_DEPLOY_KEY` was not used in the testing lane.
- At the end of 2026-09-27 the testing-only audit gate was PASS; release PR, merge, Production deployment, and Production smoke remained pending.

### Authenticated closure — later Ready Preview, 2026-09-27

- Used the current Ready Preview for `feat/clerk-identity-authorization-v0.1`, source SHA `64e9bfa5c7d710274b9e8e468ce3c163ba8425e`, with Clerk Development and Convex Development. Production remained untouched.
- Reused the existing Vercel Protection Bypass for Automation. Preview protection stayed enabled; the access value was not emitted or recorded.
- Authenticated USER_A, USER_B, ADMIN_TEST, and the existing owner using official Clerk Playwright testing helpers and Testing Tokens.
- Passed 119 live checks covering login/logout, protected routes, forms, cross-user resource isolation, role tampering, admin and owner boundaries, Convex APIs, uploads, browser network, and CSP.
- Anonymous and customer uploads were denied without storage; admin upload, attachment, and removal succeeded. Exact Preview-origin CORS preflight passed.
- Browser review found zero application console errors, page errors, first-party request failures/5xx, or application CSP violations. Vercel Live injected script blocks remained blocked; expected upload-denial responses were classified separately.
- Cleanup passed: temporary Clerk identities, app memberships, addresses, catalog, batch, orders, invoices, payment/deposit records, upload/media, book, and publisher were removed or soft-removed through existing Development lifecycle APIs.
- Local regression passed: `phase091-security.test.ts`, `uatCleanup.test.ts`, and `upload-http.test.ts` — 21 tests.
- Release gate: **PASS**. `SEC-001` remains an accepted Medium CSP hardening risk, not an open authenticated-coverage blocker.

## 2026-09-26

- Prior audit work verified the Next.js 16.3.6 patch, 5 MB upload streaming cap and forged-size tests, Blessy responsive fix, credential guard, local test suite, and Development staging architecture.
