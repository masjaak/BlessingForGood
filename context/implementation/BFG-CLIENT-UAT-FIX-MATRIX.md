# BFG Client UAT Fix Matrix — Phase 08 Final Closure

This is the canonical reconciliation of the original Client UAT findings. It
uses the user-supplied 01–17 grouping, keeps previously proven green behavior
frozen, and records implementation evidence separately from deterministic,
authenticated Production, and client-recheck evidence.

The 2026-08-21 final Production acceptance supersedes the previous generic
`RED=0 / YELLOW=0 / UNKNOWN=0` closure for Admin action spacing. The historical
finding narratives below remain useful evidence, but the correction-pass table
below is authoritative for current status.

Final status vocabulary is limited to `GREEN_REAL_PRODUCTION`,
`GREEN_DETERMINISTIC_NO_SAFE_REAL_DATA`, `BLOCKED_BY_APPROVED_DATA`,
`BLOCKED_BY_OPERATIONAL_DATA`, `DEFERRED_BY_USER_DATA`, `OPTIONAL_FUTURE`, and
`EXCLUDED`. The deterministic evidence column may use the shorter
`GREEN_DETERMINISTIC` test label; the Client Recheck column uses only the final
classifications. No implementation defect remains open.

## Maintenance correction recheck — 2026-08-24

The current integrated release is `f0eddc82`, deployed to Convex Production
`clean-eel-522` and Vercel Production. The five maintenance corrections and
commerce contract have deterministic coverage; the read-only Production shell
and signed-out Admin boundary passed serial browser checks. No authorized
Clerk session or safe live business record was available for authenticated
mutation/recheck, so the qualified classifications below are intentional.

| Contract | Implementation / deterministic evidence | Current Production classification |
| --- | --- | --- |
| Order → Invoice | State-driven CTA, existing Finance path, issue guard, and idempotency tests pass. | `GREEN_DETERMINISTIC_NO_SAFE_REAL_DATA` — deployed; no legitimate authenticated no-invoice order was available. |
| Activity unread/read | One ActivityCenter with semantic unread marker and responsive geometry; populated fixture passes all eight viewports. | `GREEN_DETERMINISTIC_NO_SAFE_REAL_DATA` — signed-out route and geometry pass; real populated authenticated feed not rechecked. |
| Conditional actions / ActionGroup | One shared ActionGroup owns spacing, hierarchy layout, loading, and responsive behavior; source audit has zero raw buttons outside the primitive. | `GREEN_DETERMINISTIC_NO_SAFE_REAL_DATA` — deployed; authenticated state matrix remains qualified. |
| Human invoice references | `BFG-INV-YYMMDD-XXXX`, concurrency, state guard, preview, bounded backfill, financial-field preservation, and idempotent rerun tests pass. | `GREEN_DETERMINISTIC_NO_SAFE_REAL_DATA` — deployed; Production preview returned `IDENTITY_REQUIRED`; backfill not run. |
| Master Book Save / Publish | Save persistence, success/error feedback, Draft preservation, and explicit Publish tests pass. | `GREEN_DETERMINISTIC_NO_SAFE_REAL_DATA` — deployed; no safe authenticated Draft mutation was available. |
| Ready Stock / Secret Catalog / Batch | Direct stock reservation, private multi-Publisher Catalog, shared-close-date Batch, assignment/Summary/lock, and access-isolation tests pass. | `GREEN_DETERMINISTIC_NO_SAFE_REAL_DATA` — no real mutation or fabricated data. |

## Correction-pass evidence matrix — 2026-08-21

