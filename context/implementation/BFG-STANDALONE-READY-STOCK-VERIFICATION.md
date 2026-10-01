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

Vercel Git Preview hit its remote build quota before compilation. Official
`vercel build`/`deploy --prebuilt` produced READY Preview
`https://blessing-for-good-48pi3t9rq-masjaaks-projects.vercel.app`, with the original
credential gate passing. Native browser upload then exposed the hard-coded upload
CORS origins. `BFG_UPLOAD_PREVIEW_ORIGINS` now permits only explicitly configured
HTTPS BFG/team Preview origins; default Production origins and upload ownership,
MIME, size, authentication and permission checks remain intact. Development alone
configures this Preview origin. Red → green HTTP tests include unconfigured and
foreign/insecure origins; all 30 focused upload/standalone contracts pass.

All 340 backend tests pass, including real payment APIs, oversell, idempotency,
shipping/price history, invalid uploads and gallery limits. Local production build
passes. Five known frontend baseline failures remain out of scope: assisted
discovery ×2, Admin skeleton ×1 and homepage ×2. Standalone contract fixtures are
updated to the new source shape; existing protected assertions remain intact.

Authenticated Preview, screenshots at 1440/1024/768/430/390, merge and readonly
Production smoke must pass before completion. Runtime evidence will be appended.

Authenticated Preview now proves Admin create, cover + two gallery uploads,
publish, search/sort, Product JSON-LD, direct Customer checkout (2 × 100000), real
200000 Invoice, native payment-proof submission, Admin approval and packing →
shipping → delivered. Customer observes every stage and delivered history. A
later 150000 order preserves the old 100000 snapshot; void releases its stock.
All four surface families have captured 1440/1024/768/430/390 views without page
overflow. API tokens are refreshed in long-running QA; no role or auth changes.

Visual QA exposed two Ready Stock-only layout gaps: stretched cover frames had
492px unused space (corrected to 17px), and timeline state captions flowed into
stage labels. Scoped CSS uses natural frame height and block captions. Browser
geometry checks supply red/green evidence; final Preview images will verify both.
Final focused frontend: 29 PASS. Full frontend: 508 PASS plus exactly five accepted
inherited failures; no branch-specific failure. All 341 backend tests, typecheck,
lint (one inherited Random PO warning), production build and diff checks pass.
Whole-repo formatting has inherited out-of-scope findings; changed TS/TSX sources
pass scoped format checks. Protected source files are not reformatted.

Ticket B Production readonly smoke opened and refreshed the last-page book in an
existing 594-title Catalog using an existing active Customer grant. Full Book,
Variant price, cover and gallery render; no browser error and no dummy Production
data. Original PR #23 and follow-up PR #25 are already deployed.
