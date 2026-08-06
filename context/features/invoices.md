# Invoices

Status: implemented on `feat/convex-operations-persistence-v0.1`.

An admin creates a draft invoice from the authoritative persistent order-item
snapshots. Invoice items store title, publisher, format, ISBN, quantity, unit
price, and subtotal snapshots; client-submitted totals are ignored. Currency
is integer IDR.

Lifecycle:

```text
draft → issued → void
```

One non-void invoice is allowed per order. Voiding preserves the prior record;
a future revision must create a new invoice. Invoice numbers are generated
from the unique Convex invoice ID inside the mutation and are collision-safe
for this Preview prototype, not final accounting policy.

Deposit requirements are explicitly selected as `none`, fixed Rupiah, or
integer basis points. Percentage calculation uses integer arithmetic and
rounds to the nearest whole Rupiah. Shipping, customs, tax, discount,
exchange-rate, and arbitrary manual lines are not calculated.

Customers can query only owned invoices and see line snapshots, requirement,
allocated deposit, and outstanding amount. Payment gateway settlement,
`paid`, `overdue`, refund, and final tax states are deferred.
