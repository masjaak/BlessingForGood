# BFG Project Status

## My Books UI, preorder name autofill, and Catalog ordering — 2026-09-02

Status: `IMPLEMENTED LOCALLY; AUTHENTICATED PRODUCTION UAT PENDING`

The active scope is a smallest-safe-diff polish of the Customer Buku Saya,
invoice summary, Batch list/detail, and Secret Catalog preorder form, plus
Admin Catalog drag-and-drop ordering. The existing `catalogItems.sortOrder`
field remains sufficient and is the only ordering authority; no schema
migration, duplicate drag field, or bulk upload is planned. The series
requirement is handled by a persisted destination position through the same
reorder mutation. The explicit handle supports pointer/touch, shows a drop
indicator, preserves scroll outside the handle, and keeps Naik/Turun as the
fallback. Reordering is disabled while the Admin list is search/Publisher
filtered so partial-list movement cannot corrupt global order.

Focused frontend/Convex tests, the existing regression suite (469 tests),
TypeScript, ESLint, format, build, Convex check, and the rendered static
spacing/interaction matrix at 390/768/1440 pass. Authenticated route UAT remains a separate gate when safe
Clerk identities and disposable business fixtures are available; the local
Next route probe is blocked by the environment's missing Clerk publishable key.
Customer-facing display/accessibility copy is now canonical `Blessing For Good`;
SEO metadata and protected historical/identifier wording remain unchanged.

## Invitation terminal-success precedence hotfix — 2026-09-01

Status: `IMPLEMENTED_LOCALLY; AUTHENTICATED_PRODUCTION_UAT_PENDING`

Real Production evidence exposed a false terminal failure: the new Customer
completed Username/Password and could later log in, but a stale Clerk
finalization/ticket result left the invitation page on `Aktivasi belum selesai.`
The acceptance component now treats an already-started completion plus a
verified current identity and active BFG Customer membership as terminal
success even when Clerk has cleared the invitation email. Late invitation
errors cannot reverse that state. No Convex source or membership authority
changed.

The historical first wrong boundary remains the `cda2890` existing-Clerk-
identity admission branch; the current race owner is the acceptance
component's no-email active predicate versus its late `phase="error"` writes.
The format extension adds six variant values through its existing owners;
existing `BB`, `PB`, and `HB` remain valid.

Focused auth/format tests, full deterministic suites, build, Convex check, and
the non-mutating fake-ticket Production check at 390/768/1440 pass. Real
invitation, wrong-account, Remove→Reinvite, future-login, and authenticated
Production UAT still require an approved disposable Clerk QA identity and
mailbox; no business data was created.

## Final client contract — My Books 2.0 / Customer × Batch Pool / Admin Users / Book Hard Delete — 2026-08-31

Status: `IMPLEMENTED_AND_DEPLOYED; AUTHENTICATED_PRODUCTION_UAT_PENDING`

The requested implementation is present in the canonical Order, Batch,
Invoice, Auth/RBAC, membership, and Book Master boundaries. Focused tests cover
percentage conversion, Batch pooling/all-item search, Customer-only
cancellation denial, assisted Customer search, Customer × Batch invoice
uniqueness and idempotent issue, Admin role/status/member actions with Owner
protection, and ordered/active/issued-invoice Book deletion compatibility.

The current source contract is: Customer sees one pooled context per Batch;
Admin retains historical Orders; new invoice identity is Customer × Batch with
explicit Admin issuance; Total Spending is committed selling value rather than
cash paid; active Admins manage normal active non-owner users; and hard delete
removes active Book Master data without deleting immutable transaction truth.

Authenticated Production Admin/Customer QA and real business UAT remain open
until safe Clerk QA identities and approved disposable deletion fixtures are
available. No Production business write is authorized merely to create UAT
evidence. Commit `ecd4dece` is live through the Git-integrated Vercel
Production deployment `6180999646`; the canonical domain returns HTTP 200 and
the configured release path targets Convex Production `clean-eel-522`.

## 750 public performance + Admin System RBAC follow-up — 2026-08-31

Status: `PARTIAL_IMPLEMENTATION; PERFORMANCE_CONTRACT_NOT_MET; AUTHENTICATED_PRODUCTION_UAT_PENDING`

The measured public request path was reduced at two application-owned
boundaries: public routes no longer run Clerk middleware, and Ready Stock now
uses one-minute ISR for its initial projection. Route-level harness summaries
and Production logs confirm the profile is serving static cache hits, but the
latest same-profile 750 run still measured 1,166 requests at 336.12 RPS,
p95 3,147 ms, p99 3,232 ms, and 0% errors. The p95 contract therefore remains
open; detailed Vercel queue/function metrics are unavailable
(`payment_required`). No sustained 750 or 1,000 run was launched.

Active Admins now receive `Pengguna`, `Pengaturan`, and `Log Aktivitas` through
canonical role/capability authority. Admin user reads and eligible status
operations work in Convex tests; operational settings are Admin-accessible;
role/invitation/revocation and Owner-target operations remain Owner-only.
Owner transfer was not performed and remains a separate future operation.

Local frontend/Convex suites, TypeScript, ESLint, format, build, and Convex
checks pass in isolated runs. Signed-out Production protected-route checks
pass. Authenticated Admin A/B, Owner, and Customer Production UAT remains
pending without safe Clerk QA credentials.

The detailed evidence is in the existing performance, security, and codebase
memory documents; the preceding 2026-08-31 capacity entry remains historical.

## Historical baseline — concurrent load & capacity validation — 2026-08-31

This baseline is preserved for comparison; the current ticket status is the
follow-up section above.

Status: `NOT_YET_PROVEN_FOR_1000_CONCURRENT_USERS`

The safe public HTTP read profile was revalidated against canonical Production
at 1/5/10/100/250/500 users. The 500-user stage reached 429.68 measured RPS
with p95 1,143 ms, p99 1,233 ms, and 0% HTTP errors. The latest 750-user
stage had 0×429, 0×5xx, and 0% request errors but p95 2,264 ms, so the harness
stopped before 1,000. Maximum proven public read-heavy concurrency is 500; 1,000
active authenticated users and the Close PO mix remain unproven.

Protected Convex fixtures now cover 25 concurrent preorder writes: 25 orders,
25 items, 25 unique references, and 25 correct single-Batch assignments, with
no lost, duplicate, cross-Catalog, or ownership error. No Production write,
application bottleneck fix, provider-plan change, or authenticated QA identity
was introduced. See the canonical performance contract and load report.

## 1000+ Batch scale, pagination, cost basis, and Admin System access — 2026-08-31

Status: `IMPLEMENTED_AND_DEPLOYED; AUTHENTICATED_PRODUCTION_UAT_PENDING`

The previous 200-item Catalog→Batch backfill ceiling is superseded by an
idempotent 100-item cursor continuation over order items. A 1,000-Customer /
2,000-item fixture completes with zero duplicates and zero cross-Catalog
writes; interruption/resume and Batch-lock revalidation pass.

Batch recap/roster, unassigned work, Customers, Orders, and Exceptions now use
bounded Convex pages with BFG-native 10/25/50/100 controls and a 25 default.
The recap's `Harga modal (GBP)` reads canonical
`bookVariants.supplierPriceGbpMinor` integer pence; no FX or formula was
introduced. Cross-Catalog invoices remain separate.

The System nav/audit root cause was Owner-only scope, not the primary email.
Active Admins now receive the read-only audit System surface via canonical
role/capability authority; Owner-only settings/users and sensitive operation
guards remain protected. Full local regression, build, Convex check, and
390/768/1440 rendered pagination QA pass. Production deployment and
authenticated UAT remain separate gates. Commit `571bcae` is live through the
Git-integrated Vercel Production deployment
`52t1CV6Fwqah8znMESKS4FfihNEv`; its configured build command also deploys the
linked Convex Production project `clean-eel-522`. Canonical `/` returns HTTP
200, and signed-out Batch/Audit/Orders routes correctly redirect to Clerk.
Signed-out Production smoke is 39/40; the one failure is the pre-existing
stale `Kode akses katalog` assertion against current `Kode akses Secret
Catalog` copy. No authenticated QA credential is available in this workspace,
so real Admin-vs-Admin and non-Admin Production UAT remains pending.

## Adaptive natural-ratio book cover frame — 2026-08-30

Status: `IMPLEMENTED_AND_DEPLOYED; AUTHENTICATED_PRODUCTION_UAT_PASS`

The remaining cover defect is fixed at the shared geometry owner. Image-backed
`BookCover` wrappers now follow the uploaded image's intrinsic ratio with
normal-flow `width: 100%` / `height: auto`; the wrapper no longer uses a
universal 2:3 ratio and no longer stretches with grid rows. Full image,
no-crop, no-distortion, and no-artificial-letterbox behavior is covered by the
200x300, 684x937, 600x1000, 800x800, and 1200x700 fixture matrix.

Admin preview, Secret Catalog detail, Ready Stock detail, Catalog cards, and
Ready Stock cards use the shared fix. Upload, storage, schema, projection,
search, access, variants, price, quantity, order, and ProductGallery paths did
not change. Local rendered QA passes at 390/768/1440; 75 frontend files / 436
tests, 30 Convex files / 188 tests, TypeScript, ESLint, format, build, and diff
checks pass. Commit `0b6d728` is live in Vercel Production; GitHub reports the
deployment complete at
`https://vercel.com/masjaaks-projects/blessing-for-good/FTE6XgijmQtS1cWLVQuxz3yQv1hn`.

Signed-out Production smoke passed 39/40 across customer 390 and admin 1280.
The remaining failure is the pre-existing stale Catalog copy assertion.
Authenticated real-cover Production UAT passed with real Production book media.
Admin Book cover preview and Secret Catalog Book Detail follow the uploaded
image's natural aspect ratio with no top, bottom, left, or right artificial
letterbox gap, crop, or distortion. Catalog cards and Ready Stock surfaces
remain visually stable; Gallery thumbnails remain unchanged and green. Upload,
access, search, variants, and ordering remain green.

