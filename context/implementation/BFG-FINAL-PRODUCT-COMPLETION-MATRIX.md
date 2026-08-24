# BFG FINAL PRODUCT COMPLETION MATRIX

Status: `BFG_CURRENT_PRODUCT_SCOPE_COMPLETE — BFG_PRODUCTION_STABLE — PHASE_08_COMPLETE — PRODUCT_MODE: MAINTENANCE`
Reconciled: 2026-08-21 (Asia/Jakarta)

This matrix is the final Phase 08 scope ledger. The category column is limited
to the allowed final classifications. The evidence column is authoritative for
whether a row may be promoted to `GREEN_REAL_PRODUCTION`; no unauthenticated,
synthetic, or inferred evidence closes a real UAT gate.

The post-closure visual stabilization addendum is intentionally limited to the
four verified Production findings. Existing green domains and the homepage
section order remain unchanged.

| Requirement / capability | Classification | Current evidence / remaining gate |
| --- | --- | --- |
| 01 Content purpose | `GREEN_REAL_PRODUCTION` | Existing authenticated Production evidence; preserve bounded Content scope. |
| 02 Cover full visibility | `GREEN_REAL_PRODUCTION` | Existing authenticated/rendered evidence; cover remains separate from gallery. |
| 03 Catalog distinct-title count | `GREEN_REAL_PRODUCTION` | Existing projection and Production evidence; regression retained. |
| 04 Eligible invoice cancellation | `GREEN_DETERMINISTIC_NO_SAFE_REAL_DATA` | State-machine and invalid Production guards are green; execute only when a legitimate eligible invoice exists. |
| 05 Eligible deposit allocation | `GREEN_DETERMINISTIC_NO_SAFE_REAL_DATA` | Ledger/allocation invariants and invalid Production guards are green; execute only with a legitimate eligible deposit/invoice pair. |
| 06 Invoice owner/reference | `GREEN_REAL_PRODUCTION` | Existing authenticated Production evidence. |
| 07 Batch ↔ Catalog journey | `GREEN_DETERMINISTIC_NO_SAFE_REAL_DATA` | Authenticated Admin reached the real Batch 5 card; it is already locked with 2 catalogs and 0 assignments, so no editable Batch was safe for mutation. |
| 08 Homepage slide background | `GREEN_REAL_PRODUCTION` | Existing rendered Production evidence. |
| 09 BFGSelect authenticated anchor | `GREEN_DETERMINISTIC_NO_SAFE_REAL_DATA` | Authenticated Production `/admin/books` menu opened directly below its trigger on a long page; middle/bottom collision contexts remain a responsive checkpoint. |
| 10 Batch targeting/assignment/Summary | `GREEN_DETERMINISTIC_NO_SAFE_REAL_DATA` | Server consequences and derived summary are covered; the only discovered real Batch is locked, so no assignment mutation was fabricated. |
| 11 Human-facing order reference | `GREEN_REAL_PRODUCTION` | Existing authenticated Production evidence. |
| 12 Unified Activity feed and responsive geometry | `GREEN_REAL_PRODUCTION` | User-controlled authenticated Customer Production walkthrough passed at 375/390/430/768/1440; unified newest-first feed, `Sistem`, `Pesan BFG`, read behavior, full frames, and zero horizontal overflow were accepted. Deployed `dpl_H5KPpMDmHtzFqZ44q9p7JHuPogsv` and the eight-viewport matrix remain green. |
| 13 Responsive Admin navigation | `GREEN_REAL_PRODUCTION` | Existing authenticated Admin evidence plus the current shared navigation/scroll geometry cover the authorized System routes without body overflow. |
| 14 Settings edit/save/refresh | `GREEN_DETERMINISTIC_NO_SAFE_REAL_DATA` | Authenticated Settings form renders, but required store/payment fields are empty and no approved business values were supplied; no unsafe write was fabricated. |
| 15 Catalog left-frame geometry | `GREEN_REAL_PRODUCTION` | Existing authenticated/rendered evidence. |
| 16 Admin action spacing | `GREEN_REAL_PRODUCTION` | Existing authenticated 1440px Production evidence and shared action tokens cover the affected Admin surfaces; no new defect appeared in closure. |
| 17 Master Buku render | `GREEN_REAL_PRODUCTION` | Existing authenticated Production Master Buku `Maisy's Funfair` evidence covers cover, `COVER BUKU`, upload controls, and Product Media layout. |
| How To Order presentation | `GREEN_REAL_PRODUCTION` | Live responsive contract suite `18/18` preserves all seven canonical steps, one icon family, intentional desktop wrapping, vertical mobile/tablet rhythm, and zero body overflow. |
| Perjalanan Bukumu orientation | `GREEN_REAL_PRODUCTION` | Live homepage visual suite confirms the three steps remain grouped inside a narrower internal wrapper with a controlled connector at mobile through desktop widths. |
| Mengenal BFG headline visibility/contrast | `GREEN_REAL_PRODUCTION` | Live homepage screenshots confirm `Satu cerita, beberapa langkah kecil.` uses the canonical primary contrast on the approved story surfaces; palette and copy are unchanged. |
| Book Cover original preservation and presentation control | `GREEN_DETERMINISTIC_NO_SAFE_REAL_DATA` | Additive `coverPresentation` metadata, zoom/position/reset/save, authorization, legacy defaults, original storage preservation, and Ready Stock/Secret Catalog/customer projections pass `111/111` Convex plus component coverage. The current public Ready Stock seed has no stored cover and no approved Admin session/asset was fabricated. |
| Product Gallery V1 | `BLOCKED_BY_APPROVED_DATA` | Implementation and real empty state are green; no approved additional image asset exists for populated Gallery UAT. |
| External Preview V1 | `BLOCKED_BY_APPROVED_DATA` | Implementation and real empty state are green; no approved HTTPS preview URL exists for populated UAT. |
| Bulk Import V1 implementation/deployment | `GREEN_REAL_PRODUCTION` | Existing Production deployment and deterministic suite are green. |
| Bulk Import real pilot | `DEFERRED_BY_USER_DATA` | No legitimate 3–5-book CSV was supplied; no data is fabricated. |
| Authentication/admission/RBAC | `GREEN_REAL_PRODUCTION` | Existing Production baseline plus server authorization regression. |
| Secret Catalog boundaries | `GREEN_REAL_PRODUCTION` | Existing Production/security evidence; Product Media gallery is not projected into Secret Catalog V1. |
| Financial invariants | `GREEN_REAL_PRODUCTION` | Integer IDR, snapshots, append-only ledger, payment/deposit/refund guards retained and tested. |
| Minimum reports/settings/content | `GREEN_REAL_PRODUCTION` | Current bounded scope is implemented and covered by existing evidence. |
| Advanced analytics beyond minimum reports | `OPTIONAL_FUTURE` | No explicit current-client acceptance contract; do not delay completion. |
| Custom backup/restore Admin UI | `OPTIONAL_FUTURE` | Provider operations and maintenance review remain separate from current product UI. |
| Cross-domain Admin search | `OPTIONAL_FUTURE` | Current domain filters/search are sufficient for contracted scope. |
| Payment gateway/automatic settlement | `EXCLUDED` | Explicitly outside current BFG scope. |
| Automated WhatsApp/social chat/blasts | `EXCLUDED` | Manual handoff remains the approved boundary. |
| Variant-specific gallery override | `EXCLUDED` | Explicitly not in Product Media V1; reconsider only with a real business requirement. |

