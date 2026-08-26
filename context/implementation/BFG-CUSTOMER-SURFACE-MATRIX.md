# BFG Customer Surface Completeness Matrix

Status: `BFG_PHASE_07_1_FINAL_CLOSURE_LOCAL_PRODUCTION_ACCEPTANCE_PENDING`

## Final yellow / unknown closure override — 2026-08-26

The current admission implementation supersedes the earlier authenticated
acceptance labels below: Admin approval automatically starts the private
server-side Clerk invitation reconciliation, and `/join` uses the canonical
`appUsers.role/status` resolver. Active Customers redirect away from `/join`;
pending, approved/invitation-pending, failed, and suspended states never show
the new-request form. The remaining Production labels are historical evidence
until a legitimate authenticated Customer session is supplied.

`COMPLETE` means the route has a natural entry, usable current UI, canonical
data/action wiring, and explicit state handling. Authenticated populated visual
acceptance remains separately gated by the intentional real-user acceptance;
the zero-production-data rule remains in force.

| Surface | Route | Mockup Source | Navigation Entry | Route Exists | UI Exists | Real Data Connected | Loading | Empty | Error | Auth | Mobile 390 | Desktop 1440 | Primary Action | Current Status | Gap | Required Action | Final Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Homepage | `/` | Homepage V4.1.3; mobile 8 parent | Public nav / home | YES | YES | N/A | N/A | N/A | route boundary | public | PASS | PASS | Ready Stock / Secret Catalog / Join | COMPLETE | none | none | COMPLETE |
| Secret Catalog gateway | `/catalog` | Mobile 1 | Public nav, home, bottom nav | YES | YES | scoped Convex code/session | YES | YES | inline + route boundary | public gateway; customer session optional | PASS | PASS | Enter code and open scoped catalog | COMPLETE | no dedicated separate gateway route needed | none | COMPLETE |
| Catalog browse | `/catalog` unlocked state | Mobile 2 | Gateway success state | YES | YES | `catalogAccess.getUnlocked` | YES | YES | inline unlock error | scoped session or customer grant | AUTH-BLOCKED populated view | AUTH-BLOCKED populated view | Select format/quantity | PARTIAL | no real populated Production record/session for rendered acceptance | retest with isolated fixture or real authorized session; do not seed Production | AUTH_BLOCKED |
| Catalog detail / format state | `/catalog` inline book state | Mobile 3 | Catalog browse cards | INLINE | YES | unlocked catalog projection | YES | YES | inline submit error | scoped session/customer | AUTH-BLOCKED populated view | AUTH-BLOCKED populated view | Choose format, quantity, submit order | PARTIAL | current product uses inline selection rather than a second dynamic route | preserve inline flow unless a later PRD requires dedicated detail URL | DEFERRED_BY_PRD |
| Ready Stock browse | `/ready-stock` | Mobile 4 parent | Homepage/discovery; public nav | YES | YES | `readyStock.list` | YES | YES | route boundary | public | PASS empty state | PASS empty state | Filter and open book detail | COMPLETE | no real records by policy | none | COMPLETE |
| Ready Stock detail | `/ready-stock/[slug]` | Mobile 4 | Ready Stock cards | YES | YES | `readyStock.getBySlug`; canonical order action | YES | YES | route boundary | public read; active customer for order | BLOCKED_BY_DATA populated view | BLOCKED_BY_DATA populated view | Reserve/order canonical Ready Stock item | BLOCKED_BY_DATA | no real published positive-stock record available for populated render | retain intentional not-found/empty state; retest with isolated fixture | BLOCKED_BY_DATA |
| Buku Saya / Orders | `/account/orders` | Mobile 5 | Bottom nav; Account | YES | YES | `orders.listMine` | YES | YES | route boundary | customer-owned | PASS locked/empty | AUTH-BLOCKED populated view | Open owned order | AUTH_BLOCKED | Production auth session not accepted yet | perform real customer session acceptance after Clerk/Convex fix | AUTH_BLOCKED |
| Order detail | `/account/orders/[orderId]` | Mobile 6 | Orders list, Account activity, Ready Stock success | YES | YES | owned order + tracking/fulfillment/exception projections | YES | YES | route boundary + safe not-found | customer-owned | BLOCKED_BY_DATA populated view | BLOCKED_BY_DATA populated view | Follow status, invoice, exception actions | BLOCKED_BY_DATA | no authorized real order fixture for rendered populated QA | preserve ownership-safe empty state; retest with isolated fixture | BLOCKED_BY_DATA |
| Tracking | `/account/orders/[orderId]` tracking section | Mobile 6 | Order detail | INLINE | YES | `batchTracking.getMine` / fulfillment | YES | explicit unavailable state | route boundary | customer-owned | BLOCKED_BY_DATA populated view | BLOCKED_BY_DATA populated view | Read current shipment stage | BLOCKED_BY_DATA | no authorized real order/batch fixture | retest with isolated fixture; no new tracking model | BLOCKED_BY_DATA |
| Tagihan | `/account/invoices` | Mobile 7 | Bottom nav; Account | YES | YES | `invoices.listMine`, deposit projections | YES | YES | route boundary | customer-owned | PASS locked/empty | AUTH-BLOCKED populated view | Open invoice | AUTH_BLOCKED | Production auth session not accepted yet | perform real customer session acceptance after auth fix | AUTH_BLOCKED |
| Invoice detail | `/account/invoices/[invoiceId]` | Mobile 7 | Tagihan list; Order detail | YES | YES | owned invoice, payment, deposit, ledger | YES | safe not-found | route boundary + inline payment errors | customer-owned | BLOCKED_BY_DATA populated view | BLOCKED_BY_DATA populated view | Submit payment confirmation / inspect ledger | BLOCKED_BY_DATA | no authorized real invoice/payment fixture | retest with isolated fixture; preserve financial policy | BLOCKED_BY_DATA |
| Deposit presentation | `/account/invoices` and invoice detail | Mobile 7 | Tagihan | INLINE | YES | deposit account/transactions/allocations | YES | explicit no-account state | route boundary | customer-owned | AUTH-BLOCKED populated view | AUTH-BLOCKED populated view | Inspect balance/history | AUTH_BLOCKED | populated financial state requires authorized records | retest without mutating Production | AUTH_BLOCKED |
| Account | `/account` | Mobile 8 | Bottom nav | YES | YES | orders/invoices/deposit/activity projections | YES | YES | route boundary | customer gate | PASS locked state | AUTH-BLOCKED populated view | Open owned activity and account settings | AUTH_BLOCKED | Desktop-only account controls hid essential actions in portrait; stacked Account hub now supplies them | retest real session later | AUTH_BLOCKED |
| Profile | `/account/profile` | Mobile 8 parent | Account → Profil | YES | YES | `customerProfiles.getMine/upsertMine` | YES | safe form state | route boundary + inline save error | customer-owned | AUTH-BLOCKED | AUTH-BLOCKED | Save profile | AUTH_BLOCKED | natural Account entry added; populated auth acceptance pending | perform real session acceptance later | AUTH_BLOCKED |
| Addresses | `/account/addresses` | Mobile 8 parent | Account → Alamat pengiriman | YES | YES | `customerAddresses.listMine/create/remove` | YES | explicit no-address state | route boundary + inline mutation errors | customer-owned | AUTH-BLOCKED | AUTH-BLOCKED | Add/remove owned address | AUTH_BLOCKED | natural Account entry added; populated auth acceptance pending | perform real session acceptance later | AUTH_BLOCKED |
| Sign In | `/sign-in/[[...sign-in]]` | Mobile 1 access parent | Header `Masuk` | YES | YES | Clerk | Clerk-owned | Clerk-owned | Clerk-owned | signed out/invite-only | PASS | PASS | Sign in | COMPLETE | Production identity acceptance pending | retest after Production configuration fix | AUTH_BLOCKED |
| Join Blessfriends | `/join` | Mobile 1 form parent | Public nav, home, community | YES | YES | `joinRequests.submit` | mutation pending | success confirmation | inline safe error | public submission; authenticated sees member state | PASS | PASS | Submit join request | COMPLETE | no policy gap | none | COMPLETE |
| How To Order | `/how-to-order` | Mobile 6 journey parent | Public nav/footer/home | YES | YES | static current-product guidance | N/A | N/A | route boundary | public | PASS | PASS | Open Ready Stock or Secret Catalog | COMPLETE | none | none | COMPLETE |

