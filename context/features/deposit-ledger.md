# Deposit ledger

Status: [REPOSITORY] implemented; Phase 05.1 reuses it without rewriting
ledger rows.

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

This is an operational ledger, not a payment gateway, bank reconciliation,
withdrawal, or final financial policy. Phase 06.7 deposit refunds are allowed
only from unallocated available balance and settle through a separate refund
obligation plus append-only reservation/release/debit rows. Customer reads are
server-side ownership protected; admin writes require the active permission
boundary.

Phase 05.1 manual payment confirmations are not deposit credits and never
create deposit ledger rows. Deposit allocation and approved external transfer
amounts settle separate invoice components; the invoice outstanding projection
subtracts each exactly once.

## Phase 06.4 exception interaction

`deposit_release` uses the existing allocation release path. It appends the
compensating release transaction, restores available balance, reduces active
reserved balance, updates the invoice projection, and leaves the reservation
and release history visible. A released allocation cannot be released again.
This is ledger release, not a deposit refund by itself. A successful deposit
refund payout appends the release and debit consequences only after the payout
is recorded as paid; a failed payout releases its temporary hold.
