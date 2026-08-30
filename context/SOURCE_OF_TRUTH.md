# BFG SOURCE OF TRUTH

## Catalog UI polish and adaptive format presentation — 2026-08-30

- This is a presentation-only correction. Secret Catalog access, the
  customer-safe Catalog projection, search/filter behavior, variant
  persistence, quantity handling, and order payloads remain unchanged.
- Customer Books with one eligible variant show the format as static metadata;
  they do not show a selector or radio treatment. Books with two or three
  eligible variants keep explicit compact radio semantics using BFG borders,
  spacing, focus, and selected-state tokens.
- The card has one current-price area near Book identity. It reads from the
  existing selected variant, so a selected format's Catalog price is the price
  shown to the Customer. Variant options identify formats only and do not
  duplicate prices.
- `Buka detail buku` uses the existing compact framed secondary `LinkButton`;
  its route and navigation behavior are unchanged. Quantity and Add To Order
  continue to use the existing selected variant ID and quantity state.
- Scoped Catalog Admin settings, Book Picker, and current-Catalog discovery
  rows use the existing Catalog grid owners and BFG spacing tokens. Supporting
  result text is separated from the next section without per-field positioning
  hacks. Pelanggan, Produk, and Publisher remain `BFGSelect` controls.
- Component coverage and rendered fixtures protect single/multi-format card
  states, selected-price switching, order payloads, and Catalog/Admin geometry
  at 390/768/1440. Production deployment and authenticated UAT are recorded
  after release verification.

## Production UAT bugfix — 2026-08-30

- Real Production UAT supersedes the earlier partial closure for Secret Catalog
  discovery: the global access gate and search remain green, but a code could
  start its session on the first eligible Catalog rather than the Catalog that
  generated it. That made a real Catalog with three Admin-linked products
  render as a correct header with zero customer-safe books.
- `convex/catalogAccess.ts` now uses the generated code's source
  `catalogAccessCodes.catalogId` as the initial Catalog when that Catalog is
  still eligible. The same session still exposes only the existing eligible
  Catalog set, and `getUnlocked` still rechecks the requested Catalog server
  side; no global data projection or authorization weakening was introduced.
- The Customer projection remains owned by `convex/lib/catalogView.ts`, and
  Customer title/ISBN search plus Publisher filtering remain unchanged. Admin
  assignment/current-Catalog search and Customer order controls consume the
  corrected scoped projection.
- Admin copy feedback is local to `src/components/admin-catalog-access.tsx`:
  a successful Clipboard API resolution shows the BFG-native
  `Kode akses berhasil disalin.` toast; rejection shows error feedback and
  never reports false success. It is client UX only and creates no Activity
  event.
- Scoped Catalog/Admin field alignment is owned by the existing Catalog grid
  CSS. The settings row uses a shared label/helper/control grid on desktop;
  existing access/member/discovery grids and responsive breakpoints remain in
  place. Pelanggan, Produk, and Publisher continue to use `BFGSelect`.
- The correction is deployed from commit `14e6f105af4483e5a499e5fc494f14b107648710`
  as Vercel `dpl_CHkP7dRoSs4p2He6jUAWfPaZLviA` with Convex Production
  `clean-eel-522`. Public post-deploy route and Select checks ran; authenticated
  Customer/Admin business UAT remains the release gate because no authorized
  Clerk session was available.

## Secret Catalog discovery and global access code — 2026-08-30

- Secret Catalog is a customer discovery workspace. The customer surface
  keeps catalog title, derived close status/countdown, date-only Close Order,
  Catalog-level Estimated Arrival, and available-book count above the grid.
- Customer discovery is scoped to the unlocked Catalog. Free-text matching is
  limited to title and ISBN; Publisher is a separate filter derived from the
  current Catalog's canonical Book Master data. Cards keep cover, title, ISBN,
  and the existing format/quantity/order controls. Book Detail and ordering
  remain unchanged.
- Admin Book Master assignment and current-Catalog tracking support bounded,
  case-insensitive matching across title, Publisher, ISBN, and author. Existing
  eligibility, add/remove mutations, and Catalog authorization remain the
  authority.
- One current secure generated access code can unlock all currently eligible
  Secret Catalogs: open Catalogs whose existing close-time rule has not elapsed.
  The code is digest-only at rest, shown raw only in the existing one-time
  generation response, and creates one opaque session that can switch among
  those eligible Catalogs. Authentication, active BFG membership, Catalog
  authorization, and server-side eligibility checks remain authoritative. The
  existing signed-out Catalog gateway remains supported.
- Shared Access Period is superseded in the active product path. Historical
  period rows, Catalog links, and period-scoped sessions remain compatibility
  data only when needed by existing guards; they are not required for normal
  global-code access and have no active Admin UI.
- Catalog Estimated Arrival is planning metadata on `secretCatalogs`; it is
  not Batch ETA or shipment tracking. Category taxonomy, global search, fuzzy
  search, and Batch/Ready Stock redesign remain backlog.

## Admin action and deadline tuning — 2026-08-29

- Operational Admin mutations use a visibly framed existing BFG `Button`
  variant. Tertiary remains reserved for navigation, support, reset, and
  intentionally low-emphasis controls whose interaction is already clear.
  This tuning changes affordance only; callbacks, loading, disabled, and
  authorization behavior remain unchanged.
- Secret Catalog `closesAt` and Batch `poDeadlineAt` remain UTC millisecond
  timestamps. The Catalog/Batch compatibility guard compares their calendar
  dates in the existing `Asia/Jakarta` presentation timezone, while all other
  eligibility and lifecycle guards remain unchanged.
- The relevant Catalog and Batch deadline inputs and displays use a calendar
  date. A selected date is stored as the end of that `Asia/Jakarta` day so the
  existing Customer cutoff remains open through the displayed date. Legacy
  timestamp records are not migrated.

## Minor stability tuning — 2026-08-29

- Supplier GBP cost remains internal Book Variant data stored as integer pence.
  Admin Book Master accepts pound values with a dot as the canonical separator,
  up to two decimal places, and normalizes a mobile comma separator. Public and
  Customer projections remain unchanged and never expose supplier GBP cost.
- Secret Catalog lifecycle includes one permission-checked `archived → draft`
  restore transition through `secretCatalogs.restore`. It preserves the same
  Catalog and its records/history and does not reopen Customer access; the
  existing guarded `closed → open` `reopen` transition remains unchanged.
- The affected Book Master variant-create grid now has one column per field and
  action at desktop widths. Existing form primitives and responsive breakpoints
  remain canonical.

## Canonical invitation onboarding and final activation P0 — 2026-08-28

The current approved BFG admission owns the Customer onboarding lifecycle.
Admin approval always schedules one deterministic BFG onboarding handoff to
`/accept-invitation`, whether or not Clerk already has an identity for the
email. Clerk identity state only selects the authentication subflow inside
that handoff: new identity signup, existing identity sign-in, an already
completed matching session, or wrong-account recovery.

`onboardingPath` is legacy delivery metadata, not a BFG state or router. Old
`sign_in` values cannot bypass the current approved admission; new delivery
clears that marker. `appUsers.role` and `appUsers.status` remain the only BFG
membership authority. Approval alone, a Clerk user record alone, or a stored
historical subject alone never makes a Customer `Aktif`.

The application invitation route consumes the Clerk ticket and optional
`__clerk_status` on the same BFG page. New identities use the existing
`signUp.ticket` → profile requirements → verification/Protect → finalize
journey. Existing identities receive the same BFG handoff and use Clerk's
ticket-aware `signIn.ticket` flow with the embedded sign-in UI. Because the BFG
acceptance page is not a Clerk catch-all route, that embedded existing-user
continuation uses hash routing; successful sign-in returns to the same BFG page
with `__clerk_status=complete` so the invitation ticket is not consumed twice.
An already authenticated matching completed ticket continues without another
login form. A different current session remains blocked by the verified
primary-email account-switch guard.

After Clerk session activation, the root Convex provider waits for real
Convex auth readiness and invokes the existing `users.ensureCurrentUser`
transaction. It resolves the current approved, non-removed admission by the
current verified Clerk email/subject and converges every valid auth branch
through the single canonical admission reconciler. Only then do
`appUsers.role=customer`, `appUsers.status=active`, accepted onboarding, and
the Admin `Aktif` projection become true.

