# BFG Deployment

## Phase status

```text
Phase 04.1 implementation: IMPLEMENTED
Local validation: GREEN
Runtime integration QA: DEFERRED TO STAGING
Production readiness: NOT READY
```

## Allowed target

During feature development, the current `feat/*` branch and local/Development
validation are in scope:

```text
feat/payment-verification-v0.1
Clerk Development
Convex Development
```

Do not merge to `main`, use `--prod`, promote a deployment, force-push, or
connect Production Clerk/Convex.

## Build

`vercel.json` runs:

```text
npx convex deploy --cmd-url-env-var-name NEXT_PUBLIC_CONVEX_URL --cmd "npm run build"
```

The command must never target Production and must not seed business records.
Branch-specific Preview builds are optional diagnostics and are not a phase
acceptance gate.

## Development policy

Every implementation phase requires:

- format and lint;
- typecheck;
- unit tests;
- Convex tests/codegen where relevant;
- build;
- negative authorization and financial-invariant tests where relevant.

Full browser and integration QA belongs to the stable staging gate, not every
transient Preview deployment.

## Phase 05.1 payment handoff

Phase 05.1 is implementation-complete when local format, lint, typecheck,
unit, Convex, build, authorization, and financial-invariant checks pass. A
transient Vercel/Convex Preview is not required. Real payment confirmation,
Clerk identity, realtime, browser, runtime-log, and data-cleanup evidence must
be collected later in the one stable staging environment.

## Branch model

```text
main
= release / Production line

develop
= BFG integration line

feat/*
= implementation branches
```

Feature branches merge into `develop`. `main` remains untouched during
product build. Staging is sourced from the approved `develop` integration
state; Production only comes from an approved release.

## Stable staging target

Staging will eventually use one stable Vercel deployment, one stable Convex
backend, and Clerk configuration appropriate for staging. This task documents
the target only; it does not configure staging infrastructure.

## Preview handoff evidence

Before the staging handoff, verify by names/counts only:

- Clerk Development keys and issuer configuration are present in the correct
  environments;
- Convex auth config accepts a signed-in Clerk JWT;
- affected staging tables are empty or contain only known QA records;
- the stable Vercel staging deployment is Ready;
- signed-out, owner, admin, customer A/B, suspended, and invitation flows pass;
- runtime logs contain no secrets or unexpected errors.

[LOCAL VERIFIED] Local Next.js build inputs and the Phase 04.1 validation
commands pass. Previous branch-specific Preview attempts are retained as
historical diagnostics only. No Production target was used.
