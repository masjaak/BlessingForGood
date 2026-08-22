# BFG SECRET EXPOSURE AUDIT

Status: `PHASE_09_2_FINAL_ASSURANCE / GREEN_EVIDENCE`;
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

## Dedicated Secret Scanners

Official release binaries were used outside application dependencies. The
downloaded artifacts were checksum-verified before execution:

| Scanner    | Version   | SHA-256                                                            | Installation result |
| ---------- | --------- | ------------------------------------------------------------------ | ------------------- |
| Gitleaks   | `v8.30.1` | `dfe101a4db2255fc85120ac7f3d25e4342c3c20cf749f2c20a18081af1952709` | PASS                |
| TruffleHog | `v3.96.0` | `a30d8f1095e031a81a668e1582f2ed479c3b50476cef86317e0fb74210c33617` | PASS                |

The scans ran against the full reachable Git history and a repository-only
filesystem view containing source, tests, docs, config, lockfiles, and ignored
environment files. Only generated dependency/build/test output and the
pre-existing untracked `artifacts/` directory were excluded from the
filesystem view. Scanner temporary output was kept outside the repository and
is removed after this evidence pass.

### Gitleaks

```text
GIT HISTORY: PASS — 177 commits scanned; 0 findings
CURRENT FILESYSTEM: 7 findings; exit 1 as expected for findings
```

The seven filesystem matches are confined to ignored local environment files:
three Vercel OIDC JWT matches, two public Clerk publishable-key matches, and
two Clerk secret-key-shaped matches. An additional `CLERK_SECRET_KEY` and a
`CONVEX_DEPLOY_KEY` name are present in another ignored preview environment
file but were not detector findings; they remain in the manual operator review
because provider state is not proven. Values were not copied into this report.

### TruffleHog

```text
GIT HISTORY: 0 verified; 1 unverified deterministic test URI
CURRENT FILESYSTEM: 0 verified; 4 unverified candidates
```

The filesystem candidates are three locally expired Vercel OIDC JWTs and the
same deterministic URI test fixture found in Git. TruffleHog emitted a
non-fatal macOS sandbox cleanup warning after each scan; the scans completed
with the counts above and exit code 0. No verified credential was reported.

### Finding classification and remediation

| Finding                                                             | Classification            | Evidence / action                                                                                                                                       |
| ------------------------------------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vercel OIDC token-shaped values in ignored local env files          | `TRUE_REVOKED_SECRET`     | Local metadata check shows expired; remove local cache through the operator's normal Vercel workflow and do not reuse                                   |
| `CLERK_SECRET_KEY` material in ignored local env files              | `UNKNOWN_REQUIRES_REVIEW` | Some local values have test-key format; provider active/revoked state is not proven. Owner must revoke/rotate in Clerk and update affected environments |
| `CONVEX_DEPLOY_KEY` material in ignored Vercel preview env metadata | `UNKNOWN_REQUIRES_REVIEW` | Not present in Git history; provider active/revoked state is not proven. Owner must revoke/rotate in Convex and Vercel if this is an active key         |
| Clerk publishable-key-shaped values                                 | `PUBLIC_KEY_BY_DESIGN`    | Public client configuration; no privileged capability by design                                                                                         |
| Deterministic `javascript:` / credential-shaped URL test case       | `TEST_FIXTURE`            | Existing adversarial test input in `convex/product-media.test.ts`; not a credential                                                                     |

The local filesystem findings are not Git-history exposure: tracked history
contains no active secret and no history rewrite is authorized or required on
this evidence. The unknown provider-side state is still a release blocker.
Do not paste any value into chat. After Owner/provider rotation or explicit
revocation review, rerun both scanners against history and the current
filesystem.

## Git History

- Tracked env-like paths: `.env.example` only; no tracked `.env`, private-key
  file, or deployment-key file.
- Historical path matches were `.env.example` documentation/configuration
  commits, not secret-bearing `.env` files.
