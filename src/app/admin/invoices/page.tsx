"use client";

import { useState } from "react";
import { AdminNav } from "@/components/admin-nav";
import { ProductAccessGuard } from "@/components/product-access-guard";
import { Button, Card, EmptyState, Field, LinkButton, Money, PageHeader, StatusBadge } from "@/components/ui";
import { formatIdr } from "@/domain/prototype/logic";
import { invoicePaymentStatusLabel, invoiceStatusLabel } from "@/domain/prototype/operations";
import { useOperations, type InvoiceRequirementMode } from "@/domain/prototype/operations-context";
import { useProduct } from "@/domain/prototype/store";
import { SiteShell } from "@/components/site-shell";

function PersistentRequirementForm({ orderId }: { orderId: string }) {
  const { createInvoice } = useOperations();
  const [mode, setMode] = useState<InvoiceRequirementMode>("none");
  const [value, setValue] = useState("");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    try {
      await createInvoice(orderId, mode, mode === "none" ? undefined : Number(value));
      setValue("");
      setMessage("Draft saved.");
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Invoice could not be created");
    }
  }

  return (
    <form className="form-actions" onSubmit={handleSubmit}>
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
      <Button type="submit">Save draft</Button>
      {message ? (
        <span className="subtle" role="status">
          {message}
        </span>
      ) : null}
    </form>
  );
}

function PersistentAdminInvoices() {
  const { state } = useProduct();
  const { adminInvoiceList } = useOperations();
  const invoices = adminInvoiceList?.page || [];
  if (!adminInvoiceList) return <div className="state-panel">Menyiapkan invoice…</div>;
  const ordersWithoutInvoices = state.orders.filter(
    (order) => !invoices.some((invoice) => invoice.orderId === order.id && invoice.status !== "void"),
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
