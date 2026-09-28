# BFG PHASE 3C LITERAL CLIENT REDLINE REPORT

Date: 2026-09-28

Branch: `feat/client-content-phase-3-2026-09-27`

Status: `PHASE_3_CLIENT_REDLINE_GREEN_PENDING_REAL_RUNTIME`

Phase 3C applies the latest client annotations literally to the existing
production components. This supersedes the prior Phase 3 visual
interpretation. No Phase 4 work or deployment was performed.

## Redline Interpretation

- Yellow/green text overlay: replace the exact text underneath.
- Red X: remove the marked existing element.
- Arrow: move the existing card or section to the marked position.
- No annotation: preserve the existing UI and behavior.

The three-step Home journey remains in the Hero. The duplicate lower Home
journey was removed. The existing WhatsApp group section was moved into the
access-card sequence and reused; it was not cloned. The access-card DOM order is
`join-whatsapp` → `secret-catalog` → `ready-stock` → `blessfriend-account`.

## Homepage Replacement Map

All changed Home copy is in [`src/app/page.tsx`](../../src/app/page.tsx), except
the Blessfriend account copy in [`src/components/home-onboarding.tsx`](../../src/components/home-onboarding.tsx).
The responsive assertions are in
[`tests/e2e/client-onboarding-responsive.spec.ts`](../../tests/e2e/client-onboarding-responsive.spec.ts).

| Client target | Old source copy or baseline state → final client copy | Screenshot evidence |
| --- | --- | --- |
| Hero eyebrow | `Official website Blessing For Good` → `official website blessing for good` | [Home 390](../../test-results/client-onboarding-responsi-89364--responsive-widths-customer-customer-390/home-390.png) |
| Hero headline | `Specialist Children & Collector Books` → `SPECIALIST CHILDREN & COLLECTOR BOOKS 📚` | [Home 390](../../test-results/client-onboarding-responsi-89364--responsive-widths-customer-customer-390/home-390.png) |
| Hero description | `Kami mengkurasi children books, novel books, dan collector special edition pilihan untuk Blessfriends.` → `kami mengkurasi buku-buku children books, novel books dan collector special edition` | [Home 390](../../test-results/client-onboarding-responsi-89364--responsive-widths-customer-customer-390/home-390.png) |
| WhatsApp/website info | `Dapatkan kurasi buku, informasi PO, dan update terbaru melalui WhatsApp Group BFG. Website digunakan untuk belanja, melihat pesanan, tagihan, dan tracking buku.` → `WhatsApp sebagai media utama kami, website sebagai tempat untuk belanja para Blessfriends menjadi pengalaman yang menyenangkan` | [Home 390](../../test-results/client-onboarding-responsi-89364--responsive-widths-customer-customer-390/home-390.png) |
| Info action | `Pelajari ketentuan PO buku di BFG →` → `pelajari ketentuan PO buku di kami`; `/how-to-order` retained | [Home 390](../../test-results/client-onboarding-responsi-89364--responsive-widths-customer-customer-390/home-390.png) |
| Existing Hero journey | `Perjalanan bukumu`; `Temukan` / `Pilih Ready Stock atau katalog pilihan.`; `Pesan` / `Pilih buku, format, dan jumlah.`; `Ikuti` / `Pantau tagihan sampai pengiriman.` → `cara pembelian di Blessing for good`; steps `gabung ke whatsapp group`, `buat account di website kami`, `pilih buku yang ingin dibeli` with the exact client bodies below | [Home 390](../../test-results/client-onboarding-responsi-89364--responsive-widths-customer-customer-390/home-390.png) |
| Join WhatsApp card | Existing `Komunitas BFG`, `Gabung WhatsApp Group Blessing For Good`, and old supporting paragraph → eyebrow `GABUNG WHATSAPP GROUP`, heading `BLESSING FOR GOOD`, and `wajib join sebelum daftar account website, kami akan menurunkan kurasi buku2 kami disana setiap hari`. Existing `https://wa.me/6282347278881` handoff retained. | [Home 390](../../test-results/client-onboarding-responsi-89364--responsive-widths-customer-customer-390/home-390.png) |
| Secret Catalog | `Katalog buku dari PO yang sedang berjalan. Access code Secret Catalog dibagikan melalui WhatsApp Group BFG.` → `katalog buku PO berjalan, akses code secret akan diberikan di whatsapp group`. `Buka Secret Catalog` and protected `/catalog` gateway retained. | [Home 390](../../test-results/client-onboarding-responsi-89364--responsive-widths-customer-customer-390/home-390.png) |
| Ready Stock | `Buku Ready Stock tersedia untuk dipesan langsung oleh Blessfriends melalui website.` → `buku yang readystock di blessing for good, bisa langsung di checkout setelah bergabung menjadi Blessfriends`. `Lihat Ready Stock` and route retained. | [Home 390](../../test-results/client-onboarding-responsi-89364--responsive-widths-customer-customer-390/home-390.png) |
| Blessfriend account | `Account Blessfriend digunakan untuk melihat katalog PO, memesan buku, mengecek riwayat pesanan, tagihan, dan perjalanan buku.` → `wajib jika ingin melihat katalog PO berjalan, memesan buku, dan check perjalanan buku baik fix di group / pembelian di website`. Signed-out heading was already `Buat account website untuk Blessfriends` and remains exact. | [Home 390](../../test-results/client-onboarding-responsi-89364--responsive-widths-customer-customer-390/home-390.png) |

