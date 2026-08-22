# BFG Button Design System

Status: ACTIVE — canonical customer + admin interaction contract, 2026-08-22.

Source of truth:

- Primitive family: `src/components/ui.tsx`
- Visual tokens and states: the final `BFG global button system` block in
  `src/app/globals.css`
- Source inventory and route matrix: `BFG-BUTTON-AUDIT.md`

## Principles

Every control must answer immediately: is it clickable, what will it do, how
important is it, and what state is it in? Primary emphasis is scarce. Pages
own layout; the shared primitive owns button visual language.

The system adapts the hierarchy and state principles documented by
[Carbon](https://carbondesignsystem.com/components/button/usage/),
[Atlassian](https://atlassian.design/components/button/),
[Primer](https://primer.style/product/components/button/), and
[WCAG 2.2](https://www.w3.org/WAI/standards-guidelines/wcag/).

## Semantics and family

- `Button` causes an action or state change.
- `LinkButton` and `LinkIconButton` navigate with anchor semantics.
- `IconButton` is for a recognizable icon-only action and requires an
  accessible name.
- `ToggleButton` is reserved for selected/unselected controls.
- `ActionGroup` owns related-action gap, wrapping, alignment, and stacking.
- Status badges, chips, cards, and navigation rows are not buttons unless they
  genuinely trigger interaction.

Navigation stays a link. Mutations stay a button. A disabled or loading
`LinkButton` becomes an inert explained control instead of a fake active link.

## Variants and hierarchy

| Variant | Use | BFG treatment |
| --- | --- | --- |
| Primary | Highest-priority action in one decision region | Solid dark BFG green, inverse text |
| Secondary | Legitimate alternative/supporting action | Visible sage surface, dark green text, semantic border |
| Tertiary | Lower-emphasis utility where affordance is already clear | Transparent, green label, tinted hover |
| Danger | Delete, revoke, reject, irreversible cancellation, financial consequence | Soft danger surface/border; explicit consequence label |

Normally one primary appears inside a card, form footer, modal, workflow step,
or action group. Independent operational regions may each have a primary.

## Sizes and shape

- `compact`: 40px desktop Admin density only.
- `default`: 44px standard control.
- `large`: 48px hero, mobile full-width, and major conversion CTA.
- `IconButton`: 44×44px minimum default target.
- Compact remaps to at least 44px at touch breakpoints.
- Buttons are rounded rectangles using the canonical control radius. Pills are
  reserved for chips, tags, status, and segmented controls.

## Typography and icons

Button labels use sentence case, concise verb-first copy, and one line. The
primitive controls font, size, weight, line-height, letter spacing, and
`white-space: nowrap`; rewrite labels before changing layout. Icons are
optional, use the existing BFG family, and use one 8px icon-label gap. Icon-only
controls require `aria-label`.

## States

Every variant has default, hover, active/pressed, focus-visible, loading, and
disabled/inactive treatment where applicable.

- Default already looks actionable; hover enhances rather than reveals it.
- Hover is restrained and does not translate the control.
- Active is tonal and immediate on touch.
- Focus-visible uses the shared high-contrast gold ring with a controlled
  offset.
- Loading disables duplicate activation, announces the loading label, and
  preserves the control's geometry.
- Disabled is readable, visibly inactive, and has no hover/active treatment.

Async mutations follow `idle → loading → success/error`. Existing callsites
retain their success/error copy and server authority; this system does not
change RBAC, ownership, state machines, rate limits, or idempotency.

## Spacing and groups

- Inline action gap: `--button-inline-gap` / 8px.
- Stacked action gap: `--button-stack-gap` / 12px.
- Button-to-helper gap: `--button-helper-gap` / 12px.
- Action-to-divider/card relationship: `--button-section-gap` / 24px, with
  frame padding remaining the frame's responsibility.

Use `ActionGroup`, `.actions`, or `.form-actions` as shared structural regions;
do not add per-button margins. Transactional form/modal order is lower
emphasis first, primary completion action last. On mobile, important actions
stack/full-width rather than wrapping labels or shrinking targets.

## Accessibility

The BFG touch target is 44×44px. See [WCAG Target Size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html),
[Focus Visible](https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html),
and [Name, Role, Value](https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html).
Keyboard focus remains visible; native buttons retain Enter/Space behavior;
links retain navigation semantics; loading uses `aria-busy` and a live label.

## Examples

Admin: `Terbitkan invoice` is primary, `Simpan draf` secondary, `Batalkan
invoice` danger, and `Buka detail` a `LinkButton`.

Customer: `Buka Secret Catalog` or `Catat preorder` is primary in its current
decision region, supporting routes are secondary/tertiary, and quantity +/-
uses named `IconButton` controls.

## Do / Don't

Do classify action vs navigation, select one hierarchy, preserve loading
geometry, give icon controls names, and use shared spacing.

Don't use `quiet`, page-local button colors, route-local radii/hover rules,
button-like anchors for mutations, clickable status badges, raw clickable
divs, vague `OK`/`Ya` labels, multiline labels, or multiple competing primary
buttons in one decision region.
