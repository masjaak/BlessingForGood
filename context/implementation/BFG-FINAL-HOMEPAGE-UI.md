# BFG FINAL HOMEPAGE UI REPORT

## Four Engineering Understandings

### Prompt Engineering

The supplied client screenshot controlled the card order, desktop rows, CTA
width differences, and mascot placement. Browser screenshots were compared at
the requested widths.

### Context Engineering

Only homepage presentation changed. WhatsApp handoff, onboarding and audience
state, membership, Secret Catalog access, Ready Stock, and account behavior
remain on their existing flows.

### Harness Engineering

The production homepage and its actual components were rendered in Playwright.
Assertions cover exact card order and copy, grid geometry, CTA widths, icon and
eyebrow, close affordance, mascot position, overflow, and navigation clearance.

### Memory Engineering

WhatsApp remains the community, curation, and access-code channel; the website
remains the account, shopping, history, and operational surface. Phase 2
onboarding and protected catalog behavior remain authoritative. No Phase 4
work was started.

## Desktop Grid

- **1440:** Three equal columns. Join WhatsApp, Secret Catalog, and Ready Stock
  occupy row one; Account begins row two in column one.
- **1280:** Same three-column arrangement.
- **1024:** Same three-column arrangement.

## Tablet

At **768px**, the grid uses two columns while preserving card order: Join and
Secret in row one; Ready Stock and Account in row two.

## Mobile

At **430, 390, and 375px**, the cards stack in the required Join → Secret → Ready
Stock → Account order. Browser checks reported no horizontal overflow, clipping,
or CTA/mascot collisions with card content or bottom navigation.

## Join WhatsApp

- **Geometry:** Pale peach card; eyebrow above the two-line dominant title;
  supporting copy below.
- **CTA:** Wide, 336.7px at 1440; appears before the separate lower mascot area.
- **Mascot:** Centered below the CTA with no copy or button overlap.

## Secret Catalog

- **Lock:** Circular lock icon rendered at the top left.
- **Eyebrow:** `AKSES PRIVAT` beside the icon.
- **CTA geometry:** Compact, 170.2px at 1440; left aligned near the bottom.
- No mascot is rendered in this card.

## Ready Stock

The dark green card has no eyebrow or mascot. Its compact CTA is bottom-left and
measures 155.4px at 1440.

## Account

- **CTA:** Compact and left aligned; 154.6px at 1440.
- **Mascot:** Centered in its own lower area below the CTA.
- **Close affordance:** Preserved at the top-right; Phase 2 audience-state
  behavior remains intact.

## Cara Pesan & Cek Katalog PO

- **Desktop:** Two columns at 1440px and 1024px. Each step has its number, icon,
  heading, and body grouped in order; the disclosure grows to its content.
- **Tablet/mobile:** One-column timeline at 768px and 390px. All seven steps
  remain readable; the close toggle and catalog CTA stay reachable, with the
  bottom navigation below the full 390px capture.

## Button Comparison

Rendered widths at 1440px:

| CTA | Width |
| --- | ---: |
| Minta link WhatsApp Group | 336.7px |
| Buka Secret Catalog | 170.2px |
| Lihat Ready Stock | 155.4px |
| Daftar Blessfriend | 154.6px |

The Join CTA is wider than each of the other three CTAs. All four controls keep
the shared control styling while retaining the screenshot’s width distinction.

## Visual Evidence

Card-section screenshots captured at all requested widths:

- 1440: [home-cards-1440.png](../../test-results/client-onboarding-responsi-89364--responsive-widths-customer-customer-390/home-cards-1440.png)
- 1024: [home-cards-1024.png](../../test-results/client-onboarding-responsi-89364--responsive-widths-customer-customer-390/home-cards-1024.png)
- 768: [home-cards-768.png](../../test-results/client-onboarding-responsi-89364--responsive-widths-customer-customer-390/home-cards-768.png)
- 390: [home-cards-390.png](../../test-results/client-onboarding-responsi-89364--responsive-widths-customer-customer-390/home-cards-390.png)

Expanded guidance screenshots:

- 1440: [cara-pesan-expanded-1440.png](../../test-results/client-onboarding-responsi-89364--responsive-widths-customer-customer-390/cara-pesan-expanded-1440.png)
- 1024: [cara-pesan-expanded-1024.png](../../test-results/client-onboarding-responsi-89364--responsive-widths-customer-customer-390/cara-pesan-expanded-1024.png)
- 768: [cara-pesan-expanded-768.png](../../test-results/client-onboarding-responsi-89364--responsive-widths-customer-customer-390/cara-pesan-expanded-768.png)
- 390: [cara-pesan-expanded-390.png](../../test-results/client-onboarding-responsi-89364--responsive-widths-customer-customer-390/cara-pesan-expanded-390.png)

## Regression

- Focused component tests: **2 files / 15 tests passed**.
- Responsive Playwright: **2 tests passed**; browser geometry captured at
  375, 390, 430, 768, 1024, 1280, and 1440px. The standalone seven-step guide
  also passed at 390px and 1440px.
- Full frontend suite: **120 files / 795 tests passed**.
- Full Convex suite: **47 files / 315 tests passed**.
- TypeScript: passed.
- ESLint: passed.
- Format check: passed.
- Production build: passed; 44/44 routes prerendered.
- `git diff --check`: passed.

## Final Verdict

**FINAL_HOMEPAGE_UI_VERIFIED**

No merge or production deployment was performed.
