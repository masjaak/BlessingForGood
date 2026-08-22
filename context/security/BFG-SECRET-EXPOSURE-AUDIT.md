# BFG SECRET EXPOSURE AUDIT

Status: `GREEN_EVIDENCE` for inspected source/build/Production bundle;
reviewed 2026-08-22. No secret values are reproduced here.

## Classification

| Class                 | Current BFG examples                                                                                                              | Browser allowed?                                                                                              |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| PUBLIC BY DESIGN      | Clerk publishable key, Convex client URL, public Vercel/Clerk/Convex hostnames                                                    | Yes, when required by the SDK/client                                                                          |
| SERVER-ONLY SECRET    | `CLERK_SECRET_KEY`, `CLERK_JWT_ISSUER_DOMAIN`, `BFG_OWNER_CLERK_USER_ID`, `BFG_CATALOG_CODE_PEPPER`, private join integration URL | No                                                                                                            |
| DEPLOYMENT CREDENTIAL | `CONVEX_DEPLOY_KEY`, Vercel/OIDC deployment credential                                                                            | No                                                                                                            |
| OPERATIONAL SECRET    | Any future private storage/payment/integration token                                                                              | No                                                                                                            |
| SCOPED BROWSER TOKEN  | Catalog session token in sessionStorage                                                                                           | Only as an intentionally scoped, expiring/revocable catalog capability; never a Clerk/admin/deploy credential |

## Source Audit

