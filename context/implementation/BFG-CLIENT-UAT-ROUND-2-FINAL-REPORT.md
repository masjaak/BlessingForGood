# BFG Client UAT Round 2 Final Report

Date: 2026-08-24 (Asia/Jakarta)

## Status

`IMPLEMENTED — DEPLOYED; LIVE UAT REMAINS OPEN FOR AUTHORIZED DATA/DEVICES`

All requested code changes are implemented and deployed to the canonical
Convex/Vercel targets. Deterministic and public production evidence is green;
authenticated Android/iOS, populated upload, Ready Stock, Activity, Button, and
Customer/Admin sync journeys still require authorized live credentials and
approved records.

## Starting Commit / Canonical Baseline

| Item | Evidence |
| --- | --- |
| User-stated starting commit | `fce35bee1d9e79f3050d0481d8823eebddacccc0` (`fce35be`) |
| Actual initial local HEAD | `1e155205` on `main` (stale when this turn began) |
| Actual initial `origin/main` | `88ec873` |
| Fetched canonical reconciliation | `fce35be`, merged without force/reset |
| Canonical Convex Development | `content-snake-214` |
| Canonical Convex Production | `clean-eel-522` |
| Canonical URL | `https://www.blessingforgood.com` |
| Final implementation commit | `155fc87` |

The user-provided `fce35bee` baseline was fetched from `origin/main` and merged
into the final implementation. No old parallel branch was reopened, no force
push/reset was used, and no duplicate V2 system was added.

## Green Preservation

### Baseline contracts preserved

RBAC, ownership, IDOR/BOLA controls, rate limits, upload byte/dimension checks,
security headers, Secret Catalog authorization, atomic Ready Stock reservation,
canonical order/invoice flow, Batch access, one Activity feed, one Button system,
and customer projections remain on their existing paths.

### Shared files and blast radius

| Shared path | Affected consumers | Preservation check |
| --- | --- | --- |
| `convex/lib/storage.ts`, `convex/http.ts`, `src/lib/upload-file.ts` | Cover, gallery, payment/deposit proof uploads | MIME aliases are normalized; byte signature, extension, dimensions, size, ownership, claims, and rate limits remain authoritative. |
| `convex/orders.ts`, `src/domain/prototype/errors.ts` | Customer/Admin Ready Stock and order surfaces | One reservation-backed helper serves self-service and Admin-assisted Ready Stock; unknown errors use a safe fallback. |
| `next.config.ts` | Clerk and all browser routes | Only required Clerk/Cloudflare challenge origins were added; no wildcard CSP or CAPTCHA bypass. |
| `src/components/activity-center.tsx`, `src/app/globals.css` | Admin/customer Activity and shell triggers | One feed/read state; visual treatment changed only presentation. |
| `src/components/ui.tsx`, `src/app/globals.css` | All shared buttons/action groups | Existing `Button`, `LinkButton`, `ActionGroup`, and semantic variants remain the sole system. |
| `convex/schema.ts`, views/forms | Batch ETA, member code, supplier GBP | Additive optional fields; existing records and flows remain readable. |

## Critical Regressions

### Cover / Gallery

Root fix: legitimate browser MIME aliases such as `image/pjpeg`, `image/jpg`,
and MIME parameters are canonicalized to `image/jpeg` at the client upload
header, HTTP boundary, and server validator. Filename shapes with spaces,
parentheses, underscores, and multiple dots remain extension-checked by the
server. No browser metadata is trusted as proof of content.

Deterministic coverage includes progressive/EXIF-style JPEG bytes and names
similar to `81vi9d-A1dL._SL1500_ (1).jpg` and
`IMG-20260819-WA0166.jpg`, plus PNG/WebP and mismatch rejection. The existing
claim → attach → persisted query → customer projection path is unchanged.

Production cover/gallery Save and hard-refresh verification:
`BLOCKED_BY_APPROVED_DATA` until an authorized Admin session and approved real
asset are available. The deployed server path is the tested path; no fake media
was written.

### Ready Stock

`orders:createReadyStock` and Admin-assisted Ready Stock now share one helper
that resolves published stock, computes `onHand - reserved`, validates active
customers, creates the canonical `ready_stock` order, and calls the existing
atomic reservation path. No Batch or stock bypass was introduced.

Customer-visible normalization maps known stock states to `Stok baru saja habis.`
and `Jumlah melebihi stok.`; unexpected failures return
`Pesanan belum berhasil dibuat. Silakan coba lagi.`. Convex function names,
request IDs, stack traces, and database details are not returned by the shared
product error boundary.

Deterministic coverage verifies `available=3, quantity=1`, reservation, Admin
visibility path, activity/audit consequence, and no oversell path. Production
success plus Customer/Admin refresh is `BLOCKED_BY_OPERATIONAL_DATA` because no
approved live stock fixture/session was available.

### Clerk CAPTCHA / CSP

