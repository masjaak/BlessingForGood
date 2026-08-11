# BFG PRD Coverage Matrix

Status: Production V1 release-convergence source of truth, re-audited during
the forward-only Production UI correction on 2026-08-11.

The original product pack at
`/Users/masjak/Documents/BLESSINGFORGOOD/BFG WEB/context/product/` was audited
read-only against the canonical repository. Evidence below refers to current
Phase 01–06.4 code plus this release worktree.

| Requirement | Status | Evidence | Remaining gap |
| --- | --- | --- | --- |
| Foundation | IMPLEMENTED | Next.js App Router, Clerk/Convex providers, shared BFG tokens/components, deterministic checks | Production runtime evidence |
| Authentication and access levels | IMPLEMENTED | Clerk identity, `appUsers`, owner/admin/customer permissions, suspension, server guards | Production Clerk verification |
| Community onboarding | IMPLEMENTED | `/community`, `/how-to-order`, `/join`, admission review and invitation-ready handoff | Final client-owned brand/rule copy; Clerk invitation execution remains manual |
| Public Ready Stock | IMPLEMENTED | Published positive-stock queries, search/filter/sort, detail and empty states | `READY_STOCK_ORDER_RECORDING` policy |
| Secret Catalog | IMPLEMENTED | Hashed access codes, grants, private catalog views, canonical order submission | Rate-limit/expiry policy and runtime proof |
| Book Master | IMPLEMENTED | Publishers, books, variants, ISBN, prices, publication and Ready Stock state | Durable image upload; scale pagination |
| Customer orders | IMPLEMENTED | Owned order list/detail, immutable item snapshots, edit boundary, source tracking | Runtime authenticated QA |
| Batch PO and roster | IMPLEMENTED | Catalog links, item assignment, customer roster, purchase summary, lock and shipment history | Supplier costing/procurement automation |
| Fulfillment tracking | IMPLEMENTED | Customer/admin shipment and forward-only fulfillment timelines | Runtime realtime QA |
| Invoices and deposit | IMPLEMENTED | Issued invoice snapshots, append-only ledger, allocations, derived settlement | Final refund/deposit policy |
| Manual payment confirmation | IMPLEMENTED | Customer submission, admin review, preserved evidence metadata and audit | Durable proof storage/payment gateway intentionally absent |
| Defect and OOS | IMPLEMENTED | Item-level exception cases, partial quantity, review/resolution, history | Replacement/proof and supplier policy |
| Cancellation | IMPLEMENTED | Customer request, deterministic eligibility, admin review/cancellation and race guards | Final cancellation/post-PO policy |
| Refund obligation | PARTIAL | Auditable integer-IDR obligation derived without deleting payment/ledger history | Disbursement and settlement policy/implementation |
| Customer dashboard | IMPLEMENTED | `/account` needs-attention, orders, invoices, deposit, exceptions, refund due | Authenticated Production QA |
| Customer history | IMPLEMENTED | Bounded chronological projection from owned order, invoice, deposit and exception events | Additional event sources only when product need appears |
| Customer profile and addresses | IMPLEMENTED | Owned CRUD with default-address invariant | Runtime QA |
| Admin operational home | IMPLEMENTED | `/admin` actionable admission/order/batch/payment/exception/invoice queues | Global search and approved analytics |
| Admin customer operations | IMPLEMENTED | `/admin/customers` and detail reuse active accounts and admin-authorized domain queries | Deposit-wide customer view after a safe direct query is justified |
| Multi-admin | IMPLEMENTED | Admin/owner operational permissions and audited state transitions | Production concurrency evidence |
| Audit foundation | IMPLEMENTED | Security, operational, payment and exception audit events | Dedicated audit-log UI remains backlog |
| WhatsApp handoff | PARTIAL | Customer order/contact links and explicit communication boundary | Approved templates and semi-automatic per-customer sending |
| Content management | NOT STARTED | Public content is repository-owned | Admin content editor and approval model |
| Settings | NOT STARTED | Environment-owned configuration only | Approved settings scope and critical-setting permissions |
| Reporting foundation | PARTIAL | Canonical orders, batches, invoices, payments and exceptions support future reporting | Report definitions/UI |
| Excel export | NOT STARTED | No export endpoint or workbook generation | Post-V1 Reporting + Excel phase |
| Analytics | NOT STARTED | No invented metrics or tracking | Approved measures, privacy policy and implementation |

## Production V1 decision boundary

Reporting/Excel, Analytics, Content, and Settings do not block visual/product
convergence unless the client marks them launch-critical. No row is promoted to
implemented from mockup appearance alone.

The open policies in `context/OPEN_QUESTIONS.md` remain blocked by business
decision. Production readiness additionally requires verified Production Clerk
and canonical Convex/Vercel configuration.

## UI correction impact

No requirement changed status merely because its presentation was corrected.
Phase 01–06.4, dashboard/history, and admin customer operations remain
implemented and regression-tested. Reporting, Excel Export, Analytics, Content
Management, and Settings remain visible backlog. Authenticated screenshot QA is
blocked by the Clerk/canonical-Convex environment chain and is not represented
as completed product coverage.