| Finding | Implementation | Deterministic | Authenticated Production | Client Recheck |
|---|---|---|---|---|
| 01 Content purpose | `PRESERVED` | `GREEN_DETERMINISTIC` | `GREEN_REAL_PRODUCTION` — existing authenticated Admin evidence | `GREEN_REAL_PRODUCTION` |
| 02 Cover full visibility | `PRESERVED` | `GREEN_DETERMINISTIC` | `GREEN_REAL_PRODUCTION` — existing authenticated evidence | `GREEN_REAL_PRODUCTION` |
| 03 Catalog count | `PRESERVED` | `GREEN_DETERMINISTIC` | `GREEN_REAL_PRODUCTION` — existing authenticated evidence | `GREEN_REAL_PRODUCTION` |
| 04 Invoice cancellation | `GREEN` — server/UI guard preserved | `GREEN_DETERMINISTIC` | `GREEN_DETERMINISTIC_NO_SAFE_REAL_DATA` — settled denial is green; no eligible live cancellation was safe | `GREEN_DETERMINISTIC_NO_SAFE_REAL_DATA` |
| 05 Deposit allocation | `GREEN` — bounded form/mutation preserved | `GREEN_DETERMINISTIC` | `GREEN_DETERMINISTIC_NO_SAFE_REAL_DATA` — zero-balance denial is green; no eligible live pair was safe | `GREEN_DETERMINISTIC_NO_SAFE_REAL_DATA` |
| 06 Invoice owner | `PRESERVED` | `GREEN_DETERMINISTIC` | `GREEN_REAL_PRODUCTION` — existing authenticated evidence | `GREEN_REAL_PRODUCTION` |
| 07 Batch ↔ Catalog | `GREEN` — existing relation controls preserved | `GREEN_DETERMINISTIC` | `BLOCKED_BY_OPERATIONAL_DATA` — only discovered real Batch 5 is locked | `BLOCKED_BY_OPERATIONAL_DATA` |
| 08 Slide background | `PRESERVED` | `GREEN_DETERMINISTIC` | `GREEN_REAL_PRODUCTION` — existing rendered evidence | `GREEN_REAL_PRODUCTION` |
| 09 BFGSelect anchor | `PRESERVED` + collision regression | `GREEN_DETERMINISTIC` | `GREEN_REAL_PRODUCTION` — existing authenticated/rendered evidence | `GREEN_REAL_PRODUCTION` |
| 10 Batch targeting/assignment/Summary | `PRESERVED` — existing controls and derived summary traced | `GREEN_DETERMINISTIC` | `BLOCKED_BY_OPERATIONAL_DATA` — only discovered real Batch is locked | `BLOCKED_BY_OPERATIONAL_DATA` |
| 11 Human-facing order reference | `PRESERVED` | `GREEN_DETERMINISTIC` | `GREEN_REAL_PRODUCTION` — existing authenticated evidence | `GREEN_REAL_PRODUCTION` |
| 12 Activity semantics + responsive geometry | `FIXED` — one chronological projection over separate Notification/Inbox sources; viewport-safe panel, wrapping, and no panel/feed/item horizontal overflow | `GREEN_DETERMINISTIC_NO_SAFE_REAL_DATA` — unit and rendered matrix pass at 375/390/430/768/834/1024/1280/1440 | `GREEN_REAL_PRODUCTION` — user-controlled Customer Production pass at 375/390/430/768/1440; `dpl_H5KPpMDmHtzFqZ44q9p7JHuPogsv` remains the supplied READY deployment | `GREEN_REAL_PRODUCTION` |
| 13 Responsive Admin navigation | `PRESERVED` — one scroll container/source | `GREEN_DETERMINISTIC` | `GREEN_REAL_PRODUCTION` — existing authenticated Admin navigation evidence | `GREEN_REAL_PRODUCTION` |
| 14 Settings expansion | `PRESERVED` — consumed fields already exist | `GREEN_DETERMINISTIC` | `GREEN_DETERMINISTIC_NO_SAFE_REAL_DATA` — form is green; no approved values were supplied for a safe save | `GREEN_DETERMINISTIC_NO_SAFE_REAL_DATA` |
| 15 Catalog left frame | `PRESERVED` — intrinsic height frozen | `GREEN_DETERMINISTIC` | `GREEN_REAL_PRODUCTION` — existing authenticated evidence | `GREEN_REAL_PRODUCTION` |
| 16 Admin action spacing | `FIXED` — shared semantic action region/stack/support tokens | `GREEN_DETERMINISTIC` — component composition + CSS source | `GREEN_REAL_PRODUCTION` — existing authenticated 1440px evidence | `GREEN_REAL_PRODUCTION` |
| 17 Master Buku alignment | `PRESERVED` — CoverUploadField unchanged | `GREEN_DETERMINISTIC` | `GREEN_REAL_PRODUCTION` — existing authenticated Maisy's Funfair evidence | `GREEN_REAL_PRODUCTION` |
| Homepage section rhythm | `PRESERVED` | `GREEN_DETERMINISTIC` | `GREEN_REAL_PRODUCTION` — existing rendered evidence | `GREEN_REAL_PRODUCTION` |

`BLOCKED_BY_APPROVED_DATA` and `BLOCKED_BY_OPERATIONAL_DATA` mean the safe
implementation exists but no legitimate approved asset/value or editable live
record is available for mutation; no record is fabricated.

