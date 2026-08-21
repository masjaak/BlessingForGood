# BFG SOURCE OF TRUTH

Reconciled: 2026-08-21 (Asia/Jakarta)
Applies to the current `main` after the Phase 08 External Preview form
alignment closure; the canonical domain serves the latest READY Production
deployment with Convex `clean-eel-522`.
Phase 07.1 is **CLOSED + RECONCILED** at the current application baseline.
Phase 08: **COMPLETE — EXTERNAL PREVIEW FORM ALIGNMENT CLOSED**. The latest
real authenticated Production screenshot established the reachable Admin Book
Detail surface and the exact misalignment. The correction is deployed: paired
media fields now use explicit label, control, and support rows; the shared
`Field` primitive, validation, custom file picker, Gallery, and backend remain
unchanged. No credential, dummy record, or Production media mutation was
fabricated or performed.
Current product status is `PHASE_08_COMPLETE`,
`BFG_CURRENT_PRODUCT_SCOPE_COMPLETE`, `BFG_PRODUCTION_STABLE`, and
`PRODUCT_MODE: MAINTENANCE`. No Phase 09 is started.
The Bulk Import V1 implementation is deployed but its legitimate Production
pilot is **DEFERRED_BY_USER_DATA**. Product Media decisions are now locked and the
bounded implementation is deployed through the canonical Production hook;
authenticated Admin rendering is verified on one real book, while populated
media mutation remains blocked only by approved data. Cover presentation is
additive metadata over the original storage object and is projected through all
customer cover consumers. The entry gate is defined in
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
| Phase 08 implementation commit | `e04f3cd` — align External Preview label/control/support rows |
| Closure context commit         | current `main` after this targeted-pass context anchor                        |
| `origin/main`                  | current `main`; source and targeted context are pushed together                |
| Convex Development             | `content-snake-214`                                                      |
| Convex Production              | `clean-eel-522`                                                          |
| Vercel Production deployment   | Latest `READY` Production deployment, aliased to canonical domains |
| Canonical Production URL       | `https://www.blessingforgood.com`                                        |
| Safe live evidence             | `/how-to-order` returned HTTP 200; deployed CSS contains the External Preview grid; signed-out `/admin/books` boundary `3/3` at 1024/1280/1440 |

Current exact regression baseline:

| Gate        | Result                                                                                                                                                                                    |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vitest      | `241 / 241`                                                                                                                                                                               |
| Convex      | `111 / 111` (included in Vitest)                                                                                                                                                          |
| Playwright  | local full suite `264 / 264`; focused local media/file-picker checks `6 / 6`; live signed-out Admin boundary `3 / 3`; live public surface `40 / 48` with eight identical pre-existing cover-geometry failures outside this diff |
| TypeScript  | PASS                                                                                                                                                                                      |
| ESLint      | PASS                                                                                                                                                                                      |
| Format      | PASS                                                                                                                                                                                      |
| Build       | PASS                                                                                                                                                                                      |
| Rendered QA | local production-server route/viewport checks pass at 375/390/430/768/834/1024/1280/1440; deployed CSS contains the named paired-grid rules |
| Real UAT    | Latest user-supplied authenticated Production screenshot is the real Book Detail acceptance evidence; the corrected surface is deployed and no mutation was performed |

No access codes, credentials, tokens, or customer-identifying business data
belong in this document or any other context file.

## Phase 08 External Preview Closure — 2026-08-21

The authenticated Production screenshot supplied for the real Admin Book
Detail is the acceptance evidence for this targeted correction. The root
cause was inconsistent field-local DOM order: the URL field rendered its
support copy before its control while the label field did not. The fix uses a
local explicit grid with label, control, and support rows. Desktop controls
share one row and the canonical input height; at 768px and 834px the pair
stacks into independently readable fields. The URL helper remains below the
URL control with its original security meaning.

The shared `Field` primitive, Gallery, custom BFG file picker, file-upload
backend, URL validation, Book schema, Auth, Orders, Batch, Finance, Activity,
Homepage, How To Order, and Button system were not reopened. The implementation
commit is `e04f3cd`; the canonical domain serves the latest `READY` Production
deployment. The live public visual suite recorded eight
identical cover-geometry assertion failures outside this diff; that unrelated
baseline remains out of scope.

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

## Latest Phase 08 Targeted UI Reopen — 2026-08-21

The newest real Production screenshots temporarily supersede the previous
visual green label for this bounded pass only. The active scope is Button and
LinkButton affordance states, the shared accessible BFG file-picker
presentation, Admin media upload form geometry, and How To Order desktop/mobile
spacing. Auth, RBAC, Orders, Batch, Invoice, Deposit, Payment, Refund, Secret
Catalog, Activity, Human references, Product Media data contracts, cover crop
metadata, Bulk Import, Admin IA, customer navigation, the seven-step business
sequence, and Tabler icons remain locked and are not reopened.