- Regex scans across current tracked history found documentation examples,
  placeholders, and variable names; no active secret value was found.
- Gitleaks and TruffleHog were run over full reachable history after the
  Phase 09.2 upload commit; no active secret was found in history.
- No history rewrite is authorized or required. If provider review confirms an
  active value in an ignored local environment file, revoke or rotate first,
  update the provider environment, redeploy if required, verify the old value
  is invalid, and rescan; deleting a string is not remediation.

## Logs / Error Payloads / Audit

| Surface                   | Result                                                                                                          | Limitation                                               |
| ------------------------- | --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| User-facing Convex errors | Stable safe error codes/messages; no stack/environment return path found                                        | `ConvexError`/HTTP error body review is source-based     |
| Audit events              | Safe IDs/bounded metadata; raw Catalog code, token, proof, CSV, and auth values are excluded by source contract | deterministic tests cover code digest/audit isolation    |
| Vercel logs               | No Production error-level logs in the inspected 24-hour window                                                  | no error sample to inspect                               |
| Convex logs               | No raw log export available to current local account                                                            | `BLOCKED_BY_ACCOUNT_ACCESS`; do not claim fully verified |
| Browser console/network   | Safe Production HTML/bundle inspection; no secret values                                                        | no user auth session was created                         |

## Historical Phase 09.2 Result

```text
ACTIVE SECRET EXPOSURES: 0 confirmed; ignored local env rotation review pending
BROWSER-EXPOSED ADMIN/DEPLOY KEY: 0
HARDCODED PRIVILEGED IDENTITY: 0
GIT HISTORY ACTIVE SECRET: 0 found / Gitleaks + TruffleHog passed
RAW CATALOG CODE IN AUDIT/LOG CONTRACT: 0
CURRENT FILESYSTEM HIGH-CONFIDENCE UNKNOWN: 2 secret categories pending Owner review
```

The preceding result was the pre-rotation checkpoint. It is retained as
historical evidence; the final closure evidence follows.

## Phase 09.2 Final Credential Evidence — 2026-08-22

### Provider review and rotation

- Clerk rotation was completed by the operator. The retained local development
  files were moved out of the repository into a mode-700 restricted directory;
  no values are stored in Git or this report.
- Read-only Clerk provider checks against the current and local backup
  development values returned HTTP 200. The two local values were identical,
  so no second distinct local Clerk credential remained to revoke.
- Vercel environment metadata was rechecked after the operator update. The
  expected Production/Preview names remain scoped to the canonical project;
  sensitive values were not pulled or printed.
- A replacement Convex deploy key was created for `prod:clean-eel-522` and
  written to Vercel Production. The public Convex client URL was not changed.
  Preview remains a separate scope and does not use the Production key.

### Final scanner results

```text
Gitleaks v8.30.1 / full Git history: 0 findings
Gitleaks v8.30.1 / repository filesystem copy: 0 findings
TruffleHog v3.96.0 / full Git history: 0 verified; 1 unverified URI fixture
TruffleHog v3.96.0 / repository filesystem copy: 0 verified; 1 unverified URI fixture
fixture classification: deterministic adversarial product-media test input
active privileged secrets in Git history: 0
unknown high-confidence privileged findings: 0
```

The TruffleHog URI result is the known deterministic test fixture, not a
credential. Scanner reports and environment files remain outside the
repository. The filesystem scan excluded only `.git`, `node_modules`, `.next`,
and the pre-existing `artifacts/` directory; generated/vendor content was not
part of the release source.

### Final secret verdict

```text
ACTIVE PRIVILEGED SECRET EXPOSURE IN GIT: 0
ACTIVE PRIVILEGED SECRET EXPOSURE IN BROWSER BUNDLE: 0
UNKNOWN HIGH-CONFIDENCE PRIVILEGED FINDINGS: 0
PUBLIC PUBLISHABLE KEYS: allowed by design
P3: GREEN_EVIDENCE
```
