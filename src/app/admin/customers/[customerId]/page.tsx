"use client";

import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { AdminNav } from "@/components/admin-nav";
import { ProductAccessGuard } from "@/components/product-access-guard";
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
import { SiteShell } from "@/components/site-shell";
import { orderReference } from "@/domain/prototype/order-reference";
import { invoicePaymentStatusLabel } from "@/domain/prototype/operations";
import { useOperations } from "@/domain/prototype/operations-context";
import { orderStatusLabels } from "@/domain/prototype/logic";
import { useProduct } from "@/domain/prototype/store";
import { invoiceReference } from "@/domain/prototype/invoice-reference";

function CustomerDetail() {
  const customerId = String(useParams<{ customerId: string }>().customerId);
  const { state, dataSource } = useProduct();
  const { adminInvoiceList } = useOperations();
  const user = useQuery(
    api.users.getForAdmin,
    dataSource === "convex" ? { userId: customerId as Id<"appUsers"> } : "skip",
  );
  const profile = useQuery(
    api.customerProfiles.getForAdmin,
    dataSource === "convex" ? { userId: customerId as Id<"appUsers"> } : "skip",
  );
  const addresses = useQuery(
    api.customerAddresses.listForAdmin,
    dataSource === "convex" ? { userId: customerId as Id<"appUsers"> } : "skip",
  );
  const exceptions = useQuery(
    api.orderExceptions.listForAdmin,
    dataSource === "convex" ? { paginationOpts: { numItems: 100, cursor: null } } : "skip",
  );
  const orders = state.orders.filter((order) => order.customerUserId === customerId);
  const invoices = (adminInvoiceList?.page || []).filter((invoice) => String(invoice.customerUserId) === customerId);
  const customerExceptions = (Array.isArray(exceptions) ? exceptions : exceptions?.page || []).filter(
    (exception) => String(exception.customerUserId) === customerId,
  );

  if (
    profile === undefined ||
    user === undefined ||
    addresses === undefined ||
    !adminInvoiceList ||
    exceptions === undefined
  ) {
    return (
      <LoadingRegion label="Memuat detail pelanggan">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </LoadingRegion>
    );
  }
  const name = profile?.displayName || user.displayNameSnapshot || orders[0]?.customerName || "Pelanggan BFG";
  return (
    <div className="page admin-page">
      <PageHeader
        eyebrow="Detail pelanggan"
        title={name}
        description="Profil, alamat, pesanan, invoice, dan masalah pelanggan dari sumber operasional yang sama."
        actions={
          <span className="form-actions">
            <LinkButton href={`/admin/invoices?customerId=${customerId}`} variant="secondary">
              Buat invoice
            </LinkButton>
            <LinkButton href={`/admin/deposits?customerId=${customerId}`} variant="secondary">
              Kelola deposit
            </LinkButton>
            <LinkButton href="/admin/customers" variant="tertiary">
              Kembali
            </LinkButton>
          </span>
        }
      />
      <div className="admin-workspace">
        <AdminNav />
        <div className="admin-content">
          <div className="two-column">
            <Card>
              <span className="card-kicker">Kontak</span>
              <h2>{name}</h2>
              <p className="subtle">ID Blessfriend: {user.memberCode || "Belum tersedia"}</p>
              <p>
                {profile?.phone || "Telepon belum diisi"}
                <br />
                {profile?.whatsappNumber || "WhatsApp belum diisi"}
              </p>
            </Card>
            <Card>
              <span className="card-kicker">Alamat</span>
              <h2>{addresses.length}</h2>
              <p>{addresses.find((address) => address.isDefault)?.label || "Belum ada alamat utama"}</p>
            </Card>
          </div>
          <Card>
            <div className="split-heading">
              <h2>Pesanan</h2>
              <StatusBadge>{orders.length}</StatusBadge>
            </div>
            {orders.length ? (
              orders.map((order) => {
                const orderInvoice = invoices.find(
                  (invoice) => invoice.orderId === order.id && invoice.status !== "void",
                );
                return (
                  <div className="summary-line" key={order.id}>
                    <span>
                      <LinkButton href={`/admin/orders/${order.id}`} variant="tertiary">
                        {orderReference(order)}
                      </LinkButton>
                      <br />
                      <small>{orderStatusLabels[order.status]}</small>
                    </span>
                    <span className="form-actions">
                      <Money amount={order.total} />
                      {orderInvoice ? (
                        <LinkButton href={`/admin/invoices/${orderInvoice.invoiceId}`} variant="tertiary">
                          Buka invoice
                        </LinkButton>
                      ) : (
                        <LinkButton href={`/admin/invoices?orderId=${order.id}`} variant="secondary">
                          Buat invoice
                        </LinkButton>
                      )}
                    </span>
                  </div>
                );
              })
            ) : (
              <EmptyState title="Belum ada pesanan" description="Pesanan pelanggan akan tampil di sini." />
            )}
          </Card>
          <Card>
            <div className="split-heading">
              <h2>Invoice</h2>
              <StatusBadge>{invoices.length}</StatusBadge>
            </div>
            {invoices.length ? (
              invoices.map((invoice) => (
                <div className="summary-line" key={invoice.invoiceId}>
                  <span>
                    <LinkButton href={`/admin/invoices/${invoice.invoiceId}`} variant="tertiary">
                      {invoiceReference(invoice.invoiceNumber)}
                    </LinkButton>
                    <br />
                    <small>{invoicePaymentStatusLabel(invoice.paymentStatus)}</small>
                  </span>
                  <Money amount={invoice.adjustedTotalAmount} />
                </div>
              ))
            ) : (
              <p className="subtle">Belum ada invoice.</p>
            )}
          </Card>
          <Card>
            <div className="split-heading">
              <h2>Masalah pesanan</h2>
              <StatusBadge tone={customerExceptions.length ? "warning" : "positive"}>
                {customerExceptions.length}
              </StatusBadge>
            </div>
            {customerExceptions.length ? (
              customerExceptions.map((exception) => (
                <div className="summary-line" key={exception.exceptionId}>
                  <span>{exception.item?.bookTitle || "Item pesanan"}</span>
                  <StatusBadge>{exception.status}</StatusBadge>
                </div>
              ))
            ) : (
              <p className="subtle">Tidak ada masalah pesanan tercatat.</p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function AdminCustomerDetailPage() {
  return (
    <SiteShell>
      <ProductAccessGuard requiredRole="admin">
        <CustomerDetail />
      </ProductAccessGuard>
    </SiteShell>
  );
}
