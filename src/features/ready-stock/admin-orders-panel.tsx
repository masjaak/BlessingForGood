"use client";
import { useState } from "react";
import { useMutation } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { BFGSelect } from "@/components/bfg-select";
import { Button, Card, Field, LinkButton, LoadingRegion, Money, SkeletonCard, StatusBadge } from "@/components/ui";
import { ReadyStockTimeline } from "./ready-stock-timeline";
type ReadyStage = "waiting_payment" | "verifying_payment" | "paid" | "packing" | "shipping" | "delivered" | "cancelled";
const orderStageLabel: Record<ReadyStage, string> = {
  waiting_payment: "Blessy menunggu pembayaran",
  verifying_payment: "Blessy memverifikasi pembayaran",
  paid: "Pembayaran berhasil",
  packing: "Paket sedang dikemas Blessy",
  shipping: "Paket sedang diantar Blessy",
  delivered: "Paket sampai",
  cancelled: "Dibatalkan",
};
export function ReadyStockOrdersPanel({
  orders,
  orderSearch,
  setOrderSearch,
  orderStatus,
  setOrderStatus,
}: {
  orders: FunctionReturnType<typeof api.readyStockOrders.listForAdmin> | undefined;
  orderSearch: string;
  setOrderSearch: (value: string) => void;
  orderStatus: ReadyStage | "";
  setOrderStatus: (value: ReadyStage | "") => void;
}) {
  const updateStage = useMutation(api.readyStockOrders.updateStage);
  const [pending, setPending] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function advance(orderId: Id<"readyStockOrders">, stage: "packing" | "shipping" | "delivered") {
    setPending(String(orderId));
    setMessage("");
    setError("");
    try {
      await updateStage({ orderId, stage });
      setMessage(
        stage === "packing"
          ? "Status diperbarui: Paket sedang dikemas Blessy."
          : stage === "shipping"
            ? "Status diperbarui: Paket sedang diantar Blessy."
            : "Status diperbarui: Paket sampai.",
      );
    } catch {
      setError("Status belum dapat diperbarui. Pastikan pembayaran sudah lunas dan tahap sebelumnya selesai.");
    } finally {
      setPending(null);
    }
  }

  return (
    <>
      {message ? (
        <p role="status" className="success-banner">
          {message}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="error-text">
          {error}
        </p>
      ) : null}
      <Card className="admin-ready-stock-orders-panel">
        <div className="split-heading">
          <div>
            <span className="card-kicker">Operasional pesanan</span>
            <h2>Pesanan Ready Stock</h2>
            <p className="subtle">Pantau pembayaran sampai paket diterima customer.</p>
          </div>
        </div>
        <div className="admin-ready-stock-filter-grid">
          <Field label="Cari pesanan">
            <input
              className="input"
              type="search"
              placeholder="Nama customer, judul, member code, atau invoice"
              value={orderSearch}
              onChange={(event) => setOrderSearch(event.target.value)}
            />
          </Field>
          <Field label="Status pesanan">
            <BFGSelect value={orderStatus} onChange={(event) => setOrderStatus(event.target.value as ReadyStage | "")}>
              <option value="">Semua status</option>
              <option value="waiting_payment">Blessy menunggu pembayaran</option>
              <option value="verifying_payment">Blessy memverifikasi pembayaran</option>
              <option value="paid">Pembayaran berhasil</option>
              <option value="packing">Paket sedang dikemas Blessy</option>
              <option value="shipping">Paket sedang diantar Blessy</option>
              <option value="delivered">Paket sampai</option>
              <option value="cancelled">Dibatalkan</option>
            </BFGSelect>
          </Field>
        </div>

        {orders === undefined ? (
          <LoadingRegion label="Memuat pesanan Ready Stock">
            <SkeletonCard />
          </LoadingRegion>
        ) : orders.length ? (
          <div className="content-stack admin-ready-stock-order-list">
            {orders.map((order) => {
              const stage = order.operationalStatus as ReadyStage;
              const nextStage =
                stage === "paid"
                  ? "packing"
                  : stage === "packing"
                    ? "shipping"
                    : stage === "shipping"
                      ? "delivered"
                      : null;
              const nextLabel =
                stage === "paid"
                  ? "Mulai kemas"
                  : stage === "packing"
                    ? "Tandai dikirim"
                    : stage === "shipping"
                      ? "Tandai sampai"
                      : null;
              return (
                <Card className="admin-ready-stock-order-card" key={order.orderId}>
                  <div className="split-heading">
                    <div>
                      <span className="card-kicker">{order.invoiceNumber || "Ready Stock order"}</span>
                      <h3>{order.customerName}</h3>
                      <p className="subtle">{order.customerMemberCode || order.customerEmail || "Blessfriend"}</p>
                    </div>
                    <StatusBadge
                      tone={stage === "delivered" ? "positive" : stage === "cancelled" ? "neutral" : "warning"}
                    >
                      {orderStageLabel[stage]}
                    </StatusBadge>
                  </div>
                  <div className="admin-ready-stock-order-grid">
                    <div>
                      <span className="subtle">Item</span>
                      <strong>
                        {order.title} · {order.format}
                      </strong>
                    </div>
                    <div>
                      <span className="subtle">Qty</span>
                      <strong>{order.quantity}</strong>
                    </div>
                    <div>
                      <span className="subtle">Total</span>
                      <strong>
                        <Money amount={order.totalAmount} />
                      </strong>
                    </div>
                    <div>
                      <span className="subtle">Kirim ke</span>
                      <strong>
                        {order.shippingAddress.recipientName} · {order.shippingAddress.recipientPhone}
                      </strong>
                      <span>
                        {order.shippingAddress.addressLine1}
                        {order.shippingAddress.addressLine2 ? `, ${order.shippingAddress.addressLine2}` : ""},{" "}
                        {order.shippingAddress.city}, {order.shippingAddress.province}{" "}
                        {order.shippingAddress.postalCode}
                      </span>
                    </div>
                  </div>
                  {stage !== "cancelled" ? (
                    <ReadyStockTimeline
                      title={order.title}
                      steps={order.timeline}
                      className="admin-ready-stock-timeline"
                    />
                  ) : null}
                  <div className="form-actions">
                    {order.invoiceId ? (
                      <LinkButton href={`/admin/invoices/${order.invoiceId}`} variant="secondary">
                        Buka tagihan
                      </LinkButton>
                    ) : null}
                    {nextStage && nextLabel ? (
                      <Button
                        type="button"
                        loading={pending === String(order.orderId)}
                        loadingLabel="Menyimpan…"
                        disabled={pending !== null}
                        onClick={() => void advance(order.orderId, nextStage)}
                      >
                        {nextLabel}
                      </Button>
                    ) : null}
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <p className="subtle">Belum ada checkout Ready Stock.</p>
        )}
      </Card>
    </>
  );
}
