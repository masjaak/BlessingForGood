"use client";

import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { useRef, useState } from "react";
import { api } from "../../convex/_generated/api";
import { AdminOperationalPage } from "@/components/admin-operational-page";
import { Button, Card, LinkButton, LoadingRegion, StatusBadge } from "@/components/ui";
import {
  BULK_IMPORT_HEADERS,
  bulkImportTransition,
  parseBulkImportCsv,
  validateBulkImportFile,
  type BulkImportError,
  type BulkImportState,
} from "@/lib/bulk-import";
import { toExcelCsv } from "@/lib/excel-export";

type Preview = FunctionReturnType<typeof api.bulkImport.preview>;
type ImportResult = FunctionReturnType<typeof api.bulkImport.confirm>;

const templateCsv = toExcelCsv([BULK_IMPORT_HEADERS.slice()]);

function formatBytes(bytes: number): string {
  return bytes < 1024 * 1024 ? `${Math.ceil(bytes / 1024)} KB` : `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function statusLabel(status: string): string {
  return (
    {
      ready: "Siap",
      no_change: "Tanpa perubahan",
      warning: "Peringatan",
      conflict: "Konflik",
      invalid: "Tidak valid",
    }[status] || status
  );
}

function statusTone(status: string): "neutral" | "positive" | "warning" {
  if (status === "ready" || status === "no_change") return "positive";
  if (status === "warning") return "warning";
  return "warning";
}

function ErrorList({ errors }: { errors: BulkImportError[] }) {
  if (!errors.length) return null;
  return (
    <div className="bulk-import-errors" role="alert">
      {errors.map((error, index) => (
        <div className="bulk-import-error" key={`${error.rowNumber}-${error.field}-${error.code}-${index}`}>
          <strong>
            Baris {error.rowNumber} · {error.field}
          </strong>
          <span>{error.value || "(kosong)"}</span>
          <span>{error.message}</span>
          <span>Perbaikan: {error.correction}</span>
        </div>
      ))}
    </div>
  );
}

function Summary({ preview }: { preview: Preview }) {
  const items = [
    ["Total baris", preview.summary.totalRows],
    ["Baris valid", preview.summary.validRows],
    ["Baris tidak valid", preview.summary.invalidRows],
    ["Penerbit baru", preview.summary.newPublishers],
    ["Penerbit sudah ada", preview.summary.existingPublishers],
    ["Buku baru", preview.summary.newBooks],
    ["Buku sudah ada", preview.summary.existingBooks],
    ["Varian baru", preview.summary.newVariants],
    ["Tanpa perubahan", preview.summary.noOpRows],
    ["Peringatan", preview.summary.warnings],
    ["Konflik", preview.summary.conflicts],
  ];
  return (
    <Card className="bulk-import-summary" frame="summary" aria-label="Ringkasan validasi">
      {items.map(([label, value]) => (
        <div key={label}>
          <span className="card-kicker">{label}</span>
          <strong>{value}</strong>
        </div>
      ))}
    </Card>
  );
}

function PreviewTable({ preview }: { preview: Preview }) {
  return (
    <div className="table-wrap bulk-import-table-wrap">
      <table className="data-table bulk-import-table">
        <caption className="sr-only">Pratinjau baris impor buku</caption>
        <thead>
          <tr>
            <th>Baris</th>
            <th>Penerbit</th>
            <th>Judul</th>
            <th>Format</th>
            <th>ISBN</th>
            <th>Harga</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {preview.rows.map((row) => (
            <tr key={row.rowNumber}>
              <td>{row.rowNumber}</td>
              <td>{row.publisher || "—"}</td>
              <td>{row.title || "—"}</td>
              <td>{row.format}</td>
              <td>{row.isbn || "—"}</td>
              <td className="numeric-cell">{row.priceIdr ? `Rp ${row.priceIdr.toLocaleString("id-ID")}` : "—"}</td>
              <td>
                <StatusBadge tone={statusTone(row.status)}>{statusLabel(row.status)}</StatusBadge>
                {row.errors.length ? (
                  <details className="bulk-import-row-details">
                    <summary>Lihat masalah</summary>
                    <ErrorList errors={row.errors} />
                  </details>
                ) : null}
                {row.warnings.map((warning) => (
                  <span className="bulk-import-row-note" key={warning}>
                    {warning}
                  </span>
                ))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Confirmation({ preview, onConfirm, pending }: { preview: Preview; onConfirm: () => void; pending: boolean }) {
  return (
    <Card frame="attention" className="bulk-import-confirmation">
      <div className="split-heading">
        <div>
          <span className="card-kicker">KONFIRMASI</span>
          <h2>Siap mengimpor buku?</h2>
        </div>
        <StatusBadge tone="positive">Tidak ada baris konflik</StatusBadge>
      </div>
      <p>
        {preview.summary.newBooks} buku baru, {preview.summary.newPublishers} penerbit baru,{" "}
        {preview.summary.newVariants} varian baru, dan {preview.summary.noOpRows} baris tanpa perubahan.
      </p>
      <p className="subtle">
        Import tidak mengubah stok, katalog, media, pesanan, atau data keuangan. Buku baru tetap berstatus draf dan
        varian baru tidak aktif.
      </p>
      <Button type="button" onClick={onConfirm} pending={pending} pendingLabel="Mengimpor buku…">
        Import buku
      </Button>
    </Card>
  );
}

function Result({ result, onReset }: { result: ImportResult; onReset: () => void }) {
  return (
    <Card frame="summary" className="bulk-import-result">
      <span className="card-kicker">HASIL</span>
      <h2>Import selesai</h2>
      <div className="bulk-import-result-grid">
        <span>
          Penerbit dibuat<strong>{result.summary.createdPublishers}</strong>
        </span>
        <span>
          Buku dibuat<strong>{result.summary.createdBooks}</strong>
        </span>
        <span>
          Varian dibuat<strong>{result.summary.createdVariants}</strong>
        </span>
        <span>
          Tanpa perubahan<strong>{result.summary.noOpRows}</strong>
        </span>
      </div>
      <div className="form-actions">
        <LinkButton href="/admin/books" variant="secondary">
          Lihat Buku
        </LinkButton>
        <Button type="button" variant="quiet" onClick={onReset}>
          Import file lain
        </Button>
      </div>
    </Card>
  );
}

export function AdminBulkImport() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<BulkImportState>("IDLE");
  const [file, setFile] = useState<File | null>(null);
  const [csv, setCsv] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [localErrors, setLocalErrors] = useState<BulkImportError[]>([]);
  const [failureMessage, setFailureMessage] = useState("");
  const [mimeType, setMimeType] = useState("");
  const serverPreview = useQuery(
    api.bulkImport.preview,
    file && csv ? { csv, fileName: file.name, mimeType: mimeType || undefined } : "skip",
  );
  const confirm = useMutation(api.bulkImport.confirm);

  const preview = serverPreview;
  const visibleState =
    state === "VALIDATING" && serverPreview !== undefined
      ? serverPreview.summary.invalidRows || serverPreview.errors.length
        ? "VALIDATION_FAILED"
        : "READY_FOR_REVIEW"
      : state;

  function reset() {
    setState("IDLE");
    setFile(null);
    setCsv("");
    setResult(null);
    setLocalErrors([]);
    setFailureMessage("");
    setMimeType("");
    if (inputRef.current) inputRef.current.value = "";
  }

  function selectFile(nextFile: File | null) {
    if (!nextFile) return;
    reset();
    setFile(nextFile);
    setMimeType(nextFile.type);
    setState("FILE_SELECTED");
  }

  async function validate() {
    if (!file) return;
    const fileErrors = validateBulkImportFile({ name: file.name, size: file.size, type: file.type });
    setLocalErrors(fileErrors);
    setFailureMessage("");
    if (fileErrors.length) {
      setState("VALIDATION_FAILED");
      return;
    }
    setState(bulkImportTransition("FILE_SELECTED", "START_PARSE"));
    let text: string;
    try {
      text = new TextDecoder("utf-8", { fatal: true }).decode(await file.arrayBuffer());
    } catch {
      setLocalErrors([
        {
          rowNumber: 1,
          field: "file",
          value: "",
          code: "INVALID_ENCODING",
          message: "file harus menggunakan UTF-8",
          correction: "simpan ulang file sebagai UTF-8 CSV",
          severity: "validation",
        },
      ]);
      setState("VALIDATION_FAILED");
      return;
    }
    const parsed = parseBulkImportCsv(text);
    if (parsed.errors.length || parsed.rows.some((row) => row.errors.length)) {
      setCsv("");
      setLocalErrors([...parsed.errors, ...parsed.rows.flatMap((row) => row.errors)]);
      setState(bulkImportTransition("PARSING", "PARSE_FAILURE"));
      return;
    }
    setCsv(text);
    setState(bulkImportTransition("PARSING", "PARSE_SUCCESS"));
  }

  async function runConfirm() {
    if (!file || visibleState !== "READY_FOR_REVIEW") return;
    setFailureMessage("");
    setState(bulkImportTransition("READY_FOR_REVIEW", "CONFIRM_IMPORT"));
    try {
      const nextResult = await confirm({ csv, fileName: file.name, mimeType: mimeType || undefined });
      setResult(nextResult);
      setState(bulkImportTransition("IMPORTING", "IMPORT_SUCCESS"));
    } catch {
      setFailureMessage(
        "Import gagal. Data mungkin berubah sejak validasi atau ada konflik baru. Validasi ulang file sebelum mencoba kembali.",
      );
      setState(bulkImportTransition("IMPORTING", "IMPORT_FAILURE"));
    }
  }

  const hasSelectedFile = Boolean(file);
  return (
    <AdminOperationalPage
      eyebrow="Master Buku"
      title="Import Buku"
      description="Tambahkan beberapa buku sekaligus dari template CSV tanpa menjadikan spreadsheet sebagai sumber data utama."
      actions={
        <a
          className="button button-secondary"
          download="template-import-buku.csv"
          href={`data:text/csv;charset=utf-8,${encodeURIComponent(templateCsv)}`}
        >
          Unduh template CSV
        </a>
      }
    >
      {visibleState === "IDLE" ||
      visibleState === "FILE_SELECTED" ||
      visibleState === "VALIDATION_FAILED" ||
      visibleState === "READY_FOR_REVIEW" ? (
        <Card frame="form" className="bulk-import-upload">
          <div className="split-heading">
            <div>
              <span className="card-kicker">UPLOAD</span>
              <h2>Pilih file CSV</h2>
              <p className="subtle">
                CSV saja · maksimal 2 MiB · maksimal 200 baris data · maksimal 5.000 karakter per sel.
              </p>
            </div>
          </div>
          <input
            ref={inputRef}
            accept=".csv,text/csv,application/csv"
            aria-label="Pilih file CSV"
            className="bulk-import-file-input"
            onChange={(event) => {
              selectFile(event.target.files?.[0] || null);
              event.target.value = "";
            }}
            type="file"
          />
          <div className="bulk-import-file-actions">
            <Button type="button" variant="secondary" onClick={() => inputRef.current?.click()}>
              {hasSelectedFile ? "Ganti file CSV" : "Pilih file CSV"}
            </Button>
            {file ? (
              <span className="bulk-import-file-meta">
                {file.name} · {formatBytes(file.size)}
              </span>
            ) : null}
            {file ? (
              <Button type="button" variant="quiet" onClick={reset}>
                Hapus pilihan
              </Button>
            ) : null}
          </div>
          {visibleState === "FILE_SELECTED" ? (
            <Button type="button" onClick={() => void validate()}>
              Validasi file
            </Button>
          ) : null}
          {localErrors.length ? <ErrorList errors={localErrors} /> : null}
          {preview ? <Summary preview={preview} /> : null}
        </Card>
      ) : null}

      {visibleState === "PARSING" ? (
        <LoadingRegion label="Membaca file CSV">
          <Card>
            <h2>Membaca file…</h2>
            <p className="subtle">Memeriksa struktur CSV tanpa menulis data.</p>
          </Card>
        </LoadingRegion>
      ) : null}
      {visibleState === "VALIDATING" ? (
        <LoadingRegion label="Memvalidasi file CSV">
          <Card>
            <h2>Memvalidasi file…</h2>
            <p className="subtle">Server sedang mencocokkan penerbit, buku, varian, ISBN, dan harga.</p>
          </Card>
        </LoadingRegion>
      ) : null}

      {preview && (visibleState === "VALIDATION_FAILED" || visibleState === "READY_FOR_REVIEW") ? (
        <>
          <PreviewTable preview={preview} />
          {preview.errors.length ? <ErrorList errors={preview.errors} /> : null}
          {visibleState === "READY_FOR_REVIEW" ? (
            <Confirmation preview={preview} onConfirm={() => void runConfirm()} pending={false} />
          ) : null}
        </>
      ) : null}

      {visibleState === "IMPORTING" ? (
        <LoadingRegion label="Mengimpor buku">
          <Card>
            <h2>Mengimpor buku…</h2>
            <p className="subtle">Satu transaksi aman sedang diproses. Jangan tutup halaman ini.</p>
          </Card>
        </LoadingRegion>
      ) : null}
      {visibleState === "IMPORT_FAILED" ? (
        <Card frame="attention" className="bulk-import-failure">
          <span className="card-kicker">IMPORT GAGAL</span>
          <h2>Data belum berubah.</h2>
          <p>{failureMessage}</p>
          <div className="form-actions">
            <Button type="button" onClick={() => void validate()}>
              Validasi ulang
            </Button>
            <Button type="button" variant="secondary" onClick={reset}>
              Pilih file lain
            </Button>
          </div>
        </Card>
      ) : null}
      {visibleState === "COMPLETED" && result ? <Result result={result} onReset={reset} /> : null}
    </AdminOperationalPage>
  );
}
