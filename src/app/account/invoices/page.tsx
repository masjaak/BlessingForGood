"use client";

import { Card, EmptyState, LinkButton, Money, PageHeader, StatusBadge } from "@/components/ui";
import { formatIdr } from "@/domain/prototype/logic";
import { invoicePaymentStatusLabel, invoiceStatusLabel } from "@/domain/prototype/operations";
import { useOperations } from "@/domain/prototype/operations-context";
import { ProductAccessGuard } from "@/components/product-access-guard";
import { SiteShell } from "@/components/site-shell";

function PersistentCustomerInvoices() {
  const { customerInvoiceList } = useOperations();
  const invoices = customerInvoiceList?.page || [];
  if (!customerInvoiceList) return <div className="state-panel">Menyiapkan invoice…</div>;
  return (
    <div className="page narrow-page">
      <PageHeader
        eyebrow="Invoice & deposit"
        title="Lihat jumlah yang perlu diselesaikan."
        description="Invoice, alokasi deposit, pembayaran terverifikasi, dan sisa tagihan selalu ditampilkan dari catatan BFG terbaru."
        actions={
          <LinkButton href="/account/orders" variant="secondary">
            Lihat pesanan
          </LinkButton>
        }
      />
      {invoices.length === 0 ? (
        <EmptyState
          title="Belum ada invoice"
          description="Invoice akan tampil setelah admin menerbitkannya untuk pesananmu."
          action={<LinkButton href="/catalog">Lihat katalog</LinkButton>}
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
                <span>Deposit yang diperlukan</span>
                <strong>{formatIdr(invoice.depositRequiredAmount)}</strong>
              </div>
              <div className="summary-line">
                <span>Deposit teralokasi · sisa tagihan</span>
                <strong>
                  {formatIdr(invoice.allocatedDepositAmount)} · {formatIdr(invoice.outstandingAmount)}
                </strong>
              </div>
              <div className="summary-line">
                <span>Status pembayaran · terverifikasi</span>
                <strong>
                  {invoicePaymentStatusLabel(invoice.paymentStatus)} · {formatIdr(invoice.verifiedPaymentAmount)}
                </strong>
              </div>
              <LinkButton href={`/account/invoices/${invoice.invoiceId}`} variant="secondary">
                Buka invoice dan riwayat
              </LinkButton>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function CustomerInvoices() {
  return <PersistentCustomerInvoices />;
}

export default function CustomerInvoicesPage() {
  return (
    <SiteShell>
      <ProductAccessGuard requiredRole="customer">
        <CustomerInvoices />
      </ProductAccessGuard>
    </SiteShell>
  );
}
