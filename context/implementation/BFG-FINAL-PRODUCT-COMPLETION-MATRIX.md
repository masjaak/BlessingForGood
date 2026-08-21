# BFG FINAL PRODUCT COMPLETION MATRIX

Status: `PRODUCTION DEPLOYED — AUTHENTICATED ACCEPTANCE GATES OPEN`
Reconciled: 2026-08-21 (Asia/Jakarta)

This matrix is the final Phase 08 scope ledger. The category column is limited
to the allowed final classifications. The evidence column is authoritative for
whether a row may be promoted to `GREEN_REAL_PRODUCTION`; no unauthenticated,
synthetic, or inferred evidence closes a real UAT gate.

| Requirement / capability | Classification | Current evidence / remaining gate |
| --- | --- | --- |
| 01 Content purpose | `GREEN_REAL_PRODUCTION` | Existing authenticated Production evidence; preserve bounded Content scope. |
| 02 Cover full visibility | `GREEN_REAL_PRODUCTION` | Existing authenticated/rendered evidence; cover remains separate from gallery. |
| 03 Catalog distinct-title count | `GREEN_REAL_PRODUCTION` | Existing projection and Production evidence; regression retained. |
| 04 Eligible invoice cancellation | `GREEN_DETERMINISTIC_NO_SAFE_REAL_DATA` | State-machine and invalid Production guards are green; execute only when a legitimate eligible invoice exists. |
| 05 Eligible deposit allocation | `GREEN_DETERMINISTIC_NO_SAFE_REAL_DATA` | Ledger/allocation invariants and invalid Production guards are green; execute only with a legitimate eligible deposit/invoice pair. |
| 06 Invoice owner/reference | `GREEN_REAL_PRODUCTION` | Existing authenticated Production evidence. |
| 07 Batch ↔ Catalog journey | `GREEN_DETERMINISTIC_NO_SAFE_REAL_DATA` | Canonical link/unlink and locked-state tests are green; real operator journey still requires authenticated Admin acceptance. |
| 08 Homepage slide background | `GREEN_REAL_PRODUCTION` | Existing rendered Production evidence. |
| 09 BFGSelect authenticated anchor | `GREEN_DETERMINISTIC_NO_SAFE_REAL_DATA` | Collision tests are green; authenticated long-page Admin render remains a final acceptance gate. |
| 10 Batch targeting/assignment/Summary | `GREEN_DETERMINISTIC_NO_SAFE_REAL_DATA` | Server consequences and derived summary are covered; real operator journey remains an acceptance gate. |
| 11 Human-facing order reference | `GREEN_REAL_PRODUCTION` | Existing authenticated Production evidence. |
| 12 Unified Activity feed | `GREEN_DETERMINISTIC_NO_SAFE_REAL_DATA` | Projection, combined unread count, ownership, safe destination, responsive CSS, component tests, and canonical public Production suite `24/24` are green; authenticated real-user acceptance remains open. |
| 13 Responsive Admin navigation | `GREEN_DETERMINISTIC_NO_SAFE_REAL_DATA` | Shared navigation/scroll geometry is covered locally; authenticated 390–1024 Production render remains open. |
| 14 Settings edit/save/refresh | `GREEN_DETERMINISTIC_NO_SAFE_REAL_DATA` | Existing server contract and tests are green; authenticated Production persistence journey remains open. |
| 15 Catalog left-frame geometry | `GREEN_REAL_PRODUCTION` | Existing authenticated/rendered evidence. |
| 16 Admin action spacing | `GREEN_DETERMINISTIC_NO_SAFE_REAL_DATA` | Shared semantic tokens and local render are green; post-fix authenticated Production audit remains open. |
| 17 Master Buku render | `GREEN_DETERMINISTIC_NO_SAFE_REAL_DATA` | Cover flow and local geometry are green; authenticated Production Book Detail audit remains open. |
| Product Gallery V1 | `GREEN_DETERMINISTIC_NO_SAFE_REAL_DATA` | Book Master ownership, max 8, ordering, safe storage, remove, projection, tests, and Production deployment are green; one legitimate-book UAT remains open. |
| External Preview V1 | `GREEN_DETERMINISTIC_NO_SAFE_REAL_DATA` | Optional HTTPS metadata-only link, rejection rules, and Production deployment are green; one legitimate-book UAT remains open. |
| Bulk Import V1 implementation/deployment | `GREEN_REAL_PRODUCTION` | Existing Production deployment and deterministic suite are green. |
| Bulk Import real pilot | `GREEN_DETERMINISTIC_NO_SAFE_REAL_DATA` | Explicitly `DEFERRED_BY_USER_DATA`; no legitimate 3–5-book CSV is available and no data is fabricated. |
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
passed or received a user-controlled acceptance checkpoint. `OPTIONAL_FUTURE`
and `EXCLUDED` rows never create Phase 09 work.

## User-controlled acceptance checkpoints

- Authenticated Admin: user-controlled checkpoint is `Admin sudah login`.
- Authenticated Customer: user-controlled checkpoint is `Customer sudah login`.
- Eligible invoice cancellation/deposit allocation: use only a legitimate
  eligible Production record; never fabricate financial history.
- Bulk Import pilot: use only a legitimate user-provided 3–5-book CSV; current
  state is `DEFERRED_BY_USER_DATA`.
