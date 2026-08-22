"use client";

import { useState } from "react";
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
  StatusBadge,
} from "@/components/ui";
import { isCatalogOpen, orderStatusLabels } from "@/domain/prototype/logic";
import { useProduct } from "@/domain/prototype/store";
import { ProductAccessGuard } from "@/components/product-access-guard";
import { SiteShell } from "@/components/site-shell";
import { orderReference } from "@/domain/prototype/order-reference";

function EditOrderForm({ orderId }: { orderId: string }) {
  const { state, editOrder } = useProduct();
  const order = state.orders.find((candidate) => candidate.id === orderId);
  const catalog = order && state.catalogs.find((candidate) => candidate.id === order.catalogId);
  const [name, setName] = useState(order?.customerName || "");
  const [email, setEmail] = useState(order?.customerEmail || "");
  const [quantities, setQuantities] = useState<Record<string, number>>(() =>
    Object.fromEntries(order?.items.map((item) => [item.variantId, item.quantity]) || []),
  );
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  if (!order || !catalog || order.status !== "submitted" || !isCatalogOpen(catalog))
    return <p className="subtle">Preorder tidak dapat diubah setelah tahap pemrosesan dimulai atau katalog ditutup.</p>;
  const editableOrder = order;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsSaving(true);
    try {
      const updated = await editOrder(editableOrder.id, {
        customerName: name,
        customerEmail: email,
        items: editableOrder.items.map((item) => ({
          variantId: item.variantId,
          quantity: quantities[item.variantId] || 0,
        })),
      });
      setMessage(`Pesanan ${orderReference(updated)} diperbarui.`);
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Preorder belum dapat diperbarui");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <details className="edit-order">
      <summary>Ubah sebelum katalog ditutup</summary>
      <form className="form-card" onSubmit={handleSubmit}>
        <Field label="Nama">
          <input className="input" value={name} onChange={(event) => setName(event.target.value)} required />
        </Field>
        <Field label="Email">
          <input className="input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        </Field>
        {order.items.map((item) => (
          <Field label={`${item.bookTitle} · ${item.format}`} key={item.id}>
            <input
              className="input"
              type="number"
              min="0"
              step="1"
              value={quantities[item.variantId] || 0}
              onChange={(event) =>
                setQuantities((current) => ({ ...current, [item.variantId]: Number(event.target.value) }))
              }
            />
          </Field>
        ))}
        <Button type="submit" loading={isSaving} loadingLabel="Menyimpan…">
          Simpan perubahan
        </Button>
        {message ? (
          <span className="subtle" role="status">
            {message}
          </span>
        ) : null}
      </form>
    </details>
  );
}

function CustomerOrders() {
  const { state, ordersLoading } = useProduct();
  return (
    <div className="page narrow-page">
      <PageHeader
        eyebrow="Pesanan saya"
        title="Ikuti langkah berikutnya dengan mudah."
        description="Setiap pesanan menyimpan pilihan buku, harga, status, dan perjalanan terbaru khusus untuk akunmu."
        actions={
          <LinkButton href="/catalog" variant="secondary">
            Kembali ke katalog
          </LinkButton>
        }
      />
      {ordersLoading ? (
        <LoadingRegion label="Memuat pesanan">
          <SkeletonCard variant="order" />
          <SkeletonCard variant="order" />
        </LoadingRegion>
      ) : state.orders.length === 0 ? (
        <EmptyState
          title="Belum ada pesanan"
          description="Pesananmu akan tampil di sini setelah berhasil dicatat."
          action={<LinkButton href="/catalog">Lihat katalog</LinkButton>}
        />
      ) : (
        <div className="content-stack">
          {state.orders.map((order) => (
            <Card key={order.id}>
              <div className="split-heading">
                <div>
                  <span className="card-kicker">{orderReference(order)}</span>
                  <h2>{order.items[0]?.bookTitle || "Pesanan BFG"}</h2>
                </div>
                <StatusBadge>{orderStatusLabels[order.status]}</StatusBadge>
              </div>
              <div className="summary-line">
                <span>
                  {order.customerName} · {order.items.reduce((total, item) => total + item.quantity, 0)} item
                </span>
                <Money amount={order.total} />
              </div>
              <LinkButton href={`/account/orders/${order.id}`} variant="secondary">
                Lihat detail & pelacakan
              </LinkButton>
              <EditOrderForm orderId={order.id} />
              <ul className="timeline">
                {order.statusHistory.map((event) => (
                  <li key={`${event.status}-${event.at}`}>
                    <span className="timeline-dot" aria-hidden="true" />
                    <div>
                      <strong>{orderStatusLabels[event.status]}</strong>
                      <time dateTime={event.at}>{new Date(event.at).toLocaleString("id-ID")}</time>
                    </div>
                  </li>
                ))}
              </ul>
              <p className="subtle">Detail dan status pesanan tersimpan di akun BFG-mu.</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function SignedOutOrders() {
  return (
    <div className="page narrow-page account-gate-page">
      <EmptyState
        eyebrow="Buku Saya"
        title="Belum ada buku yang bisa ditampilkan."
        description="Masuk lewat Akun untuk melihat pesanan, perjalanan batch, dan buku milikmu."
        mascotVariant="default"
        action={<LinkButton href="/account">Ke Akun</LinkButton>}
      />
    </div>
  );
}

export default function CustomerOrdersPage() {
  return (
    <SiteShell>
      <ProductAccessGuard requiredRole="customer" signedOutContent={<SignedOutOrders />}>
        <CustomerOrders />
      </ProductAccessGuard>
    </SiteShell>
  );
}
