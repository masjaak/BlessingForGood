# Customer Profile Feature

`customerProfiles` has one row per app user:

```text
userId
displayName
phone?
whatsappNumber?
createdAt
updatedAt
```

Customers read and upsert only their own profile through `getMine` and
`upsertMine`. Admin/owner operational reads use `getForAdmin` with
`customers.read`. Clerk data is not copied automatically beyond the safe
`appUsers` snapshots needed for account display.

## Preorder customer-name source

`customerProfiles.displayName` is the operational BFG customer-name authority
for a new preorder. The shared resolver used by
`src/components/customer-catalog.tsx` and
`src/components/secret-catalog-book-detail.tsx` applies this precedence:

```text
BFG displayName → Clerk fullName → Clerk username → empty editable field
```

`ConvexProductProvider` reads the current Customer's own profile through
`customerProfiles.getMine` and does not write to Clerk. Each preorder form
initializes once after the profile query is ready; later profile refreshes do
not overwrite a name the Customer has edited. Profile changes affect newly
opened forms only. No first-time seed or two-way synchronization is added.

`orders.submit` continues to receive the current editable form value and
stores it in `orders.customerName`; existing order/customer/item snapshots
remain historical and are never renamed from a later profile change.
