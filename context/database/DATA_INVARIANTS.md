# Phase 03.1 data invariants

- Publisher slugs are unique.
- Book slugs are unique per publisher.
- ISBNs are unique across variants.
- A book has at most one variant per format.
- A catalog slug is unique.
- A catalog/variant pair is unique.
- Prices and quantities are safe integers; prices are non-negative and quantities are positive.
- Effective catalog price is the item override or the variant price.
- Access codes are keyed digests; plaintext codes are never stored or returned.
- Customer order writes require an active grant and an open catalog.
- Order totals and snapshots are calculated inside one Convex mutation.
- A customer can read only orders owned by its current prototype session.
- Customer edits require a submitted order, an open catalog, and an unexpired editable window.
- Submitted orders contain at least one valid, available catalog item.
- Status changes are limited to the Phase 03.1 order states: submitted, cancelled, completed.
