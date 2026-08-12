# BFG Mobile Visual Grammar

Status: V4.1 visual source of truth

The eight files in `public/mockups/mobile/` were inspected directly. They are
device renders, so the phone frame is reference context; the screen content is
the production visual authority. The mockups use the same compact product shell
across catalog, orders, tracking, invoices, and account.

## Canvas

- Warm paper canvas, approximately `#fbf7ee`, with no gradient or dark page chrome.
- Mobile content starts below a compact centered brand header and ends above a fixed bottom navigation bar.
- Customer page gutter is 16px at 390px, expanding to a centered max-width on larger screens.
- Content is left aligned except for access/auth moments where the title, explanation, and primary action are centered.

## Typography

- Deep forest serif is reserved for page titles and important card headings.
- Rounded, calm sans-serif carries body copy, labels, controls, metadata, and navigation.
- Mobile page titles are approximately 34-38px, with tight but readable line-height.
- Section titles are approximately 20-24px. Card titles are approximately 16-20px.
- Body copy remains 15-16px on mobile. Metadata and labels are 11-13px.
- Money is visually emphasized with warm rust, not a separate oversized display system.
- Headings use normal readable tracking; body copy avoids tight letter spacing.

## Spacing

- 4px base rhythm, with recurring 8, 12, 16, 20, 24, and 32px steps.
- Header to page title: 18-24px.
- Title to supporting copy: 8-10px.
- Section/card gap: 12-16px.
- Card padding: 16px on mobile, 20-24px at desktop.
- Bottom navigation clearance is always included in the customer main flow.

## Layout

- One coherent app shell: brand header, page content, fixed five-item customer nav on mobile.
- Product lists favor compact rows with a clear image column and a denser information column.
- Detail views give the book image high priority, then present format, metadata, description, and action in order.
- Desktop expands the same sections into a restrained two-column or grid layout; it does not become a marketing landing page.

## Card Language

- Cards are warm surfaces on the paper canvas, separated by 1px tan borders.
- Radius is restrained and consistent, approximately 12-16px.
- Shadows are very soft or absent. Border and background do the structural work.
- Content cards, book cards, status cards, form panels, and detail panels share the same surface grammar, with color blocking reserved for meaning.
- Green-tinted cards communicate active or positive states. Peach/yellow cards communicate warmth or attention.

## Button Language

- Primary actions are forest green, full-width when the action is the page conclusion, and compact when inline.
- Secondary actions are paper-filled with a tan border.
- Inline/text actions are green text with no oversized pill treatment.
- Buttons are 44-48px high, with 10-12px radius and medium-bold type.
- Disabled, pending, and focus states preserve the same geometry and provide clear contrast.

## Form Language

- Labels sit above fields and remain visible; placeholders are supporting text only.
- Inputs are 48px or taller, paper-filled, tan-bordered, and 10-12px rounded.
- Focus uses a green border and a soft green ring.
- Error copy sits immediately below the affected field or form block in the danger color.
- Forms use the same card and spacing system as catalog access, Join, profile, address, and payment confirmation.

## Navigation

- Mobile bottom nav is app-native: five equal destinations, thin top border, warm paper background, line icons, short labels.
- Active destination uses forest green and a pale green backdrop; inactive destinations use muted brown-gray.
- Desktop uses a quiet horizontal header nav and keeps the same destination names and active color treatment.
- Back navigation is a small circular outlined control, aligned with the page content and never detached from the content flow.

## Status Treatments

- Positive: pale green background with forest text.
- Attention/pending: pale yellow or warm sand background with rust/brown text.
- Neutral/waiting: light paper or gray-beige background with muted text.
- Danger: pale peach/red background with red text.
- Status pills are compact, not decorative badges, and always sit next to the status they qualify.

## Image Treatment

- Book covers keep a 2:3 ratio, visible edge, and high priority in list/detail composition.
- Detail/gallery imagery may be larger and sit on a soft beige image well.
- Logo is displayed using the official repository asset, with transparent bounds visually compensated through its image wrapper.
- Empty/loading states use official mascot artwork sparingly, with no accidental overlap or crop.

## Logo Usage

- Production artwork is `public/brand/logos/Logo-4.png` for the primary mark and repository symbol assets where a compact mark is needed.
- Mobile header logo is centered and compact. Desktop logo stays compact and left anchored.
- Splash may use a larger logo, but customer page headers do not.

## Mascot Usage

- Story/hero: `Mascott-1.png` or the closest calm default role, used as a supporting visual rather than the page structure.
- Empty state: calm/default mascot, centered and contained.
- Supporting guide/success: warm or success variants, contained inside the related card.
- Mascot artwork never replaces the primary label, status, or action.

## Content Density

- The mockups are information-dense but readable: several compact cards fit in a single viewport.
- Repeated data uses rows and separators instead of large whitespace or oversized dashboard tiles.
- Controls stay close to the content they filter or change.

## Color Rhythm

- Paper dominates the canvas.
- Forest green anchors titles, active navigation, primary actions, and positive emphasis.
- Tan lines and soft surfaces create structure.
- Rust is reserved for prices, financial emphasis, and attention states.
- Peach, yellow, blue, and pale green appear as semantic accents, not a rotating palette.

## Interaction Density

- Tap targets are at least 44px.
- Primary actions are visually obvious without becoming oversized desktop CTAs.
- Segmented choices, filters, and status rows are compact and adjacent to their content.
- Mobile scroll is vertical by default, with horizontal scrolling reserved for clearly signposted story/gallery families.

## Emotional Tone

Warm, grounded, quietly playful, and trustworthy. The product should feel like a carefully kept bookshelf: personal and friendly, but operationally clear.