The CSP now includes the current Clerk protection and Cloudflare challenge
surfaces in `script-src`, `connect-src`, and `frame-src`, keeps `worker-src
'self' blob:`, and retains the existing secure defaults. No global wildcard,
CAPTCHA disablement, or native browser bypass was added.

Deterministic CSP assertions pass, and the canonical Production response was
checked for the deployed challenge directives. Android Chrome, desktop Chrome
with a live signup, and iOS Safari are `BLOCKED_BY_EXTERNAL_AUTH_ACCESS` in
this environment; the local browser only has development/keyless Clerk
configuration and cannot prove the Production challenge chain.

### Activity / Inbox

The canonical one-feed model is retained. Unread cards now use a visibly tinted
sage surface, stronger green rail, visible dot, `Baru · Belum dibaca` marker,
stronger title weight, and foreground hierarchy. Read cards remain neutral and
omit the marker/dot. The same read state is consumed by Admin, Customer desktop,
Customer mobile, and Akun Activity triggers. No red danger treatment or tab split
was introduced.

Component and CSS contract tests pass. A populated 3-unread/3-read mixed-feed
Production scan is `BLOCKED_BY_OPERATIONAL_DATA`.

## Global Button Refinement

The existing `Button`, `LinkButton`, `IconButton`/quiet treatment, semantic
variants, and `ActionGroup` remain the only implementation. The shared tokens
now make Secondary a clear sage surface with dark green label and visible green
border before hover. Primary remains scarce solid dark green; Tertiary/quiet
remains contextual; Danger remains semantic. Default, hover, pressed,
focus-visible, loading, disabled, 44px geometry, wrapping, and shared gap rules
remain centralized.

The new export CTA and Admin-assisted form use the same `ActionGroup`; no page
specific color patch or ButtonV2 was added. Deterministic UI tests pass. Real
authenticated Admin/Customer screenshot acceptance is `BLOCKED_BY_EXTERNAL_AUTH`
and approved populated records.

## Client Amendments

### Batch ETA Cargo

`batches.etaCargoMonth` stores normalized `YYYY-MM` and renders through the
existing BFG date formatter as month/year (for example, `Okt 2026`). Admin uses
the native month input beside Deadline PO. Customer Batch list/detail consumes
the same projection and labels it `Estimasi tiba` with no guaranteed-arrival
promise. Invalid localized strings are rejected.

### Customer `memberCode`

New and admitted customers receive a stable safe-name slug plus four-digit
suffix, with indexed uniqueness lookup and collision retry. Existing records
are backfilled on their next authenticated provisioning call; missing legacy
codes remain visibly labeled rather than fabricated in the UI. The code is a
search/display identifier only and is never used for authentication or
authorization.

It is visible in the Admin customer list/detail, assisted-order selector, order
list/detail, invoice context, deposit selector, and Batch roster. Stability and
collision retry are covered deterministically.

## Batch Purchasing

Purchase summary remains derived from Batch assignments and roster quantities.
Rows are grouped by Publisher in the existing Excel-compatible CSV export stack;
editable rosters say `preview`, while locked rosters say `purchase`. No XLSX
dependency was added where the repository’s canonical export stack is CSV.

`supplierPriceGbpMinor` is an additive variant-level client amendment because no
existing GBP supplier field was present. GBP remains integer pence; Customer
price remains integer IDR. Publisher, ISBN, title, format, quantity, GBP, and IDR
are exported without manual duplicate totals.

## Admin-Assisted Order

The existing `/admin/orders` path now exposes the canonical `preorder` and
`ready_stock` sources. It requires an existing active BFG Customer, displays
the member code, derives variant/price server-side, records Admin actor and
target customer in the existing audit/order history, and uses atomic Ready Stock
reservation. Secret Catalog orders still require an open authorized Catalog;
no WhatsApp-only ghost Customer is created.

## Customer ↔ Admin Sync

The changed projections are additive and share the same Convex records:

| State | Admin consequence | Customer consequence | Refresh contract |
| --- | --- | --- | --- |
| Cover/gallery | Book Master media query | Ready Stock/catalog projection | server/query-backed |
| Ready Stock order | Orders/activity/invoice CTA path | Buku Saya/order projection | server/query-backed |
| Batch ETA | Batch form/detail | Batch list/detail | server/query-backed |
| memberCode | customer/order/invoice/roster context | own account identity when exposed | server/query-backed |
| Activity read state | shared feed and trigger | shared feed and trigger | canonical `readAt` |

Hard-refresh persistence is covered by Convex query-backed tests; authenticated
Production hard-refresh evidence remains operational-data blocked.

## PRD Reconciliation

The source checkout contains the client-amendment PRD and reconciled source
documents, but the original PRD referenced by `SOURCE_OF_TRUTH.md` is outside
this checkout. The 19 grouped required-scope rows below are therefore traced
against the current source-of-truth/decision documents and implementation, with
the missing original file recorded rather than silently inferred.

