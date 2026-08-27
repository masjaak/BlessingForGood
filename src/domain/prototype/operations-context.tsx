"use client";

import { useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import type { ProductDataSource } from "@/domain/prototype/context";
import { useOperationsMutations } from "@/domain/prototype/operations-mutations";
import { roleCanAccess } from "@/domain/prototype/session";

export type ShipmentStage =
  "po_closed" | "ordered_to_supplier" | "shipped_internationally" | "customs" | "to_indonesia_warehouse" | "at_store";
export type FulfillmentStage = "awaiting_payment" | "awaiting_address" | "packing" | "shipped" | "completed";
export type InvoiceRequirementMode = "none" | "fixed" | "percentage";
export type InvoicePaymentStatus = "unpaid" | "payment_submitted" | "partially_paid" | "paid";
export type PaymentConfirmationStatus = "submitted" | "under_review" | "approved" | "rejected";

export type BatchPage = NonNullable<FunctionReturnType<typeof api.batches.listForAdmin>>;
export type BatchSummary = BatchPage["page"][number];
export type BatchDetail = NonNullable<FunctionReturnType<typeof api.batchTracking.getForAdmin>>;
export type UnassignedBatchItem = Awaited<FunctionReturnType<typeof api.batchTracking.listUnassignedForAdmin>>[number];
export type CustomerOrderTracking = NonNullable<FunctionReturnType<typeof api.batchTracking.getMine>>;
export type AdminOrderTracking = NonNullable<FunctionReturnType<typeof api.batchTracking.getForOrderAdmin>>;
export type FulfillmentTimeline = NonNullable<FunctionReturnType<typeof api.orderFulfillment.getMine>>;
export type InvoicePage = NonNullable<FunctionReturnType<typeof api.invoices.listMine>>;
export type InvoiceView = InvoicePage["page"][number];
export type AccountView = NonNullable<FunctionReturnType<typeof api.depositAccounts.getMine>>;
export type TransactionPage = NonNullable<FunctionReturnType<typeof api.depositTransactions.listMine>>;
export type AllocationView = Awaited<FunctionReturnType<typeof api.invoiceDepositAllocations.listMine>>[number];
export type PaymentConfirmationView = Awaited<
  FunctionReturnType<typeof api.paymentConfirmations.listMineForInvoice>
>[number];
export type AdminPaymentQueue = Awaited<FunctionReturnType<typeof api.paymentConfirmations.listPendingForAdmin>>;
export type AdminPaymentHistory = NonNullable<FunctionReturnType<typeof api.paymentConfirmations.listForAdmin>>;
export type CustomerExceptionPage = NonNullable<FunctionReturnType<typeof api.orderExceptions.listMine>>;
export type PaymentConfirmationInput = {
  amount: number;
  paymentMethod: string;
  transferReference?: string;
  paidAt: number;
  proofReference?: string;
  proofStorageId?: Id<"_storage">;
  proofFileName?: string;
  proofMimeType?: string;
  customerNote?: string;
};

export interface OperationsContextValue {
  enabled: boolean;
  dataSource: ProductDataSource;
  batchList: BatchPage | undefined;
  adminInvoiceList: InvoicePage | undefined;
  customerInvoiceList: InvoicePage | undefined;
  currentBatch: BatchDetail | undefined;
  currentBatchUnassigned: UnassignedBatchItem[] | undefined;
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
  customerPaymentConfirmations: PaymentConfirmationView[] | undefined;
  adminPaymentQueue: AdminPaymentQueue | undefined;
  adminPaymentHistory: AdminPaymentHistory | undefined;
  customerExceptionList: CustomerExceptionPage | undefined;
  createBatch: (input: {
    name: string;
    referenceCode?: string;
    description?: string;
    poDeadlineAt?: number;
    etaCargoMonth?: string;
  }) => Promise<BatchSummary>;
  updateBatch: (
    batchId: string,
    input: { name: string; description?: string; poDeadlineAt?: number },
  ) => Promise<BatchSummary>;
  updateEtaCargoMonth: (batchId: string, etaCargoMonth?: string) => Promise<BatchSummary>;
  linkCatalog: (batchId: string, catalogId: string) => Promise<BatchSummary>;
  unlinkCatalog: (batchId: string, catalogId: string) => Promise<BatchSummary>;
  archiveBatch: (batchId: string) => Promise<BatchSummary>;
  removeBatch: (batchId: string) => Promise<{ removed: true }>;
  assignOrderItem: (orderItemId: string, batchId: string, assignedQuantity: number) => Promise<unknown>;
  unassignOrderItem: (orderItemId: string, batchId: string) => Promise<unknown>;
  moveOrderItem: (orderItemId: string, fromBatchId: string, toBatchId: string) => Promise<unknown>;
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
  submitPaymentConfirmation: (invoiceId: string, input: PaymentConfirmationInput) => Promise<unknown>;
  startPaymentReview: (confirmationId: string) => Promise<unknown>;
  approvePaymentConfirmation: (confirmationId: string, reviewNote?: string) => Promise<unknown>;
  rejectPaymentConfirmation: (confirmationId: string, rejectionReason: string, reviewNote?: string) => Promise<unknown>;
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
  const adminWorkspace = pathname?.startsWith("/admin") ?? false;
  const isAdmin = enabled && active && adminWorkspace && roleCanAccess(role, "admin");
  const isCustomer = enabled && active && !adminWorkspace && roleCanAccess(role, "customer");

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
  const currentBatchUnassigned = useQuery(
    api.batchTracking.listUnassignedForAdmin,
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
  const customerPaymentConfirmations = useQuery(
    api.paymentConfirmations.listMineForInvoice,
    isCustomer && customerInvoiceId ? { invoiceId: customerInvoiceId as Id<"invoices"> } : "skip",
  );
  const adminPaymentQueue = useQuery(api.paymentConfirmations.listPendingForAdmin, isAdmin ? {} : "skip");
  const adminPaymentHistory = useQuery(
    api.paymentConfirmations.listForAdmin,
    isAdmin ? { paginationOpts: { numItems: 50, cursor: null } } : "skip",
  );
  const customerExceptionList = useQuery(
    api.orderExceptions.listMine,
    isCustomer ? { paginationOpts: { numItems: 50, cursor: null } } : "skip",
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
      currentBatchUnassigned,
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
      customerPaymentConfirmations,
      adminPaymentQueue,
      adminPaymentHistory,
      customerExceptionList,
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
      customerPaymentConfirmations,
      customerInvoiceList,
      customerTransactions,
      currentAdminFulfillment,
      currentAdminInvoice,
      currentAdminOrderTracking,
      currentBatch,
      currentBatchUnassigned,
      currentCustomerFulfillment,
      currentCustomerInvoice,
      currentCustomerTracking,
      enabled,
      adminPaymentQueue,
      adminPaymentHistory,
      customerExceptionList,
      mutations,
    ],
  );

  return <OperationsContext.Provider value={value}>{children}</OperationsContext.Provider>;
}

export function UnavailableOperationsProvider({ children }: { children: ReactNode }) {
  const unavailable = useCallback(async () => {
    throw new Error("Persistent operational data requires a configured Convex data source.");
  }, []);
  const value = useMemo<OperationsContextValue>(
    () => ({
      enabled: false,
      dataSource: "unavailable",
      batchList: undefined,
      adminInvoiceList: undefined,
      customerInvoiceList: undefined,
      currentBatch: undefined,
      currentBatchUnassigned: undefined,
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
      customerPaymentConfirmations: undefined,
      adminPaymentQueue: undefined,
      adminPaymentHistory: undefined,
      customerExceptionList: undefined,
      createBatch: unavailable,
      updateBatch: unavailable,
      updateEtaCargoMonth: unavailable,
      linkCatalog: unavailable,
      unlinkCatalog: unavailable,
      archiveBatch: unavailable,
      removeBatch: unavailable,
      assignOrderItem: unavailable,
      unassignOrderItem: unavailable,
      moveOrderItem: unavailable,
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
      submitPaymentConfirmation: unavailable,
      startPaymentReview: unavailable,
      approvePaymentConfirmation: unavailable,
      rejectPaymentConfirmation: unavailable,
    }),
    [unavailable],
  );
  return <OperationsContext.Provider value={value}>{children}</OperationsContext.Provider>;
}

export function useOperations(): OperationsContextValue {
  const value = useContext(OperationsContext);
  if (!value) throw new Error("useOperations must be used inside ProductProvider");
  return value;
}