FINAL VERDICT: CLOSED

## Book cover auto-fit + gallery thumbnail rendering — 2026-08-30

- **SUPERSEDED for image-backed cover geometry:** this prior entry documented
  contained artwork inside a universal frame. Gallery thumbnail behavior stays
  unchanged.
Status: `IMPLEMENTED_AND_DEPLOYED; AUTHENTICATED_PRODUCTION_UAT_PENDING`

The shared `BookCover` renderer now shows the full uploaded image in the
existing consistent cover frame with preserved aspect ratio and no default
transform/crop. The Admin cover surface no longer exposes manual zoom/position
controls. `ProductGallery` keeps its existing navigation while thumbnail
buttons use normalized image height and intrinsic image-ratio widths, reducing
empty side-space for portrait uploads without distorting landscape or square
assets.

No upload, storage, schema, projection, search, access, variant, price,
quantity, or order logic changed. The portrait/square/landscape rendered matrix
passes at 390/768/1440; the full frontend suite is 75 files / 436 tests and
the Convex suite is 30 files / 188 tests. TypeScript, ESLint, format, build,
and diff checks pass. Behavior commit `d87585d` is Ready in Vercel Production
as `dpl_3nkrZ6ibD7JgvqRiy5VhYFcDnX65`; the public customer surface check passes
9/9 at 390px. No separate Convex command was issued and no Convex source
changed, although the existing Git-integrated Vercel build remains configured
to include `convex deploy`. Authenticated real-media UAT remains pending because
no authorized Clerk session or safe Production image fixture was available.

## Catalog UI polish and adaptive format presentation — 2026-08-30

Status: `IMPLEMENTED_AND_DEPLOYED; AUTHENTICATED_PRODUCTION_UAT_PENDING`

The Customer Book card now presents one eligible format as static metadata and
two or three eligible formats as compact quiet choices. The existing selected
variant drives the single header price, while detail navigation, quantity, and
order payload behavior remain unchanged. Scoped Catalog Admin settings,
Book Picker, and current-Catalog discovery geometry uses the existing grid and
spacing system; no business or search owner changed.

Focused component and rendered 390/768/1440 checks pass. Commit `a96feb0` is
deployed as Vercel `dpl_FuFKC9pre5SqSJCFNsZ3z9Kqmaga` and aliased to the
canonical domain through prebuilt frontend output. Convex was not deployed
because no backend source changed. Authenticated Customer/Admin UAT remains
pending because no authorized Clerk session or safe business fixture is
available; no Production data was introduced. Selected signed-out Production
smoke passed 39/40 routes; the one failure is an existing stale assertion for
`Kode akses katalog` while the current source copy is `Kode akses Secret
Catalog`, and was not changed in this UI ticket.

## Secret Catalog Production UAT bugfix — 2026-08-30

Status: `IMPLEMENTED_AND_DEPLOYED; AUTHENTICATED_PRODUCTION_UAT_PENDING`

Production UAT isolated the remaining customer defect at the global unlock
initial-Catalog boundary. A generated global code now starts on its source
Catalog when eligible, while retaining the full eligible Catalog selector and
server-side Catalog scoping. The Customer safe projection, title/ISBN search,
Publisher filter, Book Detail, and order flow were not rewritten.

The Admin copy action now waits for `navigator.clipboard.writeText` before
showing `Kode akses berhasil disalin.`; failures show
`Kode akses gagal disalin. Coba salin secara manual.` with no false success.
Scoped Catalog settings alignment is owned by the existing CSS grid/subgrid
rule; access/member/discovery layout primitives remain unchanged, and all
touched Catalog selects use BFGSelect.

Local focused and full regression gates pass, including the Convex projection
regression, copy success/failure/ARIA tests, BFGSelect assertions, rendered
390/768/1440 form geometry, 75 Vitest files / 434 tests, TypeScript, ESLint,
format, build, and Convex check. Commit `14e6f105af4483e5a499e5fc494f14b107648710`
is deployed as Vercel `dpl_CHkP7dRoSs4p2He6jUAWfPaZLviA`, aliased to the
canonical domain; its configured build deployed Convex Production
`clean-eel-522` with no deleted indexes. Post-deploy public checks include the
canonical route shell, Catalog gateway, BFGSelect, and 26/28 selected public
smoke checks; two existing checks remain unrelated baseline failures (stale
Catalog copy assertion and an empty Ready Stock cover selector). Authenticated
Production UAT still requires an authorized Clerk session and safe business
fixture; no credentials or Production records were introduced.

## Secret Catalog access simplification and form alignment — 2026-08-30

Status: `IMPLEMENTED_AND_DEPLOYED; AUTHENTICATED_PRODUCTION_UAT_PENDING`

The active Admin access path now has one generated Secret Catalog code concept:
the existing secure generator creates a global gate for currently eligible
open/unexpired Catalogs. The period form and period mutations are removed from
the active path. Historical per-Catalog code rows, period rows, and valid
period-scoped sessions remain compatibility data where existing guards need
them; global-code access does not require period relations. Catalog
authorization, active-membership/order guards, search/discovery, Book Detail,
variants, Batch, Ready Stock, and the existing anonymous scoped session
mechanism remain unchanged.

Focused access/UI tests and the full Convex/frontend suites pass locally;
TypeScript, ESLint, formatting, build, Convex check, diff, and the rendered
form fixture pass at 390/768/1440. Commit `42339ab3f493f7588ce9fa169a18a39937a33483`
is deployed as Vercel `dpl_CcQAaYQCH32oiKy7zoPR3ARqaGk6`, aliased to the
canonical domain; the configured build path deployed Convex Production
`clean-eel-522` with no deleted indexes. Public smoke checks pass. Authenticated
Admin/customer Production UAT remains pending because no authorized Clerk
session or safe business fixture was available. No credentials or Production
business data were introduced.

## Admin action and deadline tuning — 2026-08-29

Status: `IMPLEMENTED_AND_DEPLOYED; AUTHENTICATED_PRODUCTION_UAT_PENDING`

Confirmed frameless Admin mutation/lifecycle controls now use the existing
framed `secondary` or `danger` Button variants; navigation, support, reset,
dialog-cancel, and icon controls remain unchanged. Catalog and Batch deadline
inputs/displays use a calendar date while raw UTC timestamps remain stored.
The shared Catalog-to-Batch guard compares `closesAt` and `poDeadlineAt` by
`Asia/Jakarta` calendar date, preserving all other eligibility, lifecycle,
authorization, and Customer cutoff rules.

Commit `a3200dd58063218d3a1fa5359614e0ccec2f427a` is on `main` and
`origin/main`. GitHub/Vercel reports Production deployment
`blessing-for-good-8k0r02k1s-masjaaks-projects.vercel.app` as completed, with
the configured build path deploying the changed Convex functions to
Production `clean-eel-522`. Live homepage, public Ready Stock, robots, and
sitemap checks return expected responses; signed-out Admin Catalogs and Batch
routes redirect to Clerk sign-in. No Production business record was mutated.

Local deterministic gates pass. Local authenticated rendered QA is blocked by
the absent local Clerk publishable key, and authorized Production Admin UAT for
the button appearance and same-day Catalog-to-Batch link remains an operator
gate; no credentials or fake records were introduced.

## Minor stability tuning — 2026-08-29

Status: `IMPLEMENTED_AND_DEPLOYED; AUTHENTICATED_PRODUCTION_UAT_PENDING`

The GBP supplier-price input now accepts up to two decimal places with safe
comma-to-dot normalization while preserving integer-pence storage. Archived
Secret Catalogs can be restored to Draft through one authorized mutation on the
same Catalog entity. The affected Book Master variant-create grid was locally
aligned using its existing CSS system and breakpoints.

Commit `e7d9708faa621f0586817b442d20d603550129de` was deployed to Vercel
Production as `dpl_3Rw3yCAD4nw1f98oHxhwCV1JUvX3`; the existing deployment wrapper
also validated/deployed Convex Production `clean-eel-522`. Live robots, sitemap,
public HTTP, and public book HTML checks pass. Authorized Admin production UAT
for decimal save/reload, archived Catalog restore, and visual checks at 390,
768, and 1440 pixels remains pending because no authorized session or safe
fixture was available; no Production business data was mutated.

## SEO/PSEO/GEO discovery foundation — 2026-08-28

Status: `IMPLEMENTED_AND_DEPLOYED; SEARCH_CONSOLE_PENDING`

The public search foundation is implemented without changing Auth, Clerk,
Ready Stock business semantics, Secret Catalog authorization, Batch, Book CRUD,
finance, or customer data exposure. The canonical domain is
`https://www.blessingforgood.com`. `src/app/robots.ts` is the only robots
authority and `src/app/sitemap.ts` is the only sitemap authority. Public
homepage, Ready Stock, useful informational pages, and real public Ready Stock
book pages are crawlable/indexable; private/auth/admin/Secret Catalog surfaces
are noindex and excluded from the sitemap. `OAI-SearchBot` is allowed on public
content through the public rule set.

The existing public Ready Stock projection is the only PSEO source. Public book
pages now server-render real title/details, return 404 for unknown slugs, and
emit route metadata plus factual Product and Breadcrumb JSON-LD. No author,
publisher, category, spelling-variant, filter, or keyword-swapped landing pages
were generated. No truthful public update timestamp exists, so sitemap
`lastModified` is omitted.

