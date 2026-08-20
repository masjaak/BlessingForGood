import type { Order } from "@/domain/prototype/types";

export function orderReference(order: Pick<Order, "id" | "orderCode">) {
  return order.orderCode || `BFG-ORD-LEGACY-${order.id.slice(-8).toUpperCase()}`;
}
