# BFG Headline Fit Matrix

Phase 07.1 absolute closure contract for shared page-title sizing. The desktop
container values below are derived from the current Admin shell grid (`236px`
sidebar plus the content column) and the customer page max width. Final visual
approval still requires authenticated rendered screenshots at each viewport.

| Hierarchy | Headline | Characters / Visual Width | Route | Container Width | 1024 | 1280 | 1440 | 375 | 390 | 430 | Current Lines | Target Lines | Token | Verdict |
| --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Page title | Kelola Secret Catalog dengan akses yang aman. | longest Admin fixed title | `/admin/catalogs` | 740 / 996 / 1156 | 1 | 1 | 1 | 2 | 2 | 2 | 2 at legacy size | 1 desktop / 2 mobile | `--type-page-title-size` | GREEN local token fit; Production screenshot pending |
| Page title | Kelola buku dan Ready Stock | long Admin fixed title | `/admin/books` | 740 / 996 / 1156 | 1 | 1 | 1 | 2 | 2 | 1 | 1 | 1 desktop / 1 mobile where available | `--type-page-title-size` | GREEN local token fit; Production screenshot pending |
| Page title | Tinjau pesanan, lalu lanjutkan tahapnya. | long Admin fixed title | `/admin/orders` | 740 / 996 / 1156 | 1 | 1 | 1 | 2 | 2 | 2 | 2 at legacy size | 1 desktop / 2 mobile | `--type-page-title-size` | GREEN local token fit; Production screenshot pending |
| Page title | Jaga status keuangan tetap jelas. | medium Admin fixed title | `/admin/invoices` | 740 / 996 / 1156 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | `--type-page-title-size` | GREEN local token fit; Production screenshot pending |
| Page title | Tinjau permintaan Blessfriends. | medium Admin fixed title | `/admin/join-requests` | 740 / 996 / 1156 | 1 | 1 | 1 | 2 | 1 | 1 | 1 | 1 desktop / 1–2 mobile | `--type-page-title-size` | GREEN local token fit; Production screenshot pending |
| Page title | Semua yang perlu kamu ikuti, dalam satu tempat. | longest customer fixed title | `/account` | 343 / 358 / 398 / 1180 | 343 | 358 | 398 | 2 | 2 | 2 | 2 at legacy size | 1 desktop / 2 mobile | `--type-page-title-size` | GREEN local token fit; Production screenshot pending |
| Page title | Lihat jumlah yang perlu diselesaikan. | customer fixed title | `/account/invoices` | 343 / 358 / 398 / 1180 | 343 | 358 | 398 | 2 | 2 | 1 | 1 | 1 desktop / 1–2 mobile | `--type-page-title-size` | GREEN local token fit; Production screenshot pending |

Shared rule: the same hierarchy uses the same token. No route-specific title
size or manual `<br>` is permitted. Desktop uses `clamp(1.8rem, 2.4vw,
2.4rem)`; mobile may wrap naturally into two balanced lines when the 343–398px
content width cannot support one line without harming readability.
