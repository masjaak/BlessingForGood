"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { AdminNav } from "@/components/admin-nav";
import { BFGSelect } from "@/components/bfg-select";
import { ProductAccessGuard } from "@/components/product-access-guard";
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
  StatusBadge,
} from "@/components/ui";
import { formatIdr } from "@/domain/prototype/logic";
import { orderReference } from "@/domain/prototype/order-reference";
import { invoicePaymentStatusLabel, invoiceStatusLabel } from "@/domain/prototype/operations";
import { useOperations, type InvoiceRequirementMode } from "@/domain/prototype/operations-context";
import { useProduct } from "@/domain/prototype/store";
import { SiteShell } from "@/components/site-shell";

export function PersistentRequirementForm({ orderId }: { orderId: string }) {
  const { createInvoice, issueInvoice } = useOperations();
  const [mode, setMode] = useState<InvoiceRequirementMode>("none");
  const [value, setValue] = useState("");
  const [message, setMessage] = useState("");
  const [pendingAction, setPendingAction] = useState<"draft" | "issue" | null>(null);
  const [createdInvoiceId, setCreatedInvoiceId] = useState<string | null>(null);

  async function saveInvoice(issue: boolean) {
    setMessage("");
    setCreatedInvoiceId(null);
    setPendingAction(issue ? "issue" : "draft");
    let invoiceId: string | null = null;
    try {
      const draft = await createInvoice(orderId, mode, mode === "none" ? undefined : Number(value));
      invoiceId = draft.invoiceId;
      setCreatedInvoiceId(invoiceId);
      if (issue) {
        await issueInvoice(invoiceId);
        setMessage("Invoice diterbitkan.");
      } else {
        setMessage("Draf invoice tersimpan.");
      }
      setValue("");
    } catch (reason) {
      setMessage(
        invoiceId
          ? "Draf tersimpan, tetapi invoice belum diterbitkan. Buka operasi invoice untuk mencoba lagi."
          : reason instanceof Error
            ? reason.message
            : "Invoice tidak dapat dibuat.",
      );
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <form
      className="form-actions"
      onSubmit={(event) => {
        event.preventDefault();
        void saveInvoice(false);
      }}
    >
      <label className="field">
        <span className="field-label">Syarat deposit</span>
        <BFGSelect
          className="select"
          value={mode}
          onChange={(event) => setMode(event.target.value as InvoiceRequirementMode)}
        >
          <option value="none">Tidak ada</option>
          <option value="fixed">Nominal tetap (IDR)</option>
          <option value="percentage">Persentase (basis poin)</option>
        </BFGSelect>
      </label>
      {mode !== "none" ? (
        <Field label={mode === "fixed" ? "Nominal (IDR)" : "Basis poin (0–10000)"}>
          <input
            className="input"
            type="number"
            min="0"
            max={mode === "percentage" ? 10000 : undefined}
            step="1"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            required
          />
        </Field>
      ) : null}
      <Button
        type="submit"
        variant="secondary"
        loading={pendingAction === "draft"}
        disabled={pendingAction !== null}
        loadingLabel="Menyimpan…"
      >
        Simpan draf
      </Button>
      <Button
        type="button"
        variant="primary"
        loading={pendingAction === "issue"}
        disabled={pendingAction !== null}
        loadingLabel="Menerbitkan…"
        onClick={() => void saveInvoice(true)}
      >
        Terbitkan invoice
      </Button>
      {createdInvoiceId ? (
        <LinkButton href={`/admin/invoices/${createdInvoiceId}`} variant="tertiary">
          Buka operasi invoice
        </LinkButton>
      ) : null}
      {message ? (
        <span className="subtle" role="status">
          {message}
        </span>
      ) : null}
    </form>
  );
}

function IssueInvoiceButton({ invoiceId }: { invoiceId: string }) {
  const { issueInvoice } = useOperations();
  const [message, setMessage] = useState("");
  const [isIssuing, setIsIssuing] = useState(false);

  async function issue() {
    setMessage("");
    setIsIssuing(true);
    try {
      await issueInvoice(invoiceId);
      setMessage("Diterbitkan.");
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Invoice tidak dapat diterbitkan.");
    } finally {
      setIsIssuing(false);
    }
  }

  return (
    <span className="form-actions">
      <Button
        type="button"
        variant="primary"
        loading={isIssuing}
        loadingLabel="Menerbitkan…"
        onClick={() => void issue()}
      >
        Terbitkan invoice
      </Button>
      {message ? (
        <span className="subtle" role="status">
          {message}
        </span>
      ) : null}
    </span>
  );
}

function PersistentAdminInvoices() {
  const { state } = useProduct();
  const { adminInvoiceList } = useOperations();
  const searchParams = useSearchParams();
  const requestedOrderId = searchParams.get("orderId");
  const requestedCustomerId = searchParams.get("customerId");
  const invoices = adminInvoiceList?.page || [];
  if (!adminInvoiceList) {
    return (
      <LoadingRegion label="Memuat invoice">
        <SkeletonCard variant="invoice" />
        <SkeletonCard variant="invoice" />
      </LoadingRegion>
    );
  }
  const ordersWithoutInvoices = state.orders.filter(
    (order) =>
      (!requestedOrderId || order.id === requestedOrderId) &&
      (!requestedCustomerId || order.customerUserId === requestedCustomerId) &&
      !invoices.some((invoice) => invoice.orderId === order.id && invoice.status !== "void"),
  );
  return (
    <div className="page admin-page">
      <PageHeader
        eyebrow="Operasi invoice dan deposit"
        title="Jaga status keuangan tetap jelas."
        description="Invoice memakai snapshot pesanan. Deposit memakai ledger append-only; alokasi, pelepasan, dan pembalikan tetap terpisah."
      />
      <div className="admin-workspace">
        <AdminNav />
        <div className="admin-content">
          {ordersWithoutInvoices.length ? (
            <Card>
              <span className="card-kicker">Pesanan yang membutuhkan invoice</span>
              <h2>Simpan draf berikutnya.</h2>
              {ordersWithoutInvoices.map((order) => (
                <div className="invoice-issue-row" key={order.id}>
                  <div>
                    <strong>{order.customerName}</strong>
                    <span className="subtle">
                      {orderReference(order)} · <Money amount={order.total} />
                    </span>
                  </div>
                  <PersistentRequirementForm orderId={order.id} />
                </div>
              ))}
            </Card>
          ) : null}
          {invoices.length ? (
            <div className="content-stack">
              {invoices.map((invoice) => (
                <Card key={invoice.invoiceId}>
                  <div className="split-heading">
                    <div>
                      <span className="card-kicker">{invoice.invoiceNumber}</span>
                      <h2>{formatIdr(invoice.totalAmount)}</h2>
                    </div>
                    <StatusBadge>{invoiceStatusLabel(invoice.status)}</StatusBadge>
                  </div>
                  <div className="summary-line">
                    <span>Pelanggan</span>
                    <strong>{invoice.customerName}</strong>
                  </div>
                  <div className="summary-line">
                    <span>Referensi pesanan</span>
                    <span>{invoice.orderCode || `BFG-ORD-LEGACY-${invoice.orderId.slice(-8).toUpperCase()}`}</span>
                  </div>
                  <div className="summary-line">
                    <span>Sisa tagihan</span>
                    <strong>{formatIdr(invoice.outstandingAmount)}</strong>
                  </div>
                  <div className="summary-line">
                    <span>Status pembayaran</span>
                    <strong>{invoicePaymentStatusLabel(invoice.paymentStatus)}</strong>
                  </div>
                  <LinkButton href={`/admin/invoices/${invoice.invoiceId}`} variant="secondary">
                    Buka operasi invoice
                  </LinkButton>
                  {invoice.status === "draft" ? <IssueInvoiceButton invoiceId={invoice.invoiceId} /> : null}
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Belum ada invoice"
              description="Buat invoice dari pesanan yang sudah tercatat saat tagihan siap diterbitkan."
            />
          )}
        </div>
      </div>
    </div>
  );
}

function AdminInvoices() {
  return <PersistentAdminInvoices />;
}

export default function AdminInvoicesPage() {
  return (
    <SiteShell>
      <ProductAccessGuard requiredRole="admin">
        <AdminInvoices />
      </ProductAccessGuard>
    </SiteShell>
  );
}