Focused and full checks are green: 71 Vitest files / 404 tests, Convex check,
TypeScript, ESLint, Format, build, audit, and diff checks. Commit
`27267b5a02ab8990cbe527fa3cb0c5369358ac90` is deployed to Vercel Production as
`dpl_E9QURZTanU7Bo4GjkvjPLwBN333E`; live robots, sitemap, public-page,
structured-data, and unknown-book 404 checks pass. Search Console verification
and sitemap submission must be completed by an operator; no indexing or
search-volume result is claimed here.

## Homepage Open Graph metadata — 2026-08-28

Status: `IMPLEMENTED_AND_DEPLOYED`

The homepage root metadata in `src/app/layout.tsx` now owns the canonical BFG
title, description, production canonical URL, Open Graph website metadata, and
Twitter/X `summary_large_image` metadata. Both social systems reference the
same approved static asset at `public/opengraphimageBFG.png`; no dynamic image
generator, logo/mascot change, route metadata expansion, auth change, Convex
change, or business-logic change is part of this ticket.

The asset was discovered at the local BFG source folder, verified as an
untouched `1672×941` PNG, and copied byte-for-byte into the current repository.
Focused metadata coverage is green; the full frontend and Convex suites,
TypeScript, ESLint, Format, build, audit, Convex check, and diff checks pass.
Production commit `c8abf1437fa1611fda6e83a77df9ccbc610178c9` is deployed by
Vercel. The canonical homepage emits the absolute image URL
`https://www.blessingforgood.com/opengraphimageBFG.png`, and that URL returns
HTTP `200` with `image/png`; its live SHA-256 matches the approved local file.

## Canonical invitation onboarding and final activation P0 — 2026-08-28

Status: `IMPLEMENTED_AND_DEPLOYED; AUTHENTICATED_PRODUCTION_UAT_PENDING`

The current worktree restores the canonical lifecycle: Admin approval always
sends/reuses one BFG onboarding handoff to `/accept-invitation`, regardless of
Clerk identity existence. New identity signup, existing identity sign-in,
already-authenticated completion, and wrong-account recovery are auth
subflows inside that same admission journey. The former
`Clerk user exists → sign_in_required → Admin login button` router is gone.

The final activation boundary is explicit: after `Lengkapi akun` succeeds,
Clerk must expose a real active session and verified primary email; the root
Convex provider must become auth-ready; `users.ensureCurrentUser` must resolve
the current approved non-removed admission; and the existing canonical
reconciler must persist `appUsers.role=customer,status=active`. Only then do
Admin and Customer surfaces project `Aktif`/active.

The remaining post-success defect was isolated at the acceptance component's
old redirect/render boundary. Its redirect required `phase=finishing` or
`sameSessionInvite`, while a Clerk resource/effect refresh could leave the
route in `form` or `error` after the same Customer was already active. The
fatal branch then won and an old ticket could be evaluated again, producing
the recorded account-mismatch and consumed/expired-invitation screens. The
repair adds one latched `active` terminal state based on canonical active
Customer membership and the verified invitation identity, blocks all late
ticket/error/timeout writers, clears the invitation correlation marker, and
uses `router.replace("/account")`. Known conflicting invitation targets still
use the existing wrong-account guard.

The latest Production sign-in recording identified the remaining first wrong
boundary in the existing-identity handoff: the embedded Clerk `SignIn` was
mounted with path routing on the single `/accept-invitation` page, so the
non-complete `signIn.ticket` state had no reliable same-page continuation. The
current repair uses Clerk hash routing only for that embedded sign-in branch and
returns successful sign-in to the same page as `__clerk_status=complete`. The
manual ticket/status gate and canonical Convex membership reconciler remain
unchanged; no second auth or membership system was added.

The follow-up `sign_in` repair preserves the exact Clerk Future resource that
accepted the ticket across an async Clerk refresh. `signIn.ticket` returns an
error envelope while the accepted resource exposes the updated status and
`finalize`; the continuation therefore reads and finalizes that same resource
instead of a possibly refreshed hook snapshot. A non-complete status remains
an actionable embedded Clerk sign-in continuation, and a pending session task
returns to that continuation rather than becoming generic activation failure.

The current P0 boundary is the companion `signUp.ticket` failure path. The
previous bare catch treated a rejected Clerk Promise as an activation failure,
even when the safe Clerk code (`form_identifier_exists`/`user_exists`) meant
that the existing-identity continuation was required. The correction applies
the same classifier to returned and thrown ticket errors, clears the fatal
state, and re-enters the existing same-route sign-in handoff. A successful new
identity ticket remains on the current `missing_requirements` → `Lengkapi akun`
path; no identity or membership lifecycle was added.

The regression was introduced by `cda2890`, which detected an existing Clerk
user before creating the current invitation, persisted `onboardingPath=sign_in`,
and replaced the normal Admin copy/action. The repair keeps the current
verified-email, session, Remove Member, Reapply, retry, and reconciliation
guards and changes only the premature routing boundary. Clerk's supported
`ignoreExisting:true` invitation option handles existing identities without
creating a duplicate Clerk user; pending handoffs are reused and explicit
resend remains the only replacement path.

Focused and full deterministic tests are green locally (`69 files / 398
tests`; Convex `29 files / 182 tests`). TypeScript, ESLint, Format, Convex
Development check, Production build, audit, and diff checks pass. Vercel's
Git deployment check for canonical commit `2071c369388aa669446b6419d193c9fb7e1bf3cb`
is successful (`4H54pzdUnqUtnkrzUeUbz9pNSShQ`) on the canonical Production
alias. The affected public fake-ticket recovery journey passes `8/8` at
375, 390, 430, 768, 834, 1024, 1280, and 1440 pixels and the canonical route
returns HTTP 200; that fixture never proves a valid invitation or membership
activation. The full unauthenticated public suite is `285 passed`, `8
data-limited cover assertions failed`, and `7 skipped`; those eight failures
are the same unrelated pre-existing cover fixture at the supported Customer
widths. Authenticated Clerk/Convex QA remains pending because no authorized
`BFG_E2E_CUSTOMER_EMAIL`, mailbox, or current Customer session is available;
no identity, invitation, mailbox, or business fixture has been fabricated.

## Removed member Admin list cleanup — 2026-08-27

Status: `IMPLEMENTED_AND_DEPLOYED; AUTHENTICATED_PRODUCTION_UAT_PENDING`

`joinRequests.listForAdmin` now returns current operational admissions only by
excluding requests with `removedAt` before its existing bounded result limit.
The removal mutation remains a tombstone-only write: the Join Request,
appUser, invitation history, and audit event are preserved. The separate
`users.findApprovedJoinRequest` resolver remains available to invitation and
membership reconciliation, so a new approved reapply request is still
activatable while the old removed request cannot reactivate membership.

Focused removal, reapply, and invitation-reconciliation regressions pass. Full
local deterministic gates pass. Vercel Production deployment
`dpl_EjkNaZvd6i4QsvjoRi8TziG3S8LT` is `READY` on the canonical aliases; its
existing build wrapper deployed the Convex change to Production `clean-eel-522`.
The affected signed-out Admin route smoke passed `3/3` at 1024/1280/1440, and
the public homepage smoke passed `3/3` at 390/768/1440.

Local Playwright cannot start because this checkout has no Clerk publishable
key. Authenticated Admin Remove Member, hard-refresh, and invitee completion
UAT remain pending because no authorized account/mailbox is available in this
runtime; no fake account or business data was created.

## Invitation acceptance P0 root closure — 2026-08-27

Status: `IMPLEMENTED_AND_DEPLOYED; AUTHENTICATED_PRODUCTION_UAT_PENDING`

The first incorrect boundary is now reproduced and covered: the previous
`/accept-invitation` effect cancelled its in-flight `signUp.ticket` continuation
when Clerk refreshed auth or the sign-up resource. Its one-shot ticket guard
then prevented retry, so the route never reached requirements, finalization, or
membership reconciliation. The fix keeps one per-ticket run alive, reads the
current Clerk signal after async boundaries, and drives explicit ticket,
requirements, verification, Protect, finalization, session, Convex, and active
membership states. It redirects only after the existing BFG `appUser` is
`customer/active`.

The installed Clerk contract is `@clerk/nextjs 7.8.0` (`@clerk/react 6.14.5`):
the implementation uses `signUp.ticket`, dynamic `missingFields` and
`unverifiedFields`, current verification strategies, Protect challenge support,
and `signUp.finalize`. The existing server-side Clerk subject/verified-primary-
email lookup and single canonical membership reconciler are unchanged. No
Remove Member, Book Delete, Batch, Ready Stock business logic, or other green
domain was modified.

Local evidence: focused invitation tests `13/13`, full Vitest `69 files /
373 tests`, TypeScript, ESLint, Format, Convex Development check, production
build, `npm audit --omit=dev` (`0 vulnerabilities`), and `git diff --check`
pass. Local rendered browser QA remains unavailable because this checkout has
no Clerk publishable key; the existing production-key boundary was preserved.

Production evidence: Vercel deployment `dpl_D17RfSmUraJqNNnSej6AWBf471zU`
is `READY` and aliased to `https://www.blessingforgood.com`; the canonical
Vercel build deployed Convex Production `clean-eel-522` without creating a
second project. The affected public
Playwright recovery check passed `5/5` at
375, 390, 430, 768, and 1440 pixels. A live fake-ticket trace reached
`SIGNUP_TICKET_START` and the configured Clerk Turnstile challenge; its
headless challenge cannot prove a legitimate invitee's completion, so no real
ticket acceptance or membership activation is inferred from that check.

Authenticated Production QA and real business UAT remain pending because no
authorized Admin/invitee session and mailbox for a new legitimate invitation
are available in this runtime. This ticket must not be marked closed until the
same real invitee proves Clerk completion, Convex authentication, active BFG
membership, Admin `Aktif`, `/account`, `/join`, Ready Stock, Buku Saya, and
Tagihan.

