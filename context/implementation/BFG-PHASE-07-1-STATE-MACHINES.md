# BFG Phase 07.1 State Machines

Status: `CANONICAL_IMPLEMENTED_LOCALLY__PRODUCTION_UAT_PENDING`

These machines reuse existing domain states. Phase 07.1 adds only the minimum communication and access transitions
required by the reconciled contract.

## Secret Catalog lifecycle

```text
DRAFT --OPEN--> OPEN --CLOSE--> CLOSED
ARCHIVED = retained legacy terminal state; no Phase 07.1 archive control is source-required
```

- `DRAFT`: metadata/items may be edited; customer reads are denied.
- `OPEN`: eligible scoped customers/sessions may read and order before the deadline.
- `CLOSED`: new unlock/order is denied; operational history remains.
- `ARCHIVED`: immutable/retired operational state.
- Guards: Admin/Owner `catalog.manage`; deadline must be future when opening; archived catalogs cannot reopen.

## Catalog access

```text
CODE_ACTIVE --REVOKE/REGENERATE/EXPIRE--> CODE_INACTIVE
CODE_ACTIVE + VALID_INPUT --UNLOCK--> SESSION_ACTIVE
SESSION_ACTIVE --CODE_REVOKED/SESSION_REVOKED/EXPIRED/CATALOG_CLOSED--> SESSION_INACTIVE
SESSION_ACTIVE + ACTIVE_MEMBER --UPSERT_GRANT--> GRANT_ACTIVE
GRANT_ACTIVE --ADMIN_REVOKE/EXPIRE/CATALOG_CLOSED--> GRANT_INACTIVE
```

- Admin generation returns plaintext once; only keyed digests and metadata persist.
- Anonymous access is a catalog/code-scoped opaque session, not a BFG identity.
- An authenticated active member also receives/refreshes a grant for owned preorder authorization.
- Code revocation invalidates sessions tied to that code and prevents new unlocks.
- A member grant is separately listed and revocable; Customer A never inherits Customer B's grant.
- Invalid, expired, rate-limited, wrong-scope, closed-catalog, draft-book, and archived-book paths fail closed.

## Notification

```text
UNREAD --OPEN_OR_MARK_READ--> READ
```

- A notification is created only from a canonical domain event for one recipient.
- `READ` is idempotent. Archive is not required by the source contract and is not introduced.
- Recipient ownership is enforced server-side; the body never stores secrets, proof URLs, or internal notes.

## Inbox operational message

```text
UNREAD --OPEN_OR_MARK_READ--> READ
```

- Inbox means persistent BFG operational messages/submissions, not chat.
- No presence, typing, reactions, attachments, threads, or realtime social conversation is introduced.
- The related canonical entity remains authoritative; the message stores only safe context and a destination.

## Product publication

```text
DRAFT --PUBLISH_PUBLIC--> PUBLISHED
DRAFT --PUBLISH_PRIVATE--> SPECIAL
PUBLISHED/SPECIAL --ARCHIVE--> ARCHIVED
PUBLISHED <--> SPECIAL
```

- Public Ready Stock requires `PUBLISHED`, active publisher/book/variant, and positive available inventory.
- Secret Catalog permits eligible non-draft, non-archived private items only through valid catalog access.
- Existing order-item snapshots never change when the Book Master changes.

## Batch PO and shipment

```text
EDITABLE
  --CLOSE_PO--> PO_CLOSED
  --invalid direct shipment transition--> REJECT

PO_CLOSED → ORDERED_TO_SUPPLIER → SHIPPED_INTERNATIONALLY
→ CUSTOMS → TO_INDONESIA_WAREHOUSE → AT_STORE
```

- `EDITABLE` plus the six shipment stages are the canonical seven semantic states.
- Catalog links and roster assignment changes are allowed only in `EDITABLE`.
- Forward skips require explicit Admin confirmation; backward transitions are rejected.
- Participating customers see the same batch projection, not copied per-customer batch state.

## Deposit and payment

```text
TOP_UP_SUBMITTED → UNDER_REVIEW → APPROVED
                                 ↘ REJECTED

PAYMENT_SUBMITTED → UNDER_REVIEW → APPROVED
                                    ↘ REJECTED

INVOICE: DRAFT → ISSUED → VOID
PAYMENT PROJECTION: UNPAID | PAYMENT_SUBMITTED | PARTIALLY_PAID | PAID
```

- Approval creates the financial consequence atomically; proof submission alone never changes the balance.
- Deposit remains append-only: credit/reservation/release/debit/reversal/adjustment consequences are never edited.
- Proof files are private and ownership/finance-role guarded.

## Join and admission

```text
NOT_REQUESTED → SUBMITTED → UNDER_REVIEW → APPROVED_PENDING_ADMISSION → ADMITTED
                                      ↘ REJECTED
```

- Public submission does not create a Clerk user or `appUsers` row.
- Approval is required before admission. Existing-identity admission is idempotent; manual Clerk invitation remains
  the external handoff for applicants without an identity.
- Approval/rejection may create a safe operational Inbox message only when a canonical recipient exists.
