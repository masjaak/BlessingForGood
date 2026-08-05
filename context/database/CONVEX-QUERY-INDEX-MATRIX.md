# Phase 03.1 Convex query/index matrix

| Query               | Table               | Filter              | Index                       | Pagination/bound |
| ------------------- | ------------------- | ------------------- | --------------------------- | ---------------- |
| active publishers   | publishers          | `isActive`          | `by_active`                 | paginated        |
| active books        | books               | `isActive`          | `by_active`                 | paginated        |
| variants for book   | bookVariants        | `bookId`            | `by_book`                   | bounded list     |
| admin catalogs      | secretCatalogs      | creation order      | `by_created_at`             | paginated        |
| catalog items       | catalogItems        | `catalogId`         | `by_catalog`                | max 200          |
| access code lookup  | catalogAccessCodes  | keyed lookup digest | `by_lookup_digest`          | one active match |
| customer grant      | catalogAccessGrants | session + catalog   | `by_session_and_catalog`    | one              |
| test cleanup grants | catalogAccessGrants | catalog             | `by_catalog`                | max 500          |
| customer orders     | orders              | session + creation  | `by_session_and_created_at` | paginated        |
| admin orders        | orders              | creation order      | `by_created_at`             | paginated        |
| order items         | orderItems          | `orderId`           | `by_order`                  | max 200          |
| order history       | orderStatusHistory  | order + time        | `by_order_and_changed_at`   | max 100          |

The bounded ceilings are the current prototype ceiling. Pagination is the
upgrade path for catalog items and nested order history when those surfaces
become independently managed.