## Invitation missing-requirements submit correction — 2026-08-28

Status: `IMPLEMENTED_AND_DEPLOYED; PRODUCTION_AUTHENTICATED_UAT_PENDING`

The new real recording superseded the earlier ticket-spinner diagnosis. The
current failure is the `Lengkapi akun` submit boundary: the old handler
collapsed a returned or thrown Clerk `password`/`update` failure into the
generic `Aktivasi belum selesai` page. The deterministic RED reproduction
returned Clerk code `form_identifier_exists`; it stayed on the form only after
the fix, showed the safe username error, and successfully resubmitted the same
ticket.

The smallest behavioral correction keeps Clerk as the authority: it logs only
safe field names/state/error code and field, maps known validation codes to a
field-level message, keeps technical update failures retryable, resets
`submitting`, and re-reads the current Future resource before moving to more
requirements, verification, or finalization. The existing finalize → session
→ Convex → canonical membership reconciliation and current/removed admission
guards are unchanged. The password input is asserted as masked with
`autocomplete=new-password`; no password value is logged.

Local evidence: focused invitation tests `16/16`, full Vitest `69 files /
377 tests`, TypeScript, ESLint, Format, Convex Development check, production
build, `npm audit --omit=dev` (`0 vulnerabilities`), and `git diff --check`
pass. The affected local Playwright surface could not start because this
checkout lacks a Clerk publishable key.

Production evidence: Vercel deployment `dpl_8CfEewUKNSNDxLnpfAXG7GCKULSZ` is
`READY` and aliased to `https://www.blessingforgood.com`; its configured build
wrapper completed the production build and Convex Production deployment to
`clean-eel-522`. The protected public `/accept-invitation` smoke returned the
BFG route and loading surface without a 404. The affected Production
Playwright attempt was blocked before page launch by the host Chromium
permission error (`bootstrap_check_in`, code 1100), so it provides no
authenticated application result. No production invitee, mailbox, or business
fixture was fabricated; authenticated Production UAT remains open until an
authorized operator supplies a legitimate new invitation journey.

## Membership removal and reapply closure — 2026-08-27

Status: `IMPLEMENTED_AND_DEPLOYED; REAL_CUSTOMER_RETEST_PENDING`

Admin can remove an approved or active Customer from the Join Request queue.
The server transaction tombstones the Customer membership, preserves the
approved request and accepted invitation history, records one audit event, and
best-effort revokes pending Clerk invitations without deleting Clerk identity.
Removed admissions no longer block `/join` or auto-reactivate through the old
approval. A fresh request and new approval are required; same-subject approval
reuses the existing appUser/member code, while a new Clerk subject remains a
separate historical identity.

Local full Vitest, Convex, TypeScript, ESLint, format, build, audit, and diff
gates pass. Convex Production and Vercel Production are deployed. Public
production smoke passes; authenticated Admin/customer lifecycle retest still
requires an authorized real account.

## Membership admission root closure P0 — 2026-08-27

Status: `ROOT_CAUSE_FIXED_AND_DEPLOYED; CUSTOMER_ACCEPTANCE_PENDING`

Live canonical Convex Production logs established the first incorrect
boundary. Correlation `9b79020d-2520-4975-8621-7a97bd39c2be` had a valid Clerk
subject and Convex authentication, but `trustedEmail=null`; therefore
`users.ensureCurrentUser` could not find the matching approved Join Request
and failed `ADMISSION_REQUIRED` before creating an `appUsers` row. The Ready
Stock CTA was a downstream projection of that upstream failure.

Git archaeology identifies `5ca0bf4` as the behavioral regression. It
correctly forwarded Convex's requested Clerk JWT template, preserving the
required custom-template audience and authentication fix, but the configured
template contains no email claim. Later admission implementations continued
to rely on `identity.email`, so approval, invitation acceptance, and Clerk
authentication could not converge to BFG membership.

The root provider now calls one server-side `userProvisioning.ensureCurrentUser`
action only after Convex authentication is ready. The action binds the current
Clerk subject to that same subject's Clerk Backend user, accepts only a
verified primary email, and runs the existing `ensureCurrentUser` transaction.
That transaction remains the only membership implementation and persists the
active `appUser` plus accepted invitation/admission projection atomically.
Wrong accounts and unverified addresses fail closed; transient Clerk lookup
failures remain retryable; existing active/suspended/privileged users retain
their canonical status.

Local evidence: full Vitest `68 files / 356 tests`, TypeScript, ESLint, Format,
Build, Convex Development check, `npm audit --omit=dev` (`0 vulnerabilities`),
and `git diff --check` pass. Local Playwright cannot start because this
checkout intentionally lacks a Clerk publishable key.

Production evidence: Convex `clean-eel-522` and Vercel deployment
`dpl_43Vv7DsfARCs69FBdNJDhbZhQQgc` are READY on the canonical domain. Public
Production Playwright passed `215/215`, with seven transient network/Clerk CDN
suspensions recovered on retry. A legitimate operator journey reached Admin
approval and one new `INVITATION_CREATED`; the Admin projection remained
reactive. No Customer ticket/session event occurred during the observation
window, and the connected mailbox was not the invitee's mailbox. Customer
activation, authenticated surface refreshes, and the real Ready Stock order
therefore remain pending on the legitimate recipient opening that exact
invitation. No substitute identity or fake Production business record was
created.

## Customer Account responsive navigation closure — 2026-08-26

The Customer Account mobile hub is implemented in the current maintenance
patch. Portrait, landscape, tablet, and desktop layouts expose the same
essential Account actions: Profile, Address, Activity, Clerk account
management, and Clerk sign-out. The existing five-item mobile bottom nav,
desktop header, role boundaries, and authenticated data flows are unchanged.

Local evidence: focused Account component coverage, the responsive geometry
matrix at 375/390/430/667x375/844x390/768/1024/1440, and the full deterministic
Vitest/typecheck/lint/build/audit/Convex checks pass. Production authenticated
Customer acceptance remains dependent on an available legitimate Customer
session; no identity or business data was fabricated. Vercel Production
deployment `dpl_8eCvpvaYy4MBRrsoNvLCBcv5tiQp` is READY and aliased to
`https://www.blessingforgood.com`; public signed-out Account smoke passed 8/8.

## Final yellow / unknown closure — 2026-08-26

The four named closure items are implemented in commit `43f444c` and deployed
to the canonical Production domain. BFG Admin approval now starts the private
server-side Clerk invitation reconciliation; `/join` uses `appUsers.role` and
`status`; trusted invitation acceptance provisions the active Customer; and
the eight historical cover assertions now test the current transformed,
clipped-frame presentation contract.

Final evidence: Vitest `60 files / 315 tests`, full current Playwright
`284/284`, TypeScript, ESLint, Format, Build, Convex Development check,
`npm audit --omit=dev` (`0 vulnerabilities`), and `git diff --check` pass.
Vercel Production deployment `dpl_459z5nNtK56GBrn8whG793oHP9VT` is `READY`
and aliased to `https://www.blessingforgood.com`; Convex Production remains
`clean-eel-522` and receives the server-only Clerk secret during the canonical
Vercel build. No fake identity or Production business record was created.

The engineering path for a real active Production Customer is green, and the
exact role-boundary journey is covered in isolated Convex tests. A legitimate
authenticated Production Customer session was not available in this runtime,
so the real Production Ready Stock order remains the only external UAT
checkpoint; it must be run with an existing Customer account and existing
positive-stock item.

## Operational reconciliation — 2026-08-26

The requested Batch PO, Secret Catalog, Ready Stock, error-safety, button
geometry, and destructive-action corrections are implemented, committed, and
deployed from the canonical `main` worktree. The implementation preserves the existing Clerk
identity boundary, Customer-only Ready Stock mutation, Admin-assisted order
path, canonical reservation/order/invoice/Activity projections, private
catalog access, and Batch state machine.

Added/updated coverage includes active Customer Ready Stock ordering, Admin
checkout role guidance, guarded Catalog reopen, Catalog-to-Batch eligibility
summary, non-empty-roster PO lock, safe Batch errors, authorized Secret Book
Detail content projection, and server-side unused-versus-referenced deletion
guards. Full Vitest passed `59 files / 306 tests`; TypeScript, ESLint, Format,
Build, Convex Development check, `npm audit --omit=dev` (`0`), and
`git diff --check` passed. Convex Production `clean-eel-522` and Vercel
Production `dpl_BW8uYMyoKLWyPqXM7chQv2JwMtKK` are deployed and ready; public
HTTP smoke returned `200`. Public Playwright passed `276/284`; the eight
remaining failures are the pre-existing preserved Cover/Gallery framing
assertion, while the new Button geometry matrix passed `8/8`. No fake identity
or Production business record was created. A legitimate authenticated
Production Customer session remains the only account-gated UAT step.

## Client UAT Round 3 — 2026-08-25

Round 3 implementation is complete locally for the four new findings:
invite-only Google rejection UX, signed-out Join Request submission states,
Admin/Customer Activity audience isolation, and expanded Book Interest options.
The deterministic suite is green: Vitest `287/287`, TypeScript, ESLint,
Prettier, production build, Convex Development check, `npm audit --omit=dev`
(`0` vulnerabilities), and `git diff --check`.

Local rendered browser execution is qualified because this checkout has no
`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`; Next/Clerk correctly fails closed with a
missing-key 500 before sign-in/join pages can render. The canonical Production
deployment nevertheless completed with its managed keys: Convex
`clean-eel-522`, Vercel `dpl_CJf3ccaSe6Qx2pHH9bZbAjY9jsJF` (`READY`), and the
public smoke passed `40/40` at customer `390` and Admin `1024`; Activity
responsive geometry passed `8/8` supported viewports. No fake Clerk key or
Production business data was introduced. Authenticated member, unregistered
Google, signed-out Production submission, and Admin-review mutations remain
account-backed UAT actions rather than fabricated evidence.

