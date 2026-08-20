# BFG SPACING SYSTEM

Status: `ACTIVE — PHASE 08 SPACING STABILIZATION`
Reconciled: 2026-08-20 (Asia/Jakarta)

This document defines relationships, not page-specific pixel patches. Existing
global tokens remain the implementation source; new work must use these
semantic roles.

## Principles

- Space communicates grouping and separation.
- Related controls stay compact; actions remain distinct from content and
  dividers.
- Admin stays dense enough for operations without crowding.
- Customer Homepage sections read as distinct storytelling chapters.
- Shared tokens are preferred over route-specific margins.

## Base Scale

Use the existing 4px-based scale: 4, 8, 12, 16, 20, 24, 32, 40, 48, and
64px. The semantic relationship selects the token.

## Inline Spacing

Icon-to-label and tightly related inline content use `--space-xxs` to
`--space-xs` (4–8px). Do not use section spacing for inline controls.

## Control Groups

Related buttons and controls use `--button-group-gap` (8px), with aligned
baselines and shared control heights. Dense table actions may stay compact.

## Form Groups

Label-to-field uses `--form-label-field-gap`; sibling fields use
`--form-field-field-gap`. A form action group is separate from the fields by
the form/card rhythm, not an individual button margin hack.

## Action Groups

Content-to-actions uses `--space-lg` (24px) where the action group is a
separate region; inline or table actions use the compact control gap. Action
groups should be a flex/grid region, not scattered per-button margins.

## Divider → Action

When a divider closes a summary/content group, use a semantic `--space-md`
(16px) minimum before the action group. Existing summary rows retain their
dense row padding; only the action region receives separation.

## Frame Internal Padding

Use the existing frame variants: operational 20px, form 24px, table 0px with
the table’s own row treatment, empty 32px/20px. Do not globally inflate Card.

## Frame → Frame

Sibling operational frames use `--frame-frame-gap` (16px). Major Admin page
sections use `--description-section-gap` (24px) where content needs a clearer
boundary. Avoid a fixed-height spacer.

## Major Section Rhythm

Major section separation is larger than internal card gaps. On the Homepage,
use responsive semantic tokens rather than repeating literal `padding-top` in
each section:

```text
--homepage-section-gap-mobile: 32px
--homepage-section-gap-tablet: 40px
--homepage-section-gap-desktop: 48px
```

These are starting rhythm values to be validated by rendered geometry; they
must not create blank space that overwhelms the next story chapter.

## Homepage Section Rhythm

The locked order remains:

```text
Hero → Journey → Discovery → Join → How To Order → Mengenal BFG → Footer
```

Internal heading/content gaps remain tighter than the section boundary. The
hero’s Journey is part of the hero chapter; Discovery starts the next major
chapter. Footer/bottom-nav clearance remains shell-owned.

## Responsive Rules

- Mobile 375/390/430 keeps breathing room; do not collapse sections to fit the
  first viewport.
- Tablet 768 keeps clear section boundaries without desktop dead space.
- Desktop 1280/1440 uses generous chapter separation while preserving scan
  density.
- No horizontal overflow or unreachable action may be introduced.

## Dense Admin Exceptions

Tables, row summaries, filters, and compact operational controls may use the
compact scale. They still need visible separation from row dividers and card
borders. Dense does not mean touching.

## Optical Exceptions

An exception requires a rendered visual reason and belongs on the shared
semantic region, not a page-specific selector. No optical exception is added by
this milestone before representative Admin surfaces are rendered.
