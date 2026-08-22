"use client";

import { useMutation, useQuery } from "convex/react";
import { useRef, useState } from "react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { AdminNav } from "@/components/admin-nav";
import { BFGSelect } from "@/components/bfg-select";
import { ProductAccessGuard } from "@/components/product-access-guard";
import {
  Button,
  Card,
  EmptyState,
  Field,
  LinkButton,
  LoadingRegion,
  Money,
  PageHeader,
  SkeletonTable,
  StatusBadge,
} from "@/components/ui";
import { nextOrderStatuses, orderStatusLabels } from "@/domain/prototype/logic";
import type { OrderStatus } from "@/domain/prototype/types";
import { orderReference } from "@/domain/prototype/order-reference";
import { useProduct } from "@/domain/prototype/store";
import { SiteShell } from "@/components/site-shell";

function OrderTable() {
  const { state, updateOrderStatus, dataSource, ordersLoading } = useProduct();
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "">("");
  if (ordersLoading) {
    return (
      <LoadingRegion label="Memuat pesanan">
        <SkeletonTable rows={6} />
      </LoadingRegion>
    );
  }
  if (state.orders.length === 0)
    return (
      <EmptyState
        title="Belum ada pesanan untuk ditinjau"
        description="Pesanan pelanggan akan tampil di sini bersama snapshot harga dan item saat dibuat."
        action={
          <LinkButton href="/catalog" variant="secondary">
            Lihat sisi pelanggan
          </LinkButton>
        }
      />
    );
  const rows = state.orders.filter((order) => {
    if (statusFilter && order.status !== statusFilter) return false;
    const needle = search.trim().toLowerCase();
    return (
      !needle ||
      [
        orderReference(order),
        order.id,
        order.customerName,
        order.customerEmail,
        ...order.items.map((item) => item.bookTitle),
      ]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(needle))
    );
  });
  return (
    <div className="content-stack">
      <Card className="admin-book-filters">
        <Field label="Cari">
          <input
            className="input"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Pelanggan, pesanan, atau buku"
          />
        </Field>
        <Field label="Status">
          <BFGSelect
            className="select"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as OrderStatus | "")}
          >
            <option value="">Semua</option>
            <option value="submitted">Masuk</option>
            <option value="cancelled">Dibatalkan</option>
            <option value="completed">Selesai</option>
          </BFGSelect>
        </Field>
      </Card>
      {rows.length ? (
        <div className="table-wrap">
          <table className="data-table">
            <caption className="sr-only">Daftar pesanan</caption>
            <thead>
              <tr>
                <th>Pelanggan</th>
                <th>Sumber</th>
                <th>Item</th>
                <th>Total</th>
                <th>Tahap</th>
                <th>Tindakan berikutnya</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((order) => {
                const reference = orderReference(order);
                const statuses: OrderStatus[] =
                  dataSource === "convex"
                    ? order.status === "submitted"
                      ? ["completed"]
                      : []
                    : nextOrderStatuses(order.status);
                return (
                  <tr key={order.id}>
                    <td>
                      <strong>{order.customerName}</strong>
                      <br />
                      <span className="subtle">{order.customerEmail || "Tidak ada email"}</span>
                      <br />
                      <span className="subtle">{reference}</span>
                      <br />
                      <LinkButton href={`/admin/orders/${order.id}`} variant="secondary">
                        Detail operasional
                      </LinkButton>
                    </td>
                    <td>
                      {order.source === "admin_assisted"
                        ? "Dibantu Admin"
                        : order.source === "ready_stock"
                          ? "Ready Stock"
                          : "Mandiri pelanggan"}
                    </td>
                    <td>
                      {order.items.map((item) => (
                        <div key={item.id}>
                          {item.quantity} × {item.bookTitle} ({item.format})
                        </div>
                      ))}
                    </td>
                    <td>
                      <Money amount={order.total} />
                    </td>
                    <td>
                      <StatusBadge>{orderStatusLabels[order.status]}</StatusBadge>
                      <br />
                      <span className="subtle">Diperbarui {new Date(order.updatedAt).toLocaleString("id-ID")}</span>
                    </td>
                    <td>
                      {statuses.length ? (
                        <BFGSelect
                          className="select"
                          aria-label={`Update status for ${reference}`}
                          defaultValue=""
                          disabled={pendingOrderId !== null}
                          onChange={async (event) => {
                            const next = event.target.value as OrderStatus;
                            if (!next) return;
                            setPendingOrderId(order.id);
                            try {
                              await updateOrderStatus(order.id, next);
                            } finally {
                              setPendingOrderId(null);
                            }
                          }}
                        >
                          <option value="">Pilih tahap…</option>
                          {statuses.map((status) => (
                            <option value={status} key={status}>
                              {orderStatusLabels[status]}
                            </option>
                          ))}
                        </BFGSelect>
                      ) : (
                        <span className="subtle">Tidak ada tahap berikutnya</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState
          title="Tidak ada pesanan yang cocok"
          description="Ubah pencarian atau filter status."
          mascotVariant={false}
        />
      )}
    </div>
  );
}

function ConvexAssistedOrderForm() {
  const { state } = useProduct();
  const customers = useQuery(api.orders.listEligibleCustomers, {});
  const createAssisted = useMutation(api.orders.createAssisted);
  const [customerId, setCustomerId] = useState("");
  const [catalogId, setCatalogId] = useState("");
  const [variantId, setVariantId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submissionKeyRef = useRef<string | null>(null);
  const catalogs = state.catalogs.filter((candidate) => candidate.status === "open");
  const catalog = catalogs.find((candidate) => candidate.id === catalogId);
  const variants =
    catalog?.books.flatMap((book) => book.variants.map((variant) => ({ ...variant, bookTitle: book.title }))) || [];
  const selectedVariant = variants.find((variant) => variant.id === variantId);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setMessage("");
    setSubmitting(true);
    try {
      const submissionKey = submissionKeyRef.current || crypto.randomUUID();
      submissionKeyRef.current = submissionKey;
      await createAssisted({
        customerUserId: customerId as Id<"appUsers">,
        catalogId: catalogId as Id<"secretCatalogs">,
        submissionKey,
        items: [{ variantId: variantId as Id<"bookVariants">, quantity: Number(quantity) }],
      });
      setCustomerId("");
      setCatalogId("");
      setVariantId("");
      setQuantity("1");
      submissionKeyRef.current = null;
      setMessage("Pesanan berbantuan Admin tercatat di alur pesanan kanonik.");
    } catch {
      setMessage("Pesanan berbantuan tidak dapat dicatat.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <span className="card-kicker">Operasi pelanggan oleh Admin</span>
      <h2>Catat pesanan berbantuan</h2>
      <p className="subtle">
        Pilih pelanggan BFG aktif yang sudah ada. Server menentukan snapshot pelanggan dan harga.
      </p>
      {customers === undefined ? <div className="state-panel">Memuat pelanggan yang memenuhi syarat…</div> : null}
      {customers && customers.length > 0 && catalogs.length > 0 ? (
        <form className="form-card" onSubmit={submit}>
          <div className="form-grid">
            <label className="field">
              <span className="field-label">Pelanggan</span>
              <BFGSelect
                className="select"
                value={customerId}
                onChange={(event) => setCustomerId(event.target.value)}
                required
              >
                <option value="">Pilih pelanggan…</option>
                {customers.map((customer) => (
                  <option value={customer.customerUserId} key={customer.customerUserId}>
                    {customer.displayName}
                  </option>
                ))}
              </BFGSelect>
            </label>
            <label className="field">
              <span className="field-label">Katalog</span>
              <BFGSelect
                className="select"
                value={catalogId}
                onChange={(event) => {
                  setCatalogId(event.target.value);
                  setVariantId("");
                }}
                required
              >
                <option value="">Pilih katalog terbuka…</option>
                {catalogs.map((catalogOption) => (
                  <option value={catalogOption.id} key={catalogOption.id}>
                    {catalogOption.name}
                  </option>
                ))}
              </BFGSelect>
            </label>
          </div>
          <div className="form-grid">
            <label className="field">
              <span className="field-label">Buku / varian</span>
              <BFGSelect
                className="select"
                value={variantId}
                onChange={(event) => setVariantId(event.target.value)}
                required
              >
                <option value="">Pilih varian…</option>
                {variants.map((variant) => (
                  <option value={variant.id} key={variant.id}>
                    {variant.bookTitle} · {variant.format} · {variant.isbn}
                  </option>
                ))}
              </BFGSelect>
            </label>
            <label className="field">
              <span className="field-label">Jumlah</span>
              <input
                className="input"
                type="number"
                min="1"
                max="1000"
                step="1"
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                required
              />
            </label>
          </div>
          <div className="form-actions">
            <span className="subtle">
              Harga server: {selectedVariant ? `IDR ${selectedVariant.price.toLocaleString("id-ID")}` : "pilih varian"}
            </span>
            <Button type="submit" loading={submitting} loadingLabel="Mencatat…">
              Catat pesanan berbantuan
            </Button>
          </div>
          {message ? (
            <span className="subtle" role="status">
              {message}
            </span>
          ) : null}
        </form>
      ) : customers !== undefined ? (
        <p className="subtle">Pelanggan aktif dan katalog terbuka diperlukan.</p>
      ) : null}
    </Card>
  );
}

function OrderTimeline({ orderId }: { orderId: string }) {
  const { state } = useProduct();
  const order = state.orders.find((candidate) => candidate.id === orderId);
  if (!order) return null;
  return (
    <Card>
      <div className="split-heading">
        <div>
          <span className="card-kicker">{orderReference(order)}</span>
          <h2>{order.customerName}</h2>
        </div>
        <StatusBadge>{orderStatusLabels[order.status]}</StatusBadge>
      </div>
      <div className="content-stack">
        {order.items.map((item) => (
          <div className="summary-line" key={item.id}>
            <span>
              {item.quantity} × {item.bookTitle} · {item.format}
            </span>
            <Money amount={item.subtotal} />
          </div>
        ))}
      </div>
      <ul className="timeline">
        {order.statusHistory.map((event) => (
          <li key={`${event.status}-${event.at}`}>
            <span className="timeline-dot" aria-hidden="true" />
            <div>
              <strong>{orderStatusLabels[event.status]}</strong>
              <time dateTime={event.at}>{new Date(event.at).toLocaleString("en-GB")}</time>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function AdminOrders() {
  const { state, dataSource } = useProduct();
  return (
    <div className="page admin-page">
      <PageHeader
        eyebrow="Operasi pesanan"
        title="Tinjau pesanan, lalu lanjutkan tahapnya."
        description="Perubahan status, pesanan berbantuan, dan tautan batch mengikuti alur pesanan Convex kanonik."
        actions={
          <div className="form-actions">
            <span className="subtle order-count">{state.orders.length} tercatat</span>
            {dataSource === "convex" ? <BackfillOrderReferences /> : null}
          </div>
        }
      />
      <div className="admin-workspace">
        <AdminNav />
        <div className="admin-content">
          {dataSource === "convex" ? <ConvexAssistedOrderForm /> : null}
          <OrderTable />
          {state.orders[0] ? <OrderTimeline orderId={state.orders[0].id} /> : null}
        </div>
      </div>
    </div>
  );
}

function BackfillOrderReferences() {
  const backfill = useMutation(api.orders.backfillOrderCodes);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  return (
    <span className="form-actions">
      <Button
        type="button"
        variant="tertiary"
        loading={pending}
        loadingLabel="Melengkapi…"
        onClick={async () => {
          setPending(true);
          setMessage("");
          try {
            const result = await backfill({ limit: 2000 });
            setMessage(`${result.updated} referensi dilengkapi.`);
          } catch {
            setMessage("Referensi belum dapat dilengkapi.");
          } finally {
            setPending(false);
          }
        }}
      >
        Lengkapi referensi order
      </Button>
      {message ? (
        <span className="subtle" role="status">
          {message}
        </span>
      ) : null}
    </span>
  );
}

export default function AdminOrdersPage() {
  return (
    <SiteShell>
      <ProductAccessGuard requiredRole="admin">
        <AdminOrders />
      </ProductAccessGuard>
    </SiteShell>
  );
}