## Client UAT Round 2 — 2026-08-24

The initial local checkout was stale at `1e155205`; the user-supplied
`fce35bee` reconciliation tip arrived on `origin/main` during this pass and is
now merged into local `main`. This maintenance pass implements the Round 2
upload MIME regression fix, Ready Stock reservation/error normalization,
narrow Clerk CSP challenge allowances, stronger shared Activity unread
semantics, shared Button token calibration, Batch ETA Cargo, stable Customer
`memberCode`, grouped Publisher purchase export, and canonical Admin-assisted
Ready Stock orders.

Deterministic gates are green: focused 74/74, full 277/277 after the final
additive order/invoice member-code view assertions, TypeScript, ESLint, Format,
Build, `npm audit --omit=dev` (0), and Convex Development check. Production and
authenticated device acceptance are not claimed: local Production credentials,
approved populated business data, and Android/iOS access are not available.
The detailed status is in
[`BFG-CLIENT-UAT-ROUND-2-FINAL-REPORT.md`](implementation/BFG-CLIENT-UAT-ROUND-2-FINAL-REPORT.md).
## Final parallel-workstream reconciliation — 2026-08-24

Status: `CANONICAL_INTEGRATION_DEPLOYED; AUTHENTICATED_UAT_QUALIFIED`.

Git forensics established that Button `5c9abeec`, Security `88ec8737`, and
Product Logic `1e155205` were parallel descendants of the shared history. They
were reconciled into `f0eddc82`; local `main`, `origin/main`, and the clean
worktree now agree on the canonical release. No reset, force push, worktree
deletion, or unknown-delta discard was used.

The integrated release preserves upload magic-byte/MIME/dimension hardening,
storage ownership, rate limits, security headers, Clerk/RBAC/ownership guards,
the canonical Button/LinkButton/IconButton family, one ActionGroup, the
state-driven Order → Invoice path, ActivityCenter read-state semantics,
canonical invoice references, explicit Book Save versus Publish, Ready Stock,
Secret Catalog, and shared-close-date multi-Publisher Batch rules.

Evidence:

- Vitest `269/269`; Convex `136/136`; lint, TypeScript, format, build,
  `npm audit --omit=dev` (`0` vulnerabilities), `npm run convex:check`, and
  `git diff --check` pass.
- Convex Production `clean-eel-522` deployed successfully.
- The latest Vercel Production deployment is `READY` on
  `https://www.blessingforgood.com`; no Vercel logs were returned for the
  last-hour warning/error query.
- Read-only Production browser checks passed `58/58` serial checks across
  customer `375/430/768/1440` and Admin `1024/1440`; Activity fixture geometry
  passed all eight supported viewport sizes.

Authenticated business-record QA is qualified, not claimed: this worktree has
no authorized Clerk session. The Production legacy-invoice preview correctly
returned `IDENTITY_REQUIRED`; no backfill, invoice issue, Book save/publish,
upload, stock reservation, Batch mutation, or other financial/business data
mutation was attempted.

Security remains `BFG_APPLICATION_SECURITY: CLIENT_READY` and
`BFG_SECURITY_ASSURANCE: GREEN_EVIDENCE_WITH_PRECISE_QUALIFICATIONS`.
`BFG_GLOBAL_BUTTON_SYSTEM` and `BFG_PRODUCT_LOGIC_UAT` are deployed with
deterministic and signed-out/public render evidence, while authenticated
state-specific Production QA remains the explicit qualified gate.

## Current maintenance correction pass — 2026-08-22

The latest authenticated Admin evidence supersedes prior green snapshots for
five operational defects: Order → Invoice guidance, unread Activity clarity,
conditional action spacing/affordance, long human invoice references, and
Master Book save persistence/feedback. The current local implementation is
being verified from `91634b4` plus an uncommitted maintenance diff; no reset,
checkout, rebase, or security-work discard is permitted.

The current client commerce contract is also locked: Ready Stock is direct
stock-backed purchase; Secret Catalog is private PO/preorder and may contain
many publishers/titles; Batch PO is multi-publisher and groups by shared close
date; Publisher is not Batch identity; customer Batch projection remains
access-controlled.

The initial snapshot did not have canonical deployment credentials. The
reconciled release is now deployed to the canonical targets; legacy invoice
backfill and authenticated live recheck remain qualified because no authorized
operator session is available in the current local state.

## Current Anchored Summary — 2026-08-22

**Phase 07.1:** `BFG_PHASE_07_1_PRODUCT_SURFACE_STABILIZED` — `CLOSED + RECONCILED`
**Baseline reconciliation:** `BFG_PHASE_07_1_BASELINE_RECONCILED`
**Agent system:** `BFG_AGENT_DEVELOPMENT_SYSTEM_V2_ACTIVE`
**Phase 08:** `PHASE_08_COMPLETE` — External Preview form alignment closed.
**Phase 09:** `ACTIVE — OPERATIONS & MAINTENANCE`.
**Current product:** `BFG_CURRENT_PRODUCT_SCOPE_COMPLETE`.
**Production:** `BFG_PRODUCTION_STABLE`.
**Product mode:** `MAINTENANCE`.

**Global Button System:** source consolidation implemented on the current
`origin/main` tree with canonical semantics, variants, sizes, states, spacing,
and conditional-action coverage. Deterministic/source QA is complete;
authenticated rendered QA remains a release gate because the local
Clerk/Convex harness has no production data/session configuration. No
business/server authority changed and no Convex deployment is required for
this visual migration.

**Phase 09.1:** `PRODUCTION ASSURANCE EVIDENCE COMPLETE WITH QUALIFICATIONS` —
security hardening, adversarial authorization verification, abuse controls,
header hardening, bounded load evidence, and recovery verification were
executed. This was an assurance pass, not a new product-feature phase;
functional completion remains unchanged.

Phase 09.1 current evidence includes 247/247 deterministic tests, 264/264
Playwright cases ultimately passing with one transient retry, a passing local
Production build/header check, and safe Production Profile A read capacity
validated through 500. At 750 the post-deployment run returned no request
errors or 5xx but breached the p95 latency target; 1,000 was not run. Convex
tier/usage/backup and recovery values remain explicitly
`BLOCKED_BY_ACCOUNT_ACCESS` until the authorized BFG platform account is
available.

The latest authenticated Production screenshot established the real Admin Book
Detail surface and exposed the final External Preview geometry defect. The
paired fields now render as explicit label/control/support rows, so both input
frames share one horizontal control row while the URL helper remains below its
control. The shared How To Order journey, homepage Perjalanan Bukumu
orientation, Mengenal BFG contrast hierarchy, non-destructive BookCover
presentation, Activity surface, custom BFG file picker, and Gallery layout
remain unchanged.
Bulk Import V1 remains implemented and Production-deployed, but its legitimate
Production pilot is **DEFERRED_BY_USER_DATA**. Product Media decisions are
locked and populated Gallery/Preview UAT remains blocked only by approved data;
cover framing uses additive metadata and keeps the original source.

Phase 09.1 starting commit: `0c5d409c1abffa63be88ee80cc971d8c2253f5ae`.
Phase 09.1 code commit: `ea724bc2e5503f9bf35b9963bc29ccbcc865b288`.
Phase 09.1 documentation anchor: `460e5a03e94bdd4b759310743f5f745a58b9da9a`.
Phase 09.1 final regression anchor: `f6c5e0b4ff1967a6febfc9feff573e81d82286e8`.
Current verified source deployment: latest `READY` Production deployment for
the final `origin/main`, with canonical Production aliases.
`origin/main`: `f6c5e0b4ff1967a6febfc9feff573e81d82286e8`.
Convex Development: `content-snake-214`.
Convex Production: `clean-eel-522`.
Vercel Production source deployment: latest `READY` Production deployment (canonical aliases).
Canonical Production: `https://www.blessingforgood.com`.

Current local regression is Vitest `247/247`, Convex `111/111`, local
Playwright `264/264`, focused local media/file-picker checks `6/6`, rendered QA
at 375/390/430/768/834/1024/1280/1440, TypeScript PASS, ESLint PASS, Format
PASS, Build PASS, and `git diff --check` PASS. Live signed-out Admin protection
passed `3/3`; public HTTP routes are healthy. The previous eight identical
cover-geometry assertions are reconciled as `ENVIRONMENT_ONLY / DATA-LIMITED`:
the live public seed had no stored cover, while current deterministic geometry
checks pass at all configured widths. No dummy business record, cover asset,
credential, or unapproved business value was created.

The known Production baseline is Convex `clean-eel-522`; the configured
Production hook completed the Convex `--prod` step before the Next build.
The live public recheck is complete for the touched boundary. The supplied real
authenticated Admin Book Detail screenshot is the private-surface evidence;
the correction is deployed without a media mutation. Auth, financial,
inventory, Secret Catalog, and Bulk Import policy remain within their locked
boundaries. Phase 09 is active maintenance; no new Product behavior was added.

### Phase 09 initial baseline

- Status: `PHASE_09_OPERATIONS_BASELINE_READY`.
- Security critical findings: `0`; known active P0/P1/P2: `0`.
- Canonical domain: public routes healthy; signed-out `/admin` redirects to
  Clerk sign-in with a safe redirect target.
- Vercel: deployment `dpl_8tZaUD7jxYxg96N6NhYZzCjmUwtU`, `READY`, source
  commit `85908d9`.
- Convex: Development `content-snake-214`, Production `clean-eel-522`, local
  tests `111/111`; CLI health check is `NOT VERIFIED` because the selected
  project was inaccessible in the non-interactive environment.
- Recovery: playbook ready; platform backup/restore and Storage recovery are
  explicitly `NOT VERIFIED`.
