# BFG Project Status

## Current Anchored Summary — 2026-08-21

**Phase 07.1:** `BFG_PHASE_07_1_PRODUCT_SURFACE_STABILIZED` — `CLOSED + RECONCILED`
**Baseline reconciliation:** `BFG_PHASE_07_1_BASELINE_RECONCILED`
**Agent system:** `BFG_AGENT_DEVELOPMENT_SYSTEM_V2_ACTIVE`
**Phase 08:** `ACTIVE` — `BFG_PHASE_08_FINAL_COMPLETION_ACTIVE`.

The previous generic `RED=0`, `YELLOW=0`, and `UNKNOWN=0` closure is superseded
by a real Production screenshot showing Catalog action spacing was still wrong.
The correction pass uses explicit `GREEN_REAL_PRODUCTION`,
`GREEN_DETERMINISTIC`, `BLOCKED_BY_DATA`, and `BLOCKED_EXTERNAL` evidence. Bulk
Import V1 remains implemented and Production-deployed, but its legitimate
Production pilot is **DEFERRED BY USER**. Activity is being completed as one
responsive user-facing feed over separate Notification and Inbox backends.
Product Media decisions are locked and the bounded implementation is deployed;
real-book UAT remains an open gate.

Starting commit for this correction pass: `cb609ab`.
Final delivery: current `main` after final context reconciliation.
`origin/main`: current `main` after final context reconciliation.
Convex Development: `content-snake-214`.
Convex Production: `clean-eel-522`.
Vercel Production: latest Git-triggered `READY` deployment for `origin/main`.
Canonical Production: `https://www.blessingforgood.com`.

Current local regression is Vitest `229/229`, Convex `110/110` (included in
Vitest), Playwright `201/201` with one environmental retry recovered, rendered
`24/24`, TypeScript PASS, ESLint PASS, Format PASS, Build PASS, and
`git diff --check` PASS. Public Production is reachable and the live public
rendered suite is `24/24`; the current environment still has no authenticated
product browser session. No dummy Production business records were created.

The known Production baseline is Convex `clean-eel-522`; the configured
Production hook completed the Convex `--prod` step before the Next build.
Authenticated acceptance is still required before declaring the current
product stable. Auth, financial, inventory, Secret Catalog, and Bulk Import
policy remain within their locked boundaries.

The canonical reconciliation artifacts are:

- `context/SOURCE_OF_TRUTH.md`
- `context/DECISION_LOG.md`
- `context/implementation/BFG-BASELINE-RECONCILIATION-MATRIX.md`
- `context/implementation/BFG-ROUTE-INVENTORY-V2.md`
- `context/implementation/BFG-PHASE-08-SOURCE-CONTRACT.md`
- `context/implementation/BFG-BULK-IMPORT-DATA-CONTRACT.md`
- `context/implementation/BFG-BULK-IMPORT-POLICY.md`
- `context/implementation/BFG-PHASE-08-BULK-IMPORT-TRACEABILITY.md`
- `context/implementation/BFG-ADMIN-CUSTOMER-SYNC-MATRIX.md`
- `context/implementation/BFG-BUSINESS-CONSEQUENCE-MATRIX.md`
- `context/implementation/BFG-MOCKUP-TRACEABILITY-MATRIX.md`
- `context/implementation/BFG-STATE-MACHINE-INDEX.md`
- `context/implementation/BFG-SECURITY-INVARIANTS.md`
- `context/implementation/BFG-FINANCIAL-INVARIANTS.md`
- `context/implementation/BFG-VISUAL-SYSTEM.md`
- `context/implementation/BFG-PHASE-08-ENTRY-GATE.md`
- `context/implementation/BFG-PHASE-08-CANDIDATES.md`
- `context/implementation/BFG-PHASE-08-PRODUCT-MEDIA-SOURCE-CONTRACT.md`
- `context/implementation/BFG-PHASE-08-PRODUCT-MEDIA-TRACEABILITY.md`
- `context/implementation/BFG-FINAL-PRODUCT-COMPLETION-MATRIX.md`
- `context/implementation/BFG-MAINTENANCE-PLAYBOOK.md`

