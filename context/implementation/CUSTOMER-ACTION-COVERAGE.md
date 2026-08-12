# Customer Action Coverage

Date: 2026-08-12

Every customer-facing action in the current Phase 01–06.4 UI has one verdict.
The UI does not expose a button for an unresolved business policy.

| Route / surface | Action | Purpose / destination or mutation | Auth / policy | Loading / disabled / feedback | Verdict |
| --- | --- | --- | --- | --- | --- |
| Customer header | Masuk | Clerk sign-in; preserves `/sign-in?redirect_url=...` for protected destinations | Signed out | Clerk-owned pending/error states | AUTH_GATED_COMPLETE |
| Customer bottom nav | Beranda | `/` | Public | N/A | ACTIVE_NAVIGATION_COMPLETE |
| Customer bottom nav | Katalog | `/catalog` | Clerk customer access | Protected route redirects to sign-in | AUTH_GATED_COMPLETE |
| Customer bottom nav | Buku Saya | `/account/orders` | Clerk customer ownership | Protected route redirects to sign-in | AUTH_GATED_COMPLETE |
| Customer bottom nav | Tagihan | `/account/invoices` | Clerk customer ownership | Protected route redirects to sign-in | AUTH_GATED_COMPLETE |
| Customer bottom nav | Akun | `/account` | Clerk customer ownership | Protected route redirects to sign-in | AUTH_GATED_COMPLETE |
| `/` | Lihat Ready Stock | `/ready-stock` | Public | Destination owns loading/empty state | ACTIVE_NAVIGATION_COMPLETE |
| `/` | Buka Secret Catalog | `/catalog` | Clerk customer access | Protected redirect | AUTH_GATED_COMPLETE |
| `/` | Gabung Blessfriends | `/join` | Public | Destination owns form feedback | ACTIVE_NAVIGATION_COMPLETE |
| `/` | Cara memesan | `/how-to-order` | Public | N/A | ACTIVE_NAVIGATION_COMPLETE |
| `/` | Kenalan dengan BFG | `#bfg-story` | Public | Native horizontal scroll-snap story | ACTIVE_NAVIGATION_COMPLETE |
| `/` | Cara order quick path | `#cara-order` | Public | Native anchor target | ACTIVE_NAVIGATION_COMPLETE |
| `/` | Join Blessfriends quick path | `#join-blessfriends` | Public | Native anchor target | ACTIVE_NAVIGATION_COMPLETE |
| `/` | BFG story cards | Official logo/mascot and approved short copy | Public | Native horizontal scroll; no heavy carousel | ACTIVE_LOGIC_COMPLETE |
| `/` | How to order steps | Current customer journey explanation | Public | Existing capability language only | ACTIVE_LOGIC_COMPLETE |
| `/` | Join CTA | `/join` | Public | Destination owns form feedback | ACTIVE_NAVIGATION_COMPLETE |
| `/sign-in` | Back | Safe internal public referrer or `/` | Public shell | 44px icon target; avoids protected redirect loops | ACTIVE_NAVIGATION_COMPLETE |
| `/sign-in` | Sign in | Clerk `SignIn` | Valid invited member | Clerk pending/error states; `withSignUp=false` | AUTH_GATED_COMPLETE |
| `/sign-up` | Public account creation | None | Invitation ticket required | No ticket redirects to `/`; valid Clerk invitation flow remains | DISABLED_INTENTIONALLY |
| `/community` | Gabung Blessfriends | `/join` | Public | Destination owns form feedback | ACTIVE_NAVIGATION_COMPLETE |
| `/community` | Pelajari cara memesan | `/how-to-order` | Public | N/A | ACTIVE_NAVIGATION_COMPLETE |
| `/how-to-order` | Buka Secret Catalog | `/catalog` | Clerk customer access | Protected redirect | AUTH_GATED_COMPLETE |
| `/how-to-order` | Lihat Ready Stock | `/ready-stock` | Public | Destination owns empty state | ACTIVE_NAVIGATION_COMPLETE |
| `/join` | Kirim permintaan | `joinRequests.submit` | Public admission request | Name, email, phone, area, single book interest, acknowledgement; pending/error state | ACTIVE_LOGIC_COMPLETE |
| `/join` success | Gabung WhatsApp Group | Server-returned `BFG_JOIN_WHATSAPP_GROUP_URL` after persisted mutation | Submitted request only | CTA appears only after success; safe fallback when config is absent | ACTIVE_LOGIC_COMPLETE |
| `/join` success | Buka akun | `/account` | Clerk customer access | Protected redirect | AUTH_GATED_COMPLETE |
| `/ready-stock` | Search/filter/sort | `readyStock.list` query arguments | Public projection | Query loading; empty/no-result state | ACTIVE_LOGIC_COMPLETE |
| `/ready-stock/[slug]` | Kembali ke Ready Stock | `/ready-stock` | Public | N/A | ACTIVE_NAVIGATION_COMPLETE |
| `/ready-stock/[slug]` | Back icon | `/ready-stock` fallback | Public | Safe same-origin history | ACTIVE_NAVIGATION_COMPLETE |
| `/ready-stock/[slug]` | Hubungi BFG | `/help` | Help explains the current Ready Stock ordering policy | N/A | ACTIVE_NAVIGATION_COMPLETE |
| `/catalog` access | Back | `/` fallback or safe internal history | Signed-in customer gateway | Icon control; no external referrer | ACTIVE_NAVIGATION_COMPLETE |
| `/catalog` access | Buka katalog | `catalogAccess.unlock` | Signed-in active customer plus valid access code | Pending disabled; generic invalid/expired/rate-limit feedback | AUTH_GATED_COMPLETE |
| `/admin/catalogs` | Generate access code | `catalogAccess.generateCode` | Admin/owner catalog permission | Plaintext shown only in immediate result with copy action | ACTIVE_LOGIC_COMPLETE |
| `/admin/catalogs` | Revoke access code | `catalogAccess.revokeCode` | Admin/owner catalog permission | Mutation feedback; existing grant semantics preserved | ACTIVE_LOGIC_COMPLETE |
| `/catalog` browse | Quantity minus/plus | Local preorder selection | Signed-in customer | Quantity output; no negative quantity | ACTIVE_LOGIC_COMPLETE |
| `/catalog` browse | Catat preorder | `orders.submit` | Signed-in customer; server validates ownership/catalog | Pending disabled; no-item disabled; success/error state | ACTIVE_LOGIC_COMPLETE |
| `/catalog` success | Lanjut ke WhatsApp | External `wa.me` handoff with order reference | Existing admin handoff | New tab | ACTIVE_NAVIGATION_COMPLETE |
| `/catalog` success | Lihat status pesanan | `/account/orders` | Customer-owned order | Protected redirect | AUTH_GATED_COMPLETE |
| `/catalog` access | Buka bantuan | `/help` | Public | N/A | ACTIVE_NAVIGATION_COMPLETE |
| `/account` | Dashboard/order/invoice/activity links | Owned account routes | Customer ownership | Destination owns state | AUTH_GATED_COMPLETE |
| `/account/orders` | Lihat detail | `/account/orders/[orderId]` | Customer owns order | Destination owns loading/error | AUTH_GATED_COMPLETE |
| `/account/orders/[orderId]` | Kembali ke pesanan | `/account/orders` | Customer ownership | N/A | AUTH_GATED_COMPLETE |
| `/account/orders/[orderId]` | Back icon | `/account/orders` fallback | Customer ownership | Safe same-origin history | ACTIVE_NAVIGATION_COMPLETE |
| `/account/orders/[orderId]` | Ajukan pembatalan / Minta tinjauan admin | `orderExceptions.requestCancellation` | Owned item; eligibility and policy gate | Required reason; pending mutation; success/error message | ACTIVE_LOGIC_COMPLETE |
| `/account/invoices` | Lihat invoice | `/account/invoices/[invoiceId]` | Customer-owned invoice | Destination owns loading/error | AUTH_GATED_COMPLETE |
| `/account/invoices/[invoiceId]` | Kirim konfirmasi | `paymentConfirmations.submit` | Customer-owned eligible invoice | Required fields; pending disabled; success/error feedback | ACTIVE_LOGIC_COMPLETE |
| `/account/invoices/[invoiceId]` | Back icon | `/account/invoices` fallback | Customer ownership | Safe same-origin history | ACTIVE_NAVIGATION_COMPLETE |
| `/account/profile` | Simpan perubahan | `customerProfiles.upsertMine` | Current active customer only | Disabled while unresolved; status/error feedback | ACTIVE_LOGIC_COMPLETE |
| `/account/profile` | Back icon | `/account` fallback | Customer ownership | Safe same-origin history | ACTIVE_NAVIGATION_COMPLETE |
| `/account/addresses` | Tambah alamat | `customerAddresses.create` | Current active customer only | Required fields; pending/error feedback; default invariant | ACTIVE_LOGIC_COMPLETE |
| `/account/addresses` | Hapus alamat | `customerAddresses.remove` | Owned address | Mutation feedback; default replacement retained | ACTIVE_LOGIC_COMPLETE |
| `/account/addresses` | Back icon | `/account` fallback | Customer ownership | Safe same-origin history | ACTIVE_NAVIGATION_COMPLETE |
| `/ready-stock` error | Coba lagi | Next error-boundary `reset` | Public | Native reset | ACTIVE_LOGIC_COMPLETE |

## Policy boundaries

- Ready Stock has no customer checkout action because the current policy is
  admin-confirmed ordering; the UI routes to Help instead of inventing a flow.
- Refund disbursement, replacement, and other unresolved exception policies
  remain backend/admin decisions. No speculative customer action is rendered.
- Mockup-only cart, search, preview, and payment controls that have no current
  BFG route or mutation are not copied into Production.

## Audit result

`UNKNOWN`: none.
Dead customer actions: none found.
Primary customer buttons all have a route, existing Convex operation, or an
intentional policy boundary.
