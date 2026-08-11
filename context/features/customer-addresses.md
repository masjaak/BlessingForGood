# Customer Addresses Feature

`customerAddresses` stores the requested fulfillment fields:

```text
userId
label
recipientName
phone
addressLine1
addressLine2?
city
province
postalCode
isDefault
createdAt
updatedAt
```

Customer CRUD derives `userId` from the verified current app user. Setting a
default clears previous defaults atomically; removing the default promotes the
newest remaining address; clearing the only default is rejected. Admin/owner
fulfillment reads use `customers.read`. No geocoding or dummy address is
created.