- Dependency review: transitive `nanoid` patched to `3.3.18` in the lockfile;
  Production rollout was not performed in this documentation pass.

The canonical Phase 09 artifacts are linked from
[`BFG-PHASE-09-OPERATIONS.md`](implementation/BFG-PHASE-09-OPERATIONS.md).

The canonical reconciliation artifacts are:

- `context/SOURCE_OF_TRUTH.md`
- `context/DECISION_LOG.md`
- `context/implementation/BFG-BASELINE-RECONCILIATION-MATRIX.md`
- `context/implementation/BFG-ROUTE-INVENTORY-V2.md`
- `context/implementation/BFG-PHASE-08-SOURCE-CONTRACT.md`
- `context/implementation/BFG-BULK-IMPORT-DATA-CONTRACT.md`
- `context/implementation/BFG-BULK-IMPORT-POLICY.md`
- `context/implementation/BFG-PHASE-08-BULK-IMPORT-TRACEABILITY.md`
- `context/implementation/BFG-ADMIN-CUSTOMER-SYNC-MATRIX.md`
- `context/implementation/BFG-BUSINESS-CONSEQUENCE-MATRIX.md`
- `context/implementation/BFG-MOCKUP-TRACEABILITY-MATRIX.md`
- `context/implementation/BFG-STATE-MACHINE-INDEX.md`
- `context/implementation/BFG-SECURITY-INVARIANTS.md`
- `context/implementation/BFG-FINANCIAL-INVARIANTS.md`
- `context/implementation/BFG-VISUAL-SYSTEM.md`
- `context/implementation/BFG-PHASE-08-ENTRY-GATE.md`
- `context/implementation/BFG-PHASE-08-CANDIDATES.md`
- `context/implementation/BFG-PHASE-08-PRODUCT-MEDIA-SOURCE-CONTRACT.md`
- `context/implementation/BFG-PHASE-08-PRODUCT-MEDIA-TRACEABILITY.md`
- `context/implementation/BFG-FINAL-PRODUCT-COMPLETION-MATRIX.md`
- `context/implementation/BFG-MAINTENANCE-PLAYBOOK.md`
- `context/implementation/BFG-PHASE-09-OPERATIONS.md`
- `context/implementation/BFG-MONTHLY-SECURITY-CHECKLIST.md`
- `context/implementation/BFG-RECOVERY-PLAYBOOK.md`
- `context/implementation/BFG-TECHNICAL-DEBT.md`
- `context/maintenance/2026-08-BFG-MAINTENANCE-REPORT.md`

### Current reconciliation result

| Gate                             | Result |
| -------------------------------- | ------ |
| Source documents inventoried     | PASS   |
| Current features classified      | PASS   |
| Current routes classified        | PASS   |
| Required actions classified      | PASS   |
| Mockups mapped                   | PASS   |
| Business domains mapped          | PASS   |
| State machines indexed           | PASS   |
| Security invariants locked       | PASS   |
| Financial invariants locked      | PASS   |
| Admin ↔ Customer sync mapped     | PASS   |
| Superseded decisions documented  | PASS   |
| Explicit exclusions documented   | PASS   |
| Phase 08 candidates source-based | PASS   |
| Unknown material source conflict | `0`    |
| Unclassified feature             | `0`    |
| Unclassified route               | `0`    |
| Unclassified mockup              | `0`    |

### Maintenance entry

Monthly security, dependency, auth, permission, ownership, financial, media,
Vercel, Convex, responsive, and critical-flow smoke reviews follow
`context/implementation/BFG-MAINTENANCE-PLAYBOOK.md`. The only safe Production
Batch is locked, Settings has no approved values to edit, and no approved
gallery asset or preview URL is available. Phase 09 is active maintenance;
Bulk Import remains unchanged and its real pilot remains deferred by user data.

### Phase 08 Bulk Import V1 implementation evidence — 2026-08-16

- Status: `BFG_PHASE_08_BULK_IMPORT_V1_PRODUCTION_DEPLOYED_PILOT_DEFERRED_BY_USER`.
- Natural entry: `/admin/books` → `Import Buku` → `/admin/import`.
- Backend: server-authorized preview query and one revalidated atomic confirm
  mutation; preview writes `0`; no import-job table or schema change.
- Contract: exact eight-column UTF-8 CSV, 2 MiB, 200 data rows, 5,000 Unicode
  characters per cell; quoted CSV/BOM/line-ending support; no new dependency.
- Safety: new books are draft, new variants inactive, exact rows are no-op,
  conflicts reject the whole file, and audit stores only bounded summary data.
- Local evidence: Vitest `216/216`, Convex `102/102`, Playwright `180/180`
  baseline plus 3 `/admin/import` route checks, TypeScript PASS, ESLint PASS,
  Format PASS, Build PASS, and `git diff --check` PASS.
- Remaining gate: authorized real Production pilot and authenticated rendered
  import-state QA remain unclaimed by explicit user choice; no dummy Production
  records or credentials were created.

### Phase 08 final-completion context — 2026-08-21

- `BFG-SPACING-SYSTEM.md` records the semantic Admin action and Homepage rhythm
  contract.
- `BFG-PHASE-08-PRODUCT-MEDIA-SOURCE-CONTRACT.md` records the locked
  Book-Master ownership and HTTPS metadata-only preview decisions.
- `BFG-PHASE-08-PRODUCT-MEDIA-TRACEABILITY.md` records the deployed
  implementation; populated Gallery/Preview UAT remains blocked only by
  approved data.
- Activity now projects notifications and messages into one newest-first feed;
  backend tables, ownership, retention, and read semantics remain separate.
- Activity responsive closure is covered locally at 375, 390, 430, 768, 834,
  1024, 1280, and 1440 widths. The panel width/position/height is measured
  against the real visual viewport; nested content tracks shrink and wrap, and
  no horizontal overflow is hidden as a substitute for fitting the layout.
- The supplied READY deployment `dpl_H5KPpMDmHtzFqZ44q9p7JHuPogsv` passes that
  populated Activity matrix; the user-controlled authenticated Customer
  checkpoint passed at 375/390/430/768/1440.
- Authenticated Admin Production evidence now covers `/admin`,
  `/admin/notifications`, `/admin/books`, `/admin/books/[bookId]`,
  `/admin/batches`, `/admin/catalogs`, `/admin/invoices`,
  `/admin/orders`, and `/admin/settings`; one real `Pesan BFG` item is visible
  in the unified feed. No new defect was reported during final acceptance.
- Bulk Import implementation and contract remain unchanged; its pilot is
  `DEFERRED_BY_USER_DATA`.

### Responsive/media closure evidence

- Customer mobile top header is logo-only; Activity is reachable through Akun,
  with a shared unread dot on the five-link bottom navigation.
- Customer desktop and Admin Activity/avatar clusters remain inline; Admin
  `Lihat sisi pelanggan` is nowrap at 1024/1280/1440.
- `CoverUploadField` owns the custom accessible file presentation while the
  existing Convex upload URL/attach flow remains canonical.
- Local exact 1280 customer smoke: `20/20`; canonical Production public
  Activity/visual suite: `24/24`. Authenticated Admin Activity, BFGSelect,
  Batch, Settings, and Master Buku evidence is now recorded; no business data
  was mutated. The prior Activity Production recheck is closed; the post-closure
  visual recheck is recorded below.

## Phase 08 post-closure visual stabilization — 2026-08-21

Status: `BFG_CURRENT_PRODUCT_SCOPE_COMPLETE` · `BFG_PRODUCTION_STABLE` ·
`PHASE_08_COMPLETE` · `PRODUCT_MODE: MAINTENANCE`.

The real Production screenshot findings were addressed only at their shared
roots:

- How To Order keeps all seven canonical steps and uses one normalized outline
  icon family, a connected desktop row, and a vertical mobile/tablet timeline.
- Perjalanan Bukumu uses a narrower internal wrapper so Temukan → Pesan → Ikuti
  reads as one compact orientation tool without shrinking the page container.
- Mengenal BFG keeps the approved palette and restores the canonical high-
  contrast heading hierarchy.
- BookCover keeps the original uploaded storage object and always renders the
  full image with preserved ratio inside the shared contained frame. Legacy
  `{ zoom, x, y }` metadata remains compatibility data and does not alter the
  default renderer.

Production evidence:

- Vercel source deployment `dpl_AJo6wHk3tQzFTdmqu6716cTDwYxx` is `READY` and
  aliased to the canonical domain; Convex Production is `clean-eel-522`.
- Live responsive visual contracts passed `18/18`; homepage/How To Order smoke
  passed `12/12`; Ready Stock smoke passed `6/6`; the Vercel error scan found
  no logs.
- The current public Ready Stock seed has no cover image. No Admin mutation,
  fake cover, access code, or business record was created to force the crop UAT;
  its validation, authorization, persistence, reset, legacy default, and
  customer projection are covered deterministically.

Permanent visual contracts are also recorded in `SOURCE_OF_TRUTH.md`, the final
completion matrix, and the maintenance playbook. Phase 09 now owns the ongoing
operations baseline; the visual contracts remain unchanged.

## Historical Status Archive

The sections below preserve earlier evidence and decisions. Their old counts,
deployment IDs, and blocked/active labels are historical and are superseded by
the current anchored summary and the linked canonical documents. They are not
rewritten to imply they were always current.

## Phase 07.1 full source-of-truth reconciliation — 2026-08-14

**Status:** `LOCAL_ENGINEERING_PASS__PRODUCTION_AND_REAL_UAT_BLOCKED`

Starting commit: `8392d2212844fc888e12904e680a240420d219b0`.

