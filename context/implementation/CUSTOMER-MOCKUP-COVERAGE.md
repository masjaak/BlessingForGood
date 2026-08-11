# Customer Mockup Coverage

Date: 2026-08-11

Verdicts below use the exact local mockup files in the source map. `EXTENDED`
means current business functionality exceeds the reference while retaining
its visual parent.

## Acceptance status

Public customer rendering is accepted at the recorded mobile and desktop
viewports. Protected customer routes have implemented source states and safe
signed-out boundaries, but authenticated rendered comparison is still
blocked by the separate matching Clerk/Convex environment requirement. No
business fixtures were created to bypass that boundary.

## Exact Route Reference Paths

| Route | Exact local mockup path |
| --- | --- |
| `/` | No dedicated customer mockup; public shell extends `/Users/masjak/Developer/BlessingForGood/public/mockups/mobile/mockup 8.png`. |
| `/community` | No dedicated customer mockup; closest parent is `/Users/masjak/Developer/BlessingForGood/public/mockups/mobile/mockup 8.png`. |
| `/how-to-order` | Closest journey parent: `/Users/masjak/Developer/BlessingForGood/public/mockups/mobile/mockup 6.png`. |
| `/join` | No dedicated customer mockup; closest form parent is `/Users/masjak/Developer/BlessingForGood/public/mockups/mobile/mockup 1.png`. |
| `/ready-stock` | `/Users/masjak/Developer/BlessingForGood/public/mockups/mobile/mockup 4.png`. |
| `/ready-stock/[slug]` | `/Users/masjak/Developer/BlessingForGood/public/mockups/mobile/mockup 4.png`. |
| `/catalog` | `/Users/masjak/Developer/BlessingForGood/public/mockups/mobile/mockup 1.png`, `/Users/masjak/Developer/BlessingForGood/public/mockups/mobile/mockup 2.png`, and `/Users/masjak/Developer/BlessingForGood/public/mockups/mobile/mockup 3.png`. |
| `/sign-in` | Closest access parent: `/Users/masjak/Developer/BlessingForGood/public/mockups/mobile/mockup 1.png`. |
| `/account` | `/Users/masjak/Developer/BlessingForGood/public/mockups/mobile/mockup 8.png`. |
| `/account/orders` | `/Users/masjak/Developer/BlessingForGood/public/mockups/mobile/mockup 5.png`. |
| `/account/orders/[orderId]` | `/Users/masjak/Developer/BlessingForGood/public/mockups/mobile/mockup 6.png`. |
| `/account/invoices` | `/Users/masjak/Developer/BlessingForGood/public/mockups/mobile/mockup 7.png`. |
| `/account/invoices/[invoiceId]` | `/Users/masjak/Developer/BlessingForGood/public/mockups/mobile/mockup 7.png`. |
| `/account/profile` | Closest account parent: `/Users/masjak/Developer/BlessingForGood/public/mockups/mobile/mockup 8.png`. |
| `/account/addresses` | Closest account parent: `/Users/masjak/Developer/BlessingForGood/public/mockups/mobile/mockup 8.png`. |

