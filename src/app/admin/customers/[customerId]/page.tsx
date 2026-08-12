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
import { invoicePaymentStatusLabel } from "@/domain/prototype/operations";
import { useOperations } from "@/domain/prototype/operations-context";
import { orderStatusLabels } from "@/domain/prototype/logic";
import { useProduct } from "@/domain/prototype/store";

function CustomerDetail() {
  const customerId = String(useParams<{ customerId: string }>().customerId);
  const { state, dataSource } = useProduct();
  const { adminInvoiceList } = useOperations();
  const profile = useQuery(
    api.customerProfiles.getForAdmin,
    dataSource === "convex" ? { userId: customerId as Id<"appUsers"> } : "skip",
  );
  const addresses = useQuery(
    api.customerAddresses.listForAdmin,
    dataSource === "convex" ? { userId: customerId as Id<"appUsers"> } : "skip",
  );
  const exceptions = useQuery(api.orderExceptions.listForAdmin, dataSource === "convex" ? {} : "skip");
  const orders = state.orders.filter((order) => order.customerUserId === customerId);
  const invoices = (adminInvoiceList?.page || []).filter((invoice) => String(invoice.customerUserId) === customerId);
  const customerExceptions = exceptions?.filter((exception) => String(exception.customerUserId) === customerId) || [];

  if (profile === undefined || addresses === undefined || !adminInvoiceList || exceptions === undefined) {
    return (
      <LoadingRegion label="Memuat detail customer">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </LoadingRegion>
    );
  }
  const name = profile?.displayName || orders[0]?.customerName || "Customer BFG";
  return (
    <div className="page admin-page">
      <PageHeader
        eyebrow="Detail customer"
        title={name}
        description="Profil, alamat, pesanan, invoice, dan masalah customer dari sumber operasional yang sama."
        actions={
          <LinkButton href="/admin/customers" variant="secondary">
            Kembali
          </LinkButton>
        }
      />
      <div className="admin-workspace">
        <AdminNav />
        <div className="admin-content">
          <div className="two-column">
            <Card>
              <span className="card-kicker">Kontak</span>
              <h2>{name}</h2>
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
              orders.map((order) => (
                <div className="summary-line" key={order.id}>
                  <span>
                    <LinkButton href={`/admin/orders/${order.id}`} variant="quiet">
                      {order.id}
                    </LinkButton>
                    <br />
                    <small>{orderStatusLabels[order.status]}</small>
                  </span>
                  <Money amount={order.total} />
                </div>
              ))
            ) : (
              <EmptyState title="Belum ada pesanan" description="Pesanan customer akan tampil di sini." />
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
                    <LinkButton href={`/admin/invoices/${invoice.invoiceId}`} variant="quiet">
                      {invoice.invoiceNumber}
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
