# BFG UI State Coverage Matrix

Date: 2026-08-11
Scope: Production runtime routes on `hotfix/production-ui-alignment-v1`.

`IMPLEMENTED` means the route has a deliberate product state. `MISSING` is a
real presentation gap; it does not authorize a second data source or weakened
server guard.

| Route / workflow | Default | Loading | Empty | Error | Success | Mutation pending | Disabled | Unauthorized |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/`, `/community`, `/how-to-order`, `/help` | IMPLEMENTED | NOT APPLICABLE | NOT APPLICABLE | NOT APPLICABLE | NOT APPLICABLE | NOT APPLICABLE | NOT APPLICABLE | NOT APPLICABLE |
| `/ready-stock` | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | NOT APPLICABLE | NOT APPLICABLE | NOT APPLICABLE | NOT APPLICABLE |
| `/ready-stock/[slug]` | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | NOT APPLICABLE | NOT APPLICABLE | NOT APPLICABLE | NOT APPLICABLE |
| `/catalog` access | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED |
| `/catalog` order | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED |
| `/join` | IMPLEMENTED | IMPLEMENTED | NOT APPLICABLE | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | NOT APPLICABLE |
| `/sign-in`, `/sign-up` | IMPLEMENTED | IMPLEMENTED | NOT APPLICABLE | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | NOT APPLICABLE |
| `/account` | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | NOT APPLICABLE | NOT APPLICABLE | NOT APPLICABLE | IMPLEMENTED |
| `/account/orders` | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | NOT APPLICABLE | NOT APPLICABLE | NOT APPLICABLE | IMPLEMENTED |
| `/account/orders/[orderId]` | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED |
| `/account/invoices` | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | NOT APPLICABLE | NOT APPLICABLE | NOT APPLICABLE | IMPLEMENTED |
| `/account/invoices/[invoiceId]` | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED |
| `/account/profile` | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED |
| `/account/addresses` | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED |
| `/admin` | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | NOT APPLICABLE | NOT APPLICABLE | NOT APPLICABLE | IMPLEMENTED |
| `/admin/books` and detail | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED |
| `/admin/catalogs` | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED |
| `/admin/join-requests` | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED |
| `/admin/orders` and detail | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED |
| `/admin/batches` and detail | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED |
| `/admin/invoices` and detail | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED |
| `/admin/payments` | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED |
| `/admin/exceptions` | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED |
| `/admin/customers` and detail | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | NOT APPLICABLE | NOT APPLICABLE | NOT APPLICABLE | IMPLEMENTED |
| `/admin/users` | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED |

## Shared behavior

- `ProductAccessGuard` owns configuration, signed-out, suspended, loading,
  network, and role-denied states.
- `.state-panel` owns the consistent non-jumping loading treatment.
- `EmptyState` owns branded customer zero states and restrained admin zero
  states.
- Mutation forms retain their existing server validation and expose pending,
  disabled, success, and safe error feedback where the operation exists.
- No raw Convex or Clerk stack is intentionally rendered.

## Runtime evidence boundary

Signed-out states are covered by route smoke. Authenticated customer/admin state
rendering is blocked locally by mismatched Clerk development credentials and
the unavailable canonical Convex deployment; source and component coverage are
not presented as rendered acceptance evidence.
