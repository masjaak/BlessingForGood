# Remediation Plan

## Release blockers

There are no remaining release blockers. Authenticated coverage passed on Vercel Preview with Clerk Development and Convex Development; PR #2 merged and the safe Production smoke passed.

| Work | Exit evidence | Status |
| --- | --- | --- |
| Authentication and session tests | Clerk Testing helper; USER_A, USER_B, ADMIN_TEST, owner; logout invalidation and protected routes | **PASS** |
| Two-user authorization and admin tests | Known-ID isolation for addresses, orders, invoices, payments, batch tracking; direct role/ownership tampering; admin and owner matrix | **PASS** |
| Authenticated APIs, forms, and uploads | Convex operations, address forms, order/payment operations; exact-origin CORS; anonymous/customer upload denied; admin upload attached and removed | **PASS** |
| Browser network, console, and CSP | Zero application errors, first-party failures/5xx, or application CSP violations | **PASS** |
| Development test-data lifecycle | Audit users, addresses, catalog, batch, orders, invoices, deposits, upload, media, book, and publisher cleaned | **PASS** |
| Clean release Preview and credential gate | Latest PR #2 Preview Ready; Clerk/Convex Development; Convex deploy disabled | **PASS** |
| Production release and smoke | Deployment Ready from main merge SHA; safe routes, auth boundary, responsive, runtime, TLS, and headers checked | **PASS** |

The authenticated Playwright run completed 119 checks with cleanup PASS. Three focused local security suites passed 21 tests. Production environment values were not changed; smoke was read-only and did not create accounts or data.

## Accepted hardening work

| Priority | Work | Exit evidence |
| --- | --- | --- |
| P2 | Assess a nonce/hash CSP for Next.js inline hydration and dynamic inline styles. | Existing authenticated flows pass; retain the current policy until a separate nonce/hash compatibility change is tested. `SEC-001` remains an accepted Medium risk. |
| P3 | Reassess COEP/CORP and legacy cross-domain policy headers. | Add only policies compatible with Clerk, Convex, images, and required resources; rerun browser tests when changed. |

## Previously completed

- Next.js resolves to 16.3.6; the deployment build passed.
- `X-Powered-By` is disabled and absent from Preview responses.
- SEC-003 is fixed: upload stream cap and forged-size local cases pass.
- Blessy narrow-screen collision fix passed live visual review at requested viewports.
- Nuclei and ZAP completed in the isolated Preview lane.
