# Blessing For Goods Source of Truth

Reconciled: 2026-08-14
Applies to: Phase 07.1 Product Surface Stabilization
Phase 08: not started

## Precedence

1. Latest explicit user/client decision
2. Original PRD
3. Approved business, security, and financial policies
4. Approved Admin and Customer mockups
5. Official brand assets
6. Canonical Convex schema/state
7. Current implementation
8. Previous reports
9. Agent inference

Implementation and prior PASS labels are evidence only. A feature is complete only when its source, reachable UI,
action, backend, state, authorization, cross-workspace consequence, tests, rendered result, and Production result agree.

## Canonical current requirements

- Clerk is identity only. Active `appUsers`, roles, permissions, admission state, and record ownership remain the BFG
  authorization boundary.
- Convex is canonical for books, variants, stock, catalogs/access, orders, batches/tracking, invoices/payments,
  deposits/refunds/exceptions, users, audit, notifications, Inbox messages, reports, content, and settings.
- Book Master supports publisher, title/description/categories, variants, unique ISBN, integer IDR price, publication
  status, durable cover upload/replace, Ready Stock inventory, and Secret Catalog assignment.
- Ready Stock is public-safe; order creation requires an admitted active customer. Availability is canonical
  `onHand - reserved` and order snapshots do not follow later catalog edits.
- Secret Catalog is locked and Admin-managed. Admin creates/edits/opens/closes catalogs, assigns/removes existing
  products, generates/copies/revokes expiring access codes, and grants/revokes member access.
- Orders, seven-state Batch PO/tracking, invoices, manual payment confirmation, deposit ledger/top-up verification,
  exceptions, and refunds retain the approved state and financial invariants.
- Admin and Customer authenticated shells expose event-backed Notifications and persistent operational Inbox
  messages with recipient ownership, unread/read state, and safe destinations.
- Included operational scope also covers order/invoice/batch recap and Excel-compatible export, minimum real
  sales/batch/period analytics, multi-Admin onboarding/RBAC, immutable activity visibility, and minimum content/
  payment settings management.

## Secret Catalog conflict resolution

- **Original PRD model:** authenticated BFG member plus an Admin-issued catalog access code; commercial scope also
  requires Admin grant/revoke per member.
- **Previous implementation model:** anonymous, catalog-scoped code/session access with Clerk explicitly not required.
- **Latest user/client requirement:** a visible, usable Admin flow must create/manage access; code generation is
  required when canonical, member grant/revoke is required when canonical, and backend-only controls are incomplete.
- **Final canonical model:** hybrid. A digest-only, expiring, revocable code creates an anonymous catalog-scoped
  browsing session. An authenticated active customer may also hold an explicit catalog grant; authenticated ownership
  is required for customer order/account consequences. Admin Access Management exposes both mechanisms. Plaintext is
  shown once and is never authoritative storage.
- **Superseded model:** anonymous code/session as the *only* access-management model is superseded. An
  authenticated-only model that removes scoped code browsing is also superseded. Existing secure session behavior is
  retained as one half of the hybrid contract.

## Notification and Inbox semantics

- Notification is an event-backed attention receipt: recipient, event type, safe title/body, destination/related
  entity, creation time, and `readAt`. It does not duplicate canonical financial or order state.
- Inbox is a persistent BFG operational message sourced from real submissions and workflow events. It is not social
  chat. No presence, typing, reactions, rooms, or arbitrary attachments are required.
- Customer A can never read Customer B's notifications or Inbox. Admin visibility follows BFG permissions.
- Access codes, secret digests, and credentials never appear in notification or Inbox bodies.

## Intentional exclusions

- WhatsApp Business API automation, unofficial WhatsApp automation, and automated blasts.
- Payment gateway or automatic bank settlement.
- Full realtime chat/presence/reactions.
- Fake analytics, fake notifications, and dummy Production business records.

Manual WhatsApp links/handoffs and manual bank-transfer review remain allowed where the approved flow uses them.

## Superseded decisions

- Prior completion reports and historical PASS labels are not completeness authority.
- A hidden route, backend mutation, or manually typed URL is not an active feature.
- Raw external cover URL as the only operator media workflow is superseded by durable validated upload.
- Fixture-only product/catalog proof is insufficient for Production acceptance.
- The older eight-card How To Order composition is superseded by the approved seven-step continuous journey.

## Known future backlog

- Advanced/vanity analytics beyond sales overview, batch performance, and period filter.
- Bulk catalog/order import until an approved mapping, validation, rollback, and duplicate policy exists.
- Multi-image gallery and external preview metadata until explicitly approved.
- Cross-domain global Admin search; route-level canonical search is current.

These backlog items do not supersede any included Phase 07.1 requirement listed above.
