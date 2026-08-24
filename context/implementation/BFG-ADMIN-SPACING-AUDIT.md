# BFG Admin Spacing Audit — Phase 08 Reopen

Reconciled: 2026-08-21 (Asia/Jakarta)

This is a relationship audit, not a CSS-only closure. The latest supplied
Production screenshot is accepted as evidence that the previous Catalog action
spacing status was wrong. The Catalog left creation frame remains frozen. The
current code correction uses the existing 4px scale through semantic Admin
tokens and is covered by local component tests; authenticated Production
rendering is still required before any row can become `GREEN_REAL_PRODUCTION`.

Evidence labels:

- `LOCAL_COMPONENT`: source and focused component test; not Production proof.
- `PRODUCTION_PRE_FIX`: the supplied real screenshot contradicting the prior
  green label.
- `AUTH_REQUIRED`: authenticated Admin rendering was unavailable in this
  session; the row is not closed by CSS inspection.
- `GREEN_DETERMINISTIC`: code/test behavior is covered but may still need live
  operator or rendered confirmation.
- `BLOCKED_EXTERNAL`: no authenticated browser/deploy authority in this run.

## Admin action-region matrix

| Route | Component / Region | Relationship | Current Token | Problem | Expected Semantic Relationship | Shared Fix | Rendered Evidence | 1024 | 1280 | 1440 | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Dashboard | Queue cards | description → action | `--space-action-support` 12px | Direct sibling copy/action was visually dependent on generic margins | Supporting copy is distinct from its action | `.action-region` + `.action-support` | `LOCAL_COMPONENT` | `AUTH_REQUIRED` | `AUTH_REQUIRED` | `AUTH_REQUIRED` | `GREEN_DETERMINISTIC + BLOCKED_EXTERNAL` |
| Books | Publisher/book forms | control ↔ control | `--button-group-gap` 8px | Dense form controls need aligned, non-touching controls | Inline controls share compact baseline gap | Existing `.form-actions` | `AUTH_REQUIRED` | `AUTH_REQUIRED` | `AUTH_REQUIRED` | `AUTH_REQUIRED` | `GREEN_DETERMINISTIC + BLOCKED_EXTERNAL` |
| Book Detail | Cover and save actions | content → action | `--space-divider-to-actions` / form rhythm | Cover alignment was a proven green surface; do not redesign it | Cover content and actions remain aligned with shared CoverUploadField | Existing CoverUploadField/form grammar; no new route margin | `AUTH_REQUIRED` | `AUTH_REQUIRED` | `AUTH_REQUIRED` | `AUTH_REQUIRED` | `GREEN_DETERMINISTIC + BLOCKED_EXTERNAL` |
| Catalogs | Catalog card footer | divider/content → action | `--space-content-to-actions` 24px | **Proven defect:** `Kelola katalog` and `Tutup katalog` were separate, too close; draft helper copy touched action hierarchy | Card content → action region; primary ↔ danger 12px; action → helper 12px | `.action-region-separated` + `.action-stack` + `.action-support` | `PRODUCTION_PRE_FIX` + `LOCAL_COMPONENT` | `AUTH_REQUIRED` | `AUTH_REQUIRED` | `AUTH_REQUIRED` | `GREEN_DETERMINISTIC + BLOCKED_EXTERNAL` |
| Catalog Detail | Detail form/action footer | control ↔ control | `--button-group-gap` 8px | Existing form action group was not the Catalog screenshot cause | Related controls stay inline and separate from content | Existing `.form-actions`; shared region available for helper copy | `AUTH_REQUIRED` | `AUTH_REQUIRED` | `AUTH_REQUIRED` | `AUTH_REQUIRED` | `GREEN_DETERMINISTIC + BLOCKED_EXTERNAL` |
| Ready Stock | Inventory/table actions | row → action | compact table action gap | Dense rows must not touch dividers or neighboring data | Row action stays compact but visibly separate | Existing table/action tokens | `AUTH_REQUIRED` | `AUTH_REQUIRED` | `AUTH_REQUIRED` | `AUTH_REQUIRED` | `GREEN_DETERMINISTIC + BLOCKED_EXTERNAL` |
| Orders | List row status/actions | row → action | `--button-group-gap` 8px | No shared production render available in this pass | Row controls remain compact and aligned | Existing `.form-actions`/table action rules | `AUTH_REQUIRED` | `AUTH_REQUIRED` | `AUTH_REQUIRED` | `AUTH_REQUIRED` | `GREEN_DETERMINISTIC + BLOCKED_EXTERNAL` |
| Order Detail | Summary → operational action | divider → action | `--space-divider-to-actions` 16px | Requires visual confirmation of detail footer density | Summary closes before its action region begins | Existing summary-to-action rule | `AUTH_REQUIRED` | `AUTH_REQUIRED` | `AUTH_REQUIRED` | `AUTH_REQUIRED` | `GREEN_DETERMINISTIC + BLOCKED_EXTERNAL` |
| Batch PO | Batch list cards | card ↔ card | `--frame-frame-gap` 16px | Cards must remain one list without touching or dashboard-like gaps | Clear frame separation with operational density | Existing content-stack/frame tokens | `AUTH_REQUIRED` | `AUTH_REQUIRED` | `AUTH_REQUIRED` | `AUTH_REQUIRED` | `GREEN_DETERMINISTIC + BLOCKED_EXTERNAL` |
| Batch Detail | Lifecycle actions/helper | action group → helper | `--space-action-support` 12px | Lifecycle controls and lock explanation were separate siblings | Controls are one action region; lock explanation is supporting copy | `.action-region` + `.action-support` | `LOCAL_COMPONENT` | `AUTH_REQUIRED` | `AUTH_REQUIRED` | `AUTH_REQUIRED` | `GREEN_DETERMINISTIC + BLOCKED_EXTERNAL` |
| Exceptions | Review/adjustment actions | content → action | form/card rhythm | Multiple state-dependent actions need operational grouping | Related controls compact; state explanation separated | Existing `.form-actions`; shared support class where needed | `AUTH_REQUIRED` | `AUTH_REQUIRED` | `AUTH_REQUIRED` | `AUTH_REQUIRED` | `GREEN_DETERMINISTIC + BLOCKED_EXTERNAL` |
| Invoices | Invoice list actions | row → action | compact table gap | No current authenticated render | Row actions do not touch metadata or dividers | Existing table action tokens | `AUTH_REQUIRED` | `AUTH_REQUIRED` | `AUTH_REQUIRED` | `AUTH_REQUIRED` | `GREEN_DETERMINISTIC + BLOCKED_EXTERNAL` |
| Invoice Detail | Payment review/lifecycle actions | summary → action → helper | 24px / 8px / 12px semantic gaps | Review link, issue/void actions, and void reason used separate hierarchy | Summary → action region; action group → reason copy | `.action-region-separated` + `.action-support` | `LOCAL_COMPONENT` | `AUTH_REQUIRED` | `AUTH_REQUIRED` | `AUTH_REQUIRED` | `GREEN_DETERMINISTIC + BLOCKED_EXTERNAL` |
| Deposit | Allocation panel | content → submit/helper | form rhythm / `--space-action-support` | Eligible live allocation not available; zero-balance state must stay dense but clear | Form → action → bounded helper explanation | Existing form actions; shared support class when composed | `AUTH_REQUIRED` | `AUTH_REQUIRED` | `AUTH_REQUIRED` | `AUTH_REQUIRED` | `GREEN_DETERMINISTIC + BLOCKED_EXTERNAL` |
| Payments | Review action region | confirmation → action | `--space-divider-to-actions` 16px | No authenticated Production render | Payment review action is separate from confirmation summary | Existing summary/form action rules | `AUTH_REQUIRED` | `AUTH_REQUIRED` | `AUTH_REQUIRED` | `AUTH_REQUIRED` | `GREEN_DETERMINISTIC + BLOCKED_EXTERNAL` |
| Refunds | Refund action cards | summary → action | compact form/action gap | No authenticated Production render | Financial action is distinct from payout summary | Existing `.form-actions` and summary rules | `AUTH_REQUIRED` | `AUTH_REQUIRED` | `AUTH_REQUIRED` | `AUTH_REQUIRED` | `GREEN_DETERMINISTIC + BLOCKED_EXTERNAL` |
| Users / Access | User/invitation cards | card content → action | form rhythm / compact action gap | Owner/admin controls need clear grouping | Identity metadata precedes related access actions | Existing form/card action rules | `AUTH_REQUIRED` | `AUTH_REQUIRED` | `AUTH_REQUIRED` | `AUTH_REQUIRED` | `GREEN_DETERMINISTIC + BLOCKED_EXTERNAL` |
| Content | Editor → save/publish | form → action | form rhythm | No production render in this session | Save/publish controls are a distinct action group | Existing `.form-actions` | `AUTH_REQUIRED` | `AUTH_REQUIRED` | `AUTH_REQUIRED` | `AUTH_REQUIRED` | `GREEN_DETERMINISTIC + BLOCKED_EXTERNAL` |
| Settings | Configuration fields → save | form → action/helper | form rhythm / 12px support | Existing consumed fields must remain compact and understandable | Field groups → save action; helper copy is not button caption | Existing form grammar; no decorative fields added | `AUTH_REQUIRED` | `AUTH_REQUIRED` | `AUTH_REQUIRED` | `AUTH_REQUIRED` | `GREEN_DETERMINISTIC + BLOCKED_EXTERNAL` |
| Activity Log | Table/empty action | table/empty state → action | compact table/empty rhythm | No production render in this session | Empty-state action is separate from explanation | Existing empty/form action rules | `AUTH_REQUIRED` | `AUTH_REQUIRED` | `AUTH_REQUIRED` | `AUTH_REQUIRED` | `GREEN_DETERMINISTIC + BLOCKED_EXTERNAL` |

