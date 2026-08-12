# BFG Design Translation Matrix

Visual source: `public/mockups/mobile/mockup 1.png` through `mockup 8.png`, inspected directly.

| Mockup observation                                          | Design rule                                                             | System token/component                                     | Routes using it                                 |
| ----------------------------------------------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------- | ----------------------------------------------- |
| All screens share a warm paper canvas                       | Paper is the dominant customer surface                                  | `--bfg-paper`, `.customer-shell`                           | Every customer route                            |
| Header logo is centered and compact                         | Brand header is an app shell, not a large marketing masthead            | `BrandLogo`, `.site-header`                                | Home, catalog, account, auth                    |
| Mockups use thin tan outlines                               | Use borders for structure and keep shadows quiet                        | `--bfg-line`, `.card`, `.input`                            | Every customer panel                            |
| Page titles are forest serif and compact                    | One display role for page/section hierarchy                             | `--bfg-title-*`, customer `h1/h2/h3`                       | Every page with a title                         |
| Body copy is calm sans and dense enough to scan             | Keep body at 15-16px and metadata smaller                               | `--bfg-font-body`, `.subtle`, `.field-label`               | Every customer route                            |
| Catalog rows keep covers visible beside metadata            | Image-first compact product card                                        | `.book-card`, `.book-card-layout`, `.book-cover`           | `/catalog`                                      |
| Catalog detail gives the cover the first visual read        | Detail layout moves image before metadata and action                    | `.ready-stock-detail`, `.book-cover`                       | `/ready-stock/[slug]`, catalog detail extension |
| Green buttons close a task                                  | Primary action is forest green and compact/full-width by context        | `.button-primary`                                          | Catalog, Join, auth, Ready Stock, account       |
| Prices are warm rust                                        | Financial emphasis is semantic, not a new type scale                    | `.money`, `--bfg-rust`                                     | Catalog, Ready Stock, invoices, orders          |
| Status pills are small semantic blocks                      | Status is adjacent to its record and never dominates                    | `.status-badge` variants                                   | Orders, tracking, invoices, Ready Stock         |
| Tracking uses a vertical connected sequence                 | Timeline emphasizes the current step with a clear dot/line              | `.timeline`, `.timeline-dot`                               | Order detail                                    |
| Invoice screen groups balance, active invoice, and history  | Financial content uses stacked detail panels and rows                   | `.invoice-card`, `.summary-line`                           | `/account/invoices`, invoice detail             |
| Account uses profile, access, links, and sign-out groups    | Avoid generic dashboard chrome; keep account actions as rows            | `.account-dashboard-grid`, `.dashboard-row`, `.guard-card` | `/account`, profile, addresses                  |
| Bottom nav is fixed and five destinations                   | Mobile nav stays app-native and always clears content                   | `CustomerBottomNav`, `.customer-bottom-nav`                | Home, catalog, books, invoices, account         |
| Back control is a small outlined circle                     | Back is a quiet utility control aligned to the shell                    | `BackButton`, `.back-button`                               | Catalog, detail, profile, addresses, auth       |
| Access screen uses centered explanation plus stacked panels | Auth/gateway presentation is centered and task focused                  | `.catalog-access`, `.auth-page`, `.form-card`              | `/catalog`, `/sign-in`, `/join`                 |
| Mascot appears in contained supporting roles                | Use official artwork as a guide or state cue, not decoration everywhere | `BrandMascot`, `.guide-mascot`, `.empty-mascot`            | Home, help, Join, empty/loading states          |
| Desktop keeps the mobile family                             | Add columns and breathing room without new components or styles         | Responsive customer CSS                                    | 768px, 1024px, 1440px                           |

## Responsive component audit

| Component                        | Classification                    | Reason                                                                                                |
| -------------------------------- | --------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Customer header                  | Same component / responsive       | Header alignment and nav density change, brand and controls remain one shell                          |
| Customer bottom nav              | Same component / responsive       | It is mobile-only because desktop already has horizontal navigation; destination grammar is shared    |
| PageHeader                       | Same component / responsive       | Type scale and action stacking adapt without route-specific markup                                    |
| Card, Button, Field, StatusBadge | Same component / responsive       | The mockups repeat one surface/control/status family                                                  |
| Book cards                       | Same component / responsive       | Mobile is a compact row; desktop widens the same row/grid                                             |
| Story scroller                   | Mobile-specific overflow behavior | The story family is intentionally touch-scrollable on mobile; desktop exposes the same cards in a row |
| Account dashboard grid           | Same component / responsive       | Mobile stacks operational sections; desktop uses a calm two-column grid                               |
| Desktop footer                   | Desktop-specific                  | Mockups have bottom nav only; a quiet support footer is useful when extra desktop space exists        |
