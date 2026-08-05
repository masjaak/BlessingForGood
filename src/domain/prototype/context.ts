"use client";

import { createContext } from "react";
import { createInvoiceFromOrder } from "@/domain/prototype/logic";
import type {
  CreateCatalogInput,
  CreateOrderInput,
  DepositTransactionType,
  Invoice,
  Order,
  OrderStatus,
  PrototypeState,
  SecretCatalog,
} from "@/domain/prototype/types";
import type { PrototypeRole } from "@/domain/prototype/session";

export type PrototypeDataSource = "local" | "convex" | "unavailable";

export interface PrototypeContextValue {
  enabled: boolean;
  previewDemo: boolean;
  hydrated: boolean;
  dataSource: PrototypeDataSource;
  sessionRole: PrototypeRole | null;
  state: PrototypeState;
  unlockedCatalog: SecretCatalog | undefined;
  createCatalog: (input: CreateCatalogInput) => Promise<SecretCatalog>;
  unlockCatalog: (accessCode: string) => Promise<SecretCatalog | undefined>;
  submitOrder: (catalogId: string, input: CreateOrderInput) => Promise<Order>;
  updateOrderStatus: (orderId: string, nextStatus: OrderStatus) => void | Promise<void>;
  closeCatalog: (catalogId: string) => void | Promise<void>;
  createInvoice: (orderId: string, requirement: Parameters<typeof createInvoiceFromOrder>[1]) => Invoice;
  recordDeposit: (invoiceId: string, type: DepositTransactionType, amount: number, note: string) => Invoice;
  editOrder: (orderId: string, input: CreateOrderInput) => Promise<Order>;
  claimAdmin: (accessCode: string) => Promise<boolean>;
}

export const PrototypeContext = createContext<PrototypeContextValue | null>(null);
