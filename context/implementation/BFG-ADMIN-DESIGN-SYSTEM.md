# BFG Admin Design System

Status: Phase 07 implementation baseline — operational UI ready

The Admin workspace is a desktop-first BFG operations desk. It shares BFG
identity with the customer experience while using denser, quieter presentation
for scanning queues, comparing records, and making safe decisions.

## Layout

- Sticky top context bar with the canonical Logo-1 mark, workspace
  label, customer-side link, and Clerk account control.
- Desktop workspace: 236px grouped sidebar plus a fluid content column inside a
  1480px maximum canvas.
- Complex records use dedicated detail pages; small decisions stay in the
  existing focused controls or confirmation dialogs.
- At 900px and below, the sidebar becomes a horizontally scrollable navigation
  strip. Admin remains usable on 1024px but is optimized for 1280–1440px.

## Navigation

Groups follow operator intent rather than database tables:

| Group      | Routes                                |
| ---------- | ------------------------------------- |
| Overview   | Dashboard                             |
| Customers  | Join Requests, Customers              |
| Catalog    | Books, Catalogs, Ready Stock          |
| Operations | Orders, Batch PO, Exceptions          |
| Finance    | Invoices & Deposit, Payments, Refunds |
| System     | Users, Settings, Audit; Admin operational access; Owner-only role/invitation sub-actions |

The active route is indicated by a green-tinted surface, border, icon, and
`aria-current="page"`. Customer-side navigation is a separate final link.

## Density and typography

- Warm neutral canvas, white surfaces, 12–14px radii, and restrained shadows.
- Sans-serif for navigation, table data, forms, money, and metadata.
- Serif is reserved for workspace titles and selected emphasis.
- Tables use compact 12–14px cells, uppercase muted headers, and tabular
  numerals for quantities and money.
- Decorative mascot use is limited to intentional empty states.

## Tables and filters

- Existing `.table-wrap` and `.data-table` are the shared table foundation.
- Use a first-column record identity, semantic status, relevant financial or
  inventory fields, then a clearly labelled action cell.
- Search and select filters stay close to the table and use native controls.
- No generic query-builder, analytics chart, or client-side financial
  recalculation is introduced.

## Status

Existing `StatusBadge` tones map consistently:

| Tone     | Meaning                                      |
| -------- | -------------------------------------------- |
| Neutral  | Draft, not started, informational            |
| Positive | Approved, available, paid, complete          |
| Warning  | Needs review, blocked, rejected, outstanding |

Domain labels remain explicit; color communicates urgency, not a replacement
for the label.

## Money and inventory

- All money remains integer IDR and uses the existing `Money`/`formatIdr`
  presentation.
- Issued invoice snapshots, approved payment history, refund obligations,
  payout attempts, and deposit ledger entries are shown as separate records.
- Ready Stock exposes `On hand`, `Reserved`, and server-derived `Available`.
  The Admin UI never edits `Available` directly.

## Forms and actions

- Existing `Button`, `LinkButton`, `Field`, `LoadingRegion`, `EmptyState`, and
  `ErrorState` primitives remain the foundation.
- Material actions name the consequence: issue, void, approve, reject, resolve,
  start payout, record paid, release, or archive.
- Existing pending, success, and error states remain visible around mutations.
- Financial, access, lifecycle, and destructive actions require the existing
  context and confirmation patterns; no context-free `Save`/`Mark paid` action
  is introduced.

## Loading, empty, and error

- Admin lists reuse `SkeletonTable` and the Phase 06.6 loading region.
- Empty states describe the operational next step and never use dummy records.
- Error states retain the route context and expose retry or the safest next
  navigation path.

## Data and security boundary

Admin reads and writes remain on the canonical Convex deployment through the
existing server-authorized queries and mutations. The UI does not grant a
role, derive financial truth, bypass ownership, expose catalog hashes, or
create a second synchronization layer.
