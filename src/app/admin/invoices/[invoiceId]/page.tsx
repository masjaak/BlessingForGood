"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { AdminNav } from "@/components/admin-nav";
import { PrototypeModeGuard } from "@/components/prototype-mode-guard";
import { Button, Card, EmptyState, Field, LinkButton, Money, PageHeader, StatusBadge } from "@/components/ui";
import { invoicePaymentStatusLabel, invoiceStatusLabel } from "@/domain/prototype/operations";
import { useOperations } from "@/domain/prototype/operations-context";
import { formatIdr } from "@/domain/prototype/logic";
import { usePrototype } from "@/domain/prototype/store";
import { SiteShell } from "@/components/site-shell";

function AdminInvoiceDetail() {
  const params = useParams<{ invoiceId: string }>();
  const invoiceId = String(params.invoiceId);
  const { dataSource } = usePrototype();
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
  if (dataSource !== "convex")
    return <div className="state-panel">Persistent invoices require a configured Convex data source.</div>;
  if (currentAdminInvoice === undefined) return <div className="state-panel">Loading invoice…</div>;
  if (!currentAdminInvoice)
    return (
      <EmptyState
        title="Invoice not found"
        description="The admin session cannot access that invoice."
        action={<LinkButton href="/admin/invoices">Back to invoices</LinkButton>}
      />
    );
  const account = adminAccount?.account;

  async function run(action: () => Promise<unknown>, success: string) {
    setMessage("");
    try {
      await action();
      setMessage(success);
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Operation failed");
    }
  }

  return (
    <div className="page admin-page">
      <PageHeader
        eyebrow="Invoice operations"
        title={currentAdminInvoice.invoiceNumber}
        description={`Order ${currentAdminInvoice.orderId}`}
        actions={
          <LinkButton href="/admin/invoices" variant="secondary">
            Back to invoices
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
            {currentAdminInvoice.items.map((item) => (
              <div className="summary-line" key={item.invoiceItemId}>
                <span>
                  {item.quantity} × {item.description}
                </span>
                <Money amount={item.subtotalAmount} />
              </div>
            ))}
            <div className="summary-line">
              <span>Deposit required</span>
              <strong>{formatIdr(currentAdminInvoice.depositRequiredAmount)}</strong>
            </div>
            <div className="summary-line">
              <span>Allocated</span>
              <strong>{formatIdr(currentAdminInvoice.allocatedDepositAmount)}</strong>
            </div>
            <div className="summary-line">
              <span>Outstanding</span>
              <strong>{formatIdr(currentAdminInvoice.outstandingAmount)}</strong>
            </div>
            <div className="summary-line">
              <span>Payment state · verified</span>
              <strong>
                {invoicePaymentStatusLabel(currentAdminInvoice.paymentStatus)} ·{" "}
                {formatIdr(currentAdminInvoice.verifiedPaymentAmount)}
              </strong>
            </div>
            <LinkButton href="/admin/payments" variant="secondary">
              Review payment confirmations
            </LinkButton>
            <div className="form-actions">
              {currentAdminInvoice.status === "draft" ? (
                <Button type="button" onClick={() => void run(() => issueInvoice(invoiceId), "Invoice issued.")}>
                  Issue invoice
                </Button>
              ) : null}
              {currentAdminInvoice.status !== "void" ? (
                <Button
                  type="button"
                  variant="danger"
                  onClick={() => void run(() => voidInvoice(invoiceId), "Invoice voided.")}
                >
                  Void invoice
                </Button>
              ) : null}
            </div>
          </Card>

          <Card>
            <div className="split-heading">
              <div>
                <span className="card-kicker">Deposit account</span>
                <h2>Available and reserved</h2>
              </div>
            </div>
            <div className="summary-line">
              <span>Available</span>
              <strong>{formatIdr(account?.availableAmount || 0)}</strong>
            </div>
            <div className="summary-line">
              <span>Reserved</span>
              <strong>{formatIdr(account?.reservedAmount || 0)}</strong>
            </div>
            <CreditForm
              invoiceId={invoiceId}
              recordCredit={recordCredit}
              onDone={() => setMessage("Credit appended.")}
            />
            <AllocationForm
              invoiceId={invoiceId}
              outstanding={currentAdminInvoice.outstandingAmount}
              allocateDeposit={allocateDeposit}
              disabled={currentAdminInvoice.status === "void"}
              onDone={() => setMessage("Deposit allocated.")}
            />
          </Card>

          <Card>
            <div className="split-heading">
              <div>
                <span className="card-kicker">Allocations</span>
                <h2>Invoice reservations</h2>
              </div>
            </div>
            {!adminAllocations ? (
              <p className="subtle">Loading allocations…</p>
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
                          variant="quiet"
                          onClick={() =>
                            void run(() => releaseAllocation(allocation.allocationId), "Allocation released.")
                          }
                        >
                          Release
                        </Button>
                        <Button
                          type="button"
                          variant="quiet"
                          onClick={() =>
                            void run(() => reverseAllocation(allocation.allocationId), "Allocation reversed.")
                          }
                        >
                          Reverse
                        </Button>
                      </>
                    ) : null}
                  </span>
                </div>
              ))
            ) : (
              <p className="subtle">No allocation history.</p>
            )}
          </Card>

          <Card>
            <div className="split-heading">
              <div>
                <span className="card-kicker">Append-only ledger</span>
                <h2>Transactions</h2>
              </div>
            </div>
            {!adminTransactions ? (
              <p className="subtle">Loading ledger…</p>
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
                        variant="quiet"
                        onClick={() => {
                          if (window.confirm("Append a reversal transaction for this row?"))
                            void run(
                              () => reverseTransaction(transaction.transactionId, "admin correction"),
                              "Transaction reversed.",
                            );
                        }}
                      >
                        Reverse
                      </Button>
                    ) : transaction.reversedByTransactionId ? (
                      <span className="subtle">Reversed</span>
                    ) : null}
                  </span>
                </div>
              ))
            ) : (
              <p className="subtle">No deposit transactions recorded.</p>
            )}
          </Card>
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
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    try {
      await recordCredit(invoiceId, Number(amount), note || undefined);
      setAmount("");
      setNote("");
      onDone();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Credit failed");
    }
  }
  return (
    <form className="form-actions" onSubmit={submit}>
      <Field label="Record credit">
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
      <Field label="Note (optional)">
        <input className="input" value={note} onChange={(event) => setNote(event.target.value)} />
      </Field>
      <Button type="submit">Append credit</Button>
      {error ? (
        <span className="error-text" role="alert">
          {error}
        </span>
      ) : null}
    </form>
  );
}

function AllocationForm({
  invoiceId,
  outstanding,
  allocateDeposit,
  disabled,
  onDone,
}: {
  invoiceId: string;
  outstanding: number;
  allocateDeposit: (invoiceId: string, amount: number) => Promise<unknown>;
  disabled: boolean;
  onDone: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    try {
      await allocateDeposit(invoiceId, Number(amount));
      setAmount("");
      onDone();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Allocation failed");
    }
  }
  return (
    <form className="form-actions" onSubmit={submit}>
      <Field label={`Allocate (outstanding ${formatIdr(outstanding)})`}>
        <input
          className="input"
          type="number"
          min="1"
          max={outstanding}
          step="1"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          required
          disabled={disabled || outstanding < 1}
        />
      </Field>
      <Button type="submit" disabled={disabled || outstanding < 1}>
        Allocate deposit
      </Button>
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
      <PrototypeModeGuard requiredRole="admin">
        <AdminInvoiceDetail />
      </PrototypeModeGuard>
    </SiteShell>
  );
}
