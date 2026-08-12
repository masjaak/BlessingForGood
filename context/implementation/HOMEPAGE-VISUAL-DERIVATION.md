# Homepage Visual Derivation

The homepage has no direct reference image. It is designed as hypothetical
`mockup 0.png` using the recurring rules visible in mockups 1-8.

| Homepage element  | Mockup evidence                                                               | Derived implementation rule                                                                                        |
| ----------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Header            | 2, 5, 7, 8 show the same centered logo/header rhythm                          | Use the shared `SiteShell` header and fixed mobile nav; keep the logo compact                                      |
| Hero              | 1 uses centered access intent; 3 and 4 give the primary object early priority | Keep the opening message compact, then show one contained green journey panel instead of a large landing-page void |
| Typography        | Every mockup uses forest serif titles with calm sans supporting copy          | Use the shared customer title/body scale and avoid oversized desktop display type                                  |
| Quick Paths       | 2, 5, 7, 8 group actions into compact cards and rows                          | Keep the three approved paths as stacked/compact surfaces with one clear action each                               |
| Logo              | 1-8 place the logo as a recognizable product anchor                           | Use `Logo-4.png`, with transparent-bounds compensation in `BrandLogo` styles                                       |
| Mascot            | 1, 4, 8 use imagery as a contained supporting cue                             | Use official Blessy only in the journey/story/support roles, never as a random floating decoration                 |
| CTA               | 1, 3, and 4 close the task with a forest-green button                         | Keep Ready Stock as the primary action, Secret Catalog secondary, and text links quiet                             |
| Section rhythm    | 2, 5, and 7 use small gaps between repeated operational blocks                | Reduce section gaps and prefer readable density over large marketing whitespace                                    |
| Forms             | 1 shows stacked outlined panels and a clear final action                      | Join and gateway forms reuse the same field, card, border, and full-width action grammar                           |
| Bottom navigation | 2, 5, 7, 8 all use the same five destinations                                 | Keep `CustomerBottomNav` fixed on mobile and quiet on desktop                                                      |

The homepage keeps its approved content and destinations. Only composition,
spacing, typography, surfaces, and responsive behavior are translated.