The original PRD/UX/business/scope/success contracts and all approved Admin and
Customer mockups have been reconciled into `context/SOURCE_OF_TRUTH.md` and the
Phase 07.1 implementation matrices. Required local product gaps are implemented,
including visible Secret Catalog access management, product/proof uploads,
Admin/Customer Notifications and operational Inbox, customer Batch and Deposit
surfaces, reports/export/analytics, multi-Admin invitations, audit, content, and
settings. The current deterministic baseline is Vitest `166/166`, Convex
`94/94`, with typecheck, lint, format, build, diff check, and the documented
rendered route/viewport suite passing; the 155-check inventory completed with
two known concurrent Clerk/local-Convex flakes that passed sequentially.

This is not a closure or Production deployment claim. Convex CLI schema/codegen
acceptance is blocked because the configured CLI identity cannot access canonical
Development `content-snake-214`. Authenticated rendered QA and the intentional
real Owner/Admin, Customer, product, Secret Catalog, Notification, and Inbox
flows are also blocked because no designated identities/client product were
provided. No alternate deployment or dummy Production record was created. Until
those external inputs are restored, client product entry is not safe and Phase 08
must not start.

### Final operational audit delta — 2026-08-14

The local reconciliation additionally closes the discovered Admin reachability
gaps: invoice create-and-issue is available from the Invoices & Deposit queue,
existing drafts can be issued there, Book Master previews a selected cover
before durable save, Customer detail links to invoice/deposit workflows, and
Admin navigation rows share fixed optical geometry. These changes are local
until canonical Convex validation, deployment, and authenticated acceptance
are completed. The exact blocker remains lack of CLI access to Development
project `content-snake-214`.

## Phase 07.1 Product Surface Stabilization

**Status:** `BFG_PHASE_07_1_LOCAL_CLOSURE_PRODUCTION_PILOT_BLOCKED`

Starting commit: `8442367` (`test: cover authenticated production routes`).

This pass separates the signed-in customer workspace from Admin: the canonical
customer primary navigation is now `Beranda`, `Katalog`, `Buku Saya`,
`Tagihan`, and `Akun`; Admin/Owner access appears only as the secondary
`Buka Workspace Admin` control; the Admin shell keeps `Lihat sisi customer`.
Customer Account now naturally reaches Profile and Addresses. The Admin
dashboard now gives urgent operational queues visual priority over secondary
context counts without changing queries, schema, permissions, or business
logic.

Required access, admission, mockup translation, customer surface, and QA
matrices are in `context/implementation/`. The current implementation adds the
missing public/signed-in Join flow, Admin review/approval handoff, pending
attention indicators, canonical customer/Admin branding, and shared Admin
operational page grammar. Local deterministic tests and browser smoke pass;
no dummy Production data was created. The visual-system regression is deployed
in Vercel deployment `dpl_3vfdSRji8mXJtvZAWpa7YxWfxfYW` (`READY`) with Convex
Production `clean-eel-522`.

Remaining gates are explicit: complete the intentional real
non-member → Admin approval → active Blessfriend journey, run one real client
product through Admin → Convex → customer projection, and compare authenticated
Admin/customer renders against the local mockups. Do not start Phase 08 or
report closure until those gates pass.

### Latest Phase 07.1 product publishing and journey delta — 2026-08-14

**Status:** `BFG_PHASE_07_1_PRODUCTION_DEPLOYED_PRODUCTION_PILOT_BLOCKED`

Starting commit for this delta: `94780ff0ba32337654bda728df534099a4b37047`.

The current implementation now proves the canonical local chain
`Publisher → Book Master → Variant → ISBN/price → publication → inventory or
catalog assignment → customer projection`. Ready Stock keeps the canonical
`onHand - reserved` availability calculation and now returns only customer-safe
variant fields. Secret Catalog uses the shared projection guard to exclude
draft/archived books while preserving scoped token access for valid `special`
products. No order, inventory reservation, invoice snapshot, payment, deposit,
refund, exception, or schema state logic was changed.

How To Order is now one accessible seven-step ordered journey with a single
connected path; the previous independent card treatment is superseded. The
shared Admin operational loading grammar remains stable across Ready Stock,
Exceptions, and Refunds.

Local gates: Vitest `147/147`, Convex `82/82`, Playwright `114/114` on the
first full run, TypeScript, ESLint, format, build, and diff check pass. Rendered
QA passes How To Order at 375/390/430/1440px, deterministic product
listing/detail at 390/1440px, Admin Book Master entry at 390/1440px, and the
three Admin operational loading surfaces side-by-side at 1024/1280/1440px. A
repeat serial browser run was locally flaky around Clerk/resource loading and
signed-out navigation; no changed-surface assertion failed.

No real client product information or authorized authenticated operator session
was provided. No Production business data was created. Therefore the real
product pilot, authenticated Production acceptance, and bulk-entry safety
remain blocked. The final code commit `2bc8137` is deployed in Vercel
Production deployment `dpl_EwKcjS8T7WrPRXwNKZD6JvDNnBpJ` (`READY`) with
Convex Production `clean-eel-522`; public live focused QA is `19/19`. Phase 08
remains `NOT STARTED`.

### Admin access security hardening

**Status:** `BFG_ADMIN_SECURITY_HARDENED_PRODUCTION_AUTHENTICATED_ACCEPTANCE_PENDING`

Deterministic security tests now cover the Admin route role/status matrix,
direct sensitive Admin query and mutation bypass attempts, Owner-only role
management, and Admin/Owner access to customer routes. One shared client role
policy drives the route guard and route-aware query providers; shared Convex
permissions let Admin use owned customer projections while every Admin-only
query/mutation remains independently server-authorized.

The current Production runtime is known to pass Clerk → Convex token, issuer,
audience, Convex identity, non-member detection, and Admin denial. The deployed
closure pass still must prove the real signed-in customer/Admin/Owner journey.
No Clerk Organization, alternate login, or dummy data is claimed.

## Auth Session Recovery V3

**Status:** `BFG_AUTH_SESSION_V3_CODE_READY_PRODUCTION_AUTH_PENDING`

The P0 follow-up traces the remaining failure to the Clerk → Convex boundary.
The live client uses the canonical Clerk Production issuer and Convex Production
deployment. Convex issuer configuration is now validated and synchronized by
the Production build, while real authenticated Chrome acceptance remains a
required gate before claiming full closure. Phase 08 has not started.

## Homepage Polish V4.1.3

**Status:** BFG_HOMEPAGE_V4_1_3_PRODUCTION_READY

This homepage-only hotfix keeps Phase 07 functionally locked while moving
Ready Stock and Secret Catalog actions into the hero, replacing the large
dark-green journey panel with a lightweight cream-canvas stepper, and
optically centering the visible customer `Logo-1` artwork without cropping it.
Customer routes, bottom navigation, Clerk/Convex contracts, Secret Catalog
security, Ready Stock ordering, financial logic, and Admin remain unchanged.

**Local gate:** Vitest `108/108`; customer Playwright `75/75`; signed-out
Admin Playwright `39/39`; TypeScript, build, lint, format, and diff check pass.

## Phase 07 Admin Operational UI/UX + Customer Visual Patch V4.1.1

**Status:** BFG_PHASE_07_ADMIN_OPERATIONAL_UI_READY — PRODUCTION DEPLOYED

Stage A applies the targeted client patch: the approved local multicolor
`Logo-1` is the customer primary, logo rendering is contained and
production-safe, the BFG story mark is prominent, mobile `Masuk` is framed,
and the homepage plus `/how-to-order` use one illustrated current-product
journey.

Stage B adds the desktop-first operational workspace around the locked Phase
06.7 policies: grouped navigation, actionable dashboard queues, operational
tables/status grammar, and a Ready Stock projection for on hand/reserved/
available stock. Existing Admin routes, Convex mutations, RBAC, financial
history, and customer consequences remain canonical.

**Starting production commit:** `cf26922`

**Final production code commit:** `51587d6`

**Vercel deployment:** `dpl_6HRYZPXFxSg2dbLz1oKW3hq88F2w` — Ready on the
canonical aliases, including `https://blessingforgood.com`.

**Local gate:** Vitest `108/108`, Convex `72/72`, Playwright local customer
`75/75`, signed-out Admin `39/39`, TypeScript, build, lint, format, and
`git diff --check` all pass.

**Live smoke:** `114/114` safe customer and signed-out Admin route checks pass
against `https://www.blessingforgood.com` at customer 375/390/430/768/1440px
and Admin 1024/1280/1440px. The non-`www` canonical alias redirects to `www`
with the established 308 response. No authenticated production mutation or
dummy business data was used.

Authenticated Admin visual/action acceptance remains an operator-session
responsibility; route protection, isolated policy tests, and the implemented
operational controls are green without mutating production records.

## Phase 06.7 Business Policy Closure

**Status:** BFG_PHASE_06_7_POLICY_CLOSED — PRODUCTION DEPLOYED

Phase 06.7 closes Ready Stock ordering/reservation, pre/post-PO cancellation,
defect replacement, refund obligation/payout, deposit refund, non-account
customer, and Join-request retention policy. The canonical policy documents
are `context/policies/BFG-BUSINESS-POLICY-V1.md` and
`context/policies/BFG-POLICY-DECISION-MATRIX.md`.

Customer Visual V4.1, the global skeleton/loading system, and the Phase 06.6
customer/admin flow remain locked. Admin visual redesign remains deferred to
Phase 07. No production business data was seeded and no Preview delivery is
used.

**Starting production commit:** `938be66371d4e9b5084033f1b3985e207f65994`

**Final production code commit:** `1627ad306e44b152807a8a3f1b3985e207f65994`

**Release verification commit:** `32d6526`

**Vercel deployment:** Ready on the canonical aliases, including
`https://blessingforgood.com`. The Production build used the configured Convex
deploy command and completed successfully.

