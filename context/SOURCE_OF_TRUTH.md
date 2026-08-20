# BFG SOURCE OF TRUTH

Reconciled: 2026-08-21 (Asia/Jakarta)
Applies to the current `main` after the Phase 08 Client UAT closure pass; the canonical Production deployment is
the latest Git-triggered `READY` deployment with Convex `clean-eel-522`.
Phase 07.1 is **CLOSED + RECONCILED** at the current application baseline.
Phase 08: **ACTIVE**. The original Client UAT matrix is stabilized with no
red, yellow, or unknown findings;
the Bulk Import V1 implementation is deployed but its legitimate Production
pilot is **DEFERRED BY USER**. Final Bulk Import Production acceptance is not
claimed. The current milestone is the stabilized Client UAT matrix; Product
Media remains source-contract preparation only. The entry gate is defined in
[`BFG-PHASE-08-ENTRY-GATE.md`](implementation/BFG-PHASE-08-ENTRY-GATE.md).

This document is the canonical product contract. It records requirements and
decisions first, then points to implementation and evidence. Code, screenshots,
tests, and completion reports are evidence; they are not requirement authority.

## Product Purpose

Blessing For Goods (BFG) is a community-led imported-book experience for
Blessfriends. The product helps visitors understand the service, join the
community, discover public Ready Stock, access controlled Secret Catalogs,
place structured orders, and follow operational, invoice, payment, deposit,
exception, refund, and notification consequences.

Customer experience is mobile-first and Indonesian-first. Admin experience is
desktop-first and operational. BFG records the structured commercial flow;
human WhatsApp handoff remains allowed where the approved flow calls for it.

## Current Production Baseline

| Item                           | Canonical value                                                          |
| ------------------------------ | ------------------------------------------------------------------------ |
| Phase 08 implementation commit | current `main` after the Client UAT closure pass                         |
| `origin/main`                  | current `main` after the Client UAT closure pass                         |
| Convex Development             | `content-snake-214`                                                      |
| Convex Production              | `clean-eel-522`                                                          |
| Vercel Production deployment   | latest Git-triggered `READY` deployment for current `main`               |
| Canonical Production URL       | `https://www.blessingforgood.com`                                        |
| Safe live evidence             | canonical URL returned HTTP 200; apex redirects to `www` with HTTP 308   |

Current exact regression baseline:

| Gate        | Result                                                                                                                                                                                    |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vitest      | `225 / 225`                                                                                                                                                                               |
| Convex      | `108 / 108` (included in Vitest)                                                                                                                                                          |
| Playwright  | `195 / 195` route smoke/rendered checks, including `18 / 18` rendered client UAT checks                                                                                                  |
| TypeScript  | PASS                                                                                                                                                                                      |
| ESLint      | PASS                                                                                                                                                                                      |
| Format      | PASS                                                                                                                                                                                      |
| Build       | PASS                                                                                                                                                                                      |
| Rendered QA | local production-server route/viewport checks pass; Homepage rhythm and shared visual checks are green; authenticated Admin Books/invoice spacing baseline is preserved at 1440px |
| Real UAT    | Authenticated Admin UAT evidence is recorded for Content, Settings, Orders, Invoices, Batch, Books, and Import; the Client UAT matrix is closed; Bulk Import pilot remains deferred by user |

No access codes, credentials, tokens, or customer-identifying business data
belong in this document or any other context file.

## Source Inventory

The canonical original source pack was inventoried from the external product
document set at `/Users/masjak/Documents/BLESSINGFORGOOD/BFG WEB/context/`.
The repository copies and later policy/decision files are reconciled evidence
and implementation context.

