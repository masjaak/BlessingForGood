"use client";

import { Card, EmptyState, LinkButton, Money, PageHeader, StatusBadge } from "@/components/ui";
import { PrototypeModeGuard } from "@/components/prototype-mode-guard";
import { invoiceStatusLabel } from "@/domain/prototype/operations";
import { useOperations } from "@/domain/prototype/operations-context";
import { formatIdr } from "@/domain/prototype/logic";
import { usePrototype } from "@/domain/prototype/store";
import { SiteShell } from "@/components/site-shell";

function CustomerInvoiceDetail() {
  const { dataSource } = usePrototype();
  const { currentCustomerInvoice, customerAccount, customerTransactions, customerAllocations } = useOperations();
  if (dataSource !== "convex")
    return <div className="state-panel">Persistent invoices are available in Convex Preview.</div>;
  if (currentCustomerInvoice === undefined) return <div className="state-panel">Loading invoice…</div>;
  if (!currentCustomerInvoice) {
    return (
      <EmptyState
        title="Invoice not found"
        description="This customer session cannot access that invoice, or it has not been created in Preview."
        action={<LinkButton href="/account/invoices">Back to invoices</LinkButton>}
      />
    );
  }
  const account = customerAccount?.account;
  return (
    <div className="page narrow-page">
      <PageHeader
        eyebrow="Invoice detail"
        title={currentCustomerInvoice.invoiceNumber}
        description={`Order ${currentCustomerInvoice.orderId}`}
        actions={
          <LinkButton href="/account/invoices" variant="secondary">
            Back to invoices
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
            <span>Deposit requirement</span>
            <strong>{formatIdr(currentCustomerInvoice.depositRequiredAmount)}</strong>
          </div>
          <div className="summary-line">
            <span>Allocated to invoice</span>
            <strong>{formatIdr(currentCustomerInvoice.allocatedDepositAmount)}</strong>
          </div>
          <div className="summary-line">
            <span>Outstanding</span>
            <strong>{formatIdr(currentCustomerInvoice.outstandingAmount)}</strong>
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
          <h3>Allocation history</h3>
          {customerAllocations?.length ? (
            customerAllocations.map((allocation) => (
              <div className="summary-line" key={allocation.allocationId}>
                <span>{allocation.status}</span>
                <strong>{formatIdr(allocation.amount)}</strong>
              </div>
            ))
          ) : (
            <p className="subtle">No deposit allocation is recorded for this invoice.</p>
          )}
        </Card>

        <Card>
          <div className="split-heading">
            <div>
              <span className="card-kicker">Append-only ledger</span>
              <h2>Deposit history</h2>
            </div>
          </div>
          {!customerTransactions ? (
            <p className="subtle">Loading ledger…</p>
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
            <p className="subtle">No deposit transactions are recorded.</p>
          )}
        </Card>
      </div>
    </div>
  );
}

export default function CustomerInvoiceDetailPage() {
  return (
    <SiteShell>
      <PrototypeModeGuard requiredRole="customer">
        <CustomerInvoiceDetail />
      </PrototypeModeGuard>
    </SiteShell>
  );
}