| Check                                | Result                                                                                                                                                              | Evidence                                                                                     |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_*` inventory            | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `NEXT_PUBLIC_CONVEX_URL`, and a Preview presentation flag are public/client configuration; no privileged value uses the prefix | `rg process.env/NEXT_PUBLIC_` source audit                                                   |
| `process.env` server/client boundary | Server-only values are read in Convex/server modules; client store only reads the public Convex URL                                                                 | `convex/users.ts`, `convex/auth.config.ts`, `convex/lib/*`, `src/domain/prototype/store.tsx` |
| Convex deployment key                | No client import/reference; only deploy tooling/docs/environment metadata                                                                                           | source scan and bundle scan                                                                  |
| Clerk secret/admin key               | No client value or hardcoded secret; SDK string label is not a value                                                                                                | source/build/Production scan                                                                 |
| Owner bootstrap identity             | Only `BFG_OWNER_CLERK_USER_ID` server environment; no hardcoded email, Gmail, Clerk ID, or privileged allowlist                                                     | source scan                                                                                  |
| Catalog pepper                       | Server-only digest helper; no pepper/session digest material in browser bundle                                                                                      | `convex/lib/accessCodes.ts`, bundle scan                                                     |
| Security randomness                  | Access codes and scoped sessions use Web Crypto `getRandomValues`; `Math.random()` is only used for a legacy human display identifier                               | `convex/lib/accessCodes.ts`, `src/domain/prototype/logic.ts`                                 |
| Custom password storage              | `0`                                                                                                                                                                 | no password column/hash/reset-token implementation outside Clerk                             |

## Build Bundle Scan

The local Production build and generated browser chunks were scanned without
printing values. The scan included secret-key prefixes, deploy-key patterns,
private-key markers, bearer-token fixtures, known server-only environment
values, catalog pepper markers, and source-map references.

| Pattern category                         | Result                                                                                        |
| ---------------------------------------- | --------------------------------------------------------------------------------------------- |
| Clerk secret credential value            | `0`; one SDK validation-label match for the literal name `CLERK_SECRET_KEY`, not a credential |
| Convex deploy key value                  | `0`                                                                                           |
| Owner secret / privileged identity value | `0`                                                                                           |
| Catalog pepper/digest secret value       | `0`                                                                                           |
| Bearer token fixture/value               | `0`                                                                                           |
| Private-key marker                       | `0`                                                                                           |
| Source-map reference in Production HTML  | `NOT_REFERENCED`                                                                              |

## Production HTML / Browser Surface

Canonical Production HTML and 17 browser-delivered JavaScript files were
inspected. The Clerk browser SDK and public Next chunks are present as
expected. No server secret value, deployment credential, access token, or
Owner bootstrap value was found. The application stores only the intended
catalog-scoped opaque session and catalog ID in sessionStorage; it does not
manually store Clerk session tokens, admin keys, or deployment credentials.

The scoped catalog token is a bearer capability within its documented catalog,
TTL, code-status, and revocation checks. It is not classified as a server
secret exposure because the anonymous gateway intentionally needs a browser
handle; it must remain short-lived, catalog-scoped, digest-only at rest, and
never appear in logs/errors/audit.

## Vercel Environment Metadata

Values were not read or printed. Metadata observed through authorized Vercel
CLI:

| Variable                            | Scope observed                                         | Sensitivity / decision                                                                                     |
| ----------------------------------- | ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| `CLERK_JWT_ISSUER_DOMAIN`           | Production                                             | Server-only configuration; non-sensitive metadata label, no browser use                                    |
| `CLERK_SECRET_KEY`                  | Production and Preview                                 | Sensitive server-only secret; no client exposure                                                           |
| `CONVEX_DEPLOY_KEY`                 | Production and Preview                                 | Sensitive deployment credential; no client exposure                                                        |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Production and Preview                                 | Public-by-design SDK configuration; Vercel metadata labels it sensitive but the value class is publishable |
| `NEXT_PUBLIC_BFG_PREVIEW_DEMO_MODE` | Preview                                                | Public presentation flag only; not an auth or privilege authority                                          |
| `NEXT_PUBLIC_CONVEX_URL`            | Injected by the configured Convex deploy/build command | Public-by-design client URL; not a credential                                                              |

No unexpected public-prefixed admin/deploy/private token was found. Stale-key
revocation and provider-side secret age cannot be proven from names alone;
credential rotation remains an Owner/platform hygiene responsibility.

## Git History

- Tracked env-like paths: `.env.example` only; no tracked `.env`, private-key
  file, or deployment-key file.
- Historical path matches were `.env.example` documentation/configuration
  commits, not secret-bearing `.env` files.
- Regex scans across current tracked history found documentation examples,
  placeholders, and variable names; no active secret value was found.
- `gitleaks` and `trufflehog` binaries were not installed, so a third-party
  scanner result is `NOT AVAILABLE`; the repository/history checks above are
  the evidence used for this pass.
- No incident/rotation was required. If a live value is ever found, revoke or
  rotate first, update the provider environment, redeploy, verify the old
  credential, and rescan; deleting a string is not remediation.

## Logs / Error Payloads / Audit

| Surface                   | Result                                                                                                          | Limitation                                               |
| ------------------------- | --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| User-facing Convex errors | Stable safe error codes/messages; no stack/environment return path found                                        | `ConvexError`/HTTP error body review is source-based     |
| Audit events              | Safe IDs/bounded metadata; raw Catalog code, token, proof, CSV, and auth values are excluded by source contract | deterministic tests cover code digest/audit isolation    |
| Vercel logs               | No Production error-level logs in the inspected 24-hour window                                                  | no error sample to inspect                               |
| Convex logs               | No raw log export available to current local account                                                            | `BLOCKED_BY_ACCOUNT_ACCESS`; do not claim fully verified |
| Browser console/network   | Safe Production HTML/bundle inspection; no secret values                                                        | no user auth session was created                         |

## Required Final Result

```text
ACTIVE SECRET EXPOSURES: 0 found
BROWSER-EXPOSED ADMIN/DEPLOY KEY: 0
HARDCODED PRIVILEGED IDENTITY: 0
GIT HISTORY ACTIVE SECRET: 0 found / scanner binary unavailable
RAW CATALOG CODE IN AUDIT/LOG CONTRACT: 0
```

Status is `GREEN_EVIDENCE` for the inspected artifacts with the explicit
`BLOCKED_BY_ACCOUNT_ACCESS` limitation for Convex log/config inspection.
