# Catalog search and multi-Catalog Cart stabilization

## Baseline — 2026-09-15

- Branch/HEAD/main/origin/main: `main`, `9d88c67b4146fb9dd21ed03cbfde63a7b6deb10a` after fetch.
- Production: same SHA, `dpl_Adi5tzuB5EhSqpDx92JqtGWzFd4C`, READY/PROMOTED.
- Pre-existing changes: media traceability document, tsconfig.tsbuildinfo,
  artifacts/, admin-book-core characterization backend/component tests, and
  admin-book-editor geometry test. These are outside this task.

## Operating contract

Development System V2: evidence, owner, deterministic red test, minimal fix,
focused and adjacent regression, integrated regression, deploy, safe proof.
Framework Development V2: commit search before Cart UI; commit UI before scoped
checkout; commit checkout before enabling cross-Catalog Add.
Context Engineering: trace UI/query and Cart/Order ownership before changes.
Prompt Engineering: each phase must satisfy the user's explicit reproduction,
expected behavior, forbidden shortcuts, measurable gates, and stop condition.
Memory Engineering: maintain CURRENT, PROTECTED, SUPERSEDED, UNPROVEN below.
Harness Engineering: exercise persisted query/mutation paths and component/UI
consumers, including failed transactions and retries.

## CURRENT

- Search root cause: SEARCH_WINDOWING_DEFECT, deterministically reproduced.
  `AdminCatalogDetail` searches an already truncated 500-Variant response.
- Existing matcher includes title, Publisher, author, and partial normalized
  ISBN; text is trimmed/lowercased and ISBN removes spaces/hyphens.
- Eligibility was evaluated after take(500); membership also used take(500).
  Identity is Variant-level. Book -> publisherId resolves Publisher metadata.
  Catalog Publisher filter independently reads assigned Catalog items.
- Search implementation: bounded cursor pages, server metadata
  predicate, exact indexed membership exclusion, cached Publisher hydration.
  Empty intermediate pages must continue before claiming no matches.
- M2 grouped backend projection is GREEN. Customer multi-Catalog Cart and
  valid cross-Catalog Add are now implemented; Ready Stock remains separate.

## PROTECTED

Book Master search/index, media, Ready Stock, Auth/Clerk, invitations, Batch
lifecycle/export, direct preorder, cancellation, finance, Invoice, Payment,
Deposit, Blessy, bottom nav, and global CSS.

## SUPERSEDED

User-approved model: one authenticated Customer -> one persistent Cart ->
multiple Secret Catalog groups -> one Order per selected Catalog checkout.
The former one-Catalog Cart lock and its customer-facing mismatch path are
superseded by grouped Cart rendering and scoped checkout.

## UNPROVEN

Migration compatibility, full integrated flow, responsive matrix, final
deployment, authenticated UAT.

## Gates

- A baseline: PASS.
- B search: GREEN. Red reproduced; 39 focused/adjacent tests pass (including
  cursor continuation), TypeScript and focused lint pass. No schema change.
- C grouped Cart UI: GREEN. The Cart page renders each server-projected Catalog
  group independently, keeps management actions line-scoped, and has the
  responsive matrix fixture updated for three groups.
- D scoped checkout/idempotency: GREEN. `orders.submitCart` accepts an
  optional canonical `catalogId` selector and persists one bounded
  `cartCheckouts` record per Cart/Catalog cycle. Canonical Order insertion,
  Batch admission, snapshots, retries, and concurrent independent groups are
  covered. The legacy root marker remains compatibility metadata only.
- E cross-Catalog Add: GREEN. `carts.addItem` no longer treats legacy root
  `catalogId` as a lock; valid offers merge by exact Catalog Item identity and
  separate Catalog groups remain distinct. Obsolete mismatch UI/error mapping
  is removed.
- F integrated harness: GREEN. The persisted Convex journey adds three valid
  Catalog Items, verifies the global retained count and three groups, blocks
  one group without blocking the other two, checks out Catalog B only, retries
  B idempotently, then consumes A and C with three single-Catalog Orders.
- G deployment: pending.
- H Production proof: pending.
