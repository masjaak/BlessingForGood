# BFG Navigation Matrix

## Customer navigation

| Label | Route | Status | Browser evidence | Notes |
| --- | --- | --- | --- | --- |
| Home | `/` | functional | [BROWSER VERIFIED] HTTP 200 and Playwright render | Primary entry point |
| Catalog | `/catalog` | functional foundation | [BROWSER VERIFIED] HTTP 200, wrong-code state, unlock flow | Preview Demo Mode only; no shared catalog data |
| Ready Stock | `/ready-stock` | implemented | [REPOSITORY] browse/search/filter/detail and zero-data states | Runtime browser QA deferred to staging |
| Orders | `/account/orders` | functional foundation | [BROWSER VERIFIED] HTTP 200 and order/tracking flow | Browser-local prototype records only |
| Account | `/account/invoices` | functional foundation | [BROWSER VERIFIED] HTTP 200 and invoice empty/state flow | Account route remains invoice foundation |

The shared customer primary navigation must contain only the five destinations above. Admin is reached by its own
workspace route and is not a customer navigation item.

## Public support navigation

| Label | Route | Status | Browser evidence | Notes |
| --- | --- | --- | --- | --- |
| Community | `/community` | functional | [BROWSER VERIFIED] HTTP 200 and Playwright render | Public guide |
| How to order | `/how-to-order` | functional | [BROWSER VERIFIED] HTTP 200 and Playwright render | Public flow explanation |
| Help | `/help` | functional | [BROWSER VERIFIED] HTTP 200 and Playwright render | Foundation copy only |

## Admin navigation

| Label | Route | Status | Browser evidence | Notes |
| --- | --- | --- | --- | --- |
| Overview | `/admin` | functional foundation | [BROWSER VERIFIED] HTTP 200 and Preview-labelled zero-data dashboard | Production authorization deferred |
| Catalog | `/admin/catalogs` | functional foundation | [BROWSER VERIFIED] HTTP 200 and catalog creation flow | One-title prototype form |
| Books | `/admin/books` | implemented | [REPOSITORY] list/create/edit/variant/stock flow | Runtime browser QA deferred to staging |
| Orders | `/admin/orders` | functional foundation | [BROWSER VERIFIED] HTTP 200 and status transition flow | Status transitions are local prototype only |
| Customers | — | foundation-only | [REPOSITORY] non-link | Clearly marked unavailable |
| Invoices | `/admin/invoices` | functional foundation | [REPOSITORY] invoice/ledger UI; runtime QA deferred | Invoice/deposit foundation |
| Payments | `/admin/payments` | functional foundation | [REPOSITORY] manual confirmation queue/history; runtime QA deferred | Payment gateway out of scope |
| Tracking | — | foundation-only | [REPOSITORY] non-link | Covered by order timeline foundation |
| Content | — | foundation-only | [REPOSITORY] non-link | No dead link is exposed |
| Settings | — | foundation-only | [REPOSITORY] non-link | No settings decision is invented |
| Customer preview | `/catalog` | functional foundation | [BROWSER VERIFIED] HTTP 200 and unlock flow | QA shortcut inside admin nav |

Unavailable admin items are non-link spans with an `Unavailable` label. They are not dead anchors and remain
documented until their product scope is approved.