The permanent visual contract is: secondary/quiet controls must remain visibly
clickable against cream/white surfaces; every clickable control exposes default,
hover where supported, active/pressed, focus-visible, and disabled states; all
visible upload controls use one BFG picker over an accessible native input; the
Admin media form uses a semantic field grid and separate action row; and the
locked How To Order journey uses shared desktop rows plus tokenized mobile
section gaps. Closure requires local regression, rendered responsive QA, the
current Git/Production anchor, and a real Production recheck of the reachable
surfaces.

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

`BFG_PHASE_08_TARGETED_VISUAL_STABILIZATION_RECLOSED` — Phase 07.1 remains
CLOSED + RECONCILED; the four verified visual findings were fixed through
shared primitives, deployed, and rechecked on the canonical Production domain.
Data and operational deferrals remain explicit.

## Phase 08 Status

**COMPLETE — targeted visual stabilization is closed.** The locked source,
data, policy, state, visual, and traceability contracts are linked from
[`BFG-PHASE-08-SOURCE-CONTRACT.md`](implementation/BFG-PHASE-08-SOURCE-CONTRACT.md).
The implementation is a single `/admin/import` stateful flow, reuses the
canonical publisher/book/variant/audit/auth boundaries, adds no schema or
dependency, and does not start another Phase 08 candidate. Activity is one
unified presentation over separate Notification and Inbox sources. Product
Media V1 is Book Master-owned and uses the existing Convex storage boundary.

The Activity responsive closure fixed the shared root cause: the prior nested
implicit grid track preserved intrinsic long-content width, while the anchored
panel did not measure right-side collision and the narrow fixed surface could
inherit an unsafe containing block. The canonical fix uses `minmax(0, 1fr)`,
`min-width: 0`, normal wrapping, measured viewport-safe width/position/height,
and internal vertical scrolling without hiding or deleting content.

The post-closure visual stabilization fixed four additional shared contracts:
How To Order is a continuous seven-step desktop journey with one outline icon
family and a vertical mobile/tablet timeline; Perjalanan Bukumu is a compact
grouped three-step orientation; Mengenal BFG uses the canonical high-contrast
section headline hierarchy; and BookCover preserves the original uploaded
image while applying optional Admin-controlled zoom/position metadata for the
customer frame.

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

Product Gallery V1 is Book Master-owned and permits up to eight additional
ordered images; variants do not override it. External Preview V1 is optional
HTTPS metadata only: label/title plus URL, with no server fetch, scrape, iframe,
or remote image hotlink. Cover remains a separate primary identity image. See
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

`Aktivitas` is one newest-first customer/Admin feed projected from both
surfaces. Each item carries a compact `Sistem` or `Pesan BFG` label for context;
the user does not choose a category before reading activity. `Notifikasi` means
automatic system/state events such as invoice, payment, or Batch updates.
`Kotak Masuk` means persistent operational messages from BFG. The UI projection
is unified, but backend tables, queries, ownership, retention, and read
semantics remain separate.

## Inbox

Inbox is a persistent operational message surface sourced from real submissions
and workflow events. It is not social chat: no presence, typing, reactions,
rooms, or arbitrary attachments are in scope. Customer ownership is enforced.
The unified Aktivitas presentation does not merge the Notification and Inbox
data models. Existing Inbox routes remain compatibility/deep-link surfaces, not
a second primary Activity destination.

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

### Permanent visual contracts — Phase 08 post-closure stabilization

- **How To Order:** the canonical seven business steps remain one shared data
  set; desktop uses a connected seven-step journey, mobile/tablet use a
  readable vertical timeline, and all icons use one normalized semantic outline
  family.
- **Perjalanan Bukumu:** the three orientation steps remain one compact grouped
  tool inside a narrower internal wrapper; the page container is unchanged.
- **Mengenal BFG:** `Satu cerita, beberapa langkah kecil.` uses the canonical
  high-contrast primary heading hierarchy on the approved surfaces.
- **Book Cover:** the original uploaded media remains untouched; optional
  `{ zoom, x, y }` presentation metadata controls framing inside the canonical
  cover card without distortion or a second destructive source image.

## Responsive Rules

- Customer mobile: logo-only top header; bottom primary navigation; no desktop
  header control return. The full-width Aktivitas surface is discoverable under
  Akun, with a small data-backed unread dot on Akun when either source has
  unread records.
- Customer desktop: coherent one-row header with logo, primary nav, Aktivitas,
  and avatar; its anchored panel is bounded to the viewport, vertically
  scrollable, and never horizontally scrollable.
- Admin desktop: one-row operational header with no wrapping at supported
  widths; `Lihat sisi pelanggan` remains one line and Activity/Avatar remain in
  the same action cluster. Activity uses one viewport-measured, bounded
  anchored panel; narrow Admin widths use the same safe bounded panel rather
  than an escaping popover.
- Book Detail: `COVER BUKU` uses a real aspect-ratio preview and
  `CoverUploadField` custom trigger over an accessible visually-hidden native
  file input. The canonical storage/upload consequence is unchanged.
- Skeletons preserve ready-state page geometry and use page-aware anatomy.
- Touch targets and readable empty/loading/error/success states are required.

### Activity responsive geometry contract — Phase 08

