# BFG Navigation Matrix

## Customer navigation

| Label | Route | Status | Browser evidence | Notes |
| --- | --- | --- | --- | --- |
| Home | `/` | functional | [BROWSER VERIFIED] HTTP 200 and Playwright render | Primary entry point |
| Catalog | `/catalog` | functional foundation | [BROWSER VERIFIED] HTTP 200 and explicit guard | Preview Demo Mode required for protected flow |
| Ready Stock | `/ready-stock` | functional foundation | [BROWSER VERIFIED] HTTP 200 and intentional empty state | No inventory data is seeded |
| Orders | `/account/orders` | functional foundation | [BROWSER VERIFIED] HTTP 200 and explicit guard | Local prototype records only |
| Account | `/account/invoices` | functional foundation | [BROWSER VERIFIED] HTTP 200 and explicit guard | Account route remains invoice foundation |

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
| Overview | `/admin` | functional foundation | [BROWSER VERIFIED] HTTP 200 and explicit guard | Zero-data dashboard |
| Catalog | `/admin/catalogs` | functional foundation | [BROWSER VERIFIED] HTTP 200 and explicit guard | One-title prototype form |
| Books | — | foundation-only | [REPOSITORY] non-link | Clearly marked unavailable |
| Orders | `/admin/orders` | functional foundation | [BROWSER VERIFIED] HTTP 200 and explicit guard | Status transitions are local prototype only |
| Customers | — | foundation-only | [REPOSITORY] non-link | Clearly marked unavailable |
| Invoices | `/admin/invoices` | functional foundation | [BROWSER VERIFIED] HTTP 200 and explicit guard | Invoice/deposit foundation only |
| Tracking | — | foundation-only | [REPOSITORY] non-link | Covered by order timeline foundation |
| Content | — | foundation-only | [REPOSITORY] non-link | No dead link is exposed |
| Settings | — | foundation-only | [REPOSITORY] non-link | No settings decision is invented |
| Customer preview | `/catalog` | functional foundation | [BROWSER VERIFIED] HTTP 200 and explicit guard | QA shortcut inside admin nav |

Unavailable admin items are non-link spans with an `Unavailable` label. They are not dead anchors and remain
documented until their product scope is approved.
