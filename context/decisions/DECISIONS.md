# Decisions

## Canonical Convex backend correction

- The canonical Convex account is `palevvi@gmail.com`, team is `palevvi`, and
  project is `blessingforgood`. The development reference is `dev/masjak`.

  ```text
  BFG_CANONICAL_CONVEX_TEAM=palevvi
  BFG_CANONICAL_CONVEX_PROJECT=blessingforgood
  BFG_CANONICAL_DEV=content-snake-214
  BFG_CANONICAL_PRODUCTION=clean-eel-522
  ```

- Only this project is authorized for active BFG development. A separate
  similarly named project under another Convex account/team is a duplicate and
  is `NON-CANONICAL`: do not use, deploy, or configure it, and do not delete it
  automatically.
- Configuration failure is a blocker. Never create a new BFG Convex project,
  use a similarly named BFG project, or create a Preview-looking deployment
  manually. Verify the Convex team, project, and deployment before every
  environment operation.

Phase 06.1 records the following approved implementation decisions:

- Book Master is reusable metadata; Secret Catalog is private curation/access;
  Ready Stock is public per-variant availability. These are not parallel book models.
- Variants own format, globally unique ISBN, and positive integer IDR price.
- Books use draft, published, special/private, and archived publication states.
  Only published books with active positive-stock variants are publicly readable.
- Ready Stock quantity is a separate non-negative per-variant record.
- Global book slugs support `/ready-stock/[slug]`.
- `READY_STOCK_ORDER_RECORDING` remains open; Phase 06.1 uses a contact/help CTA
  and implements no checkout, reservation, or sale transition.
- Cover metadata remains a reference; durable upload/storage is deferred.

Phase 06.2 records the following approved admission decisions:

- `/join` creates a durable Convex `joinRequests` record, not a Clerk account
  or fake `appUsers` row. Approval only makes manual invitation handoff
  eligible.
- Active normalized email/contact duplicates are blocked generically while
  rejected history remains preserved for a later resubmission.
- Review is `submitted → under_review → approved/rejected`, forward-only, with
  authenticated admin/owner actor and audit events. Invitation acceptance and
  account linking remain outside this phase.

Phase 04.1 records the following approved implementation decisions:

- Clerk Development is the identity provider; Convex owns BFG roles,
  permissions, ownership, and suspension.
- Restricted Mode keeps account admission invite-only; public UX exposes only
  `Masuk` as the account CTA.
- `appUsers` is the server-side identity mapping keyed by verified Clerk
  subject; the owner bootstrap subject is server-only.
- Active Preview must use Clerk identity only. Legacy prototype sessions are
  isolated and disabled.

The remaining prototype decisions below are historical and do not override the
Phase 04.1 identity boundary.

The following implementation choices are prototype-only and are recorded in `PROTOTYPE_ASSUMPTIONS.md`:

- local browser adapter behind explicit prototype mode;
- one catalog access code hashed before storage;
- one-title catalog creation form for the first vertical slice;
- fixed, percentage, or unset invoice deposit requirement;
- append-only local deposit transactions.