### Current reconciliation result

| Gate                             | Result |
| -------------------------------- | ------ |
| Source documents inventoried     | PASS   |
| Current features classified      | PASS   |
| Current routes classified        | PASS   |
| Required actions classified      | PASS   |
| Mockups mapped                   | PASS   |
| Business domains mapped          | PASS   |
| State machines indexed           | PASS   |
| Security invariants locked       | PASS   |
| Financial invariants locked      | PASS   |
| Admin ↔ Customer sync mapped     | PASS   |
| Superseded decisions documented  | PASS   |
| Explicit exclusions documented   | PASS   |
| Phase 08 candidates source-based | PASS   |
| Unknown material source conflict | `0`    |
| Unclassified feature             | `0`    |
| Unclassified route               | `0`    |
| Unclassified mockup              | `0`    |

### Next milestone

Complete authenticated Activity/Product Media acceptance on one legitimate
existing book, close the remaining authenticated UAT journeys, and apply the
user-controlled data checkpoints in the final matrix. The completion matrix and
maintenance playbook are now established. Do not start Phase 09. Bulk Import
remains unchanged and its real pilot remains deferred by user data.

### Phase 08 Bulk Import V1 implementation evidence — 2026-08-16

- Status: `BFG_PHASE_08_BULK_IMPORT_V1_PRODUCTION_DEPLOYED_PILOT_DEFERRED_BY_USER`.
- Natural entry: `/admin/books` → `Import Buku` → `/admin/import`.
- Backend: server-authorized preview query and one revalidated atomic confirm
  mutation; preview writes `0`; no import-job table or schema change.
- Contract: exact eight-column UTF-8 CSV, 2 MiB, 200 data rows, 5,000 Unicode
  characters per cell; quoted CSV/BOM/line-ending support; no new dependency.
- Safety: new books are draft, new variants inactive, exact rows are no-op,
  conflicts reject the whole file, and audit stores only bounded summary data.
- Local evidence: Vitest `216/216`, Convex `102/102`, Playwright `180/180`
  baseline plus 3 `/admin/import` route checks, TypeScript PASS, ESLint PASS,
  Format PASS, Build PASS, and `git diff --check` PASS.
- Remaining gate: authorized real Production pilot and authenticated rendered
  import-state QA remain unclaimed by explicit user choice; no dummy Production
  records or credentials were created.

### Phase 08 final-completion context — 2026-08-21

- `BFG-SPACING-SYSTEM.md` records the semantic Admin action and Homepage rhythm
  contract.
- `BFG-PHASE-08-PRODUCT-MEDIA-SOURCE-CONTRACT.md` records the locked
  Book-Master ownership and HTTPS metadata-only preview decisions.
- `BFG-PHASE-08-PRODUCT-MEDIA-TRACEABILITY.md` records the deployed
  implementation and the remaining real-book acceptance gate.
- Activity now projects notifications and messages into one newest-first feed;
  backend tables, ownership, retention, and read semantics remain separate.
- Bulk Import implementation and contract remain unchanged; its pilot is
  `DEFERRED_BY_USER_DATA`.

### Responsive/media closure evidence

- Customer mobile top header is logo-only; Activity is reachable through Akun,
  with a shared unread dot on the five-link bottom navigation.
- Customer desktop and Admin Activity/avatar clusters remain inline; Admin
  `Lihat sisi pelanggan` is nowrap at 1024/1280/1440.
- `CoverUploadField` owns the custom accessible file presentation while the
  existing Convex upload URL/attach flow remains canonical.
- Local exact 1280 customer smoke: `20/20`; canonical Production public
  Activity/visual suite: `24/24`. Existing private-flow evidence remains the
  record for authenticated journeys; no business data was mutated.

## Historical Status Archive

The sections below preserve earlier evidence and decisions. Their old counts,
deployment IDs, and blocked/active labels are historical and are superseded by
the current anchored summary and the linked canonical documents. They are not
rewritten to imply they were always current.

