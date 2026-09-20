"use client";

import { useMutation, useQuery } from "convex/react";
import { useEffect, useRef, useState } from "react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { AdminPagination } from "@/components/admin-pagination";
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
  Skeleton,
  StatusBadge,
} from "@/components/ui";
import { SkeletonForm, SkeletonTableBlock, SkeletonTimeline } from "@/components/workspace-skeleton-primitives";
import { nextOrderStatuses, orderStatusLabel, orderStatusLabels } from "@/domain/prototype/logic";
import type { OrderStatus } from "@/domain/prototype/types";
import { orderReference } from "@/domain/prototype/order-reference";
import { productErrorMessage } from "@/domain/prototype/errors";
import { useProduct } from "@/domain/prototype/store";
import { useAdminCursorPagination } from "@/domain/prototype/pagination";
import { asOrder, asOrderList, type OrderListView, type OrderView } from "@/domain/prototype/convex-store";
import { SiteShell } from "@/components/site-shell";
import { matchesAdminCatalogRecord, normalizeDiscoveryQuery } from "@/lib/catalog-discovery";

function OrderTable({
  onFirstOrderId,
  onLoadingChange,
}: {
  onFirstOrderId: (orderId: string | null) => void;
  onLoadingChange: (loading: boolean) => void;
}) {
  const { state, updateOrderStatus, dataSource, ordersLoading } = useProduct();
  const pagination = useAdminCursorPagination();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<Extract<OrderStatus, "submitted" | "cancelled" | "completed"> | "">(
    "",
  );
  const adminOrders = useQuery(
    api.orders.listForAdmin,
    dataSource === "convex"
      ? {
          paginationOpts: { numItems: pagination.pageSize, cursor: pagination.cursor },
          search: search.trim() || undefined,
          status: statusFilter || undefined,
        }
      : "skip",
  );
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);
  const pageOrders = Array.isArray(adminOrders)
    ? state.orders
    : adminOrders?.page
        .map((order) => asOrderList(order as OrderListView))
        .filter((order): order is NonNullable<typeof order> => Boolean(order));
  const orders = dataSource === "convex" ? pageOrders || [] : state.orders;
  const firstOrderId = orders[0]?.id || null;
  const tableLoading = ordersLoading || (dataSource === "convex" && adminOrders === undefined);
  useEffect(() => onFirstOrderId(firstOrderId), [firstOrderId, onFirstOrderId]);
  useEffect(() => onLoadingChange(tableLoading), [onLoadingChange, tableLoading]);
  if (tableLoading) {
    return (
      <LoadingRegion label="Memuat pesanan">
        <SkeletonTableBlock rows={8} columnWidths={["1.25fr", "0.8fr", "0.7fr", "0.85fr", "0.9fr", "1.1fr"]} />
      </LoadingRegion>
    );
  }
  if (orders.length === 0 && !search.trim() && !statusFilter)
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
  const rows = orders;
  return (
    <div className="content-stack">
      <Card className="admin-book-filters">
        <Field label="Cari">
          <input
            className="input"
            type="search"
            value={search}
            onChange={(event) => {
              pagination.reset();
              setSearch(event.target.value);
            }}
            placeholder="Pelanggan, pesanan, atau buku"
          />
        </Field>
        <Field label="Status">
          <BFGSelect
            className="select"
            value={statusFilter}
            onChange={(event) => {
              pagination.reset();
              setStatusFilter(event.target.value as Extract<OrderStatus, "submitted" | "cancelled" | "completed"> | "");
            }}
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
                      <span className="subtle">ID Blessfriend: {order.customerMemberCode || "belum tersedia"}</span>
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
                      <StatusBadge>{orderStatusLabel(order.status, order.cancellationPending)}</StatusBadge>
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
      {!Array.isArray(adminOrders) && adminOrders ? (
        <AdminPagination
          {...pagination}
          rowCount={rows.length}
          isDone={adminOrders.isDone}
          continueCursor={adminOrders.continueCursor}
        />
      ) : null}
    </div>
  );
}

