# Customer Responsive Parity

Desktop is an expansion of the mobile BFG system, not a second visual product.

| Component                | 390px behavior                                                                | 1440px behavior                                                    | Shared visual grammar                                                      | Structural difference                                           | Reason for difference                       |
| ------------------------ | ----------------------------------------------------------------------------- | ------------------------------------------------------------------ | -------------------------------------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------- |
| Customer header          | Compact, centered logo with access control at the edge; horizontal nav hidden | Left logo, quiet horizontal nav, access control at the edge        | Same logo artwork, paper canvas, tan line, muted links, green active state | Nav moves from fixed-width mobile shell to inline desktop shell | More horizontal space is available          |
| Bottom nav               | Fixed five-item bar with icon and label; main gets shared `--customer-bottom-clearance` | Hidden; header nav carries the same destinations                   | Same labels, icon language, active green                                   | Mobile-only presentation                                        | Prevents duplicate navigation on desktop    |
| Page content             | 16px gutters and single-column flow                                           | Max-width centered content with 2-column/grid opportunities        | Same titles, gaps, cards, borders, colors                                  | Columns widen only where content already supports it            | Preserves reading order while using space   |
| PageHeader               | Title stacks above actions and stays compact                                  | Title and actions may sit on one row                               | Same serif title and sans metadata                                         | Flex direction changes                                          | Avoids crowding narrow screens              |
| Cards                    | 16px padding, 12px gaps, near-full-width                                      | 20-24px padding, same radius/border, more columns                  | Same surface, line, shadow restraint, and semantic color                   | Density changes with available width                            | Readability and scan speed                  |
| Catalog/book row         | Cover and details share a compact two-column row                              | Same row widens; lists may sit beside summary                      | Same cover ratio, title, metadata, price, action hierarchy                 | Grid width changes                                              | Product identity remains visible            |
| Detail view              | Image comes first, then metadata and action                                   | Image and details share a two-column composition                   | Same image priority and green action closure                               | Stacks to columns                                               | Mobile reading order is preserved           |
| Forms                    | One-column fields with full-width primary action                              | Two-column fields only where existing markup supports it           | Same labels, 48px inputs, borders, focus, error color                      | Grid collapses/expands                                          | Touch ergonomics and desktop efficiency     |
| Orders/tracking/invoices | Stacked panels and vertical timelines                                         | Panels can share a calm two-column grid; timeline remains vertical | Same status tones, row separators, rust money                              | Width/layout changes only                                       | Operational content stays legible           |
| Account                  | Stacked summary, account menu, operational cards, and links                   | Two-column operational grid with same card family                  | Same hierarchy and semantic colors                                         | Grid expansion                                                  | Keeps every essential account action reachable without desktop chrome |
| Story cards              | Horizontal touch scroll where already used                                    | Cards sit in a restrained row                                      | Same card variants and copy hierarchy                                      | Overflow behavior changes                                       | Touch-friendly narrative on mobile          |
| Footer                   | Hidden because bottom nav is the primary mobile shell                         | Quiet support footer remains below content                         | Same paper/muted text treatment                                            | Desktop-only support utility                                    | Avoids duplicate chrome on mobile           |

Validation widths: 375px, 390px, 430px, 768px, 1024px, and 1440px.

## Mobile Account navigation closure — 2026-08-26

At the existing customer mobile breakpoint (`max-width: 800px`), Account
renders a stacked hub containing the canonical Profile, Address, Activity,
Clerk account-management, and Clerk sign-out actions. The hub is placed before
the operational Account cards in mobile reading order. It does not introduce a
second destination, horizontal sub-navigation, or a mobile desktop header.

The five-item customer bottom navigation remains unchanged. Customer main
content uses the shared `--customer-bottom-clearance`, which includes the
fixed bar's effective border/padding/link height, `env(safe-area-inset-bottom)`,
and the existing page-bottom spacing so the final Account action remains
tappable above the fixed bar. Desktop keeps the existing header navigation and
UserButton presentation.
