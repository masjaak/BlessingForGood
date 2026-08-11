# BFG Production Screenshot Review

Date: 2026-08-11
Source: optimized local Production build (`next start`), not a transient Preview.
Generated evidence lives under `artifacts/browser-qa/` and remains uncommitted.

## Home — desktop

Route: `/`
Viewport: 1440 × 900
Mockup/reference: original customer visual language + QA UX donor
Verdict: **PASS**

Correct:

- official logo is visible at useful scale;
- cream/green/editorial hierarchy matches BFG;
- Ready Stock, Secret Catalog, community, ordering and account paths are clear;
- mascot supports the ordering sequence without replacing product content.

Incorrect: none blocking.
Correction: none.

## Home — mobile

Route: `/`
Viewport: 390 × 844
Mockup/reference: customer mobile mockups + QA UX donor
Verdict: **PASS**

Correct:

- centered logo, compact menu and sign-in affordance;
- no fixed text-navigation overlap or horizontal overflow;
- hero, CTA, mascot and feature cards follow one mobile hierarchy.

Incorrect: none blocking.
Correction: none.

## Community

Route: `/community`
Viewport: 390 × 844, retested at 768 and 1440
Mockup/reference: customer community language
Verdict: **PASS**

Correct:

- branded welcome treatment and restrained mascot;
- clear community, catalog and journey explanation;
- post-audit overflow regression fixed by reusing the shared communication-card layout.

Incorrect: none blocking.
Correction: none.

## How to Order

Route: `/how-to-order`
Viewport: 390 × 844
Mockup/reference: original customer ordering flow
Verdict: **PASS**

Correct:

- current access, format, order, batch, invoice/payment and exception flow;
- compact numbered progression and helpful mascot guidance;
- no unresolved internal policy names or obsolete capability claims.

Incorrect: none blocking.
Correction: none.

## Ready Stock

Route: `/ready-stock`
Viewport: 390 × 844
Mockup/reference: mobile mockup 4 + QA UX Ready Stock
Verdict: **PASS**

Correct:

- server-backed search/sort shell retained;
- zero data is intentional, branded and uses the official mascot;
- no dummy books or engineering explanation.

Incorrect: a populated detail cannot be captured without Production data.
Correction: no seed added; real data will exercise the tested detail route.

## Secret Catalog

Route: `/catalog`
Viewport: 390 × 844
Mockup/reference: mobile mockups 1–3 + QA UX catalog access
Verdict: **PARTIAL**

Correct:

- signed-out ownership boundary redirects to a branded Clerk entry;
- official logo is visible; no admin setup or implementation detail leaks.

Incorrect:

- authenticated access-code, browse and order states could not be rendered because
  local Clerk credentials mismatch and canonical Convex provisioning does not complete.

Correction: configure one matching local/Production Clerk instance and restore access
to canonical Convex; do not substitute demo data or another project.

## Join Blessfriends

Route: `/join`
Viewport: 390 × 844
Mockup/reference: customer brand/form language
Verdict: **PASS**

Correct:

- complete Indonesian labels, hints, consent and CTA;
- validation boundary remains native/server-side;
- success state uses the official success mascot.

Incorrect: submitted state was not mutated against canonical data during visual QA.
Correction: covered by component/domain tests; no dummy request inserted.

## Account dashboard, orders and invoices

Routes: `/account`, `/account/orders`, `/account/invoices`
Viewport: 390 × 844
Mockup/reference: mobile mockups 5–8, extended dashboard/history
Verdict: **FAIL**

Correct:

- source retains owned dashboard/history, orders, invoices, deposit, exceptions and
  refund obligation projections;
- signed-out protection and branded Clerk entry render correctly.

Incorrect:

- authenticated route content cannot be accepted from source inspection alone.

Correction: fix the Clerk instance-key mismatch and canonical Convex access, then
capture customer states with a real invited test account.

## Admin home, books, orders, batch detail, payments and exceptions

Routes: `/admin`, `/admin/books`, `/admin/orders`, `/admin/batches/[batchId]`,
`/admin/payments`, `/admin/exceptions`
Viewport: 1440 × 900
Mockup/reference: original admin mockups 1–8
Verdict: **FAIL**

Correct:

- authenticated owner reaches the corrected compact logo/topbar shell;
- admin source uses the shared operational navigation, compact headings, tables,
  forms, queue cards and status hierarchy;
- authorization and financial operations remain unchanged and tested.

Incorrect:

- canonical provisioning remains at `Menyiapkan akun BFG…`, so queue/detail content
  and real batch detail cannot receive rendered approval.

Correction: use matching Clerk credentials and restore the current operator's access
to canonical Convex `content-snake-214`; do not select or create another project.

## Overall visual verdict

Public, mobile, brand, empty-state and responsive corrections pass. Authenticated
customer/admin visual acceptance is blocked by one environment chain: mismatched
Clerk credentials prevent canonical Convex provisioning and therefore the required
real rendered screenshots.