| Route | Mockup source | Target viewport | Current rendered state | Correct elements | Missing/extended elements | Logo | Mascot | Color | Typography | Hierarchy | Layout | Navigation | CTA | State handling | Overall |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | Closest public BFG shell; no dedicated file | 390, 1440 | Public home, zero business data | Cream canvas, green hero panel, official logo, editorial hierarchy | EXTENDED public welcome content | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | EXTENDED |
| `/community` | Closest public BFG shell | 390, 1440 | Public community guidance | Warm mascot card, cards, public CTAs | No dedicated source screen | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | EXTENDED |
| `/how-to-order` | CM-06 sequence parent | 390, 1440 | Public five-step journey | Editorial steps, warm guidance card, real routes | EXTENDED with current invoice/payment flow | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | EXTENDED |
| `/join` | Closest public form parent | 390 | Join form/success state | Branded form, clear labels, success mascot | No dedicated source screen | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | EXTENDED |
| `/ready-stock` | CM-04 | 390, 1440 | Zero-stock search/filter state | Bookstore card language, filter controls, mascot empty state | No populated fixture by design | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | EXTENDED |
| `/ready-stock/[slug]` | CM-04 | 390 | Safe not-found/empty boundary | Real data component and branded fallback | Populated gallery needs real Production record | PASS | N/A | PASS | PASS | PASS | PASS | PASS | PASS | PASS | EXTENDED |
| `/catalog` | CM-01–CM-03 | 390 | Signed-out protection / BFG auth entry | Private-access boundary, official logo, secure Clerk flow | Authenticated browse/detail needs authorized identity | PASS | N/A | PASS | PASS | PASS | PARTIAL | PASS | PASS | PASS | PARTIAL |
| `/sign-in` | CM-01 shell relationship | 390, 1440 | Clerk form on BFG canvas | Official logo, cream canvas, branded invitation note | Clerk internals remain provider-owned | PASS | N/A | PASS | PARTIAL | PASS | PASS | PASS | PASS | PASS | PARTIAL |
| `/account` | CM-08 | 390 | Signed-out protection; account hierarchy in source | Dashboard hierarchy, customer cards, real projections | Authenticated render blocked by environment | PASS | PASS | PASS | PASS | PASS | PARTIAL | PARTIAL | PASS | PASS | EXTENDED |
| `/account/orders` | CM-05 | 390 | Signed-out protection; empty state in source | Order cards, status/timeline parent, mascot empty state | Authenticated render blocked by environment | PASS | PASS | PASS | PASS | PASS | PARTIAL | PARTIAL | PASS | PASS | EXTENDED |
| `/account/orders/[orderId]` | CM-06 | 390 | Signed-out protection; tracking source present | Timeline and status hierarchy | Authenticated fixture unavailable | PASS | N/A | PASS | PASS | PASS | PARTIAL | PARTIAL | PASS | PASS | EXTENDED |
| `/account/invoices` | CM-07 | 390 | Signed-out protection; empty state in source | Financial/status parent, real invoice projections | Authenticated render blocked by environment | PASS | PASS | PASS | PASS | PASS | PARTIAL | PARTIAL | PASS | PASS | EXTENDED |
| `/account/invoices/[invoiceId]` | CM-07 | 390 | Signed-out protection; financial detail source present | Deposit/payment/adjustment hierarchy | Authenticated fixture unavailable | PASS | N/A | PASS | PASS | PASS | PARTIAL | PARTIAL | PASS | PASS | EXTENDED |
| `/account/profile` | CM-08 form parent | 390 | Signed-out protection; form source present | Compact grouped form, save feedback | Authenticated render blocked by environment | PASS | N/A | PASS | PASS | PASS | PARTIAL | PARTIAL | PASS | PASS | EXTENDED |
| `/account/addresses` | CM-08 form parent | 390 | Signed-out protection; form/empty source present | Address cards, grouped form, feedback | Authenticated render blocked by environment | PASS | PASS | PASS | PASS | PASS | PARTIAL | PARTIAL | PASS | PASS | EXTENDED |

## Evidence

The following screenshot pairs are the rendered evidence from the current
working tree. Mockup-parent paths are exact local files from the source map.