The old lower Home preview in `src/app/page.tsx` and its `previewOrderSteps`
array in `src/components/how-to-order.tsx` were removed to avoid a second
three-step journey below the existing Hero journey. Both existing Hero CTA
buttons and their routes remain intact.

The red-X `TEMUKAN BUKU` block and the exact supporting line `Mulai dari buku
yang ingin kamu temukan.` were already absent from the branch baseline. The
final DOM still asserts both are absent, and the direct Home section-order
assertion confirms no spacer or extra section was introduced. `PILIHAN UTAMA`
was also absent at baseline; the final rendered page asserts it remains absent.
The old `Komunitas BFG` eyebrow was present in the old Join card and was removed
when that existing card was replaced and moved. Other uses of words such as
“Temukan”, “Pesan”, and “Ikuti” elsewhere remain untouched.

The responsive E2E test asserts exact Hero and journey copy, absence of the old
Hero headline and old journey labels inside `.home-journey`, absence of the
removed Temukan block and crossed labels, and exact card order using stable
`data-testid` values. All six Home screenshots are captured:
[375](../../test-results/client-onboarding-responsi-89364--responsive-widths-customer-customer-390/home-375.png),
[390](../../test-results/client-onboarding-responsi-89364--responsive-widths-customer-customer-390/home-390.png),
[430](../../test-results/client-onboarding-responsi-89364--responsive-widths-customer-customer-390/home-430.png),
[768](../../test-results/client-onboarding-responsi-89364--responsive-widths-customer-customer-390/home-768.png),
[1024](../../test-results/client-onboarding-responsi-89364--responsive-widths-customer-customer-390/home-1024.png), and
[1440](../../test-results/client-onboarding-responsi-89364--responsive-widths-customer-customer-390/home-1440.png).

## Removed

- Temukan Buku intro: already absent at baseline; final DOM checks assert the
  marked heading and tagline are absent and no empty section remains.
- Pilihan Utama: already absent at baseline; final DOM check confirms absence.
- Komunitas BFG: removed from the existing Join card when its annotated label
  and card content were replaced.
- Old Hero journey labels Temukan, Pesan, and Ikuti: replaced within the
  existing `.home-journey` component. The same words in unrelated UI remain.
- Duplicate lower Home journey: removed so the Hero journey is not repeated.

## Final Card Order

1. Join WhatsApp Group
2. Secret Catalog
3. Ready Stock
4. Blessfriend account

