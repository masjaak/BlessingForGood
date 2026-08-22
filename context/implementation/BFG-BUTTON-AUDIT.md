# BFG Global Button Audit

Status: SOURCE + DETERMINISTIC QA COMPLETE; rendered authenticated QA remains
an explicit release gate. Audited against the current fetched `origin/main`
tree on 2026-08-22.

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

## Known rendered-QA boundary

The source and component contract are covered. A representative `customer-375`
Playwright run reached the browser with a generated Clerk keyless development
instance and a non-secret placeholder Convex URL: 16/19 checks passed; the
remaining failures were `/ready-stock` waiting on the invalid placeholder
deployment and Clerk/RSC network errors on `/sign-in` and one `/account` retry.
Authenticated Admin/Customer state coverage and Production screenshots remain
blocked without the real deployment/session configuration. The in-app browser
control required by the browser skill was unavailable, and no production route
or fake data was added to bypass that boundary.
