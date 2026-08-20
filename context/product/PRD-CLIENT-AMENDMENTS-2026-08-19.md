# BFG Client Amendments — 2026-08-19

This document is additive product-contract evidence. The original PRD remains
the historical contract; this file records the latest client UAT decisions
that clarify the current product intent.

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