### Post-activation terminal success — 2026-08-28

Once the current verified Clerk identity is a canonical active BFG Customer,
the invitation handoff is complete. The acceptance component enters one
terminal `active` state and replaces the invitation URL with `/account`; it
does not process the ticket again, evaluate account mismatch, wait for an
invitation timeout, or render a consumed/expired-ticket error. A known
invitation email must match the verified current email; when Clerk has already
consumed the handoff and no target email remains, only an established
same-session/completion continuation may use the active membership result.
The pre-activation different-account guard and genuine invalid-ticket branch
remain unchanged.

Invitation delivery reuses one pending current handoff and only explicit
resend replaces it. Clerk's supported `ignoreExisting:true` option is used so
an existing Clerk identity does not turn the current BFG admission into a
generic sign-in dead end or cause a duplicate identity. No BFG password or
second authentication system exists.

### Regression archaeology

Commit `cda2890` introduced the regression by checking for an existing Clerk
user before creating the current BFG invitation, setting
`onboardingPath=sign_in`, and changing the Admin experience to a generic
`Masuk dengan akun BFG` action. The prior invitation acceptance implementation
(`542f067`) and the latest customer recording establish the intended
Admin approve → invitation email → `/accept-invitation` → `Lengkapi akun`
journey. The current repair removes only that premature identity router and
keeps its verified-email, session, removal/reapply, retry, and security
guards; it does not roll back the repository or add another membership writer.

### Invitation ticket error classification — 2026-08-28

The Clerk `signUp.ticket` Future can expose a failure as either a returned
`{ error }` envelope or a rejected Promise. These two result shapes are one
Clerk boundary and must use the same classification. An existing-identity
code such as `form_identifier_exists` or `user_exists` returns to the
same-route existing-identity sign-in continuation with the BFG fatal error
cleared; it does not create another identity or bypass the current admission.
A successful new-identity ticket still advances from Clerk's current
`missing_requirements` state to the existing `Lengkapi akun` form. Safe
correlation diagnostics record only the Clerk code/type and stage needed to
distinguish this branch from a real invalid-ticket or finalization failure.

The deterministic RED regression models the rejected-Promise shape that the
previous bare catch collapsed into `Aktivasi belum selesai`. A valid
authenticated Production invitee was not available in this runtime, so the
public fake-ticket timeout remains diagnostic evidence only and is not used as
proof of a real Customer outcome. Authenticated Production UAT remains the
release gate.

## Membership removal and reapply P0 — 2026-08-27

The BFG membership lifecycle is separate from Clerk identity. Admin
`Remove member` changes the canonical Customer `appUsers` status to `removed`
and marks the approved Join Request as historical; it never deletes the Clerk
user or business history. Removed `appUsers` rows retain their IDs and member
codes so Orders, Invoices, Payments, Deposits, Refunds, Batch, Ready Stock, and
Activity references remain readable.

Removed admissions are excluded from duplicate email checks and authenticated
reconciliation. The same normalized email may submit a fresh Join Request only
when no active Customer membership and no current pending/approved admission
remain. An old approved request cannot auto-reactivate a removed user. A new
approval is required; the same Clerk subject reuses the historical appUser and
member code, while a genuinely new Clerk subject gets a new appUser/member code
and leaves the old tombstone intact. Accepted invitation history remains
accepted; pending invitation revocation is best effort and never deletes a
Clerk identity.

The default Admin `Permintaan bergabung` list is an operational projection,
owned by `joinRequests.listForAdmin`. It excludes any request with
`removedAt`, including when a status filter is supplied, while the underlying
Join Request and its removal metadata remain queryable by historical/owner
surfaces. This projection filter is deliberately separate from
`users.findApprovedJoinRequest`, which must continue resolving the current
eligible approved admission for invitation and membership reconciliation.

## Membership admission P0 override — 2026-08-27

The 27 August Production failure was not a Ready Stock defect. Convex
authenticated the correct Clerk subject, but the custom Convex JWT template
omitted the email claim. The canonical reconciler therefore could not match
the approved Join Request and correctly failed closed before BFG membership
existed.

The canonical contract is:

- Clerk remains identity authority; the Join Request remains admission-decision
  authority; the invitation remains onboarding transport; `appUsers.role` and
  `appUsers.status` remain BFG authorization authority.
- BFG-created invitation tickets continue through the current
  `/accept-invitation` Clerk v7 flow with `__clerk_ticket`, wrong-account
  recovery, session activation, and membership-confirmed redirect.
- After Convex recognizes the authenticated subject, the root
  `ConvexProductProvider` calls `userProvisioning.ensureCurrentUser`. That
  server action reads the same subject's Clerk Backend user and accepts only
  its verified primary email; no query parameter, form value, storage value,
  or client context can supply admission email.
- The action invokes the existing `users.ensureCurrentUser` transaction. Its
  shared `admitApprovedJoinRequest` helper remains the single write path for
  active Customer membership and accepted invitation/admission persistence.
- Missing/unverified email and subject mismatch fail closed. A Clerk provider
  lookup failure is retryable rather than `ADMISSION_REQUIRED`, so unresolved
  state never renders a false Join CTA. Active, suspended, Admin, and Owner
  records preserve their stronger canonical state.
- One privacy-safe correlation ID spans invitation open, ticket acceptance,
  Clerk session activation, Convex auth readiness, reconciliation, and final
  Customer activation. Logs contain no ticket, JWT, token, raw subject, or raw
  email.

### Invitation acceptance P0 correction — 2026-08-27

The deterministic RED reproduction of the reported stuck invitation established
the first incorrect application boundary. The old `/accept-invitation` effect
owned the asynchronous `signUp.ticket` handoff with an effect-local active
flag, while depending on Clerk auth and sign-up resource identity. Clerk can
refresh those values while the ticket request is in flight; React then cleaned
up the effect, ignored the ticket result, and the one-shot ticket guard blocked
the next attempt. `signUp.finalize` and the returned Clerk requirements were
never reached, leaving the route in ticket processing until its recovery copy.

The route now keeps a per-ticket run alive across Clerk signal/resource/auth
changes, reads the current sign-up resource after each async boundary, and
advances from Clerk's actual `status`, `missingFields`, `unverifiedFields`,
verification strategy, and Protect challenge. It renders only the fields Clerk
reports, uses the installed Clerk verification/Protect methods when required,
finalizes exactly once, and waits for the existing Clerk → Convex → BFG
reconciliation to report an active Customer before redirecting. A same-session
completed sign-up may continue only when Clerk's current session/user matches;
the existing different-account guard remains in force.

This correction adds no membership writer and does not change the trusted
server-side subject/verified-email contract. The new route regression covers
direct completion, resource refresh, auth/session handoff, missing fields,
email-code and email-link verification, same/different-account handling,
invalid tickets, and recovery from a hanging ticket request.

At the missing-requirements submit boundary, Clerk's returned or thrown
`signUp.password()`/`signUp.update()` result is authoritative. A mapped Clerk
field-validation error stays on `Lengkapi akun`, is rendered beside the
affected field, and leaves the same ticket retryable. An unmapped update
failure is a recoverable technical form error. Only a current complete signup
may enter finalization; remaining `missingFields`, `unverifiedFields`,
Protect, and verification states are re-read from the current Clerk Future
resource after each update. Safe invitation diagnostics contain the
correlation ID, field names, state, and Clerk error code/field only; password
values are never logged.

All Account, Join, Ready Stock, Buku Saya, Tagihan, Customer shell, and Admin
Join Request surfaces remain projections of this same canonical state. No
page-specific membership implementation is permitted.

The root correction is deployed to Convex Production `clean-eel-522` and the
canonical Vercel domain in Vercel deployment
`dpl_D17RfSmUraJqNNnSej6AWBf471zU`. The affected public fake-ticket recovery
check passes at 375, 390, 430, 768, and 1440 pixels; this proves bounded
rendered recovery, not successful invitation acceptance. The observed real
journey reached approval and one new Clerk invitation, but not Customer ticket
acceptance; final Customer and Ready Stock acceptance stays open until that
same legitimate invitee acts.

