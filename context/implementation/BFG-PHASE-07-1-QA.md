# BFG Phase 07.1 QA

Status: `BFG_PHASE_07_1_FINAL_CLOSURE_LOCAL_PRODUCTION_ACCEPTANCE_PENDING`

Phase 07.1 remains open only for final deployment and real authenticated
acceptance of the admission journey and visual convergence.
Phase 08 remains `NOT STARTED`.

## Admin security closure

- Clerk remains the only identity provider; Clerk login alone grants no BFG
  membership or Admin access.
- Active `appUsers` status plus role/permission remains authoritative.
- Signed out, missing `appUser`, suspended, and customer identities are denied
  from Admin routes and representative direct Admin query/mutation calls.
- Admin and Owner are allowed into `/admin`; Owner-only access operations still
  deny Admin.
- Admin/Owner may use the customer workspace. Route-aware providers select
  owned customer projections outside `/admin`, not operational Admin payloads.
- All audited Admin-specific Convex queries and mutations enforce
  `requirePermission` or `requireOwner` before protected data/write access.
- No Clerk Organization, second login, email whitelist, dummy Production data,
  or business/financial policy change was introduced. The only schema change
  is additive and Join-only.

## Acceptance scenarios

| Scenario | Role | Route | Starting State | Action | Expected | Actual | Visual Source | Functional Consequence | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Customer primary navigation | customer | `/account` | authenticated role resolved in deterministic component test | Render customer shell | `Beranda`, `Katalog`, `Buku Saya`, `Tagihan`, `Akun`; no Admin link | Exact five-link assertion passes; workspace switch is in account-access region only | Customer mobile mockups 1–8; customer V4.1 | Customer IA no longer mixes operational navigation | PASS locally; Production auth pending |
| Elevated workspace entry | admin / owner | `/account` → `/admin` | role resolved in deterministic component test | Open `Buka Workspace Admin` | Admin entry is secondary and authorized | Admin/Owner link renders; customer role renders no link | Workspace model in Phase 07.1 brief | Role-preserving navigation to Admin | PASS locally; real session pending |
| Customer direct Admin URL | customer | `/admin` | authenticated customer | Enter URL directly | Denied; no Admin children or Admin data queries mount | `ProductAccessGuard` customer denial test passes; live customer session not available | Admin shell and RBAC matrix | Direct URL cannot grant Admin access | PASS locally; Production auth pending |
| Signed-out Admin URL | signed out | all major `/admin/*` | no Clerk session | Enter URL directly | Clerk sign-in gate | Playwright signed-out Admin matrix passes 39/39 across 1024/1280/1440 | Admin route inventory | Protected routes fail closed | PASS |
| Owner reverse switch | owner | `/admin` → `/` | authenticated owner | Choose `Lihat sisi customer` | Customer shell opens without role mutation | Reverse link remains in Admin shell; authenticated browser execution pending | Admin mockups; workspace matrix | Intentional workspace switch, not mixed nav | AUTH-BLOCKED |
| Suspended access | suspended | `/admin` | resolved suspended appUser | Resolve guard | Suspension state; no Admin content | Deterministic guard test passes | Auth state contract | Business queries remain skipped | PASS locally |
| Missing appUser | signed-in, missing appUser | `/admin` and customer account routes | admission unresolved/denied | Resolve appUser | Account-not-active state; no private content | Existing admission guard test passes | Customer state coverage | No anonymous fallback or private query | PASS locally |
| Account route reachability | customer | `/account` → profile/addresses | account dashboard rendered | Follow Account links | Profile and Addresses reachable without manual URL entry | New links render and point to `/account/profile` and `/account/addresses`; signed-out route smoke passes | Customer mockup 8 | Existing customer surfaces become naturally reachable | PASS locally; populated auth pending |
| Customer route smoke | signed out | customer route inventory | public/locked zero-data state | Visit each route at responsive projects | No 4xx, blank page, prohibited copy, console error, or horizontal overflow | Playwright 75/75 customer checks pass | Customer V4.1.1/V4.1.3 and mobile mockups | Public and locked states remain usable | PASS |
| Admin dashboard hierarchy | admin | `/admin` | authenticated operational data state | Compare primary and secondary queue composition | Attention queues lead; context counts are quieter; no invented analytics | Code now renders four primary queues and three context queues; authenticated screenshot unavailable | `public/mockups/admin/admin dashboard 1.png` | No query/schema/business change | PARTIAL — render-gated |
| Admin navigation/icon system | admin / owner | all major `/admin/*` | authenticated shell | Inspect sidebar, active state, reverse switch | Grouped BFG operations IA, one outlined icon grammar, clear active state | Source audit confirms grouped `AdminNav` and inline SVG family; authenticated screenshot unavailable | Admin mockups 1–10 | No domain change | PARTIAL — render-gated |
| Zero-production-data safety | all | all | canonical Production remains unseeded | Run local QA | No dummy customer/order/invoice/inventory records | No production mutation or fixture created | Business policy and deployment rules | Financial/catalog/Ready Stock truth preserved | PASS |

