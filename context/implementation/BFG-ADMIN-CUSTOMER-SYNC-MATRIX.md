# BFG Admin ↔ Customer Sync Matrix

Reconciled: 2026-08-14. Convex is canonical; no manual synchronization exists. “Local result” is deterministic test
evidence, not a substitute for the Production column.

| Domain | Admin Mutation | Canonical Record | Customer Query | Customer Visible Consequence | Expected Realtime Behavior | Authorization | Actual Production Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Book publication | `books.update` | books | Ready Stock/catalog projections | eligible product appears/disappears | subscription updates | books manage; safe public/session query | old behavior live; real new pilot pending |
| Ready Stock inventory | `readyStock.setQuantity` | inventory | Ready Stock queries | available listing/quantity changes | subscription updates | Admin write/public safe read | deterministic PASS; real product pending |
| Cover | `books.attachCover` | storage + book reference | Ready Stock/catalog URL projection | durable cover/fallback | subscription updates | trusted MIME/size; Admin write | not deployed; real upload pending |
| Catalog assignment | `catalogItems.add/remove` | catalogItems | unlocked catalog | assigned variant appears/disappears | active valid session updates | catalog manage; scoped read | not deployed; deterministic PASS |
| Catalog code | generate/revoke/open/close | code digest/catalog/session | unlock/getUnlocked | unlock works/fails, catalog closes | authoritative query/mutation reacts | digest, pepper, expiry, rate limit, scope | not deployed; real browser flow pending |
| Catalog member grant | grant/revoke | catalogAccessGrants | access/unlocked/order guard | member gains/loses catalog eligibility | subscription/next action updates | catalog manage + exact member | not deployed; ownership tests PASS |
| Join/admission | review/approve/reject | joinRequests/appUsers | mine/users.current | state/admission changes | subscriptions update | applicant own/Admin manage | deterministic PASS; real request pending |
| Order | assisted/status actions | orders/items/history | own list/detail | owned order/status appears | subscriptions update | server-derived ownership | deterministic PASS; real order pending |
| Batch roster | assign/move/remove/lock | assignments/batch | listMine/getBatchMine | participating batch/roster changes | subscriptions update | Admin manage/customer ownership | deterministic PASS; real roster pending |
| Tracking | update stage | batch/status history | own tracking | one timeline advances | subscriptions update | Admin manage/customer ownership | deterministic PASS; real status pending |
| Invoice | create/issue/void | invoices/items | own invoices | invoice/outstanding changes | subscriptions update | finance permission/ownership | deterministic PASS; real finance event not created |
| Payment | review approve/reject | confirmations/invoice state | own confirmations/invoice | review/payment status changes | subscriptions update | finance/ownership/private proof | deterministic PASS; Production proof pending |
| Deposit top-up | approve/reject/adjust | topUps/account/ledger | own account/topups/transactions | balance/status/history changes | atomic mutation + subscriptions | deposits manage/ownership | deterministic PASS; Production empty/real UAT pending |
| Exception | review/resolve | exception/events/adjustments | own exception/order/invoice | safe case/financial state changes | subscriptions update | ops/ownership | existing tests PASS; real event pending |
| Refund | payout lifecycle | obligations/payouts/ledger | own refund projection | payout state changes | subscriptions update | refund permission/ownership | existing tests PASS; real event pending |
| Notification | domain mutations | notifications | list/count | badge, event, destination, read state | subscriptions update | exact recipient | deterministic ownership PASS; real events pending |
| Inbox | Join submit/member grant | notifications with Inbox surface | list/count | persistent operational message | subscriptions update | exact recipient | deterministic Admin/Customer paths PASS; real message pending |
| Content/settings | publish/update | contentBlocks/appSettings | public/customer queries | approved copy/instructions change | subscriptions update | content manage/Owner | not deployed; real edit pending |

Local sync gaps: `0 UNCLASSIFIED`. Production gaps are explicit and intentionally remain `PENDING`, never inferred from
Convex reactivity.

## Final local reconciliation delta

- Invoice queue create-and-issue and issue-from-queue both use the existing
  canonical invoice mutations; the customer invoice query and invoice-issued
  notification remain the downstream consequence. Production event acceptance
  is pending.
- Cover selection preview is local-only UI state. Save still uses the existing
  authorized storage reference, book projection, and customer cover fallback;
  replacement cleanup remains server-controlled. Production pilot is pending.
- Customer detail invoice/deposit links add reachability only and introduce no
  second source of truth.
