# Blessingforgood Security Audit Playbook

Use this sequence for each audit. Start with
[`SECURITY_ARCHITECTURE.md`](SECURITY_ARCHITECTURE.md) and
[`SECURITY_RELEASE_CHECKLIST.md`](SECURITY_RELEASE_CHECKLIST.md). Preserve the
verified environment map and resume from the first incomplete phase; do not
repeat completed scans without a release-branch regression reason.

## Execution contract

Before testing, write down the target, environment, scope, exclusions, release
gate, allowed tools, destructive boundaries, and expected reports. The target
must be a protected Vercel Preview using Clerk Development and Convex
Development. Production is excluded from active scanning and mutation tests.
Do not print or store credential values.

## Current release gate vs future audit preflight

`scripts/security/preflight.sh` decides whether a **new full audit** may start.
It is not the current release gate. A future-audit `PREFLIGHT=FAIL` caused by
missing workstation automation, scanners, identities, or side-effect sinks
does not invalidate completed audit phases or a release backed by recorded
evidence. Continue from the first incomplete release phase and evaluate the
release checklist; do not rerun completed discovery or authenticated testing
solely to make future-audit preflight pass.

For a new audit, use the entrypoint below and do not start discovery until
`PREFLIGHT=PASS`.

## Audit acceleration rules

1. Solve authentication during preflight, before starting scanners.
2. Check Playwright, Nuclei, ZAP, Vercel CLI, and Convex CLI during preflight; install missing tools there.
3. Reuse the documented non-production identities and services; do not create credentials when existing test access works.
4. Read `SECURITY_ARCHITECTURE.md` before changing or rebuilding the staging path.
5. Resume from the first incomplete phase; do not repeat completed public scans just because authenticated coverage is missing.
6. Use Vercel automation access and Clerk testing helpers instead of browser dashboard login.
7. Treat unavailable scanners as a preflight issue, not a permanent coverage gap.
8. Require runtime evidence; code review and scanner output alone do not close an audit.

## Phase 0 — PREFLIGHT

**Inputs:** repository root, intended branch, approved Preview identity, test
identity strategy, side-effect status.

**Commands/tools:** read the architecture and checklist; run
`scripts/security/preflight.sh`; check repository status and branch; verify
Playwright, Nuclei, ZAP or a running Docker daemon, Vercel CLI, Convex CLI,
Node, npm, and Git. If a required scanner is missing, install it from its
official distribution and rerun preflight before discovery.

### VERIFY_PREVIEW_ENV_SCOPE

Preflight inspects Vercel environment-variable metadata only: name, ID,
target, Git branch scope, and type. It requires the Clerk Development settings
and Convex Development URL/target/staging settings to apply to Preview without
a branch restriction. It also checks authorized Preview access, Preview
availability, test identities, and disabled external side effects. Never
pull, print, or copy variable values.

The Preview `CONVEX_DEPLOY_KEY` is not a Development target or a release
preview prerequisite. Do not use it for Preview Development builds; the
`convex-dev` build path must report `CONVEX_DEPLOY_COMMAND=DISABLED` and unset
the key before building the frontend. The deployment's `CREDENTIAL_GATE`
confirms actual Development credential classifications.

**Expected output:** readiness lines for `PLAYWRIGHT`, `NUCLEI`, `ZAP`,
`VERCEL`, and `CONVEX`, each `READY` or `MISSING`, plus
`PREVIEW_ENV_CONFIG`, `CLERK_DEVELOPMENT_CONFIG`,
`CONVEX_DEVELOPMENT_CONFIG`, `RELEASE_PREVIEW_CAPABLE`, and the final
`PREFLIGHT` result.

When tools live outside `PATH`, pass their executable paths without exposing
credentials: `NUCLEI_BIN`, `ZAP_BIN`, `VERCEL_BIN`, and `CONVEX_BIN`.

**PASS:** required tools and Preview metadata scope are ready; Clerk
Development Customer and Owner identities are available; the protected
Preview is reachable through authorized automation; Preview and Development
targets are identified; active scans reject Production; payment, email, and
webhook effects are disabled or test-only. The build credential gate must
report Development classifications before application testing.

**FAIL / stop:** any required tool, identity, access method, environment label,
or side-effect boundary is unknown. Install or resolve it here, then rerun
preflight. Do not begin discovery until this phase passes.

**New-audit entrypoint:**

1. Read `docs/security/SECURITY_AUDIT_PLAYBOOK.md`.
2. Run `scripts/security/preflight.sh`.
3. Do not begin a new audit until `PREFLIGHT=PASS`.

## Phase 1 — ENVIRONMENT MAP

**Inputs:** Vercel project and Preview deployment, Clerk environment label,
Convex team/project/deployment labels, external-service configuration.

