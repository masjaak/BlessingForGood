import type { CustomerExceptionPage, InvoicePage, TransactionPage } from "@/domain/prototype/operations-context";
import type { Order } from "@/domain/prototype/types";
import { invoicePaymentStatusLabel } from "@/domain/prototype/operations";
import { orderStatusLabels } from "@/domain/prototype/logic";
import { invoiceReference } from "@/domain/prototype/invoice-reference";

export type CustomerActivity = {
  id: string;
  at: string;
  title: string;
  detail: string;
  href: string;
};

export function outstandingRefundObligation(invoices: InvoicePage["page"]): number {
  return invoices.reduce(
    (total, invoice) => total + (invoice.refundObligationStatus === "refund_due" ? invoice.refundObligationAmount : 0),
    0,
  );
}

export function customerActivity(
  orders: Order[],
  invoices: InvoicePage["page"],
  transactions: TransactionPage["page"],
  exceptions: CustomerExceptionPage["page"],
  limit = 12,
): CustomerActivity[] {
  return [
    ...orders.flatMap((order) =>
      order.statusHistory.map((event) => ({
        id: `order-${order.id}-${event.at}-${event.status}`,
        at: event.at,
        title: orderStatusLabels[event.status],
        detail: order.items[0]?.bookTitle || "Pesanan BFG",
        href: `/account/orders/${order.id}`,
      })),
    ),
    ...invoices.map((invoice) => ({
      id: `invoice-${invoice.invoiceId}-${invoice.updatedAt}`,
      at: invoice.updatedAt,
      title: invoicePaymentStatusLabel(invoice.paymentStatus),
      detail: invoiceReference(invoice.invoiceNumber),
      href: `/account/invoices/${invoice.invoiceId}`,
    })),
    ...transactions.map((transaction) => ({
      id: `deposit-${transaction.transactionId}`,
      at: transaction.createdAt,
      title: transaction.availableDelta >= 0 ? "Saldo deposit bertambah" : "Deposit digunakan",
      detail: "Aktivitas saldo deposit",
      href: "/account/invoices",
    })),
    ...exceptions.flatMap((exception) =>
      exception.history.map((event) => ({
        id: `exception-${exception.exceptionId}-${event.at}-${event.eventType}`,
        at: event.at,
        title:
          event.toStatus === "resolved"
            ? "Masalah pesanan selesai"
            : event.toStatus === "rejected"
              ? "Permintaan tidak disetujui"
              : "Pembaruan masalah pesanan",
        detail: exception.item?.bookTitle || "Item pesanan",
        href: `/account/orders/${exception.orderId}`,
      })),
    ),
  ]
    .sort((left, right) => Date.parse(right.at) - Date.parse(left.at))
    .slice(0, limit);
}
