"use client";

import { useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import type { PrototypeDataSource } from "@/domain/prototype/context";
import { useOperationsMutations } from "@/domain/prototype/operations-mutations";

export type ShipmentStage =
  "po_closed" | "ordered_to_supplier" | "shipped_internationally" | "customs" | "to_indonesia_warehouse" | "at_store";
export type FulfillmentStage = "awaiting_payment" | "awaiting_address" | "packing" | "shipped" | "completed";
export type InvoiceRequirementMode = "none" | "fixed" | "percentage";

export type BatchPage = NonNullable<FunctionReturnType<typeof api.batches.listForAdmin>>;
export type BatchSummary = BatchPage["page"][number];
export type BatchDetail = NonNullable<FunctionReturnType<typeof api.batchTracking.getForAdmin>>;
export type CustomerOrderTracking = NonNullable<FunctionReturnType<typeof api.batchTracking.getMine>>;
export type AdminOrderTracking = NonNullable<FunctionReturnType<typeof api.batchTracking.getForOrderAdmin>>;
export type FulfillmentTimeline = NonNullable<FunctionReturnType<typeof api.orderFulfillment.getMine>>;
export type InvoicePage = NonNullable<FunctionReturnType<typeof api.invoices.listMine>>;
export type InvoiceView = InvoicePage["page"][number];
export type AccountView = NonNullable<FunctionReturnType<typeof api.depositAccounts.getMine>>;
export type TransactionPage = NonNullable<FunctionReturnType<typeof api.depositTransactions.listMine>>;
export type AllocationView = Awaited<FunctionReturnType<typeof api.invoiceDepositAllocations.listMine>>[number];

export interface OperationsContextValue {
  enabled: boolean;
  dataSource: PrototypeDataSource;
  batchList: BatchPage | undefined;
  adminInvoiceList: InvoicePage | undefined;
  customerInvoiceList: InvoicePage | undefined;
  currentBatch: BatchDetail | undefined;
  currentCustomerTracking: CustomerOrderTracking | undefined;
  currentAdminOrderTracking: AdminOrderTracking | undefined;
  currentCustomerFulfillment: FulfillmentTimeline | undefined;
  currentAdminFulfillment: FulfillmentTimeline | undefined;
  currentCustomerInvoice: InvoiceView | undefined;
  currentAdminInvoice: InvoiceView | undefined;
  customerAccount: AccountView | undefined;
  adminAccount: NonNullable<FunctionReturnType<typeof api.depositAccounts.getForInvoice>> | undefined;
  customerTransactions: TransactionPage | undefined;
  adminTransactions: TransactionPage | undefined;
  customerAllocations: AllocationView[] | undefined;
  adminAllocations: Awaited<FunctionReturnType<typeof api.invoiceDepositAllocations.listForAdmin>> | undefined;
  createBatch: (input: { name: string; referenceCode?: string; description?: string }) => Promise<BatchSummary>;
  linkCatalog: (batchId: string, catalogId: string) => Promise<BatchSummary>;
  unlinkCatalog: (batchId: string, catalogId: string) => Promise<BatchSummary>;
  archiveBatch: (batchId: string) => Promise<BatchSummary>;
  assignOrderItem: (orderItemId: string, batchId: string, assignedQuantity: number) => Promise<unknown>;
  updateShipmentStage: (
    batchId: string,
    toStage: ShipmentStage,
    allowSkip?: boolean,
    note?: string,
  ) => Promise<unknown>;
  updateFulfillmentStage: (orderId: string, toStage: FulfillmentStage, note?: string) => Promise<unknown>;
  createInvoice: (orderId: string, mode: InvoiceRequirementMode, value?: number) => Promise<InvoiceView>;
  issueInvoice: (invoiceId: string) => Promise<InvoiceView>;
  voidInvoice: (invoiceId: string) => Promise<InvoiceView>;
  recordCredit: (invoiceId: string, amount: number, note?: string) => Promise<unknown>;
  allocateDeposit: (invoiceId: string, amount: number) => Promise<unknown>;
  releaseAllocation: (allocationId: string) => Promise<unknown>;
  reverseAllocation: (allocationId: string) => Promise<unknown>;
  reverseTransaction: (transactionId: string, note?: string) => Promise<unknown>;
}

export const OperationsContext = createContext<OperationsContextValue | null>(null);

function routeId(pathname: string | null, prefix: string): string | undefined {
  if (!pathname?.startsWith(prefix)) return undefined;
  const value = pathname.slice(prefix.length).split("/")[0];
  return value ? decodeURIComponent(value) : undefined;
}

export function ConvexOperationsProvider({
  children,
  enabled,
  role,
  active,
}: {
  children: ReactNode;
  enabled: boolean;
  role: "owner" | "admin" | "customer" | null;
  active: boolean;
}) {
  const pathname = usePathname();
  const batchId = routeId(pathname, "/admin/batches/");
  const customerOrderId = routeId(pathname, "/account/orders/");
  const adminOrderId = routeId(pathname, "/admin/orders/");
  const customerInvoiceId = routeId(pathname, "/account/invoices/");
  const adminInvoiceId = routeId(pathname, "/admin/invoices/");
  const isAdmin = enabled && active && (role === "admin" || role === "owner");
  const isCustomer = enabled && active && role === "customer";

  const batchList = useQuery(
    api.batches.listForAdmin,
    isAdmin ? { paginationOpts: { numItems: 50, cursor: null } } : "skip",
  );
  const adminInvoiceList = useQuery(
    api.invoices.listForAdmin,
    isAdmin ? { paginationOpts: { numItems: 50, cursor: null } } : "skip",
  );
  const customerInvoiceList = useQuery(
    api.invoices.listMine,
    isCustomer ? { paginationOpts: { numItems: 50, cursor: null } } : "skip",
  );
  const currentBatch = useQuery(
    api.batchTracking.getForAdmin,
    isAdmin && batchId ? { batchId: batchId as Id<"batches"> } : "skip",
  );
  const currentCustomerTracking = useQuery(
    api.batchTracking.getMine,
    isCustomer && customerOrderId ? { orderId: customerOrderId as Id<"orders"> } : "skip",
  );
  const currentAdminOrderTracking = useQuery(
    api.batchTracking.getForOrderAdmin,
    isAdmin && adminOrderId ? { orderId: adminOrderId as Id<"orders"> } : "skip",
  );
  const currentCustomerFulfillment = useQuery(
    api.orderFulfillment.getMine,
    isCustomer && customerOrderId ? { orderId: customerOrderId as Id<"orders"> } : "skip",
  );
  const currentAdminFulfillment = useQuery(
    api.orderFulfillment.getForAdmin,
    isAdmin && adminOrderId ? { orderId: adminOrderId as Id<"orders"> } : "skip",
  );
  const currentCustomerInvoice = useQuery(
    api.invoices.getMine,
    isCustomer && customerInvoiceId ? { invoiceId: customerInvoiceId as Id<"invoices"> } : "skip",
  );
  const currentAdminInvoice = useQuery(
    api.invoices.getForAdmin,
    isAdmin && adminInvoiceId ? { invoiceId: adminInvoiceId as Id<"invoices"> } : "skip",
  );
  const customerAccount = useQuery(api.depositAccounts.getMine, isCustomer ? {} : "skip");
  const adminAccount = useQuery(
    api.depositAccounts.getForInvoice,
    isAdmin && adminInvoiceId ? { invoiceId: adminInvoiceId as Id<"invoices"> } : "skip",
  );
  const customerTransactions = useQuery(
    api.depositTransactions.listMine,
    isCustomer ? { paginationOpts: { numItems: 100, cursor: null } } : "skip",
  );
  const adminTransactions = useQuery(
    api.depositTransactions.listForInvoice,
    isAdmin && adminInvoiceId
      ? {
          invoiceId: adminInvoiceId as Id<"invoices">,
          paginationOpts: { numItems: 100, cursor: null },
        }
      : "skip",
  );
  const customerAllocations = useQuery(
    api.invoiceDepositAllocations.listMine,
    isCustomer && customerInvoiceId ? { invoiceId: customerInvoiceId as Id<"invoices"> } : "skip",
  );
  const adminAllocations = useQuery(
    api.invoiceDepositAllocations.listForAdmin,
    isAdmin && adminInvoiceId ? { invoiceId: adminInvoiceId as Id<"invoices"> } : "skip",
  );

  const mutations = useOperationsMutations();

  const value = useMemo<OperationsContextValue>(
    () => ({
      enabled,
      dataSource: "convex",
      batchList,
      adminInvoiceList,
      customerInvoiceList,
      currentBatch,
      currentCustomerTracking,
      currentAdminOrderTracking,
      currentCustomerFulfillment,
      currentAdminFulfillment,
      currentCustomerInvoice,
      currentAdminInvoice,
      customerAccount,
      adminAccount,
      customerTransactions,
      adminTransactions,
      customerAllocations,
      adminAllocations,
      ...mutations,
    }),
    [
      adminAccount,
      adminAllocations,
      adminInvoiceList,
      adminTransactions,
      batchList,
      customerAccount,
      customerAllocations,
      customerInvoiceList,
      customerTransactions,
      currentAdminFulfillment,
      currentAdminInvoice,
      currentAdminOrderTracking,
      currentBatch,
      currentCustomerFulfillment,
      currentCustomerInvoice,
      currentCustomerTracking,
      enabled,
      mutations,
    ],
  );

  return <OperationsContext.Provider value={value}>{children}</OperationsContext.Provider>;
}

export function LocalOperationsProvider({
  children,
  enabled,
  dataSource,
}: {
  children: ReactNode;
  enabled: boolean;
  dataSource: PrototypeDataSource;
}) {
  const unavailable = useCallback(async () => {
    throw new Error("Persistent operational data requires Convex Preview.");
  }, []);
  const value = useMemo<OperationsContextValue>(
    () => ({
      enabled,
      dataSource,
      batchList: undefined,
      adminInvoiceList: undefined,
      customerInvoiceList: undefined,
      currentBatch: undefined,
      currentCustomerTracking: undefined,
      currentAdminOrderTracking: undefined,
      currentCustomerFulfillment: undefined,
      currentAdminFulfillment: undefined,
      currentCustomerInvoice: undefined,
      currentAdminInvoice: undefined,
      customerAccount: undefined,
      adminAccount: undefined,
      customerTransactions: undefined,
      adminTransactions: undefined,
      customerAllocations: undefined,
      adminAllocations: undefined,
      createBatch: unavailable,
      linkCatalog: unavailable,
      unlinkCatalog: unavailable,
      archiveBatch: unavailable,
      assignOrderItem: unavailable,
      updateShipmentStage: unavailable,
      updateFulfillmentStage: unavailable,
      createInvoice: unavailable,
      issueInvoice: unavailable,
      voidInvoice: unavailable,
      recordCredit: unavailable,
      allocateDeposit: unavailable,
      releaseAllocation: unavailable,
      reverseAllocation: unavailable,
      reverseTransaction: unavailable,
    }),
    [dataSource, enabled, unavailable],
  );
  return <OperationsContext.Provider value={value}>{children}</OperationsContext.Provider>;
}

export function useOperations(): OperationsContextValue {
  const value = useContext(OperationsContext);
  if (!value) throw new Error("useOperations must be used inside PrototypeProvider");
  return value;
}
