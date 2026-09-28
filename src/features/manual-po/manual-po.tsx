"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button, Card, EmptyState, Field, Money, StatusBadge } from "@/components/ui";

type ManualPoStatus = "active" | "arrived" | "cancelled";

const statusLabel: Record<ManualPoStatus, string> = {
  active: "Berjalan",
  arrived: "Sudah tiba",
  cancelled: "Dibatalkan",
};

function statusTone(status: ManualPoStatus) {
  if (status === "arrived") return "positive" as const;
  if (status === "cancelled") return "warning" as const;
  return "neutral" as const;
}

export function AdminManualPoPanel({ customerUserId }: { customerUserId: Id<"appUsers"> }) {
  const entries = useQuery(api.manualPoEntries.listForAdmin, { customerUserId });
  const createEntry = useMutation(api.manualPoEntries.create);
  const updateEntry = useMutation(api.manualPoEntries.update);
  const setStatus = useMutation(api.manualPoEntries.setStatus);
  const archive = useMutation(api.manualPoEntries.archive);
  const [editingId, setEditingId] = useState<Id<"manualPoEntries"> | null>(null);
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [etaText, setEtaText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const editing = useMemo(
    () => entries?.find((entry) => entry.entryId === editingId) ?? null,
    [editingId, entries],
  );

  function resetForm() {
    setEditingId(null);
    setTitle("");
    setPrice("");
    setEtaText("");
    setError("");
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    const priceAmount = Number(price);
    if (!title.trim() || !etaText.trim() || !Number.isSafeInteger(priceAmount) || priceAmount <= 0) {
      setError("Isi judul, harga, dan ETA dengan benar.");
      return;
    }
    setSubmitting(true);
    try {
      if (editingId) {
        await updateEntry({ entryId: editingId, title, priceAmount, etaText });
      } else {
        await createEntry({ customerUserId, title, priceAmount, etaText });
      }
      resetForm();
    } catch {
      setError("Pesanan khusus belum berhasil disimpan. Coba lagi.");
    } finally {
      setSubmitting(false);
    }
  }

  function startEdit(entry: NonNullable<typeof entries>[number]) {
    setEditingId(entry.entryId);
    setTitle(entry.title);
    setPrice(String(entry.priceAmount));
    setEtaText(entry.etaText);
    setError("");
  }

  async function changeStatus(entryId: Id<"manualPoEntries">, status: ManualPoStatus) {
    setError("");
    try {
      await setStatus({ entryId, status });
    } catch {
      setError("Status belum berhasil diperbarui.");
    }
  }

  async function archiveEntry(entryId: Id<"manualPoEntries">) {
    setError("");
    try {
      await archive({ entryId });
      if (editingId === entryId) resetForm();
    } catch {
      setError("Pesanan khusus belum berhasil diarsipkan.");
    }
  }

  return (
    <Card className="manual-po-admin-card">
      <div className="split-heading">
        <div>
          <span className="card-kicker">Pesanan di luar PO reguler</span>
          <h2>Pesanan Khusus</h2>
        </div>
        <StatusBadge>{entries?.length ?? 0}</StatusBadge>
      </div>
      <p className="subtle">
        Catat judul, harga, dan ETA tanpa membuat Book Master, Catalog, Batch, atau invoice.
      </p>

      <form className="content-stack manual-po-form" onSubmit={submit}>
        <div className="form-grid">
          <Field label="Judul buku">
            <input
              className="input"
              value={title}
              maxLength={200}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Contoh: The Complete Brambly Hedge"
            />
          </Field>
          <Field label="Harga">
            <input
              className="input"
              type="number"
              min="1"
              step="1"
              inputMode="numeric"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              placeholder="175000"
            />
          </Field>
          <Field label="ETA">
            <input
              className="input"
              value={etaText}
              maxLength={120}
              onChange={(event) => setEtaText(event.target.value)}
              placeholder="Contoh: Estimasi tiba Januari 2027"
            />
          </Field>
        </div>
        {error ? (
          <p className="error-text" role="alert">
            {error}
          </p>
        ) : null}
        <div className="form-actions">
          <Button type="submit" loading={submitting} loadingLabel="Menyimpan…">
            {editingId ? "Simpan perubahan" : "Tambah Pesanan Khusus"}
          </Button>
          {editingId ? (
            <Button type="button" variant="tertiary" onClick={resetForm}>
              Batal edit
            </Button>
          ) : null}
        </div>
      </form>

      <div className="content-stack manual-po-admin-list">
        {entries === undefined ? (
          <p className="subtle">Memuat Pesanan Khusus…</p>
        ) : entries.length ? (
          entries.map((entry) => (
            <div className="summary-line manual-po-admin-row" key={entry.entryId}>
              <span>
                <strong>{entry.title}</strong>
                <br />
                <small className="subtle">ETA: {entry.etaText}</small>
              </span>
              <span className="manual-po-admin-row-actions">
                <Money amount={entry.priceAmount} />
                <StatusBadge tone={statusTone(entry.status)}>{statusLabel[entry.status]}</StatusBadge>
                <span className="form-actions">
                  <Button type="button" variant="tertiary" onClick={() => startEdit(entry)}>
                    Edit
                  </Button>
                  {entry.status !== "arrived" ? (
                    <Button type="button" variant="tertiary" onClick={() => void changeStatus(entry.entryId, "arrived")}>
                      Tandai tiba
                    </Button>
                  ) : null}
                  {entry.status !== "cancelled" ? (
                    <Button type="button" variant="tertiary" onClick={() => void changeStatus(entry.entryId, "cancelled")}>
                      Batalkan
                    </Button>
                  ) : null}
                  <Button type="button" variant="tertiary" onClick={() => void archiveEntry(entry.entryId)}>
                    Arsipkan
                  </Button>
                </span>
              </span>
            </div>
          ))
        ) : (
          <EmptyState
            title="Belum ada Pesanan Khusus"
            description="Pesanan buku di luar PO reguler dapat dicatat dari form di atas."
          />
        )}
      </div>
    </Card>
  );
}

export function CustomerManualPoSection() {
  const entries = useQuery(api.manualPoEntries.listMine, {});

  if (entries === undefined) {
    return (
      <Card className="manual-po-customer-card">
        <span className="card-kicker">Pesanan Khusus</span>
        <p className="subtle">Memuat pesanan khususmu…</p>
      </Card>
    );
  }

  if (!entries.length) return null;

  return (
    <Card className="manual-po-customer-card">
      <div className="split-heading">
        <div>
          <span className="card-kicker">Di luar PO reguler</span>
          <h2>Pesanan Khusus</h2>
        </div>
        <StatusBadge>{entries.length}</StatusBadge>
      </div>
      <p className="subtle">Judul yang dicatat langsung oleh Admin BFG. Bagian ini hanya dapat kamu lihat.</p>
      <div className="content-stack">
        {entries.map((entry) => (
          <div className="summary-line manual-po-customer-row" key={entry.entryId}>
            <span>
              <strong>{entry.title}</strong>
              <br />
              <small className="subtle">ETA: {entry.etaText}</small>
            </span>
            <span className="manual-po-customer-meta">
              <Money amount={entry.priceAmount} />
              <StatusBadge tone={statusTone(entry.status)}>{statusLabel[entry.status]}</StatusBadge>
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}