## Phase 07.1 full source-of-truth reconciliation — 2026-08-14

**Status:** `LOCAL_ENGINEERING_PASS__PRODUCTION_AND_REAL_UAT_BLOCKED`

Starting commit: `8392d2212844fc888e12904e680a240420d219b0`.

The original PRD/UX/business/scope/success contracts and all approved Admin and
Customer mockups have been reconciled into `context/SOURCE_OF_TRUTH.md` and the
Phase 07.1 implementation matrices. Required local product gaps are implemented,
including visible Secret Catalog access management, product/proof uploads,
Admin/Customer Notifications and operational Inbox, customer Batch and Deposit
surfaces, reports/export/analytics, multi-Admin invitations, audit, content, and
settings. The current deterministic baseline is Vitest `166/166`, Convex
`94/94`, with typecheck, lint, format, build, diff check, and the documented
rendered route/viewport suite passing; the 155-check inventory completed with
two known concurrent Clerk/local-Convex flakes that passed sequentially.

This is not a closure or Production deployment claim. Convex CLI schema/codegen
acceptance is blocked because the configured CLI identity cannot access canonical
Development `content-snake-214`. Authenticated rendered QA and the intentional
real Owner/Admin, Customer, product, Secret Catalog, Notification, and Inbox
flows are also blocked because no designated identities/client product were
provided. No alternate deployment or dummy Production record was created. Until
those external inputs are restored, client product entry is not safe and Phase 08
must not start.

### Final operational audit delta — 2026-08-14

The local reconciliation additionally closes the discovered Admin reachability
gaps: invoice create-and-issue is available from the Invoices & Deposit queue,
existing drafts can be issued there, Book Master previews a selected cover
before durable save, Customer detail links to invoice/deposit workflows, and
Admin navigation rows share fixed optical geometry. These changes are local
until canonical Convex validation, deployment, and authenticated acceptance
are completed. The exact blocker remains lack of CLI access to Development
project `content-snake-214`.

## Phase 07.1 Product Surface Stabilization

**Status:** `BFG_PHASE_07_1_LOCAL_CLOSURE_PRODUCTION_PILOT_BLOCKED`

Starting commit: `8442367` (`test: cover authenticated production routes`).

This pass separates the signed-in customer workspace from Admin: the canonical
customer primary navigation is now `Beranda`, `Katalog`, `Buku Saya`,
`Tagihan`, and `Akun`; Admin/Owner access appears only as the secondary
`Buka Workspace Admin` control; the Admin shell keeps `Lihat sisi customer`.
Customer Account now naturally reaches Profile and Addresses. The Admin
dashboard now gives urgent operational queues visual priority over secondary
context counts without changing queries, schema, permissions, or business
logic.

Required access, admission, mockup translation, customer surface, and QA
matrices are in `context/implementation/`. The current implementation adds the
missing public/signed-in Join flow, Admin review/approval handoff, pending
attention indicators, canonical customer/Admin branding, and shared Admin
operational page grammar. Local deterministic tests and browser smoke pass;
no dummy Production data was created. The visual-system regression is deployed
in Vercel deployment `dpl_3vfdSRji8mXJtvZAWpa7YxWfxfYW` (`READY`) with Convex
Production `clean-eel-522`.

Remaining gates are explicit: complete the intentional real
non-member → Admin approval → active Blessfriend journey, run one real client
product through Admin → Convex → customer projection, and compare authenticated
Admin/customer renders against the local mockups. Do not start Phase 08 or
report closure until those gates pass.

### Latest Phase 07.1 product publishing and journey delta — 2026-08-14

**Status:** `BFG_PHASE_07_1_PRODUCTION_DEPLOYED_PRODUCTION_PILOT_BLOCKED`

Starting commit for this delta: `94780ff0ba32337654bda728df534099a4b37047`.

The current implementation now proves the canonical local chain
`Publisher → Book Master → Variant → ISBN/price → publication → inventory or
catalog assignment → customer projection`. Ready Stock keeps the canonical
`onHand - reserved` availability calculation and now returns only customer-safe
variant fields. Secret Catalog uses the shared projection guard to exclude
draft/archived books while preserving scoped token access for valid `special`
products. No order, inventory reservation, invoice snapshot, payment, deposit,
refund, exception, or schema state logic was changed.