function ConvexAssistedOrderForm() {
  const { state, catalogsLoading } = useProduct();
  const customerPagination = useAdminCursorPagination();
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerFormShown, setCustomerFormShown] = useState(false);
  const customers = useQuery(api.orders.listEligibleCustomers, {
    paginationOpts: { numItems: customerPagination.pageSize, cursor: customerPagination.cursor },
    search: customerSearch.trim() || undefined,
  });
  const readyStockRows = useQuery(api.readyStock.listForAdmin, {});
  const createAssisted = useMutation(api.orders.createAssisted);
  const [source, setSource] = useState<"preorder" | "ready_stock">("preorder");
  const [customerId, setCustomerId] = useState("");
  const [catalogId, setCatalogId] = useState("");
  const [variantId, setVariantId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [catalogSearch, setCatalogSearch] = useState("");
  const [variantSearch, setVariantSearch] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submissionKeyRef = useRef<string | null>(null);
  const selectedCatalog = useQuery(
    api.secretCatalogs.getForAdmin,
    catalogId ? { catalogId: catalogId as Id<"secretCatalogs"> } : "skip",
  );
  const customerPage = Array.isArray(customers) ? { page: customers, isDone: true, continueCursor: "" } : customers;
  const customerRows = customerPage?.page || [];
  const catalogs = state.catalogs.filter((candidate) => candidate.status === "open");
  const catalog = selectedCatalog?.view;
  const preorderVariants =
    catalog?.books.flatMap((book) =>
      book.variants.map((variant) => ({
        ...variant,
        bookTitle: book.title,
        publisher: book.publisher,
        author: book.author,
      })),
    ) || [];
  const readyStockVariants =
    readyStockRows
      ?.filter((row) => row.isAvailable && row.availableQuantity > 0)
      .map((row) => ({
        id: row.variantId,
        bookTitle: row.title,
        publisher: row.publisherName,
        author: row.author,
        format: row.format,
        isbn: row.isbn,
        price: row.priceAmount,
      })) || [];
  const variants = source === "ready_stock" ? readyStockVariants : preorderVariants;
  const productOptionsLoading = source === "preorder" ? catalogsLoading : readyStockRows === undefined;
  const selectedVariant = variants.find((variant) => variant.id === variantId);
  const normalizedCatalogSearch = normalizeDiscoveryQuery(catalogSearch);
  const filteredCatalogs = catalogs.filter(
    (candidate) => !normalizedCatalogSearch || candidate.name.toLowerCase().includes(normalizedCatalogSearch),
  );
  const normalizedVariantSearch = normalizeDiscoveryQuery(variantSearch);
  const filteredVariants = variants.filter((variant) =>
    matchesAdminCatalogRecord(
      {
        title: variant.bookTitle,
        publisher: variant.publisher,
        author: variant.author,
        isbn: variant.isbn,
      },
      normalizedVariantSearch,
    ),
  );
  const visibleCatalogs =
    catalog && !filteredCatalogs.some((candidate) => candidate.id === catalog.id)
      ? [catalog, ...filteredCatalogs]
      : filteredCatalogs;
  const visibleVariants =
    selectedVariant && !filteredVariants.some((variant) => variant.id === selectedVariant.id)
      ? [selectedVariant, ...filteredVariants]
      : filteredVariants;

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
        catalogId: source === "preorder" ? (catalogId as Id<"secretCatalogs">) : undefined,
        source,
        submissionKey,
        items: [{ variantId: variantId as Id<"bookVariants">, quantity: Number(quantity) }],
      });
      setCustomerId("");
      setCatalogId("");
      setVariantId("");
      setCatalogSearch("");
      setVariantSearch("");
      setSource("preorder");
      setQuantity("1");
      submissionKeyRef.current = null;
      setMessage("Pesanan berbantuan Admin tercatat di alur pesanan kanonik.");
    } catch (reason) {
      setMessage(productErrorMessage(reason, "Pesanan berbantuan tidak dapat dicatat."));
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
      {customers === undefined || productOptionsLoading ? (
        <LoadingRegion label="Memuat pilihan pesanan">
          <div className="workspace-skeleton-inline-order-form" aria-hidden="true">
            <Skeleton className="skeleton-field" />
            <Skeleton className="skeleton-field" />
            <Skeleton className="skeleton-field" />
            <Skeleton className="skeleton-field" />
            <Skeleton className="skeleton-cta" />
          </div>
        </LoadingRegion>
      ) : null}
      {(customerRows.length > 0 || customerFormShown) &&
      (source === "preorder"
        ? catalogs.length > 0
        : Boolean(readyStockRows?.some((row) => row.isAvailable && row.availableQuantity > 0))) ? (
        <>
          <form className="form-card" onSubmit={submit}>
            <div className="form-grid">
              <Field label="Cari pelanggan">
                <input
                  className="input"
                  type="search"
                  value={customerSearch}
                  onChange={(event) => {
                    setCustomerFormShown(true);
                    setCustomerSearch(event.target.value);
                    setCustomerId("");
                    customerPagination.reset();
                  }}
                  placeholder="Nama, potongan nama, atau nomor telepon"
                />
              </Field>
              <label className="field">
                <span className="field-label">Pelanggan</span>
                <BFGSelect
                  className="select"
                  value={customerId}
                  onChange={(event) => setCustomerId(event.target.value)}
                  required
                >
                  <option value="">Pilih pelanggan…</option>
                  {customerRows.map((customer) => (
                    <option value={customer.customerUserId} key={customer.customerUserId}>
                      {customer.displayName} ·{" "}
                      {customer.phoneLast4 ? `•••• ${customer.phoneLast4}` : customer.memberCode || "tanpa kode"}
                    </option>
                  ))}
                </BFGSelect>
                {customerSearch.trim() && customers !== undefined && !customerRows.length ? (
                  <span className="subtle" role="status">
                    Tidak ada pelanggan yang cocok.
                  </span>
                ) : null}
              </label>
              <label className="field">
                <span className="field-label">Sumber</span>
                <BFGSelect
                  className="select"
                  value={source}
                  onChange={(event) => {
                    setSource(event.target.value as "preorder" | "ready_stock");
                    setCatalogId("");
                    setVariantId("");
                    setCatalogSearch("");
                    setVariantSearch("");
                  }}
                >
                  <option value="preorder">Secret Catalog / preorder</option>
                  <option value="ready_stock">Ready Stock</option>
                </BFGSelect>
              </label>
              {source === "preorder" ? (
                <label className="field">
                  <span className="field-label">Katalog</span>
                  <input
                    className="input"
                    type="search"
                    value={catalogSearch}
                    onChange={(event) => setCatalogSearch(event.target.value)}
                    placeholder="Cari Catalog..."
                    aria-label="Cari Catalog"
                  />
                  <BFGSelect
                    aria-label="Katalog"
                    className="select"
                    value={catalogId}
                    onChange={(event) => {
                      setCatalogId(event.target.value);
                      setVariantId("");
                      setVariantSearch("");
                    }}
                    required
                  >
                    <option value="">Pilih katalog terbuka…</option>
                    {visibleCatalogs.map((catalogOption) => (
                      <option value={catalogOption.id} key={catalogOption.id}>
                        {catalogOption.name}
                      </option>
                    ))}
                  </BFGSelect>
                  {!filteredCatalogs.length ? <span className="subtle">Tidak ada Catalog yang cocok.</span> : null}
                </label>
              ) : null}
            </div>
            <div className="form-grid">
              <label className="field">
                <span className="field-label">Buku / varian</span>
                <input
                  className="input"
                  type="search"
                  value={variantSearch}
                  onChange={(event) => setVariantSearch(event.target.value)}
                  placeholder="Cari judul, ISBN, publisher, atau penulis..."
                  aria-label="Cari buku atau varian"
                  disabled={source === "preorder" && !catalogId}
                />
                <BFGSelect
                  aria-label="Buku / varian"
                  className="select"
                  value={variantId}
                  onChange={(event) => setVariantId(event.target.value)}
                  disabled={source === "preorder" && !catalogId}
                  required
                >
                  <option value="">Pilih varian…</option>
                  {visibleVariants.map((variant) => (
                    <option value={variant.id} key={variant.id}>
                      {variant.bookTitle} · {variant.publisher} · {variant.format} · {variant.isbn}
                    </option>
                  ))}
                </BFGSelect>
                {catalogId && !filteredVariants.length ? (
                  <span className="subtle">Tidak ada varian yang cocok.</span>
                ) : null}
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
                Harga server:{" "}
                {selectedVariant ? `IDR ${selectedVariant.price.toLocaleString("id-ID")}` : "pilih varian"}
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
          <AdminPagination
            {...customerPagination}
            rowCount={customerRows.length}
            isDone={customerPage?.isDone ?? true}
            continueCursor={customerPage?.continueCursor ?? ""}
          />
        </>
      ) : customers !== undefined && !productOptionsLoading ? (
        <p className="subtle">Pelanggan aktif dan sumber produk yang tersedia diperlukan.</p>
      ) : null}
    </Card>
  );
}

