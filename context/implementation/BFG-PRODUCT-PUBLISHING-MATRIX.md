# BFG Product Publishing Matrix

Status: `PHASE_07_1_VISIBILITY_GUARDS_FIXED_PRODUCTION_DEPLOYED_PILOT_BLOCKED`

Publication and access are separate channels. A Book Master record existing in
Convex is not sufficient for customer visibility.

| Product State | Admin Visible | Ready Stock Visible | Secret Catalog Visible | Requires Catalog Session | Requires Clerk | Price Visible | Availability Visible | Expected Customer State | Backend Guard | Test | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `draft` / incomplete | YES | NO | NO | — | Admin only | Admin only | Admin operational only | Hidden / unavailable | `readyStock` requires `published`; shared `getCatalogView` excludes draft | Product publishing regression tests | `PASS LOCALLY` |
| `published`, active variant, inventory available | YES | YES | Only if assigned and catalog open | Yes for Secret Catalog | No for public browse; optional member/session path for private | YES | YES, derived as `onHand - reserved` | Customer-visible in Ready Stock | Published book, active publisher/variant, inventory, positive available | Existing Ready Stock tests + product publishing chain | `PASS LOCALLY; PILOT BLOCKED` |
| `published`, inventory missing/zero/unavailable | YES | NO | Only if assigned/open and item available | Yes for Secret Catalog | No for public browse | Secret Catalog only if assigned | No Ready Stock availability | Hidden/empty in Ready Stock; private projection remains channel-scoped | Ready Stock `availableQuantity > 0`; Secret Catalog item guard | Existing zero-stock test; customer-safe projection assertion | `PASS LOCALLY` |
| `special`, active variant, catalog item available, catalog open | YES | NO | YES | YES | No; valid anonymous scoped session is sufficient | YES or catalog override | Catalog item availability only | Visible only inside authorized Secret Catalog | Scoped `catalogAccess.getUnlocked` + active item + active book/variant | Existing bundle/session tests + scoped projection assertion | `PASS LOCALLY; PILOT BLOCKED` |
| `archived` / inactive | YES for history | NO | NO | — | — | Admin only | No | Hidden/unavailable | `isActive` false and public/private projection guards | Product publishing regression tests | `PASS LOCALLY` |
| Any product without valid Secret Catalog session | Admin only | Public channel rules only | NO | YES | Clerk not required for token gateway | NO private data | NO private data | Access denied / null scoped projection | Session digest, catalog scope, expiry, code status, catalog open | Existing anonymous cross-catalog/expiry/revocation tests | `PASS LOCALLY` |

## Guard finding

`readyStock.list/getBySlug` enforce the public channel correctly. The audited
private `getCatalogView` path previously checked `item.isAvailable`,
`variant.isAvailable`, and `book.isActive`, but not `book.publicationStatus`.
That permitted an active `draft` book added directly to a Secret Catalog to
leak through a valid private session. The minimum shared projection fix now
allows `published` and `special` books while excluding `draft` and `archived`,
with a regression test. Catalog authorization and product state storage are
unchanged.

## State machine

```text
BOOK_CREATED
  ├─ valid metadata/variant/price → DRAFT_READY_FOR_ADMIN
  ├─ admin chooses special + catalog item + open scoped session → SECRET_VISIBLE
  └─ admin chooses published + active publisher/variant + inventory available
       → READY_STOCK_VISIBLE

DRAFT_READY_FOR_ADMIN → published → READY_STOCK_VISIBLE
DRAFT_READY_FOR_ADMIN → special → SECRET_VISIBLE only through valid catalog access
published → zero/inactive available stock → READY_STOCK_HIDDEN (not deleted)
published/special → archived → CUSTOMER_HIDDEN
SECRET_VISIBLE → invalid/expired/revoked session or closed catalog → ACCESS_DENIED
```

Invalid transitions:

- `draft → Ready Stock visible`: rejected by public publication guard.
- `draft → Secret Catalog visible`: rejected by private projection guard.
- `published + zero available → Ready Stock visible`: rejected by inventory guard.
- `Secret Catalog data without valid scoped session → customer data`: rejected by
  `catalogAccess.getUnlocked`.

No duplicate publication enum, inventory state, frontend visibility check, or
manual refresh path is authorized.