| Required scope | Classification |
| --- | --- |
| Auth | GREEN_DETERMINISTIC |
| Public / Customer / Admin surfaces | GREEN_DETERMINISTIC |
| Ready Stock | GREEN_DETERMINISTIC |
| Join/admission | GREEN_DETERMINISTIC |
| Book Master | GREEN_DETERMINISTIC |
| Batch PO | GREEN_DETERMINISTIC |
| Batch roster | GREEN_DETERMINISTIC |
| Batch locking | GREEN_DETERMINISTIC |
| Deposit | GREEN_DETERMINISTIC |
| Invoices/payments | GREEN_DETERMINISTIC |
| Tracking | GREEN_DETERMINISTIC |
| Customer dashboard | GREEN_DETERMINISTIC |
| Secret Catalog | GREEN_DETERMINISTIC |
| Admin grant/revoke | GREEN_DETERMINISTIC |
| Order/invoice recap | GREEN_DETERMINISTIC |
| Batch purchase export | CLIENT_AMENDMENT + GREEN_DETERMINISTIC |
| Customer data/history | GREEN_DETERMINISTIC |
| Multi-Admin | GREEN_DETERMINISTIC |
| Minimum analytics | GREEN_DETERMINISTIC |

Client amendments in this round are ETA Cargo, memberCode, Publisher-grouped
purchase export, variant GBP minor price, Admin-assisted Ready Stock, and the
five critical regression fixes. Payment Gateway and WhatsApp Business API
automation remain excluded. No unresolved required `REAL_DEFECT` remains in
deterministic code; live closure is blocked only where live credentials,
approved business data, or real device access is required.

## Mobile Mockup Reconciliation

The detailed matrix is in
[`MOCKUP-COVERAGE-MATRIX.md`](MOCKUP-COVERAGE-MATRIX.md), including the exact
local paths and the reason each supplied image is `MATCH`, `PARTIAL`, or
`MISMATCH`. Current Round 2 verdicts are:

| Mockup | Verdict |
| --- | --- |
| 1 | PARTIAL |
| 2 | PARTIAL |
| 3 | PARTIAL |
| 4 | PARTIAL |
| 5 | PARTIAL |
| 6 | PARTIAL |
| 7 | PARTIAL |
| 8 | PARTIAL |

The common shell contract is preserved: centered logo-only mobile header and
five-item bottom navigation `Beranda`, `Katalog`, `Buku Saya`, `Tagihan`,
`Akun`; Activity remains under Akun.

## Security Regression

| Control | Result |
| --- | --- |
| Auth / RBAC | Existing boundary preserved; deterministic tests green |
| Ownership / IDOR | Existing boundary preserved; deterministic tests green |
| Rate limits | Existing upload/order controls preserved |
| Upload validation | Strict byte/MIME/extension/dimension/size/claim path preserved |
| CSP | Clerk/Cloudflare challenge origins added narrowly |
| Secret Catalog | Existing authorization preserved |
| Error disclosure | Unexpected customer errors normalized to safe copy |

## Engineering QA

| Gate | Result |
| --- | --- |
| Focused critical tests | 74/74 |
| Full Vitest suite | 279/279, serial integrated run |
| Convex deterministic suite | 143/143, serial integrated run; codegen/typecheck green |
| TypeScript | PASS |
| ESLint | PASS |
| Format | PASS |
| Build | PASS |
| `npm audit --omit=dev` | 0 vulnerabilities |
| `convex:check` | PASS against canonical Development deployment |
| `git diff --check` | PASS at last check |
| Playwright | Production launch blocked before test execution by managed macOS Chromium Mach-port permission; prior local run also had keyless Clerk/JWK/RSC noise. No false browser green claim. |

## Production

| Gate | Result |
| --- | --- |
| Convex | `clean-eel-522` accepted the final schema/functions deployment |
| Vercel | `READY`; deployment `dpl_47ov7KZgMF5ZeWkKKGmVTGwwCfUa` |
| Canonical URL | `https://www.blessingforgood.com` returned HTTP 200 after deploy |
| CSP/header evidence | Live response includes Clerk protection, Cloudflare challenge, worker, HSTS, nosniff, frame, and referrer policies |
| Runtime errors | No authenticated business-flow claim; no live runtime error log evidence collected |
| Android Chrome | BLOCKED_BY_EXTERNAL_AUTH_ACCESS |
| Desktop Chrome authenticated | BLOCKED_BY_EXTERNAL_AUTH_ACCESS |
| iOS Safari | Not available in this environment |

## Final Verdict

`NOT CLOSED`. The code is deployed and deterministic/public gates are green, but
the user’s absolute acceptance rule still requires real Production journeys and
representative devices for uploads, Ready Stock, CAPTCHA, Activity, and
authenticated Button states. Closure requires authorized Admin/Customer
fixtures and Android/Desktop (plus iOS where available) post-deploy
hard-refresh verification.