## 01 — Admin Konten purpose / clarity

- **Finding:** Admin did not explain what `Konten` is for.
- **Classification:** PRODUCT_CLARITY.
- **Source:** Latest Client UAT; `PRD-CLIENT-AMENDMENTS-2026-08-19.md`; Content contract.
- **Current Production Evidence:** Authenticated Admin baseline shows `/admin/content` with the purpose copy and the three controlled public surfaces.
- **Expected Behavior:** Explain what BFG controls, where it appears, and what belongs in `Pengaturan` instead.
- **Root Cause:** The existing bounded editor needed a direct purpose explanation; it did not need CMS expansion.
- **Affected Route:** `/admin/content`, `/community`, `/how-to-order`, `/help`.
- **Affected Domain:** Public content.
- **State Machine Impact:** None; draft/save/publish semantics remain canonical.
- **Fix:** Preserve the bounded explanation: Content controls customer-facing Community, How To Order, and Help copy; it is not a CMS or operational settings store.
- **Regression:** Content route/render coverage plus full TypeScript, lint, format, and build gates.
- **Production Evidence:** Authenticated Admin `/admin/content` visibly explains purpose, surfaces, and non-goals.
- **Status:** `GREEN`.

## 02 — Book cover full visibility

- **Finding:** Book cover artwork could appear cropped.
- **Classification:** VISUAL_BUG.
- **Source:** Latest Client UAT; shared cover/media visual contract.
- **Current Production Evidence:** Authenticated Admin and customer Ready Stock baseline show the full cover inside the shared frame.
- **Expected Behavior:** The complete cover remains visible without distortion at supported widths.
- **Root Cause:** The shared image needed explicit containment sizing; `object-fit` alone did not constrain intrinsic image dimensions.
- **Affected Route:** `/admin/books/[bookId]`, `/catalog`, Ready Stock/customer book cards.
- **Affected Domain:** Book media.
- **State Machine Impact:** None.
- **Fix:** Keep the existing shared `BookCover` containment correction; do not reopen the cover backend.
- **Regression:** Cover rendered checks and responsive Production route checks.
- **Production Evidence:** Existing authenticated preview geometry remains contained; rendered suite remains green.
- **Status:** `GREEN` — PRESERVED.

## 03 — Catalog distinct-title count

- **Finding:** A Catalog card could show `1 JUDUL` while the Catalog contained two books.
- **Classification:** FUNCTIONAL_BUG.
- **Source:** Latest Client UAT; Catalog projection contract.
- **Current Production Evidence:** The current Admin projection reads the server-projected `titleCount`, not the number of rendered format rows.
- **Expected Behavior:** `X JUDUL` equals the count of distinct Book Master titles.
- **Root Cause:** The historical display path risked counting variants/rendered rows instead of the canonical Book Master projection.
- **Affected Route:** `/admin/catalogs`.
- **Affected Domain:** Secret Catalog → Book Master → Book Variant projection.
- **State Machine Impact:** None; catalog availability and ordering remain unchanged.
- **Fix:** Preserve `getCatalogView().titleCount`, derived from distinct Book Master records keyed by book ID; the card consumes that projection.
- **Regression:** One Book Master with two formats → `1`; two Book Masters → `2`; two Book Masters with multiple formats → `2` in `convex/product-publishing.test.ts`.
- **Production Evidence:** Current Production Admin Catalog uses the canonical title projection; no row-count workaround or dummy Catalog was created.
- **Status:** `GREEN`.

## 04 — Invoice cancellation / Batalkan invoice

