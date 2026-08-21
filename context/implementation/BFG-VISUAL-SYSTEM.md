# BFG VISUAL SYSTEM

Reconciled: 2026-08-15
This is the compact visual contract. Shared implementation is the source for
exact styling; the mockup matrix is the source for screen relationships.

## BrandLogo

- Primary asset: `public/brand/logos/Logo-1` through `BrandLogo` in
  `src/components/brand.tsx`.
- Approved mascots: `Mascott-1.png` through `Mascott-4.png`; rendered through
  `BrandMascot` only in approved guidance, onboarding, empty/help, or brand
  placements.
- The sample “My Bookshelf” mark in the inspected source images is not the BFG
  brand contract.

## Admin Shell

- `src/components/site-shell.tsx`: `AdminShell` gives one desktop topbar with
  `Ruang kerja operasional`, customer-side link, `Aktivitas`, and avatar.
- `src/components/admin-layout-shell.tsx`: persistent `AdminNav` plus route
  content.
- `src/components/admin-nav.tsx`: grouped operational sections with one fixed
  icon wrapper, active row, badge alignment, and Owner-only system entries.
- Do not reintroduce wrapping or duplicate large notification/inbox controls.

## Customer Shell

- `SiteShell` uses public navigation when signed out and customer navigation
  when signed in.
- Desktop: logo, primary navigation, unified `WorkspaceActions`/Aktivitas,
  and Clerk avatar in one coherent header.
- Mobile: logo-only top header and `customer-bottom-nav` with Beranda, Katalog,
  Buku Saya, Tagihan, and Akun. Notification/Inbox are under Akun/Aktivitas.
- Admin access is a secondary workspace action, not a duplicate primary
  customer route.

## Spacing Tokens

The current token source is the beginning of `src/app/globals.css`:

- 4px base rhythm: `--space-1` through `--space-16` (4/8/12/16/20/24/32/40/48/64px).
- Radius: 8/12/16px and pill.
- Layout widths and responsive behavior stay in the shared CSS; page-specific
  margin hacks are not a visual-system fix.
- Phase 08 semantic relationship guidance is recorded in
  `BFG-SPACING-SYSTEM.md`; use it for Admin action/divider rhythm and Homepage
  chapter separation.

## Button Variants

`src/components/ui.tsx` owns `Button` and `LinkButton` variants:

- `primary`: canonical action;
- `secondary`: alternate action;
- `quiet`: low-emphasis navigation/support;
- `danger`: destructive/reversal action;
- sizes: default, compact, icon.

Pending state disables the control and renders a clear Indonesian pending
label. Errors and success are visible in the same action surface.

## Frame Variants

`Card` in `src/components/ui.tsx` uses semantic frames: operational, form,
table, list, summary, detail, empty, and attention. Use the frame that matches
the content relationship instead of inventing one-off containers.

## Icon System

Use the existing inline SVGs and shared icon wrappers in the shell/navigation.
Keep one optical size, baseline, gap, and active treatment. Do not add a new
icon package for a single glyph or use emoji as an operational icon.

Customer journey icons in `src/components/how-to-order.tsx` use the local
official Tabler Icons v3.46.0 outline subset: 24x24 viewBox, 2px
`currentColor` stroke, round caps, and round joins. The homepage preview reuses
this component; shell, navigation, and Admin icon systems remain unchanged.

## Dropdowns, Tables, and Forms

- `BFGSelect` is the shared select control.
- `.data-table`, `.table-wrap`, shared `Field`, and form classes provide the
  Admin operational grammar.
- Filters and actions remain bounded and readable at supported Admin widths.
- Customer forms favor one primary action, explicit validation, and recovery
  copy in Indonesian.

## Activity

`src/components/workspace-actions.tsx` owns the shared
`WorkspaceActivityProvider`, combined Activity trigger, and one unread count
projected from both canonical sources. `CustomerBottomNav` and `/account`
consume the same count, so the mobile Akun dot is data-backed without a second
unread-query path. Activity is one newest-first feed with compact `Sistem` and
`Pesan BFG` labels, no Notification/Inbox tabs, and no primary panel-level
`Buka Kotak Masuk` CTA. Desktop uses a bounded anchored panel; narrow Admin and
mobile use a bounded sheet/full-width Activity surface with vertical scrolling
only. The presentation is unified; backend Notification and Inbox storage,
ownership, retention, and read semantics stay separate.

## Page-aware Skeleton

`page-aware-skeleton.tsx`, `page-aware-skeleton-config.ts`,
`workspace-skeleton-content.tsx`, and
`workspace-skeleton-primitives.tsx` preserve ready-state geometry for dashboard,
Book Master, catalogs, users, batches, orders, Ready Stock, finance, and
customer pages. A skeleton is ready-state geometry without real content; it is
not a generic random loading animation and it must not move the shell.

## Headline Hierarchy and Language

- Indonesian-first customer and operational copy.
- Display headlines use the current display font; body/UI text uses the shared
  body font; money uses the shared `Money` formatter.
- Product/brand names such as Blessfriends, Secret Catalog, Ready Stock, and
  Aktivitas retain canonical naming.
- Technical internals stay out of customer copy unless needed for recovery.

## Responsive Breakpoints

The current shared CSS defines the responsive behavior around the existing
700/800/900/1100px media boundaries. Verify at the current Playwright viewports:

- customer: 375, 390, 430, 768, 1280, 1440px;
- Admin: 1024, 1280, 1440px.

Mobile is a layout contract, not a scaled desktop header. Desktop Admin remains
operational and table-friendly.

## Mobile Bottom Navigation

The five-link bottom nav is the mobile primary nav. It is always discoverable on
customer surfaces, uses the existing icons and current-page state, and never
auto-starts Clerk auth when signed out. Account gates start auth only from an
explicit `Masuk` action.

## Cover Uploader

`src/components/cover-upload-field.tsx` owns the BFG presentation: custom
picker trigger, selected filename, preview, pending, success, and local error
states over an accessible visually-hidden native file input. The actual
consequence remains in `src/components/admin-book-detail.tsx`:
`books.generateCoverUploadUrl` → validated Convex storage upload →
`books.attachCover` → durable customer-safe URL. Supported files are JPG, PNG,
or WebP up to 5 MB. Replacement attaches the new reference before deleting the
previous object.

## Visual Acceptance

`mockup → rendered implementation → comparison` is required. Token existence
alone is not a pass. A visual bug must be traced to its shared primitive,
rendered across consumers, checked at supported viewports, and recorded in the
mockup matrix before closure.