| Category        | Canonical source set                                                                                                                                                                                                | Reconciliation result                                                                                                                                |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Product         | `product/PRD.md`, `UX_FLOWS.md`, `BUSINESS_RULES.md`, `SCOPE.md`, `SUCCESS_CRITERIA.md`, `ROUTES.md`, `PERMISSIONS.md`, `OUT_OF_SCOPE.md`                                                                           | inventoried and mapped in the master matrix                                                                                                          |
| Features        | all files under `features/`, including auth, order, profile, deposit, invoice, payment, cancellation, tracking, Secret Catalog, Ready Stock, reports, settings, content, audit, users, upload, and WhatsApp handoff | inventoried; active minimum scope is implemented or explicitly classified                                                                            |
| Catalog rules   | `catalog/*.md`                                                                                                                                                                                                      | publisher/book/variant/catalog, preorder, Ready Stock, Secret Catalog, and batch rules locked                                                        |
| Database        | `database/*.md`                                                                                                                                                                                                     | schema, snapshots, transactions, invariants, retention, deletion, backup, and indexes reconciled with Convex                                         |
| Security        | `security/*.md`                                                                                                                                                                                                     | Clerk identity, BFG admission/RBAC, ownership, Admin boundary, file access, Secret Catalog secrecy, rate limits, audit, and fail-closed rules locked |
| Integrations    | `integrations/*.md`                                                                                                                                                                                                 | Clerk and Convex active; manual WhatsApp active; gateway and automated WhatsApp excluded; infrastructure docs remain operational reference           |
| Brand           | `brand/*.md`                                                                                                                                                                                                        | official Logo-1, approved Blessy assets, typography, tone, layout, mascot, and content rules locked                                                  |
| Screens         | `screens/admin/*.md`, `screens/mobile/*.md`                                                                                                                                                                         | source screen contracts mapped to the 10 tracked Admin and 8 tracked mobile image assets                                                             |
| Mockup mapping  | `mockups/ADMIN_MAPPING.md`, `MOBILE_MAPPING.md`, `MOCKUP_MANIFEST.md`, `MOCKUP_GAP_LIST.md`                                                                                                                         | historical filenames are stale; actual tracked assets are the visual evidence listed in the mockup matrix                                            |
| Decisions       | original `decisions/DECISIONS.md`, `SUPERSEDED_DECISIONS.md`, repository `context/decisions/*`, current user instructions                                                                                           | explicit later decisions win and are logged in `DECISION_LOG.md`                                                                                     |
| Phase contracts | original `implementation/PHASE-01...PHASE-09...`                                                                                                                                                                    | phases 01–07.1 are historical delivery context; the old Phase 08 list is reclassified from reconciled source, not copied as scope                    |

If a future task cannot locate a cited original source, it must record
`SOURCE_MISSING` rather than infer content.

## Source Precedence

When sources conflict, use this order:

1. Latest explicit user/client decision.
2. Original PRD.
3. Approved business, security, and financial policies.
4. Approved mockups.
5. Official BFG brand assets.
6. Canonical domain/schema/state machine.
7. Real current Production behavior, as evidence.
8. Current implementation, as evidence.
9. Previous completion reports, as historical status only.
10. Agent inference.

## Current Phases

- Phase 01: foundation and documentation.
- Phase 02: brand, community, and mascot.
- Phase 03: authentication, security, and domain.
- Phase 04: Secret Catalog and Ready Stock.
- Phase 05: customer order and portal.
- Phase 06: Admin catalog, batch, and customer operations.
- Phase 06.1–06.4: Convex catalog, admission, batch, payment, and exception slices.
- Phase 06.7: business policy closure for Ready Stock, exceptions, refunds, and financial consequences.
- Phase 07: Admin operational UI/UX and customer visual surface.
- Phase 07.1: source-of-truth, product-surface, visual, deployment, and real-flow stabilization.
- Phase 08: reports/integrations/settings backlog as originally named, now reclassified below.

## Completed Phases

The current code and supplied Production baseline establish the completed
Phase 07.1 surface. Earlier phases remain historical delivery milestones; the
canonical requirements are the reconciled contracts in this document and the
linked invariant/matrix documents.

## Current Phase

`BFG_PHASE_08_CLIENT_UAT_STABILIZED` — Phase 07.1 remains CLOSED +
RECONCILED; Phase 08 remains active for the deferred Bulk Import pilot and the
Product Media source decisions.

## Phase 08 Status