- **Finding:** The settled-invoice denial was proven, but the valid cancellable/voidable path was not fully demonstrated to the client.
- **Classification:** STATE_MACHINE_BUG / PARTIAL_ACCEPTANCE.
- **Source:** Latest Client UAT; invoice state and financial invariants.
- **Current Production Evidence:** Authenticated Production settled/verified invoice shows `Batalkan invoice` disabled with the release/reversal explanation.
- **Expected Behavior:** A valid draft/issued invoice can execute the canonical void action; settled, unresolved-payment, duplicate, and unauthorized attempts are denied safely.
- **Root Cause:** The UI only explained settled financial guards and did not explain unresolved payment confirmations; valid and invalid state coverage needed one explicit closure matrix.
- **Affected Route:** `/admin/invoices/[invoiceId]`.
- **Affected Domain:** Invoice, payment confirmation, deposit allocation, order snapshot, audit.
- **State Machine Impact:** `draft`/`issued` → `void` only through `voidInvoice`; settled or unresolved payment states remain blocked.
- **Fix:** Preserve the server-authoritative `voidInvoice` mutation and add the missing UI reason for unresolved payment review. No status shortcut, deletion, or payment-history rewrite was added.
- **Regression:** `convex/invoices.test.ts` covers valid void, settled/allocated/verified denial, unresolved `payment_submitted` denial, double void, unauthorized access, and snapshot preservation.
- **Production Evidence:** Current authenticated Production surface proves the settled denial and canonical reason; deterministic Development state proof proves the safe valid issued path without creating a dummy live invoice.
- **Status:** `GREEN`.

## 05 — Alokasikan sisa deposit

- **Finding:** `Alokasikan sisa deposit` could be unavailable or submit an empty amount after credit became available.
- **Classification:** FUNCTIONAL_BUG.
- **Source:** Latest Client UAT; append-only deposit ledger and invoice allocation contract.
- **Current Production Evidence:** Authenticated Production zero-balance invoice shows the action disabled with an explicit insufficient-balance explanation.
- **Expected Behavior:** With available deposit and an eligible invoice, the action is enabled and defaults to the bounded allocatable amount; zero, settled/void, over-allocation, and repeat cases remain safe.
- **Root Cause:** The form initialized from an empty `available` snapshot and did not rehydrate its amount when the account projection changed after `recordCredit`.
- **Affected Route:** `/admin/invoices/[invoiceId]`.
- **Affected Domain:** Deposit account, append-only ledger, invoice allocation projection.
- **State Machine Impact:** Allocation remains explicit, integer-IDR, invoice-eligible, and server-authorized.
- **Fix:** Rehydrate the form amount from `min(outstanding, available)` when the canonical account projection changes; retain all server guards and disabled explanation.
- **Regression:** Component test covers zero → available rerender and successful allocation; Convex deposit tests cover eligible allocation, zero balance, over-allocation, repeat safety, release, and void denial.
- **Production Evidence:** Current authenticated Production zero-balance surface proves the disabled explanation; deterministic Development state proof proves the successful allocation path without mutating a live account.
- **Status:** `GREEN`.

## 06 — Invoice owner visibility

- **Finding:** Invoice owner/customer recognition was unclear.
- **Classification:** PRODUCT_AMENDMENT.
- **Source:** Latest Client UAT; invoice owner/reference decision.
- **Current Production Evidence:** Authenticated Production invoice list/detail shows customer identity and human order reference.
- **Expected Behavior:** Admin can recognize the customer and order without reading internal IDs.
- **Root Cause:** Historical invoice surface exposed too much internal identity and too little operational context.
- **Affected Route:** Admin invoice list/detail and customer invoice surface.
- **Affected Domain:** Invoice/orders.
- **State Machine Impact:** None.
- **Fix:** Preserve customer name, invoice number, and stable BFG order reference projection.
- **Regression:** Invoice projection and authenticated surface checks.
- **Production Evidence:** Customer identity and BFG-friendly reference are visible in the current baseline.
- **Status:** `GREEN` — PRESERVED.

## 07 — Batch ↔ Catalog add, multiple, and unlink

- **Finding:** Adding a Catalog became unavailable when multiple Catalogs existed, and unlinking was unclear/unavailable.
- **Classification:** FUNCTIONAL_BUG.
- **Source:** Latest Client UAT; Batch/Catalog relationship contract.
- **Current Production Evidence:** Existing authenticated Batch baseline shows linked Catalogs, the add control, and relation-only unlink controls.
- **Expected Behavior:** Link zero, one, or multiple eligible Catalogs; reject duplicate links; unlink only the relation while preserving Batch and Catalog.
- **Root Cause:** The many-to-many relationship already existed but lacked explicit multi-link/unlink acceptance and clear UI semantics.
- **Affected Route:** `/admin/batches/[batchId]`.
- **Affected Domain:** `catalogBatchLinks`, Batch lifecycle, Catalog eligibility.
- **State Machine Impact:** Link/unlink is allowed only while the Batch is editable; locked Batch denies relationship mutation.
- **Fix:** Preserve the existing canonical link/unlink mutations and expose the eligible unlinked Catalog selection and relation-only action; no entity deletion was added.
- **Regression:** `convex/batchRoster.test.ts` covers 0/1/2+ links, duplicate denial, unlink, re-link, active-assignment guard, and locked denial.
- **Production Evidence:** Existing Production Batch surface shows multiple linked Catalog support and the correct lock guard; deterministic relationship tests preserve both entities.
- **Status:** `GREEN`.

