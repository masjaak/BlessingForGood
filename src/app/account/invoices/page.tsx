"use client";

import { Card, EmptyState, LinkButton, Money, PageHeader, StatusBadge } from "@/components/ui";
import { calculateDepositRequired, calculateLedgerBalance, formatIdr } from "@/domain/prototype/logic";
import { usePrototype } from "@/domain/prototype/store";
import { PrototypeModeGuard } from "@/components/prototype-mode-guard";
import { SiteShell } from "@/components/site-shell";

function CustomerInvoices() {
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

export default function CustomerInvoicesPage() {
  return (
    <SiteShell>
      <PrototypeModeGuard>
        <CustomerInvoices />
      </PrototypeModeGuard>
    </SiteShell>
  );
}
