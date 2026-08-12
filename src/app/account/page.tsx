"use client";

import Link from "next/link";
import {
  Card,
  EmptyState,
  LinkButton,
  LoadingRegion,
  Money,
  PageHeader,
  SkeletonCard,
  StatusBadge,
} from "@/components/ui";
import { ProductAccessGuard } from "@/components/product-access-guard";
import { SiteShell } from "@/components/site-shell";
import { customerActivity, outstandingRefundObligation } from "@/domain/customer-activity";
import { orderStatusLabels } from "@/domain/prototype/logic";
import { invoicePaymentStatusLabel } from "@/domain/prototype/operations";
import { useOperations } from "@/domain/prototype/operations-context";
import { useProduct } from "@/domain/prototype/store";

function AccountDashboard() {
  const { state, ordersLoading } = useProduct();
  const { customerInvoiceList, customerAccount, customerTransactions, customerExceptionList } = useOperations();
  if (ordersLoading || !customerInvoiceList || !customerAccount || !customerTransactions || !customerExceptionList) {
    return (
      <div className="page account-dashboard">
        <PageHeader
          eyebrow="Akun Blessfriends"
          title="Semua yang perlu kamu ikuti, dalam satu tempat."
          description="Menyiapkan ringkasan pesanan, invoice, deposit, dan aktivitasmu."
        />
        <LoadingRegion label="Memuat ringkasan akun">
          <SkeletonCard variant="account" />
          <SkeletonCard variant="account" />
          <SkeletonCard variant="account" />
        </LoadingRegion>
      </div>
    );
  }

  const invoices = customerInvoiceList.page;
  const exceptions = customerExceptionList.page;
  const activeOrders = state.orders.filter((order) => !["completed", "cancelled"].includes(order.status));
  const openInvoices = invoices.filter((invoice) => invoice.status === "issued" && invoice.outstandingAmount > 0);
  const activeExceptions = exceptions.filter((item) => item.status !== "resolved" && item.status !== "rejected");
  const refundDue = outstandingRefundObligation(invoices);
  const attentionCount =
    openInvoices.length +
    activeExceptions.length +
    state.orders.filter((order) => order.status === "awaiting_address" || order.status === "awaiting_payment").length;
  const activity = customerActivity(state.orders, invoices, customerTransactions.page, exceptions);
  const deposit = customerAccount.account;

  return (
    <div className="page account-dashboard">
      <PageHeader
        eyebrow="Akun Blessfriends"
        title="Semua yang perlu kamu ikuti, dalam satu tempat."
        description="Cek pesanan, perjalanan batch, invoice, deposit, dan pembaruan masalah tanpa mencari ulang di chat."
        actions={<LinkButton href="/catalog">Buka Secret Catalog</LinkButton>}
      />

      <section className="account-metrics" aria-label="Ringkasan akun">
        <Card className="metric">
          <span className="card-kicker">Perlu perhatian</span>
          <strong className="metric-value">{attentionCount}</strong>
          <p>Invoice, alamat, pembayaran, atau masalah aktif.</p>
        </Card>
        <Card className="metric">
          <span className="card-kicker">Pesanan aktif</span>
          <strong className="metric-value">{activeOrders.length}</strong>
          <p>Pesanan yang masih berjalan.</p>
        </Card>
        <Card className="metric">
          <span className="card-kicker">Deposit tersedia</span>
          <strong className="metric-value metric-money">
            {deposit ? <Money amount={deposit.availableAmount} /> : "—"}
          </strong>
          <p>
            {deposit ? (
              <>
                <Money amount={deposit.reservedAmount} /> reservasi
              </>
            ) : (
              "Belum ada akun deposit."
            )}
          </p>
        </Card>
        <Card className="metric">
          <span className="card-kicker">Kredit / refund</span>
          <strong className="metric-value metric-money">
            <Money amount={refundDue} />
          </strong>
          <p>{refundDue ? "Menunggu penyelesaian oleh admin." : "Tidak ada kewajiban aktif."}</p>
        </Card>
      </section>

      <div className="account-dashboard-grid">
        <Card>
          <div className="split-heading">
            <div>
              <span className="card-kicker">Pesanan & pengiriman</span>
              <h2>Perjalanan buku</h2>
            </div>
            <LinkButton href="/account/orders" variant="quiet">
              Lihat semua →
            </LinkButton>
          </div>
          {activeOrders.length ? (
            <div className="content-stack">
              {activeOrders.slice(0, 4).map((order) => (
                <Link className="dashboard-row" href={`/account/orders/${order.id}`} key={order.id}>
                  <span>
                    <strong>{order.items[0]?.bookTitle || "Pesanan BFG"}</strong>
                    <small>
                      {order.items.reduce((total, item) => total + item.quantity, 0)} buku · {order.id}
                    </small>
                  </span>
                  <StatusBadge>{orderStatusLabels[order.status]}</StatusBadge>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Belum ada pesanan aktif"
              description="Pesanan yang sedang diproses akan tampil di sini."
              action={<LinkButton href="/catalog">Lihat katalog</LinkButton>}
            />
          )}
        </Card>

        <Card>
          <div className="split-heading">
            <div>
              <span className="card-kicker">Invoice & pembayaran</span>
              <h2>Yang perlu diselesaikan</h2>
            </div>
            <LinkButton href="/account/invoices" variant="quiet">
              Lihat semua →
            </LinkButton>
          </div>
          {openInvoices.length ? (
            <div className="content-stack">
              {openInvoices.slice(0, 4).map((invoice) => (
                <Link className="dashboard-row" href={`/account/invoices/${invoice.invoiceId}`} key={invoice.invoiceId}>
                  <span>
                    <strong>{invoice.invoiceNumber}</strong>
                    <small>
                      Sisa <Money amount={invoice.outstandingAmount} />
                    </small>
                  </span>
                  <StatusBadge tone="warning">{invoicePaymentStatusLabel(invoice.paymentStatus)}</StatusBadge>
                </Link>
              ))}
            </div>
          ) : (
            <p className="subtle">Tidak ada invoice terbuka yang perlu diselesaikan.</p>
          )}
        </Card>

        <Card>
          <div className="split-heading">
            <div>
              <span className="card-kicker">Masalah pesanan</span>
              <h2>Status penanganan</h2>
            </div>
          </div>
          {activeExceptions.length ? (
            <div className="content-stack">
              {activeExceptions.slice(0, 4).map((exception) => (
                <Link
                  className="dashboard-row"
                  href={`/account/orders/${exception.orderId}`}
                  key={exception.exceptionId}
                >
                  <span>
                    <strong>{exception.item?.bookTitle || "Item pesanan"}</strong>
                    <small>{exception.affectedQuantity} item terdampak</small>
                  </span>
                  <StatusBadge tone="warning">
                    {exception.status === "under_review" ? "Sedang ditinjau" : "Dilaporkan"}
                  </StatusBadge>
                </Link>
              ))}
            </div>
          ) : (
            <p className="subtle">Tidak ada masalah pesanan yang sedang ditangani.</p>
          )}
        </Card>

        <Card>
          <div className="split-heading">
            <div>
              <span className="card-kicker">Aktivitas terbaru</span>
              <h2>Riwayat akun</h2>
            </div>
          </div>
          {activity.length ? (
            <ul className="activity-list">
              {activity.map((item) => (
                <li key={item.id}>
                  <Link href={item.href}>
                    <span>
                      <strong>{item.title}</strong>
                      <small>{item.detail}</small>
                    </span>
                    <time dateTime={item.at}>{new Date(item.at).toLocaleDateString("id-ID")}</time>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              title="Belum ada aktivitas"
              description="Pembaruan pesanan dan pembayaran akan tersusun di sini."
            />
          )}
        </Card>
      </div>
    </div>
  );
}

function SignedOutAccount() {
  return (
    <div className="page narrow-page account-gate-page">
      <EmptyState
        eyebrow="Akun Blessfriend"
        title="Masuk untuk melihat perjalananmu."
        description="Lihat pesanan, tagihan, alamat, dan aktivitasmu dari satu tempat."
        mascotVariant="default"
        primaryAction={<LinkButton href="/sign-in?redirect_url=/account">Masuk</LinkButton>}
        secondaryAction={
          <LinkButton href="/join" variant="secondary">
            Join Blessfriends
          </LinkButton>
        }
      />
    </div>
  );
}

export default function AccountPage() {
  return (
    <SiteShell>
      <ProductAccessGuard requiredRole="customer" signedOutContent={<SignedOutAccount />}>
        <AccountDashboard />
      </ProductAccessGuard>
    </SiteShell>
  );
}
