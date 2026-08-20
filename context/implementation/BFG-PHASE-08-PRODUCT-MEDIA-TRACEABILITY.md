# BFG PHASE 08 PRODUCT MEDIA TRACEABILITY

Status: `SOURCE_TRACED — IMPLEMENTATION BLOCKED`
Reconciled: 2026-08-20 (Asia/Jakarta)

This is evidence for the Product Media source contract, not an implementation
claim.

| Requirement                       | Source trace                                                                               | Current evidence                                                          | Decision/status                                       |
| --------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- | ----------------------------------------------------- |
| Public Ready Stock detail gallery | Original scope, Ready Stock rules, public Ready Stock feature, Ready Stock detail screen   | Current projection returns one cover only; no `readyStockMedia` table     | `SOURCE-LOCKED IN PRINCIPLE`; owner/query open        |
| Separate cover and gallery        | Admin upload mockup 3                                                                      | Current `books.coverStorageId` is the only durable product media field    | `LOCKED` visually; implementation pending             |
| Gallery max count                 | Admin mockup 3 says `Maks. 8 gambar`                                                       | No current validator/schema                                               | `VISUAL SIGNAL`; final scope open                     |
| Gallery ownership                 | Original database schema names `readyStockMedia.listingId`; current Book Master owns cover | Current schema has no Ready Stock listing/media entity                    | `OPEN_PRODUCT_DECISION`; recommend Book Master        |
| Book vs variant override          | Original data model separates Book and format; no media override rule                      | Current variants own ISBN/price/availability only                         | `OPEN`; recommend no variant override in V1           |
| Deterministic ordering            | Original `displayOrder`; swipeable gallery source                                          | No current order field                                                    | `SOURCE-LOCKED`; mutation/schema pending              |
| Upload validation                 | File Upload source; current cover flow; security invariant SEC-12                          | Convex storage + JPG/PNG/WebP + 5 MB cover validation exists              | `REUSE`; gallery limit still open                     |
| Delete/reorder                    | Admin mockup actions and candidate acceptance                                              | No current gallery mutations                                              | `OPEN` pending ownership                              |
| External preview fields           | Admin mockup Amazon/Instagram/YouTube; customer mockup preview buttons                     | Current implementation intentionally has no external preview behavior     | `OPEN_PRODUCT_DECISION`; metadata-only recommendation |
| External URL security             | Security invariants and current source contract                                            | No external preview validator exists                                      | Minimum deny rules locked; allowlist open             |
| Ready Stock projection            | Ready Stock source                                                                         | Current `readyStock.publicBookView` returns cover and variant-safe fields | `OPEN` until media owner/query is locked              |
| Secret Catalog projection         | Secret Catalog projection contract                                                         | Current `catalogView` returns cover only                                  | `OPEN_PRODUCT_DECISION`; do not infer                 |
| Authorization                     | SEC-05, SEC-06, current `books.manage` boundary                                            | Current Admin cover mutations use Convex permission guards                | `LOCKED`; reuse                                       |
| Audit                             | SEC-14, current `recordAudit`                                                              | Cover attachment records `book.cover_attached`                            | `LOCKED`; reuse                                       |
| Customer safety                   | SEC-07/08/09/11/12; source projections                                                     | Current projections omit storage IDs and internal data                    | `LOCKED`; preserve                                    |
| Responsive Admin                  | Visual system and Admin mockup                                                             | Current Admin shell supports 1024/1280/1440                               | `LOCKED`; rendered QA pending implementation          |
| Responsive Customer               | Visual system and mobile mockup 4                                                          | Current detail has single cover and no gallery controls                   | `LOCKED`; rendered QA pending implementation          |

## Entry Verdict

`PRODUCT_MEDIA_IMPLEMENTATION: NOT AUTHORIZED` until the two material
`OPEN_PRODUCT_DECISION` items in the source contract are answered. Spacing
stabilization is independent and may proceed.
