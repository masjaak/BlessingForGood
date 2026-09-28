# BFG CLIENT PHASE 3 VISUAL RECONCILIATION REPORT

Date: 2026-09-28
Status: PHASE_3_CLIENT_VISUAL_GREEN_PENDING_RECONCILIATION

The user chose to continue from written annotations because annotated image
files were not present in the worktree. Final browser renders are captured
below. Literal image overlay against the missing source screenshots remains
unavailable; the status stays pending reconciliation.

## Isolation

- Worktree: /Users/masjak/Developer/BlessingForGood-client-content
- Branch: feat/client-content-phase-3-2026-09-27
- Parent: 3ba8a388c20e50cc2986a77ac7cd2fab13f768cd
- Initial Phase 3 HEAD: 3ba8a388c20e50cc2986a77ac7cd2fab13f768cd
- Final HEAD: reported by `git rev-parse HEAD` in the final UAT response.
- Other worktrees, origin/main, production, and Security QA were left untouched.
  No merge or deployment was performed.

## Four Engineering Understandings

- Prompt: Implement the written client structure and copy, then inspect actual
  desktop and mobile browser renders.
- Context: Presentation changed; Phase 2 onboarding, commerce, auth, membership,
  and business policy behavior stayed on existing paths.
- Harness: Browser renders verified section and card order, protected Catalog
  access, onboarding states, responsive geometry, and Blessy placement.
- Memory: The website remains the ordering and account system; WhatsApp remains
  community, curation, PO information, and communication. Phase 2 owns admission.
  Secret Catalog remains protected. PO Random remains frozen for Phase 4.

## Client Annotation Matrix

