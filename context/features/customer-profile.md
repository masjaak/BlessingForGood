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
