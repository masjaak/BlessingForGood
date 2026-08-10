# BFG Deployment

## Allowed target

Only the current feature branch and isolated Preview infrastructure are in
scope:

```text
feat/clerk-identity-authorization-v0.1
Clerk Development
Convex Development / branch Preview
Vercel Preview
```

Do not merge to `main`, use `--prod`, promote a deployment, force-push, or
connect Production Clerk/Convex.

## Build

`vercel.json` runs:

```text
npx convex deploy --cmd-url-env-var-name NEXT_PUBLIC_CONVEX_URL --cmd "npm run build"
```

That command must be invoked only with Preview-scoped configuration. Stop if
the output identifies Production. The build must not seed business records.

## Preview handoff evidence

Before reporting Preview ready, verify by names/counts only:

- Clerk Development keys and issuer configuration are present in the correct
  environments;
- Convex auth config accepts a signed-in Clerk JWT;
- affected Preview tables are empty or contain only known QA records;
- Vercel Preview is Ready;
- signed-out, owner, admin, customer A/B, suspended, and invitation flows pass;
- runtime logs contain no secrets or unexpected errors.

[REPOSITORY] Local Next.js build and Preview-target build inputs are present.
[PREVIEW BUILD] The feature-branch commit `c5fbe7a` reached Vercel Preview and
selected isolated Convex Preview `robust-cheetah-853`; Next.js generated 18
static pages before Convex rejected the deploy for missing
`CLERK_JWT_ISSUER_DOMAIN`.
[BLOCKED] Vercel Preview is not READY and authenticated runtime evidence is
not claimed. No Production target was used.