## Customer state contract

Authenticated surfaces follow the existing explicit sequence:

`AUTH_SYNC` → `APPUSER_RESOLUTION` → `AUTHORIZATION` → `DATA_LOADING` →
`READY_EMPTY` / `READY_POPULATED` / `ERROR`.

`undefined` is only treated as loading after a query has actually started;
empty arrays/records render empty states. The matrix deliberately labels
real-session and real-record gaps instead of manufacturing data.

## Phase 07.1 final closure delta

The older `AUTH_BLOCKED` labels above are the previous audit snapshot. The
current implementation keeps the same private-route guard and adds the missing
admission journey:

| Customer state | `/join` behavior | Private customer behavior |
| --- | --- | --- |
| No request | Real Join form | `Akun ini belum menjadi Blessfriend` with a link to `/join` |
| Pending review | Read-only pending state; no duplicate submit CTA | Remains gated |
| Approved / admission pending | Invitation or activation status from the persisted request | Remains gated until active |
| Rejected | Clear rejected result; no invented resubmission policy | Remains gated |
| Active Blessfriend | Active confirmation and customer links | Buku Saya, Tagihan, Akun, Profile, and Addresses unlock |

The same signed-in Clerk identity is captured server-side on submission when
available. Approval reuses or creates exactly one active `appUser` for that
subject; it never auto-admits from login and never creates a duplicate Clerk
identity. New identities receive a server-side Clerk invitation through BFG;
Clerk Dashboard is not a normal operational step.

Customer visual convergence is implemented through one shared header/logo
primitive. Local rendered smoke passed at 375, 390, 430, and 1440px; the
remaining authenticated visual verdict is a Production session gate, not a
route or empty-state gap.
