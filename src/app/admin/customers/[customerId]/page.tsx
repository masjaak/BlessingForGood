"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { AdminNav } from "@/components/admin-nav";
import { ProductAccessGuard } from "@/components/product-access-guard";
import { Button, Card, EmptyState, Field, LinkButton, LoadingRegion, Money, PageHeader, StatusBadge } from "@/components/ui";
import { SkeletonListCard, SkeletonPanel } from "@/components/workspace-skeleton-primitives";
import { SiteShell } from "@/components/site-shell";
import { orderReference } from "@/domain/prototype/order-reference";
import { invoicePaymentStatusLabel } from "@/domain/prototype/operations";
import { useOperations } from "@/domain/prototype/operations-context";
import { orderStatusLabel } from "@/domain/prototype/logic";
import { useProduct } from "@/domain/prototype/store";
import { asOrderList, type OrderListView } from "@/domain/prototype/convex-store";
import { invoiceReference } from "@/domain/prototype/invoice-reference";
import { AdminManualPoPanel } from "@/features/manual-po/manual-po";

function AdminCustomerNameEditor({
  customerUserId,
  currentName,
}: {
  customerUserId: Id<"appUsers">;
  currentName: string;
}) {
  const updateDisplayName = useMutation(api.customerProfiles.updateDisplayNameForAdmin);
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState(currentName);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const nextName = displayName.trim();
    if (!nextName) {
      setError("Nama customer wajib diisi.");
      return;
    }
    setPending(true);
    setMessage("");
    setError("");
    try {
      await updateDisplayName({ userId: customerUserId, displayName: nextName });
      setDisplayName(nextName);
      setEditing(false);
      setMessage("Nama customer berhasil diperbarui.");
    } catch {
      setError("Nama customer belum berhasil diperbarui. Coba lagi.");
    } finally {
      setPending(false);
    }
  }

  if (!editing) {
    return (
      <div className="content-stack customer-name-admin-editor">
        <div className="form-actions">
          <Button
            type="button"
            variant="tertiary"
            size="compact"
            onClick={() => {
              setDisplayName(currentName);
              setMessage("");
              setError("");
              setEditing(true);
            }}
          >
            Edit nama customer
          </Button>
        </div>
        {message ? (
          <p className="success-banner" role="status">
            {message}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <form className="content-stack customer-name-admin-editor" onSubmit={save}>
      <Field label="Nama customer">
        <input
          className="input"
          value={displayName}
          maxLength={200}
          autoFocus
          onChange={(event) => setDisplayName(event.target.value)}
        />
      </Field>
      {error ? (
        <p className="error-text" role="alert">
          {error}
        </p>
      ) : null}
      <div className="form-actions">
        <Button type="submit" size="compact" loading={pending} loadingLabel="Menyimpan…">
          Simpan nama
        </Button>
        <Button
          type="button"
          variant="tertiary"
          size="compact"
          disabled={pending}
          onClick={() => {
            setDisplayName(currentName);
            setError("");
            setEditing(false);
          }}
        >
          Batal
        </Button>
      </div>
    </form>
  );
}

function CustomerDetail() {
  const customerId = String(useParams<{ customerId: string }>().customerId);
  const { dataSource } = useProduct();
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
  const ordersPage = useQuery(
    api.orders.listForAdmin,
    dataSource === "convex"
      ? { paginationOpts: { numItems: 100, cursor: null }, customerUserId: customerId as Id<"appUsers"> }
      : "skip",
  );
  const orders =
    ordersPage?.page
      .map((order) => asOrderList(order as OrderListView))
      .filter((order): order is NonNullable<typeof order> => Boolean(order)) || [];
  const invoices = (adminInvoiceList?.page || []).filter((invoice) => String(invoice.customerUserId) === customerId);
  const customerExceptions = (Array.isArray(exceptions) ? exceptions : exceptions?.page || []).filter(
    (exception) => String(exception.customerUserId) === customerId,
  );

  if (
    profile === undefined ||
    user === undefined ||
    addresses === undefined ||
    ordersPage === undefined ||
    !adminInvoiceList ||
    exceptions === undefined
  ) {
    return (
      <div className="page admin-page">
        <PageHeader
          eyebrow="Detail pelanggan"
          title="Detail pelanggan"
          description="Profil, alamat, pesanan, invoice, dan masalah pelanggan dari sumber operasional yang sama."
          loading
          skeleton={{ titleWidth: "60%", descriptionWidths: ["92%", "72%"], actionWidths: ["112px", "132px", "86px"] }}
        />
        <div className="admin-workspace">
          <AdminNav />
          <div className="admin-content">
            <LoadingRegion label="Memuat detail pelanggan">
              <div className="two-column customer-detail-summary-grid">
                <SkeletonPanel lines={4} />
                <SkeletonPanel lines={3} />
              </div>
              <SkeletonListCard />
              <SkeletonListCard />
              <SkeletonListCard />
            </LoadingRegion>
          </div>
        </div>
      </div>
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
              Buat invoice reguler
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
          <div className="two-column customer-detail-summary-grid">
            <Card>
              <span className="card-kicker">Kontak</span>
              <h2>{name}</h2>
              <p className="subtle">ID Blessfriend: {user.memberCode || "Belum tersedia"}</p>
              <p>
                {profile?.phone || "Telepon belum diisi"}
                <br />
                {profile?.whatsappNumber || "WhatsApp belum diisi"}
              </p>
              <AdminCustomerNameEditor
                customerUserId={customerId as Id<"appUsers">}
                currentName={name}
              />
            </Card>
            <Card>
              <span className="card-kicker">Alamat</span>
              <h2>{addresses.length}</h2>
              <p>{addresses.find((address) => address.isDefault)?.label || "Belum ada alamat utama"}</p>
            </Card>
          </div>
          <AdminManualPoPanel customerUserId={customerId as Id<"appUsers">} />
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
                      <small>{orderStatusLabel(order.status, order.cancellationPending)}</small>
                    </span>
                    <span className="form-actions">
                      <Money amount={order.total} />
                      {orderInvoice ? (
                        <LinkButton href={`/admin/invoices/${orderInvoice.invoiceId}`} variant="tertiary">
                          Buka invoice
                        </LinkButton>
                      ) : (
                        <LinkButton href={`/admin/invoices?customerId=${customerId}`} variant="secondary">
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
