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
lint/format/diff: PASS. No business fixture is created in Production.

Follow-up PR #25 https://github.com/masjaak/BlessingForGood/pull/25 merged normally
at `b47065e32cc86cd7c867cabc5b83ffd7f7bcebb8`. Preview
`dpl_D1Dmn823o6RmLeRw8zqoRZhvZhqx` was READY; native authenticated direct URL,
refresh, media, price, desktop/mobile and unauthorized-session checks passed.
Production `dpl_4T2Va9mpHzMkHaedjXPYtEvWH6Xi` was READY and aliased to the
canonical domains. Readonly Customer smoke used an existing active grant and the
last-page book of an existing 594-title Catalog, with cover/gallery and variants.

After standalone Ready Stock release `720deea52c8c7b79c088d70b846978ee5c0dc6a4`,
the same readonly Production check passes again: the live Catalog now contains
596 titles, direct detail and refresh return full Book/Variant/media without
browser errors. No Catalog code, grant or business data was changed by smoke.
Evidence: local ignored `artifacts/browser-qa/two-ticket/catalog-production-evidence.json`
and visually inspected `catalog-production.png`. Status: `ALREADY_FIXED_VERIFIED`.