**Live smoke:** customer `75/75` and signed-out admin `36/36` across the
responsive production projects. The canonical domain redirects to `www` and
returns `200`.

The local Convex CLI check could not authenticate to the selected development
project in this environment; no production mutation was attempted. Vercel's
Production build completed the configured Convex deployment step.

The repository's `AGENTS.md` references `context/SOURCE_OF_TRUTH.md`, but that
file is absent from the current checkout; the current source-of-truth chain is
this status file, `context/decisions/DECISIONS.md`, the feature/database/security
documents, and the Phase 06.7 policy documents above.

## Customer Mobile UX Correction V3.1

**Status:** PRODUCTION READY — LIVE QA PASSED

V3.1 corrects the rendered customer mobile experience forward-only. The
header logo is smaller, top-right `Masuk` opens the dedicated BFG sign-in
page, signed-out bottom-navigation destinations render customer states before
authentication, and `/catalog` is a public token gateway. Secret Catalog
access uses a server-validated opaque expiring session; the previous
authenticated-member-plus-code prerequisite is superseded for this customer
entry flow. Existing active-member grants remain backward compatible, and
token-only browsing does not create customer identity or owned orders.

The homepage story cards now use a larger official logo and a non-overlapping
top-right Blessy composition. Join remains canonical `joinRequests`, and all
customer/admin data continues through the shared Convex backend. Admin visual
redesign remains deferred. No business fixtures or dummy records were added.

**Branch:** `main`

**Starting commit:** `8e67bfc` (`docs: record V3 production deployment`)

**Production commit:** `aa294c5` (`docs: record final production deployment`)

**Vercel deployment:** `dpl_H6m6a6vtGf61fzNXbWwTRyQmmggY` — Ready; canonical
aliases include `https://blessingforgood.com`. Vercel logs show the build,
TypeScript check, static generation, Convex schema validation, and deployment
to Production Convex `clean-eel-522` completed successfully.

The V3.1 customer surfaces are implemented forward-only in the integrated
Phase 01–06.4 application. Generated catalog codes and session credentials are
never stored as plaintext authoritative values. The full admin visual
redesign remains deferred.

Local gates currently pass: TypeScript, ESLint, 100 Vitest tests, 64 Convex
tests, and 108/108 Playwright tests across customer/admin responsive projects.
Live public mobile QA at 390px passed for homepage, token gateway, signed-out
states, BFG sign-in, no-ticket sign-up, navigation, and detail Back controls.
No secret values, dummy records, or alternate deployments were used.

The join continuation is safe when `BFG_JOIN_WHATSAPP_GROUP_URL` is absent:
the request persists and the customer sees the configured-link fallback. Its
Production value was not exposed or independently read during this pass.

## Historical Production UI alignment hotfix (superseded by V3)

**Status:** LOCAL RELEASE CANDIDATE READY — PRODUCTION BLOCKED BY EXTERNAL AUTH/ENVIRONMENT CONFIGURATION

**Branch:** `hotfix/production-ui-alignment-v1`

**Release candidate:** `a0a3bce` (`feat: align customer shell with local mockups`)

**Functional source of truth:** current remote `main`, forward-integrated with
the existing `release/production-v1` product history because remote `main`
still pointed to the older prototype merge.

**Visual sources of truth:** the customer/admin mockups in `public/mockups`,
the official assets in `public/brand`, and selected visual patterns from
`origin/qa/ux-refinement-v0.1`. The QA branch is not a functional merge source.

**Product scope source:** the original PRD pack at
`/Users/masjak/Documents/BLESSINGFORGOOD/BFG WEB/context/product/` was audited
read-only. Its approved MVP scope, UX flows, design system, tone, and mascot
guidance are reflected in the local coverage matrices.

### Completed in the hotfix worktree

- Preserved the Phase 01–06.4 Clerk, RBAC, ownership, catalogs, Ready Stock,
  order, batch, tracking, invoice, deposit, payment, exception, profile,
  address, and audit domains.
- Removed browser-local product persistence, Preview/demo activation flags,
  prototype presentation, and the customer-side admin setup leak.
- Made a valid `NEXT_PUBLIC_CONVEX_URL` the single product data path; missing
  configuration fails closed.
- Consolidated public and customer copy around Indonesian-first BFG language.
- Added `/account` with actionable order, invoice, deposit, exception,
  refund-obligation, and bounded cross-domain activity projections.
- Added `/admin/customers` and `/admin/customers/[customerId]` using existing
  server-authorized customer, profile, address, order, invoice, and exception
  queries.
- Rebuilt `/admin` around real operational queues without invented analytics.
- Added production-copy/runtime regression coverage.
- Restored official logo/mascot scale, mobile navigation, branded empty/loading
  states, a connected customer account hierarchy, and one compact admin shell.
- Rendered the optimized build at customer widths 375, 390, 430, 768, and 1440
  and protected admin widths 1024, 1280, and 1440.

### Current validation

- Vitest: 93/93
- Convex: 61/61
- Playwright responsive route smoke: 108/108 PASS
- Formatting: PASS
- Lint: 0 errors / 0 warnings
- TypeScript: PASS
- Next.js build: PASS (25 pages)
- `git diff --check`: PASS

### Customer experience finalization V1

- Inspected all eight local customer/mobile mockups under
  `public/mockups/mobile/` and documented their exact paths, visual rules,
  route parents, and brand asset relationships.
- Aligned the customer shell to the local mobile information architecture:
  five-item signed-in bottom navigation, safe-area/content offset, customer
  mobile menu links, and BFG-styled Clerk appearance.
- Public customer screenshots pass at 375, 390, 430, 768, and 1440 widths;
  the Ready Stock zero state remains intentionally empty and mascot-led.
- Authenticated account screenshot acceptance remains blocked by the existing
  matching Clerk/Convex environment requirement. No dummy business records or
  test production fixtures were created.
- Admin visual refinement is deferred; admin route regression remains covered
  by the full Playwright suite.

### Production preflight (2026-08-11)

- Vercel project `masjaaks-projects/blessing-for-good` is reachable and linked
  to the canonical repository. Production currently has three sensitive
  variables, but they are named `CLERK_SECRET_PROD`, `CONVEX_DEPLOY_PROD`, and
  `NEXT_PUBLIC_CLERK_PUBLISHABLE_PROD`; the application-required names are not
  present. Values were not printed or copied blindly.
- `blessingforgood.com` and `www.blessingforgood.com` are attached to the
  project, publicly resolve to Vercel, and serve HTTPS 200. The public Clerk
  hostname `clerk.blessingforgood.com` also resolves through Clerk and serves
  HTTPS 200.
- Clerk CLI health check is not authenticated or linked to a Clerk
  application. Local credentials remain Development `pk_test_`/`sk_test_`, so
  the Production key pair, owner, issuer, and certificate state are not
  independently verified through the CLI.
- No environment, domain, Clerk, Convex, business-data, branch, or deployment
  mutation was attempted. The existing Production deployments predate
  `a0a3bce` and are not accepted as this release.

### Historical production boundary (2026-08-11)

`main` and Vercel Production remain untouched by design. The canonical BFG
domain is publicly reachable, but Vercel Production has only incorrectly named
sensitive variables; the required names, matching Clerk Production pair, and
canonical Convex Production deploy key/configuration are not verified. Public
rendered QA and local deterministic gates pass; authenticated customer/admin
rendered acceptance and Production smoke remain blocked. No alternate project,
dummy business data, Preview delivery, or staging deployment is used.

## Canonical Convex

```text
Account: palevvi@gmail.com
Team: palevvi
Project: blessingforgood
Development: content-snake-214
Development reference: dev/masjak
Production: clean-eel-522
```

No similarly named project is authorized. If access is ambiguous, stop that
environment-sensitive operation instead of switching or creating a project.

## Current context

- **Objective:** keep the Phase 07 Admin operational workspace and targeted
  customer visual patch production-ready while preserving the locked policy
  surface.
- **Decisions:** current `develop` logic wins; QA UX is a component/style donor;
  the official logo and mascot are mandatory; customer history is derived from
  canonical records; no financial history is rewritten.
- **Constraints:** no dummy business data, no invented wallet/store-credit
  behavior, no Preview delivery, no reporting/analytics/CMS/settings, no
  payment gateway, and no reopening of Phase 06.7 policy decisions.
- **Open backlog:** Reporting/Excel, Analytics, CMS, Settings, notification
  platform, payment gateway, and full Admin visual redesign.
- **Current priority:** operator acceptance of the stable Phase 07 workspace;
  keep later reporting, analytics, CMS, settings, notification, and gateway
  work deferred.
- **Next action:** keep reporting, Excel export, analytics, CMS, settings,
  notification platform, payment gateway, and full Admin visual redesign out
  of scope until their own phase is authorized.

## Phase 07.1 visual convergence status — 2026-08-15

- Local systemic visual pass is complete at runtime commit `6a84bc0` with
  documentation follow-up `9bb0093`: shared logo, skeleton, spacing, button,
  frame, sidebar, typography, and Catalog grammar are implemented and locally
  verified.
- Local validation is green: `npm run check`, Convex check/tests, focused visual
  tests, `git diff --check`, and Playwright `155/155` signed-out/public matrix.
- Vercel Production `dpl_CsHVTKox5LVhhKQYZPG8TV1y2fk9` is READY and aliased to
  the canonical domains. Canonical Convex Production remains `clean-eel-522`.
- Production populated Admin/Customer visual acceptance is blocked by missing
  designated QA identities/real records and Vercel Deployment Protection in
  the current browser environment. No bypass or dummy records were used.
- **Phase 07.1:** NOT CLOSED (`LOCAL_VISUAL_SYSTEM_READY`,
  `PRODUCTION_AUTHENTICATED_VISUAL_ACCEPTANCE_BLOCKED`).
- **Phase 08:** LOCKED.
