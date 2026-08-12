# BFG Phase 06.7 Operational Policy QA

Status: PASS — local regression and live production smoke gates complete

Every scenario below is exercised against isolated Convex fixtures. No
production business data is used.

| Scenario | Starting State | Action | Expected Domain Result | Expected Customer Result | Expected Admin Result | Expected Financial Result | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Ready Stock authenticated order | Published variant, available stock, active customer | Create quantity 1 order | Canonical order source is `ready_stock`; reservation active | Order appears in own history | Order appears in admin queue | No payment history is erased | PASS |
| Ready Stock anonymous order | Public Ready Stock detail, signed out | Attempt order | Client gate; server requires active customer | Account gate | No order | No financial row | PASS |
| Ready Stock concurrent last copy | On-hand 1, reserved 0 | Two quantity-1 creates concurrently | One succeeds; one fails; available never negative | One success, one unavailable | One reservation | No duplicate invoice/payment | PASS |
| Ready Stock reservation release | Active reservation, unfulfilled order | Approve cancellation and retry resolution | Reservation released once; available restored | Cancellation/refund status | Audit release | No duplicate financial effect | PASS |
| Ready Stock fulfillment | Active reservation | Move fulfillment to completed | Reservation consumed; on-hand/reserved decrease | Fulfilled status | No supplier batch required | No refund created | PASS |
| Ready Stock fulfilled cancellation | Completed Ready Stock order | Request cancellation | Server rejects cancellation | Cancellation unavailable | No action required | No adjustment | PASS |
| Pre-PO unpaid cancellation | Unassigned preorder | Request, review, resolve | Exception approval; original order retained | Cancellation approved | Resolution audited | No refund without settlement | PASS |
| Pre-PO partially paid cancellation | Unlocked preorder with partial payment | Resolve cancellation | Adjusted invoice lowers affected value | Refund status reflects settled excess | Payment remains approved | Partial refund obligation | PASS |
| Pre-PO deposit allocated cancellation | Unlocked preorder with active allocation | Resolve with deposit release | Allocation released idempotently | Refund status visible | Release audited | Ledger release plus obligation if payment exceeds total | PASS |
| Post-PO unpaid cancellation | Locked batch, unpaid invoice | Resolve with recoverable 0 | Explicit zero recovery | No full-refund promise | Recovery amount auditable | No payout obligation | PASS |
| Post-PO paid partial recovery | Locked batch, paid invoice | Resolve with recoverable partial amount | Adjusted invoice retains committed value | Partial refund status | Recovery decision visible | Obligation equals settled recoverable value | PASS |
| Defect replacement available | Defect exception, matching supply reference | Select replacement and resolve | Original item preserved; replacement resolution stored | Replacement arranged | Reference required | No refund obligation | PASS |
| Defect replacement unavailable | Defect exception | Select refund fallback and resolve | Refund obligation created | Refund needs processing | Refund queue entry | Payment remains; obligation separate | PASS |
| Defect Ready Stock replacement | Defect on Ready Stock order | Resolve replacement with Ready Stock reference | No preorder batch assignment created | Replacement arranged | Reference audited | No duplicate order/payment | PASS |
| Defect supplier replacement | Defect on preorder | Resolve replacement with supplier/future batch reference | Original fulfillment history preserved | Replacement arranged | Reference audited | No refund | PASS |
| Partial defect | Quantity 3, defect quantity 1 | Resolve defect | Two original units remain unaffected | One-unit consequence shown | Quantity audited | Refund/replacement only affects one unit | PASS |
| Full defect | Quantity 1, defect quantity 1 | Resolve refund fallback | Original item retained; exception resolved | Refund status shown | Full impact visible | Full settled refundable value only | PASS |
| Full refund payout | Pending obligation | Create, start, record paid | Payout paid; obligation settled | Refund telah dikirim | Audit and reference retained | Paid <= obligation | PASS |
| Partial payouts | Obligation 100,000 | Pay 40,000 then 60,000 | Two payouts; no overpayment | Processing then paid | Each attempt auditable | Total paid exactly 100,000 | PASS |
| Failed payout retry | Processing payout | Record failed, create retry | Failed immutable attempt; new pending attempt | Refund still needs processing | Failure reason retained | Held amount released | PASS |
| Concurrent payout overpayment | Obligation 100,000 | Two payouts compete for 100,000+ | Server rejects excess | No false paid state | One valid hold | Total paid <= obligation | PASS |
| Customer payout authorization | Own pending obligation | Customer tries payout transition | Permission denied | Can only view safe status | No unauthorized change | No financial change | PASS |
| Deposit fully unallocated refund | Available deposit 100,000 | Request and pay 100,000 | Obligation + reservation + successful debit | Deposit/refund status updates | Ledger reconstructs | Final available balance 0 | PASS |
| Deposit partially allocated refund | Available 20,000, reserved 80,000 | Request 20,000 | Allowed only for available amount | Safe status | Admin payout | Allocated funds untouched | PASS |
| Deposit fully allocated refund | Available 0, reserved 100,000 | Request 1 | Server rejects | No request | No action | Balance unchanged | PASS |
| Deposit refund over available | Available 50,000 | Request 50,001 | Server rejects | No obligation | No action | Balance unchanged | PASS |
| Deposit payout failure | Pending deposit refund | Start then fail | Ledger release restores available | Refund remains failed/retryable | Failure audited | No money disappears | PASS |
| Deposit ledger reconstruction | Credit, reservation, release/debit rows | Recalculate projection | Account matches append-only deltas | Balance remains coherent | Audit references line up | No original row changed | PASS |
| Non-account assisted order | Arbitrary name/phone only | Attempt assisted order | Server requires existing active customer | No owned order | Admin must choose customer | No ambiguous ownership | PASS |
| Join request retention | Approved/rejected requests | Review then reload | Rows remain; no cron deletion | History retained | Audit history retained | No financial row | PASS |

## Regression gate

The final local gate is green: Vitest 107/107, Convex 71/71, Playwright
108/108 plus 3/3 `/admin/refunds` route checks, TypeScript, build, lint,
format, and `git diff --check`. Live production smoke is green: customer
75/75 across 375/390/430/768/1440 widths and signed-out admin 36/36 across
1024/1280/1440 widths. No production fixture was used.
