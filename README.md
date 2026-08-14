---
title: Blessing For Goods Repository
status: approved
owner: MasJak
last_updated: 2026-08-04
source: conversation
---

# Blessing For Goods

Mobile-first web application/PWA dan admin dashboard untuk community-led imported bookstore **Blessing For Goods**.

Produk ini membantu Blessfriends untuk:

- memahami komunitas dan aturan order,
- membuka secret catalog memakai access code,
- memilih buku dan format,
- menyimpan preorder secara terstruktur,
- melihat histori, tracking, invoice, pelunasan, dan deposit.

Admin menggunakan dashboard untuk mengelola katalog, batch/cargo, publisher, customer, order, pembayaran, konten komunitas, serta laporan.

## Current stage

Phase 07.1 product-surface reconciliation is in local acceptance. The canonical
GitHub repository is the active source; see `context/PROJECT_STATUS.md` and
`context/implementation/BFG-PHASE-07-1-QA.md` for verified status and release
blockers.

## Technology direction

- Frontend: Next.js `16.3.0` App Router with React `19.2.8`
- Language: TypeScript `6.0.3` strict mode
- Quality: ESLint `9.39.5`, Prettier `3.9.6`, Vitest `4.1.10`
- Authentication: Clerk
- Backend and database: Convex
- DNS and perimeter security: Cloudflare
- Sensitive file storage: guarded Convex storage
- Messaging in MVP: semi-automatic WhatsApp handoff

Clerk and Convex are the canonical identity and data boundaries. The application
fails closed when either is unavailable; it has no browser-local business-data
fallback. Production identifiers and release procedure are documented under
`context/integrations` and `context/operations`; secret values are never stored in
Git.

## Start here

1. `AGENTS.md`
2. `CODEX_START_HERE.md`
3. `context/SOURCE_OF_TRUTH.md`
4. `context/PROJECT_STATUS.md`
5. `context/decisions/DECISIONS.md`
6. `context/implementation/PHASE-01-foundation-and-documentation.md`
