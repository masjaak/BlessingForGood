# Customer Mockup Visual Specification

Source: the eight inspected files in
`context/implementation/CUSTOMER-MOCKUP-SOURCE-MAP.md`.

## Global Customer Visual Language

- Warm cream/off-white canvas with a quieter cream surface for cards.
- Deep botanical green for display text, active navigation, and primary CTAs.
- Restrained warm brown/gold for price, shipment, and attention states.
- Pale green for successful or active supporting surfaces.
- Editorial serif display headings paired with a clean sans-serif UI/body.
- One-pixel warm borders, soft corners, generous vertical rhythm, and no
  glass, gradient, or generic SaaS treatment.

## Color Palette

The implementation keeps the existing semantic tokens because they already
match the inspected relationships: canvas `#fbf7ee`-like, surface near white,
primary deep green, pale green support, warm peach/gold accents, muted ink,
and warm border. New customer pages must consume those tokens rather than
introduce route-specific greens.

## Typography

- Display: editorial serif for page titles and book titles.
- Body/UI: readable sans-serif for descriptions, labels, controls, and dates.
- Page title is large but compact on mobile; operational account content uses a
  tighter scale than the home hero.
- Status, price, and metadata are visually subordinate to the title but remain
  easy to scan.

## Customer Header

- Mobile app pages use a compact three-part header: menu/back affordance on the
  left, centered brand treatment, and account/cart affordance on the right.
- The access screen is intentionally simpler: centered brand above the form.
- Desktop keeps the official BFG logo on the left with customer navigation and
  account access aligned on one restrained header row.

## Mobile Bottom Navigation

The inspected customer app screens show five items: `Beranda`, `Katalog`,
`Buku Saya`, `Tagihan`, and `Akun`. Each item uses an outlined/solid bookish
icon above a short label. The active item uses deep green; inactive items use
muted warm ink. The bar is warm cream with a quiet top border and must reserve
space for the iOS safe-area inset.

## Layout Grid

- Mobile content uses approximately 16–24px side gutters.
- Cards stack in one column on mobile and use compact two-column metadata where
  the information remains scannable.
- Desktop customer pages may expand to a restrained content width; the mobile
  hierarchy remains the authority for account flows.

## Page Gutters

Use the shared customer page wrapper. Do not add route-specific full-bleed
content except for an intentional cover/gallery or hero panel.

## Section Spacing

Use clear separation between title, filters, content cards, and actions. The
mockups favor consistent breathing room over dense dashboards.

## Cards

Cards use a warm surface, thin warm border, soft 12–16px radius, and minimal
shadow. Book rows prioritize cover, title/author/publisher, then price/status
and the action.

## Buttons

Primary actions are deep green with light text and generous touch height.
Secondary actions are light surface with a warm border. Full-width primary
actions are appropriate for mobile ordering and payment flows.

## Form Controls

Labels sit above controls. Inputs have warm borders, a light surface, a clear
focus ring, and enough height for touch. Validation and pending feedback stay
near the action and never expose implementation details.

## Status Treatment

Use compact rounded badges with semantic tones: pale green for complete/active,
warm gold for pending/attention, and muted cream for waiting/inactive. Price
and financial values use the warm brown accent visible in CM-05–CM-07.

## Empty States

Empty states extend the same card, spacing, and typography system. The mascot
supports the emotional gap when useful, with a short explanation and a real
next action. No sample books, invoices, orders, or account records are added.

## Logo Rules

Use the official local BFG assets. Keep the visible mark large enough to read
inside its transparent source bounds; use wrapper sizing/CSS scaling rather
than altering the masters.

## Mascot Rules

Use the local expressions intentionally: default for welcome/empty, warm for
guidance/help, and success for completed actions. Mascot placement supports a
message or empty space; it does not replace the primary content hierarchy.

## Responsive Behavior

Primary mobile widths are 375, 390, and 430. The bottom navigation is fixed
only when the customer app shell is active and all content/forms reserve its
height plus `env(safe-area-inset-bottom)`. Desktop removes the fixed bar and
uses the header navigation.

## Route-by-Route Requirements

| Route family | Visual parent | Required treatment |
| --- | --- | --- |
| `/`, `/community`, `/how-to-order`, `/join` | Existing BFG shell plus closest public rhythm | Editorial heading, warm cards, useful CTAs, intentional mascot guidance. |
| `/ready-stock`, `/ready-stock/[slug]` | CM-04 | Bookstore-like cover/detail presentation; preserve real search, filters, variants, price, and stock. |
| `/catalog` | CM-01–CM-03 | Private access first; authenticated browse/detail uses book rows, format controls, and order CTA. |
| `/sign-in` | CM-01 shell relationship | Clerk remains authoritative but sits on the BFG canvas with official branding. |
| `/account` | CM-08 | Needs attention → active/in progress → financial → recent activity. |
| `/account/orders`, `/account/orders/[orderId]` | CM-05–CM-06 | Status cards and vertical tracking hierarchy; preserve ownership and batch data. |
| `/account/invoices`, `/account/invoices/[invoiceId]` | CM-07 | Deposit, invoice, payment, adjustment, and refund projections use the same status language. |
| `/account/profile`, `/account/addresses` | CM-08 form extension | Compact grouped forms, clear save/delete feedback, mobile-safe controls. |
