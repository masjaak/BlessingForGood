"use client";

import { createContext } from "react";
import type {
  CreateCatalogInput,
  CreateOrderInput,
  Order,
  OrderStatus,
  PrototypeState,
  SecretCatalog,
} from "@/domain/prototype/types";
import type { ProductRole } from "@/domain/prototype/session";

export type ProductDataSource = "convex" | "unavailable";
export type ProductAuthState =
  | "loading"
  | "signed-out"
  | "convex-loading"
  | "provisioning"
  | "authenticated"
  | "suspended"
  | "network-error"
  | "configuration-missing";

export interface ProductContextValue {
  hydrated: boolean;
  dataSource: ProductDataSource;
  sessionRole: ProductRole | null;
  userStatus: "active" | "suspended" | null;
  authState: ProductAuthState;
  state: PrototypeState;
  unlockedCatalog: SecretCatalog | undefined;
  createCatalog: (input: CreateCatalogInput) => Promise<SecretCatalog>;
  unlockCatalog: (accessCode: string) => Promise<SecretCatalog | undefined>;
  submitOrder: (catalogId: string, input: CreateOrderInput) => Promise<Order>;
  updateOrderStatus: (orderId: string, nextStatus: OrderStatus) => void | Promise<void>;
  closeCatalog: (catalogId: string) => void | Promise<void>;
  editOrder: (orderId: string, input: CreateOrderInput) => Promise<Order>;
}

export const ProductContext = createContext<ProductContextValue | null>(null);