**ACTIVE — Client UAT is stabilized; the Bulk Import V1 Production pilot is
pending by user decision.** The locked source, data, policy, state, visual,
and traceability contracts are linked from
[`BFG-PHASE-08-SOURCE-CONTRACT.md`](implementation/BFG-PHASE-08-SOURCE-CONTRACT.md).
The implementation is a single `/admin/import` stateful flow, reuses the
canonical publisher/book/variant/audit/auth boundaries, adds no schema or
dependency, and does not start another Phase 08 candidate.

## Canonical Business Rules

- No public self-signup. Clerk authenticates identity; admission creates the
  BFG membership consequence.
- `appUsers` is the BFG membership, role, status, and ownership authority.
- All sensitive business and financial mutations are server-authorized and
  state-guarded in Convex.
- Mockup data is illustrative. Production must not receive dummy business
  records.
- Money is integer IDR. Historical commercial values are snapshots.
- Append-only histories and ledgers are preferred over destructive edits.
- Normal customer actions must be discoverable through natural navigation;
  backend-only or manually typed URLs are not complete product surfaces.

## Authentication

Clerk is the authentication and session authority. Convex derives identity from
the Clerk token. Authentication does not itself grant BFG membership,
customer access, catalog grants, Admin access, or ownership.

## Admission

Canonical flow:

`visitor/non-member → /join → joinRequests → Admin review → approve/reject →
approved invitation/account consequence → active appUser → private member
surfaces`.

The current proven Production admission flow is the authority for the final
handoff behavior. Clerk login alone never grants membership. Rejected history
is retained; duplicate active requests are blocked by normalized identity and
contact rules.

## Roles / Authorization

Canonical roles are `customer`, `admin`, and `owner`. The older `operator` role
in the original conceptual permission document is superseded by the current
explicit role contract and Admin permission set.

Canonical user states are:

- no `appUsers` row: admission required/deny private surfaces;
- `active`: role permissions apply;
- `suspended`: deny private and operational access.

Admin/Owner operations remain independently server-authorized even when a
route guard hides the UI.

## Customer Workspace

Natural customer surfaces are `/catalog`, `/account`, and their nested
`orders`, `invoices`, `batches`, `deposit`, `notifications`, `inbox`,
`profile`, and `addresses` routes. Desktop may expose a coherent header with
logo, primary nav, Aktivitas, and avatar. Mobile uses logo-only top header and
bottom navigation: Beranda, Katalog, Buku Saya, Tagihan, Akun.

Notification and Inbox live under Akun/Aktivitas on mobile. Unread indicators
are subtle and data-backed.

## Admin Workspace

`/admin` is an operational workspace with grouped navigation, one-row desktop
header (`Ruang kerja operasional`, customer-side link, Aktivitas, avatar),
actionable queues, shared status grammar, and explicit Owner-only system
surfaces. Admin uses customer-safe projections when viewing customer workspace
surfaces; `/admin` APIs are not a substitute for those projections.

## Product / Book Master

Book Master is the reusable identity for publisher, title, description,
categories, author, publication status, durable cover, and variants. A variant
owns format (`BB`, `PB`, `HB`), normalized ISBN, integer IDR price, and
availability. Publication visibility is server-controlled. Current durable
media proof is Admin upload → validated Convex storage → persisted reference →
hard-refresh persistence → customer-safe projection.

Multi-image galleries and external preview metadata are a separate Phase 08
candidate. The original source requires a Ready Stock detail gallery and the
mockup shows up to eight gallery images plus external-preview fields, but the
current reconciled model still lacks an approved media owner and external URL
allowlist. See
[`BFG-PHASE-08-PRODUCT-MEDIA-SOURCE-CONTRACT.md`](implementation/BFG-PHASE-08-PRODUCT-MEDIA-SOURCE-CONTRACT.md).

## Ready Stock

Ready Stock is public-safe discovery with customer-safe title, publisher,
format, ISBN, price, cover, and availability. Canonical availability is:

`available = onHand - reserved`.