## 08 — Homepage slide background swap

- **Finding:** The approved green background assignment between slide 1 and slide 3 needed to be reflected.
- **Classification:** CLIENT_VISUAL_DECISION.
- **Source:** Latest explicit Client UAT visual decision; `BFG-DEC-038`.
- **Current Production Evidence:** Canonical Production rendered checks confirm the intended slide 1/slide 3 background assignment differs as approved.
- **Expected Behavior:** Swap only the background treatment; preserve slide order, copy, layout, and animation.
- **Root Cause:** Style assignment did not match the locked client decision.
- **Affected Route:** `/`.
- **Affected Domain:** Homepage visual surface.
- **State Machine Impact:** None.
- **Fix:** Preserve the narrow slide background swap already present; no copy/order/layout/animation changes.
- **Regression:** `tests/e2e/phase071-surface.spec.ts` checks the two story-card backgrounds and the Homepage rhythm.
- **Production Evidence:** Production rendered suite passes the background and rhythm checks.
- **Status:** `GREEN`.

## 09 — BFGSelect menu anchor

- **Finding:** Some custom dropdowns jumped upward or appeared detached from their trigger.
- **Classification:** VISUAL_BUG.
- **Source:** Latest Client UAT; BFGSelect positioning contract.
- **Current Production Evidence:** Canonical Production rendered checks show the menu aligned to the trigger after scroll/viewport measurement.
- **Expected Behavior:** Open directly below by default; flip above only for actual viewport collision; preserve keyboard, focus, ARIA, and portal behavior.
- **Root Cause:** Positioning used the wrong side’s available height when choosing the menu side.
- **Affected Route:** Admin filters, Catalog, Book Detail, and long-page selects.
- **Affected Domain:** Shared `BFGSelect` UI.
- **State Machine Impact:** None.
- **Fix:** Preserve shared rect-based fixed positioning, chosen-side height calculation, collision-only flip, and scroll/resize recalculation.
- **Regression:** BFGSelect component geometry tests plus Production rendered viewport checks at customer/Admin supported widths.
- **Production Evidence:** Rendered Production suite passes trigger anchoring and no native-select fallback.
- **Status:** `GREEN`.

## 10 — Batch PO operational completeness

- **Finding:** Batch customer targeting, roster editing, item assignment, quantity editing, lock behavior, and Purchase Summary were not understandable as one operational workflow.
- **Classification:** PRODUCT_AMENDMENT / FUNCTIONAL_BUG.
- **Source:** Latest Client UAT; Batch PO roster contract; `BFG-DEC-036`.
- **Current Production Evidence:** Authenticated Production Batch surface explains targeting through eligible order items, shows roster/assignment controls, and identifies the locked state.
- **Expected Behavior:** Admin targets eligible active Blessfriends, assigns items and quantities before lock, removes/changes them before lock, and receives an automatic purchase aggregation.
- **Root Cause:** The canonical assignment model existed but the Admin surface did not make the complete workflow explicit.
- **Affected Route:** `/admin/batches/[batchId]`, related Admin order operations.
- **Affected Domain:** Batch, submitted order items, roster assignments, Catalog links, shipment lifecycle.
- **State Machine Impact:** `editable` permits add/change/remove/move; `po_closed` and later stages deny editing server-side.
- **Fix:** Preserve the canonical roster/assignment model and expose the existing targeting queue, inline quantity update, remove/move controls, lock explanation, and derived Purchase Summary. No second roster or editable summary source was created.
- **Regression:** `convex/batchRoster.test.ts` covers eligible customer targeting, duplicate safety, item add, quantity change, remove, customer removal, summary updates, unauthorized denial, and locked denial.
- **Production Evidence:** Authenticated Production Batch journey is present; deterministic Development tests prove all state transitions without creating dummy Production participants.
- **Status:** `GREEN`.

## 11 — Human-facing order reference

