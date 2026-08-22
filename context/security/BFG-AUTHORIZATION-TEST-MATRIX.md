# BFG AUTHORIZATION TEST MATRIX

Status: `GREEN_EVIDENCE` · deterministic Convex adversarial tests run
2026-08-22. All rows below were evaluated server-side; no UI hiding was used
as a security assertion.

## Cross-Customer Customer A → Customer B

Fixture: Customer A creates the resource; Customer B receives the known object
ID/reference and calls the Convex function directly.

| Resource / attack                         | Expected                            | Observed | Server guard / test                                        |
| ----------------------------------------- | ----------------------------------- | -------- | ---------------------------------------------------------- |
| Read B order                              | DENIED                              | DENIED   | `orders.getMine` ownership; Phase 09.1 suite               |
| Read B invoice                            | DENIED                              | DENIED   | `invoices.getMine` ownership; Phase 09.1 suite             |
| Read B payment confirmation               | DENIED                              | DENIED   | invoice/customer ownership; Phase 09.1 suite               |
| List B payment confirmations for invoice  | DENIED                              | DENIED   | invoice ownership; Phase 09.1 suite                        |
| Submit payment against B invoice          | DENIED                              | DENIED   | `paymentConfirmations.submit`; Phase 09.1 suite            |
| Read B deposit account/history            | DENIED                              | DENIED   | current-user/account index; Phase 09.1 suite               |
| Read B address                            | DENIED                              | DENIED   | own address functions; Phase 09.1 suite                    |
| Mutate B address                          | DENIED                              | DENIED   | `ownedAddress`; Phase 09.1 suite                           |
| Read B batch/tracking assignment          | DENIED                              | DENIED   | order ownership; Phase 09.1 suite                          |
| Read B activity/inbox/message             | DENIED                              | DENIED   | user-derived notification/activity index; Phase 09.1 suite |
| Read B profile through customer surface   | DENIED                              | DENIED   | `getMine` derives current user; Phase 09.1 suite           |
| Use B Secret Catalog grant                | DENIED                              | DENIED   | current appUser grant index; core/Phase 09.1 tests         |
| Guess B human `BFG-ORD/INV/PAY` reference | DENIED / generic not-found behavior | DENIED   | reference is not authority; ownership queries              |

Successful unauthorized reads: **0**. Successful unauthorized writes: **0**.

## Customer → Admin Direct Mutation

| Direct call                             | Expected | Observed | Guard                              |
| --------------------------------------- | -------- | -------- | ---------------------------------- |
| Create/edit/publish Book or variant     | DENIED   | DENIED   | `books.manage`                     |
| Generate/attach cover or gallery upload | DENIED   | DENIED   | `books.manage`                     |
| Adjust Ready Stock                      | DENIED   | DENIED   | `books.manage`                     |
| Create/open/close Catalog               | DENIED   | DENIED   | `catalog.manage`                   |
| Generate/set/revoke Catalog code        | DENIED   | DENIED   | `catalog.manage`                   |
| Grant/revoke Catalog member             | DENIED   | DENIED   | `catalog.manage`                   |
| Admin-assisted order                    | DENIED   | DENIED   | `orders.manage`                    |
| Batch creation/assignment/movement      | DENIED   | DENIED   | `batches.manage`/`tracking.manage` |
| Invoice issue/void                      | DENIED   | DENIED   | `invoices.manage`                  |
| Payment start review/approve/reject     | DENIED   | DENIED   | `invoices.manage`                  |
| Deposit credit/allocation/adjustment    | DENIED   | DENIED   | `deposits.manage`                  |
| Refund processing/payout                | DENIED   | DENIED   | `refunds.manage`/`deposits.manage` |
| Customer suspension                     | DENIED   | DENIED   | `requireOwner`                     |
| Staff invitation                        | DENIED   | DENIED   | `requireOwner`                     |
| Role change                             | DENIED   | DENIED   | `requireOwner`                     |
| Settings/content publish                | DENIED   | DENIED   | `settings.manage`/`content.manage` |
| Bulk Import preview/confirm             | DENIED   | DENIED   | `books.manage`                     |

