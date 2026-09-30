# Secret Catalog high-index detail verification

Implementation was already merged in PR #23 at
`fdfb51a2efd1c3f9f4d57791d99b21b1c237c8dc`. The original detail component searched
the current `unlockedCatalog.books` page; the compatibility projection also capped
Catalog items at 500. Server browse/search could find later items, while detail
could not resolve them from that partial list.

The merged fix queries `catalogAccess.getBookUnlocked` with Catalog and Book IDs,
validates the existing session/code/access-period or customer grant, then uses
indexed Catalog membership to hydrate Book, allowed Variants, Catalog price and
media directly. No pagination, ordering or Cart behavior changes.

Follow-up on the same canonical Ticket B branch reuses the repo's existing
`useSyncExternalStore` hydration pattern to resolve the lint regression introduced
by synchronous state setters in the merged detail effect. Session storage stays
client-only; server rendering waits for hydration. No authorization rule changes.

The deterministic fixture now has 660 titles. Positions 25, 598, 601, 615 and 628
pass search, direct detail, repeated-query/refresh contract, Variant price and
cover/gallery assertions. Missing grant, missing identity, invalid session,
outside-Catalog Book and closed Catalog reject or return unavailable. An anonymous
valid unlocked session continues to resolve the high-index detail.

Focused backend: 4 PASS. Detail/auth components: 13 PASS. Typecheck and scoped
lint/format/diff: PASS. Runtime Preview/Production evidence will be appended after
the follow-up deployment. No business fixture is created in Production.