| Route | Reference / visual parent | Rendered implementation | Viewport | Verdict |
| --- | --- | --- | --- | --- |
| `/` | `/Users/masjak/Developer/BlessingForGood/public/mockups/mobile/mockup 8.png` | `/Users/masjak/Developer/BlessingForGood/artifacts/browser-qa/customer-375-home.png` and `/Users/masjak/Developer/BlessingForGood/artifacts/browser-qa/customer-1440-home.png` | 375, 1440 | PASS |
| `/community` | `/Users/masjak/Developer/BlessingForGood/public/mockups/mobile/mockup 8.png` | `/Users/masjak/Developer/BlessingForGood/artifacts/browser-qa/customer-390-community.png` and `/Users/masjak/Developer/BlessingForGood/artifacts/browser-qa/customer-1440-community.png` | 390, 1440 | PASS |
| `/how-to-order` | `/Users/masjak/Developer/BlessingForGood/public/mockups/mobile/mockup 6.png` | `/Users/masjak/Developer/BlessingForGood/artifacts/browser-qa/customer-390-how-to-order.png` and `/Users/masjak/Developer/BlessingForGood/artifacts/browser-qa/customer-1440-how-to-order.png` | 390, 1440 | PASS |
| `/join` | `/Users/masjak/Developer/BlessingForGood/public/mockups/mobile/mockup 1.png` | `/Users/masjak/Developer/BlessingForGood/artifacts/browser-qa/customer-390-join.png` and `/Users/masjak/Developer/BlessingForGood/artifacts/browser-qa/customer-1440-join.png` | 390, 1440 | PASS |
| `/ready-stock` | `/Users/masjak/Developer/BlessingForGood/public/mockups/mobile/mockup 4.png` | `/Users/masjak/Developer/BlessingForGood/artifacts/browser-qa/customer-390-ready-stock.png` and `/Users/masjak/Developer/BlessingForGood/artifacts/browser-qa/customer-1440-ready-stock.png` | 390, 1440 | PASS |
| `/ready-stock/[slug]` | `/Users/masjak/Developer/BlessingForGood/public/mockups/mobile/mockup 4.png` | No screenshot: no real stock record exists | — | PARTIAL |
| `/catalog` | `/Users/masjak/Developer/BlessingForGood/public/mockups/mobile/mockup 1.png`, `mockup 2.png`, `mockup 3.png` | `/Users/masjak/Developer/BlessingForGood/artifacts/browser-qa/customer-390-catalog.png` | 390 | PARTIAL |
| `/sign-in` | `/Users/masjak/Developer/BlessingForGood/public/mockups/mobile/mockup 1.png` | `/Users/masjak/Developer/BlessingForGood/artifacts/browser-qa/customer-390-sign-in.png` and `/Users/masjak/Developer/BlessingForGood/artifacts/browser-qa/customer-1440-sign-in.png` | 390, 1440 | PASS |
| `/account` | `/Users/masjak/Developer/BlessingForGood/public/mockups/mobile/mockup 8.png` | No authenticated screenshot: matching Clerk/Convex environment unavailable | — | PARTIAL |
| `/account/orders` | `/Users/masjak/Developer/BlessingForGood/public/mockups/mobile/mockup 5.png` | No authenticated screenshot: matching Clerk/Convex environment unavailable | — | PARTIAL |
| `/account/orders/[orderId]` | `/Users/masjak/Developer/BlessingForGood/public/mockups/mobile/mockup 6.png` | No authenticated screenshot: no real order fixture permitted | — | PARTIAL |
| `/account/invoices` | `/Users/masjak/Developer/BlessingForGood/public/mockups/mobile/mockup 7.png` | No authenticated screenshot: matching Clerk/Convex environment unavailable | — | PARTIAL |
| `/account/invoices/[invoiceId]` | `/Users/masjak/Developer/BlessingForGood/public/mockups/mobile/mockup 7.png` | No authenticated screenshot: no real invoice fixture permitted | — | PARTIAL |
| `/account/profile` | `/Users/masjak/Developer/BlessingForGood/public/mockups/mobile/mockup 8.png` | No authenticated screenshot: matching Clerk/Convex environment unavailable | — | PARTIAL |
| `/account/addresses` | `/Users/masjak/Developer/BlessingForGood/public/mockups/mobile/mockup 8.png` | No authenticated screenshot: matching Clerk/Convex environment unavailable | — | PARTIAL |

The same public routes were also rendered at 375 and 430 mobile widths by
the responsive suite. The `/catalog` and `/sign-in` screenshots show the
branded Clerk boundary using local development credentials; the visible
`Development mode` label is provider-owned local UI and is not a production
acceptance result.

No business records are created to make screenshots look populated.
