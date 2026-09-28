# BFG Client UAT Phase 0–2 Pre-Closure Report

Date: 2026-09-27

Base: `58a4ff6e157fa4c9be78ebdbcb92e5a07591dcab`
`origin/main` stayed at the base during this gate. No merge or deployment was
performed.

## Repository Matrix

| Worktree | Branch / HEAD | State | Intended changes and overlap |
| --- | --- | --- | --- |
| `/Users/masjak/Developer/BlessingForGood` | Detached `58a4ff6` | Dirty | Contains Security QA working changes. The path does not currently have `security/blessingforgood-hardening` checked out. Left untouched. |
| `/private/tmp/bfg-hardening-release` | `security/blessingforgood-hardening`, `b281624aacc6975c80d94cf30d99696172834d78` | Dirty | Actual named Security QA branch worktree; local `.gitignore`, Playwright/build-guard changes, `security-audits/`, and a QA `tsconfig.tsbuildinfo` update observed at 23:40. Left untouched. |
| `/Users/masjak/Developer/BlessingForGood-client-uat` | `fix/client-uat-p0-2026-09-27`, `58a4ff6` | Dirty | Existing P0 Cart/Session changes in six files. Left untouched. |
| `/Users/masjak/Developer/BlessingForGood-client-onboarding` | `feat/client-onboarding-phase-2-2026-09-27`, `58a4ff6` before freeze commit | Dirty | Phase 2 onboarding/UI/tests and this report. No identical changed file paths with Security QA or P0. |

The P0 files are `convex/cartMultiCatalog.test.ts`, `convex/carts.test.ts`,
`convex/lib/cartProjection.ts`, `src/features/customer-cart/cart-line.tsx`,
`tests/components/convex-product-provider.test.tsx`, and
`tests/components/customer-cart-page.test.tsx`. The clean-base A/B build and
audit used a detached `58a4ff6` checkout with `npm ci` (469 packages); Phase 2
has no dependency or lockfile changes. `git worktree list` also showed the pre-existing prunable
`/private/tmp/bfg-reconcile-deploy.TNdjBi`; it was not touched. The temporary
clean-base verification worktree was removed after the A/B comparison. No
stash, reset, rebase, checkout, or cross-branch absorption occurred. The
canonical path / Security QA branch-path mismatch is recorded for later
reconciliation. The later QA build-info update has a distinct inode from the
Phase 2 worktree file and did not alter Phase 2. Phase 2 styles the existing
floating Blessy element only to hide it while an onboarding status card is
present; Security QA changes the
Blessy component and position helper in different files. That visual seam
must be rechecked when branches are reconciled.

## Four Engineering Understandings

- **Prompt Engineering:** verify and classify first; only the Phase 2
  Blessy/onboarding overlap introduced here was corrected.
- **Context Engineering:** Security, identity/membership, business, UI, and
  release findings stayed separate. No auth redesign or dependency change.
- **Harness Engineering:** rendered evidence uses a local-only fixture around
  the existing `ProductContext` boundary. It does not call a mutation or
  change Production auth. The fixture route returns 404 in production.
- **Memory Engineering:** this report and the Phase 2 project-status entry
  anchor exact worktrees, findings, ownership, and limits for later Phase 3.

## Phase 0 Isolation

Security QA and P0 remained unchanged by this task. Phase 2 did not overwrite a
shared uncommitted path or absorb either branch. `origin/main` did not advance.

`PHASE_0_ISOLATION = CLOSED_GREEN`

## Phase 1 Cart

P0’s focused frontend Cart/session tests passed (17 tests), and focused Convex
Cart tests passed (20 tests). Retained coverage includes:

- The seven-item Cargo-shaped fixture preserves the client counts: first
  catalog group quantity 5, second group quantity 2. When Admin revokes the
  grants, each group is precisely
  `access_revoked`, remains in the Cart, cannot check out, and does not prevent
  browsing through its still-valid catalog session token.
- A Book title, description, and cover change leaves a valid Cart line active
  and orderable.
- Catalog item, Variant, Book, Publisher, PO, and access failures have distinct
  reasons. Customer B cannot read or mutate Customer A’s Cart line.
- The old projection collapsed an unpresentable line to `removed`; P0 now
  distinguishes required, expired, and revoked access from actual item,
  Variant, Book, and Publisher unavailability.

The actual client Cargo 1 / Cargo 2 production records were not inspected or
mutated in this gate. No claim of Production repair is made.

`PHASE_1_CART = CART_ENGINEERING_GREEN_PENDING_PRODUCTION_UAT`

## Phase 1 Session

P0’s deterministic provider regression passed as part of the 17 frontend
tests: a valid Customer navigates through Account/Catalog/Secret Catalog/Book
detail, refreshes, returns to Account, and session A logout into session B
does not leak state. The reported live incident was not reproduced, and no
Production Clerk session was available for inspection. Release/auth
configuration still overlaps Security QA and requires reconciliation.

`PHASE_1_SESSION = OPEN_PENDING_SECURITY_QA_RECONCILIATION_AND_PRODUCTION_UAT`

## Phase 2 Build and Audit

