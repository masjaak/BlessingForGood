---
title: How to Merge This Documentation Pack
status: approved
owner: MasJak
last_updated: 2026-08-04
source: conversation
---

# Cara pakai paket ini

Paket ini berisi dokumentasi dan repository blueprint untuk **Blessing For Goods**. Tidak ada production code, dependency, secret, atau dummy business data di dalamnya.

## Cara memasukkan ke folder lokal

1. Backup folder project lokal.
2. Extract isi ZIP ini.
3. Copy seluruh isi folder `blessing-for-goods-docs-v1.0.0/` ke root project lokal.
4. Saat terjadi konflik file, review manual. Jangan menimpa source code yang sudah ada tanpa diff.
5. Pastikan file `AGENTS.md`, `CODEX_START_HERE.md`, dan folder `context/` berada di root repository.
6. Masukkan logo, mascot, dan mockup ke path yang dijelaskan di `context/brand/ASSET_MANIFEST.md`.
7. Commit dokumentasi sebagai commit tersendiri sebelum Codex mulai coding.

Contoh commit:

```bash
git add .
git commit -m "docs: add BFG product and implementation source of truth"
git push origin main
```

## Perintah pertama untuk Codex

Gunakan prompt di `prompts/PHASE-01-CODEX.md`. Codex wajib membaca `AGENTS.md` dan `CODEX_START_HERE.md` sebelum mengubah file apa pun.

## Aturan penting

- Dokumen berstatus `approved` boleh diperlakukan sebagai keputusan final.
- Dokumen berstatus `in-review` boleh dipakai sebagai direction, tetapi Codex tidak boleh mengarang detail yang masih diberi label `OPEN`.
- Dokumen berstatus `planned` belum boleh dijadikan alasan untuk membangun fitur.
- Mockup adalah referensi visual dan interaction, bukan sumber data database.
