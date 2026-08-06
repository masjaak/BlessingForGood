# Deposit ledger

Status: implemented on `feat/convex-operations-persistence-v0.1`.

Each Preview customer receives one IDR deposit account only after an explicit
admin credit. Account summaries expose distinct available and reserved
amounts. The ledger is append-only:

| Type | Effect |
| --- | --- |
| `credit` | available `+amount` |
| `reservation` | available `-amount`, reserved `+amount` |
| `release` | available `+amount`, reserved `-amount` |
| `debit` | available `-amount` when an approved non-reservation operation uses it |
| `reversal` | exact inverse deltas of one eligible prior transaction |

Invoice allocation is backed by one reservation transaction. Allocation,
release, and allocation reversal update the allocation, account summary,
ledger, and invoice summary atomically. No deposit transaction has an edit or
delete operation. Reversal leaves the original row visible and adds a new
inverse row; a transaction can be reversed only once and a reversal cannot be
reversed.

This is an operational Preview ledger, not a payment gateway, bank
reconciliation, refund, withdrawal, or final financial policy. Customer reads
are server-side ownership protected; admin writes require the guarded Preview
admin session.