## Final yellow / unknown closure override — 2026-08-26

Admin approval remains entirely inside BFG. `joinRequests.approve` records the
approval once, then schedules a private server-side Clerk Backend SDK action.
That action resolves an exact existing Clerk identity or pending invitation
before creating one new invitation. Delivery is persisted as `pending`,
`sent`, `accepted`, or `failed`; failed delivery is retryable from BFG Admin.
Clerk secrets never enter browser code, Convex documents, audit metadata, or
product error copy.

`appUsers.role` and `appUsers.status` remain the membership authority. An
active Customer is redirected away from `/join`; pending, approved invitation,
failed invitation, suspended, and Admin/Owner states never render a new
Customer application form. An approved request plus a trusted exact Clerk
email provisions one active Customer on the first authenticated BFG request.

The Ready Stock mutation remains Customer-only and Admin-assisted ordering
remains the separate existing path. The eight former Cover Presentation
Playwright failures were stale raw-bounding-box expectations: transformed
artwork is intentionally clipped by the canonical cover frame. The regression
now asserts `contain`, clipped presentation, transformed metadata, and no
viewport overflow without weakening upload/media security.

## Operational reconciliation override — 2026-08-26

The current maintenance correction preserves the canonical commerce model.
Ready Stock is a direct Customer order with an atomic reservation and remains
separate from Batch. `orders:createReadyStock` stays restricted to an active
`role=customer` identity; Admin and Owner use the existing Admin-assisted
mutation. Customer-facing checkout now makes that boundary explicit instead
of presenting an unusable Customer form to elevated roles.

Secret Catalog `closesAt` is the Customer-facing `Batas pemesanan`. A closed
catalog can reopen only while every linked Batch remains unlocked; locked or
missing downstream procurement blocks reopening without rewriting history.
Catalog-to-Batch linking exposes derived eligible-order counts, while Roster,
Assignment, Purchase Summary, and the existing Batch tracking state machine
remain canonical. The first PO lock requires a non-empty assignment.

Secret Catalog Book Detail reads the authorized Catalog projection and reuses
Book Master cover, gallery, description, preview, and selling variants. It
does not expose supplier cost or other Admin-only data and cannot be reached
without valid Catalog access.

Hard deletion is limited to unused draft/pristine records at server boundaries;
operational, financial, customer-history, and audit records retain lifecycle
actions. Shared BFG confirmation dialogs and safe product error messages are
required for destructive/state-changing Admin actions. Existing Clerk, RBAC,
ownership, Upload, reservation, order, invoice, payment, deposit, refund,
Activity, and Button contracts remain unchanged.

## Client UAT Round 3 override — 2026-08-25

Blessing For Goods remains invitation-only. Clerk sign-in rejects an unknown
Google identity without opaque sign-up transfer and presents Indonesian BFG
guidance with a public `/join` next step. `/join` is a signed-out admission
boundary: it validates, rate-limits, deduplicates, and persists a request but
never creates an active `appUsers` record or Secret Catalog access.

`Aktivitas` remains one UI feed. Notification and Inbox records carry an
admin/customer audience projection so an elevated Admin viewing the customer
surface cannot see Admin operational entries. Unread/read presentation and
`readAt` semantics remain shared. Join-request book interest is one primary
value with the expanded practical taxonomy; the three legacy values remain
valid and readable.

Authenticated Production and rendered browser evidence remain separate from
local deterministic evidence. Missing local Clerk publishable configuration
must fail closed; no fake credentials or Production business records are
created to bypass that gate.

## Client UAT Round 2 maintenance override — 2026-08-24

The initial maintenance checkout was stale at `1e155205`; `origin/main` now
contains the requested `fce35bee` reconciliation tip, which is merged into
the final local `main`. Round 2 adds only additive schema/view fields and
fixes existing canonical paths: strict upload MIME normalization,
reservation-backed Ready Stock error handling and Admin assistance, Clerk
challenge CSP allowances, Activity unread presentation, shared Button tokens,
Batch `etaCargoMonth`, Customer `memberCode`, and derived Publisher-grouped
purchase export.

The full report and evidence classification are maintained in
[`BFG-CLIENT-UAT-ROUND-2-FINAL-REPORT.md`](implementation/BFG-CLIENT-UAT-ROUND-2-FINAL-REPORT.md).
Deterministic green is not Production green; live authenticated/device gates
remain separate and require authorized credentials plus approved business data.

Reconciled: 2026-08-24 (Asia/Jakarta)
Applies to the current `main` and the Phase 09 initial operations baseline; the
canonical domain serves the latest READY Production deployment with Convex
`clean-eel-522`.
Phase 07.1 is **CLOSED + RECONCILED** at the current application baseline.
Phase 08: **COMPLETE — EXTERNAL PREVIEW FORM ALIGNMENT CLOSED**. The latest
real authenticated Production screenshot established the reachable Admin Book
Detail surface and the exact misalignment. The correction is deployed: paired
media fields now use explicit label, control, and support rows; the shared
`Field` primitive, validation, custom file picker, Gallery, and backend remain
unchanged. No credential, dummy record, or Production media mutation was
fabricated or performed.
Current product status is `PHASE_08_COMPLETE`,
`BFG_CURRENT_PRODUCT_SCOPE_COMPLETE`, `BFG_PRODUCTION_STABLE`, and
`PRODUCT_MODE: MAINTENANCE`. Phase 09 is now **ACTIVE — OPERATIONS &
MAINTENANCE**; feature development is paused unless an approved requirement
exists.
The Bulk Import V1 implementation is deployed but its legitimate Production
pilot is **DEFERRED_BY_USER_DATA**. Product Media decisions are now locked and the
bounded implementation is deployed through the canonical Production hook;
authenticated Admin rendering is verified on one real book, while populated
media mutation remains blocked only by approved data. Cover presentation is
additive metadata over the original storage object and is projected through all
customer cover consumers. The entry gate is defined in
[`BFG-PHASE-08-ENTRY-GATE.md`](implementation/BFG-PHASE-08-ENTRY-GATE.md).

## Parallel-workstream reconciliation closure — 2026-08-24

Git ancestry, not the parallel report snapshots, is the authority for this
closure. The canonical tree was reconciled from button commit `5c9abeec`,
security commit `88ec8737`, and Product Logic commit `1e155205`. The integrated
source commit is `f0eddc82` with one shared `Button` family and one
`ActionGroup`; Product Logic supplies business eligibility and action meaning,
while security remains the server authority.

Current release evidence:

- `HEAD`, local `main`, and `origin/main` point to the integrated release; the
  worktree is clean.
- Full deterministic QA is green: Vitest `269/269`, Convex `136/136`, lint,
  TypeScript, format, build, `npm audit --omit=dev` (`0` vulnerabilities),
  `npm run convex:check` on the canonical deployment, and `git diff --check`.
- Convex Production `clean-eel-522` accepted the integrated functions/schema.
- The latest Vercel Production deployment is `READY` and aliased to
  `https://www.blessingforgood.com`; its last-hour warning/error log query
  returned no logs.
- Canonical Production emits CSP, HSTS, nosniff, Referrer-Policy,
  Permissions-Policy, X-Frame-Options, and COOP. Serial read-only Playwright
  checks passed `58/58` across representative customer `375/430/768/1440`
  and Admin `1024/1440` surfaces. The populated Activity geometry fixture
  passed all `375/390/430/768/834/1024/1280/1440` viewports.
- No authorized authenticated Production session was available in this
  worktree. Therefore Admin/Customer record-specific states, a real populated
  Activity feed, a real no-invoice order, and Draft Book persistence remain
  qualified rather than fabricated. Production invoice preview was attempted
  read-only and returned `IDENTITY_REQUIRED`; legacy backfill was not run.

Final status for this integration is therefore:

