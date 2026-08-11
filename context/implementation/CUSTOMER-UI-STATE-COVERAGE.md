# Customer UI State Coverage

Scope: customer/public routes only. Statuses describe implementation coverage;
authenticated live rendering remains dependent on the separate Clerk/Convex
environment setup and is never filled with dummy business data.

The state matrix is complete at source level. Live authenticated visual
acceptance for the account routes remains pending until a matching Clerk
Production/development pair and canonical Convex environment can issue a
real session.

| Route | Default | Loading | Empty | Error | Success | Pending | Disabled | Unauthorized |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | IMPLEMENTED | N/A | N/A | N/A | N/A | N/A | N/A | N/A |
| `/community` | IMPLEMENTED | N/A | N/A | N/A | N/A | N/A | N/A | N/A |
| `/how-to-order` | IMPLEMENTED | N/A | N/A | N/A | N/A | N/A | N/A | N/A |
| `/join` | IMPLEMENTED | IMPLEMENTED | N/A | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED |
| `/ready-stock` | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | N/A | IMPLEMENTED | IMPLEMENTED | N/A |
| `/ready-stock/[slug]` | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | N/A | IMPLEMENTED | IMPLEMENTED | N/A |
| `/catalog` access/browse | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED |
| `/sign-in` | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | N/A |
| `/account` | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | N/A | IMPLEMENTED | N/A | IMPLEMENTED |
| `/account/orders` | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED |
| `/account/orders/[orderId]` | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED |
| `/account/invoices` | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED |
| `/account/invoices/[invoiceId]` | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED |
| `/account/profile` | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED |
| `/account/addresses` | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED |

## Shared State Rules

- Loading uses the branded `state-panel`; no blank async surface is allowed.
- Empty states use real actions and may use the official mascot.
- Errors are short, recoverable, and customer-readable; raw Clerk/Convex
  details never render.
- Form actions expose pending/disabled/success/error feedback.
- Protected routes remain server/Convex-authorized; navigation is not the
  security boundary.
