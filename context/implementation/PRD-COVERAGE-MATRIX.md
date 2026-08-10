# BFG PRD Coverage Matrix

Status: Phase 06.4 source of truth

The original product context pack is absent from the canonical repository. This matrix tracks the major requirements named in the Phase 06.2 assignment against repository evidence without inventing missing policy.

| Requirement | Status | Implementation evidence | Remaining gap | Recommended phase |
| --- | --- | --- | --- | --- |
| Foundation | IMPLEMENTED | Next.js, Convex schema/functions, design tokens, validation scripts | Stable runtime proof | staging gate after feature-complete beta |
| Authentication/access levels | IMPLEMENTED | Clerk provider/middleware, `appUsers`, centralized RBAC, suspension | Real Clerk invitation/JWT/runtime proof | identity lifecycle phase |
| Authentication onboarding | IMPLEMENTED | `/join`, `joinRequests`, approved-to-invitation handoff state, invite-only Clerk route | Manual Clerk invitation and accepted-account linking | identity lifecycle phase |
| Public landing/content | PARTIAL | `/`, `/community`, `/how-to-order`, `/help` | Final approved content/brand copy | later content phase |
| Ready Stock | IMPLEMENTED | `readyStockInventory`, public query, `/ready-stock`, detail route | Order-recording policy; runtime QA | decision phase + staging |
| Request Access / Join Group | IMPLEMENTED | `/join`, anonymous Convex submission, normalized duplicate guards, zero-data success state | Retention/privacy decision and runtime QA | identity lifecycle phase |
| Admin Approval / Admission | IMPLEMENTED | `/admin/join-requests`, admin/owner transitions, rejection reason, audit events, invitation-ready handoff | Clerk invitation acceptance and verified account linking | identity lifecycle phase |
| Book Master | IMPLEMENTED | books/variants/publishers, publication state, `/admin/books` | Durable cover upload; >200 pagination | later storage/scale phase |
| Batch PO | IMPLEMENTED | `convex/batches.ts`, `/admin/batches`, existing shipment timeline, catalog links, roster lock at `po_closed` | Supplier-specific PO/cost/cutoff automation | post-beta operations |
| Roster | IMPLEMENTED | `batchTracking.getForAdmin`, customer grouping, purchase summary, bounded unassigned queue, assign/unassign/move tests | Pagination/index upgrade after documented ceiling | scale phase |
| Manual Customer Operations | PARTIAL | `orders.createAssisted`, active existing-customer selector, `source=admin_assisted`, canonical pipeline and audit | Non-account customer policy is not approved; no fake identities | business decision / later identity phase |
| Admin Order Operations | IMPLEMENTED | `/admin/orders`, server-derived assisted order creation for existing active customers, admin source visibility | Broader assisted channels and Ready Stock order recording | later approved operations phase |
| Deposit | IMPLEMENTED | account projection, append-only ledger, allocations | Runtime QA; final correction/refund policy | staging + later finance policy |
| Invoice/payment exception handling | IMPLEMENTED | `orderExceptions`, append-only financial adjustments, derived invoice projection, preserved payment confirmations, and deposit allocation release | Cash refund execution and final financial policy | staging + business decision |
| Defect | IMPLEMENTED | Admin defect cases tied to canonical order items with quantity, reason, notes, review, resolution, audit, and customer-safe history | Replacement/proof workflow policy | business decision |
| Out of Stock | IMPLEMENTED | Admin OOS cases preserve original order items, block affected quantity, support partial quantity, and retain batch history | Supplier/procurement correction policy | staging + business decision |
| Cancellation | IMPLEMENTED | Customer request → admin review → resolution; admin cancellation requires reason, actor, audit, and financial reconciliation | Final cancellation eligibility and post-PO policy | business decision |
| Refund | PARTIAL | Integer-IDR refund/credit obligation is derived and recorded without payout or ledger deletion | Refund disbursement, deposit refund, settlement policy | business decision |
| Tracking integration | IMPLEMENTED | Batch roster reuses `currentShipmentStage` and `batchStatusHistory`; customer fulfillment remains separate | Integrated runtime QA | deferred to staging |
| Customer dashboard | PARTIAL | orders, invoices, profile, addresses, tracking, and order exception visibility | Unified dashboard/history polish | Phase 06.5 |
| Secret member catalogs | IMPLEMENTED | hashed codes, grants, private views, catalog items/orders | Rate limiting and expiry policy; runtime QA | security hardening + staging |
| Order operations | IMPLEMENTED | Item-level exception queue/detail integration, server-owned cancellation eligibility, batch/fulfillment guards | Runtime concurrency and final policy QA | staging + business decision |
| Order/invoice reporting | PARTIAL | Operational exception queue and immutable financial adjustment records support future counts/impact | Formal report/export definitions | Phase 06.6 |
| Customer history foundation | IMPLEMENTED | Customer-owned exception queries and safe order-detail history; internal notes/actors excluded | Unified cross-domain history screen | Phase 06.5 |
| Multi-admin | IMPLEMENTED | Admin/owner batch/order operations, roster assignment controls, join-request queue, server-side permissions, audit-backed transitions | Invitation/admin lifecycle runtime proof and staging concurrency evidence | identity lifecycle phase |
| Analytics | NOT STARTED | No analytics dashboard or invented metrics | Approved measures and privacy policy | post-beta |

## Current priority

Continue product completion with Phase 06.5 customer dashboard and unified customer history. Stable staging remains the integrated gate after feature-complete beta.

## Phase 06.4 policy boundary

The exception workflow records operational facts, approvals, append-only
financial adjustments, deposit releases, and refund obligations. It does not
choose cancellation eligibility policy, execute cash/bank/gateway payouts,
withdraw deposit cash, issue store credit, execute replacements, or create
Ready Stock orders. Those rows remain `BLOCKED BY DECISION` or `PARTIAL` until
the corresponding business policy is approved.
