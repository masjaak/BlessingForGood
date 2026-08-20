"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Card, EmptyState, LinkButton, Money, PageHeader, StatusBadge } from "@/components/ui";
import { PageAwareSkeleton } from "@/components/page-aware-skeleton";
import { ProductAccessGuard } from "@/components/product-access-guard";
import { SiteShell } from "@/components/site-shell";
import { customerActivity, outstandingRefundObligation } from "@/domain/customer-activity";
import { orderStatusLabels } from "@/domain/prototype/logic";
import { orderReference } from "@/domain/prototype/order-reference";
import { invoicePaymentStatusLabel } from "@/domain/prototype/operations";
import { useOperations } from "@/domain/prototype/operations-context";
import { useProduct } from "@/domain/prototype/store";
import { ActivityIcon, InboxIcon, useWorkspaceActivity } from "@/components/workspace-actions";

function AccountActivityRow({
  description,
  href,
  icon,
  label,
  unread,
}: {
  description: string;
  href: string;
  icon: ReactNode;
  label: string;
  unread?: number;
}) {
  return (
    <Link className="dashboard-row account-activity-row" href={href}>
      <span className="account-activity-row-main">
        <span className="account-activity-icon" aria-hidden="true">
          {icon}
        </span>
        <span>
          <strong>{label}</strong>
          <small>{description}</small>
        </span>
      </span>
      <span className="account-activity-row-end">
        {unread ? <span className="account-activity-count">{unread > 99 ? "99+" : unread} baru</span> : null}
        <span aria-hidden="true">→</span>
      </span>
    </Link>
  );
}

function AccountNavigation() {
  const { inbox, notifications } = useWorkspaceActivity();

  return (
    <Card className="account-navigation-card">
      <section className="account-navigation-section">
        <div className="split-heading">
          <div>
            <span className="card-kicker">AKTIVITAS</span>
            <h2>Notifikasi & pesan</h2>
          </div>
        </div>
        <div className="content-stack">
          <AccountActivityRow
            description="Pembaruan pesanan, tagihan, dan akun"
            href="/account/notifications"
            icon={<ActivityIcon />}
            label="Notifikasi"
            unread={notifications}
          />
          <AccountActivityRow
            description="Pesan masuk dari tim Blessing For Goods"
            href="/account/inbox"
            icon={<InboxIcon />}
            label="Kotak Masuk"
            unread={inbox}
          />
        </div>
      </section>
      <section className="account-navigation-section">
        <div className="split-heading">
          <div>
            <span className="card-kicker">AKUN</span>
            <h2>Profil & alamat</h2>
          </div>
        </div>
        <div className="content-stack">
          <Link className="dashboard-row" href="/account/profile">
            <span>
              <strong>Profil</strong>
              <small>Nama dan informasi kontak</small>
            </span>
            <span aria-hidden="true">→</span>
          </Link>
          <Link className="dashboard-row" href="/account/addresses">
            <span>
              <strong>Alamat pengiriman</strong>
              <small>Kelola alamat untuk pesananmu</small>
            </span>
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </section>
    </Card>
  );
}

function AccountDashboard() {
  const { state, ordersLoading } = useProduct();
  const { customerInvoiceList, customerAccount, customerTransactions, customerExceptionList } = useOperations();
  if (ordersLoading || !customerInvoiceList || !customerAccount || !customerTransactions || !customerExceptionList) {
    return <PageAwareSkeleton workspace="customer" pathname="/account" />;
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
          <LinkButton href="/account/deposit" variant="quiet">
            Top-up & riwayat →
          </LinkButton>
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
              <span className="card-kicker">Batch PO</span>
              <h2>Perjalanan batch</h2>
            </div>
            <LinkButton href="/account/batches" variant="quiet">
              Lihat batch →
            </LinkButton>
          </div>
          <p className="subtle">Lihat roster buku dan status konsolidasi yang disinkronkan oleh Admin.</p>
        </Card>
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
                      {order.items.reduce((total, item) => total + item.quantity, 0)} buku · {orderReference(order)}
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

        <AccountNavigation />
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
            Gabung Blessfriends
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