- **Finding:** Internal order IDs were not suitable for people.
- **Classification:** PRODUCT_AMENDMENT.
- **Source:** Latest Client UAT; order-reference decision.
- **Current Production Evidence:** Existing authenticated Production surfaces show stable BFG order references; three legitimate legacy records were safely backfilled in the previous pass.
- **Expected Behavior:** People see a stable BFG-friendly reference while internal Convex IDs remain machine-only.
- **Root Cause:** Historical records lacked a persisted display code.
- **Affected Route:** Admin/customer order, invoice, and activity surfaces.
- **Affected Domain:** Orders/invoices/activity.
- **State Machine Impact:** None; reference generation does not change order lifecycle.
- **Fix:** Preserve the server-generated persisted display code and safe legacy backfill.
- **Regression:** Stability, uniqueness, and backfill tests.
- **Production Evidence:** Current Production shows BFG order references for existing legitimate records.
- **Status:** `GREEN` — PRESERVED.

## 12 — Aktivitas / Notifikasi / Kotak Masuk clarity

- **Finding:** The Activity information architecture was unclear.
- **Classification:** PRODUCT_CLARITY.
- **Source:** Latest Client UAT; Activity decision; Notifications and Inbox contracts.
- **Current Production Evidence:** The corrected build is deployed in supplied READY deployment `dpl_H5KPpMDmHtzFqZ44q9p7JHuPogsv`; the user-controlled authenticated Customer walkthrough passed at 375/390/430/768/1440 with one feed and no clipping or horizontal overflow.
- **Expected Behavior:** `Aktivitas` is one newest-first feed; `Sistem` describes automatic system/state events; `Pesan BFG` describes persistent operational messages. Users do not choose a category before reading activity.
- **Root Cause:** A combination of an intrinsic implicit grid track in the nested `.content-stack`, missing `min-width: 0` on shrinkable descendants, and anchor-only positioning that did not measure right-side collision. A narrow fixed panel could also inherit an unsafe containing block from the header's visual effects. The old `overflow-x: hidden` rule masked the child/card width instead of fixing it.
- **Affected Route:** Customer/Admin shell Activity entry and activity surfaces.
- **Affected Domain:** Notifications and Inbox remain separate.
- **State Machine Impact:** None; event/message ownership and read semantics remain separate.
- **Fix:** Keep the unified projection and read semantics; calculate panel width/position/max-height from the actual visual viewport on open, resize, scroll, viewport change, and anchor resize. Use a bounded 380px panel with safe gutters, collision shifting, internal vertical scroll, `minmax(0, 1fr)`, `min-width: 0`, and normal safe wrapping. No Activity copy, item, reference, or action was removed.
- **Regression:** Activity projection/domain tests, component geometry tests, populated rendered matrix, Playwright `202/202`, Vitest `232/232`, and the user-controlled authenticated Customer Production recheck.
- **Production Evidence:** `dpl_H5KPpMDmHtzFqZ44q9p7JHuPogsv` is supplied as READY; the populated Activity matrix passes and Customer acceptance is recorded as user-supplied real-session evidence.
- **Status:** `GREEN_REAL_PRODUCTION` — fixed, deployed, and accepted.

## 13 — Responsive Admin navigation

- **Finding:** `Pengguna`, `Log aktivitas`, and `Pengaturan` could be cut off on iPhone/iPad.
- **Classification:** RESPONSIVE_BUG.
- **Source:** Latest Client UAT; Admin navigation contract.
- **Current Production Evidence:** Authenticated Production Admin nav uses one scrollable navigation source and contains all three System routes; local rendered checks cover phone/tablet/desktop shell widths.
- **Expected Behavior:** All authorized routes remain reachable at 390, 430, 768, 820/834, 1024, 1280, and 1440 widths without a body-scroll trap.
- **Root Cause:** The prior navigation presentation allowed later groups to fall outside the viewport.
- **Affected Route:** All `/admin/*` routes, especially System routes.
- **Affected Domain:** Admin shell/navigation.
- **State Machine Impact:** None; route authorization remains unchanged.
- **Fix:** Preserve one `AdminNav.groups` source with a bounded vertical scroll container on narrow/tablet layouts and the same route entries on desktop.
- **Regression:** Responsive navigation source/render checks, local Playwright projects at 390/430/768/1024/1280/1440, and authenticated Production nav reachability evidence.
- **Production Evidence:** Current authenticated Production nav is independently scrollable and exposes Pengguna, Log aktivitas, and Pengaturan; no second route list exists.
- **Status:** `GREEN`.

## 14 — Settings expansion