An admitted active customer creates a canonical `orders` record with
`source=ready_stock`; reservation is atomic, cancellation releases an active
reservation, and fulfillment consumes it. Ready Stock does not create a
supplier Batch PO. Out-of-stock items have no active order consequence.

## Secret Catalog

Final canonical model is hybrid:

- Admin creates, edits, opens, closes, assigns products, and manages Access
  Management from `/admin/catalogs/[catalogId]/access`.
- A generated code is digest-only at rest, expiring, revocable, rate-limited,
  catalog-scoped, and shown in plaintext only in the immediate generation
  response.
- A valid code creates an opaque anonymous catalog browsing session. The
  server validates the session on every private catalog query.
- An active customer may receive an explicit member grant/revoke. Customer
  identity and ownership are still required for an owned order/account
  consequence.
- Catalog items reference Book Master variants; Admin can apply a catalog price
  override. Draft/archived products are excluded from customer projection.

The original authenticated-member-plus-code-only model and the previous
anonymous-only-as-the-entire-management-model are superseded. The secure
anonymous session remains one half of the active contract.

## Orders

Canonical sources are `customer_self_service`, `admin_assisted`, and
`ready_stock`. Customer and Admin-assisted orders resolve customer, catalog
access, variants, price, quantity, ownership, and snapshots server-side.
Order items preserve title, publisher, format, ISBN, unit-price, currency, and
quantity snapshots. Order mutation is idempotent where a submission key is
defined. Cancellation goes through the exception domain; direct status
shortcuts cannot bypass it.

## Batch PO

One batch may contain multiple publishers. The canonical lifecycle has seven
semantic states: `editable` plus the six-stage shipment sequence in Convex:

`editable → po_closed → ordered_to_supplier → shipped_internationally → customs
→ to_indonesia_warehouse → at_store`.

An unset stage is editable. Once a stage is set, roster/catalog edits are
locked according to the state guards. Customer list/detail surfaces are
derived from canonical orders, assignments, linked catalogs, and ownership;
they do not duplicate an order system.

Batch targeting is not a separate customer table. Admin targets an eligible
active Blessfriend through submitted order items that belong to a linked
Catalog. Assigning an item creates the customer/item roster projection. Before
the first shipment stage, Admin may assign an item, change its quantity,
remove it, or move it to another editable linked Batch. At `po_closed` and every
later shipment stage, the server denies roster, assignment, and Catalog-link
editing. Purchase Summary is derived from the roster assignments by book
variant and customer count; it is never a second editable purchasing source.
Batch ↔ Catalog is a relation: unlinking removes only the relation and never
deletes the Batch or Catalog.

## Tracking

Customer fulfillment uses:

`awaiting_payment → awaiting_address → packing → shipped → completed`.

Admin and customer projections expose only the fields allowed by the relevant
authorization boundary. Transition helpers reject skips unless the canonical
Admin operation explicitly allows them.

## Invoices

Admin creates a draft, issues a valid invoice, or voids it through canonical
mutations. Invoice values are integer IDR snapshots with immutable invoice
items and derived adjusted/outstanding/overpayment/refund values. Issuance
creates the customer Tagihan projection and the event-backed notification.
Where the source defines DP/final semantics, the invoice deposit-requirement
mode/value and allocation snapshot carry that consequence; no later catalog or
policy edit rewrites the historical invoice.

## Payments

Customer submits a payment confirmation and private proof where required.
Admin starts review, then approves or rejects. Approval updates canonical
invoice payment consequence and history atomically; UI-only/manual settlement
shortcuts are not valid.

## Deposit

Deposit is an append-only ledger. Top-up proof follows submit → review →
approve/reject. Allocation, release, debit, reversal, and refund holds are
explicit ledger consequences. Available balance is derived and can never be
manually edited to settle an invoice.

## Exceptions

Exceptions are item-level, append-only operational records. Customer
cancellation is a request; pre-PO eligibility may still require Admin review
when payment, batch, or other guards apply. Post-PO handling records recoverable
IDR of zero, partial, or full as appropriate. Defect replacement is preferred;
financial adjustment never rewrites the original order, invoice snapshot,
payment history, or deposit history.

## Refunds

