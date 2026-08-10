# Convex Authorization Matrix

This is the Phase 04.1 audit of every exported Convex query/mutation in the
active function modules. `I` means a verified Clerk identity resolved to an
active `appUsers` row. `A(p)` means `I` plus permission `p`. `O` means `I`
plus active owner. `C` means a customer own-data permission and an ownership
check or an `appUserId` index. `L` means a retained legacy entry point that
always returns `LEGACY_IDENTITY_DISABLED`.

| Function | Type | Audience | Required identity / permission | Ownership rule | Prototype-session dependency | Active status | Test coverage |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `publishers.list` | query | admin/owner/customer | A(`books.read`) | none | none | active | Convex suite |
| `publishers.create` | mutation | admin/owner | A(`books.manage`) | `createdByUserId` actor | none | active | Convex suite |
| `books.list` | query | admin/owner/customer | A(`books.read`) | none | none | active | Convex suite |
| `books.create` | mutation | admin/owner | A(`books.manage`) | `createdByUserId` actor | none | active | Convex suite |
| `bookVariants.listForBook` | query | admin/owner/customer | A(`books.read`) | parent book reference | none | active | Convex suite |
| `bookVariants.create` | mutation | admin/owner | A(`books.manage`) | parent book reference | none | active | Convex suite |
| `secretCatalogs.list` | query | admin/owner | A(`catalog.manage`) | operational | none | active | Convex suite |
| `secretCatalogs.create` | mutation | admin/owner | A(`catalog.manage`) | `createdByUserId` actor | none | active | Convex suite |
| `secretCatalogs.open` | mutation | admin/owner | A(`catalog.manage`) | operational | none | active | Convex suite |
| `secretCatalogs.close` | mutation | admin/owner | A(`catalog.manage`) | operational | none | active | Convex suite |
| `secretCatalogs.createBundle` | mutation | admin/owner | A(`catalog.manage`) | `createdByUserId` actor | none | active | Convex suite |
| `catalogItems.listForCatalog` | query | admin/owner | A(`catalog.manage`) | catalog reference | none | active | Convex suite |
| `catalogItems.add` | mutation | admin/owner | A(`catalog.manage`) | catalog reference | none | active | Convex suite |
| `catalogAccess.setCode` | mutation | admin/owner | A(`catalog.manage`) | catalog reference | none | active | Convex suite |
| `catalogAccess.unlock` | mutation | customer/admin/owner | A(`catalog.read`) | creates grant for current `appUserId` + catalog | none | active | Convex suite |
| `catalogAccess.getUnlocked` | query | customer/admin/owner | A(`catalog.read`) | grant indexed by current `appUserId` + catalog | none | active | Convex suite |
| `catalogAccess.listAccessible` | query | customer/admin/owner | A(`catalog.read`) | grants indexed by current `appUserId` | none | active | Convex suite |
| `orders.submit` | mutation | customer | A(`orders.read.own`) | derives `customerUserId`; requires own grant | none | active | core/auth tests |
| `orders.listMine` | query | customer | A(`orders.read.own`) | `by_customer_user_id_and_created_at` | none | active | core/auth tests |
| `orders.listForAdmin` | query | admin/owner | A(`orders.read.all`) | operational all-record view | none | active | core/operations tests |
| `orders.getMine` | query | customer | A(`orders.read.own`) | explicit `customerUserId` match | none | active | auth tests |
| `orders.getForAdmin` | query | admin/owner | A(`orders.read.all`) | operational all-record view | none | active | operations tests |
| `orders.edit` | mutation | customer | A(`orders.read.own`) | explicit own-order check | none | active | core tests |
| `orders.updateStatus` | mutation | admin/owner | A(`orders.manage`) | actor `changedByUserId` | none | active | operations tests |
| `batches.create` | mutation | admin/owner | A(`batches.manage`) | `createdByUserId` actor | none | active | operations tests |
| `batches.listForAdmin` | query | admin/owner | A(`batches.read`) | operational all-record view | none | active | operations tests |
| `batches.getForAdmin` | query | admin/owner | A(`batches.read`) | operational all-record view | none | active | operations tests |
| `batches.linkCatalog` | mutation | admin/owner | A(`batches.manage`) | `createdByUserId` actor | none | active | operations tests |
| `batches.unlinkCatalog` | mutation | admin/owner | A(`batches.manage`) | operational | none | active | operations tests |
| `batches.archive` | mutation | admin/owner | A(`batches.manage`) | actor audit | none | active | operations tests |
| `batchTracking.assignOrderItem` | mutation | admin/owner | A(`tracking.manage`) | actor `assignedByUserId`; order relation checked | none | active | fulfillment tests |
| `batchTracking.updateShipmentStage` | mutation | admin/owner | A(`tracking.manage`) | actor `changedByUserId` | none | active | fulfillment tests |
| `batchTracking.getMine` | query | customer | A(`tracking.read.own`) | checks parent order owner | none | active | fulfillment/auth tests |
| `batchTracking.getForOrderAdmin` | query | admin/owner | A(`tracking.read.all`) | operational all-record view | none | active | fulfillment tests |
| `batchTracking.getForAdmin` | query | admin/owner | A(`tracking.read.all`) | operational all-record view | none | active | fulfillment tests |
| `orderFulfillment.updateStage` | mutation | admin/owner | A(`tracking.manage`) | actor `changedByUserId` | none | active | fulfillment tests |
| `orderFulfillment.getMine` | query | customer | A(`tracking.read.own`) | checks parent order owner | none | active | fulfillment/auth tests |
| `orderFulfillment.getForAdmin` | query | admin/owner | A(`tracking.read.all`) | operational all-record view | none | active | fulfillment tests |
| `invoices.create` | mutation | admin/owner | A(`invoices.manage`) | derives customer from order; actor creator | none | active | invoice tests |
| `invoices.issue` | mutation | admin/owner | A(`invoices.manage`) | actor audit | none | active | invoice tests |
| `invoices.voidInvoice` | mutation | admin/owner | A(`invoices.manage`) | actor audit | none | active | invoice tests |
| `invoices.listMine` | query | customer | A(`invoices.read.own`) | `by_customer_user_id_and_created_at` | none | active | invoice/auth tests |
| `invoices.listForAdmin` | query | admin/owner | A(`invoices.read.all`) | operational all-record view | none | active | invoice tests |
| `invoices.getMine` | query | customer | A(`invoices.read.own`) | explicit `customerUserId` match | none | active | invoice/auth tests |
| `invoices.getForAdmin` | query | admin/owner | A(`invoices.read.all`) | operational all-record view | none | active | invoice tests |
| `paymentConfirmations.submit` | mutation | customer | A(`invoices.read.own`) | invoice `customerUserId` must match current app user | none | active | payment tests |
| `paymentConfirmations.listMine` | query | customer | A(`invoices.read.own`) | customer index | none | active | payment tests |
| `paymentConfirmations.listMineForInvoice` | query | customer | A(`invoices.read.own`) | invoice owner check | none | active | payment tests |
| `paymentConfirmations.getMine` | query | customer | A(`invoices.read.own`) | confirmation owner check | none | active | payment tests |
| `paymentConfirmations.listPendingForAdmin` | query | admin/owner | A(`invoices.read.all`) | operational queue | none | active | payment tests |
| `paymentConfirmations.listForAdmin` | query | admin/owner | A(`invoices.read.all`) | operational history | none | active | payment tests |
| `paymentConfirmations.getForAdmin` | query | admin/owner | A(`invoices.read.all`) | operational detail | none | active | payment tests |
| `paymentConfirmations.startReview` | mutation | admin/owner | A(`invoices.manage`) | confirmation state transition | none | active | payment tests |
| `paymentConfirmations.approve` | mutation | admin/owner | A(`invoices.manage`) | invoice and current settlement rechecked | none | active | payment tests |
| `paymentConfirmations.reject` | mutation | admin/owner | A(`invoices.manage`) | confirmation state transition | none | active | payment tests |
| `depositAccounts.getMine` | query | customer | A(`deposits.read.own`) | account indexed by current `appUserId` | none | active | deposit/auth tests |
| `depositAccounts.getForInvoice` | query | admin/owner | A(`deposits.read.all`) | invoice customer relation | none | active | deposit tests |
| `depositTransactions.recordCredit` | mutation | admin/owner | A(`deposits.manage`) | derives invoice customer account; actor creator | none | active | deposit tests |
| `depositTransactions.reverse` | mutation | admin/owner | A(`deposits.manage`) | account and transaction relation; actor creator | none | active | deposit tests |
| `depositTransactions.listMine` | query | customer | A(`deposits.read.own`) | account indexed by current `appUserId` | none | active | deposit/auth tests |
| `depositTransactions.listForInvoice` | query | admin/owner | A(`deposits.read.all`) | invoice customer account relation | none | active | deposit tests |
| `invoiceDepositAllocations.allocate` | mutation | admin/owner | A(`deposits.manage`) | invoice/account customer relation; actor creator | none | active | deposit tests |
| `invoiceDepositAllocations.release` | mutation | admin/owner | A(`deposits.manage`) | allocation invoice/account relation; actor creator | none | active | deposit tests |
| `invoiceDepositAllocations.reverse` | mutation | admin/owner | A(`deposits.manage`) | allocation invoice/account relation; actor creator | none | active | deposit tests |
| `invoiceDepositAllocations.listMine` | query | customer | A(`deposits.read.own`) | explicit invoice customer match | none | active | deposit/auth tests |
| `invoiceDepositAllocations.listForAdmin` | query | admin/owner | A(`deposits.read.all`) | operational invoice view | none | active | deposit tests |
| `users.ensureCurrentUser` | mutation | signed-in Clerk user | verified identity; owner bootstrap config | subject → one `appUsers` row | none | active | auth tests |
| `users.current` | query | signed-in Clerk user | identity optional; returns null if absent | subject → current `appUsers` row | none | active | auth tests |
| `users.list` | query | owner | O | appUsers security list | none | active | auth tests |
| `users.updateRole` | mutation | owner | O | target appUser; owner target rejected | none | active | auth tests |
| `users.suspend` | mutation | owner | O | target appUser; self/owner rejected | none | active | auth tests |
| `users.reactivate` | mutation | owner | O | target appUser; owner target rejected | none | active | auth tests |
| `customerProfiles.getMine` | query | active customer | I | current appUser only | none | active | auth tests |
| `customerProfiles.upsertMine` | mutation | active customer | I | current appUser only | none | active | auth tests |
| `customerProfiles.getForAdmin` | query | admin/owner | A(`customers.read`) | target appUser is operational input | none | active | auth tests |
| `customerAddresses.listMine` | query | active customer | I | current appUser index | none | active | auth tests |
| `customerAddresses.create` | mutation | active customer | I | derives current appUser; default atomicity | none | active | auth tests |
| `customerAddresses.update` | mutation | active customer | I | explicit address owner match | none | active | auth tests |
| `customerAddresses.remove` | mutation | active customer | I | explicit address owner match | none | active | auth tests |
| `customerAddresses.listForAdmin` | query | admin/owner | A(`customers.read`) | target appUser is operational input | none | active | auth tests |
| `prototypeSessions.createCustomer` | mutation | none | none; always fails | no ownership | isolated legacy only | legacy-disabled | core/auth tests |
| `prototypeSessions.claimAdmin` | mutation | none | none; always fails | no ownership | isolated legacy only | legacy-disabled | core/auth tests |
| `prototypeSessions.me` | query | none | none; always fails | no ownership | isolated legacy only | legacy-disabled | core/auth tests |
| `prototypeSessions.cleanupTest` | mutation | none | none; always fails | no ownership | isolated legacy only | legacy-disabled | core/auth tests |

No active function is anonymous business access, test-only, or Production
authorization. The only intentionally non-authenticated response is
`users.current`, which returns `null` and is not a business-data query.
