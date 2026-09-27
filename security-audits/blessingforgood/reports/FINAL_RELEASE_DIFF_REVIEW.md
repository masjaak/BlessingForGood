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

## Environment verification note — 2026-09-28

The eight Clerk Development and Convex Development Preview settings are now
Preview-wide, with no Git-branch restriction. Vercel variable IDs, names,
targets, types, and branch scopes were inspected; update requests changed only
`target` and `gitBranch`. No variable values were read, changed, or copied.
The existing Preview `CONVEX_DEPLOY_KEY` and the four Production-only
variables were left unchanged. Production still points to the READY deployment
for `main` at `58a4ff6e157fa4c9be78ebdbcb92e5a07591dcab`, with its domains
unchanged.

Metadata inventory (values intentionally omitted):

| Key | Target | Git branch | Type | Variable ID | Classification / Preview-wide decision |
|---|---|---|---|---|---|
| `NEXT_PUBLIC_CONVEX_SITE_URL` | Preview | — | encrypted | `PnFqa2Yll7guUCX8` | A — Development config; widened to all Preview branches |
| `NEXT_PUBLIC_CONVEX_URL` | Preview | — | encrypted | `q1P7bEbVHTf9uydi` | A — Development config; widened to all Preview branches |
| `CONVEX_TARGET_DEPLOYMENT` | Preview | — | encrypted | `jSsNYZMK2FyAOaEl` | A — Development config; widened to all Preview branches |
| `CONVEX_TARGET_REFERENCE` | Preview | — | encrypted | `TBaEH06HfsdFQYcd` | A — Development config; widened to all Preview branches |
| `CONVEX_TARGET_TYPE` | Preview | — | encrypted | `Z34p7Nvp1IJxTHwC` | A — Development config; widened to all Preview branches |
| `SECURITY_STAGING_MODE` | Preview | — | encrypted | `SNLrdzhiuqDPbHO2` | A — Development config; widened to all Preview branches |
| `CLERK_SECRET_KEY` | Preview | — | sensitive | `WNmr20xfocC3k6lg` | A — Clerk Development; widened to all Preview branches |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Preview | — | sensitive | `bdtcg1PutlV3HI8u` | A — Clerk Development; widened to all Preview branches |
| `CONVEX_DEPLOY_KEY` | Preview | — | sensitive | `AtJHFF19vfFKjd11` | D — Unknown; retained unchanged, not used by the `convex-dev` build |
| `NEXT_PUBLIC_BFG_PREVIEW_DEMO_MODE` | Preview | — | encrypted | `RnCHsCAHIXLouFBe` | D — Purpose not established; retained unchanged |
| `CLERK_JWT_ISSUER_DOMAIN` | Production | — | sensitive | `l6AAXhsR5xnuHDjp` | C — Production only; not Preview-wide |
| `CONVEX_DEPLOY_KEY` | Production | — | sensitive | `HTPesYjpeJvdNhUW` | C — Production only; not Preview-wide |
| `CLERK_SECRET_KEY` | Production | — | sensitive | `TlxLTGh5MuyyWa4Y` | C — Production only; not Preview-wide |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Production | — | sensitive | `8dpOeKU6Vw6C1M9C` | C — Production only; not Preview-wide |

The eight Development variables were branch-scoped to
`feat/clerk-identity-authorization-v0.1` before the metadata-only updates.
No value field was included in any update request. The Preview deploy key was
not promoted or used as a Preview build mechanism. No payment, transactional
email, or webhook credential names were present in the inspected inventory.

The redeployed PR Preview (`dpl_24oyfTPuZ8dq7XQPq6VJwxMWjDjQ`) is READY.
Its build reports `VERCEL_ENV=preview`, Development Clerk and Convex,
`SECURITY_STAGING_MODE=convex-dev`, `CONVEX_DEPLOY_COMMAND=DISABLED`,
`CREDENTIAL_GATE=PASS`, Next.js 16.3.6, a successful build, and static
prerendering of `/ready-stock`. The build wrapper unsets the Preview deploy
key before the frontend build.

Authenticated Vercel CLI HTTP checks returned 200 for the homepage,
Ready Stock, Catalog, Community, Help, How To Order, Join, and Sign In; the
anonymous `/admin` boundary redirected to the Sign In entry. The actual PR
Preview application passed the focused Ego Lite browser smoke. The sign-in
route rendered the Clerk Development entry, including Google sign-in, the
identifier form, and password input; no account was created.

The homepage passed at 1440 × 900, 768 × 1024, 390 × 844, and 320 × 720.
The Ready Stock CTA remained visible and clickable, visible images loaded, and
the document had no horizontal overflow. Blessy did not overlap the CTA or
visible hero copy. At 390 and 320 px, Blessy hid on hero-copy collision; after
scrolling that copy out of view, it reappeared with
`data-obstructing-home-copy=false` and stayed above the mobile navigation.
Desktop and tablet layouts showed Blessy without overlap. Desktop CTA/home
navigation and mobile Catalog/home navigation both worked.

## Release regression evidence

- Format: PASS
- Lint: PASS
- Typecheck: PASS
- Full tests: PASS (120 files, 780 tests)
- Vercel PR Preview build: PASS (Next.js 16.3.6; Development credential gate; Convex deploy disabled)
- Direct local build: BLOCKED (this worktree has no Clerk/Convex build configuration; no values were pulled)
- npm audit: PASS (0 vulnerabilities)
- Security regression harness: PASS (48 focused tests; target and credential guard self-checks)
- Secret leak check: PASS (31 changed paths; no environment files or credential values)
- Preview HTTP/browser smoke: PASS (homepage, Ready Stock, Catalog, Community, Help, How To Order, Join, Sign In, and anonymous `/admin` redirect)
- Responsive: PASS at 1440, 768, 390, and 320 CSS pixels; no horizontal overflow; CTA visible and clickable
- QA-001 runtime: PASS (Blessy hides on homepage-copy collision and reappears when the copy clears; no CTA overlap)
- Browser console/CSP: PASS (0 application errors; 0 runtime CSP failures)
- First-party network: PASS (0 5xx; 0 critical request failures; 0 broken visible images)
- Whitespace check: PASS

`RELEASE_DIFF_SAFE=PASS`, `VERIFIED_FIX_EQUIVALENCE=PASS`,
`VERCEL_PR_PREVIEW=READY`, and `PREVIEW_SMOKE=PASS`. Recheck the newest PR
Preview after the pending documentation commit before setting the final
`RELEASE_GATE`.

Production smoke and deployment identifiers are recorded after merge in
`docs/security/SECURITY_BASELINE.md` and the final audit reports.
