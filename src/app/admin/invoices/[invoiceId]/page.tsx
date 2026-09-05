"use client";

import { useMutation, useQuery } from "convex/react";
import { useParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { AdminNav } from "@/components/admin-nav";
import { ProductAccessGuard } from "@/components/product-access-guard";
import {
  ActionGroup,
  Button,
  Card,
  ConfirmationDialog,
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
import { invoicePaymentStatusLabel, invoiceStatusLabel } from "@/domain/prototype/operations";
import { useOperations } from "@/domain/prototype/operations-context";
import { productErrorMessage } from "@/domain/prototype/errors";
import { formatIdr } from "@/domain/prototype/logic";
import { useProduct } from "@/domain/prototype/store";
import { SiteShell } from "@/components/site-shell";
import { invoiceReference } from "@/domain/prototype/invoice-reference";
import { UatPurgeDialog } from "@/components/uat-purge-dialog";

export function invoiceVoidBlockReason({
  allocatedDepositAmount,
  verifiedPaymentAmount,
  paymentStatus,
}: {
  allocatedDepositAmount: number;
  verifiedPaymentAmount: number;
  paymentStatus: string;
}): string | null {
  if (allocatedDepositAmount > 0 || verifiedPaymentAmount > 0) {
    return "Lepaskan atau balikkan pembayaran sebelum membatalkan invoice.";
  }
  if (paymentStatus === "payment_submitted") {
    return "Selesaikan tinjauan konfirmasi pembayaran sebelum membatalkan invoice.";
  }
  return null;
}

function AdminInvoiceDetail() {
  const params = useParams<{ invoiceId: string }>();
  const invoiceId = String(params.invoiceId);
  const router = useRouter();
  const { dataSource, sessionRole } = useProduct();
  const {
    currentAdminInvoice,
    adminAccount,
    adminTransactions,
    adminAllocations,
    issueInvoice,
    voidInvoice,
    recordCredit,
    allocateDeposit,
    releaseAllocation,
    reverseAllocation,
    reverseTransaction,
  } = useOperations();
  const [message, setMessage] = useState("");
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [showDeleteExplanation, setShowDeleteExplanation] = useState(false);
  const [uatPurgeOpen, setUatPurgeOpen] = useState(false);
  const [uatPurgeError, setUatPurgeError] = useState("");
  const purgeInvoiceUat = useMutation(api.uatCleanup.purgeInvoice);
  const uatImpact = useQuery(
    api.uatCleanup.getInvoiceImpact,
    uatPurgeOpen && sessionRole === "owner" ? { invoiceId: invoiceId as Id<"invoices"> } : "skip",
  );
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    description: string;
    confirmLabel: string;
    action: () => void;
  } | null>(null);
  if (dataSource !== "convex") return <div className="state-panel">Data invoice belum tersedia.</div>;
  if (
    currentAdminInvoice === undefined ||
    adminAccount === undefined ||
    adminTransactions === undefined ||
    adminAllocations === undefined
  ) {
    return (
      <LoadingRegion label="Memuat invoice">
        <SkeletonCard variant="invoice" />
        <SkeletonCard />
      </LoadingRegion>
    );
  }
  if (!currentAdminInvoice)
    return (
      <EmptyState
        title="Invoice tidak ditemukan"
        description="Sesi Admin tidak dapat mengakses invoice tersebut."
        action={<LinkButton href="/admin/invoices">Kembali ke invoice</LinkButton>}
      />
    );
  const account = adminAccount?.account;
  const voidBlockReason = invoiceVoidBlockReason(currentAdminInvoice);

  async function run(action: () => Promise<unknown>, success: string, actionId: string) {
    setMessage("");
    setPendingAction(actionId);
    try {
      await action();
      setMessage(success);
    } catch (reason) {
      setMessage(productErrorMessage(reason, "Operasi invoice tidak dapat diselesaikan."));
    } finally {
      setPendingAction(null);
    }
  }

  async function confirmInvoiceUatPurge() {
    setPendingAction("uat-delete");
    setUatPurgeError("");
    try {
      await purgeInvoiceUat({
        invoiceId: invoiceId as Id<"invoices">,
        confirmedUatCleanup: true,
        confirmationKeyword: "HAPUS INVOICE",
      });
      router.push("/admin/invoices");
    } catch (reason) {
      setUatPurgeError(productErrorMessage(reason, "Data UAT belum dapat dihapus."));
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <div className="page admin-page">
      <PageHeader
        eyebrow="Operasi invoice"
        title={invoiceReference(currentAdminInvoice.invoiceNumber)}
        description={`${currentAdminInvoice.customerName} · ID Blessfriend: ${currentAdminInvoice.customerMemberCode || "belum tersedia"} · ${currentAdminInvoice.orderCode || `BFG-ORD-LEGACY-${currentAdminInvoice.orderId.slice(-8).toUpperCase()}`}`}
        actions={
          <LinkButton href="/admin/invoices" variant="secondary">
            Kembali ke invoice
          </LinkButton>
        }
      />
      <div className="admin-workspace">
        <AdminNav />
        <div className="admin-content">
          {message ? (
            <p className="success-banner" role="status">
              {message}
            </p>
          ) : null}
          <Card className="invoice-card">
            <div className="split-heading">
              <div>
                <span className="card-kicker">{currentAdminInvoice.currency}</span>
                <h2>{formatIdr(currentAdminInvoice.totalAmount)}</h2>
              </div>
              <StatusBadge>{invoiceStatusLabel(currentAdminInvoice.status)}</StatusBadge>
            </div>
            <div className="summary-line">
              <span>Pelanggan</span>
              <strong>{currentAdminInvoice.customerName}</strong>
            </div>
            <div className="summary-line">
              <span>ID Blessfriend</span>
              <strong>{currentAdminInvoice.customerMemberCode || "Belum tersedia"}</strong>
            </div>
            <div className="summary-line">
              <span>Referensi pesanan</span>
              <span>
                {currentAdminInvoice.orderCode ||
                  `BFG-ORD-LEGACY-${currentAdminInvoice.orderId.slice(-8).toUpperCase()}`}
              </span>
            </div>
            {currentAdminInvoice.items.map((item) => (
              <div className="summary-line" key={item.invoiceItemId}>
                <span>
                  {item.quantity} × {item.description}
                </span>
                <Money amount={item.subtotalAmount} />
              </div>
            ))}
            <div className="summary-line">
              <span>Deposit diperlukan</span>
              <strong>{formatIdr(currentAdminInvoice.depositRequiredAmount)}</strong>
            </div>
            <div className="summary-line">
              <span>Teralokasi</span>
              <strong>{formatIdr(currentAdminInvoice.allocatedDepositAmount)}</strong>
            </div>
            <div className="summary-line">
              <span>Sisa tagihan</span>
              <strong>{formatIdr(currentAdminInvoice.outstandingAmount)}</strong>
            </div>
            <div className="summary-line">
              <span>Status pembayaran · terverifikasi</span>
              <strong>
                {invoicePaymentStatusLabel(currentAdminInvoice.paymentStatus)} ·{" "}
                {formatIdr(currentAdminInvoice.verifiedPaymentAmount)}
              </strong>
            </div>
            <div className="action-region action-region-separated">
              <LinkButton href="/admin/payments" variant="secondary">
                Tinjau konfirmasi pembayaran
              </LinkButton>
              <ActionGroup variant="responsive">
                {currentAdminInvoice.status === "draft" ? (
                  <Button
                    type="button"
                    loading={pendingAction === "issue"}
                    loadingLabel="Menerbitkan…"
                    onClick={() => void run(() => issueInvoice(invoiceId), "Invoice diterbitkan.", "issue")}
                  >
                    Terbitkan invoice
                  </Button>
                ) : null}
                {currentAdminInvoice.status !== "void" ? (
                  <Button
                    type="button"
                    variant="danger"
                    loading={pendingAction === "void"}
                    loadingLabel="Membatalkan…"
                    onClick={() =>
                      setConfirmAction({
                        title: "Batalkan invoice ini?",
                        description: "Invoice akan berstatus void. Riwayat pembayaran dan ledger tetap tersimpan.",
                        confirmLabel: "Batalkan invoice",
                        action: () => void run(() => voidInvoice(invoiceId), "Invoice dibatalkan.", "void"),
                      })
                    }
                    disabled={voidBlockReason !== null || pendingAction !== null}
                  >
                    Batalkan invoice
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="danger"
                  loading={pendingAction === "uat-delete"}
                  onClick={() => {
                    if (sessionRole === "owner") {
                      setUatPurgeError("");
                      setUatPurgeOpen(true);
                    } else {
                      setShowDeleteExplanation(true);
                    }
                  }}
                >
                  Hapus permanen
                </Button>
              </ActionGroup>
              {voidBlockReason ? <span className="subtle action-support">{voidBlockReason}</span> : null}
            </div>
          </Card>

          <Card>
            <div className="split-heading">
              <div>
                <span className="card-kicker">Akun deposit</span>
                <h2>Tersedia dan dipesan</h2>
              </div>
            </div>
            <div className="summary-line">
              <span>Tersedia</span>
              <strong>{formatIdr(account?.availableAmount || 0)}</strong>
            </div>
            <div className="summary-line">
              <span>Dipesan</span>
              <strong>{formatIdr(account?.reservedAmount || 0)}</strong>
            </div>
            <CreditForm
              invoiceId={invoiceId}
              recordCredit={recordCredit}
              onDone={() => setMessage("Kredit dicatat.")}
            />
            <AllocationForm
              invoiceId={invoiceId}
              outstanding={currentAdminInvoice.outstandingAmount}
              available={account?.availableAmount || 0}
              allocateDeposit={allocateDeposit}
              disabled={currentAdminInvoice.status === "void"}
              onDone={() => setMessage("Deposit dialokasikan.")}
            />
          </Card>

          <Card>
            <div className="split-heading">
              <div>
                <span className="card-kicker">Alokasi</span>
                <h2>Reservasi invoice</h2>
              </div>
            </div>
            {adminAllocations === undefined ? (
              <LoadingRegion label="Memuat alokasi">
                <SkeletonText width="48%" />
              </LoadingRegion>
            ) : adminAllocations.length ? (
              adminAllocations.map((allocation) => (
                <div className="summary-line" key={allocation.allocationId}>
                  <span>
                    {allocation.status} · {formatIdr(allocation.amount)}
                  </span>
                  <span className="form-actions">
                    {allocation.status === "active" ? (
                      <>
                        <Button
                          type="button"
                          variant="danger"
                          loading={pendingAction === `release-${allocation.allocationId}`}
                          loadingLabel="Melepaskan…"
                          onClick={() =>
                            void run(
                              () => releaseAllocation(allocation.allocationId),
                              "Alokasi dilepaskan.",
                              `release-${allocation.allocationId}`,
                            )
                          }
                        >
                          Lepaskan
                        </Button>
                        <Button
                          type="button"
                          variant="danger"
                          loading={pendingAction === `reverse-${allocation.allocationId}`}
                          loadingLabel="Membalikkan…"
                          onClick={() =>
                            void run(
                              () => reverseAllocation(allocation.allocationId),
                              "Alokasi dibalikkan.",
                              `reverse-${allocation.allocationId}`,
                            )
                          }
                        >
                          Balikkan
                        </Button>
                      </>
                    ) : null}
                  </span>
                </div>
              ))
            ) : (
              <p className="subtle">Belum ada riwayat alokasi.</p>
            )}
          </Card>

          <Card>
            <div className="split-heading">
              <div>
                <span className="card-kicker">Ledger yang hanya menambah catatan</span>
                <h2>Transaksi</h2>
              </div>
            </div>
            {adminTransactions === undefined ? (
              <LoadingRegion label="Memuat ledger">
                <SkeletonText width="56%" />
              </LoadingRegion>
            ) : adminTransactions.page.length ? (
              adminTransactions.page.map((transaction) => (
                <div className="summary-line" key={transaction.transactionId}>
                  <span>
                    {transaction.type} · {formatIdr(transaction.amount)} ·{" "}
                    {new Date(transaction.createdAt).toLocaleString("en-GB")}
                  </span>
                  <span className="form-actions">
                    {transaction.type !== "reversal" && !transaction.reversedByTransactionId ? (
                      <Button
                        type="button"
                        variant="danger"
                        loading={pendingAction === `transaction-${transaction.transactionId}`}
                        loadingLabel="Membalikkan…"
                        onClick={() =>
                          setConfirmAction({
                            title: "Catat transaksi pembalikan?",
                            description: "Pembalikan akan ditambahkan ke ledger. Transaksi asal tidak dihapus.",
                            confirmLabel: "Catat pembalikan",
                            action: () =>
                              void run(
                                () => reverseTransaction(transaction.transactionId, "admin correction"),
                                "Transaksi dibalikkan.",
                                `transaction-${transaction.transactionId}`,
                              ),
                          })
                        }
                      >
                        Balikkan
                      </Button>
                    ) : transaction.reversedByTransactionId ? (
                      <span className="subtle">Dibalikkan</span>
                    ) : null}
                  </span>
                </div>
              ))
            ) : (
              <p className="subtle">Belum ada transaksi deposit yang tercatat.</p>
            )}
          </Card>
          <ConfirmationDialog
            open={showDeleteExplanation}
            title="Invoice tidak dapat dihapus permanen"
            description={[
              "Invoice ini tidak dapat dihapus permanen karena sudah menjadi bagian dari riwayat",
              "pesanan atau keuangan.",
              "Riwayat invoice, pembayaran, deposit, pengembalian, dan audit perlu tetap disimpan.",
              "Gunakan Batalkan invoice sebagai alternatif bila tersedia; invoice yang sudah dibatalkan tetap",
              "dipertahankan sebagai bukti riwayat.",
            ].join(" ")}
            confirmLabel="Tutup"
            onCancel={() => setShowDeleteExplanation(false)}
            onConfirm={() => setShowDeleteExplanation(false)}
          />
          <ConfirmationDialog
            open={confirmAction !== null}
            title={confirmAction?.title || "Konfirmasi operasi"}
            description={confirmAction?.description || "Periksa kembali operasi ini."}
            confirmLabel={confirmAction?.confirmLabel || "Konfirmasi"}
            danger
            onCancel={() => setConfirmAction(null)}
            onConfirm={() => {
              const action = confirmAction?.action;
              setConfirmAction(null);
              action?.();
            }}
          />
          <UatPurgeDialog
            open={uatPurgeOpen}
            impact={uatImpact}
            loading={pendingAction === "uat-delete"}
            error={uatPurgeError}
            onCancel={() => setUatPurgeOpen(false)}
            onConfirm={() => void confirmInvoiceUatPurge()}
          />
        </div>
      </div>
    </div>
  );
}

function CreditForm({
  invoiceId,
  recordCredit,
  onDone,
}: {
  invoiceId: string;
  recordCredit: (invoiceId: string, amount: number, note?: string) => Promise<unknown>;
  onDone: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      await recordCredit(invoiceId, Number(amount), note || undefined);
      setAmount("");
      setNote("");
      onDone();
    } catch (reason) {
      setError(productErrorMessage(reason, "Kredit belum dapat dicatat."));
    } finally {
      setIsSubmitting(false);
    }
  }
  return (
    <form className="form-actions" onSubmit={submit}>
      <Field label="Catat kredit">
        <input
          className="input"
          type="number"
          min="1"
          step="1"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          required
        />
      </Field>
      <Field label="Catatan (opsional)">
        <input className="input" value={note} onChange={(event) => setNote(event.target.value)} />
      </Field>
      <Button type="submit" loading={isSubmitting} loadingLabel="Mencatat…">
        Catat kredit
      </Button>
      {error ? (
        <span className="error-text" role="alert">
          {error}
        </span>
      ) : null}
    </form>
  );
}

export function AllocationForm({
  invoiceId,
  outstanding,
  available,
  allocateDeposit,
  disabled,
  onDone,
}: {
  invoiceId: string;
  outstanding: number;
  available: number;
  allocateDeposit: (invoiceId: string, amount: number) => Promise<unknown>;
  disabled: boolean;
  onDone: () => void;
}) {
  const maxAllocatable = Math.min(outstanding, available);
  const [amountOverride, setAmountOverride] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const amount = amountOverride ?? String(maxAllocatable || "");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      await allocateDeposit(invoiceId, Number(amount));
      setAmountOverride(null);
      onDone();
    } catch (reason) {
      setError(productErrorMessage(reason, "Deposit belum dapat dialokasikan."));
    } finally {
      setIsSubmitting(false);
    }
  }
  return (
    <form className="form-actions" onSubmit={submit}>
      <Field label={`Alokasikan (sisa ${formatIdr(outstanding)})`}>
        <input
          className="input"
          type="number"
          min="1"
          max={maxAllocatable}
          step="1"
          value={amount}
          onChange={(event) => setAmountOverride(event.target.value)}
          required
          disabled={disabled || maxAllocatable < 1}
        />
      </Field>
      <Button
        type="submit"
        loading={isSubmitting}
        loadingLabel="Mengalokasikan…"
        disabled={disabled || maxAllocatable < 1}
      >
        Alokasikan sisa deposit
      </Button>
      {!disabled && maxAllocatable < 1 ? <span className="subtle">Saldo deposit tersedia belum mencukupi.</span> : null}
      {error ? (
        <span className="error-text" role="alert">
          {error}
        </span>
      ) : null}
    </form>
  );
}

export default function AdminInvoiceDetailPage() {
  return (
    <SiteShell>
      <ProductAccessGuard requiredRole="admin">
        <AdminInvoiceDetail />
      </ProductAccessGuard>
    </SiteShell>
  );
}
