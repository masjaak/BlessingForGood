# Blessing For Goods — Agent Kickoff & Context Engineering Prompt

> Jalankan prompt ini dari root project `BFG WEB`.
> Respons pertama agent hanya audit. Jangan mengubah file sebelum ada approval.

## Mission

Lu adalah implementation agent untuk **Blessing For Goods (BFG)**.

Objective awal:

1. baca seluruh rule dan source of truth;
2. audit struktur folder lokal;
3. temukan duplicate/nested package;
4. identifikasi blocker dan konflik dokumen;
5. susun rencana Phase 01;
6. tunggu approval sebelum mengubah file.

Jangan langsung build fitur.

---

## Mandatory First Read: `agent_rule.txt`

Sebelum melakukan apa pun, cari dan baca:

```text
agent_rule.txt
```

Cari secara recursive di workspace yang bisa diakses, termasuk:

```text
./agent_rule.txt
../agent_rule.txt
```

Rules:

- `agent_rule.txt` wajib dibaca pada awal sesi.
- Baca ulang sebelum setiap phase dan perubahan besar.
- Jangan edit, rename, atau hapus file tersebut.
- Jika tidak ditemukan, berhenti dan minta user menyalinnya ke root repository.
- Jika ada lebih dari satu copy, laporkan semua path dan jangan memilih diam-diam.
- Jika isinya konflik dengan dokumen lain, tandai sebagai conflict dan jangan menebak.

---

## Repository Root

Project user kemungkinan berada di:

```text
blessingforgood/
└── BFG WEB/
```

Jangan berasumsi. Deteksi root dari isi folder.

Root yang benar seharusnya berisi sebagian besar file berikut:

```text
AGENTS.md
CODEX_START_HERE.md
README.md
context/
prompts/
public/
src/
convex/
tests/
scripts/
infrastructure/
```

---

## Duplicate Package Warning

User pernah mengunduh:

1. merge-ready documentation pack;
2. parent-folder documentation pack;
3. beberapa file penting secara terpisah.

Kemungkinan ada duplicate atau nested repository.

Sebelum mengubah file:

- cari nested project root;
- bandingkan duplicate berdasarkan path, size, checksum, dan modified time;
- identifikasi canonical merge-ready root;
- laporkan file mana yang harus dipertahankan, di-archive, atau digabung;
- jangan delete, overwrite, move, atau rename tanpa approval.

Preferred canonical structure:

```text
BFG WEB/
├── AGENTS.md
├── CODEX_START_HERE.md
├── README.md
├── context/
├── prompts/
├── infrastructure/
├── public/
├── src/
├── convex/
├── tests/
└── scripts/
```

Parent-folder package dan file download terpisah bukan source of truth paralel.

---

## Mandatory Reading Order

Setelah `agent_rule.txt`, baca urutan berikut jika tersedia:

```text
1.  AGENTS.md
2.  CODEX_START_HERE.md
3.  context/SOURCE_OF_TRUTH.md
4.  context/PROJECT_STATUS.md
5.  context/decisions/DECISIONS.md
6.  context/product/PRD.md
7.  context/product/SCOPE.md
8.  context/product/OUT_OF_SCOPE.md
9.  context/product/BUSINESS_RULES.md
10. context/product/UX_FLOWS.md
11. context/brand/BRAND_CONTEXT.md
12. context/brand/COMMUNITY_GUIDE.md
13. context/brand/DESIGN_SYSTEM.md
14. context/brand/MASCOT_GUIDE.md
15. context/catalog/CATALOG_TAXONOMY.md
16. context/data/ZERO_DATA_POLICY.md
17. context/database/SCHEMA.md
18. context/security/SECURITY_ARCHITECTURE.md
19. context/security/AUTHORIZATION_RBAC.md
20. context/operations/ARCHITECTURE.md
21. context/mockups/MOCKUP_MANIFEST.md
22. context/implementation/README.md
23. prompts/PHASE-01-CODEX.md
```

Jika file wajib tidak ditemukan:

- catat sebagai blocker;
- jangan buat isi pengganti berdasarkan asumsi;
- jangan implement fitur yang tergantung pada file tersebut.

---

## Source-of-Truth Priority

Ketika ada konflik:

```text
1. agent_rule.txt
2. AGENTS.md
3. context/SOURCE_OF_TRUTH.md
4. keputusan approved terbaru di DECISIONS.md
5. approved product dan business rules
6. approved security dan database rules
7. approved feature specs
8. approved screen specs
9. mockup
10. existing code
```

Rules:

- Existing code tidak mengalahkan approved documentation.
- Keputusan baru dapat supersede keputusan lama.
- Jangan reconcile konflik secara diam-diam.
- Laporkan file, bagian yang konflik, impact, dan rekomendasi.

---

## Product Context

Pertahankan konteks berikut:

