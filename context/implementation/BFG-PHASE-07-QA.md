# BFG Phase 07 QA Record

Status: PASS — customer patch, Admin operational UI, local regression, and
safe live smoke complete

## Stage A — Customer Visual Patch V4.1.1

| Scenario                 | Starting state                                                               | Action                                           | Expected result                                                                   | Verdict |
| ------------------------ | ---------------------------------------------------------------------------- | ------------------------------------------------ | --------------------------------------------------------------------------------- | ------- |
| Colorful primary logo    | Approved local `Logo-1` asset                                                | Render customer header, splash, auth, story card | Multicolor book/sprout/stars/wordmark used; no generated asset                    | PASS    |
| Logo containment         | Transparent 4000×4000 canvas with visible artwork bbox `(841,663,3157,2715)` | Render at 375, 390, 430, 768, 1440px             | Full visible artwork, no crop/stretch/overflow                                    | PASS    |
| BFG story prominence     | Home story card                                                              | Render at 390 and 1440px                         | Logo is the primary visual moment at approximately 45–60% usable width            | PASS    |
| Mobile Masuk             | Signed-out customer header                                                   | Inspect idle/focus/pressed treatment             | Framed, visibly tappable compact action                                           | PASS    |
| How To Order mobile      | `/how-to-order` at 390px                                                     | Render route                                     | 8 current BFG steps, outline icons, readable connector progression                | PASS    |
| How To Order desktop     | Home and `/how-to-order` at 1440px                                           | Render sections                                  | Concise home 6-step grid and full route 8-step grid share one icon system         | PASS    |
| Customer behavior freeze | Existing customer routes                                                     | Run route smoke and flow checks                  | Auth, catalog, order, invoice, payment, exception, and account behavior unchanged | PASS    |

## Stage B — Admin visual and route coverage

| Scenario               | Starting state                          | Action                                       | Expected result                                                                    | Verdict |
| ---------------------- | --------------------------------------- | -------------------------------------------- | ---------------------------------------------------------------------------------- | ------- |
| Protected Admin routes | Signed-out browser                      | Visit all Admin routes including Ready Stock | Clerk sign-in gate; no runtime errors or data mutation                             | PASS    |
| Desktop navigation     | Admin shell at 1024/1280/1440px         | Inspect route groups and active state        | Persistent grouped sidebar at desktop, usable horizontal fallback below 900px      | PASS    |
| Operational dashboard  | Existing reactive queues                | Open `/admin`                                | Needs Action counts route to queues; no fake analytics                             | PASS    |
| Ready Stock safety     | Existing inventory records              | Open `/admin/ready-stock`                    | On hand/reserved/available are visible; only existing on-hand editor is offered    | PASS    |
| Financial safety       | Existing invoices/payments/refunds      | Open finance routes                          | Snapshot, payment history, obligation, payout, and ledger remain separate          | PASS    |
| Action safety          | Material Admin controls                 | Inspect actions                              | Context, pending, success/error, and existing confirmation patterns remain present | PASS    |
| Empty/loading/error    | Empty or loading query state            | Open list/detail routes                      | Existing skeleton, intentional empty, and retry/error primitives are reused        | PASS    |
| Customer consequence   | Canonical Convex reactivity             | Resolve/approve actions in isolated tests    | Customer projections update through shared data contract                           | PASS    |
| Authorization          | Customer, suspended, admin, owner roles | Attempt protected and owner-only actions     | Server boundaries remain authoritative                                             | PASS    |
| Production data safety | Canonical production                    | Visual/live smoke only                       | No dummy or mutation fixture is created                                            | PASS    |

## Automated gate

Final local gate: Vitest 108/108, Convex 72/72, customer Playwright 75/75,
signed-out Admin Playwright 39/39, TypeScript, build, lint, format, and
`git diff --check` PASS. Final safe live smoke: 114/114 against the `www`
canonical alias across customer 375/390/430/768/1440px and Admin
1024/1280/1440px. Live checks remain read-only; authenticated financial
mutations are exercised only in isolated test fixtures.