How To Order is now one accessible seven-step ordered journey with a single
connected path; the previous independent card treatment is superseded. The
shared Admin operational loading grammar remains stable across Ready Stock,
Exceptions, and Refunds.

Local gates: Vitest `147/147`, Convex `82/82`, Playwright `114/114` on the
first full run, TypeScript, ESLint, format, build, and diff check pass. Rendered
QA passes How To Order at 375/390/430/1440px, deterministic product
listing/detail at 390/1440px, Admin Book Master entry at 390/1440px, and the
three Admin operational loading surfaces side-by-side at 1024/1280/1440px. A
repeat serial browser run was locally flaky around Clerk/resource loading and
signed-out navigation; no changed-surface assertion failed.

No real client product information or authorized authenticated operator session
was provided. No Production business data was created. Therefore the real
product pilot, authenticated Production acceptance, and bulk-entry safety
remain blocked. The final code commit `2bc8137` is deployed in Vercel
Production deployment `dpl_EwKcjS8T7WrPRXwNKZD6JvDNnBpJ` (`READY`) with
Convex Production `clean-eel-522`; public live focused QA is `19/19`. Phase 08
remains `NOT STARTED`.

### Admin access security hardening

**Status:** `BFG_ADMIN_SECURITY_HARDENED_PRODUCTION_AUTHENTICATED_ACCEPTANCE_PENDING`

Deterministic security tests now cover the Admin route role/status matrix,
direct sensitive Admin query and mutation bypass attempts, Owner-only role
management, and Admin/Owner access to customer routes. One shared client role
policy drives the route guard and route-aware query providers; shared Convex
permissions let Admin use owned customer projections while every Admin-only
query/mutation remains independently server-authorized.

The current Production runtime is known to pass Clerk → Convex token, issuer,
audience, Convex identity, non-member detection, and Admin denial. The deployed
closure pass still must prove the real signed-in customer/Admin/Owner journey.
No Clerk Organization, alternate login, or dummy data is claimed.

## Auth Session Recovery V3

**Status:** `BFG_AUTH_SESSION_V3_CODE_READY_PRODUCTION_AUTH_PENDING`

The P0 follow-up traces the remaining failure to the Clerk → Convex boundary.
The live client uses the canonical Clerk Production issuer and Convex Production
deployment. Convex issuer configuration is now validated and synchronized by
the Production build, while real authenticated Chrome acceptance remains a
required gate before claiming full closure. Phase 08 has not started.

## Homepage Polish V4.1.3

**Status:** BFG_HOMEPAGE_V4_1_3_PRODUCTION_READY

This homepage-only hotfix keeps Phase 07 functionally locked while moving
Ready Stock and Secret Catalog actions into the hero, replacing the large
dark-green journey panel with a lightweight cream-canvas stepper, and
optically centering the visible customer `Logo-1` artwork without cropping it.
Customer routes, bottom navigation, Clerk/Convex contracts, Secret Catalog
security, Ready Stock ordering, financial logic, and Admin remain unchanged.

**Local gate:** Vitest `108/108`; customer Playwright `75/75`; signed-out
Admin Playwright `39/39`; TypeScript, build, lint, format, and diff check pass.

## Phase 07 Admin Operational UI/UX + Customer Visual Patch V4.1.1

**Status:** BFG_PHASE_07_ADMIN_OPERATIONAL_UI_READY — PRODUCTION DEPLOYED

Stage A applies the targeted client patch: the approved local multicolor
`Logo-1` is the customer primary, logo rendering is contained and
production-safe, the BFG story mark is prominent, mobile `Masuk` is framed,
and the homepage plus `/how-to-order` use one illustrated current-product
journey.

Stage B adds the desktop-first operational workspace around the locked Phase
06.7 policies: grouped navigation, actionable dashboard queues, operational
tables/status grammar, and a Ready Stock projection for on hand/reserved/
available stock. Existing Admin routes, Convex mutations, RBAC, financial
history, and customer consequences remain canonical.

