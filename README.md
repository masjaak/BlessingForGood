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

**Phase 01 foundation implemented locally; awaiting user review.** Lihat `context/PROJECT_STATUS.md`.

## Technology direction

- Frontend: Next.js `16.3.0` App Router with React `19.2.8`
- Language: TypeScript `6.0.3` strict mode
- Quality: ESLint `9.39.5`, Prettier `3.9.6`, Vitest `4.1.10`
- Authentication: Clerk
- Backend and database: Convex
- DNS and perimeter security: Cloudflare
- Sensitive file storage: Cloudflare R2 or another guarded private object store
- Messaging in MVP: semi-automatic WhatsApp handoff

Clerk and Convex are present only as fail-closed integration boundaries; production credentials, schema, and deployment are not configured.

## Start here

1. `AGENTS.md`
2. `CODEX_START_HERE.md`
3. `context/SOURCE_OF_TRUTH.md`
4. `context/PROJECT_STATUS.md`
5. `context/decisions/DECISIONS.md`
6. `context/implementation/PHASE-01-foundation-and-documentation.md`