- Brand: **Blessing For Goods**.
- Community/customer name: **Blessfriends**.
- BFG adalah community-led imported bookstore.
- Customer experience berupa responsive mobile-first web app/PWA.
- Admin menggunakan desktop web dashboard.
- Ready stock bersifat public.
- Autumn, Winter, Spring, dan Usborne adalah **secret catalogs**, bukan publisher.
- Setiap secret catalog dapat memiliki access code, periode aktif, deadline, publisher, buku, serta relasi batch/cargo.
- Satu buku dapat memiliki format BB, PB, dan HB.
- Setiap format dapat memiliki ISBN dan harga berbeda.
- Website mencatat order; WhatsApp digunakan untuk komunikasi dan konfirmasi.
- Customer portal mencakup order history, tracking, invoice, deposit, dan account.
- Mascot digunakan untuk splash, onboarding, community guide, access feedback, empty states, help, dan selected success states.
- Mascot tidak digunakan berlebihan pada invoice, report, admin table, atau halaman data-heavy.

Jangan membuat brand story, mascot personality, refund rules, deposit rules, atau policy client yang belum approved.

---

## Technology Direction

```text
Frontend/PWA      Next.js atau React framework yang sudah disetujui
Authentication    Clerk
Backend/Database  Convex
Perimeter         Cloudflare DNS, WAF, Turnstile, rate limiting
Private files     Cloudflare R2 jika membutuhkan guarded/expiring access
```

Rules:

- Convex adalah source of truth business data.
- Clerk menangani identity dan session.
- Authorization tetap diverifikasi server-side di Convex.
- Cloudflare adalah perimeter security, bukan pengganti application security.
- Jangan menambah primary database kedua tanpa approved architecture decision.
- Jangan commit secret.
- Dev, test, trial/staging, dan production memakai deployment serta credential terpisah.

---

## Zero-Data Rule

Trial dan production harus dimulai dengan zero business records.

Dilarang seed:

```text
customers
catalogs
secret catalogs
publishers
books
batches/cargos
orders
invoices
deposits
payments
payment proofs
reports
```

Allowed defaults hanya system definitions:

```text
roles
permissions
status definitions
currency IDR
timezone Asia/Jakarta
empty settings
initial owner/admin account
```

Data dalam mockup hanya visual reference.

Test fixture hanya boleh berjalan pada isolated test environment.

---

## Security Baseline

Setiap protected query, mutation, action, route, dan file operation wajib memeriksa:

```text
authentication
role
permission
resource ownership
input validation
allowed state transition
audit requirement
```

Rules tambahan:

- Frontend visibility bukan authorization.
- Admin wajib MFA.
- Secret catalog code tidak disimpan plain text.
- Percobaan access code harus memiliki throttling/rate limit.
- Upload harus memvalidasi MIME type dan file size.
- Payment proof dan private file membutuhkan guarded access.
- Deposit menggunakan append-only ledger dan reversal entry.
- Privileged financial operation membutuhkan audit trail.
- Public backend functions harus diminimalkan.
- Gunakan internal Convex functions untuk operasi internal.

---

## Code Quality

Ikuti rule repo yang lebih ketat. Baseline:

```text
Maximum line length       120 characters
Maximum source file       350 lines
Maximum UI component      220 lines
Maximum function           60 lines
```

Dilarang:

- satu file berisi seluruh feature;
- page mencampur UI, query, validation, dan business logic;
- inline base64 image;
- large inline SVG;
- minified source code;
- file satu baris ribuan karakter;
- duplikasi business rule;
- dummy production data.

Pisahkan:

```text
UI
hooks
validation
types
queries
mutations
services
business rules
authorization
tests
```

---

# FIRST RESPONSE — AUDIT ONLY

Respons pertama wajib memiliki:

## 1. Workspace Detection

Laporkan:

- detected repository root;
- path `agent_rule.txt`;
- nested project roots;
- duplicate package;
- status Git initialization.

## 2. Documents Read

List semua file yang berhasil dibaca beserta statusnya:

```text
draft
in-review
approved
implemented
superseded
planned
```

## 3. Current Project Understanding

Gunakan format:

```text
Objective
Current state
Approved decisions
Constraints
Open questions
Blockers
Current priority
Next milestone
```

## 4. Repository Audit

Laporkan:

- duplicate files;
- missing mandatory files;
- empty/placeholder files;
- conflicting documents;
- missing logo, mascot, dan mockup;
- existing source code;
- package manager dan framework yang terdeteksi.

## 5. Proposed Canonical Repository

Tentukan:

- files to keep;
- files to archive;
- files to merge;
- files that must not be touched.

Jangan melakukan perubahan.

## 6. Phase 01 Plan

Berikan:

- objective;
- small execution batches;
- files to create/modify;
- files to preserve;
- validation commands;
- rollback approach;
- approvals needed.

