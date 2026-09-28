# QA Report

## Build and local regression

| Check | Result |
| --- | --- |
| Format | PASS |
| Lint | PASS |
| Typecheck | PASS |
| Tests | PASS — 120 files, 780 tests |
| Build | PASS — Next.js 16.3.6; 43 static pages; `/ready-stock` prerendered |
| `npm audit` | PASS — 0 vulnerabilities |
| Dependency resolution | PASS — `npm ls next --depth=0` resolves `next@16.3.6` |

## Live Preview routes

The earlier public-surface pass used the authenticated Vercel CLI bridge and returned HTTP 200 for these routes:

| Route | Result |
| --- | --- |
| `/` | PASS |
| `/ready-stock` | PASS |
| `/catalog` | PASS |
| `/community` | PASS |
| `/how-to-order` | PASS |
| `/account` | Initial public pass rendered the app shell; authenticated `/account/orders` gate and logout state passed in the closure below |
| `/sign-in` | App shell rendered; Clerk UI did not initialize |
| `/sign-up`, `/admin` | Redirected to Vercel Preview protection |

## Responsive checks

Preview and Production homepage were checked at 1440×900, 768×1024, 390×844, and 320×720. Every viewport had no horizontal overflow, a visible primary CTA, and all visible images rendered.

`QA-001` is **FIXED** at runtime. Blessy does not cover the CTA or important copy. When its position overlaps home copy the widget is hidden; after the hero copy clears it becomes visible again. Production runtime geometry checks passed at all four requested sizes.

## Production smoke closure — 2026-09-28

**Target:** `https://www.blessingforgood.com`, Vercel deployment `dpl_5KAMZBsi3SEHXGdZ2yLxwH173i69`, source `main` SHA `d946fe433841d868c301399f283a9edb2f4e9ac6`.

| Check | Result |
| --- | --- |
| `/`, `/ready-stock`, `/catalog`, `/community`, `/help`, `/how-to-order`, `/join`, `/sign-in` | PASS — HTTP 200 and page content rendered |
| Primary Ready Stock CTA and customer navigation | PASS |
| Anonymous `/admin` boundary | PASS — redirected to `/sign-in` |
| 1440×900, 768×1024, 390×844, 320×720 | PASS — no horizontal overflow; CTA usable; visible images rendered |
| QA-001 Blessy collision and clear-state behavior | PASS |
| Application console / CSP errors | 0 / 0 |
| First-party 5xx / critical request failures | 0 / 0 |
| HTTPS and TLS | PASS — HTTP 200, TLS verification result 0 |
| HSTS, CSP, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy` | Present |
| `X-Powered-By` | Absent |

Nineteen browser-extension errors appeared at 768 px and were excluded as tooling noise; no application-origin console errors were observed. The Production smoke used only safe page reads and a HEAD request. No accounts, form submissions, uploads, active scans, or mutations were performed.

## Initial public-only browser record


The initial pass did not have authenticated browser coverage. The following later closure on the current Ready deployment supersedes that limitation.

## Authenticated QA closure — 2026-09-27

**Target:** Current Ready Preview `https://blessing-for-good-9gb8tm1c8-masjaaks-projects.vercel.app`, branch `feat/clerk-identity-authorization-v0.1`, SHA `64e9bfa5c7d710274b9e8e468ce3c163ba8425e`; Clerk Development and Convex Development. Existing Vercel Protection Bypass for Automation was reused; Preview protection remained enabled.

The official Clerk Playwright helper authenticated USER_A, USER_B, ADMIN_TEST, and the existing Development owner. **119 live checks passed; cleanup passed.**

| Flow | Result |
| --- | --- |
| Preview access, homepage, `/ready-stock`, Clerk and Convex Development | PASS |
| Anonymous gate, direct protected routes, logout invalidation | PASS |
| USER_A/USER_B login and separate sessions | PASS |
| Address forms, order submission, invoices, payment confirmation | PASS |
| Known-ID cross-user order/address/invoice/payment/batch read and write | PASS — denied or filtered by ownership |
| Admin dashboard, user management, analytics, allowed user management | PASS |
| Customer admin calls; admin role changes/invitations/owner-only query | PASS — denied |
| Owner role promotion and owner-only test cleanup | PASS |
| Upload CORS, authorization, storage, attach and removal | PASS |
| Browser console, JavaScript errors, required network requests, application CSP | PASS — zero app errors, zero first-party failures/5xx, zero app CSP violations |

Anonymous and customer upload attempts returned 400 without creating storage. ADMIN_TEST uploaded and attached a valid test image, then it was removed. Nineteen Vercel Live injected script errors and six related CSP events were blocked; two 400 resource errors were expected upload denials. Clerk returned no 4xx/5xx responses.

Temporary Development users, addresses, catalog, batch, orders, invoices, confirmations, deposit entries, uploaded media, and test books were cleaned. App membership/join-request lifecycle rows are soft-removed by the application. Three focused local security suites passed 21 tests.