## Page-level relationships

| Relationship | Canonical source | Audit result |
|---|---|---|
| Page intro → first frame | `--layout-page-top`, page header/content stack | Existing shared layout; authenticated render pending |
| Frame → frame | `--frame-frame-gap` 16px | Existing shared layout; Catalog left frame remains intrinsic |
| Section header → content | `--description-section-gap` 24px / frame heading gap | Existing shared layout; no global inflation |
| Table toolbar → table | `--toolbar-content-gap` 16px | Existing shared toolbar grammar; render pending |
| Empty state → action | empty frame/action grammar | Existing shared UI; render pending |
| Form → submit action | form/card rhythm + `.form-actions` | Existing shared UI; no route magic added |
| Divider → action | `--space-divider-to-actions` 16px minimum | Catalog uses the separated action region; other routes retain shared rule |

## Closure rule

The Catalog correction is not called real Production green until the deployed
`/admin/catalogs` page is rendered at 1024, 1280, and 1440 with an authenticated
session and visibly shows:

```text
divider → breathing room → Kelola katalog → 12px → Tutup katalog
Kelola katalog → 12px → Draft helper copy
```

The same rule applies to every `AUTH_REQUIRED` row above. No row is closed by
class names, source inspection, or deterministic tests alone.

## Maintenance conditional-action audit — 2026-08-22

The latest evidence specifically covered state-dependent combinations that the
earlier always-visible audit did not close:

| State combination | Shared primitive | Result |
| --- | --- | --- |
| Order without invoice | `ActionGroup` around the primary `Terbitkan invoice` CTA and helper copy | Clear next action with no touching controls. |
| Invoice draft | `ActionGroup` around `Buka operasi invoice` and conditional issue action | Primary/secondary hierarchy and shared gap. |
| Invoice issued/void | Same group with issue action absent when ineligible | No dead issue control. |
| Book Draft | Responsive `ActionGroup` around Save and explicit Publish | Save remains primary; Publish is distinct and state-dependent. |
| Batch/payment conditional actions | Existing shared action/form tokens remain the contract | No route-local margin patch introduced. |

The conditional audit is locally green by source, component tests, TypeScript,
ESLint, Prettier, and full deterministic regression. Authenticated viewport
evidence is still a separate Production gate.
