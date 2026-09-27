# Blessingforgood Security Architecture

Last verified on the testing environment: 2026-09-28. Audit evidence and tool
availability are summarized in [SECURITY_BASELINE.md](SECURITY_BASELINE.md).

## Environment map

| Environment | Application | Identity | Backend | Intended data |
|---|---|---|---|---|
| Production | Vercel Production (`main`) | Clerk Production | Convex Production | Real business data; smoke checks are read-only |
| Security testing and release Preview | Protected Vercel Preview on an authorized branch | Vercel authorized automation access, then Clerk Development | Convex Development | Disposable test identities and test records only |
| Local | Developer checkout | Configured non-production Clerk instance | Canonical Convex Development deployment | Local QA and deterministic fixtures |

```text
Production:
Vercel Production → Clerk Production → Convex Production

Security testing and release Preview:
Vercel Preview (authorized branch) → Vercel authorized automation access
                                   → Clerk Development → Convex Development
```

The Preview hostname is deployment-specific. Record and approve the exact host
or a narrowly scoped project pattern for each audit; do not make a temporary
Preview URL a permanent default.

The verified Clerk Development and Convex Development variables are scoped to
Vercel Preview without a Git-branch restriction, so authorized release and
security branches receive the same Development configuration. Production
variables remain Production-only. Preflight checks environment-variable names,
IDs, target, branch scope, and type without reading values; the Vercel build
credential gate verifies the actual Clerk and Convex classifications. The
Preview `CONVEX_DEPLOY_KEY` is not part of the Development configuration:
`SECURITY_STAGING_MODE=convex-dev` disables the Convex deploy command and
unsets that key before the frontend build.

## Environment boundaries

- Keep Vercel Preview protection enabled. Browser automation uses an authorized
  bypass/session held in the local secret manager or CI secret store.
- `scripts/vercel-build.sh` requires Development Clerk credentials and a
  verified Development Convex target for `SECURITY_STAGING_MODE=convex-dev`.
  That path only runs for `VERCEL_ENV=preview`, disables Convex deploy, and
  removes the deploy key before the frontend build. The Production case keeps
  the existing Production Clerk synchronization and Convex deploy path.
- Use Development services for active tests because tests may create or mutate
  identities, uploads, and business records. Keep financial, email, and
  webhook side effects disabled or connected only to explicit test sinks.
- Never point active scanners or mutation tests at Production. Never use a
  Production Clerk key, Production Convex deployment, real customer account,
  or real business record as a test fixture.
- Production verification is limited to safe GET navigation, anonymous access
  boundary checks, response headers, browser runtime, and responsive layout.
  Do not submit forms, upload files, create accounts, or run active scanners.

## Test identities and authorization

`tests/e2e/clerk-auth.spec.ts` uses Clerk's official
`@clerk/testing/playwright` helpers (`clerkSetup` and `clerk.signIn`) with
`BFG_E2E_CUSTOMER_EMAIL` and `BFG_E2E_OWNER_EMAIL`. Supply the Clerk testing
token and identity names through a protected environment; do not commit
credentials or Playwright authentication state. Run this browser suite only
against the approved Preview URL with `BFG_E2E_AUTH=true`.

The deterministic Convex suites create isolated Customer A, Customer B, Admin,
and Owner fixtures for direct server-side authorization checks. They cover
cross-customer access, customer-to-admin denial, admin-to-owner denial, and
role changes without using Production identities or data.

For the full role rules, read
[`context/security/BFG-RBAC-MATRIX.md`](../../context/security/BFG-RBAC-MATRIX.md)
and [`context/security/BFG-AUTHORIZATION-TEST-MATRIX.md`](../../context/security/BFG-AUTHORIZATION-TEST-MATRIX.md).

## Never store in Git or audit reports

Do not commit secret keys, auth tokens, session cookies, Vercel bypass values,
passwords, Clerk test tokens, Playwright storage state, HAR files, or raw
scanner output. `.gitignore` excludes Playwright auth state and raw audit
artifacts. Store only environment labels, tool versions, finding summaries,
and sanitized evidence references.