The Playwright DOM assertion compares those exact `data-testid` values in the
`.home-access-grid`. Secret Catalog and Ready Stock are existing cards; neither
was cloned. Their existing routes and authorization behavior remain.

## How To Order

The route keeps the production layout and seven-step timeline. The annotated
eyebrow, intro, and steps were replaced in
[`src/components/how-to-order-page-heading.tsx`](../../src/components/how-to-order-page-heading.tsx)
and [`src/components/how-to-order.tsx`](../../src/components/how-to-order.tsx).

Correction 2026-09-28: the unannotated Step 04 was restored from the canonical
`origin/main` source at `e4fe092`. Focused tests assert the exact preserved copy,
one payment heading at Step 05, and absence of the earlier duplicate payment
text. The responsive run passed at 375, 390, 430, 768, 1024, and 1440px.

Page intro:

> harap dibaca untuk ketentuan order di kami, agar setelahnya Blessfriends mengetahui sistem pembelian di kami

Step 01:

- Heading: `pilih bukunya`
- Body: `bisa fix lewat wa group (nantinya admin akan merekap ke account website masing2 blessfriends) atau bisa dilakukan pembelian via website langsung`

Step 02:

- Heading: `history order buku kamu`
- Body: `setiap pembelian baik di wa / di website akan langsung muncul di account masing2 blessfriends buku apa yang sudah dibeli di kami`

Step 03:

- Heading: `invoice`
- Body: `invoice akan muncul di website h+1/h+2 setelah close PO, karena kami membuka banyak cargo setiap batch, maka diperhatikan di bagian tagihan pada account website kamu, admin invoice kami akan pc masing2 customer menginfokan bahwa invoice sudah terbit di website`

Step 04 is the exact unannotated source content from `origin/main` at
`e4fe092`:

- Heading: `Pesanan diproses`
- Body: `Preorder masuk ke Batch PO; Ready Stock diproses tanpa supplier Batch PO.`

Step 05:

- Heading: `pembayaran`
- Body: `pembayaran di kami adalah DP 30% atau jika ada DP tertentu di tiap cargo akan kami infokan saat kami menurunkan matprom di group whatsapp`

Step 05 contains the only payment heading and the exact client DP 30% display
copy. Regression checks assert the seven-step sequence and reject a duplicated
payment heading.

Step 06:

- Heading: `cek perjalanan buku kamu`
- Body: `PO reguler membutuhkan waktu 4-5 bulan sejak di order pertama kali, pembelian bukumu bisa langsung di tracking di account website kamu`

Step 07 preserved exactly:

- Heading: `Buku sampai`
- Body: `Setelah buku tiba dan selesai diproses oleh BFG, pesanan dilanjutkan ke fulfillment dan pengiriman.`

[`tests/components/how-to-order.test.tsx`](../../tests/components/how-to-order.test.tsx)
asserts the exact six replacements, the preserved Step 04 and Step 07 copy,
and that seven steps remain. The responsive browser test repeats the seven
headings and step count at each requested width. How To Order screenshots:
[375](../../test-results/client-onboarding-responsi-89364--responsive-widths-customer-customer-390/how-to-order-375.png),
[390](../../test-results/client-onboarding-responsi-89364--responsive-widths-customer-customer-390/how-to-order-390.png),
[430](../../test-results/client-onboarding-responsi-89364--responsive-widths-customer-customer-390/how-to-order-430.png),
[768](../../test-results/client-onboarding-responsi-89364--responsive-widths-customer-customer-390/how-to-order-768.png),
[1024](../../test-results/client-onboarding-responsi-89364--responsive-widths-customer-customer-390/how-to-order-1024.png), and
[1440](../../test-results/client-onboarding-responsi-89364--responsive-widths-customer-customer-390/how-to-order-1440.png).

## Operational Copy and Behavior Check

H+1/H+2, DP 30%, and 4-5 months remain client-provided display copy. No
automation or guarantee was added. The existing implementation differs from
the text where verified:

| Client display copy | Existing business behavior | Phase 3C action |
| --- | --- | --- |
| Invoice appears H+1/H+2 after PO close | Invoices are issued through Admin-authorized mutations; the batch issuance path requires a current shipment stage. No H+1/H+2 scheduler was found. | Copy only; Invoice behavior unchanged. |
| DP is 30%, or a cargo-specific DP | Invoice requirements support `none`, `fixed`, or `percentage` values; a global 30% rule is not enforced. | Copy only; Finance calculations unchanged. |
| PO takes 4-5 months from first order | Batch ETA is an optional Admin-maintained cargo month. No universal 4-5-month ETA is computed. | Copy only; Batch ETA logic unchanged. |

These are operational copy/logic mismatches to reconcile during client or
Production UAT. No behavioral state machine was modified in this phase.

## Runtime

- `/`: direct authenticated Clerk runtime could not be verified locally because
  the local Clerk `publishableKey` is unavailable. No Clerk secret was added.
- `/how-to-order`: the production `HowToOrderPage` rendered locally through the
  display-only harness and was also reached through its real route from Home;
  real authenticated Clerk runtime remains unverified.
- Verification harness: the existing guarded routes import the exact production
  `HomePage` and `HowToOrderPage`; they contain no alternate homepage copy and
  return 404 in production. The local-only
  `BFG_PRESENTATION_VERIFICATION=true` path omits Clerk and provides only a
  local Convex context needed by the real shell hooks.
- Recorded state: `REAL_AUTH_RUNTIME_UNVERIFIED_LOCAL`. Component-level
  screenshots are not Production UAT.

## QA

| Check | Result |
| --- | --- |
| Focused Phase 3C | 3 files / 17 tests passed. |
| Phase 2 onboarding and membership/auth | 4 files / 23 tests passed; state-dependent onboarding assertions remain in component coverage. |
| Secret Catalog / Catalog | 4 files / 50 tests passed. |
| Ready Stock | 1 file / 9 tests passed. |
| Cart | 4 files / 23 tests passed. |
| Responsive Playwright | 2 tests passed. Home and How To Order rendered at 375, 390, 430, 768, 1024, and 1440px. Screenshots captured at every width. |
| Broader Phase 07.1 surface E2E | 6 passed; 3 route-dependent checks failed in the keyless local harness: two Ready Stock select/anchor checks and the authenticated Activity route. The changed Home and How To Order assertions passed. |
| Full frontend | 75 files / 476 tests passed with `npm run test:run -- --project=frontend`. |
| Full Convex | 47 files / 310 tests passed with `--testTimeout=180000` for the existing large backfill test. |
| Combined Vitest command | One Convex test timed out at its default 120 seconds (`convex/batchAutoAssignment.test.ts`, 2,000-item backfill); the full frontend and Convex projects passed when run separately. |
| TypeScript | Passed with `npm run typecheck`. |
| ESLint | Passed with `npm run lint`. |
| Format | Passed with `npm run format:check`. |
| `git diff --check` | Passed after the report update. |
| Production runtime / authenticated UAT | Unverified locally; Clerk local keys are missing. |
| Security QA / Phase 4 / deployment | Not modified / not started / not deployed. |

The final responsive test checks horizontal overflow, Hero/card copy wrapping,
exact card order, minimum 44px action targets, no removed-section spacer,
Blessy placement, and mobile navigation clearance. The signed-out component
render was used because local Clerk keys are unavailable. Phase 2 onboarding
state behavior is covered by the full frontend suite; no live authenticated
state matrix was claimed.

## Source Audit: Old String → Source → Result

- `Official website Blessing For Good` → `src/app/page.tsx` → replaced with
  `official website blessing for good`.
- `Specialist Children & Collector Books` → `src/app/page.tsx` → replaced with
  `SPECIALIST CHILDREN & COLLECTOR BOOKS 📚`; exact old heading absent in the
  final component.
