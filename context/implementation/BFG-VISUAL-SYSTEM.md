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

`src/components/ui.tsx` owns the canonical `Button`, `LinkButton`,
`IconButton`, `LinkIconButton`, `ToggleButton`, and `ActionGroup` family:

- `primary`: canonical action;
- `secondary`: alternate action;
- `tertiary`: low-emphasis navigation/support where interaction is already clear;
- `danger`: destructive/reversal action;
- sizes: compact (40px desktop density), default (44px), large (48px), and
  icon (44×44px through `IconButton`).

Loading state disables the control, preserves geometry, and renders a clear
`loadingLabel`. Errors and success remain visible in the surrounding action
surface; the button is not the only outcome signal.

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
previous object. `BookCover` presents the uploaded source at its intrinsic
ratio in normal flow (`width: 100%; height: auto`) inside the existing border,
radius, and width constraints; Admin does not manage zoom, position, or frame
ratio. The old fixed 2:3 frame is superseded for image-backed covers; only the
no-image placeholder keeps placeholder geometry.

## Product Gallery Thumbnails

`src/components/product-gallery.tsx` owns the existing stage, previous/next
controls, and thumbnail selection. Thumbnail images use a normalized height and
intrinsic-ratio width within the existing BFG maximum, with horizontal
overflow for a tidy row. Portrait, square, and landscape assets are not forced
into a shared wide crop shell.

## Visual Acceptance

`mockup → rendered implementation → comparison` is required. Token existence
alone is not a pass. A visual bug must be traced to its shared primitive,
rendered across consumers, checked at supported viewports, and recorded in the
mockup matrix before closure.

## Phase 08 Targeted Interaction Contract — 2026-08-21

The real Production screenshots reopened Phase 08 for a bounded interaction,
form, and journey-rhythm correction. This does not reopen business domains or
start Phase 09.

- `Button` and `LinkButton` share the semantic variants `primary`, `secondary`,
  `tertiary`, and `danger`. `IconButton` and `LinkIconButton` require an
  accessible name; `ToggleButton` is reserved for selected/unselected controls.
  Each genuinely clickable control has visible default,
  hover, active/pressed, focus-visible, and disabled states. Secondary and tertiary
  surfaces must remain visibly distinct from cream, white, and light-green
  frames; danger never inherits a positive-action hover treatment.
- Interaction timing is restrained and shared. Pointer hover is additive on
  hover-capable devices; touch feedback comes from active/pressed state, not a
  sticky hover approximation. Icon-only buttons and button-like links consume
  the same state grammar. Non-interactive badges and count labels do not gain
  click affordance.
- `src/components/bfg-file-picker.tsx` is the shared BFG file-picker primitive.
  It keeps the native file input in the accessibility tree while visually
  hiding browser chrome and owns the custom trigger, empty/selected filename,
  accepted-file helper, validation/error, disabled, pending, required, and
  focus states. Cover, Gallery, Deposit, Payment, and Bulk Import visible file
  controls route through this presentation.
- How To Order keeps the locked seven-step Tabler journey. Desktop uses one
  shared grid/subgrid for number, icon, headline, and description rows; the
  headline block is calibrated for one or two lines so description starts align
  without per-step margins. Mobile/tablet keep the vertical structure and use
  semantic shared gaps for step rhythm, final-step → help card, help card → CTA,
  and CTA → bottom navigation safe-area clearance.
