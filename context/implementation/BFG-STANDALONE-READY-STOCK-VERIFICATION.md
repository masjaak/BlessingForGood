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

All 341 backend tests pass, including real payment APIs, oversell, idempotency,
shipping/price history, invalid uploads and gallery limits. Local production build
passes. Five known frontend baseline failures remain out of scope: assisted
discovery ×2, Admin skeleton ×1 and homepage ×2. Standalone contract fixtures are
updated to the new source shape; existing protected assertions remain intact.

Authenticated Preview, screenshots at 1440/1024/768/430/390, merge and readonly
Production smoke are the release gates. Their final evidence follows.

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
geometry checks supply red/green evidence; final Preview images verify both.
Final focused frontend: 29 PASS. Full frontend: 508 PASS plus exactly five accepted
inherited failures; no branch-specific failure. All 341 backend tests, typecheck,
lint (one inherited Random PO warning), production build and diff checks pass.
Whole-repo formatting has inherited out-of-scope findings; changed TS/TSX sources
pass scoped format checks. Protected source files are not reformatted.

Ticket B Production readonly smoke opened and refreshed the last-page book in an
existing 594-title Catalog using an existing active Customer grant. Full Book,
Variant price, cover and gallery render; no browser error and no dummy Production
data. Original PR #23 and follow-up PR #25 are already deployed.

## Final release — 2026-10-01

Frozen source: `33ebd9a7502d08ddacd6bbb4ab8f2d9e965fcdb3`.
PR #24: https://github.com/masjaak/BlessingForGood/pull/24
Normal merge: `720deea52c8c7b79c088d70b846978ee5c0dc6a4`.
Automatic Preview: `dpl_2Rsf4tNdNJQ1b9zV62XSvZKbDKjD`, READY at
https://blessing-for-good-fqucaaemp-masjaaks-projects.vercel.app.

Final Preview repeats guarded gallery add/remove, server-price checkout of the
last unit, persistent success/Invoice link after stock reaches zero, exact Invoice,
reservation release, unchanged Cart, historical delivered snapshot and standalone
sitemap/Product JSON-LD. All twenty final viewport captures pass without document
overflow or page errors. Cover-frame unused space is 17px and timeline captions
occupy separate lines. The isolated fixture is archived after verification.

Initial Production build failed prerender because `convex deploy --cmd` runs the
frontend build before pushing new backend functions. Production did not yet have
`readyStockListings:list`; compile and TypeScript already passed. Explicit deploy
to canonical `clean-eel-522` passed schema validation/typecheck, added only the
required indexes, and deleted no indexes. Redeploying the same merged commit
through the unchanged Vercel build/credential gate succeeded.

Production: `dpl_93knque1vbJa8LgMK2cQWWZfF35y`, READY at
https://blessing-for-good-2ojl7ptvy-masjaaks-projects.vercel.app and aliased to
https://www.blessingforgood.com. Readonly existing Owner/Customer sessions prove
Admin operational workspace and manual form, public empty state, unavailable
detail returning 404, standalone sitemap, Customer own-orders/Tagihan and exact
anonymous/Customer Admin-permission rejection. Six desktop/mobile captures have
no document overflow or page errors. Production currently has zero standalone
listings/orders and 213 legacy variants in the retained API. No business mutation
or dummy record was made there; populated product/transaction/media proof remains
the authenticated Preview fixture. Existing Catalog direct URL/refresh still
passes after this release on the last page of a real 596-title Catalog.

Local ignored evidence under `artifacts/browser-qa/two-ticket/`:
`standalone-preview-evidence.json` (full finance/fulfillment),
`standalone-final-preview-evidence.json` (source commit, final twenty views,
last-unit checkout, history/release), `standalone-production-evidence.json`
(readonly checks/counts/no mutations), `catalog-production-evidence.json`.
Visual artifacts: `final-{admin,public,detail,timeline}-{width}.png`,
`production-{admin,public}-{width}.png`, `production-account-390.png`,
`production-invoices-390.png`, `catalog-production.png`. Screenshots were opened
and visually inspected. They and temporary credentials are not committed.

Status: `COMPLETE`. Five inherited frontend failures remain accepted and outside
both tickets; no new branch-specific failure remains. Context-only closure
documentation does not change the deployed feature source.
