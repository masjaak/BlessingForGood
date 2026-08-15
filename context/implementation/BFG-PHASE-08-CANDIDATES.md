# BFG PHASE 08 CANDIDATES

Source-reconciled backlog only. This document does not authorize implementation.
Each candidate requires a separate Phase Source Contract before work starts.

| Priority | Feature | Source | Problem | Why now | User role | Business value | Dependencies | Risk | Acceptance criteria | Recommended priority |
|---|---|---|---|---|---|---|---|---|---|---|
| P0 | None currently | Reconciled security, financial, ownership, and admission contracts | Phase 07.1 has no unresolved P0 product-correctness gap in the reconciled baseline | Preserve the locked baseline before adding scope | all | protects trust and financial integrity | none | regression/drift if reopened casually | no P0 work starts until a new source conflict is proven | P0: none |
| P1 | Bulk catalog/order import | original `/admin/import` route and upload/catalog mockups; current future backlog | Original concept shows import/mapping, but current system has no safe canonical mapping/rollback contract | Operational scale may eventually require bounded batch entry | Admin/Owner | reduces repetitive data entry without bypassing Book Master/order rules | mapping schema, validation report, duplicate policy, rollback/audit, file limits | partial writes, duplicates, bad price/ISBN, unauthorized imports | dry-run preview; all-or-nothing or explicit per-row consequence; idempotency; audit; customer projection only after commit; invalid rows visible | P1 |
| P1 | Product gallery and external preview metadata | original Ready Stock/book-detail rules and mobile/admin mockups; current one-cover schema | Gallery/preview controls are source-supported but not implemented in the current bounded media model | improves customer product decision support after core media is stable | Admin/Customer | clearer product discovery and conversion | storage/access/ordering/retention/schema contract; customer-safe projection | leaked/private media, inconsistent historical snapshots, oversized payloads | Admin upload/replace/remove; validated private/public access; deterministic ordering; hard-refresh persistence; customer-safe projection; tests/UAT | P1 |
| P1 | Advanced analytics | original reports feature and scope; current minimum report already complete | Current report covers bounded sales, orders, batches, period filter, and CSV export; deeper dimensions remain undefined | operational decisions may need trend/cohort/batch detail | Admin/Owner | planning and operational visibility | approved dimensions, aggregation windows, retention, privacy, export contract | fake/ambiguous metrics, unbounded queries, financial misinterpretation | source-backed metric definitions; bounded indexed queries; reconciliation against canonical records; permission and export audit; rendered QA | P1 |
| P1 | Backup and restore operations | original success criteria/database/operations documents | Current product has bounded export but not a complete operator restore runbook | production resilience needs explicit procedure | Owner | recovery confidence and continuity | provider backup capability, RPO/RTO, restore rehearsal, access policy | destructive restore, stale/mixed environment data, secret exposure | documented dry-run/rehearsal; environment separation; verification checklist; no customer data leakage; recovery evidence | P1 |
| P2 | Cross-domain Admin search | current implementation backlog; source supports operational usability but not exact search contract | Section-level filters exist; one global search surface/index does not | useful after domains and fields stabilize | Admin/Owner | faster operations | searchable-field policy, indexing, ownership/privacy, route destinations | leakage and costly/unbounded scans | permission-aware indexed search across approved fields; bounded results; safe destination; audit where sensitive | P2 |

## Not Candidates

- Payment Gateway and automatic settlement: explicit exclusion.
- Official/automatic WhatsApp Business API, unofficial automation, and blasts:
  explicit exclusion; manual handoff remains active.
- Full social chat/presence/reactions: explicit exclusion.
- The current minimum reports/export, structured CMS content, settings,
  event-backed notification/Inbox, multi-Admin/RBAC, and audit: already
  implemented and kept in the baseline.

## Candidate Gate

No candidate may be moved to implementation until its Phase Source Contract
states objective, source rows, current baseline, dependencies, security and
financial constraints, visual source, deliverables, tests, and Production
acceptance. A candidate is not a Phase 08 feature merely because an old report
listed it there.