`refund obligation ≠ cash payout`.

Obligations are separate from payout records. Payout status is
`pending → processing → paid` or `failed → retry`, supports partial settlement,
does not overpay, and never hard-deletes history. Deposit refunds are limited to
unallocated available deposit.

## Notifications

Notifications are event-backed attention receipts with recipient ownership,
event type, safe copy, destination, related entity, creation time, and `readAt`.
They never replace canonical order/invoice/payment state and never contain
credentials, access codes, or digests.

`Aktivitas` is the single customer/Admin UI entry for the two surfaces below.
`Notifikasi` means automatic system/state events such as invoice, payment, or
Batch updates. `Kotak Masuk` means persistent operational messages from BFG.
The UI presentation is unified for discoverability, but the backend tables,
queries, ownership, and authorization remain separate.

## Inbox

Inbox is a persistent operational message surface sourced from real submissions
and workflow events. It is not social chat: no presence, typing, reactions,
rooms, or arbitrary attachments are in scope. Customer ownership is enforced.
The unified Aktivitas presentation does not merge the Notification and Inbox
data models.

## Admin Users / Access

Owner can invite Admin staff, change roles, suspend, and reactivate through
server-authorized mutations. Owner-only operations remain Owner-only. No BFG
password/token is stored; Clerk handles identity.

## Audit / Activity

Privileged, financial, admission, access, media, and state-changing actions
write safe metadata to immutable `auditEvents`. Customer-facing Aktivitas is
not a fabricated audit feed; it is backed by Notifications and Inbox events.

## Visual System

The visual contract is documented in
[`BFG-VISUAL-SYSTEM.md`](implementation/BFG-VISUAL-SYSTEM.md). Canonical shared
primitives include `SiteShell`, `AdminLayoutShell`, `AdminNav`, `BrandLogo`,
`BookCover`, `CoverUploadField`, page-aware skeletons, shared
buttons/cards/fields/status badges, `WorkspaceActivityProvider`, and the
mobile bottom navigation.

## Responsive Rules

- Customer mobile: logo-only top header; bottom primary navigation; no desktop
  header control return. Notification and Inbox are discoverable under Akun →
  Aktivitas, with a small data-backed unread dot on Akun when either surface
  has unread records.
- Customer desktop: coherent one-row header with logo, primary nav, Aktivitas,
  and avatar.
- Admin desktop: one-row operational header with no wrapping at supported
  widths; `Lihat sisi pelanggan` remains one line and Activity/Avatar remain in
  the same action cluster.
- Book Detail: `COVER BUKU` uses a real aspect-ratio preview and
  `CoverUploadField` custom trigger over an accessible visually-hidden native
  file input. The canonical storage/upload consequence is unchanged.
- Skeletons preserve ready-state page geometry and use page-aware anatomy.
- Touch targets and readable empty/loading/error/success states are required.

## Official Brand Assets

Canonical logo is `public/brand/logos/Logo-1` (official BFG multicolor mark).
Approved mascot assets are `public/brand/logos/Mascott-1.png` through
`Mascott-4.png`; use them only in approved onboarding, guidance, selected
empty/help, or brand placements. Logo-2/3/4 are retained asset variants, not
the canonical primary mark. No legacy logo, random mascot, or mockup sample
business data is product authority.

## Explicit Exclusions

- Payment gateway or automatic bank settlement.
- WhatsApp Business API automation, unofficial automation, automated blasts,
  and machine-driven message sending.
- Full social chat/presence/reactions.
- Public self-signup.
- Native mobile apps, marketplace/multi-tenant/seller features, loyalty,
  referrals, gamification, automated supplier procurement, customs/shipping
  automation, full page-builder CMS, advanced accounting/tax, and automatic FX.
- Fake analytics, fake notifications, dummy Production business data.

## Superseded Decisions

Full entries are in [`DECISION_LOG.md`](DECISION_LOG.md). The active
supersessions are:

- conceptual `operator` role → current `customer/admin/owner` contract;
- authenticated-only Secret Catalog entry → hybrid secure code session plus
  member grant;