```text
BFG_APPLICATION_SECURITY: CLIENT_READY
BFG_SECURITY_ASSURANCE: GREEN_EVIDENCE_WITH_PRECISE_QUALIFICATIONS
BFG_GLOBAL_BUTTON_SYSTEM: DEPLOYED; AUTHENTICATED_RENDERED QA QUALIFIED
BFG_PRODUCT_LOGIC_UAT: DEPLOYED; DETERMINISTIC GREEN; AUTHENTICATED UAT QUALIFIED
```

Recovery evidence is carried forward without strengthening the claim:
manual Production backup, isolated restore, and File Storage restore are
verified; operational RTO target is 30 minutes; RPO is manual/not guaranteed;
automatic backup cadence is not evidenced.

## Phase 09.1 Production Assurance — 2026-08-22

Phase 09.1 is **ACTIVE — ASSURANCE / MAINTENANCE**, not a feature phase. The
non-functional contract and evidence artifacts are:

- [`PRD-NON-FUNCTIONAL-ASSURANCE-2026-08.md`](product/PRD-NON-FUNCTIONAL-ASSURANCE-2026-08.md)
- [`BFG-THREAT-MODEL.md`](security/BFG-THREAT-MODEL.md)
- [`BFG-ATTACK-SURFACE.md`](security/BFG-ATTACK-SURFACE.md)
- [`BFG-RBAC-MATRIX.md`](security/BFG-RBAC-MATRIX.md)
- [`BFG-AUTHORIZATION-TEST-MATRIX.md`](security/BFG-AUTHORIZATION-TEST-MATRIX.md)
- [`BFG-RATE-LIMIT-MATRIX.md`](security/BFG-RATE-LIMIT-MATRIX.md)
- [`BFG-SECRET-EXPOSURE-AUDIT.md`](security/BFG-SECRET-EXPOSURE-AUDIT.md)
- [`BFG-PRODUCTION-ASSURANCE-MATRIX.md`](security/BFG-PRODUCTION-ASSURANCE-MATRIX.md)
- [`BFG-SCALABILITY-CONTRACT.md`](performance/BFG-SCALABILITY-CONTRACT.md)
- [`BFG-LOAD-TEST-REPORT.md`](performance/BFG-LOAD-TEST-REPORT.md)

The pass adds no customer/Admin product feature. Current safe evidence is
247/247 deterministic tests, 264/264 Playwright cases ultimately passing with
one transient retry, source/build/browser secret scans with zero active
credential values, server-side cross-customer/role/suspension denial, and
Profile A public read capacity through 500 users. The post-deployment 750
level returned no request errors or 5xx but crossed the p95 latency target;
1,000 is not validated. Convex plan/usage/backup and RPO/RTO remain
`BLOCKED_BY_ACCOUNT_ACCESS` / `DOCUMENTED_NOT_DRILLED`.

## Phase 09 Initial Operations Baseline — 2026-08-22

Phase 09 is an ongoing operating mode, not a feature phase. The canonical
operations, security, recovery, and technical-debt documents are:

- [`BFG-PHASE-09-OPERATIONS.md`](implementation/BFG-PHASE-09-OPERATIONS.md)
- [`BFG-MONTHLY-SECURITY-CHECKLIST.md`](implementation/BFG-MONTHLY-SECURITY-CHECKLIST.md)
- [`BFG-RECOVERY-PLAYBOOK.md`](implementation/BFG-RECOVERY-PLAYBOOK.md)
- [`BFG-TECHNICAL-DEBT.md`](implementation/BFG-TECHNICAL-DEBT.md)
- [`2026-08-BFG-MAINTENANCE-REPORT.md`](maintenance/2026-08-BFG-MAINTENANCE-REPORT.md)

Initial evidence is local Vitest `241/241`, Convex `111/111`, Playwright
`264/264`, TypeScript/ESLint/Format/Build PASS, and `git diff --check` PASS.
The canonical domain returned healthy public responses and the expected
signed-out Admin boundary. No Production business data was mutated.

The baseline has no known active P0/P1/P2 issue. Convex CLI health access and
platform backup/restore capabilities are explicitly `NOT VERIFIED`; populated
media, safe financial UAT, editable Batch, and the Bulk Import pilot remain
legitimate-data-limited observations. This is a
`PHASE_09_OPERATIONS_BASELINE_READY` baseline with operational `WATCH` items,
not a claim that every external platform capability has been proven.

This document is the canonical product contract. It records requirements and
decisions first, then points to implementation and evidence. Code, screenshots,
tests, and completion reports are evidence; they are not requirement authority.

## Current maintenance contract — 2026-08-22

The latest client decisions are authoritative for the current maintenance pass:

### Commerce

- Ready Stock is the direct purchase model while physical available stock
  exists. Its order source is `ready_stock`; reservation is atomic and no
  supplier Batch is required.
- Secret Catalog is a private PO/preorder model. A single Catalog may contain
  many Publishers, Book Masters, and titles.
- Batch PO is not Publisher-bound. Items from multiple Publishers may share a
  Batch only when they use the same operational close date/deadline. Publisher
  remains a Book/Catalog-item attribute.
- Customer Batch views must be filtered by legitimate active Catalog access,
  while preserving a Customer's own assigned/order/status projection. Batch
  visibility must never bypass Secret Catalog authorization.

### Maintenance UAT authority

The five latest real findings supersede older green snapshots for the affected
surfaces: a no-invoice Order must provide the next valid Admin action; unread
Activity must use shared, non-color-only cues; conditional actions must use the
shared ActionGroup spacing/hierarchy; human invoice references must use the
short `BFG-INV-YYMMDD-XXXX` family without changing Convex identity; and Master
Book Save must persist and report success/error while remaining separate from
explicit Publish.

Production deployment is now complete on the canonical Convex/Vercel targets.
Legacy-reference backfill and authenticated live recheck remain separate
qualified gates because the current operator session cannot authorize them.
No Production data is fabricated for this pass.

## Product Purpose

Blessing For Goods (BFG) is a community-led imported-book experience for
Blessfriends. The product helps visitors understand the service, join the
community, discover public Ready Stock, access controlled Secret Catalogs,
place structured orders, and follow operational, invoice, payment, deposit,
exception, refund, and notification consequences.

Customer experience is mobile-first and Indonesian-first. Admin experience is
desktop-first and operational. BFG records the structured commercial flow;
human WhatsApp handoff remains allowed where the approved flow calls for it.

## Current Production Baseline

| Item                           | Canonical value                                                          |
| ------------------------------ | ------------------------------------------------------------------------ |
| Phase 08 implementation commit | `e04f3cd` — align External Preview label/control/support rows |
| Phase 09 baseline source       | `85908d9` — current reviewed `main` |
| `origin/main`                  | `85908d9` at review start |
| Convex Development             | `content-snake-214`                                                      |
| Convex Production              | `clean-eel-522`                                                          |
| Vercel Production deployment   | Latest `READY` Production deployment, aliased to canonical domains |
| Canonical Production URL       | `https://www.blessingforgood.com`                                        |
| Safe live evidence             | `/how-to-order` returned HTTP 200; deployed CSS contains the External Preview grid; signed-out `/admin/books` boundary `3/3` at 1024/1280/1440 |

Current exact regression baseline:

| Gate        | Result                                                                                                                                                                                    |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vitest      | `241 / 241`                                                                                                                                                                               |
| Convex      | `111 / 111` (included in Vitest)                                                                                                                                                          |
| Playwright  | local full suite `264 / 264`; Convex deterministic suite `111 / 111`; live public HTTP and signed-out Admin boundary healthy; previous eight cover assertions reconciled as `ENVIRONMENT_ONLY / DATA-LIMITED` |
| TypeScript  | PASS                                                                                                                                                                                      |
| ESLint      | PASS                                                                                                                                                                                      |
| Format      | PASS                                                                                                                                                                                      |
| Build       | PASS                                                                                                                                                                                      |
| Rendered QA | local production-server route/viewport checks pass at 375/390/430/768/834/1024/1280/1440; deployed CSS contains the named paired-grid rules |
| Real UAT    | Latest user-supplied authenticated Production screenshot is the real Book Detail acceptance evidence; the corrected surface is deployed and no mutation was performed |

No access codes, credentials, tokens, or customer-identifying business data
belong in this document or any other context file.

## Phase 08 External Preview Closure — 2026-08-21

