"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { AdminNav } from "@/components/admin-nav";
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
        setMessage("Invoice issued.");
      } else {
        setMessage("Invoice draft saved.");
      }
      setValue("");
    } catch (reason) {
      setMessage(
        invoiceId
          ? "Draft saved, but the invoice is not issued yet. Open invoice operations to retry."
          : reason instanceof Error
            ? reason.message
            : "Invoice could not be created",
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
        <span className="field-label">Deposit rule</span>
        <select
          className="select"
          value={mode}
          onChange={(event) => setMode(event.target.value as InvoiceRequirementMode)}
        >
          <option value="none">None</option>
          <option value="fixed">Fixed IDR</option>
          <option value="percentage">Percentage basis points</option>
        </select>
      </label>
      {mode !== "none" ? (
        <Field label={mode === "fixed" ? "Amount (IDR)" : "Basis points (0–10000)"}>
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
        pending={pendingAction === "draft"}
        disabled={pendingAction !== null}
        pendingLabel="Saving…"
      >
        Save draft
      </Button>
      <Button
        type="button"
        variant="secondary"
        pending={pendingAction === "issue"}
        disabled={pendingAction !== null}
        pendingLabel="Issuing…"
        onClick={() => void saveInvoice(true)}
      >
        Issue invoice
      </Button>
      {createdInvoiceId ? (
        <LinkButton href={`/admin/invoices/${createdInvoiceId}`} variant="quiet">
          Open invoice operations
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
      setMessage("Issued.");
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Invoice could not be issued");
    } finally {
      setIsIssuing(false);
    }
  }

  return (
    <span className="form-actions">
      <Button
        type="button"
        variant="secondary"
        pending={isIssuing}
        pendingLabel="Issuing…"
        onClick={() => void issue()}
      >
        Issue invoice
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
        eyebrow="Invoice and deposit operations"
        title="Make the money state explicit."
        description="Invoices use order snapshots. Deposits use an append-only ledger; allocation, release, and reversal remain separate operations."
      />
      <div className="admin-workspace">
        <AdminNav />
        <div className="admin-content">
          {ordersWithoutInvoices.length ? (
            <Card>
              <span className="card-kicker">Orders needing invoices</span>
              <h2>Save the next draft.</h2>
              {ordersWithoutInvoices.map((order) => (
                <div className="invoice-issue-row" key={order.id}>
                  <div>
                    <strong>{order.customerName}</strong>
                    <span className="subtle">
                      {order.id} · <Money amount={order.total} />
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
                    <span>Order</span>
                    <span>{invoice.orderId}</span>
                  </div>
                  <div className="summary-line">
                    <span>Outstanding</span>
                    <strong>{formatIdr(invoice.outstandingAmount)}</strong>
                  </div>
                  <div className="summary-line">
                    <span>Payment state</span>
                    <strong>{invoicePaymentStatusLabel(invoice.paymentStatus)}</strong>
                  </div>
                  <LinkButton href={`/admin/invoices/${invoice.invoiceId}`} variant="secondary">
                    Open invoice operations
                  </LinkButton>
                  {invoice.status === "draft" ? <IssueInvoiceButton invoiceId={invoice.invoiceId} /> : null}
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No invoices yet"
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