| Request | Previous Phase 3 state at reopen | Final state | Evidence | Result |
| --- | --- | --- | --- | --- |
| Hero | Generic “Rumah buku pilihan…” positioning did not use the requested hierarchy. | Requested eyebrow, specialist headline, and supporting copy; existing CTAs remain. | [home-390.png](../../test-results/client-onboarding-responsi-76af1--responsive-widths-customer-customer-390/home-390.png), [home-1024.png](../../test-results/client-onboarding-responsi-76af1--responsive-widths-customer-customer-390/home-1024.png) | PASS |
| WhatsApp / website information | Channel roles were less direct and did not use the requested explanation/action. | Requested WhatsApp-community and website-order copy with /how-to-order link. | [home-390.png](../../test-results/client-onboarding-responsi-76af1--responsive-widths-customer-customer-390/home-390.png) | PASS |
| Cara Pembelian | Visible three steps did not follow the annotated group → account → purchase wording. | Kept the compact timeline and replaced its copy with the requested wording. | [home-390.png](../../test-results/client-onboarding-responsi-76af1--responsive-widths-customer-customer-390/home-390.png) | PASS |
| Remove Temukan Buku intro | Intro and supporting paragraph remained in the homepage hierarchy. | Removed both from the rendered DOM; no spacer remains. | Browser DOM assertions at all eight widths. | PASS |
| Join WhatsApp Group | No distinct group-information block preceded the access/account journey. | Added requested heading, prerequisite/community copy, and canonical https://wa.me/6282347278881 action. | [home-390.png](../../test-results/client-onboarding-responsi-76af1--responsive-widths-customer-customer-390/home-390.png), [home-1024.png](../../test-results/client-onboarding-responsi-76af1--responsive-widths-customer-customer-390/home-1024.png) | PASS |
| Secret Catalog | Was not positioned after community and before account/Ready Stock. | First access card; /catalog route and code gate remain. No private titles/grid render publicly. | Homepage renders and protected-gateway browser assertion. | PASS |
| Blessfriend account | Was not the middle block in the requested customer journey. | Between Secret Catalog and Ready Stock. Phase 2 states control actions: new can register; pending has no duplicate registration; approved gets activation guidance; active has account access; suspended has no bypass. | [state-signed-out-390.png](../../test-results/client-onboarding-responsi-76af1--responsive-widths-customer-customer-390/state-signed-out-390.png), [state-pending-390.png](../../test-results/client-onboarding-responsi-76af1--responsive-widths-customer-customer-390/state-pending-390.png), [state-approved-390.png](../../test-results/client-onboarding-responsi-76af1--responsive-widths-customer-customer-390/state-approved-390.png), [state-active-390.png](../../test-results/client-onboarding-responsi-76af1--responsive-widths-customer-customer-390/state-active-390.png), [state-suspended-390.png](../../test-results/client-onboarding-responsi-76af1--responsive-widths-customer-customer-390/state-suspended-390.png) | PASS |
| Ready Stock | “Pilihan Utama” and old supporting copy remained. | Removed “Pilihan Utama”, updated copy, kept Ready Stock and its /ready-stock action. | Homepage renders and all-width DOM assertions. | PASS |
| Quick guidance | Could substitute for the missing visible access/commerce blocks. | Retained two secondary disclosures after the cards: Cara pesan di BFG and Lihat PO yang sedang berjalan. | [home-390.png](../../test-results/client-onboarding-responsi-76af1--responsive-widths-customer-customer-390/home-390.png) | PASS |
| Blessy | Previous report said Blessy was hidden on Home and How To Order. | Visible in normal flow after the site shell on both routes; bubble suppressed. Checks confirm copy/action/nav clearance on mobile and CTA/mascot/close clearance. | [home-390.png](../../test-results/client-onboarding-responsi-76af1--responsive-widths-customer-customer-390/home-390.png), [how-to-order-390.png](../../test-results/client-onboarding-responsi-76af1--responsive-widths-customer-customer-390/how-to-order-390.png), Blessy suite 10/10. | PASS |
| How To Order | Copy/headings did not match the annotated seven-step hierarchy. | Timeline retained, framing and all seven headings updated. Invoice, DP, ETA, OOS/defect, and refund copy stays policy-safe. | [how-to-order-390.png](../../test-results/client-onboarding-responsi-76af1--responsive-widths-customer-customer-390/how-to-order-390.png), [how-to-order-768.png](../../test-results/client-onboarding-responsi-76af1--responsive-widths-customer-customer-390/how-to-order-768.png), [how-to-order-1440.png](../../test-results/client-onboarding-responsi-76af1--responsive-widths-customer-customer-390/how-to-order-1440.png) | PASS |
| Mobile hierarchy | Previous order and collision behavior had not passed client review. | Join precedes cards; cards stack Secret Catalog → account → Ready Stock; CTAs wrap without overflow; Blessy stays below content and clears fixed navigation. | Home/How To Order at eight widths; responsive and Blessy geometry assertions. | PASS |

## Final Homepage DOM Order

hero (home-hero) → WhatsApp/website information (home-channel-section) →
Cara Pembelian (cara-order) → Join WhatsApp Group (join-whatsapp) → access and
commerce (akses-buku: Secret Catalog → Blessfriend account → Ready Stock) →
quick guidance (home-quick-guidance) → story (bfg-story).

Join uses the existing canonical WhatsApp contact. Secret Catalog links to
/catalog; protected catalog data is not rendered on the homepage.

## Hero

- Supporting line: Official website Blessing For Good
- Headline: Specialist Children & Collector Books
- Description: Kami mengkurasi children books, novel books, dan collector
  special edition pilihan untuk Blessfriends.
- CTAs: Lihat Ready Stock → /ready-stock; Buka Secret Catalog → /catalog.

## WhatsApp / Website

Lead: WhatsApp jadi ruang utama komunitas Blessfriends. The body explains
curation, PO information, and updates in WhatsApp; the website is used for
shopping, orders, invoices, and tracking. Secondary action: Pelajari ketentuan
PO buku di BFG → /how-to-order.

## Cara Pembelian

1. Gabung ke WhatsApp Group — join for updates, curation, and PO information.
2. Buat account di website kami — use the Blessfriend account for orders, open
   POs, invoices, and tracking.
3. Pilih buku yang ingin dibeli — order on the website or confirm through the
   WhatsApp Group; no automatic import is implied.

## Access / Commerce

- Join WhatsApp: prerequisite/community copy; CTA uses Phase 2 contact number
  6282347278881, without an expiring group URL.
