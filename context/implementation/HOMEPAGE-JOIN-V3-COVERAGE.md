# Homepage, Join & Secret Catalog V3 Coverage

Date: 2026-08-12

| Client requirement | Route/component | Backend | Visual evidence | Functional evidence | Status |
| --- | --- | --- | --- | --- | --- |
| Mengenal lebih dekat BFG | `/`, `src/app/page.tsx` | None; static approved copy/assets | Warm BFG hero and story sequence | Route smoke + full test suite | PASS |
| Three Quick Paths | `/`, `quick-path-card` anchors | Existing `/join`, `/how-to-order` concepts | Framed numbered cards with tap-sized actions | Anchors resolve to story/order/join sections | PASS |
| Why BFG | `#bfg-story` card 01 | None | Short scannable copy | Rendered in native story scroller | PASS |
| Team | Story card 02, `/community` detail link | None | Approved names only: Madina, Angelina, Hany, Ayun, Minca | Link has real route | PASS |
| Logo story | Story card 03 | Official `/public/brand` logo | Actual `BrandLogo` asset | No invented logo rendering | PASS |
| Blessy story | Story card 04 | Official mascot asset | Actual `BrandMascot` asset | No invented portrait or mascot | PASS |
| Story closing | Story card 05 | None | Short closing line | Native scroll card | PASS |
| How to Order | `#cara-order`, `/how-to-order` | Existing order/catalog/tracking/invoice operations | Six-step concise journey | Existing dedicated guide remains linked | PASS |
| Join fields | `/join` | `joinRequests.submit` | Name, email, phone, area, single interest, optional note | Native validation and submitted state | PASS |
| Join persistence | `/join` | Canonical Convex `joinRequests` | No duplicate lead UI | Mutation persists before continuation | PASS |
| Phone normalization | `convex/joinRequests.ts` | `normalizedContact` | Not exposed publicly | `0812`, `62812`, `+62812` equivalent tests | PASS |
| Join admin readiness | `/admin/join-requests` | `listForAdmin`, review mutations | Existing admin UI only; no redesign | Area and book interest visible to admin | PASS |
| WhatsApp continuation | `/join` success | `BFG_JOIN_WHATSAPP_GROUP_URL` server config | CTA absent before success; fallback copy if missing | URL returned only after successful mutation | PASS |
| Invite-only sign-in | `/sign-in`, Clerk | Clerk + Convex admission guard | BFG logo, cream surface, invite copy, Clerk styling | `withSignUp=false`; `appUsers` admission check | PASS |
| Public sign-up blocked | `/sign-up` | Clerk invitation ticket gate | No public sign-up affordance | No-ticket redirect test; ticket path preserved | PASS |
| Auth return-to | protected layouts → `/sign-in` | Clerk `redirect_url`, `safeAuthRedirect` | BFG Back icon | Protected route returns after authentication when Clerk is configured | PASS |
| Global Back | auth, catalog, ready-stock/detail, account detail/profile/address | Browser history + route fallback | Consistent 44px top-left icon | Same-origin history only; safe fallback | PASS |
| Two-layer Secret Catalog | `/catalog` | Active `appUser` + `catalogAccess.unlock` | Code gateway with loading/error/success states | Private query only after grant | PASS |
| Admin code generation | `/admin/catalogs` | `catalogAccess.generateCode` / `secretCatalogs.createBundle` | Immediate copyable code result | Admin/owner only; raw code not persisted | PASS |
| Code hashing | Convex server | `BFG_CATALOG_CODE_PEPPER`, `accessCodeDigests` | No hash/pepper in customer UI | Isolated storage test verifies no plaintext | PASS |
| Revocation / brute force | Convex server | `revokeCode`, `catalogAccessAttempts` | Generic customer error | Revoke, grant, and rate-limit tests | PASS |
| Unauthorized catalog leakage | `catalogAccess.getUnlocked/listAccessible` | Canonical grants and active user checks | No public product list | Isolation tests return no unauthorized products | PASS |
| Shared customer/admin backend | All above | Canonical Convex deployment/schema | No duplicate UI data source | Existing Convex test suite 63 passing | PASS |
| Production deployment | `https://blessingforgood.com` | Vercel Production → canonical Convex `clean-eel-522` | Deployment `dpl_7r3yVo1N5TJKBefoBYJYPXM3ENxv` is Ready from `main` commit `52d3ec4` | Vercel build, typecheck, static generation, Convex schema validation, and function deployment passed | PASS |
| Authenticated live QA | Production Clerk/Convex customer session | Same canonical Production chain | Public HTML and route gates verified; no dummy member or business data created | Clerk testing-token fetch and direct Convex Production environment inspection remain unavailable in this workspace | BLOCKED |

## Status rule

`PASS` means implemented and covered locally or verified in the named
Production deployment. `BLOCKED` is limited to the current authenticated
Production smoke path; no dummy records or fallback deployment was used to
turn it into a false pass.
