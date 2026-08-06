# BFG Environment Matrix

| Environment       | Data source                                                         | Prototype capability          | Production auth/data | Notes                                                   |
| ----------------- | ------------------------------------------------------------------- | ----------------------------- | -------------------- | ------------------------------------------------------- |
| Local development | Convex dev when configured; explicit local adapter remains fallback | server capability on dev only | fail closed          | Separate personal dev deployment; zero business data    |
| Vercel Preview    | branch-scoped Convex Preview                                        | Preview only                  | fail closed          | Shared branch Preview data; anonymous expiring sessions |
| Vercel Production | disabled until approved Convex + Clerk setup                        | must not be configured        | deferred             | No production deployment                                |

## Environment variable handling

- `.env.example` contains names and safe false/placeholder values only.
- Preview configuration is managed in Vercel; values are never committed or printed.
- `.env.local`, `.vercel/`, Vercel tokens, Clerk secrets, and Convex secrets remain ignored.
- Preview Demo Mode is not authentication and must never be treated as an authorization boundary. Convex functions
  additionally require the server-side Preview capability and a valid prototype session.
- Development, Preview, and Production Convex deployments are separate. No automatic localStorage migration exists.
- [CONVEX VERIFIED] The development and branch Preview deployments expose the same Phase 03.1 schema without
  sharing business data.
- [PREVIEW VERIFIED] The final Preview flow passed with zero initial business records; created QA records were
  explicitly cleaned. Production was not deployed or modified.
- [PREVIEW VERIFIED] Phase 03.2 branch Preview is `charming-horse-40` and uses the server-side Preview names
  `BFG_CATALOG_CODE_PEPPER`, `BFG_PREVIEW_ADMIN_ACCESS_CODE`, `BFG_PREVIEW_DEMO_MODE`, and
  `BFG_SESSION_TOKEN_PEPPER`. Values remain outside Git and are not included in reports.

## Phase 03.2 boundary

[REPOSITORY] The operations branch adds batch, shipment, fulfillment, invoice,
and deposit records to the same isolated Convex project. Development tests and
browser QA use the Development deployment selected through ignored local
configuration. Preview verification must use the branch-scoped Preview
deployment and must never reuse Production.

[PROTOTYPE ASSUMPTION] These records belong to expiring Preview sessions, not
Clerk users. The local adapter remains an explicit fallback and is never merged
with Convex records in active Preview screens.
