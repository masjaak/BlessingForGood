# BFG Phase 06.7 Policy Decision Matrix

Status: FINAL

| POLICY | PREVIOUS STATUS | FINAL DECISION | IMPLEMENTATION IMPACT | MIGRATION REQUIRED | ADMIN IMPACT | CUSTOMER IMPACT | STATUS |
| --- | --- | --- | --- | --- | --- | --- | --- |
| READY_STOCK_ORDER_RECORDING | Open; Ready Stock was browse/contact only | Canonical `orders` with `source=ready_stock` | Add authenticated order mutation and optional catalog relation | No destructive migration; legacy catalog orders remain valid | Ready Stock enters existing order/invoice queue | Signed-out browse remains; owned order requires active customer | FINAL |
| READY_STOCK_RESERVATION | Not represented | Atomic on-hand/reserved/available model with idempotent release | Add reservation rows and reserved quantity projection | Existing stock quantity is on-hand; missing reserved quantity reads as zero | Stock edits cannot go below reservations | Successful order holds copies immediately | FINAL |
| CANCELLATION_ELIGIBILITY_POLICY | Request boundary existed but payment/PO outcome was ambiguous | Pre-PO request plus admin review; server-derived eligibility | Reuse `orderExceptions`, extend reason/recovery data | Existing exceptions remain readable | Review and resolve before effect | Predictable request/review status | FINAL |
| POST_PO_CANCELLATION_POLICY | No explicit recovery amount | Admin records recoverable amount, including zero/partial | Store bounded recoverable amount and apply to adjusted invoice | Existing adjustment rows remain historical | Recovery decision is mandatory for committed cases | No automatic full-refund promise | FINAL |
| READY_STOCK_CANCELLATION | No canonical Ready Stock order | Unfulfilled order may resolve via exception; fulfilled order cannot cancel | Release active reservation; consume on fulfillment | None | Same exception controls | Safe cancellation/refund status | FINAL |
| DEFECT_REPLACEMENT_POLICY | Replacement unsupported | Replacement first; refund obligation fallback | Add `replacement` resolution and reference | Existing defect resolutions remain readable | Select replacement or refund explicitly | Replacement arranged or refund status | FINAL |
| REFUND_OBLIGATION | Recorded only inside invoice/adjustment projection | Canonical obligation is separate from payout | Add generic obligation table and source links | Legacy invoice fields remain readable | Obligation queue is auditable | Own safe obligation/payout status | FINAL |
| REFUND_DISBURSEMENT_POLICY | No payout domain | Pending/processing/paid/failed payout lifecycle with retries | Add payout table and atomic amount holds | No rewrite of approved payment history | Financial actor records channel/reference/outcome | Safe status copy only | FINAL |
| DEPOSIT_REFUND_POLICY | No refund request or payout path | Available unallocated deposit only | Use obligation + append-only reservation/release/debit ledger rows | Existing ledger rows unchanged | Process payout with server capacity check | Failed payout restores availability | FINAL |
| MANUAL_NON_ACCOUNT_CUSTOMER_POLICY | Explicitly unsupported in Phase 06.3 | NOT SUPPORTED | Keep assisted order customer relation mandatory | None | Select existing active customer only | Every owned order has account identity | FINAL |
| JOIN_REQUEST_RETENTION_POLICY | Retention unresolved | Retain approved/rejected history; no automatic deletion | Documentation and regression coverage; no cron | None | History remains available | No silent deletion | FINAL |

## Schema change note

**POLICY:** Ready Stock needs canonical orders and atomic reservations; refunds
need an obligation/payout distinction; defects need explicit replacement;
post-PO cancellation needs a recoverable amount.

**CURRENT MODEL LIMITATION:** Orders required a secret catalog relation, Ready
Stock had only one ambiguous quantity, order exceptions had no replacement or
recoverable field, and refund obligations had no payout records.

**WHY PRESENT MODEL CANNOT REPRESENT IT:** A Ready Stock order could not be
owned/invoiced without fake catalog data; concurrent claims had no server-side
hold; a paid/refund-due value could not be settled or retried audibly; and a
defect replacement would have to be misclassified as a refund or removal.

**MINIMUM CHANGE:** Make catalog references optional only for
`source=ready_stock`; add `reservedQuantity` and one reservation row per
Ready Stock item; add explicit replacement/recovery fields; add generic
refund obligation and payout rows; extend the existing append-only deposit
ledger with refund references.

No destructive migration or automated deletion is required.
