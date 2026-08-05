"use client";

import { useState } from "react";
import { AdminNav } from "@/components/admin-nav";
import { PrototypeModeGuard } from "@/components/prototype-mode-guard";
import { Button, Card, EmptyState, Field, Money, PageHeader, StatusBadge } from "@/components/ui";
import { calculateDepositRequired, calculateLedgerBalance, formatIdr } from "@/domain/prototype/logic";
import type { DepositRequirement } from "@/domain/prototype/types";
import { usePrototype } from "@/domain/prototype/store";
import { SiteShell } from "@/components/site-shell";

function RequirementForm({ orderId }: { orderId: string }) {
  const { createInvoice } = usePrototype();
  const [kind, setKind] = useState<DepositRequirement["kind"]>("unset");
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    try {
      const requirement: DepositRequirement =
        kind === "fixed"
          ? { kind, amount: Number(amount) }
          : kind === "percentage"
            ? { kind, value: Number(amount) }
            : { kind };
      createInvoice(orderId, requirement);
      setMessage("Invoice issued.");
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Invoice could not be issued");
    }
  }

  return (
    <form className="form-actions" onSubmit={handleSubmit}>
      <label className="field">
        <span className="field-label">Deposit rule</span>
        <select
          className="select"
          value={kind}
          onChange={(event) => setKind(event.target.value as DepositRequirement["kind"])}
        >
          <option value="unset">Not set</option>
          <option value="fixed">Fixed IDR</option>
          <option value="percentage">Percentage</option>
        </select>
      </label>
      {kind !== "unset" ? (
        <Field label={kind === "fixed" ? "Amount (IDR)" : "Percent (0–100)"}>
          <input
            className="input"
            type="number"
            min="0"
            max={kind === "percentage" ? 100 : undefined}
            step="1"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            required
          />
        </Field>
      ) : null}
      <Button type="submit">Issue invoice</Button>
      {message ? (
        <span className="subtle" role="status">
          {message}
        </span>
      ) : null}
    </form>
  );
}

function InvoiceCard({ invoiceId }: { invoiceId: string }) {
  const { state, recordDeposit } = usePrototype();
  const invoice = state.invoices.find((candidate) => candidate.id === invoiceId);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  if (!invoice) return null;
  const required = calculateDepositRequired(invoice.total, invoice.depositRequirement);
  const balance = calculateLedgerBalance(invoice.transactions);

  function handleDeposit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    try {
      recordDeposit(invoiceId, "credit", Number(amount), note);
      setAmount("");
      setNote("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Ledger entry could not be recorded");
    }
  }

  return (
    <Card className="invoice-card">
      <div className="split-heading">
        <div>
          <span className="card-kicker">
            {invoice.id} · {invoice.customerName}
          </span>
          <h2>{formatIdr(invoice.total)}</h2>
        </div>
        <StatusBadge tone={balance >= required ? "positive" : "warning"}>
          {balance >= required ? "Deposit met" : "Deposit open"}
        </StatusBadge>
      </div>
      <div className="summary-line">
        <span>Requirement</span>
        <strong>{required ? formatIdr(required) : "Not set"}</strong>
      </div>
      <div className="summary-line">
        <span>Ledger balance</span>
        <strong>{formatIdr(balance)}</strong>
      </div>
      <div className="content-stack">
        {invoice.items.map((item) => (
          <div className="summary-line" key={item.id}>
            <span>
              {item.quantity} × {item.description}
            </span>
            <Money amount={item.subtotal} />
          </div>
        ))}
      </div>
      <form className="form-actions" onSubmit={handleDeposit}>
        <Field label="Record credit">
          <input
            className="input"
            type="number"
            min="1"
            step="1"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="Amount (IDR)"
            required
          />
        </Field>
        <Field label="Note">
          <input
            className="input"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Manual payment note"
            required
          />
        </Field>
        <Button type="submit">Append ledger entry</Button>
      </form>
      {error ? (
        <p className="error-text" role="alert">
          {error}
        </p>
      ) : null}
      {invoice.transactions.length ? (
        <p className="subtle">{invoice.transactions.length} append-only ledger entry recorded.</p>
      ) : (
        <p className="subtle">No payment event is seeded. Add one only when you intentionally test the flow.</p>
      )}
    </Card>
  );
}

function AdminInvoices() {
  const { state } = usePrototype();
  const ordersWithoutInvoices = state.orders.filter(
    (order) => !state.invoices.some((invoice) => invoice.orderId === order.id),
  );
  return (
    <div className="page admin-page">
      <PageHeader
        eyebrow="Invoice and deposit prototype"
        title="Make the money state explicit."
        description="Invoices use order price snapshots. Deposit records append to a ledger; historical entries are never edited in place."
      />
      <div className="admin-workspace">
        <AdminNav />
        <div className="admin-content">
          <div className="content-stack">
            {ordersWithoutInvoices.length ? (
              <Card>
                <span className="card-kicker">Orders needing invoices</span>
                <h2>Issue the next document.</h2>
                {ordersWithoutInvoices.map((order) => (
                  <div className="invoice-issue-row" key={order.id}>
                    <div>
                      <strong>{order.customerName}</strong>
                      <span className="subtle">
                        {order.id} · <Money amount={order.total} />
                      </span>
                    </div>
                    <RequirementForm orderId={order.id} />
                  </div>
                ))}
              </Card>
            ) : null}
            {state.invoices.length ? (
              state.invoices.map((invoice) => <InvoiceCard key={invoice.id} invoiceId={invoice.id} />)
            ) : (
              <EmptyState
                title="No invoices yet"
                description="Submit an order, then issue an invoice here. The prototype will not create one automatically."
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminInvoicesPage() {
  return (
    <SiteShell>
      <PrototypeModeGuard requiredRole="admin">
        <AdminInvoices />
      </PrototypeModeGuard>
    </SiteShell>
  );
}
