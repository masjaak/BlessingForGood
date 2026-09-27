# Release Change Inventory

Compared `origin/main` at `58a4ff6e157fa4c9be78ebdbcb92e5a07591dcab` with
`feat/clerk-identity-authorization-v0.1` at
`64e9bfa5c7d710274b9e8e468ce3c163ba8425e`.

| Path | Class | Purpose | Tested | Production intended | Release action |
|---|---|---|---|---|---|
| `.gitignore` | B — test/staging infrastructure | Ignore Playwright auth state so tokens cannot be committed | YES | NO | INCLUDE (auth-state rule only) |
| `context/security/BFG-ATTACK-SURFACE.md` | D — reusable security documentation | Correct the HTTP upload inventory and bounded-stream description | YES | YES | INCLUDE |
| `convex/catalogAccess.ts` | A — production fix | Record the first repeated catalog-code lockout as a security audit event | YES | YES | INCLUDE |
| `convex/core.test.ts` | A — regression test | Assert the lockout audit event is recorded safely | YES | YES | INCLUDE |
| `convex/http.ts` | A — production fix | Enforce the 5 MB body cap while streaming and reject forged size declarations | YES | YES | INCLUDE |
| `convex/upload-http.test.ts` | A — regression test | Verify oversized forged-size requests are rejected without an upload claim | YES | YES | INCLUDE |
| `next.config.ts` | A — production hardening | Remove the `X-Powered-By` response header | YES | YES | INCLUDE |
| `package.json` | A — dependency remediation | Upgrade Next.js and align verified lint/test dependencies | YES | YES | INCLUDE |
| `package-lock.json` | A — dependency remediation | Lock the verified dependency versions | YES | YES | INCLUDE |
| `playwright.config.ts` | B — test/staging infrastructure | Use the authorized Vercel Preview bypass cookie in browser automation | YES | NO | INCLUDE |
| `scripts/vercel-build.sh` | A — release infrastructure fix | Fail closed on Production credentials in Preview; preserve the normal Production Convex deploy path | YES | YES | INCLUDE |
| `src/features/floating-blessy/floating-blessy-guide.tsx` | A — production fix | Keep Blessy from covering homepage copy and CTA | YES | YES | INCLUDE |
| `src/features/floating-blessy/floating-blessy-position.ts` | A — production fix | Include the homepage CTA as a placement obstacle | YES | YES | INCLUDE |
| `tests/config/vercel-build-guard.test.ts` | A — regression test | Prove Preview and Development credential guards stop unsafe builds before deploy | YES | YES | INCLUDE |
| `tests/convex/auth-config.test.ts` | A — regression test | Verify the normal Production Convex issuer synchronization remains wired | YES | YES | INCLUDE |
| `tests/e2e/floating-blessy.spec.ts` | A — regression test | Verify Blessy collision behavior across rendered viewport cases | YES | YES | INCLUDE |
| `tests/features/floating-blessy-position.test.ts` | A — regression test | Verify the CTA is excluded from bubble placement | YES | YES | INCLUDE |
| `vercel.json` | A — release infrastructure fix | Route Vercel through credential-checked build while retaining the Production deploy path | YES | YES | INCLUDE |

The final application diff omits the temporary Preview origin added to the
testing branch after the upload fix. Preview/Development build logic is kept
behind the script's `VERCEL_ENV=preview` gate; the Production case continues
to sync the existing Production Clerk settings and deploy to Convex Production.