- **Finding:** Settings was too thin for operational use.
- **Classification:** PRODUCT_AMENDMENT.
- **Source:** Latest Client UAT; bounded Settings decision.
- **Current Production Evidence:** Authenticated Production Settings shows store identity, WhatsApp, consumed support/contact fields, and manual-payment bank fields.
- **Expected Behavior:** Settings contains only bounded operational configuration with a real consumer; secrets and financial state controls stay out.
- **Root Cause:** The previous surface exposed only the smallest initial fields.
- **Affected Route:** `/admin/settings` and customer invoice payment information.
- **Affected Domain:** Settings/manual payment.
- **State Machine Impact:** None; Admin/Owner authorization and validation remain enforced, with future ownership-critical settings separately guarded.
- **Fix:** Preserve additive, backward-safe fields with fallbacks and customer payment-panel consumption; no dead settings or credentials.
- **Regression:** `convex/settings.test.ts` covers Admin/Owner operational writes, validation, persistence, and customer-safe projection.
- **Production Evidence:** Current authenticated Production Settings and customer payment panel consume the bounded configuration.
- **Status:** `GREEN`.

## 15 — Catalog creation frame height

- **Finding:** The left Create Catalog frame stretched to the height of the right Catalog list.
- **Classification:** VISUAL_BUG.
- **Source:** Latest Client UAT; Catalog layout contract.
- **Current Production Evidence:** Authenticated Production Catalog grid uses intrinsic left-frame height and independent right-list flow.
- **Expected Behavior:** Counts 0, 1, 3, and 10+ do not change the left form height.
- **Root Cause:** Grid cross-axis stretch behavior.
- **Affected Route:** `/admin/catalogs`.
- **Affected Domain:** Admin Catalog layout.
- **State Machine Impact:** None.
- **Fix:** Preserve scoped `align-items: start`; no fixed height, max-height, or page-specific magic number.
- **Regression:** Responsive rendered Catalog checks across empty/small/large list states.
- **Production Evidence:** Current Production layout reports start alignment and no right-list stretch on the left creation frame.
- **Status:** `GREEN`.

## 16 — Admin action spacing

- **Finding:** Divider/action spacing needed responsive completion; 1440px was already green.
- **Classification:** VISUAL_BUG / RESPONSIVE_ACCEPTANCE.
- **Source:** Latest Client UAT; shared spacing contract.
- **Current Production Evidence:** Authenticated 1440px baseline is green; current shared token is used by Invoices, Orders, Catalog, Books, and Batch rather than page-specific hacks.
- **Expected Behavior:** At 1024, 1280, and 1440, button-to-divider, button-to-border, adjacent-button, and content-to-action spacing remains intentional.
- **Root Cause:** Shared summary/action spacing previously needed one semantic token and responsive verification.
- **Affected Route:** Representative Admin Invoices, Orders, Catalog, Books, and Batch surfaces.
- **Affected Domain:** Shared Admin layout/spacing.
- **State Machine Impact:** None.
- **Fix:** Preserve the shared spacing token and existing 1440 correction; verify 1024/1280 without reopening green 1440 work.
- **Regression:** Local rendered Playwright checks at Admin 1024/1280/1440 plus full route smoke.
- **Production Evidence:** Current Production retains the authenticated 1440 baseline and the same shared CSS path for 1024/1280; no page-specific margin hacks were introduced.
- **Status:** `GREEN` — 1440 PRESERVED.

## 17 — Master Buku cover/upload alignment

- **Finding:** Cover preview, label, upload copy, filename state, and actions did not align consistently.
- **Classification:** VISUAL_BUG.
- **Source:** Latest Client UAT; Master Buku visual contract.
- **Current Production Evidence:** Authenticated Production Book Detail shows aligned preview/content columns and reachable upload controls.
- **Expected Behavior:** Desktop uses a clear shared media grid at 1024/1280/1440; narrower Admin/tablet widths stack preview above upload content.
- **Root Cause:** Cover controls needed shared grouping/alignment rather than isolated offsets.
- **Affected Route:** `/admin/books/[bookId]`.
- **Affected Domain:** Book Master media UI.
- **State Machine Impact:** None; cover storage/backend contract is unchanged.
- **Fix:** Preserve the shared `CoverUploadField` grid and responsive stack; no negative margins or cover backend changes.
- **Regression:** Cover rendered geometry and responsive route checks.
- **Production Evidence:** Current authenticated Production preview and upload controls remain aligned and unclipped.
- **Status:** `GREEN`.

