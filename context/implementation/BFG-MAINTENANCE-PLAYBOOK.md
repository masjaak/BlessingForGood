# BFG MAINTENANCE PLAYBOOK

Status: `ACTIVE — SUPPORTING VISUAL / OPERATIONAL APPENDIX`
Owner: BFG Owner/Admin with engineering support
Cadence: monthly, plus incident-driven review

Canonical Phase 09 operating model:
[`BFG-PHASE-09-OPERATIONS.md`](BFG-PHASE-09-OPERATIONS.md). This playbook
retains the detailed visual contracts and remains subordinate to the canonical
security checklist, recovery playbook, technical-debt register, and monthly
report.

Historical closure entry: 2026-08-21, visual stabilization commit `b80f2e7`,
Vercel deployment `dpl_AJo6wHk3tQzFTdmqu6716cTDwYxx` (`READY`), Convex
Production `clean-eel-522`, and targeted visual suite evidence. The current
Phase 09 baseline is recorded in the canonical operations/report documents;
the public seed still has no stored cover, so cover mutation remains a
`GREEN_DETERMINISTIC_NO_SAFE_REAL_DATA` check with no fabricated asset or write.
This playbook is not a new feature backlog and does not authorize new Product
behavior.

## Permanent visual contracts

- How To Order is one seven-step journey: connected desktop timeline, vertical
  mobile/tablet timeline, shared semantic outline icon family, shared internal
  spacing, and zero body horizontal overflow.
- Perjalanan Bukumu is a compact grouped three-step orientation inside a
  narrower inner wrapper; the global page container remains unchanged.
- Mengenal BFG uses the canonical high-contrast primary section headline token;
  muted/card state colors must not leak into the primary heading.
- Book Cover preserves the original uploaded storage object. `{ zoom, x, y }`
  is optional non-destructive presentation metadata consumed by the shared
  customer renderer; legacy covers default safely and must never distort.

## Monthly Security

- Review Clerk/auth integration health, session errors, and suspended-user denial.
- Run a Clerk/auth regression for sign-in, session recovery, admission, and
  suspended-user denial.
- Review server authorization for Owner/Admin/customer boundaries and ownership isolation.
- Run Admin/Owner permission regression and customer ownership-isolation checks
  across orders, invoices, deposit, Batch, Activity, and Catalog access.
- Verify Secret Catalog access, rate limits, and customer non-leakage.
- Verify upload/media authorization, file validation, storage references, and
  sensitive environment exposure.
- Run dependency vulnerability review and record approved updates.
- Review financial mutation guards and unusual audit events.

## Operational Checks

- Review Vercel deployment health, error rates, and recent failed builds.
- Review Convex health, function errors, schema/codegen status, and storage usage.
- Review Production application errors and the Vercel/Convex health signals.
- Review backup/export provider status and perform a non-destructive recovery-readiness check.
- Confirm no raw credentials, access codes, or customer-identifying data entered logs or context documents.

## Financial and Domain Regression

- Run the critical authentication/admission, order, Batch, invoice, payment,
  deposit, refund, Secret Catalog, and Activity smoke paths.
- Run the critical business-flow smoke after each material deployment.
- Recheck integer IDR, invoice snapshots, append-only deposit history,
  payment review, no-overpayment, and refund-obligation invariants.
- Recheck Admin-to-customer consequences for publication, assignment,
  notification/message ownership, and settings/content projection.

## Responsive Smoke

- Customer: 375, 390, 430, 768, and 1440.
- Admin: 390, 430, 768, 834, 1024, 1280, and 1440 where supported.
- Check navigation reachability, Activity, forms, tables, touch targets,
  safe areas, and body horizontal overflow.
- Activity must remain one feed with no horizontal scrolling or clipped copy.

## Change Gate

Every change follows the current Development System V2 trace:

`source → visual → traceability → codebase memory → state/data model →
ponytail → TDD → rendered QA → real journey → regression → Production →
authenticated acceptance`.

Record each monthly review in the operational log. A genuine new business
requirement may create a future phase only after a new source contract and user
decision; routine maintenance does not.