**Starting production commit:** `cf26922`

**Final production code commit:** `51587d6`

**Vercel deployment:** `dpl_6HRYZPXFxSg2dbLz1oKW3hq88F2w` — Ready on the
canonical aliases, including `https://blessingforgood.com`.

**Local gate:** Vitest `108/108`, Convex `72/72`, Playwright local customer
`75/75`, signed-out Admin `39/39`, TypeScript, build, lint, format, and
`git diff --check` all pass.

**Live smoke:** `114/114` safe customer and signed-out Admin route checks pass
against `https://www.blessingforgood.com` at customer 375/390/430/768/1440px
and Admin 1024/1280/1440px. The non-`www` canonical alias redirects to `www`
with the established 308 response. No authenticated production mutation or
dummy business data was used.

Authenticated Admin visual/action acceptance remains an operator-session
responsibility; route protection, isolated policy tests, and the implemented
operational controls are green without mutating production records.

## Phase 06.7 Business Policy Closure

**Status:** BFG_PHASE_06_7_POLICY_CLOSED — PRODUCTION DEPLOYED

Phase 06.7 closes Ready Stock ordering/reservation, pre/post-PO cancellation,
defect replacement, refund obligation/payout, deposit refund, non-account
customer, and Join-request retention policy. The canonical policy documents
are `context/policies/BFG-BUSINESS-POLICY-V1.md` and
`context/policies/BFG-POLICY-DECISION-MATRIX.md`.

Customer Visual V4.1, the global skeleton/loading system, and the Phase 06.6
customer/admin flow remain locked. Admin visual redesign remains deferred to
Phase 07. No production business data was seeded and no Preview delivery is
used.

**Starting production commit:** `938be66371d4e9b5084033f1b3985e207f65994`

**Final production code commit:** `1627ad306e44b152807a8a3f1b3985e207f65994`

**Release verification commit:** `32d6526`

**Vercel deployment:** Ready on the canonical aliases, including
`https://blessingforgood.com`. The Production build used the configured Convex
deploy command and completed successfully.

**Live smoke:** customer `75/75` and signed-out admin `36/36` across the
responsive production projects. The canonical domain redirects to `www` and
returns `200`.

The local Convex CLI check could not authenticate to the selected development
project in this environment; no production mutation was attempted. Vercel's
Production build completed the configured Convex deployment step.

The repository's `AGENTS.md` references `context/SOURCE_OF_TRUTH.md`, but that
file is absent from the current checkout; the current source-of-truth chain is
this status file, `context/decisions/DECISIONS.md`, the feature/database/security
documents, and the Phase 06.7 policy documents above.

## Customer Mobile UX Correction V3.1

**Status:** PRODUCTION READY — LIVE QA PASSED

V3.1 corrects the rendered customer mobile experience forward-only. The
header logo is smaller, top-right `Masuk` opens the dedicated BFG sign-in
page, signed-out bottom-navigation destinations render customer states before
authentication, and `/catalog` is a public token gateway. Secret Catalog
access uses a server-validated opaque expiring session; the previous
authenticated-member-plus-code prerequisite is superseded for this customer
entry flow. Existing active-member grants remain backward compatible, and
token-only browsing does not create customer identity or owned orders.

The homepage story cards now use a larger official logo and a non-overlapping
top-right Blessy composition. Join remains canonical `joinRequests`, and all
customer/admin data continues through the shared Convex backend. Admin visual
redesign remains deferred. No business fixtures or dummy records were added.

**Branch:** `main`

**Starting commit:** `8e67bfc` (`docs: record V3 production deployment`)

**Production commit:** `aa294c5` (`docs: record final production deployment`)

**Vercel deployment:** `dpl_H6m6a6vtGf61fzNXbWwTRyQmmggY` — Ready; canonical
aliases include `https://blessingforgood.com`. Vercel logs show the build,
TypeScript check, static generation, Convex schema validation, and deployment
to Production Convex `clean-eel-522` completed successfully.

