"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button, Card, EmptyState, Field, LinkButton, Money, StatusBadge } from "@/components/ui";

export function AdminManualPoPanel({ customerUserId }: { customerUserId: Id<"appUsers"> }) {
  const entries = useQuery(api.manualPoEntries.listForAdmin, { customerUserId });
  const createEntry = useMutation(api.manualPoEntries.create);
  const issueManualPo = useMutation(api.invoices.issueManualPo);
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [etaText, setEtaText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [billingPendingId, setBillingPendingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const activeEntries = entries?.filter((entry) => entry.status === "active") ?? [];

  function resetForm() {
    setTitle("");
    setPrice("");
    setEtaText("");
    setError("");
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const priceAmount = Number(price);
    if (!title.trim() || !etaText.trim() || !Number.isSafeInteger(priceAmount) || priceAmount <= 0) {
      setError("Isi judul buku, harga, dan ETA dengan benar.");
      return;
    }

    setSubmitting(true);
    try {
      await createEntry({ customerUserId, title, priceAmount, etaText });
      resetForm();
      setSuccess("Pesanan Khusus ditambahkan. Customer melihatnya di Buku Saya → Random PO berjalan, bukan di Tagihan.");
    } catch {
      setError("Pesanan Khusus belum berhasil ditambahkan. Coba lagi.");
    } finally {
      setSubmitting(false);
    }
  }

  async function createInvoice(entryId: Id<"manualPoEntries">) {
    setError("");
    setSuccess("");
    setBillingPendingId(String(entryId));
    try {
      await issueManualPo({ entryId });
      setSuccess("Tagihan Pesanan Khusus diterbitkan. Customer sekarang bisa membuka dan membayar dari menu Tagihan.");
    } catch {
      setError("Tagihan belum berhasil diterbitkan. Coba lagi.");
    } finally {
      setBillingPendingId(null);
    }
  }

  return (
    <Card className="manual-po-admin-card" id="manual-po">
      <div className="split-heading">
        <div>
          <span className="card-kicker">Tanpa upload Book Master / Catalog</span>
          <h2>PO Random / Pesanan Khusus</h2>
        </div>
        <StatusBadge>{activeEntries.length}</StatusBadge>
      </div>

      <p className="subtle">
        Masukkan judul buku, harga, dan ETA lalu tambahkan Pesanan Khusus. Customer langsung melihatnya di Buku Saya.
        Kalau sudah perlu ditagih, klik Buat tagihan pada item tersebut.
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

        {success ? (
          <p className="success-banner" role="status" aria-live="polite">
            {success}
          </p>
        ) : null}

        <div className="form-actions">
          <Button type="submit" loading={submitting} loadingLabel="Menambahkan…">
            Tambahkan Pesanan Khusus
          </Button>
        </div>
      </form>

      <div className="content-stack manual-po-admin-list">
        {entries === undefined ? (
          <p className="subtle">Memuat Pesanan Khusus…</p>
        ) : activeEntries.length ? (
          activeEntries.map((entry) => {
            const invoiceReady = Boolean(entry.invoiceId);
            const legacyBillingOnly = entry.billingStatus === "billed" && !entry.invoiceId;
            return (
              <div className="summary-line manual-po-admin-row" key={entry.entryId}>
                <span>
                  <strong>{entry.title}</strong>
                  <br />
                  <small className="subtle">ETA: {entry.etaText}</small>
                </span>
                <span className="manual-po-admin-row-actions">
                  <Money amount={entry.priceAmount} />
                  <StatusBadge tone={invoiceReady ? "positive" : legacyBillingOnly ? "warning" : "neutral"}>
                    {invoiceReady ? "Tagihan terbit" : legacyBillingOnly ? "Perlu terbitkan" : "Belum ditagih"}
                  </StatusBadge>
                  {entry.invoiceId ? (
                    <LinkButton href={`/admin/invoices/${entry.invoiceId}`} variant="secondary">
                      Buka tagihan
                    </LinkButton>
                  ) : (
                    <Button
                      type="button"
                      variant="secondary"
                      loading={billingPendingId === String(entry.entryId)}
                      loadingLabel="Menerbitkan…"
                      disabled={billingPendingId !== null}
                      onClick={() => void createInvoice(entry.entryId)}
                    >
                      Buat tagihan
                    </Button>
                  )}
                </span>
              </div>
            );
          })
        ) : (
          <EmptyState
            title="Belum ada Random PO berjalan"
            description="Pesanan Khusus yang ditambahkan akan tampil di sini dan di Buku Saya customer."
          />
        )}
      </div>
    </Card>
  );
}

export function CustomerManualPoSection() {
  const entries = useQuery(api.manualPoEntries.listMine, {});
  const activeEntries = entries?.filter((entry) => entry.status === "active") ?? [];

  if (entries === undefined) {
    return (
      <Card className="manual-po-customer-card" id="random-po">
        <span className="card-kicker">Random PO berjalan</span>
        <p className="subtle">Memuat Pesanan Khususmu…</p>
      </Card>
    );
  }

  if (!activeEntries.length) return null;

  return (
    <Card className="manual-po-customer-card">
      <div className="split-heading">
        <div>
          <span className="card-kicker">Random PO berjalan</span>
          <h2>Pesanan Khusus</h2>
        </div>
        <StatusBadge>{activeEntries.length}</StatusBadge>
      </div>

      <p className="subtle">Buku random PO yang sedang berjalan. Cek judul, ETA, dan harga dari Admin BFG.</p>

      <div className="content-stack">
        {activeEntries.map((entry) => (
          <div className="summary-line manual-po-customer-row" key={entry.entryId}>
            <span>
              <strong>{entry.title}</strong>
              <br />
              <small className="subtle">ETA: {entry.etaText}</small>
            </span>
            <span className="manual-po-customer-meta">
              <Money amount={entry.priceAmount} />
              {entry.invoiceId ? (
                <>
                  <StatusBadge tone="warning">Tagihan tersedia</StatusBadge>
                  <LinkButton href={`/account/invoices/${entry.invoiceId}`} variant="secondary">
                    Lihat tagihan
                  </LinkButton>
                </>
              ) : (
                <StatusBadge>Menunggu tagihan</StatusBadge>
              )}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}
