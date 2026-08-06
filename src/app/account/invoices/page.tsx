"use client";

import { Card, EmptyState, LinkButton, Money, PageHeader, StatusBadge } from "@/components/ui";
import { calculateDepositRequired, calculateLedgerBalance, formatIdr } from "@/domain/prototype/logic";
import { invoiceStatusLabel } from "@/domain/prototype/operations";
import { useOperations } from "@/domain/prototype/operations-context";
import { usePrototype } from "@/domain/prototype/store";
import { PrototypeModeGuard } from "@/components/prototype-mode-guard";
import { SiteShell } from "@/components/site-shell";

function PersistentCustomerInvoices() {
  const { customerInvoiceList } = useOperations();
  const invoices = customerInvoiceList?.page || [];
  if (!customerInvoiceList) return <div className="state-panel">Loading persistent invoices…</div>;
  return (
    <div className="page narrow-page">
      <PageHeader
        eyebrow="Invoice status"
        title="Know what is due, without guessing."
        description="Invoices use immutable order-item snapshots. Deposit allocations and outstanding amounts update from Convex Preview."
        actions={
          <LinkButton href="/account/orders" variant="secondary">
            View order status
          </LinkButton>
        }
      />
      {invoices.length === 0 ? (
        <EmptyState
          title="No invoices yet"
          description="Your invoice will appear here after an admin creates it for a recorded order."
          action={<LinkButton href="/catalog">Browse a catalog</LinkButton>}
        />
      ) : (
        <div className="content-stack">
          {invoices.map((invoice) => (
            <Card key={invoice.invoiceId}>
              <div className="split-heading">
                <div>
                  <span className="card-kicker">{invoice.invoiceNumber}</span>
                  <h2>{formatIdr(invoice.totalAmount)}</h2>
                </div>
                <StatusBadge tone={invoice.status === "issued" ? "positive" : "warning"}>
                  {invoiceStatusLabel(invoice.status)}
                </StatusBadge>
              </div>
              {invoice.items.map((item) => (
                <div className="summary-line" key={item.invoiceItemId}>
                  <span>
                    {item.quantity} × {item.description}
                  </span>
                  <Money amount={item.subtotalAmount} />
                </div>
              ))}
              <div className="summary-line">
                <span>Deposit requirement</span>
                <strong>{formatIdr(invoice.depositRequiredAmount)}</strong>
              </div>
              <div className="summary-line">
                <span>Allocated deposit · outstanding</span>
                <strong>
                  {formatIdr(invoice.allocatedDepositAmount)} · {formatIdr(invoice.outstandingAmount)}
                </strong>
              </div>
              <LinkButton href={`/account/invoices/${invoice.invoiceId}`} variant="secondary">
                Open invoice and ledger
              </LinkButton>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function LegacyCustomerInvoices() {
  const { state } = usePrototype();
  return (
    <div className="page narrow-page">
      <PageHeader
        eyebrow="Invoice status"
        title="Know what is due, without guessing."
        description="Invoice totals come from recorded order snapshots. Deposit requirements remain unset until an admin intentionally defines them."
        actions={
          <LinkButton href="/account/orders" variant="secondary">
            View order status
          </LinkButton>
        }
      />
      {state.invoices.length === 0 ? (
        <EmptyState
          title="No invoices yet"
          description="Your invoice will appear here after an admin issues it for a recorded order."
          action={<LinkButton href="/catalog">Browse a catalog</LinkButton>}
        />
      ) : (
        <div className="content-stack">
          {state.invoices.map((invoice) => {
            const required = calculateDepositRequired(invoice.total, invoice.depositRequirement);
            const balance = calculateLedgerBalance(invoice.transactions);
            return (
              <Card key={invoice.id}>
                <div className="split-heading">
                  <div>
                    <span className="card-kicker">{invoice.id}</span>
                    <h2>{formatIdr(invoice.total)}</h2>
                  </div>
                  <StatusBadge tone={balance >= required ? "positive" : "warning"}>
                    {balance >= required ? "Deposit met" : required ? "Deposit open" : "Awaiting requirement"}
                  </StatusBadge>
                </div>
                {invoice.items.map((item) => (
                  <div className="summary-line" key={item.id}>
                    <span>
                      {item.quantity} × {item.description}
                    </span>
                    <Money amount={item.subtotal} />
                  </div>
                ))}
                <div className="summary-line">
                  <span>Deposit requirement</span>
                  <strong>{required ? formatIdr(required) : "Not set"}</strong>
                </div>
                <div className="summary-line">
                  <span>Recorded ledger balance</span>
                  <strong>{formatIdr(balance)}</strong>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CustomerInvoices() {
  const { dataSource } = usePrototype();
  return dataSource === "convex" ? <PersistentCustomerInvoices /> : <LegacyCustomerInvoices />;
}

export default function CustomerInvoicesPage() {
  return (
    <SiteShell>
      <PrototypeModeGuard>
        <CustomerInvoices />
      </PrototypeModeGuard>
    </SiteShell>
  );
}