## Preserved Homepage section rhythm

- **Finding:** Homepage section rhythm was already green.
- **Classification:** PRESERVED_REGRESSION_GUARD.
- **Source:** Latest Client UAT baseline.
- **Current Production Evidence:** Canonical Production rendered checks remain green.
- **Expected Behavior:** Keep the existing section rhythm.
- **Root Cause:** None in this closure pass.
- **Affected Route:** `/`.
- **Affected Domain:** Homepage layout.
- **State Machine Impact:** None.
- **Fix:** None; frozen.
- **Regression:** Homepage rendered rhythm check.
- **Production Evidence:** Production rendered suite remains green.
- **Status:** `GREEN` — PRESERVED.

## Closure rule

Product Media V1 is implemented under its locked Book Master ownership and
HTTPS metadata-only source contract; empty state and implementation are green,
while populated Gallery/Preview UAT is `BLOCKED_BY_APPROVED_DATA`. Bulk Import
V1 remains deployed and unchanged; its Production pilot remains
`DEFERRED_BY_USER_DATA` and does not justify fabricating Products or business
records. Phase 08 is closed and the product is in Maintenance. The current
canonical deployment is recorded in the 2026-08-24 reconciliation above.

## Maintenance/UAT correction pass — 2026-08-22

The latest real authenticated Admin evidence is authoritative and supersedes
the earlier green labels for these five findings. The implementation rows are
local code/test evidence; the canonical deployment is verified, while
authenticated record-specific rows remain qualified without an operator
session or safe live record.

| Finding | Root-cause fix | Local deterministic evidence | Production status |
| --- | --- | --- | --- |
| New Order → Invoice CTA | Order detail projects the canonical invoice query and links the existing Finance create/issue flow when no invoice exists. | `getForOrderAdmin`, invoice queue component test, full Convex suite. | `DEPLOYED; GREEN_DETERMINISTIC_NO_SAFE_REAL_DATA — no authenticated no-invoice order available` |
| Activity unread clarity | Shared `ActivityCenter` adds soft BFG tint, accent treatment, dot, `Baru`, stronger title, and `Belum dibaca`; read state remains backend `readAt`. | Shared component test, notification projection trace, and eight-viewport populated geometry fixture. | `DEPLOYED; GREEN_DETERMINISTIC_NO_SAFE_REAL_DATA — authenticated feed not rechecked` |
| Conditional button affordance | Shared `ActionGroup` owns gap, wrapping, responsive stack, and support-text spacing for conditional finance/book actions. | TypeScript, ESLint, Prettier, rendered/component coverage path, and source audit. | `DEPLOYED; GREEN_DETERMINISTIC_NO_SAFE_REAL_DATA — authenticated state evidence qualified` |
| Human invoice references | Server counter generator emits `BFG-INV-YYMMDD-XXXX`; exact Admin search and bounded idempotent backfill preserve `_id` and financial fields. | Canonical generation, concurrency, preview/backfill/idempotency tests. | `DEPLOYED; Production preview returned IDENTITY_REQUIRED; backfill not run` |
| Master Book Save / Publish | Canonical `books.update` persists edits; visible success/error feedback survives reactive refresh; Publish is an explicit action and Save remains Draft. | Query-after-save, Draft→Published, permission, and full regression tests. | `DEPLOYED; GREEN_DETERMINISTIC_NO_SAFE_REAL_DATA — safe legitimate Draft required` |

### Commerce contract verification

| Contract | Local evidence | Status |
| --- | --- | --- |
| Ready Stock direct purchase/reservation, no Batch | Ready Stock policy flow covers atomic reservation, invoice, fulfillment reservation behavior, and Batch denial. | `GREEN_DETERMINISTIC` |
| Secret Catalog PO/preorder, many Publishers/titles | Catalog projection/order test covers three Publishers and three titles in one Catalog. | `GREEN_DETERMINISTIC` |
| Multi-Publisher Batch with shared close date | Batch roster test creates one Batch for three Publishers, assigns items, derives Summary, projects authorized customer items, and locks. | `GREEN_DETERMINISTIC` |
| Different close dates cannot share a Batch | Server link guard rejects mismatched Catalog/Batch deadlines. | `GREEN_DETERMINISTIC` |
| Batch access isolation | Customer projection requires active Catalog grant/open Catalog or own assignment; unauthorized customer receives no protected Batch projection. | `GREEN_DETERMINISTIC` |
