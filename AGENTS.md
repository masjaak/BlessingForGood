---
title: Agent Operating Rules
status: approved
owner: MasJak
last_updated: 2026-08-04
source: conversation
---

# AGENTS.md

File ini adalah aturan kerja wajib untuk semua coding agent, termasuk Codex.

## 1. Mandatory reading

Sebelum mengubah code, baca:

1. `CODEX_START_HERE.md`
2. `context/SOURCE_OF_TRUTH.md`
3. `context/PROJECT_STATUS.md`
4. `context/decisions/DECISIONS.md`
5. Dokumen product, feature, screen, database, dan security yang relevan dengan task.

Jangan membaca seluruh repository secara membabi buta. Gunakan dependency map pada dokumen phase dan feature.

## 2. No hallucinated product decisions

Dilarang mengarang:

- fitur,
- role,
- permission,
- status,
- data field,
- business rule,
- pricing logic,
- cancellation/refund policy,
- copy brand,
- asset mascot,
- provider configuration.

Jika informasi belum tersedia, tandai sebagai blocker pada `context/PROJECT_STATUS.md`. Jangan memilih sendiri hanya agar task terlihat selesai.

## 3. Source-of-truth precedence

Saat terjadi konflik, ikuti urutan pada `context/SOURCE_OF_TRUTH.md`. Existing code tidak boleh mengalahkan keputusan product yang lebih baru.

## 4. Zero business data

Trial dan production harus dimulai dengan nol business records:

- customer,
- secret catalog,
- publisher,
- buku,
- book format,
- batch/cargo,
- order,
- invoice,
- deposit entry,
- payment proof.

Mockup data hanya ilustrasi visual. Test fixture hanya boleh berjalan di isolated test environment.

## 5. Security is backend-enforced

Setiap protected query, mutation, action, route, atau upload wajib memeriksa:

- authentication,
- role,
- permission,
- resource ownership,
- runtime input validation,
- rate limit atau abuse protection jika relevan.

Menyembunyikan UI bukan authorization.

## 6. Code quality rules

- Maximum line length: 120 characters.
- Target maximum source file: 350 lines.
- Target maximum React component: 220 lines.
- Target maximum function: 60 lines.
- Jangan menaruh page UI, database query, validation, dan business logic di satu file.
- Jangan menyimpan minified code di `src/`.
- Jangan menulis SVG besar atau base64 asset inline.
- Jangan membuat satu file feature berisi ribuan baris.
- Gunakan feature-oriented module boundaries.
- Semua monetary value disimpan sebagai integer rupiah, bukan floating point.
- Semua time value disimpan sebagai UTC timestamp dan ditampilkan dalam Asia/Jakarta.

Jika batas ukuran terlewati karena alasan valid, jelaskan dalam pull request dan refactor plan.

## 7. Change protocol

Untuk perubahan product atau schema:

1. Update dokumen source of truth.
2. Tambahkan decision atau migration note.
3. Update tests.
4. Baru update implementation.
5. Update `context/PROJECT_STATUS.md` dan `CHANGELOG.md`.

## 8. Completion gate

Task belum selesai sebelum semua yang tersedia lulus:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

Untuk perubahan data atau authorization, test negatif wajib ada.

## 9. Phase control

Jangan melompat ke phase berikutnya sebelum exit criteria phase aktif terpenuhi dan statusnya diperbarui menjadi `approved` atau `implemented`.

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