function OrderTimeline({ orderId }: { orderId: string }) {
  const { dataSource } = useProduct();
  const detail = useQuery(
    api.orders.getForAdmin,
    dataSource === "convex" ? { orderId: orderId as Id<"orders"> } : "skip",
  );
  if (detail === undefined) {
    return (
      <LoadingRegion label="Memuat detail pesanan">
        <SkeletonTimeline />
      </LoadingRegion>
    );
  }
  const order = asOrder(detail as OrderView);
  if (!order) {
    return (
      <Card>
        <p className="subtle">Detail pesanan belum tersedia.</p>
      </Card>
    );
  }
  return (
    <Card>
      <div className="split-heading">
        <div>
          <span className="card-kicker">{orderReference(order)}</span>
          <h2>{order.customerName}</h2>
        </div>
        <StatusBadge>{orderStatusLabel(order.status, order.cancellationPending)}</StatusBadge>
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
  const { dataSource } = useProduct();
  const [firstOrderId, setFirstOrderId] = useState<string | null>(null);
  const [routeLoading, setRouteLoading] = useState(dataSource === "convex");
  return (
    <div className="page admin-page">
      <PageHeader
        eyebrow="Operasi pesanan"
        title="Tinjau pesanan, lalu lanjutkan tahapnya."
        description="Perubahan status, pesanan berbantuan, dan tautan batch mengikuti alur pesanan Convex kanonik."
        actions={<div className="form-actions">{dataSource === "convex" ? <BackfillOrderReferences /> : null}</div>}
        loading={routeLoading}
        skeleton={{ titleWidth: "76%", descriptionWidths: ["92%", "62%"] }}
      />
      <div className="admin-workspace">
        <AdminNav />
        <div className="admin-content">
          {routeLoading && dataSource === "convex" ? (
            <SkeletonForm />
          ) : dataSource === "convex" ? (
            <ConvexAssistedOrderForm />
          ) : null}
          <OrderTable onFirstOrderId={setFirstOrderId} onLoadingChange={setRouteLoading} />
          {!routeLoading && firstOrderId ? <OrderTimeline orderId={firstOrderId} /> : null}
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
        variant="secondary"
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