- Old Hero description → `src/app/page.tsx` → replaced with the exact client
  description in the Homepage Replacement Map.
- `Perjalanan bukumu`, `Temukan`, `Pesan`, and `Ikuti` plus their old step
  bodies → `src/app/page.tsx` → replaced inside the existing Hero journey.
- Old WhatsApp/website paragraph and `Pelajari ketentuan PO buku di BFG →` →
  `src/app/page.tsx` → replaced with the exact client paragraph and action.
- Old community eyebrow, Join heading, and supporting copy → `src/app/page.tsx`
  → replaced as the Join WhatsApp card and moved to position 1.
- Old duplicate `home-order-section` and its three preview steps →
  `src/app/page.tsx`, `src/components/how-to-order.tsx`, and `src/app/globals.css`
  → removed; the existing Hero journey is the sole three-step Home component.
- Old Secret Catalog description → `src/app/page.tsx` → replaced; CTA and
  protected gateway retained.
- Old Ready Stock description → `src/app/page.tsx` → replaced; CTA and route
  retained. `PILIHAN UTAMA` was already absent at branch baseline.
- `Account Blessfriend digunakan untuk melihat katalog PO, memesan buku,
  mengecek riwayat pesanan, tagihan, dan perjalanan buku.` →
  `src/components/home-onboarding.tsx` → replaced with the exact client body;
  the signed-out account heading was already exact and remains so.
- `TEMUKAN BUKU` and `Mulai dari buku yang ingin kamu temukan.` → no matching
  source block at branch baseline → remain absent; E2E checks both and verifies
  no extra Home section.
- `Ketentuan order di BFG` and `Harap baca ketentuan order agar Blessfriends
  memahami proses pembelian di BFG.` →
  `src/components/how-to-order-page-heading.tsx` → replaced with the exact
  client eyebrow and intro above; the old published-content override no longer
  supersedes the annotated client copy. `Dari memilih buku sampai tiba di
  tanganmu.` is retained.
- Step 01 `Pilih bukunya` and `Pilih buku melalui website atau konfirmasi
  pilihan di WhatsApp Group BFG. Admin dapat mencatat pesanan WhatsApp secara
  manual ke akun Blessfriend.` → `src/components/how-to-order.tsx` → replaced
  with the exact client Step 01 copy above.
- Step 02 `History order buku kamu` and `Buku yang sudah dicatat dapat kamu
  lihat kembali melalui Buku Saya di account Blessfriend.` →
  `src/components/how-to-order.tsx` → replaced with the exact client Step 02
  copy above.
- Step 03 `Invoice` and `Admin menerbitkan invoice sesuai proses BFG. Saat
  tersedia, cek menu Tagihan; notifikasi akan muncul di akun Blessfriend.` →
  `src/components/how-to-order.tsx` → replaced with the exact client Step 03
  copy above. H+1/H+2 remains display copy only.
- Step 05 `Pelunasan` and `Pelunasan buku akan ditagihkan sekitar 3–5 minggu
  sebelum diperkirakan tiba di warehouse BFG.` →
  `src/components/how-to-order.tsx` → replaced with the exact client
  `pembayaran` / DP 30% copy above.
- Step 06 `Cek perjalanan buku kamu` and `PO reguler umumnya membutuhkan
  sekitar 4–5 bulan sejak pemesanan awal. Pantau perkembangan pesanan di Buku
  Saya.` → `src/components/how-to-order.tsx` → replaced with the exact client
  Step 06 copy above.
- Step 04 and Step 07 → `src/components/how-to-order.tsx` → preserved with
  exact existing title and body.

The source scan found the unrelated Help heading `Perjalanan bukumu tersimpan di akun.` in `src/app/help/page.tsx`; it remains untouched. This is outside the replaced Home journey.

## Final Verdict

`PHASE_3_CLIENT_REDLINE_GREEN_PENDING_REAL_RUNTIME`
