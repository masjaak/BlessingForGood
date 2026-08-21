# BFG PHASE 08 CANDIDATES

Source-reconciled backlog and classification. This document does not authorize
new implementation. Already-approved Phase 08 work is marked with its current
completion state; future candidates remain separate from the current product
contract.

| Priority | Feature | Source | Problem | Why now | User role | Business value | Dependencies | Risk | Acceptance criteria | Recommended priority |
|---|---|---|---|---|---|---|---|---|---|---|
| P0 | None currently | Reconciled security, financial, ownership, and admission contracts | Phase 07.1 has no unresolved P0 product-correctness gap in the reconciled baseline | Preserve the locked baseline before adding scope | all | protects trust and financial integrity | none | regression/drift if reopened casually | no P0 work starts until a new source conflict is proven | P0: none |
| P1 | Bulk catalog/order import | original `/admin/import` route and upload/catalog mockups; current future backlog; [`BFG-PHASE-08-SOURCE-CONTRACT.md`](BFG-PHASE-08-SOURCE-CONTRACT.md) | Source Contract now resolves V1 as bounded product-master CSV import; transactional order import remains excluded | Operational scale now justifies bounded product entry | Admin/Owner | reduces repetitive data entry without bypassing Book Master rules | mapping/data contract, validation preview, duplicate policy, atomic rollback, audit, file limits | partial writes, duplicates, bad price/ISBN, unauthorized imports | V1 implementation and Production deployment are green; legitimate 3–5-book pilot is `DEFERRED_BY_USER_DATA`; no dummy products | `GREEN_IMPLEMENTATION_DEPLOYED` |
| P1 | Product gallery and external preview metadata | original Ready Stock/book-detail rules, Admin/customer mockups, and latest user decisions | Implemented as Book Master-owned `bookMedia` plus optional HTTPS metadata-only preview; no variant override | current source-defined media contract is now being finished | Admin/Customer | clearer product discovery and conversion | existing Convex storage/access/ordering/audit and customer-safe projection | leaked/private media, inconsistent historical snapshots, oversized payloads | local deterministic implementation green; Production deploy and one-real-book UAT are remaining gates | `REQUIRED_CURRENT_SCOPE` |
| P1 | Advanced analytics | original reports feature and scope; current minimum report already complete | Current report covers bounded sales, orders, batches, period filter, and CSV export; deeper dimensions remain undefined | no explicit current-client requirement for deeper dimensions | Admin/Owner | planning and operational visibility | approved dimensions, aggregation windows, retention, privacy, export contract | fake/ambiguous metrics, unbounded queries, financial misinterpretation | classify as `OPTIONAL_FUTURE`; do not delay current product completion | `OPTIONAL_FUTURE` |
| P1 | Backup and restore operations | original success criteria/database/operations documents | Current product has bounded export; custom restore UI and rehearsal workflow are not current client scope | provider operations and disaster-recovery work can be handled separately | Owner | recovery confidence and continuity | provider backup capability, RPO/RTO, restore rehearsal, access policy | destructive restore, stale/mixed environment data, secret exposure | classify custom operator UI/workflow as `OPTIONAL_FUTURE / OPERATIONS`; retain maintenance review | `OPTIONAL_FUTURE` |
| P2 | Cross-domain Admin search | current implementation backlog; source supports operational usability but not exact search contract | Section-level filters/search exist; global search/index is not required for current operations | useful only after domains and fields stabilize | Admin/Owner | faster operations | searchable-field policy, indexing, ownership/privacy, route destinations | leakage and costly/unbounded scans | classify as `OPTIONAL_FUTURE`; do not add a global search surface now | `OPTIONAL_FUTURE` |

## Not Candidates

- Payment Gateway and automatic settlement: explicit exclusion.
- Official/automatic WhatsApp Business API, unofficial automation, and blasts:
  explicit exclusion; manual handoff remains active.
- Full social chat/presence/reactions: explicit exclusion.
- The current minimum reports/export, structured CMS content, settings,
  event-backed notification/Inbox, multi-Admin/RBAC, and audit: already
  implemented and kept in the baseline.

## Candidate Gate

No optional candidate may be moved to implementation until its Phase Source
Contract states objective, source rows, current baseline, dependencies,
security and financial constraints, visual source, deliverables, tests, and
Production acceptance. A candidate is not a current required feature merely
because an old report listed it there.
