# Security Baseline

## Verified Testing Baseline

- Testing branch: `feat/clerk-identity-authorization-v0.1`
- Verified testing SHA: `64e9bfa5c7d710274b9e8e468ce3c163ba8425e`
- Testing architecture: Vercel Preview → Vercel authorized automation access
  → Clerk Development → Convex Development
- Live browser checks: 119 passed
- Application console errors: 0
- JavaScript errors: 0
- First-party request failures: 0
- Application 5xx responses: 0
- Application CSP violations: 0
- Next.js: 16.3.6
- npm audit: 0 advisories
- Verified workstation tools: Node.js 24.12.0, npm 11.6.2, Playwright 1.62.1,
  Nuclei 3.11.1, OWASP ZAP 2.17.0, Vercel CLI 60.1.3, Convex CLI 1.43.0
- Authentication, authorization, ownership, Admin, Owner-only actions,
  role-tampering denial, API, forms, uploads, and Preview-origin CORS: PASS
- Nuclei and ZAP: PASS to the approved testing scope

## Findings and Decisions

| Finding | State | Evidence / decision |
|---|---|---|
| SEC-001 CSP inline allowances | Accepted risk | Authenticated regression passed with no application CSP violations; see `SECURITY_DECISIONS.md`. |
| SEC-002 Next.js advisory | Fixed | Next.js patched to 16.3.6; dependency audit reports zero advisories. |
| SEC-003 upload body size | Fixed | 5 MB streaming cap checks actual bytes and rejects forged or mismatched size declarations. |
| SEC-004 Preview deployment safety | Verified testing control | Preview credential gate rejects Production credential types and prevents Convex deploy-key exposure to the frontend build. |
| QA-001 Blessy/CTA collision | Fixed | Placement avoids the CTA and the widget hides if it would cover homepage copy. |

## Production Release Record

- Verified on: 2026-09-28
- Release branch: `security/blessingforgood-hardening`
- Release PR: #2, merged
- Release branch SHA: `484d4b01fd6c5e9064acd22cb8c31233809bca62`
- Production/main merge SHA: `d946fe433841d868c301399f283a9edb2f4e9ac6`
- Vercel Production deployment: `dpl_5KAMZBsi3SEHXGdZ2yLxwH173i69`, Ready; created 2026-09-28 06:11:45 Asia/Jakarta
- Production deployment source: `main` at `d946fe433841d868c301399f283a9edb2f4e9ac6`
- Production URL: `https://www.blessingforgood.com`
- Production environment: `VERCEL_ENV=production`; Clerk variables and Convex deploy key remain scoped to Production; the build rejects `SECURITY_STAGING_MODE` and runs the normal Production Convex deploy path. No credential values were read or changed.
- Production smoke: **PASS** — public routes and assets, mobile navigation/CTA, sign-in entry, anonymous `/admin` redirect, 1440/768/390/320 responsive layout, QA-001, zero application console errors, zero first-party 5xx/request failures, HTTPS/TLS verification, HSTS/CSP/`X-Content-Type-Options`/`X-Frame-Options`/`Referrer-Policy`/`Permissions-Policy` present, and `X-Powered-By` absent.
- Release gate: **PASS**
- Security audit: **COMPLETE_WITH_ACCEPTED_RISK**

Findings: `SEC-001=ACCEPTED_RISK`; `SEC-002=FIXED`; `SEC-003=FIXED`; `QA-001=FIXED`. Critical, high, and medium release-blocking open findings: 0.

Update this section and the audit reports only from observed release evidence.