## Closure rule

The product may be marked `BFG_CURRENT_PRODUCT_SCOPE_COMPLETE` only after every
required row has real Production evidence or the explicit
`GREEN_DETERMINISTIC_NO_SAFE_REAL_DATA` classification is backed by the absence
of safe legitimate data, and the remaining authenticated gates have either
passed or received a user-controlled acceptance checkpoint. This checkpoint
passed for Customer Production at 375/390/430/768/1440 with no defect reported.
`BLOCKED_BY_APPROVED_DATA`, `BLOCKED_BY_OPERATIONAL_DATA`, and
`DEFERRED_BY_USER_DATA` are data classifications, not implementation defects.
`OPTIONAL_FUTURE` and `EXCLUDED` rows never create Phase 09 work.

## Permanent visual contracts

- How To Order is one seven-step data journey: connected horizontal desktop,
  vertical mobile/tablet, and one normalized semantic outline icon family.
- Perjalanan Bukumu is one compact grouped three-step orientation tool with a
  narrower inner width and a connector aligned to the step grid.
- Mengenal BFG uses the canonical high-contrast section headline token and does
  not inherit muted/card state color for its primary heading.
- Book Cover preserves the original uploaded image; display framing is optional,
  non-destructive `{ zoom, x, y }` metadata consumed by the shared customer
  renderer. No distortion and no duplicate source image are allowed.

## User-controlled acceptance checkpoints

- Authenticated Admin: user-controlled checkpoint is `Admin sudah login`.
- Admin result: `PASS` — existing authenticated Admin Production evidence is
  retained; no shared Activity regression was reported.
- Authenticated Customer: user-controlled checkpoint is `Customer sudah login`.
- Customer result: `PASS` — user-controlled real Production walkthrough at
  375/390/430/768/1440; direct browser automation was unavailable, so this is
  recorded as supplied user evidence rather than agent-observed evidence.
- Eligible invoice cancellation/deposit allocation: use only a legitimate
  eligible Production record; never fabricate financial history.
- Bulk Import pilot: use only a legitimate user-provided 3–5-book CSV; current
  state is `DEFERRED_BY_USER_DATA`.

## Maintenance correction addendum — 2026-08-22

This addendum is the current closure ledger for the latest real UAT findings;
it does not reopen Phase 08 or create a new feature phase.

| Contract | Local status | Production status |
| --- | --- | --- |
| New Order → Invoice next action | `GREEN_DETERMINISTIC` — state-driven Order detail CTA reuses Finance flow | `NOT_RECHECKED` |
| Shared Activity unread/read presentation | `GREEN_DETERMINISTIC` — one component, semantic marker, responsive CSS | `NOT_RECHECKED` |
| Conditional button spacing/affordance | `GREEN_DETERMINISTIC` — shared ActionGroup | `NOT_RECHECKED` |
| Human invoice references | `GREEN_DETERMINISTIC` — server generator, search, safe idempotent backfill | `NOT DEPLOYED / BACKFILL NOT RUN` |
| Master Book Save persistence/feedback | `GREEN_DETERMINISTIC` — query-after-save, Draft preservation, explicit Publish | `NOT_RECHECKED` |
| Ready Stock direct flow | `GREEN_DETERMINISTIC` — atomic reservation and no Batch path | `PRESERVED; no new Production mutation` |
| Secret Catalog multi-Publisher/multi-title PO | `GREEN_DETERMINISTIC` — scoped customer access and preorder | `NOT RECHECKED` |
| Multi-Publisher Batch/shared deadline | `GREEN_DETERMINISTIC` — roster/Summary/lock and mismatch rejection | `NOT RECHECKED` |

The current overall status is therefore **LOCAL MAINTENANCE GREEN; PRODUCTION
RECHECK PENDING VERIFIED CANONICAL ACCESS**, not a fabricated Production green.
