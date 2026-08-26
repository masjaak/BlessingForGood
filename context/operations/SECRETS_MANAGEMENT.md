# BFG Secrets Management

## Current Production wiring — 2026-08-26

`CLERK_SECRET_KEY` is stored in the server-only Vercel Production environment
and synchronized into Convex Production by the canonical `vercel.json`
build command before `convex deploy`. Values are never printed, committed,
persisted in BFG records, or exposed to the browser. The invitation action
fails closed when the server secret is unavailable.

## Rules

- Keep `.env.local`, `.vercel/`, deploy keys, cookies, and auth storage out of
  Git; `.gitignore` enforces this boundary.
- Audit names only. Never print values, Clerk subjects, issuer values, emails,
  tokens, invitation URLs, passwords, or keys.
- Keep Clerk Development values in local/Preview only.
- Keep `CLERK_JWT_ISSUER_DOMAIN` and `BFG_OWNER_CLERK_USER_ID` server-side in
  Convex Development/Preview only.
- Keep catalog-code pepper server-side. Store only digests, never raw codes.
- Never put auth material in audit metadata or business documents.

## Production

Production Clerk, Convex auth, Vercel deploy keys, and business secrets remain
server-only. A missing required secret must fail closed, not trigger a
fallback or guessed configuration.

## Cleanup classification

| Name | Action |
| --- | --- |
| `BFG_PREVIEW_ADMIN_ACCESS_CODE` | remove when Preview environment cleanup is authorized; no active code uses it |
| `BFG_SESSION_TOKEN_PEPPER` | retain only for isolated legacy tests until legacy code is retired |
| `BFG_PREVIEW_DEMO_MODE` | remove from active Convex Preview after compatibility audit |
| `NEXT_PUBLIC_BFG_PREVIEW_DEMO_MODE` | retain temporarily as non-auth feature/presentation flag |
