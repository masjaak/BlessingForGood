"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
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
  SkeletonText,
  StatusBadge,
} from "@/components/ui";
import { invoicePaymentStatusLabel, invoiceStatusLabel } from "@/domain/prototype/operations";
import { useOperations } from "@/domain/prototype/operations-context";
import { formatIdr } from "@/domain/prototype/logic";
import { useProduct } from "@/domain/prototype/store";
import { SiteShell } from "@/components/site-shell";

function AdminInvoiceDetail() {
  const params = useParams<{ invoiceId: string }>();
  const invoiceId = String(params.invoiceId);
  const { dataSource } = useProduct();
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
        title="Invoice not found"
        description="The admin session cannot access that invoice."
        action={<LinkButton href="/admin/invoices">Back to invoices</LinkButton>}
      />
    );
  const account = adminAccount?.account;

  async function run(action: () => Promise<unknown>, success: string, actionId: string) {
    setMessage("");
    setPendingAction(actionId);
    try {
      await action();
      setMessage(success);
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Operation failed");
    } finally {
      setPendingAction(null);
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
                <Button
                  type="button"
                  pending={pendingAction === "issue"}
                  pendingLabel="Issuing…"
                  onClick={() => void run(() => issueInvoice(invoiceId), "Invoice issued.", "issue")}
                >
                  Issue invoice
                </Button>
              ) : null}
              {currentAdminInvoice.status !== "void" ? (
                <Button
                  type="button"
                  variant="danger"
                  pending={pendingAction === "void"}
                  pendingLabel="Voiding…"
                  onClick={() => void run(() => voidInvoice(invoiceId), "Invoice voided.", "void")}
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
                          variant="quiet"
                          pending={pendingAction === `release-${allocation.allocationId}`}
                          pendingLabel="Releasing…"
                          onClick={() =>
                            void run(
                              () => releaseAllocation(allocation.allocationId),
                              "Allocation released.",
                              `release-${allocation.allocationId}`,
                            )
                          }
                        >
                          Release
                        </Button>
                        <Button
                          type="button"
                          variant="quiet"
                          pending={pendingAction === `reverse-${allocation.allocationId}`}
                          pendingLabel="Reversing…"
                          onClick={() =>
                            void run(
                              () => reverseAllocation(allocation.allocationId),
                              "Allocation reversed.",
                              `reverse-${allocation.allocationId}`,
                            )
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
                        variant="quiet"
                        pending={pendingAction === `transaction-${transaction.transactionId}`}
                        pendingLabel="Reversing…"
                        onClick={() => {
                          if (window.confirm("Append a reversal transaction for this row?"))
                            void run(
                              () => reverseTransaction(transaction.transactionId, "admin correction"),
                              "Transaction reversed.",
                              `transaction-${transaction.transactionId}`,
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
      setError(reason instanceof Error ? reason.message : "Credit failed");
    } finally {
      setIsSubmitting(false);
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
      <Button type="submit" pending={isSubmitting} pendingLabel="Appending…">
        Append credit
      </Button>
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      await allocateDeposit(invoiceId, Number(amount));
      setAmount("");
      onDone();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Allocation failed");
    } finally {
      setIsSubmitting(false);
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
      <Button type="submit" pending={isSubmitting} pendingLabel="Allocating…" disabled={disabled || outstanding < 1}>
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
      <ProductAccessGuard requiredRole="admin">
        <AdminInvoiceDetail />
      </ProductAccessGuard>
    </SiteShell>
  );
}