The authenticated Production screenshot supplied for the real Admin Book
Detail is the acceptance evidence for this targeted correction. The root
cause was inconsistent field-local DOM order: the URL field rendered its
support copy before its control while the label field did not. The fix uses a
local explicit grid with label, control, and support rows. Desktop controls
share one row and the canonical input height; at 768px and 834px the pair
stacks into independently readable fields. The URL helper remains below the
URL control with its original security meaning.

The shared `Field` primitive, Gallery, custom BFG file picker, file-upload
backend, URL validation, Book schema, Auth, Orders, Batch, Finance, Activity,
Homepage, How To Order, and Button system were not reopened. The implementation
commit is `e04f3cd`; the canonical domain serves the latest `READY` Production
deployment. The historical eight identical cover assertions are reconciled by
the Phase 09 baseline: the public seed had no stored cover, while the
assertion required an image element. Current local cover geometry passes at
every configured viewport. This is `ENVIRONMENT_ONLY / DATA-LIMITED`, not a
browser or Product regression; no test was weakened and no Production asset was
made.

## Source Inventory

The canonical original source pack was inventoried from the external product
document set at `/Users/masjak/Documents/BLESSINGFORGOOD/BFG WEB/context/`.
The repository copies and later policy/decision files are reconciled evidence
and implementation context.

| Category        | Canonical source set                                                                                                                                                                                                | Reconciliation result                                                                                                                                |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Product         | `product/PRD.md`, `UX_FLOWS.md`, `BUSINESS_RULES.md`, `SCOPE.md`, `SUCCESS_CRITERIA.md`, `ROUTES.md`, `PERMISSIONS.md`, `OUT_OF_SCOPE.md`                                                                           | inventoried and mapped in the master matrix                                                                                                          |
| Features        | all files under `features/`, including auth, order, profile, deposit, invoice, payment, cancellation, tracking, Secret Catalog, Ready Stock, reports, settings, content, audit, users, upload, and WhatsApp handoff | inventoried; active minimum scope is implemented or explicitly classified                                                                            |
| Catalog rules   | `catalog/*.md`                                                                                                                                                                                                      | publisher/book/variant/catalog, preorder, Ready Stock, Secret Catalog, and batch rules locked                                                        |
| Database        | `database/*.md`                                                                                                                                                                                                     | schema, snapshots, transactions, invariants, retention, deletion, backup, and indexes reconciled with Convex                                         |
| Security        | `security/*.md`                                                                                                                                                                                                     | Clerk identity, BFG admission/RBAC, ownership, Admin boundary, file access, Secret Catalog secrecy, rate limits, audit, and fail-closed rules locked |
| Integrations    | `integrations/*.md`                                                                                                                                                                                                 | Clerk and Convex active; manual WhatsApp active; gateway and automated WhatsApp excluded; infrastructure docs remain operational reference           |
| Brand           | `brand/*.md`                                                                                                                                                                                                        | official Logo-1, approved Blessy assets, typography, tone, layout, mascot, and content rules locked                                                  |
| Screens         | `screens/admin/*.md`, `screens/mobile/*.md`                                                                                                                                                                         | source screen contracts mapped to the 10 tracked Admin and 8 tracked mobile image assets                                                             |
| Mockup mapping  | `mockups/ADMIN_MAPPING.md`, `MOBILE_MAPPING.md`, `MOCKUP_MANIFEST.md`, `MOCKUP_GAP_LIST.md`                                                                                                                         | historical filenames are stale; actual tracked assets are the visual evidence listed in the mockup matrix                                            |
| Decisions       | original `decisions/DECISIONS.md`, `SUPERSEDED_DECISIONS.md`, repository `context/decisions/*`, current user instructions                                                                                           | explicit later decisions win and are logged in `DECISION_LOG.md`                                                                                     |
| Phase contracts | original `implementation/PHASE-01...PHASE-09...`                                                                                                                                                                    | phases 01–07.1 are historical delivery context; the old Phase 08 list is reclassified from reconciled source, not copied as scope                    |

If a future task cannot locate a cited original source, it must record
`SOURCE_MISSING` rather than infer content.

## Latest Phase 08 Targeted UI Reopen — 2026-08-21

The newest real Production screenshots temporarily supersede the previous
visual green label for this bounded pass only. The active scope is Button and
LinkButton affordance states, the shared accessible BFG file-picker
presentation, Admin media upload form geometry, and How To Order desktop/mobile
spacing. Auth, RBAC, Orders, Batch, Invoice, Deposit, Payment, Refund, Secret
Catalog, Activity, Human references, Product Media data contracts, cover crop
metadata, Bulk Import, Admin IA, customer navigation, the seven-step business
sequence, and Tabler icons remain locked and are not reopened.

The permanent visual contract is: secondary/quiet controls must remain visibly
clickable against cream/white surfaces; every clickable control exposes default,
hover where supported, active/pressed, focus-visible, and disabled states; all
visible upload controls use one BFG picker over an accessible native input; the
Admin media form uses a semantic field grid and separate action row; and the
locked How To Order journey uses shared desktop rows plus tokenized mobile
section gaps. Closure requires local regression, rendered responsive QA, the
current Git/Production anchor, and a real Production recheck of the reachable
surfaces.

## Source Precedence

When sources conflict, use this order:

1. Latest explicit user/client decision.
2. Original PRD.
3. Approved business, security, and financial policies.
4. Approved mockups.
5. Official BFG brand assets.
6. Canonical domain/schema/state machine.
7. Real current Production behavior, as evidence.
8. Current implementation, as evidence.
9. Previous completion reports, as historical status only.
10. Agent inference.

## Current Phases

- Phase 01: foundation and documentation.
- Phase 02: brand, community, and mascot.
- Phase 03: authentication, security, and domain.
- Phase 04: Secret Catalog and Ready Stock.
- Phase 05: customer order and portal.
- Phase 06: Admin catalog, batch, and customer operations.
- Phase 06.1–06.4: Convex catalog, admission, batch, payment, and exception slices.
- Phase 06.7: business policy closure for Ready Stock, exceptions, refunds, and financial consequences.
- Phase 07: Admin operational UI/UX and customer visual surface.
- Phase 07.1: source-of-truth, product-surface, visual, deployment, and real-flow stabilization.
- Phase 08: reports/integrations/settings backlog as originally named, now reclassified below.
- Phase 09: Production Operations & Maintenance — active ongoing maintenance;
  not a product feature-development phase.

## Completed Phases

The current code and supplied Production baseline establish the completed
Phase 07.1 surface. Earlier phases remain historical delivery milestones; the
canonical requirements are the reconciled contracts in this document and the
linked invariant/matrix documents.

## Current Phase

`BFG_PHASE_09_OPERATIONS_ACTIVE` — Phase 08 remains COMPLETE; the current
product is in permanent Production operations and maintenance. The initial
security, regression, health, recovery, and technical-debt baseline is ready;
data and platform-verification limits remain explicit.

## Phase 08 Status

**COMPLETE — targeted visual stabilization is closed.** The locked source,
data, policy, state, visual, and traceability contracts are linked from
[`BFG-PHASE-08-SOURCE-CONTRACT.md`](implementation/BFG-PHASE-08-SOURCE-CONTRACT.md).
The implementation is a single `/admin/import` stateful flow, reuses the
canonical publisher/book/variant/audit/auth boundaries, adds no schema or
dependency, and does not start another Phase 08 candidate. Activity is one
unified presentation over separate Notification and Inbox sources. Product
Media V1 is Book Master-owned and uses the existing Convex storage boundary.

The Activity responsive closure fixed the shared root cause: the prior nested
implicit grid track preserved intrinsic long-content width, while the anchored
panel did not measure right-side collision and the narrow fixed surface could
inherit an unsafe containing block. The canonical fix uses `minmax(0, 1fr)`,
`min-width: 0`, normal wrapping, measured viewport-safe width/position/height,
and internal vertical scrolling without hiding or deleting content.

