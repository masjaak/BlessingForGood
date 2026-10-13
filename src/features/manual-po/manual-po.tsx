"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button, Card, EmptyState, Field, LinkButton, Money, StatusBadge } from "@/components/ui";
import { BFGSelect } from "@/components/bfg-select";
import { percentageToBasisPoints } from "@/lib/percentage";
import { calculateDepositRequired } from "../../../convex/lib/invoiceCalculations";

function manualPoStatusLabel(status: string) {
  if (status === "unbilled") return "Menunggu tagihan";
  if (status === "awaiting_payment") return "Menunggu pembayaran";
  if (status === "payment_submitted") return "Pembayaran dikirim";
  if (status === "paid_waiting_arrival") return "Sudah lunas · Menunggu datang";
  if (status === "received") return "Diterima";
  return "Berjalan";
}

function manualPoStatusTone(status: string): "neutral" | "positive" | "warning" {
  if (status === "received" || status === "paid_waiting_arrival") return "positive";
  if (status === "awaiting_payment" || status === "payment_submitted") return "warning";
  return "neutral";
}

export function AdminManualPoPanel({ customerUserId }: { customerUserId: Id<"appUsers"> }) {
  const entries = useQuery(api.manualPoEntries.listForAdmin, { customerUserId });
  const createEntry = useMutation(api.manualPoEntries.create);
  const issueManualPo = useMutation(api.invoices.issueManualPo);
  const setManualPoStatus = useMutation(api.manualPoEntries.setStatus);
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [etaText, setEtaText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [billingPendingId, setBillingPendingId] = useState<string | null>(null);
  const [dpMode, setDpMode] = useState<"none" | "percentage">("none");
  const [dpPercentage, setDpPercentage] = useState("30");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const visibleEntries = entries ?? [];
  const dpValue = Number(dpPercentage);
  const dpValid =
    dpPercentage.trim() !== "" &&
    Number.isFinite(dpValue) &&
    dpValue >= 0 &&
    dpValue <= 100 &&
    Number.isSafeInteger(dpValue * 100);
  const dpBasisPoints = dpMode === "percentage" && dpValid ? percentageToBasisPoints(dpValue) : null;

  function invoiceArgs(entryId: Id<"manualPoEntries">) {
    if (dpMode === "none") return { entryId };
    if (!dpValid) throw new Error("Persentase DP harus berada di antara 0–100%.");
    return { entryId, depositPercentageBasisPoints: percentageToBasisPoints(dpValue) };
  }

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
      await issueManualPo(invoiceArgs(entryId));
      setSuccess("Tagihan Pesanan Khusus diterbitkan. Customer sekarang bisa membuka dan membayar dari menu Tagihan.");
    } catch (reason) {
      setError(
        reason instanceof Error && reason.message.includes("Persentase DP")
          ? reason.message
          : "Tagihan belum berhasil diterbitkan. Coba lagi.",
      );
    } finally {
      setBillingPendingId(null);
    }
  }

  async function markReceived(entryId: Id<"manualPoEntries">) {
    setError("");
    setSuccess("");
    setBillingPendingId(String(entryId));
    try {
      await setManualPoStatus({ entryId, status: "arrived" });
      setSuccess("Random PO ditandai diterima. Status customer ikut diperbarui.");
    } catch {
      setError("Status Random PO belum berhasil diperbarui. Coba lagi.");
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
        <StatusBadge>{visibleEntries.length}</StatusBadge>
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

      <div className="manual-po-billing-settings">
        <Field label="Syarat DP saat menerbitkan invoice">
          <BFGSelect
            aria-label="Mode DP Pesanan Khusus"
            value={dpMode}
            disabled={billingPendingId !== null}
            onChange={(event) => setDpMode(event.target.value as "none" | "percentage")}
          >
            <option value="none">Tanpa minimum DP (seperti sebelumnya)</option>
            <option value="percentage">DP persentase (%)</option>
          </BFGSelect>
        </Field>
        {dpMode === "percentage" ? (
          <Field label="DP (%)">
            <input
              className="input"
              aria-label="DP Pesanan Khusus (%)"
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={dpPercentage}
              disabled={billingPendingId !== null}
              onChange={(event) => setDpPercentage(event.target.value)}
            />
          </Field>
        ) : null}
        {dpMode === "percentage" && !dpValid ? (
          <p className="error-text" role="alert">DP harus antara 0–100% (maksimal 2 desimal).</p>
        ) : null}
      </div>

      <div className="content-stack manual-po-admin-list">
        {entries === undefined ? (
          <p className="subtle">Memuat Pesanan Khusus…</p>
        ) : visibleEntries.length ? (
          visibleEntries.map((entry) => {
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
                  {!entry.invoiceId && dpBasisPoints !== null ? (
                    <small className="subtle">
                      DP minimum {calculateDepositRequired(entry.priceAmount, "percentage", dpBasisPoints).toLocaleString("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 })}
                    </small>
                  ) : null}
                  <StatusBadge
                    tone={
                      entry.operationalStatus
                        ? manualPoStatusTone(entry.operationalStatus)
                        : invoiceReady
                          ? "positive"
                          : legacyBillingOnly
                            ? "warning"
                            : "neutral"
                    }
                  >
                    {entry.operationalStatus
                      ? manualPoStatusLabel(entry.operationalStatus)
                      : invoiceReady
                        ? "Tagihan terbit"
                        : legacyBillingOnly
                          ? "Perlu terbitkan"
                          : "Belum ditagih"}
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
                      disabled={billingPendingId !== null || (dpMode === "percentage" && !dpValid)}
                      onClick={() => void createInvoice(entry.entryId)}
                    >
                      Buat tagihan
                    </Button>
                  )}
                  {entry.operationalStatus === "paid_waiting_arrival" ? (
                    <Button
                      type="button"
                      variant="secondary"
                      loading={billingPendingId === String(entry.entryId)}
                      loadingLabel="Menyimpan…"
                      disabled={billingPendingId !== null}
                      onClick={() => void markReceived(entry.entryId)}
                    >
                      Tandai diterima
                    </Button>
                  ) : null}
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
  const visibleEntries = entries ?? [];

  if (entries === undefined) {
    return (
      <Card className="manual-po-customer-card" id="random-po">
        <span className="card-kicker">Random PO berjalan</span>
        <p className="subtle">Memuat Pesanan Khususmu…</p>
      </Card>
    );
  }

  if (!visibleEntries.length) return null;

  return (
    <Card className="manual-po-customer-card">
      <div className="split-heading">
        <div>
          <span className="card-kicker">Random PO</span>
          <h2>Pesanan Khusus</h2>
        </div>
        <StatusBadge>{visibleEntries.length}</StatusBadge>
      </div>

      <p className="subtle">
        Pantau Random PO dari penagihan, pembayaran, menunggu barang datang, sampai diterima.
      </p>

      <div className="content-stack">
        {visibleEntries.map((entry) => (
          <div className="summary-line manual-po-customer-row" key={entry.entryId}>
            <span>
              <strong>{entry.title}</strong>
              <br />
              <small className="subtle">ETA: {entry.etaText}</small>
            </span>
            <span className="manual-po-customer-meta">
              <Money amount={entry.priceAmount} />
              <StatusBadge tone={manualPoStatusTone(entry.operationalStatus)}>
                {manualPoStatusLabel(entry.operationalStatus)}
              </StatusBadge>
              {entry.invoiceId ? (
                <LinkButton href={`/account/invoices/${entry.invoiceId}`} variant="secondary">
                  Lihat tagihan
                </LinkButton>
              ) : null}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}