- anonymous-only Secret Catalog management → Admin-visible code and member
  access management;
- open Ready Stock contact/CTA-only behavior → canonical order/reservation;
- raw external cover URL as the only operator media path → validated durable
  storage upload;
- old eight-card How To Order composition → current continuous seven-step
  journey;
- old reports that said Phase 07.1 was blocked → current supplied stable
  Production baseline and exact current local counts.

## Deferred / Future Work

Only source-supported work appears in
[`BFG-PHASE-08-CANDIDATES.md`](implementation/BFG-PHASE-08-CANDIDATES.md):

- advanced analytics beyond the current bounded operational report;
- Bulk Import V1 is implemented and Production-deployed; its legitimate
  Production pilot is deferred by explicit user decision and final acceptance
  is not claimed.
- multi-image gallery and external preview metadata;
- broader backup/restore operations beyond current bounded export;
- cross-domain Admin search.

The excluded integrations above are not Phase 08 candidates.

## Development System V2

The permanent workflow is:

`SOURCE CONTRACT → VISUAL CONTRACT → TRACEABILITY CONTRACT → CODEBASE MEMORY
→ STATE MACHINE → @ponytail → TDD RED/GREEN/REFACTOR → RENDERED QA → REAL FLOW
QA → CODEBASE MEMORY POST-DIFF → @ponytail FINAL REVIEW → FULL REGRESSION → main
→ Vercel/Convex Production → REAL PRODUCTION ACCEPTANCE → ANCHORED CONTEXT`.

No source trace means no implementation. No mockup trace means no visual pass.
No backend consequence means no functional pass. No real flow means no product
pass. No Production acceptance means no phase closure.

For every substantial task, context must state: `OBJECTIVE`, `CURRENT STATE`,
`SOURCE OF TRUTH`, `DECISIONS MADE`, `SUPERSEDED DECISIONS`, `CONSTRAINTS`,
`OPEN QUESTIONS`, `BLOCKERS`, `CURRENT PRIORITY`, and `NEXT ACTION`.

Bug closure is: reproduce → trace source and blast radius → RED regression →
fix → GREEN → return to the original journey → inspect every affected surface
→ rendered QA → Production QA → close. A skeleton changing to an error is not
closure unless the intended product state is restored. A visual fix must trace
the shared primitive and render every consumer.

Completion reports must separate `IMPLEMENTED`, `LOCAL VERIFIED`,
`PRODUCTION DEPLOYED`, `REAL PRODUCTION VERIFIED`, `BLOCKED_BY_DATA`, and
`BLOCKED_EXTERNAL`. `DONE` is reserved for the relevant layers that actually
passed.

Before any future phase, create a Phase Source Contract with objective, source
requirements, baseline, exclusions, dependencies, rules, security, visual
source, deliverables, success criteria, and Production acceptance. A phase may
close only after source trace, logic/state/authorization tests, rendered QA,
Production deployment, applicable real flow verification, and context update.

## Current Test Baseline

Vitest `222/222`; Convex `107/107`; Playwright `177/177` route smoke plus
`18/18` rendered Homepage/shared-surface checks; TypeScript, ESLint, format,
and build all PASS. Future reports must also state rendered QA and real UAT
separately, with `BLOCKED_BY_DATA` and `BLOCKED_EXTERNAL` used explicitly.

## Current Production Infrastructure

Clerk is the identity provider, Convex is the domain/data authority, Vercel is
the Production web delivery layer, and `https://www.blessingforgood.com` is the
canonical public domain. Development and Production Convex deployments remain
`content-snake-214` and `clean-eel-522`. Environment separation and no-dummy-data
policy remain mandatory.

## Current Open Questions

There are no unresolved material source conflicts for the completed Phase 07.1
baseline. The following are deliberately bounded future decisions, not current
implementation blockers:

- exact advanced analytics dimensions and retention;
- exact gallery/preview metadata contract, including canonical ownership,
  projection, and external URL allowlist;
- exact backup/restore operational procedure;
- cross-domain Admin search scope and indexing.

