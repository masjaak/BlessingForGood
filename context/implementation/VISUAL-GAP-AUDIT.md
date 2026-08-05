# BFG Visual Gap Audit

This audit compares the prototype implementation with the inspected mobile and admin references. It records system causes, not a claim of pixel-perfect equivalence. Reference screenshots contain another product name and sample records; only their visual hierarchy and interaction patterns are used.

## P0 — Brand and hierarchy

### Area: brand identity

- Current implementation: text-only `Blessing For Goods` wordmark and generic status colors.
- Mockup direction: consistent book/sprout identity, warm ivory surface, deep green anchor, restrained peach/gold/blue accents.
- Core issue: the product had no physical brand assets in the canonical repository, so the UI could not express the approved identity.
- Why it matters: brand recognition and trust are lost before a customer reaches catalog access.
- Recommended direction: use the audited `Logo-4.png` wordmark and `Logo-2.png` symbol through one registry and reusable `BrandLogo` component.
- Priority: P0
- Affected screens: all customer and admin screens.

### Area: typography hierarchy

- Current implementation: Arial is used for headings and body; hero sizing is disproportionately large for a small prototype shell.
- Mockup direction: editorial serif headings with compact sans-serif UI and data text.
- Core issue: one type treatment carries every information layer.
- Why it matters: catalog, order, and financial data do not scan with enough distinction.
- Recommended direction: use one deliberate system serif fallback for display/headings and one sans fallback for body/UI; keep mobile headings bounded.
- Priority: P0
- Affected screens: home, catalog, account, admin.

### Area: action hierarchy

- Current implementation: rounded pill buttons and dark generic primary treatment.
- Mockup direction: compact rectangular controls with one dark-green primary action and quieter outlined actions.
- Core issue: control shape and color do not distinguish submit, navigation, and destructive actions.
- Why it matters: the next safe action is harder to identify.
- Recommended direction: use shared button variants with 8px radius, visible focus, and green primary treatment.
- Priority: P0
- Affected screens: all forms and page headers.

## P1 — Layout and reusable components

### Area: surface and card treatment

- Current implementation: large rounded cards, a rotated hero panel, and generic shadows.
- Mockup direction: warm surfaces, thin beige borders, moderate radius, restrained elevation, and occasional sage-tinted panels.
- Core issue: surface tokens are generic and applied without density rules.
- Why it matters: the interface reads as a template dashboard instead of an operational bookstore.
- Recommended direction: centralize surface, border, radius, and shadow tokens; use cards only where they group a decision or state.
- Priority: P1
- Affected screens: all screens.

### Area: navigation

- Current implementation: one wrapping public link row and an admin pill row; no mobile-specific customer navigation.
- Mockup direction: customer bottom navigation and a desktop-first admin sidebar/header pattern.
- Core issue: customer and operator mental models share the same navigation shape.
- Why it matters: users cannot quickly distinguish browsing, orders, account, and operations.
- Recommended direction: add reusable customer navigation labels for Home, Catalog, Ready Stock, Orders, and Account; keep only implemented routes; make admin navigation clearly separate.
- Priority: P1
- Affected screens: site shell and admin pages.

### Area: empty and communication states

- Current implementation: text and an em dash mark only.
- Mockup direction: friendly illustration used sparingly for welcome, guide, support, and empty states.
- Core issue: state communication is visually flat.
- Why it matters: a zero-data prototype can look broken instead of intentionally safe.
- Recommended direction: use `Mascott-1.png`, `Mascott-3.png`, and `Mascott-4.png` only in communication states, never in ledgers or dense tables.
- Priority: P1
- Affected screens: home, catalog access, ready stock, account, help, admin empty states.

## P2 — Interaction and responsive behavior

### Area: responsive composition

- Current implementation: desktop nav collapses to a vertical block; grids stack but there is no customer bottom navigation or admin table density rule.
- Mockup direction: mobile-first customer screens with fixed navigation and desktop-first admin operations with controlled table overflow.
- Core issue: responsive behavior is generic breakpoint stacking.
- Why it matters: important actions and route context become harder to reach on 375px screens.
- Recommended direction: add compact mobile navigation, preserve 44px touch targets, and make tables explicitly scrollable rather than shrink unreadably.
- Priority: P2
- Affected screens: customer shell, catalog, account, admin.

### Area: form and status states

- Current implementation: shared fields exist, but loading/error/success styling is sparse and status tones cover only neutral/positive/warning.
- Mockup direction: clear state badges, deadline visibility, focus rings, and explicit empty/closed/error states.
- Core issue: state semantics are present in domain logic but not consistently surfaced by the visual layer.
- Why it matters: access, catalog closing, order progress, and invoice states can be misread.
- Recommended direction: refine shared field, badge, timeline, and empty-state styles without changing domain transitions.
- Priority: P2
- Affected screens: catalog, order, invoice, admin.

## P3 — Decoration and polish

### Area: iconography and imagery

- Current implementation: text arrows and a dash empty mark; no book-cover field exists in the domain model.
- Mockup direction: small line icons and book imagery in catalog surfaces.
- Core issue: asset intake provides brand/mockup references, not approved book-cover data or an icon library.
- Why it matters: adding invented covers or a new dependency would create product scope and fake data.
- Recommended direction: use text and semantic controls for now; revisit real book imagery only when catalog asset fields and approved sources exist.
- Priority: P3
- Affected screens: catalog and admin catalog.