The post-closure visual stabilization fixed four additional shared contracts:
How To Order is a continuous seven-step desktop journey with one outline icon
family and a vertical mobile/tablet timeline; Perjalanan Bukumu is a compact
grouped three-step orientation; Mengenal BFG uses the canonical high-contrast
section headline hierarchy; and BookCover preserves the original uploaded
image while applying optional Admin-controlled zoom/position metadata for the
customer frame.

## Canonical Business Rules

- No public self-signup. Clerk authenticates identity; admission creates the
  BFG membership consequence.
- `appUsers` is the BFG membership, role, status, and ownership authority.
- All sensitive business and financial mutations are server-authorized and
  state-guarded in Convex.
- Mockup data is illustrative. Production must not receive dummy business
  records.
- Money is integer IDR. Historical commercial values are snapshots.
- Append-only histories and ledgers are preferred over destructive edits.
- Normal customer actions must be discoverable through natural navigation;
  backend-only or manually typed URLs are not complete product surfaces.

## Authentication

Clerk is the authentication and session authority. Convex derives identity from
the Clerk token. Authentication does not itself grant BFG membership,
customer access, catalog grants, Admin access, or ownership.

## Admission

Canonical flow:

`visitor/non-member → /join → joinRequests → Admin review → approve/reject →
approved invitation/account consequence → active appUser → private member
surfaces`.

The current proven Production admission flow is the authority for the final
handoff behavior. Clerk login alone never grants membership. Rejected history
is retained; duplicate active requests are blocked by normalized identity and
contact rules.

## Roles / Authorization

Canonical roles are `customer`, `admin`, and `owner`. The older `operator` role
in the original conceptual permission document is superseded by the current
explicit role contract and Admin permission set.

Canonical user states are:

- no `appUsers` row: admission required/deny private surfaces;
- `active`: role permissions apply;
- `suspended`: deny private and operational access.

Admin/Owner operations remain independently server-authorized even when a
route guard hides the UI.

## Customer Workspace

Natural customer surfaces are `/catalog`, `/account`, and their nested
`orders`, `invoices`, `batches`, `deposit`, `notifications`, `inbox`,
`profile`, and `addresses` routes. Desktop may expose a coherent header with
logo, primary nav, Aktivitas, and avatar. Mobile uses logo-only top header and
bottom navigation: Beranda, Katalog, Buku Saya, Tagihan, Akun.

Notification and Inbox live under Akun/Aktivitas on mobile. Unread indicators
are subtle and data-backed. The mobile Account hub also exposes the existing
Profile, Address, Activity, Clerk account-management, and Clerk sign-out
actions in one stacked list; no essential action depends on orientation.

## Admin Workspace

`/admin` is an operational workspace with grouped navigation, one-row desktop
header (`Ruang kerja operasional`, customer-side link, Aktivitas, avatar),
actionable queues, shared status grammar, and explicit Owner-only system
surfaces. Admin uses customer-safe projections when viewing customer workspace
surfaces; `/admin` APIs are not a substitute for those projections.

## Product / Book Master

Book Master is the reusable identity for publisher, title, description,
categories, author, publication status, durable cover, and variants. A variant
owns format (`BB`, `PB`, `HB`), normalized ISBN, integer IDR price, and
availability. Publication visibility is server-controlled. Current durable
media proof is Admin upload → validated Convex storage → persisted reference →
hard-refresh persistence → customer-safe projection.

Product Gallery V1 is Book Master-owned and permits up to eight additional
ordered images; variants do not override it. External Preview V1 is optional
HTTPS metadata only: label/title plus URL, with no server fetch, scrape, iframe,
or remote image hotlink. Cover remains a separate primary identity image. See
[`BFG-PHASE-08-PRODUCT-MEDIA-SOURCE-CONTRACT.md`](implementation/BFG-PHASE-08-PRODUCT-MEDIA-SOURCE-CONTRACT.md).

## Ready Stock

Ready Stock is public-safe discovery with customer-safe title, publisher,
format, ISBN, price, cover, and availability. Canonical availability is:

`available = onHand - reserved`.

An admitted active customer creates a canonical `orders` record with
`source=ready_stock`; reservation is atomic, cancellation releases an active
reservation, and fulfillment consumes it. Ready Stock does not create a
supplier Batch PO. Out-of-stock items have no active order consequence.

## Secret Catalog

Final canonical model is hybrid:

- Admin creates, edits, opens, closes, assigns products, and manages Access
  Management from `/admin/catalogs/[catalogId]/access`.
- One current generated code is digest-only at rest, expiring, revocable,
  rate-limited, and scoped to all currently eligible open/unexpired Catalogs.
  It is shown in plaintext only in the immediate generation response.
- A valid code creates an opaque anonymous browsing session. The server
  validates the session and current Catalog eligibility on every private
  Catalog query; the same session can select another eligible Catalog.
- An active customer may receive an explicit member grant/revoke. Customer
  identity and ownership are still required for an owned order/account
  consequence.
- Historical per-Catalog codes and Shared Access Period records/sessions are
  compatibility-only. The active Admin path exposes no period controls and
  does not require period data for global-code access.
- Catalog items reference Book Master variants; Admin can apply a catalog price
  override. Draft/archived products are excluded from customer projection.

The original authenticated-member-plus-code-only model and the previous
anonymous-only-as-the-entire-management-model are superseded. The secure
anonymous session remains one half of the active contract.

## Orders

Canonical sources are `customer_self_service`, `admin_assisted`, and
`ready_stock`. Customer and Admin-assisted orders resolve customer, catalog
access, variants, price, quantity, ownership, and snapshots server-side.
Order items preserve title, publisher, format, ISBN, unit-price, currency, and
quantity snapshots. Order mutation is idempotent where a submission key is
defined. Cancellation goes through the exception domain; direct status
shortcuts cannot bypass it.

## Batch PO

One batch may contain multiple publishers. The canonical lifecycle has seven
semantic states: `editable` plus the six-stage shipment sequence in Convex:

`editable → po_closed → ordered_to_supplier → shipped_internationally → customs
→ to_indonesia_warehouse → at_store`.

An unset stage is editable. Once a stage is set, roster/catalog edits are
locked according to the state guards. Customer list/detail surfaces are
derived from canonical orders, assignments, linked catalogs, and ownership;
they do not duplicate an order system.

Batch targeting is not a separate customer table. Admin targets an eligible
active Blessfriend through submitted order items that belong to a linked
Catalog. Assigning an item creates the customer/item roster projection. Before
the first shipment stage, Admin may assign an item, change its quantity,
remove it, or move it to another editable linked Batch. At `po_closed` and every
later shipment stage, the server denies roster, assignment, and Catalog-link
editing. Purchase Summary is derived from the roster assignments by book
variant and customer count; it is never a second editable purchasing source.
Batch ↔ Catalog is a relation: unlinking removes only the relation and never
deletes the Batch or Catalog.

## Tracking

Customer fulfillment uses:

`awaiting_payment → awaiting_address → packing → shipped → completed`.

Admin and customer projections expose only the fields allowed by the relevant
authorization boundary. Transition helpers reject skips unless the canonical
Admin operation explicitly allows them.

## Invoices

Admin creates a draft, issues a valid invoice, or voids it through canonical
mutations. Invoice values are integer IDR snapshots with immutable invoice
items and derived adjusted/outstanding/overpayment/refund values. Issuance
creates the customer Tagihan projection and the event-backed notification.
Where the source defines DP/final semantics, the invoice deposit-requirement
mode/value and allocation snapshot carry that consequence; no later catalog or
policy edit rewrites the historical invoice.

## Payments

Customer submits a payment confirmation and private proof where required.
Admin starts review, then approves or rejects. Approval updates canonical
invoice payment consequence and history atomically; UI-only/manual settlement
shortcuts are not valid.

## Deposit

Deposit is an append-only ledger. Top-up proof follows submit → review →
approve/reject. Allocation, release, debit, reversal, and refund holds are
explicit ledger consequences. Available balance is derived and can never be
manually edited to settle an invoice.

## Exceptions

Exceptions are item-level, append-only operational records. Customer
cancellation is a request; pre-PO eligibility may still require Admin review
when payment, batch, or other guards apply. Post-PO handling records recoverable
IDR of zero, partial, or full as appropriate. Defect replacement is preferred;
financial adjustment never rewrites the original order, invoice snapshot,
payment history, or deposit history.

