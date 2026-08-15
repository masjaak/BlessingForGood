"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import {
  Button,
  Card,
  EmptyState,
  Field,
  LinkButton,
  LoadingRegion,
  Money,
  PageHeader,
  SkeletonCard,
  SkeletonText,
  StatusBadge,
} from "@/components/ui";
import { ProductAccessGuard } from "@/components/product-access-guard";
import {
  invoicePaymentStatusLabel,
  invoiceStatusLabel,
  paymentConfirmationStatusLabel,
} from "@/domain/prototype/operations";
import { useOperations } from "@/domain/prototype/operations-context";
import { formatIdr } from "@/domain/prototype/logic";
import { useProduct } from "@/domain/prototype/store";
import { SiteShell } from "@/components/site-shell";
import { BackButton } from "@/components/back-button";

function CustomerInvoiceDetail() {
  const { dataSource } = useProduct();
  const {
    currentCustomerInvoice,
    customerAccount,
    customerTransactions,
    customerAllocations,
    customerPaymentConfirmations,
    submitPaymentConfirmation,
  } = useOperations();
  if (dataSource !== "convex") return <div className="state-panel">Invoice belum tersedia saat ini.</div>;
  if (currentCustomerInvoice === undefined) {
    return (
      <LoadingRegion label="Memuat detail invoice">
        <SkeletonCard variant="invoice" />
        <SkeletonCard />
        <SkeletonCard />
      </LoadingRegion>
    );
  }
  if (!currentCustomerInvoice) {
    return (
      <EmptyState
        title="Invoice tidak ditemukan"
        description="Invoice ini tidak tersedia untuk akunmu."
        action={<LinkButton href="/account/invoices">Kembali ke invoice</LinkButton>}
      />
    );
  }
  const account = customerAccount?.account;
  return (
    <div className="page narrow-page">
      <PageHeader
        eyebrow="Detail invoice"
        title={currentCustomerInvoice.invoiceNumber}
        description={`Pesanan ${currentCustomerInvoice.orderId}`}
        actions={
          <LinkButton href="/account/invoices" variant="secondary">
            Kembali ke invoice
          </LinkButton>
        }
      />
      <div className="content-stack">
        <Card className="invoice-card">
          <div className="split-heading">
            <div>
              <span className="card-kicker">{currentCustomerInvoice.currency}</span>
              <h2>{formatIdr(currentCustomerInvoice.totalAmount)}</h2>
            </div>
            <StatusBadge>{invoiceStatusLabel(currentCustomerInvoice.status)}</StatusBadge>
          </div>
          {currentCustomerInvoice.items.map((item) => (
            <div className="summary-line" key={item.invoiceItemId}>
              <span>
                {item.quantity} × {item.description}
              </span>
              <Money amount={item.subtotalAmount} />
            </div>
          ))}
          <div className="summary-line">
            <span>Deposit yang diperlukan</span>
            <strong>{formatIdr(currentCustomerInvoice.depositRequiredAmount)}</strong>
          </div>
          <div className="summary-line">
            <span>Deposit teralokasi</span>
            <strong>{formatIdr(currentCustomerInvoice.allocatedDepositAmount)}</strong>
          </div>
          <div className="summary-line">
            <span>Sisa tagihan</span>
            <strong>{formatIdr(currentCustomerInvoice.outstandingAmount)}</strong>
          </div>
        </Card>

        <Card>
          <div className="split-heading">
            <div>
              <span className="card-kicker">Verifikasi pembayaran</span>
              <h2>{invoicePaymentStatusLabel(currentCustomerInvoice.paymentStatus)}</h2>
            </div>
            <StatusBadge tone={currentCustomerInvoice.paymentStatus === "paid" ? "positive" : "warning"}>
              {invoicePaymentStatusLabel(currentCustomerInvoice.paymentStatus)}
            </StatusBadge>
          </div>
          <div className="summary-line">
            <span>Pembayaran terverifikasi</span>
            <strong>{formatIdr(currentCustomerInvoice.verifiedPaymentAmount)}</strong>
          </div>
          {customerPaymentConfirmations === undefined ? (
            <LoadingRegion label="Memuat riwayat pembayaran">
              <SkeletonText width="52%" />
              <SkeletonText width="78%" />
            </LoadingRegion>
          ) : customerPaymentConfirmations.length ? (
            <div className="content-stack">
              <h3>Riwayat konfirmasi</h3>
              {customerPaymentConfirmations.map((confirmation) => (
                <div className="summary-line" key={confirmation.confirmationId}>
                  <span>
                    {paymentConfirmationStatusLabel(confirmation.status)} · {confirmation.paymentMethod} ·{" "}
                    {new Date(confirmation.submittedAt).toLocaleString("en-GB")}
                  </span>
                  <strong>{formatIdr(confirmation.amount)}</strong>
                  {confirmation.rejectionReason ? <small>{confirmation.rejectionReason}</small> : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="subtle">Belum ada konfirmasi pembayaran.</p>
          )}
          {currentCustomerInvoice.status === "issued" &&
          currentCustomerInvoice.outstandingAmount > 0 &&
          customerPaymentConfirmations ? (
            customerPaymentConfirmations.some(
              (confirmation) => confirmation.status === "submitted" || confirmation.status === "under_review",
            ) ? (
              <p className="subtle">Konfirmasi pembayaran terbarumu sedang ditinjau.</p>
            ) : (
              <PaymentConfirmationForm
                invoiceId={currentCustomerInvoice.invoiceId}
                maxAmount={currentCustomerInvoice.outstandingAmount}
                submitPaymentConfirmation={submitPaymentConfirmation}
              />
            )
          ) : null}
        </Card>

        <Card>
          <div className="split-heading">
            <div>
              <span className="card-kicker">Akun deposit</span>
              <h2>Tersedia dan dialokasikan</h2>
            </div>
          </div>
          {customerAccount === undefined || customerAllocations === undefined ? (
            <LoadingRegion label="Memuat data deposit">
              <SkeletonText width="48%" />
              <SkeletonText width="68%" />
              <SkeletonText width="58%" />
            </LoadingRegion>
          ) : (
            <>
              <div className="summary-line">
                <span>Tersedia</span>
                <strong>{formatIdr(account?.availableAmount || 0)}</strong>
              </div>
              <div className="summary-line">
                <span>Dialokasikan</span>
                <strong>{formatIdr(account?.reservedAmount || 0)}</strong>
              </div>
              <h3>Riwayat alokasi</h3>
              {customerAllocations.length ? (
                customerAllocations.map((allocation) => (
                  <div className="summary-line" key={allocation.allocationId}>
                    <span>{allocation.status}</span>
                    <strong>{formatIdr(allocation.amount)}</strong>
                  </div>
                ))
              ) : (
                <p className="subtle">Belum ada alokasi deposit untuk invoice ini.</p>
              )}
            </>
          )}
        </Card>

        <Card>
          <div className="split-heading">
            <div>
              <span className="card-kicker">Riwayat deposit</span>
              <h2>Mutasi saldo</h2>
            </div>
          </div>
          {!customerTransactions ? (
            <LoadingRegion label="Memuat riwayat deposit">
              <SkeletonText width="58%" />
              <SkeletonText width="78%" />
              <SkeletonText width="42%" />
            </LoadingRegion>
          ) : customerTransactions.page.length ? (
            customerTransactions.page.map((transaction) => (
              <div className="summary-line" key={transaction.transactionId}>
                <span>
                  {transaction.type} · {new Date(transaction.createdAt).toLocaleString("en-GB")}
                </span>
                <strong>{formatIdr(transaction.amount)}</strong>
              </div>
            ))
          ) : (
            <p className="subtle">Belum ada transaksi deposit.</p>
          )}
        </Card>
      </div>
    </div>
  );
}

function PaymentConfirmationForm({
  invoiceId,
  maxAmount,
  submitPaymentConfirmation,
}: {
  invoiceId: string;
  maxAmount: number;
  submitPaymentConfirmation: (
    invoiceId: string,
    input: {
      amount: number;
      paymentMethod: string;
      transferReference?: string;
      paidAt: number;
      proofReference?: string;
      proofStorageId?: Id<"_storage">;
      customerNote?: string;
    },
  ) => Promise<unknown>;
}) {
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Transfer bank");
  const [transferReference, setTransferReference] = useState("");
  const [paidAt, setPaidAt] = useState(new Date().toISOString().slice(0, 10));
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [customerNote, setCustomerNote] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const generateProofUploadUrl = useMutation(api.paymentConfirmations.generateProofUploadUrl);
  const paymentSettings = useQuery(api.settings.getForCustomer, {});

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    const paidAtTimestamp = new Date(`${paidAt}T00:00:00`).getTime();
    setIsSubmitting(true);
    try {
      if (
        !proofFile ||
        !["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(proofFile.type) ||
        proofFile.size > 5_000_000
      )
        throw new Error("Bukti pembayaran tidak valid.");
      const uploadUrl = await generateProofUploadUrl({});
      const upload = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": proofFile.type },
        body: proofFile,
      });
      if (!upload.ok) throw new Error("Upload bukti gagal.");
      const { storageId } = (await upload.json()) as { storageId: Id<"_storage"> };
      await submitPaymentConfirmation(invoiceId, {
        amount: Number(amount),
        paymentMethod,
        transferReference: transferReference || undefined,
        paidAt: paidAtTimestamp,
        proofStorageId: storageId,
        customerNote: customerNote || undefined,
      });
      setAmount("");
      setTransferReference("");
      setProofFile(null);
      setCustomerNote("");
      setMessage("Konfirmasi pembayaran dikirim untuk ditinjau.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Konfirmasi pembayaran belum dapat dikirim");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="content-stack" onSubmit={submit}>
      <h3>Kirim konfirmasi pembayaran</h3>
      {paymentSettings ? (
        <p className="notice-card">
          <strong>{paymentSettings.storeName}</strong>
          <br />
          {paymentSettings.paymentInstructions}
          <br />
          Bantuan manual: {paymentSettings.whatsappNumber}
        </p>
      ) : null}
      <div className="form-grid">
        <Field label={`Jumlah dibayar (maks. ${formatIdr(maxAmount)})`}>
          <input
            className="input"
            type="number"
            min="1"
            max={maxAmount}
            step="1"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            required
          />
        </Field>
        <Field label="Metode pembayaran">
          <input
            className="input"
            value={paymentMethod}
            onChange={(event) => setPaymentMethod(event.target.value)}
            required
          />
        </Field>
        <Field label="Tanggal pembayaran">
          <input
            className="input"
            type="date"
            value={paidAt}
            onChange={(event) => setPaidAt(event.target.value)}
            required
          />
        </Field>
        <Field label="Referensi transfer (opsional)">
          <input
            className="input"
            value={transferReference}
            onChange={(event) => setTransferReference(event.target.value)}
          />
        </Field>
      </div>
      <Field label="Bukti pembayaran" hint="JPG, PNG, WebP, atau PDF. Maksimal 5 MB.">
        <input
          className="input"
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          onChange={(event) => setProofFile(event.target.files?.[0] || null)}
          required
        />
      </Field>
      <Field label="Catatan (opsional)">
        <textarea className="textarea" value={customerNote} onChange={(event) => setCustomerNote(event.target.value)} />
      </Field>
      <div className="form-actions">
        <Button type="submit" pending={isSubmitting} pendingLabel="Mengirim…">
          Kirim konfirmasi
        </Button>
        {message ? (
          <span className="subtle" role="status">
            {message}
          </span>
        ) : null}
        {error ? (
          <span className="error-text" role="alert">
            {error}
          </span>
        ) : null}
      </div>
    </form>
  );
}

export default function CustomerInvoiceDetailPage() {
  return (
    <SiteShell>
      <div className="route-with-back">
        <BackButton fallback="/account/invoices" />
        <ProductAccessGuard requiredRole="customer">
          <CustomerInvoiceDetail />
        </ProductAccessGuard>
      </div>
    </SiteShell>
  );
}