- Secret Catalog: explains current PO books and that access codes are shared
  through the WhatsApp Group. Existing /catalog gateway and access rules remain.
- Blessfriend account: explains PO catalog access, ordering, history, invoices,
  and tracking. Existing ProductContext and Phase 2 admission govern state.
- Ready Stock: says available books can be ordered directly by Blessfriends
  through the website. Existing route and behavior remain.

## Removed Elements

- Temukan Buku intro, tagline, and supporting paragraph are absent from the DOM.
- Pilihan Utama is absent.
- No second onboarding form, duplicate membership source, automatic WhatsApp
  order import, PO Random UI, or private Catalog content was added.

## Blessy

- Homepage / How To Order: visible after the site shell in document flow; the
  bubble is suppressed, while the close control stays attached to the artwork.
- Mobile: 72px artwork follows page content with bottom-nav clearance. Browser
  checks confirmed it stays below copy/actions and the nav remains hit-testable.
- Responsive clearance and standalone floating Blessy suite passed.

## How To Order

Framing: Ketentuan order di BFG; Dari memilih buku sampai tiba di tanganmu.
Support: Harap baca ketentuan order agar Blessfriends memahami proses
pembelian di BFG.

Seven-step timeline: Pilih bukunya → History order buku kamu → Invoice →
Pembayaran → Pelunasan → Cek perjalanan buku kamu → Buku sampai.

Copy does not promise H+1/H+2 invoice timing, a universal 30% DP, unconditional
100% refund, or a fixed delivery guarantee. Existing approximate operating
copy remains approximate. No Finance behavior changed. The page retains its
existing published CMS heading override; the local browser fixture rendered the
new default because it has no published block. Check any live override during
client reconciliation.

## Responsive

- Home and How To Order rendered at 375, 390, 430, 768, 834, 1024, 1280, and
  1440px.
- Required captures include Home 375, 390, 430, 768, 1024, 1440 and How To
  Order 390, 768, 1440, plus the other widths and eight onboarding states.
- Browser checks passed for DOM/card order, copy, CTA routes, no horizontal
  overflow, timeline layout, mobile-nav hit testing, and Blessy placement.
- Screenshot directory:
  test-results/client-onboarding-responsi-76af1--responsive-widths-customer-customer-390/

## Green Preservation

- Phase 2 onboarding/membership/auth paths: full frontend and eight-state
  browser matrix passed; no admission logic changed.
- Secret Catalog: frontend/Convex coverage passed; browser reached the access
  code form without public Catalog rows.
- Ready Stock, Cart, Finance: frontend/Convex regressions passed; focused Cart
  check passed 4 files / 23 tests.
- Security QA: separate worktree was not entered or modified.
- No commerce, auth, membership, or business-policy implementation changed.

## QA

| Check | Result |
| --- | --- |
| Focused Phase 3 components | 4 files / 40 tests passed. |
| Focused Cart regression | 4 files / 23 tests passed. |
| Full frontend suite | 75 files / 476 tests passed, serially. |
| Convex suite | 47 files / 310 tests passed using a 180-second Vitest timeout for the known 2,000-item backfill. The default combined run hit that existing test's 120-second timeout; no Convex code changed. |
| Responsive browser | 2 tests passed; eight widths, eight onboarding states, protected Catalog gate; screenshots retained. |
| Blessy browser | 10 tests passed in isolation. One earlier combined attempt hit a 30-second local navigation timeout; isolated rerun passed without a product-code change. |
| TypeScript | Passed with `npm run typecheck`. |
| ESLint | Passed with `npm run lint`. |
| Format | Passed with `npm run format:check`. |
| git diff --check | Passed. |
| Build | Not rerun; the known Phase 2 Convex provider prerender issue was left untouched. |

## Commit

Commit: feat(client-content): align homepage and order guidance with client UAT.
The final branch HEAD is reported in the UAT response. No merge, Phase 4 work,
or deploy.

## Final Verdict

PHASE_3_CLIENT_VISUAL_GREEN_PENDING_RECONCILIATION