## Refunds

`refund obligation ≠ cash payout`.

Obligations are separate from payout records. Payout status is
`pending → processing → paid` or `failed → retry`, supports partial settlement,
does not overpay, and never hard-deletes history. Deposit refunds are limited to
unallocated available deposit.

## Notifications

Notifications are event-backed attention receipts with recipient ownership,
event type, safe copy, destination, related entity, creation time, and `readAt`.
They never replace canonical order/invoice/payment state and never contain
credentials, access codes, or digests.

`Aktivitas` is one newest-first customer/Admin feed projected from both
surfaces. Each item carries a compact `Sistem` or `Pesan BFG` label for context;
the user does not choose a category before reading activity. `Notifikasi` means
automatic system/state events such as invoice, payment, or Batch updates.
`Kotak Masuk` means persistent operational messages from BFG. The UI projection
is unified, but backend tables, queries, ownership, retention, and read
semantics remain separate.

## Inbox

Inbox is a persistent operational message surface sourced from real submissions
and workflow events. It is not social chat: no presence, typing, reactions,
rooms, or arbitrary attachments are in scope. Customer ownership is enforced.
The unified Aktivitas presentation does not merge the Notification and Inbox
data models. Existing Inbox routes remain compatibility/deep-link surfaces, not
a second primary Activity destination.

## Admin Users / Access

Owner can invite Admin staff, change roles, suspend, and reactivate through
server-authorized mutations. Owner-only operations remain Owner-only. No BFG
password/token is stored; Clerk handles identity.

## Audit / Activity

Privileged, financial, admission, access, media, and state-changing actions
write safe metadata to immutable `auditEvents`. Customer-facing Aktivitas is
not a fabricated audit feed; it is backed by Notifications and Inbox events.

## Visual System

The visual contract is documented in
[`BFG-VISUAL-SYSTEM.md`](implementation/BFG-VISUAL-SYSTEM.md). Canonical shared
primitives include `SiteShell`, `AdminLayoutShell`, `AdminNav`, `BrandLogo`,
`BookCover`, `CoverUploadField`, page-aware skeletons, shared
buttons/cards/fields/status badges, `WorkspaceActivityProvider`, and the
mobile bottom navigation.

### Permanent visual contracts — Phase 08 post-closure stabilization

- **How To Order:** the canonical seven business steps remain one shared data
  set; desktop uses a connected seven-step journey, mobile/tablet use a
  readable vertical timeline, and all icons use one normalized semantic outline
  family.
- **Perjalanan Bukumu:** the three orientation steps remain one compact grouped
  tool inside a narrower internal wrapper; the page container is unchanged.
- **Mengenal BFG:** `Satu cerita, beberapa langkah kecil.` uses the canonical
  high-contrast primary heading hierarchy on the approved surfaces.
- **Book Cover:** the original uploaded media remains untouched; optional
  `{ zoom, x, y }` presentation metadata controls framing inside the canonical
  cover card without distortion or a second destructive source image.

## Responsive Rules

- Customer mobile: logo-only top header; bottom primary navigation; no desktop
  header control return. The full-width Aktivitas surface and the Account hub
  are discoverable under Akun, with a small data-backed unread dot on Akun when
  either source has unread records. Account sign-out uses Clerk's supported
  flow and the fixed bar receives page-bottom safe-area clearance.
- Customer desktop: coherent one-row header with logo, primary nav, Aktivitas,
  and avatar; its anchored panel is bounded to the viewport, vertically
  scrollable, and never horizontally scrollable.
- Admin desktop: one-row operational header with no wrapping at supported
  widths; `Lihat sisi pelanggan` remains one line and Activity/Avatar remain in
  the same action cluster. Activity uses one viewport-measured, bounded
  anchored panel; narrow Admin widths use the same safe bounded panel rather
  than an escaping popover.
- Book Detail: `COVER BUKU` uses a real aspect-ratio preview and
  `CoverUploadField` custom trigger over an accessible visually-hidden native
  file input. The canonical storage/upload consequence is unchanged.
- Skeletons preserve ready-state page geometry and use page-aware anatomy.
- Touch targets and readable empty/loading/error/success states are required.

### Activity responsive geometry contract — Phase 08

`Aktivitas` is one unified chronological feed. Notification and Inbox remain
separate backend sources, projected as `Sistem` and `Pesan BFG` metadata in the
same newest-first presentation.

- Desktop uses a viewport-bounded anchored panel. Its preferred width is 380px,
  clamped to the actual visual viewport with 12px safe gutters; the whole
  panel shifts left when the trigger is near the right edge.
- Tablet keeps the bounded anchored panel while it fits; the same measured
  geometry supplies a safe bounded mode when the trigger/window has less room.
- Mobile customer Activity is a full-width surface reached through
  `Akun` → `Buka Aktivitas`; the customer top header remains logo-only and the
  five-item bottom navigation remains visible.
- The open panel recalculates on open, resize, visual-viewport changes, scroll,
  and anchor-size changes. Its height is capped by the real viewport and its
  feed scrolls vertically inside the panel.
- Activity content is never removed, clipped, or shortened to fit. Panel,
  content grid, item cards, flex children, descriptions, references, and action
  buttons use shrinkable tracks, normal wrapping, and safe reference wrapping.
- Activity, its feed, its item cards, and the page must have zero horizontal
  overflow because their geometry fits; `overflow-x: hidden` is not the fix.

## Official Brand Assets

Canonical logo is `public/brand/logos/Logo-1` (official BFG multicolor mark).
Approved mascot assets are `public/brand/logos/Mascott-1.png` through
`Mascott-4.png`; use them only in approved onboarding, guidance, selected
empty/help, or brand placements. Logo-2/3/4 are retained asset variants, not
the canonical primary mark. No legacy logo, random mascot, or mockup sample
business data is product authority.

## Explicit Exclusions

- Payment gateway or automatic bank settlement.
- WhatsApp Business API automation, unofficial automation, automated blasts,
  and machine-driven message sending.
- Full social chat/presence/reactions.
- Public self-signup.
- Native mobile apps, marketplace/multi-tenant/seller features, loyalty,
  referrals, gamification, automated supplier procurement, customs/shipping
  automation, full page-builder CMS, advanced accounting/tax, and automatic FX.
- Fake analytics, fake notifications, dummy Production business data.

## Superseded Decisions

Full entries are in [`DECISION_LOG.md`](DECISION_LOG.md). The active
supersessions are:

- conceptual `operator` role → current `customer/admin/owner` contract;
- authenticated-only Secret Catalog entry → hybrid secure code session plus
  member grant;
- anonymous-only Secret Catalog management → Admin-visible code and member
  access management;
- Shared Access Period plus manual period code → one current secure generated
  Secret Catalog code for all Catalogs eligible under the existing access
  contract;
- open Ready Stock contact/CTA-only behavior → canonical order/reservation;
- raw external cover URL as the only operator media path → validated durable
  storage upload;
- old eight-card How To Order composition → current continuous seven-step
  journey;
- old reports that said Phase 07.1 was blocked → current supplied stable
  Production baseline and exact current local counts.

## Deferred / Future Work

Only source-supported work appears in
[`BFG-PHASE-08-CANDIDATES.md`](implementation/BFG-PHASE-08-CANDIDATES.md):

- advanced analytics beyond the current bounded operational report;
- Bulk Import V1 is implemented and Production-deployed; its legitimate
  Production pilot is deferred by explicit user decision and final acceptance
  is not claimed.
- Product Media V1 is implemented and deployed; populated Gallery/Preview UAT
  is `BLOCKED_BY_APPROVED_DATA` because no approved asset or HTTPS URL exists.
- broader backup/restore operations beyond current bounded export;
- cross-domain Admin search.

Advanced analytics, custom backup/restore operations, and cross-domain Admin
search are explicitly `OPTIONAL_FUTURE`; they do not block current-product
completion. Bulk Import V1 is implemented and deployed, while its 3–5-book
pilot is `DEFERRED_BY_USER_DATA` and must not be fabricated.

The excluded integrations above are not Phase 08 candidates.