Bulk Import mapping, rollback, duplicate, file, publication, stock, catalog,
and audit policies are resolved in the prepared Phase 08 Source Contract. The
remaining items are future contracts, not current implementation blockers.

## Phase 08 Client UAT Canonical Amendments — 2026-08-19

The original PRD remains historical contract evidence. The additive product
decisions for the current Client UAT are recorded in
`context/product/PRD-CLIENT-AMENDMENTS-2026-08-19.md`.

- **Content** controls approved public informational copy for Community, How To
  Order, and Help. It is not a generic CMS. **Settings** controls bounded
  operational store/contact/manual-payment configuration only.
- **Batch targeting** is assignment-based: Admin selects customers through
  eligible submitted order items. The roster is the resulting customer/item
  projection, editable before the first shipment stage and locked afterward.
- **Batch item assignment** uses the canonical order-item assignment mutation;
  add, quantity change, remove, and move are allowed only while editable.
- **Purchase Summary** is derived from roster assignments by book variant and
  customer count. It is not independently editable.
- **Order references** shown to people are stable BFG display codes. The
  Convex order ID remains the internal ownership/database identity.
- **Activity** is one UI entry containing two semantic streams: Notifikasi is
  system-event information; Kotak Masuk is persistent operational messaging.
  Backend tables and authorization semantics remain separate.
- **Admin responsive navigation** uses the same canonical navigation groups on
  desktop and tablet/mobile; Pengguna, Log aktivitas, and Pengaturan cannot be
  lost to horizontal clipping.
- **Settings V1** preserves store name, WhatsApp, and payment instructions and
  may add only consumed support/contact/manual-bank fields. Owner permission,
  validation, and safe fallbacks remain required.
- **Homepage slide decision:** swap the approved green background assignment
  between slide 1 and slide 3 without changing copy, order, layout, or motion.

## Anchored Summary

### Source of Truth

This file plus the linked matrices and invariant indexes.

### Current Production

Phase 07.1 stable baseline on the canonical domain; safe public smoke verified;
real business-flow evidence supplied as the current closure baseline.

### Final Decisions

Hybrid Secret Catalog access, server-authoritative admission/RBAC/ownership,
canonical Convex financial state, Ready Stock reservations, append-only
exceptions/refunds/ledger, and Indonesian-first responsive shells.

### Completed

Phase 07.1 product surface stabilization, source reconciliation, operational
surfaces, test baseline, deployment baseline, and real-flow closure evidence.

### Active

`BFG_AGENT_DEVELOPMENT_SYSTEM_V2_ACTIVE`.

### Deferred

Only the source-supported candidates listed above.

### Superseded

Historical conceptual routes, role wording, Secret Catalog-only models, old
visual compositions, and stale completion reports where explicitly listed.

### Blockers

No Phase 07.1 reconciliation blocker. Future work still requires its own source
contract and any external data/identity needed for acceptance.

### Test Baseline

225 / 108 / 195 plus all static gates PASS. The public Production route matrix,
configured 1024/1280/1440 Admin widths, and customer viewports are green. The
authenticated business-data evidence remains safe baseline evidence; no dummy
Production records were created.

### Next Milestone

Client UAT is stabilized. Resolve the two material Product Media source
decisions before any Product Gallery schema or UI implementation. Bulk Import
V1 remains deployed but its Production pilot is deferred by user.

## Phase 08 Next Milestone — 2026-08-21

- Phase 07.1: **CLOSED + RECONCILED**.
- Development System V2: **ACTIVE**.
- Phase 08: **ACTIVE — CLIENT UAT STABILIZED**.
- Bulk Import V1: **IMPLEMENTED + PRODUCTION DEPLOYED**.
- Bulk Import Production pilot: **DEFERRED BY USER**.
- Bulk Import final Production acceptance: **NOT YET CLAIMED**.
- Current priority: `BFG-PHASE-08-PRODUCT-MEDIA-SOURCE-CONTRACT.md` after the
  Client UAT closure matrix.
- Product Media implementation entry gate: **BLOCKED by 2 material source
  decisions**; spacing work is independent and authorized.
