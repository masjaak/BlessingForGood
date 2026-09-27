# Final Release Diff Review

## Result

```text
RELEASE_DIFF_SAFE=PASS
```

Base: `main` at `58a4ff6e157fa4c9be78ebdbcb92e5a07591dcab`

Source inventory: `feat/clerk-identity-authorization-v0.1` at
`64e9bfa5c7d710274b9e8e468ce3c163ba8425e`

Release branch: `security/blessingforgood-hardening`

The release branch was created from the current `main` and received selected
verified fixes. It does not merge the testing branch.

## Reviewed scope

The complete tested-branch inventory is in
[`RELEASE_CHANGE_INVENTORY.md`](RELEASE_CHANGE_INVENTORY.md). All 18 changed
paths were classified and assigned an explicit release action. The release
candidate contains only the production fixes, their regression tests, the
small Preview credential guard required to keep Vercel Preview away from
Production, and sanitized reusable security documentation/harness files.

Included application fixes are Next.js 16.3.6, bounded upload streaming and
forged-size rejection, repeated catalog lockout audit events, removal of the
`X-Powered-By` header, and the Blessy/CTA overlap fix.

The Vercel build wrapper preserves the existing Production Clerk
synchronization and Convex Production deployment. Its Preview paths require
Development Clerk/Convex configuration and disable Production deployment.
No Production credential value or environment file was added.

Excluded from the release are the temporary Preview CORS hostname, raw
scanner/browser output, HAR files, auth state, test credentials, Vercel
bypass values, and unrelated testing-branch history or features. Playwright
uses only an environment variable reference for authorized automation access.

## Environment verification note

Vercel's current Development Preview variables are scoped to the tested
branch. The PR Preview deployment (`dpl_8sCAxPR1PkwSREARePSaJC983FiT`) ran the
build wrapper with unknown Convex/Clerk credential types and correctly stopped
at `CREDENTIAL_GATE=FAIL` before deploying Convex. The local Vercel CLI also
withheld the protected key. No credentials were copied and the guard was not
weakened. The standalone release build passed with Preview-scoped Development
Convex variables, but the Vercel Preview deployment for this branch failed.
The existing Development Preview configuration must be authorized for this
branch before the release gate can pass.

## Release regression evidence

- Format: PASS
- Lint: PASS
- Typecheck: PASS
- Full tests: PASS (120 files, 780 tests)
- Local build: PASS (Next.js 16.3.6, Preview-scoped Development environment)
- Vercel PR Preview build: FAIL (branch had no authorized Preview credential scope; guard stopped before Convex deploy)
- npm audit: PASS (0 vulnerabilities)
- Security regression harness: PASS (48 focused tests; target and credential guard self-checks)
- Secret leak check: PASS (29 staged files; no credential values printed)
- Whitespace check: PASS

The source diff is safe, but `RELEASE_GATE=BLOCKED` until the Vercel Preview
environment is approved for this release branch and its deployment succeeds.

Production smoke and deployment identifiers are recorded after merge in
`docs/security/SECURITY_BASELINE.md` and the final audit reports.