| Check | Clean base | Phase 2 | Classification |
| --- | --- | --- | --- |
| `npm run build` | Compiles and type-checks; static prerender fails in Convex-query routes. First observed at `workspace-actions.tsx:75` (`useQuery` outside `ConvexProvider`). | Same compilation/type-check result and same provider boundary. Final Phase 2 run failed on `/account/addresses` and `/community`; prior A/B runs also listed `/catalog`. | `PRE_EXISTING_BASELINE_FAILURE`; `BUILD_PHASE2_REGRESSION = NO` |
| `npm audit` | 3 advisories: 2 moderate, 1 high. | Same 3 advisories; Phase 2 changed no dependencies. | `PRE_EXISTING_SAME` |

The first route named varies with static worker scheduling. The failing
boundary is the same and the guarded presentation fixture produced no new
prerender failure. The build blocker is owned by the pre-existing application
route/provider boundary; the evidence does not assign it to Phase 2, local
runtime configuration, or Security QA release settings. Security QA owns
remediation of the unchanged audit advisories.

## Phase 2 Rendered Responsive Evidence

The checked-in Playwright test renders the existing homepage under deterministic
states supplied only by the local `/verification/onboarding` fixture. The
server page calls `notFound()` when `NODE_ENV === "production"`. The fixture
does not represent Clerk or Convex authentication evidence.

The browser test passed all eight states at 390px and reloaded the active state:

| State | Render result |
| --- | --- |
| Signed out / new | Welcome, Join, and How To actions |
| No admission application | Welcome and Join; no duplicate form |
| Pending Join Request | Review guidance and WhatsApp request CTA; no Join CTA |
| Approved / invitation pending | Email activation guidance; no Join or duplicate WhatsApp CTA |
| Active Customer | Normal customer content; no welcome/Join CTA |
| Suspended Customer | No onboarding or re-registration CTA |
| Admin | No Customer conversion or Join CTA |
| Owner | No Customer conversion or Join CTA |

At 375, 390, 430, 768, 1280, and 1440px, the welcome remains in document
flow with no horizontal overflow. The close and primary targets are at least
44px. Floating Blessy is hidden while welcome/pending/invitation guidance is
shown; the card’s static Blessy art remains. At widths through 768px, the fixed
bottom navigation remains visible and hit-testable, and the centered welcome
card clears its top edge. At 1280/1440px there is no bottom navigation. The
actual rendered screenshots are retained under
`/private/tmp/bfg-onboarding-render-evidence-final/` (`welcome-375.png`,
`welcome-390.png`, `welcome-430.png`, `welcome-768.png`, `welcome-1440.png`,
plus eight 390px state images).

`tests/e2e/client-onboarding-responsive.spec.ts` is the repeatable browser
regression. `src/app/verification/onboarding/page.tsx` and its provider are
local presentation fixtures only; Production returns 404.

## WhatsApp, Join, and Admin

- Destination is fixed to `https://wa.me/6282347278881` with an encoded
  prefilled message: “Halo BFG, aku sudah mengisi pendaftaran Blessfriends di
  website. Aku ingin meminta link untuk bergabung ke WhatsApp Group BFG.”
- The link opens a new tab with `noopener noreferrer`; the site does not send
  a message automatically. No group invite URL, token, or user-controlled
  redirect is stored.
- The existing `joinRequests.submit` mutation and existing Admin approval
  decision remain in place. Join success shows the WhatsApp handoff. Admin sees
  a manual group-membership reminder before approval. No verification boolean
  or alternate membership table was added.
- Clerk remains identity, approval remains admission decision, the existing
  Clerk invitation remains onboarding, and `appUsers.role/status` remains the
  final membership authority.

## Green Preservation

Phase 2 did not change Clerk/Convex auth, `appUsers` authority, RBAC, ownership,
Secret Catalog access rules, Ready Stock, Batch, Finance, upload validation,
security headers/CSP, or rate limits. Security QA and P0 files remain in their
own worktrees. The Blessy visual seam is documented above for reconciliation.

## QA

| Area | Result |
| --- | --- |
| Focused onboarding/Admin/Join | 23 frontend + 8 Convex tests passed |
| Focused membership/auth | 65 frontend + 31 Convex tests passed |
| Frontend full suite | 74 files / 471 tests passed |
| Convex full suite | 47 files / 310 tests passed |
| Responsive Playwright | 1 test passed; 8 states, six widths; rendered screenshot evidence captured |
| P0 focused Cart/session | 17 frontend + 20 Convex tests passed in P0 worktree |
| TypeScript / ESLint / format | Pass |
| Build | Pre-existing ConvexProvider static-prerender failure; no Phase 2 regression |
| npm audit | Same as base: 3 advisories (2 moderate, 1 high) |
| Batch 2,000-item stress | Combined invocation timed out; isolated run passes on base (63.22s) and Phase 2 (66.60s); Phase 2 has no Batch file changes |
| `git diff --check` | Pass after final report edits |

One initial full frontend run had a timing-sensitive Admin Book dialog
assertion (470/471); the test file passed in isolation on both base and Phase
2, and the complete Phase 2 frontend suite passed on rerun (471/471). No
unrelated Admin Book change was made.

## Freeze and Verdicts

- Phase 2 is frozen by the commit containing this report and its intended
  onboarding changes. The P0 branch remains at its original base HEAD with
  its original intended dirty changes, as instructed; P0 source was not
  altered in this gate. Security QA remains untouched.
- `PHASE_2 = ENGINEERING_GREEN_PENDING_RECONCILIATION`
- No merge, deployment, Production UAT, or Phase 3 work was performed.
- `OVERALL = READY_FOR_LATER_RECONCILIATION`
