# Standalone Ready Stock verification

The latest client direction supersedes Master-linked Ready Stock price overrides.
Existing branch `feat/manual-ready-stock-standalone`, implementation `d519a2b`
and PR #24 are retained. Legacy tables and historical orders are not deleted.

`readyStockListings` owns title, format, price, stock and cover; separate media
owns up to eight gallery images. Admin uses the existing guarded storage upload
boundary. Drafts may lack cover; publish requires cover and positive stock.
Public discovery, detail, metadata, sitemap and Product offers use only listings.

Direct checkout accepts listing, quantity and a customer-scoped request key.
Server resolves price, snapshots shipping/product fields, reserves atomically,
creates `readyStockOrders` and issues a real Invoice. Retries return one order.
Existing Finance owns waiting/verifying/paid states. Server validates paid →
packing → shipping → delivered; delivery consumes stock. Unpaid invoice void
releases once. A shared semantic timeline remains visible in Customer history.

The original Preview failure was a missing public backend function during
prerender, not a credential gate or compile failure. Canonical Development was
deployed explicitly; Preview credentials and automatic deployment gates remain
unchanged. No package, auth, Cart or Random PO architecture changes.

All 340 backend tests pass, including real payment APIs, oversell, idempotency,
shipping/price history, invalid uploads and gallery limits. Local production build
passes. Five known frontend baseline failures remain out of scope: assisted
discovery ×2, Admin skeleton ×1 and homepage ×2. Standalone contract fixtures are
updated to the new source shape; existing protected assertions remain intact.

Authenticated Preview, screenshots at 1440/1024/768/430/390, merge and readonly
Production smoke must pass before completion. Runtime evidence will be appended.