The Phase 09.1 suite directly invokes representative functions; the full
function inventory maps every sibling function to the same shared guard.

## Admin → Owner-Only

| Attack                               | Expected | Observed | Guard                              |
| ------------------------------------ | -------- | -------- | ---------------------------------- |
| Invite privileged staff              | DENIED   | DENIED   | `requireOwner`                     |
| Promote/demote a role                | DENIED   | DENIED   | `requireOwner`                     |
| Suspend/reactivate staff             | DENIED   | DENIED   | `requireOwner`                     |
| Modify Owner-only settings           | DENIED   | DENIED   | `settings.manage` / owner boundary |
| Access audit/user-management surface | DENIED   | DENIED   | `audit.read`/`users.read`          |

## Suspended Identity

| Reuse attempt                             | Expected                    | Observed | Guard                                     |
| ----------------------------------------- | --------------------------- | -------- | ----------------------------------------- |
| Refresh protected account route/query     | DENIED                      | DENIED   | `requireActiveUser`                       |
| Direct protected Convex query             | DENIED                      | DENIED   | `requireActiveUser`                       |
| Direct mutation with known object ID      | DENIED                      | DENIED   | active status before permission/ownership |
| Reopen browser with old scoped state      | DENIED for private BFG data | DENIED   | active/grant/session checks               |
| Suspended Admin calls privileged function | DENIED                      | DENIED   | `requireActiveUser`                       |

## Secret Catalog Revocation / Brute Force

| Attempt                                | Expected                                                                      | Observed                                                    |
| -------------------------------------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Wrong code                             | NO ACCESS                                                                     | NO ACCESS                                                   |
| Invalid-code burst                     | limiter engages; no code-validity hint                                        | `RATE_LIMITED` after policy threshold in deterministic test |
| Revoked code                           | NO ACCESS                                                                     | NO ACCESS                                                   |
| Expired code/session when supported    | NO ACCESS                                                                     | status/expiry guard                                         |
| Revoked member grant                   | NO ACCESS                                                                     | grant lookup denies                                         |
| Old scoped session after code revoke   | NO ACCESS                                                                     | old token denied                                            |
| Reuse after successful redemption      | scoped session remains only within TTL/status contract; no raw code persisted | digest/session path only                                    |
| Wrong Catalog code for another catalog | NO ACCESS                                                                     | catalog digest/status mismatch                              |

## Allow + Deny Coverage

| Domain                   | Allow evidence                                                 | Deny evidence                                |
| ------------------------ | -------------------------------------------------------------- | -------------------------------------------- |
| Auth/current user        | `auth.test.ts`, full suite                                     | anonymous/suspended tests                    |
| Catalog                  | `core.test.ts` grant/session flows                             | wrong/revoked code and cross-user grant      |
| Orders/Ready Stock       | `policy.test.ts`, `readyStock.test.ts`                         | cross-customer/stock/customer role           |
| Invoices/payments        | `invoices.test.ts`, `paymentConfirmations.test.ts`             | cross-customer and Admin/customer boundaries |
| Deposits/refunds         | `deposit.test.ts`, `policy.test.ts`, `orderExceptions.test.ts` | account ownership/role/state denials         |
| Batch/tracking           | `batchRoster.test.ts`, `policy.test.ts`                        | customer/admin ownership and role denials    |
| Profile/address/activity | domain/Convex suites                                           | Phase 09.1 cross-customer attacks            |
| Users/Owner              | `auth.test.ts`, users tests                                    | Admin→Owner and suspended staff denials      |
| Content/settings/audit   | content/settings/auth suites                                   | customer/admin direct calls                  |
| Uploads/import           | product media/payment/deposit/bulk tests                       | role/file/size/validator denials             |

## Result

```text
CROSS-CUSTOMER READ LEAK: 0
CROSS-CUSTOMER WRITE: 0
CUSTOMER → ADMIN BYPASS: 0
ADMIN → OWNER BYPASS: 0
SUSPENDED ACCESS: 0
REVOKED CATALOG ACCESS: 0
```

The matrix is `GREEN_EVIDENCE` for deterministic Development fixtures. It is
not a claim of a destructive Production penetration test; Production tests
were read-only and bounded by the load-test safety contract.