The V3.1 customer surfaces are implemented forward-only in the integrated
Phase 01–06.4 application. Generated catalog codes and session credentials are
never stored as plaintext authoritative values. The full admin visual
redesign remains deferred.

Local gates currently pass: TypeScript, ESLint, 100 Vitest tests, 64 Convex
tests, and 108/108 Playwright tests across customer/admin responsive projects.
Live public mobile QA at 390px passed for homepage, token gateway, signed-out
states, BFG sign-in, no-ticket sign-up, navigation, and detail Back controls.
No secret values, dummy records, or alternate deployments were used.

The join continuation is safe when `BFG_JOIN_WHATSAPP_GROUP_URL` is absent:
the request persists and the customer sees the configured-link fallback. Its
Production value was not exposed or independently read during this pass.

## Historical Production UI alignment hotfix (superseded by V3)

**Status:** LOCAL RELEASE CANDIDATE READY — PRODUCTION BLOCKED BY EXTERNAL AUTH/ENVIRONMENT CONFIGURATION

**Branch:** `hotfix/production-ui-alignment-v1`

**Release candidate:** `a0a3bce` (`feat: align customer shell with local mockups`)

**Functional source of truth:** current remote `main`, forward-integrated with
the existing `release/production-v1` product history because remote `main`
still pointed to the older prototype merge.

**Visual sources of truth:** the customer/admin mockups in `public/mockups`,
the official assets in `public/brand`, and selected visual patterns from
`origin/qa/ux-refinement-v0.1`. The QA branch is not a functional merge source.

**Product scope source:** the original PRD pack at
`/Users/masjak/Documents/BLESSINGFORGOOD/BFG WEB/context/product/` was audited
read-only. Its approved MVP scope, UX flows, design system, tone, and mascot
guidance are reflected in the local coverage matrices.

### Completed in the hotfix worktree

- Preserved the Phase 01–06.4 Clerk, RBAC, ownership, catalogs, Ready Stock,
  order, batch, tracking, invoice, deposit, payment, exception, profile,
  address, and audit domains.
- Removed browser-local product persistence, Preview/demo activation flags,
  prototype presentation, and the customer-side admin setup leak.
- Made a valid `NEXT_PUBLIC_CONVEX_URL` the single product data path; missing
  configuration fails closed.
- Consolidated public and customer copy around Indonesian-first BFG language.
- Added `/account` with actionable order, invoice, deposit, exception,
  refund-obligation, and bounded cross-domain activity projections.
- Added `/admin/customers` and `/admin/customers/[customerId]` using existing
  server-authorized customer, profile, address, order, invoice, and exception
  queries.
- Rebuilt `/admin` around real operational queues without invented analytics.
- Added production-copy/runtime regression coverage.
- Restored official logo/mascot scale, mobile navigation, branded empty/loading
  states, a connected customer account hierarchy, and one compact admin shell.
- Rendered the optimized build at customer widths 375, 390, 430, 768, and 1440
  and protected admin widths 1024, 1280, and 1440.

### Current validation

- Vitest: 93/93
- Convex: 61/61
- Playwright responsive route smoke: 108/108 PASS
- Formatting: PASS
- Lint: 0 errors / 0 warnings
- TypeScript: PASS
- Next.js build: PASS (25 pages)
- `git diff --check`: PASS

### Customer experience finalization V1

- Inspected all eight local customer/mobile mockups under
  `public/mockups/mobile/` and documented their exact paths, visual rules,
  route parents, and brand asset relationships.
- Aligned the customer shell to the local mobile information architecture:
  five-item signed-in bottom navigation, safe-area/content offset, customer
  mobile menu links, and BFG-styled Clerk appearance.
- Public customer screenshots pass at 375, 390, 430, 768, and 1440 widths;
  the Ready Stock zero state remains intentionally empty and mascot-led.
- Authenticated account screenshot acceptance remains blocked by the existing
  matching Clerk/Convex environment requirement. No dummy business records or
  test production fixtures were created.
- Admin visual refinement is deferred; admin route regression remains covered
  by the full Playwright suite.