## Rendered QA evidence

The repository Playwright suite ran against the local Next application:

- Customer: `75/75` at 375, 390, 430, 768, and 1440px.
- Signed-out Admin gates: `39/39` at 1024, 1280, and 1440px.
- Combined local browser result: `114/114`.
- Captured customer artifacts include `artifacts/browser-qa/customer-390-*` and
  `artifacts/browser-qa/customer-1440-*`.
- Admin screenshots are gate screenshots only. Authenticated Admin mockup
  comparison remains a required real Owner-session gate; no bypass or business
  fixture was added.

## Security hardening verification

- Full Vitest projects: `138/138`.
- Frontend Vitest project: `60/60`.
- Standalone Convex command: `77/77`.
- Playwright public/customer and signed-out Admin matrix: `114/114`.
- TypeScript, ESLint, format check, production build, and diff check: PASS.
- Authenticated Production customer/Admin/Owner and same-session tests:
  PENDING final deployment and intentional signed-in browser sessions. The
  pre-diff Production runtime already passes Clerk → Convex authentication and
  non-member/Admin-denial checks.

Warnings observed during smoke were framework/browser advisory messages only
(Clerk development-key notice, Next image LCP advice, and smooth-scroll
metadata advice); no route test recorded a console error or page error.

## Codebase Memory pre-flight answers

1. Customer primary navigation is rendered by `src/components/site-shell.tsx`.
2. The elevated customer-side entry is `AdminShellLink`; Admin reverse access is
   rendered by the Admin branch of `SiteShell`, with `AdminNav` providing the
   sidebar link.
3. `/admin` authorization is enforced by `src/app/admin/layout.tsx` for Clerk
   sign-in, `ProductAccessGuard` for BFG role/status, and Convex permission/
   ownership helpers for server-side authorization.
4. Profile and Addresses existed but had no natural Account dashboard entry;
   both now have links. Dynamic order/invoice details are reachable from their
   list/activity surfaces when authorized records exist.
5. No customer route was found to be an unfinished placeholder. Catalog detail
   is intentionally an inline state and is classified `DEFERRED_BY_PRD`; private
   populated/detail routes remain `AUTH_BLOCKED` or `BLOCKED_BY_DATA`, not empty
   green states.
6. Existing canonical query/mutation paths were reused: `orders.listMine`,
   `invoices.listMine`, deposit projections, `customerProfiles`,
   `customerAddresses`, `catalogAccess`, `readyStock`, and canonical order
   creation.
7. Customer/Admin share `src/components/ui.tsx` primitives and tokens, but
   workspace shell/navigation styles are scoped: customer under
   `.customer-shell`, Admin under `.admin-*`.
8. Graph evidence showed `SiteShell` has 34 inbound route/component callers and
   `AdminShellLink` had 35 inbound callers because it was mounted in the shared
   signed-in customer nav. The fix removes that mount point and keeps the link
   in the account-access region.
9. Admin shell blast radius is `SiteShell` Admin branch, `AdminNav`, and shared
   Admin CSS used by all major Admin list/detail routes; no query or schema was
   changed.
10. Customer blast radius is limited to signed-in desktop header composition,
    account-dashboard links, and shared auth-link styling. Customer mobile
    bottom navigation, public navigation, and domain flows remain unchanged.

## Phase 07.1 admission and visual closure delta

The canonical admission state machine is in
`BFG-BLESSFRIEND-ADMISSION-FLOW.md`. Deterministic tests now cover:

- public and signed-in missing-`appUser` Join entry;
- valid persistence, duplicate unresolved-request prevention, and retained
  history;
- pending Admin count, review, approve, reject, and authorization;
- existing Clerk identity reuse without duplicate `appUser` creation;
- no auto-admission from Clerk login and active-appUser private-route unlock;
- pending sidebar badge/dashboard attention and resolved-count behavior;
- recoverable approval handoff failure with explicit retry state.

The customer header now has one shared `SiteShell`/`BrandLogo` path using
`Logo-1`; Admin uses the same asset. Admin navigation keeps one existing
outlined icon family. Ready Stock, Exceptions, and Refunds share the Admin
operational page grammar while keeping their distinct domain content.

## State-machine evidence

The workspace and authenticated-page state contract is recorded in
`BFG-WORKSPACE-ACCESS-MATRIX.md`: `AUTH_SYNCING` → appUser resolution →
authorization → data loading → empty/populated/error. Invalid customer → Admin
transitions are covered by the guard tests and rejected before Admin children
mount. Convex remains the authoritative second boundary.

## Current closure gate

The current code is awaiting Production deployment and intentional real
customer/Admin/Owner sessions. After deployment, rerun:

1. real customer sign-in, `/account` → Profile → Addresses → direct `/admin`
   denial;
2. real Admin/Owner sign-in, customer workspace → Admin switch → `Lihat sisi
   customer`;
3. authenticated Admin screenshots at 1440, 1280, and 1024px against the ten
   local Admin mockups;
4. authenticated customer populated/detail screenshots at 390 and 1440px.

No Phase 08 work is authorized by this result.