## Development System V2

The permanent workflow is:

`SOURCE CONTRACT → VISUAL CONTRACT → TRACEABILITY CONTRACT → CODEBASE MEMORY
→ STATE MACHINE → @ponytail → TDD RED/GREEN/REFACTOR → RENDERED QA → REAL FLOW
QA → CODEBASE MEMORY POST-DIFF → @ponytail FINAL REVIEW → FULL REGRESSION → main
→ Vercel/Convex Production → REAL PRODUCTION ACCEPTANCE → ANCHORED CONTEXT`.

No source trace means no implementation. No mockup trace means no visual pass.
No backend consequence means no functional pass. No real flow means no product
pass. No Production acceptance means no phase closure.

For every substantial task, context must state: `OBJECTIVE`, `CURRENT STATE`,
`SOURCE OF TRUTH`, `DECISIONS MADE`, `SUPERSEDED DECISIONS`, `CONSTRAINTS`,
`OPEN QUESTIONS`, `BLOCKERS`, `CURRENT PRIORITY`, and `NEXT ACTION`.

Bug closure is: reproduce → trace source and blast radius → RED regression →
fix → GREEN → return to the original journey → inspect every affected surface
→ rendered QA → Production QA → close. A skeleton changing to an error is not
closure unless the intended product state is restored. A visual fix must trace
the shared primitive and render every consumer.

Completion reports must separate `IMPLEMENTED`, `LOCAL VERIFIED`,
`PRODUCTION DEPLOYED`, `REAL PRODUCTION VERIFIED`, `BLOCKED_BY_DATA`, and
`BLOCKED_EXTERNAL`. `DONE` is reserved for the relevant layers that actually
passed.

Before any future phase, create a Phase Source Contract with objective, source
requirements, baseline, exclusions, dependencies, rules, security, visual
source, deliverables, success criteria, and Production acceptance. A phase may
close only after source trace, logic/state/authorization tests, rendered QA,
Production deployment, applicable real flow verification, and context update.

## Current Test Baseline

Vitest `237/237`; Convex `111/111`; local Playwright `214/214` after the new
responsive contracts; live targeted visual suite `18/18`, homepage/How To Order
smoke `12/12`, and Ready Stock smoke `6/6`; rendered screenshots at the required
widths; TypeScript, ESLint, format, build, and `git diff --check` all PASS.
Data-limited cover UAT is classified explicitly and is not treated as a reason
to fabricate Production media.

## Current Production Infrastructure

Clerk is the identity provider, Convex is the domain/data authority, Vercel is
the Production web delivery layer, and `https://www.blessingforgood.com` is the
canonical public domain. Development and Production Convex deployments remain
`content-snake-214` and `clean-eel-522`. Environment separation and no-dummy-data
policy remain mandatory.

## Current Open Questions

There are no unresolved material source conflicts for the completed Phase 07.1
baseline. The following are deliberately bounded future decisions, not current
implementation blockers:

- exact advanced analytics dimensions and retention;
- exact gallery/preview metadata contract, including canonical ownership,
  projection, and external URL allowlist;
- exact backup/restore operational procedure;
- cross-domain Admin search scope and indexing.

Bulk Import mapping, rollback, duplicate, file, publication, stock, catalog,
and audit policies are resolved in the prepared Phase 08 Source Contract. The
remaining items are future contracts, not current implementation blockers.

## Phase 08 Client UAT Canonical Amendments — 2026-08-19

The original PRD remains historical contract evidence. The additive product
decisions for the current Client UAT are recorded in
`context/product/PRD-CLIENT-AMENDMENTS-2026-08-19.md`.

- **Content** controls approved public informational copy for Community, How To
  Order, and Help. It is not a generic CMS. **Settings** controls bounded
  operational store/contact/manual-payment configuration only.
- **Batch targeting** is assignment-based: Admin selects customers through
  eligible submitted order items. The roster is the resulting customer/item
  projection, editable before the first shipment stage and locked afterward.
- **Batch item assignment** uses the canonical order-item assignment mutation;
  add, quantity change, remove, and move are allowed only while editable.
- **Purchase Summary** is derived from roster assignments by book variant and
  customer count. It is not independently editable.
- **Order references** shown to people are stable BFG display codes. The
  Convex order ID remains the internal ownership/database identity.
- **Activity** is one UI entry containing two semantic streams: Notifikasi is
  system-event information; Kotak Masuk is persistent operational messaging.
  Backend tables and authorization semantics remain separate.
- **Admin responsive navigation** uses the same canonical navigation groups on
  desktop and tablet/mobile; Pengguna, Log aktivitas, and Pengaturan cannot be
  lost to horizontal clipping.
- **Settings V1** preserves store name, WhatsApp, and payment instructions and
  may add only consumed support/contact/manual-bank fields. Owner permission,
  validation, and safe fallbacks remain required.
- **Homepage slide decision:** swap the approved green background assignment
  between slide 1 and slide 3 without changing copy, order, layout, or motion.

## Anchored Summary

### Source of Truth

This file plus the linked matrices and invariant indexes.

### Current Production

Phase 08 final product scope remains stable on the canonical domain after the
targeted visual stabilization. Phase 09 initial read-only public smoke is
verified on Vercel deployment `dpl_8tZaUD7jxYxg96N6NhYZzCjmUwtU` (`READY`),
with Convex Production `clean-eel-522`. The current full local Playwright
matrix is `264/264`; direct Convex CLI health access remains `NOT VERIFIED`.

### Final Decisions

Hybrid Secret Catalog access, server-authoritative admission/RBAC/ownership,
canonical Convex financial state, Ready Stock reservations, append-only
exceptions/refunds/ledger, and Indonesian-first responsive shells.

### Completed

Phase 07.1 product surface stabilization, Phase 08 scope implementation,
post-closure visual stabilization, source reconciliation, operational surfaces,
test baseline, deployment baseline, and final public Production recheck.

### Active

`PRODUCT_MODE: MAINTENANCE` with Development System V2 retained for bug fixes.

### Deferred

Only the source-supported candidates listed above.

### Superseded

Historical conceptual routes, role wording, Secret Catalog-only models, old
visual compositions, and stale completion reports where explicitly listed.

### Blockers

No known implementation, responsive, security, ownership, financial-invariant,
or source-defined required-feature blocker. Approved-data and operational-data
limits remain explicitly classified and do not block current-product stability.

### Test Baseline

Vitest `241/241`; Convex `111/111`; Playwright `264/264`; responsive widths
`375/390/430/768/834/1024/1280/1440`; TypeScript, ESLint, Format, Build, and
`git diff --check` PASS. No dummy Production records were created.

### Next Milestone

Monthly maintenance review and client-driven defect handling only. Phase 09 is
active maintenance; do not open a new feature phase without a genuine approved
business requirement.

## Phase 08 Post-Closure Visual Stabilization — 2026-08-21

- Phase 07.1: **CLOSED + RECONCILED**.
- Development System V2: **ACTIVE**.
- Phase 08: **COMPLETE — TARGETED VISUAL STABILIZATION RE-CLOSED**.
- Bulk Import V1: **IMPLEMENTED + PRODUCTION DEPLOYED**.
- Bulk Import Production pilot: **DEFERRED BY USER**.
- Bulk Import final Production acceptance: **DEFERRED_BY_USER_DATA**.
- Homepage, How To Order, and Ready Stock public Production recheck: **PASS**;
  targeted visual suite `18/18`, homepage/How To Order smoke `12/12`, and Ready
  Stock smoke `6/6` across the configured widths.
- Cover presentation: **GREEN_DETERMINISTIC_NO_SAFE_REAL_DATA**; original
  storage preservation, metadata validation/projection, reset, persistence,
  authorization, and legacy defaults are covered without fabricating a live
  cover or mutating Production business data.
- Product Media source decisions: **LOCKED**; populated Gallery/Preview UAT is
  `BLOCKED_BY_APPROVED_DATA`, with implementation and empty states green.
- Product status: `BFG_CURRENT_PRODUCT_SCOPE_COMPLETE`,
  `BFG_PRODUCTION_STABLE`, `PRODUCT_MODE: MAINTENANCE`.
