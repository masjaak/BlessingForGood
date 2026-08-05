# BFG Environment Matrix

| Environment | Prototype adapter | Preview Demo Mode | Production auth/data | Notes |
| --- | --- | --- | --- | --- |
| Local development | enabled only with `NEXT_PUBLIC_BFG_PROTOTYPE_MODE=true` and development `NODE_ENV` | not required | fail closed | Browser-local, zero business records |
| Vercel Preview | enabled only with the dedicated Preview flag and server Preview boundary | Preview only | fail closed | QA workspace; data remains in that browser |
| Vercel Production | disabled | must not be configured as `true` | deferred | No production deployment in Phase 02.2 |

## Environment variable handling

- `.env.example` contains names and safe false/placeholder values only.
- Preview configuration is managed in Vercel; values are never committed or printed.
- `.env.local`, `.vercel/`, Vercel tokens, Clerk secrets, and Convex secrets remain ignored.
- Preview Demo Mode is not authentication and must never be treated as an authorization boundary.
- [BROWSER VERIFIED] The final Preview flow passed with zero initial records; Production was not deployed or modified.
