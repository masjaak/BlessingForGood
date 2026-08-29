# BFG Global Button Audit

## Admin affordance tuning — 2026-08-29

The scoped Admin audit found operational mutation/lifecycle controls using the
frameless tertiary treatment. Existing framed variants now own these actions:

- Catalog archive: `src/components/admin-catalog-detail.tsx` → `danger`.
- Batch archive: `src/app/admin/batches/[batchId]/page.tsx` → `danger`.
- Catalog unlink and Batch unassign: the same Batch detail route → `secondary`.
- Invoice allocation release/reversal and transaction reversal:
  `src/app/admin/invoices/[invoiceId]/page.tsx` → `danger`.
- Admin order-reference backfill: `src/app/admin/orders/page.tsx` →
  `secondary`.

`Lepas tautan` keeps its existing callback, loading state, disabled state, and
authorization path. Navigation, inline links, support/reset actions, dialog
cancel controls, and icon controls remain tertiary by design. No shared Button
primitive or global Admin styling changed. Authenticated Production UAT for
the affected records remains pending.

Status: SOURCE + DETERMINISTIC QA COMPLETE; public/signed-out Production
render QA complete; authenticated state-specific QA remains an explicit
qualified gate. Audited against integrated source `f0eddc82` on 2026-08-24.

## Production render evidence — 2026-08-24

The latest Vercel Production deployment is `READY` and canonical.
Serial read-only browser checks passed `58/58` across representative customer
`375/430/768/1440` and Admin `1024/1440` viewports, with no route/browser
errors. The eight-viewport Activity fixture also passed. These checks prove the
deployed shell and signed-out boundaries; they do not substitute for a real
authenticated Admin/Customer record-state session.

## Inventory

Counts are source occurrences outside `src/components/ui.tsx`:

| Family | Count | Result |
| --- | ---: | --- |
| `Button` | 101 | canonical |
| `LinkButton` | 106 | canonical navigation |
| `IconButton` | 8 | named icon actions |
| `LinkIconButton` | 0 | primitive available; no current need |
| `ToggleButton` | 1 | gallery selected/unselected state |
| `ActionGroup` | 3 shared-wrapper uses | page/header/empty-state structure |
| Raw `<button>` outside primitive | 0 | guard enforced |
| Button-like custom class outside primitive | 0 | guard enforced |
| `quiet` / `button-quiet` | 0 | removed |

## Semantic audit

- Navigation callsites use `LinkButton`, including internal routes, external
  WhatsApp/preview destinations, proof links, and downloads.
- State changes use native `Button`, including invoice, payment, deposit,
  refund, batch, order, catalog, upload, save, and admission operations.
- Icon-only controls use `IconButton` with accessible names: close, back,
  gallery previous/next, quantity, and gallery ordering.
- Gallery thumbnail selection uses `ToggleButton` with `aria-pressed`.
- StatusBadge/status-badge remains non-interactive.
- Native `summary` disclosure uses semantic `details-summary`, not Button
  styling, because it is a disclosure control rather than a mutation.

## Route coverage

Customer surfaces audited: homepage, How To Order, Join, sign-in boundary,
Ready Stock, Catalog gateway/catalog, Product Detail, Buku Saya, Tagihan,
Akun, Activity, Profile, Address, and Deposit.

Admin surfaces audited: Dashboard, Content, Join Requests, Customers, Books,
Book Detail, Catalogs, Catalog Detail/access, Ready Stock, Orders, Order
Detail, Batch PO, Batch Detail, Exceptions, Invoices, Invoice Detail, Deposit,
Payments, Refunds, Reports, Users, Activity, and Settings.

## Conditional action matrix

Source callsites preserve business eligibility while consuming the shared
family for these states:

| State | Coverage |
| --- | --- |
| Draft / Published / Archived books | Book Master + catalog actions |
| Draft / Open / Closed catalogs | Catalog save/open/close |
| No invoice / Has invoice | Order and invoice actions |
| Payment submitted / Under review / Approved / Rejected | Payment queue |
| Batch editable / roster locked / archived | Batch transition, link, assignment |
| Active / revoked catalog grants and codes | Access management |
| Refund obligation / payout pending / processing / paid / failed | Refund operations |
| File selected / validation error / upload loading | shared BFG file picker |
| Join submitted / under review / approved / rejected | admission actions |
| Loading / disabled / explained inactive | primitive states |

Actions remain conditionally visible by role, ownership, and server state; the
visual audit does not broaden authority.

## Historical local rendered-QA boundary

The source and component contract are covered. A representative `customer-375`
Playwright run reached the browser with a generated Clerk keyless development
instance and a non-secret placeholder Convex URL: 16/19 checks passed; the
remaining failures were `/ready-stock` waiting on the invalid placeholder
deployment and Clerk/RSC network errors on `/sign-in` and one `/account` retry.
Authenticated Admin/Customer state coverage and Production screenshots remain
blocked without the real deployment/session configuration. The in-app browser
control required by the browser skill was unavailable, and no production route
or fake data was added to bypass that boundary.