**Commands/tools:** inspect Vercel, Clerk, and Convex settings without pulling
secrets into the repository or printing values. Record the non-secret map in
the audit report: Production URL, Preview URL, Clerk environment, Convex
environment, test identities, storage, and side-effect systems.

**Expected output:** Production and test paths are explicitly distinguished;
the active target resolves to Preview + Clerk Development + Convex Development.
Verify that required Preview Development variables have no Git-branch scope,
so a clean release branch receives the same safe Development configuration.

**PASS:** the Vercel Preview build reports `CREDENTIAL_GATE=PASS`; Production
credential types are absent from Preview; Preview's Convex URL matches its
verified Development deployment; the Convex deploy key is not passed into the
frontend build.

**FAIL / stop:** an ambiguous deploy key, mismatched identity/backend
environment, unprotected Preview, or unknown data destination. Do not probe
the application until corrected.

## Phase 2 — PUBLIC SURFACE

**Inputs:** approved Preview URL and host, completed environment map, audit
report directory.

**Commands/tools:** run build, dependency audit, HTTP/TLS checks, public
Playwright routes, console/network checks, safe Nuclei templates, and ZAP
Baseline. Guard the host before every scanner command:

```sh
MODE=active TARGET="$TARGET_HOST" \
  APPROVED_PREVIEW_HOSTS="$APPROVED_PREVIEW_HOSTS" \
  scripts/security/target-guard.sh
npm run build
npm audit --audit-level=low
```

Use only the reviewed non-destructive Nuclei templates and keep request rate
low. Do not enable DAST/fuzzing, code, file, headless, or out-of-band
interaction templates. ZAP is Baseline/passive only; do not start ZAP Active
Scan. Keep reports outside source control. With the approved template bundle
and Docker ready, the scanner commands are:

```sh
"$NUCLEI_BIN" -u "$BFG_E2E_BASE_URL" -rl 2 -c 2 -no-interactsh -omit-raw \
  -t "$NUCLEI_TEMPLATES_DIR/http/technologies/tech-detect.yaml" \
  -t "$NUCLEI_TEMPLATES_DIR/http/misconfiguration/http-missing-security-headers.yaml" \
  -t "$NUCLEI_TEMPLATES_DIR/http/misconfiguration/weak-csp-detect.yaml" \
  -t "$NUCLEI_TEMPLATES_DIR/http/misconfiguration/vercel-source-exposure.yaml" \
  -t "$NUCLEI_TEMPLATES_DIR/http/exposures/files/webpack-sourcemap-disclosure.yaml" \
  -t "$NUCLEI_TEMPLATES_DIR/ssl/tls-version.yaml" \
  -t "$NUCLEI_TEMPLATES_DIR/ssl/expired-ssl.yaml" \
  -t "$NUCLEI_TEMPLATES_DIR/ssl/weak-cipher-suites.yaml" \
  -jsonl -o "$REPORT_DIR/nuclei.jsonl"
docker run --rm -v "$REPORT_DIR:/zap/wrk/:rw" ghcr.io/zaproxy/zaproxy:stable \
  zap-baseline.py -t "$BFG_E2E_BASE_URL" -J zap.json -r zap.html
```

The Nuclei allowlist matches the templates validated for this project. If
Docker is not ready for the ZAP Baseline command, install it during preflight
or use an explicitly reviewed local ZAP Automation Framework passive-only
plan; do not substitute Active Scan.

For browser checks use `playwright.security.config.ts` against the approved
Preview origin. It disables traces, screenshots, and video so authentication
material is not saved in test artifacts.

**Expected output:** build/audit results, public route matrix, TLS/header
summary, browser console/network summary, and scanner findings.

**PASS:** public routes load; no unexplained first-party errors or 5xx;
dependency audit is clear; scanner findings are triaged and within the release
gate.

**FAIL / stop:** Production hostname, Vercel checkpoint, host mismatch,
unexpected 5xx, credential mismatch, or an unreviewed finding. Stop scanning
on a checkpoint or safety response; do not try alternate Production paths.

## Phase 3 — AUTHENTICATED SURFACE

**Inputs:** approved Preview host, authorized Vercel automation access, Clerk
Development testing token, Customer and Owner test identities, disabled
external side effects.

**Commands/tools:** use `@clerk/testing/playwright` and the security Playwright
config via `scripts/security/regression.sh` with `MODE=active`. The harness
fails before requests if the host is not approved, the URL and host differ,
test identities are missing, or side effects are not explicitly disabled.

Test anonymous, Customer, and Owner browser paths. Use the deterministic
Convex suites for Customer A, Customer B, Admin, and Owner direct-call
coverage. Do not use dashboard login as the automation default.

