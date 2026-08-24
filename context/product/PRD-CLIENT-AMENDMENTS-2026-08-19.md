# BFG Client Amendments — 2026-08-19

This document is additive product-contract evidence. The original PRD remains
the historical contract; this file records the latest client UAT decisions
that clarify the current product intent.

## Reconciled implementation contract — 2026-08-24

The maintenance corrections are integrated and deployed without changing the
product contract or creating a second flow:

- Order detail exposes `Terbitkan invoice` only when the existing Finance
  state allows it; an existing invoice shows its canonical human reference,
  status, outstanding amount, and `Buka invoice`.
- Activity remains one `ActivityCenter` presentation over separate Notification
  and Inbox domains. Unread state uses surface tint, accent, dot, `Baru`, and
  semantic copy rather than border color alone.
- `ActionGroup` is one global primitive. Pages choose legitimate actions and
  semantic hierarchy; the Button system owns style, size, state, gap, and
  responsive stacking.
- Invoice references use `BFG-INV-YYMMDD-XXXX`; internal Convex IDs remain
  unchanged. Legacy backfill is bounded, previewable, idempotent, and limited
  to the human reference field.
- Master Book `Simpan` persists and reports success/error without publishing a
  Draft. `Terbitkan buku` is explicit.
- Ready Stock is direct stock-backed purchase; Secret Catalog is private
  multi-Publisher/multi-title PO/preorder; Batch is a multi-Publisher,
  multi-title operational PO window grouped by shared close date. Customer
  Batch projections still require Secret Catalog authorization and own-order
  rights.

These rules are deployed on the canonical Convex/Vercel targets. Deterministic
QA is green. Authenticated business-record Production recheck remains
qualified when no authorized Clerk session or safe real record is available;
no data is fabricated.

## Active amendments

1. **Admin Content has a bounded publishing purpose.** Content controls the
   approved public informational copy used by the Community, How To Order,
   and Help surfaces. It is not a generic CMS, blog, or marketing automation
   system. Settings controls operational configuration instead.
2. **Invoice owner recognition is operationally required.** Admin invoice
   surfaces expose the relevant customer name together with the stable order
   reference and invoice reference. Ownership and authorization rules do not
   change.
3. **Orders have a human-facing reference.** The canonical database ID remains
   machine-only. Admin and customers receive a stable, server-generated BFG
   order reference that is short enough to communicate and search.
4. **Batch PO targeting is assignment-based.** Before the first shipment stage,
   Admin may select customers through their eligible submitted order items,
   assign or change item quantities, and remove assignments. The roster is the
   resulting customer/item projection; it is not a separate editable summary.
5. **Purchase Summary is derived.** It aggregates assigned quantities by book
   variant and customer count. It is not an independently editable data source.
6. **Batch ↔ Catalog is a many-to-many operational relationship where the
   existing domain permits it.** Admin can view, add, and unlink multiple
   Catalog relationships before the Batch is locked. Unlinking does not delete
   either object and cannot invalidate active assignments.
7. **Settings V1 is bounded operational configuration.** Existing store name,
   WhatsApp, and manual payment instructions remain. Owner-only Settings may
   additionally hold support email, social contact, and manual bank details
   only when consumed by the customer payment/help surface. No secrets,
   gateway, automation, or state-machine controls belong there.
8. **Activity has one UI entry with two meanings.** Notifikasi remains the
   system-event stream; Kotak Masuk remains persistent operational
   communication. They are intentionally separate backend domains and are
   presented together under Aktivitas.
9. **Homepage visual decision.** Swap the approved green background assignment
   between slide 1 and slide 3 only. Copy, order, layout, and motion remain
   unchanged.

## Non-amendments

Cover containment, dropdown anchoring, responsive navigation, catalog frame
height, action spacing, and Master Buku alignment are implementation/UAT
corrections. They do not change product intent and belong in the UAT fix
matrix, not in the product contract.

Bulk Import V1 remains locked to its existing CSV, validation, draft/inactive,
atomic-write, audit, no-stock, no-Catalog, no-media, and no-customer-leakage
contract.

## Active amendment — maintenance commerce contract — 2026-08-22

This additive amendment records the latest client clarification without
rewriting the historical original PRD:

- **Ready Stock** is direct, stock-backed purchase while available stock is
  greater than zero. It does not require a supplier Batch PO.
- **Secret Catalog** is a private PO/preorder model. One Secret Catalog may
  contain many publishers, Book Masters, and titles.
- **Batch PO** is not publisher-bound. A Batch may contain items from many
  publishers and titles when they share the same operational close date/
  deadline.
- **Publisher** is a Book/Catalog-item attribute, not the identity of a Batch.
- **Customer Batch projection** may show only legitimately accessible,
  orderable Catalog items plus the Customer's own resulting order,
  assignment, and status information. A Batch is not a Secret Catalog access
  bypass.
