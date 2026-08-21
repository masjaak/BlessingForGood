# BFG MAINTENANCE PLAYBOOK

Status: `ACTIVE — ENTERED AFTER PHASE 08 FINAL ACCEPTANCE`
Owner: BFG Owner/Admin with engineering support
Cadence: monthly, plus incident-driven review

Closure entry: 2026-08-21, application commit `ac5e33e`, supplied Vercel
Production `dpl_H5KPpMDmHtzFqZ44q9p7JHuPogsv` (`READY`), Convex Production
`clean-eel-522`, and user-controlled Customer Production PASS at
375/390/430/768/1440. This playbook is not a new feature backlog and does not
authorize Phase 09.

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