**Expected output:** protected route behavior, signed-in route coverage,
console/network results, and a result for each required identity.

**PASS:** auth entry works; anonymous users are denied protected data; the
Customer and Owner paths match the role matrix; no console errors or critical
first-party failures.

**FAIL / stop:** unavailable test identity, Vercel bypass failure, missing
Clerk test token, or a Production environment. Fix preflight inputs; never
silently downgrade to anonymous-only results.

## Phase 4 — AUTHORIZATION

**Inputs:** known test resources created in isolated Development fixtures and
the current RBAC matrix.

**Commands/tools:** run `convex/phase091-security.test.ts`, `convex/auth.test.ts`,
and relevant domain tests. Call Convex functions directly; do not use hidden
UI controls as proof of authorization.

| Action | Anonymous | Customer | Admin | Owner |
|---|---|---|---|---|
| Public content | Allow | Allow | Allow | Allow |
| Own private data | Deny | Own records only | Explicit permissioned operational scope | Explicit permissioned scope |
| Another customer's private data | Deny | Deny | Only explicit operational projections | Only explicit permissioned scope |
| Admin route and operations | Deny | Deny | Allow by permission | Allow by permission |
| Staff invitation and role change | Deny | Deny | Deny | Owner-only; role transition rules apply |
| Owner-only action | Deny | Deny | Deny | Allow where implemented |

Do not treat the table as a grant of blanket staff access. Verify each action
against `BFG-RBAC-MATRIX.md` and the named Convex guard.

**Expected output:** allow/deny results for each row and links to the tests.

**PASS:** Customer A/B isolation, customer-to-admin denial, admin-to-owner
denial, and server-side enforcement pass.

**FAIL / stop:** any unauthorized read/write succeeds or an action's actual
permission is unclear.

## Phase 5 — DOMAIN-SPECIFIC TESTS

**Inputs:** Development-only upload, form, storage, order, or integration test
fixtures; external side effects disabled.

**Commands/tools:** run the smallest domain suites, including
`convex/upload-http.test.ts`, `tests/lib/upload-file.test.ts`, and the existing
form/API tests. Test upload authorization, actual streamed size, forged size
headers, file validation, ownership, and rate limits. Do not generate
Production uploads, orders, payments, or accounts.

**Expected output:** one result for each relevant form/API/storage boundary
and the underlying authorization rule.

**PASS:** only allowed Development fixtures change; rejection leaves no
business claim/record behind; no real external side effect occurs.

**FAIL / stop:** an unexpected record, external effect, authorization bypass,
or unbounded body.

## Phase 6 — REMEDIATION

**Inputs:** validated findings with evidence and affected code paths.

**Commands/tools:** validate each finding, trace it to the root cause, fix the
shared boundary, add one regression, redeploy Preview, and rerun the narrow
test followed by the required regression suite. Do not fix scanner noise
without reproducing it.

**Expected output:** finding disposition, code/test diff, Preview deployment
and retest evidence.

**PASS:** each real finding is fixed or recorded as an explicitly accepted
risk, with the regression passing.

**FAIL / stop:** unresolved release blocker, regression, or a finding that
cannot be reproduced or safely classified.

## Phase 7 — RELEASE GATE

**Inputs:** clean release branch from current `main`, reviewed file inventory,
test and scanner results, secret-sweep result.

**Commands/tools:** run the release checklist and `scripts/security/regression.sh`
in local mode; run `npm run format:check`, `npm run lint`,
`npm run typecheck`, `npm run test:run`, `npm run build`, and
`npm audit --audit-level=low`. Review the complete branch diff and scan only
committed candidate files for secrets without printing candidate values.

**PASS:** Critical = 0; unacceptable High = 0; release-blocking Medium = 0;
auth, authorization, Admin/Owner, API, forms/uploads, dependencies, tests,
build, security regression, secret sweep, and diff review all pass.

**FAIL / stop:** any gate fails or an unexplained file/configuration enters the
release branch. Do not merge.

## Phase 8 — PRODUCTION

**Inputs:** merged `main` SHA, normal Vercel Production deployment, public
Production URL.

**Commands/tools:** perform only the safe smoke test in the release checklist:
GET public routes/assets, anonymous protected-route redirect, login page,
response headers, browser console/network, and responsive viewports. Do not
run Nuclei, ZAP Active, uploads, forms, or mutation tests on Production.

**Expected output:** merged SHA, Vercel deployment ID/time/URL, smoke results,
and updated final audit reports.

**PASS:** core routes and auth boundary render; no major 5xx, blank page,
critical request failure, CSP blocker, or severe responsive regression.

**FAIL / stop:** record `PRODUCTION_SMOKE=FAIL`; use the existing Vercel
rollback mechanism if appropriate; do not report release completion.