### Production preflight (2026-08-11)

- Vercel project `masjaaks-projects/blessing-for-good` is reachable and linked
  to the canonical repository. Production currently has three sensitive
  variables, but they are named `CLERK_SECRET_PROD`, `CONVEX_DEPLOY_PROD`, and
  `NEXT_PUBLIC_CLERK_PUBLISHABLE_PROD`; the application-required names are not
  present. Values were not printed or copied blindly.
- `blessingforgood.com` and `www.blessingforgood.com` are attached to the
  project, publicly resolve to Vercel, and serve HTTPS 200. The public Clerk
  hostname `clerk.blessingforgood.com` also resolves through Clerk and serves
  HTTPS 200.
- Clerk CLI health check is not authenticated or linked to a Clerk
  application. Local credentials remain Development `pk_test_`/`sk_test_`, so
  the Production key pair, owner, issuer, and certificate state are not
  independently verified through the CLI.
- No environment, domain, Clerk, Convex, business-data, branch, or deployment
  mutation was attempted. The existing Production deployments predate
  `a0a3bce` and are not accepted as this release.

### Historical production boundary (2026-08-11)

`main` and Vercel Production remain untouched by design. The canonical BFG
domain is publicly reachable, but Vercel Production has only incorrectly named
sensitive variables; the required names, matching Clerk Production pair, and
canonical Convex Production deploy key/configuration are not verified. Public
rendered QA and local deterministic gates pass; authenticated customer/admin
rendered acceptance and Production smoke remain blocked. No alternate project,
dummy business data, Preview delivery, or staging deployment is used.

## Canonical Convex

```text
Account: palevvi@gmail.com
Team: palevvi
Project: blessingforgood
Development: content-snake-214
Development reference: dev/masjak
Production: clean-eel-522
```

No similarly named project is authorized. If access is ambiguous, stop that
environment-sensitive operation instead of switching or creating a project.

## Current context

- **Objective:** keep the Phase 07 Admin operational workspace and targeted
  customer visual patch production-ready while preserving the locked policy
  surface.
- **Decisions:** current `develop` logic wins; QA UX is a component/style donor;
  the official logo and mascot are mandatory; customer history is derived from
  canonical records; no financial history is rewritten.
- **Constraints:** no dummy business data, no invented wallet/store-credit
  behavior, no Preview delivery, no reporting/analytics/CMS/settings, no
  payment gateway, and no reopening of Phase 06.7 policy decisions.
- **Open backlog:** Reporting/Excel, Analytics, CMS, Settings, notification
  platform, payment gateway, and full Admin visual redesign.
- **Current priority:** operator acceptance of the stable Phase 07 workspace;
  keep later reporting, analytics, CMS, settings, notification, and gateway
  work deferred.
- **Next action:** keep reporting, Excel export, analytics, CMS, settings,
  notification platform, payment gateway, and full Admin visual redesign out
  of scope until their own phase is authorized.

## Phase 07.1 visual convergence status — 2026-08-15

- Local systemic visual pass is complete at runtime commit `6a84bc0` with
  documentation follow-up `9bb0093`: shared logo, skeleton, spacing, button,
  frame, sidebar, typography, and Catalog grammar are implemented and locally
  verified.
- Local validation is green: `npm run check`, Convex check/tests, focused visual
  tests, `git diff --check`, and Playwright `155/155` signed-out/public matrix.
- Vercel Production `dpl_CsHVTKox5LVhhKQYZPG8TV1y2fk9` is READY and aliased to
  the canonical domains. Canonical Convex Production remains `clean-eel-522`.
- Production populated Admin/Customer visual acceptance is blocked by missing
  designated QA identities/real records and Vercel Deployment Protection in
  the current browser environment. No bypass or dummy records were used.
- **Phase 07.1:** NOT CLOSED (`LOCAL_VISUAL_SYSTEM_READY`,
  `PRODUCTION_AUTHENTICATED_VISUAL_ACCEPTANCE_BLOCKED`).
- **Phase 08:** LOCKED.
