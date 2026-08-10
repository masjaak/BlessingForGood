# BFG PRD Coverage Matrix

Status: Phase 06.3 source of truth

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
| Invoice/payment/Defect-OOS | PARTIAL | invoice lifecycle and manual payment confirmation implemented | Defect/OOS, refund/cancellation policy | later approved operations phase |
| Tracking integration | IMPLEMENTED | Batch roster reuses `currentShipmentStage` and `batchStatusHistory`; customer fulfillment remains separate | Integrated runtime QA | deferred to staging |
| Customer dashboard | PARTIAL | orders, invoices, profile, addresses, tracking | Unified dashboard/history polish | later product phase |
| Secret member catalogs | IMPLEMENTED | hashed codes, grants, private views, catalog items/orders | Rate limiting and expiry policy; runtime QA | security hardening + staging |
| Order/invoice reporting | PARTIAL | Operational admin lists and immutable snapshots | Formal report/export definitions | later reporting phase |
| Customer history | PARTIAL | Owned orders, invoices, payment, deposit, tracking history | Unified customer history screen | later product phase |
| Multi-admin | IMPLEMENTED | Admin/owner batch/order operations, roster assignment controls, join-request queue, server-side permissions, audit-backed transitions | Invitation/admin lifecycle runtime proof and staging concurrency evidence | identity lifecycle phase |
| Analytics | OUT OF SCOPE | No analytics dashboard or invented metrics | Approved measures and privacy policy | post-beta |

## Current priority

Continue product completion with the next highest-impact operations gap: defect/OOS, cancellation, and refund policy/workflow. Stable staging remains the integrated gate after feature-complete beta.