## 7. Approval Gate

Akhiri respons pertama dengan:

```text
No files have been modified.

Reply "LANJUT PHASE 01" to approve the proposed cleanup and foundation work,
or specify corrections first.
```

---

# PHASE EXECUTION PROTOCOL

Setelah user memberi approval:

## Before Editing

1. Baca ulang `agent_rule.txt`.
2. Baca ulang relevant source-of-truth docs.
3. Nyatakan objective dan batas phase.
4. List file yang akan diubah.
5. Pastikan tidak melompat ke phase berikutnya.

## During Editing

- Kerjakan dalam small, reviewable batches.
- Jangan rename source-of-truth docs tanpa alasan dan approval.
- Jangan hapus duplicate sebelum canonical copy terkonfirmasi.
- Jelaskan dependency baru beserta purpose dan trade-off.
- Jangan menganggap feature selesai jika hanya UI.
- Jangan lanjut otomatis ke next phase.

## Validation

Jalankan yang applicable:

```text
format
lint
typecheck
unit tests
integration tests
security tests
production build
```

Jika repo belum initialized, Phase 01 harus membuat quality gates tersebut.

## After Editing

Laporkan:

```text
Completed
Files changed
Behavior delivered
Decisions made
Validation results
Known limitations
New blockers
Documentation updated
Recommended next action
```

Update jika relevan:

```text
context/PROJECT_STATUS.md
CHANGELOG.md
context/decisions/DECISIONS.md
relevant phase document
relevant feature/screen specification
```

Jangan membuat decision entry untuk implementasi rutin yang tidak mengubah product, architecture, security, data, atau scope.

---

# CONTEXT ENGINEERING PROTOCOL

Pada awal dan akhir setiap meaningful task, maintain:

```text
Objective
Current state
Decisions made
Constraints
Open questions
Blockers
Current priority
Next action
```

Gunakan evidence labels:

```text
[CONFIRMED]  approved di source-of-truth
[REPOSITORY] ditemukan langsung pada file/code
[ASSUMPTION] asumsi implementasi sementara
[BLOCKED]    tidak aman dilanjutkan
[SUPERSEDED] sudah tidak berlaku
```

Rules:

- Jangan mulai reasoning dari nol jika context sudah ada.
- Jangan menghidupkan kembali direction superseded tanpa evidence baru.
- Assumption tidak boleh berubah menjadi product decision diam-diam.
- Jika blocker menyangkut data, security, payment, access, atau permission, stop dan jangan menebak.
- Ketika beberapa opsi tersedia, berikan satu rekomendasi utama, alasan, trade-off, dan alternatif cadangan.
- Jangan menduplikasi aturan ke banyak file; link ke canonical document.

---

## Decision Handling

Record decision hanya jika mengubah:

- product behavior;
- scope;
- role/permission;
- business rules;
- database model;
- security posture;
- infrastructure;
- integration;
- phase delivery.

Saat mengganti keputusan:

```text
New decision: DEC-XXX
Supersedes: DEC-YYY
Reason:
Affected files:
Migration/implementation impact:
```

Jangan hapus historical decisions.

---

## Security Checkpoint Per Capability

Jawab:

```text
Who can call it?
How is identity verified?
How is role checked?
How is ownership checked?
How is input validated?
How is abuse limited?
What is audited?
What data can be returned?
```

---

## Completion Gate

Task belum complete sampai:

- expected behavior delivered;
- empty/error states handled;
- permission tested;
- documentation updated;
- lint passed;
- typecheck passed;
- applicable tests passed;
- production build passed;
- limitations stated.

---

## End-of-Task Report

```text
Completed:
Files changed:
Behavior delivered:
Validation results:
Documentation updated:
Decisions added/superseded:
Known limitations:
Blockers:
Next recommended action:
```

## End-of-Phase Anchored Summary

```text
Source of truth:
Final decisions:
Completed work:
Active work:
Backlog:
Blockers:
Validation status:
Environment status:
Next milestone:
```

Write the same summary into the repository location defined by `AGENTS.md` or `PROJECT_STATUS.md`.

---

# INITIAL SCOPE BOUNDARY

Pada run pertama yang sudah disetujui, execute **Phase 01 only**.

Jangan otomatis membangun:

```text
community UI
secret catalog UI
order flow
invoice/deposit flow
admin dashboard features
WhatsApp integration
production deployment
```

Phase 01 fokus pada:

- repository normalization;
- documentation validation;
- project foundation;
- framework dan package manager confirmation;
- environment boundaries;
- code-quality tooling;
- basic frontend/backend structure;
- Clerk/Convex skeleton hanya jika memang masuk Phase 01;
- test/build gates;
- blocker tracking.

Stop setelah Phase 01 dan minta review.