`Aktivitas` is one unified chronological feed. Notification and Inbox remain
separate backend sources, projected as `Sistem` and `Pesan BFG` metadata in the
same newest-first presentation.

- Desktop uses a viewport-bounded anchored panel. Its preferred width is 380px,
  clamped to the actual visual viewport with 12px safe gutters; the whole
  panel shifts left when the trigger is near the right edge.
- Tablet keeps the bounded anchored panel while it fits; the same measured
  geometry supplies a safe bounded mode when the trigger/window has less room.
- Mobile customer Activity is a full-width surface reached through
  `Akun` → `Buka Aktivitas`; the customer top header remains logo-only and the
  five-item bottom navigation remains visible.
- The open panel recalculates on open, resize, visual-viewport changes, scroll,
  and anchor-size changes. Its height is capped by the real viewport and its
  feed scrolls vertically inside the panel.
- Activity content is never removed, clipped, or shortened to fit. Panel,
  content grid, item cards, flex children, descriptions, references, and action
  buttons use shrinkable tracks, normal wrapping, and safe reference wrapping.
- Activity, its feed, its item cards, and the page must have zero horizontal
  overflow because their geometry fits; `overflow-x: hidden` is not the fix.

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
- Product Media V1 is implemented and deployed; populated Gallery/Preview UAT
  is `BLOCKED_BY_APPROVED_DATA` because no approved asset or HTTPS URL exists.
- broader backup/restore operations beyond current bounded export;
- cross-domain Admin search.

Advanced analytics, custom backup/restore operations, and cross-domain Admin
search are explicitly `OPTIONAL_FUTURE`; they do not block current-product
completion. Bulk Import V1 is implemented and deployed, while its 3–5-book
pilot is `DEFERRED_BY_USER_DATA` and must not be fabricated.

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

Vitest `237/237`; Convex `111/111`; local Playwright `214/214` after the new
responsive contracts; live targeted visual suite `18/18`, homepage/How To Order
smoke `12/12`, and Ready Stock smoke `6/6`; rendered screenshots at the required
widths; TypeScript, ESLint, format, build, and `git diff --check` all PASS.
Data-limited cover UAT is classified explicitly and is not treated as a reason
to fabricate Production media.

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

Phase 08 final product scope is stable on the canonical domain after the
targeted visual stabilization; safe public smoke and the four-finding live
visual recheck are verified. The source deployment was
`dpl_AJo6wHk3tQzFTdmqu6716cTDwYxx`; Convex Production is `clean-eel-522`.

### Final Decisions

Hybrid Secret Catalog access, server-authoritative admission/RBAC/ownership,
canonical Convex financial state, Ready Stock reservations, append-only
exceptions/refunds/ledger, and Indonesian-first responsive shells.

### Completed

Phase 07.1 product surface stabilization, Phase 08 scope implementation,
post-closure visual stabilization, source reconciliation, operational surfaces,
test baseline, deployment baseline, and final public Production recheck.

### Active

`PRODUCT_MODE: MAINTENANCE` with Development System V2 retained for bug fixes.

### Deferred

Only the source-supported candidates listed above.

### Superseded

Historical conceptual routes, role wording, Secret Catalog-only models, old
visual compositions, and stale completion reports where explicitly listed.

### Blockers

No known implementation, responsive, security, ownership, financial-invariant,
or source-defined required-feature blocker. Approved-data and operational-data
limits remain explicitly classified and do not block current-product stability.

### Test Baseline

Vitest `232/232`; Convex `110/110`; Playwright `202/202`; rendered `24/24`
plus the Activity matrix; TypeScript, ESLint, Format, Build, and
`git diff --check` PASS. No dummy Production records were created.

### Next Milestone

Monthly maintenance review and client-driven defect handling only. Do not
create Phase 09 without a genuine new business requirement.

## Phase 08 Post-Closure Visual Stabilization — 2026-08-21

- Phase 07.1: **CLOSED + RECONCILED**.
- Development System V2: **ACTIVE**.
- Phase 08: **COMPLETE — TARGETED VISUAL STABILIZATION RE-CLOSED**.
- Bulk Import V1: **IMPLEMENTED + PRODUCTION DEPLOYED**.
- Bulk Import Production pilot: **DEFERRED BY USER**.
- Bulk Import final Production acceptance: **DEFERRED_BY_USER_DATA**.
- Homepage, How To Order, and Ready Stock public Production recheck: **PASS**;
  targeted visual suite `18/18`, homepage/How To Order smoke `12/12`, and Ready
  Stock smoke `6/6` across the configured widths.
- Cover presentation: **GREEN_DETERMINISTIC_NO_SAFE_REAL_DATA**; original
  storage preservation, metadata validation/projection, reset, persistence,
  authorization, and legacy defaults are covered without fabricating a live
  cover or mutating Production business data.
- Product Media source decisions: **LOCKED**; populated Gallery/Preview UAT is
  `BLOCKED_BY_APPROVED_DATA`, with implementation and empty states green.
- Product status: `BFG_CURRENT_PRODUCT_SCOPE_COMPLETE`,
  `BFG_PRODUCTION_STABLE`, `PRODUCT_MODE: MAINTENANCE`.
