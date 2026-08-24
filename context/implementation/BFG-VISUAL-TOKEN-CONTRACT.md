# BFG Visual Token Contract

Status: Phase 07.1 local implementation contract, 2026-08-15

Source precedence for this contract is the latest explicit visual QA, the
approved Admin and Customer mockups, official local assets, then the existing
shared UI primitives. Mockup records are reference-only and are not seeded.

## Layout

| Token | Value | Meaning |
| --- | --- | --- |
| `--layout-page-inline-admin` | `24px` | Admin canvas gutter at desktop widths |
| `--layout-page-inline-customer` | `16px` | Customer canvas gutter at mobile widths |
| `--layout-page-top` | `32px` | Operational page top offset |
| `--layout-page-bottom` | `48px` | Page breathing room after the final frame |
| `--layout-content-max` | `1480px` | Admin content canvas ceiling |
| `--layout-sidebar-width` | `236px` | Canonical Admin sidebar column |
| `--layout-header-height` | `72px` | Admin topbar rhythm |

## Spacing

Base scale: `4 / 8 / 12 / 16 / 24 / 32 / 40 / 56px`.

| Relationship | Token | Value |
| --- | --- | --- |
| Page title → description | `--title-description-gap` | `8px` |
| Description → first section | `--description-section-gap` | `24px` |
| Section → section | `--section-section-gap` | `32px` |
| Frame → frame | `--frame-frame-gap` | `16px` |
| Operational frame padding | `--frame-padding-operational` | `20px` |
| Form frame padding | `--frame-padding-form` | `24px` |
| Table frame padding | `--frame-padding-table` | `0` |
| Empty-state padding | `--frame-padding-empty` | `32px 20px` |
| Frame heading rhythm | `--frame-heading-gap` | `14px` |
| Label → field | `--form-label-field-gap` | `8px` |
| Field → field | `--form-field-field-gap` | `16px` |
| Toolbar → content | `--toolbar-content-gap` | `16px` |
| Button group | `--button-group-gap` | `8px` |
| Sidebar section → section | `--sidebar-section-gap` | `24px` |
| Sidebar heading → first item | `--sidebar-heading-item-gap` | `8px` |
| Sidebar item → item | `--sidebar-item-gap` | `4px` |

## Typography

The existing Georgia/Arial pairing remains authoritative:

| Role | Family | Size / line-height | Weight / tracking |
| --- | --- | --- | --- |
| Page heading | Display | `clamp(1.9rem, 3vw, 2.8rem)` / `1.04` | 400 / editorial negative tracking |
| Section heading | Display | `1.2rem` / `1.08` | 400 |
| Body / description | Body | `1rem` / `1.55` | 400 |
| Form label | Body | `.78rem` / `1.2` | 800 / no extra tracking |
| Metadata | Body | `.82rem` / `1.4` | 400 |
| Table header | Body | `.75rem` / `1.2` | 800 / controlled uppercase tracking |
| Sidebar section label | Body | `.63rem` / `1.2` | 800 / `.12em` uppercase |
| Sidebar item | Body | `.8rem` / `20px` | 600 / zero tracking |

## Buttons

`Button` and `LinkButton` emit the same `button-size-*` geometry. Variants
change meaning and color, not the baseline box model.

| Size | Height | Horizontal padding | Radius | Use |
| --- | --- | --- | --- | --- |
| `default` | `44px` | `16px` | `10px` | primary, secondary, destructive actions |
| `compact` | `40px` | `12px` | `10px` | desktop-only dense operational actions |
| `large` | `48px` | `20px` | `10px` | hero, mobile, and major conversion actions |
| `icon` | `44px` | `0` | `10px` | icon-only control with a labeled accessible name |
| `tertiary` | `44px` | `12px` | transparent | low-emphasis navigation or inline action |

## Frames

`Card` is the shared frame primitive. Its `frame` prop documents the semantic
surface without creating a route-specific card system.

| Frame | Geometry | Use |
| --- | --- | --- |
| `operational` | `20px` padding, `1px` border, `12px` radius | ordinary queue or content surface |
| `form` | `24px` padding | grouped input and save surface |
| `table` | `0` outer padding | table shell with its own header/row rhythm |
| `list` | `20px` padding | repeated record row/card |
| `summary` | `20px` padding | metric strip or summary item |
| `detail` | `20px` padding | record detail or two-column detail panel |
| `empty` | `32px 20px` padding | operational empty state inside its container |
| `attention` | `20px` padding | queue requiring review or action |

## Logo and icon exceptions

`BrandLogo` is the only logo presentation primitive. It uses official `Logo-1`
for primary and Admin variants, preserves the master proportions, and places
the image inside `.brand-logo-frame-*`. Header frames clip transparent source
whitespace; auth and splash presentations intentionally keep overflow visible
so the scaled mark is not cropped. The single `--logo-optical-y` /
`--logo-scale` correction is owned by the primitive and is not repeated in
route CSS.

Admin icons use one `24px` wrapper, one `18px` SVG box, one `20px` label
baseline, and one `12px` icon-label gap. Per-route row offsets are forbidden.

## Responsive contract

Admin uses the `236px` sidebar at desktop and the existing horizontal navigation
mode at `900px`. Customer uses the five-item bottom navigation at mobile
widths; `main` reserves the fixed bar plus safe-area space. Required QA widths
are Admin `1024 / 1280 / 1440` and Customer `375 / 390 / 430 / 1440`.
