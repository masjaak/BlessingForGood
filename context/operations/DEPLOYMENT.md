# BFG Deployment

## Canonical Convex backend

The canonical Convex account is `palevvi@gmail.com`, team is `palevvi`, and
project is `blessingforgood`. The development reference is `dev/masjak`.

```text
BFG_CANONICAL_CONVEX_TEAM=palevvi
BFG_CANONICAL_CONVEX_PROJECT=blessingforgood
BFG_CANONICAL_DEV=content-snake-214
BFG_CANONICAL_PRODUCTION=clean-eel-522
```

These are identifiers, not secrets. A separate similarly named BFG project
under another Convex account/team is `NON-CANONICAL`: do not use, deploy, or
configure it, and do not delete it automatically.

Verify the Convex team, project, and deployment before any Convex environment
operation. Never create a new BFG Convex project when configuration fails, use
a similarly named BFG project, or create a Preview-looking deployment
manually.

## Phase status

```text
Phase 06.3 implementation: IMPLEMENTED LOCALLY
Local validation: GREEN
Runtime integration QA: DEFERRED TO STAGING
Production readiness: NOT READY
```

## Allowed target

During feature development, only the current `feat/*` branch and canonical
local/Development validation are in scope:

```text
feat/*
Clerk Development
Convex Development: content-snake-214
Development reference: dev/masjak
```

Do not merge to `main`, use `--prod`, deploy Preview or Production, promote a
deployment, force-push, or connect Production Clerk/Convex.

## Build

`vercel.json` runs:

```text
npx convex deploy --cmd-url-env-var-name NEXT_PUBLIC_CONVEX_URL --cmd "npm run build"
```

The command must never target Production and must not seed business records.
Preview-looking builds are not an active BFG target; do not create or trigger
them manually.

## Development policy

Every implementation phase requires:

- format and lint;
- typecheck;
- unit tests;
- Convex tests/codegen where relevant;
- build;
- negative authorization and financial-invariant tests where relevant.

Full browser and integration QA belongs to the stable staging gate, not a
Preview deployment.

## Phase 06.2 admission handoff

The public `/join` request and `/admin/join-requests` review workflow are local
feature-complete. Approval sets a manual Clerk invitation handoff state only;
it does not create an account, role, ownership relationship, or catalog grant.
Invitation execution, acceptance, and verified account linking remain outside
the local phase gate.

## Phase 06.3 operations handoff

Batch roster, purchase summary, assignment locking, and existing-customer
admin-assisted orders are implemented locally. The feature branch may be
validated and pushed, but no Convex Preview, Vercel Preview deployment, stable
staging build, or Production operation is required or authorized for this
phase. The Vercel Git-connected feature-branch record may be Preview-labeled
and ignored/canceled by policy.

## Phase 06.4 exception handoff

Order exceptions are implemented locally on
`feat/order-exceptions-v0.1`. The feature branch may be pushed for the
Git-connected Preview record, but Preview `READY` is not a gate and no Preview
debugging is authorized. The expected newest record is Preview `Canceled` or
`Skipped`.

Local evidence is 88 Vitest tests, 61 Convex tests, zero lint warnings,
TypeScript pass, Next.js build pass, and `git diff --check`. Canonical Convex
codegen access was denied; no alternate project, staging environment, or
Production operation was used. Full authenticated browser and concurrency QA
remains deferred to one stable staging environment.

## Phase 05.1 payment handoff

Phase 05.1 is implementation-complete when local format, lint, typecheck,
unit, Convex, build, authorization, and financial-invariant checks pass. A
transient Vercel/Convex Preview is neither required nor an active BFG target.
Real payment confirmation, Clerk identity, realtime, browser, runtime-log, and
data-cleanup evidence must be collected later in the one stable staging
environment.

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

Staging will eventually use one stable Vercel deployment and Clerk
configuration appropriate for staging. No separate BFG Convex staging target
is configured or authorized by this document; do not create a new project when
staging configuration fails.

## Staging handoff evidence

Before the staging handoff, verify by names/counts only:

- Convex account/team/project/deployment match the canonical backend above;
- Clerk Development keys and issuer configuration are present in the correct
  environments;
- Convex auth config accepts a signed-in Clerk JWT;
- affected staging tables are empty or contain only known QA records;
- the stable Vercel staging deployment is Ready;
- signed-out, owner, admin, customer A/B, suspended, and invitation flows pass;
- runtime logs contain no secrets or unexpected errors.

[LOCAL VERIFIED] Local Next.js build inputs and the Phase 04.1 validation
commands pass. Previous branch-specific Preview references are historical only;
no Preview or Production target was used.
