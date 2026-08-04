---
title: Codex Start Here
status: approved
owner: MasJak
last_updated: 2026-08-04
source: conversation
---

# Codex Start Here

## Mission

Bangun Blessing For Goods secara bertahap berdasarkan repository documentation. Jangan langsung membuat seluruh aplikasi dalam satu pass.

## Current assignment

Mulai dari **Phase 01 — Foundation and Documentation Validation**.

Gunakan prompt:

`prompts/PHASE-01-CODEX.md`

## Before touching code

Baca:

- `AGENTS.md`
- `context/SOURCE_OF_TRUTH.md`
- `context/PROJECT_STATUS.md`
- `context/decisions/DECISIONS.md`
- `context/product/PRD.md`
- `context/product/SCOPE.md`
- `context/operations/ARCHITECTURE.md`
- `context/implementation/PHASE-01-foundation-and-documentation.md`

## Required first response

Sebelum coding, berikan:

1. Ringkasan pemahaman scope.
2. Daftar dokumen yang dibaca.
3. Konflik atau blocker yang ditemukan.
4. File yang akan dibuat atau diubah.
5. Test dan validation plan.

Jangan mulai implementation sebelum plan tersebut konsisten dengan source of truth.

## Non-negotiables

- No dummy business data.
- No public self-signup.
- No payment gateway in MVP.
- No official WhatsApp API in base MVP.
- No native mobile app in MVP.
- No authorization based only on frontend state.
- No monolithic files.
