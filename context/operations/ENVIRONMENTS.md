# BFG Environment Matrix

| Environment | Branch/use | Identity | Data source | Status |
| --- | --- | --- | --- | --- |
| Local development | deterministic implementation and QA | configured Clerk instance | canonical Convex Development `content-snake-214` | active development target |
| Feature Preview | optional Git record only | not a release gate | no manually created Convex deployment | not required |
| Staging | none for Production V1 | none | none | not required |
| Vercel Production | `main` only | Clerk Production | canonical Convex Production `clean-eel-522` | pending release gate |

## Required names

Frontend/Vercel:

```text
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY
NEXT_PUBLIC_CONVEX_URL
CONVEX_DEPLOY_KEY
```

Convex Production:

```text
CLERK_JWT_ISSUER_DOMAIN
BFG_OWNER_CLERK_USER_ID
BFG_CATALOG_CODE_PEPPER
```

Values are secrets and must never be printed or committed. Production Clerk
must use Production credentials and a verified Production domain. The Vercel
Production deploy key must target `clean-eel-522`, not Development or Preview.

## Runtime boundary

The application uses Convex whenever `NEXT_PUBLIC_CONVEX_URL` is a valid HTTP(S)
URL. There is no browser-local product fallback and no prototype/Preview mode
flag. Missing configuration fails closed with no business-data mutation.

Before environment-sensitive operations, verify the selected Convex account,
team, project, and both canonical deployments. Ambiguous access stops only that
operation; never create or switch projects automatically.
