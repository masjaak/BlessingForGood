"use client";

import { useMutation } from "convex/react";
import { useCallback, useMemo } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import type { FulfillmentStage, InvoiceRequirementMode, ShipmentStage } from "@/domain/prototype/operations-context";

export function useOperationsMutations() {
  const createBatchMutation = useMutation(api.batches.create);
  const linkCatalogMutation = useMutation(api.batches.linkCatalog);
  const unlinkCatalogMutation = useMutation(api.batches.unlinkCatalog);
  const archiveBatchMutation = useMutation(api.batches.archive);
  const assignOrderItemMutation = useMutation(api.batchTracking.assignOrderItem);
  const updateShipmentStageMutation = useMutation(api.batchTracking.updateShipmentStage);
  const updateFulfillmentStageMutation = useMutation(api.orderFulfillment.updateStage);
  const createInvoiceMutation = useMutation(api.invoices.create);
  const issueInvoiceMutation = useMutation(api.invoices.issue);
  const voidInvoiceMutation = useMutation(api.invoices.voidInvoice);
  const recordCreditMutation = useMutation(api.depositTransactions.recordCredit);
  const allocateDepositMutation = useMutation(api.invoiceDepositAllocations.allocate);
  const releaseAllocationMutation = useMutation(api.invoiceDepositAllocations.release);
  const reverseAllocationMutation = useMutation(api.invoiceDepositAllocations.reverse);
  const reverseTransactionMutation = useMutation(api.depositTransactions.reverse);

  const createBatch = useCallback(
    (input: { name: string; referenceCode?: string; description?: string }) => createBatchMutation(input),
    [createBatchMutation],
  );
  const linkCatalog = useCallback(
    (id: string, catalogId: string) =>
      linkCatalogMutation({
        batchId: id as Id<"batches">,
        catalogId: catalogId as Id<"secretCatalogs">,
      }),
    [linkCatalogMutation],
  );
  const unlinkCatalog = useCallback(
    (id: string, catalogId: string) =>
      unlinkCatalogMutation({
        batchId: id as Id<"batches">,
        catalogId: catalogId as Id<"secretCatalogs">,
      }),
    [unlinkCatalogMutation],
  );
  const archiveBatch = useCallback(
    (id: string) => archiveBatchMutation({ batchId: id as Id<"batches"> }),
    [archiveBatchMutation],
  );
  const assignOrderItem = useCallback(
    (orderItemId: string, id: string, assignedQuantity: number) =>
      assignOrderItemMutation({
        orderItemId: orderItemId as Id<"orderItems">,
        batchId: id as Id<"batches">,
        assignedQuantity,
      }),
    [assignOrderItemMutation],
  );
  const updateShipmentStage = useCallback(
    (id: string, toStage: ShipmentStage, allowSkip = false, note?: string) =>
      updateShipmentStageMutation({
        batchId: id as Id<"batches">,
        toStage,
        allowSkip,
        note,
      }),
    [updateShipmentStageMutation],
  );
  const updateFulfillmentStage = useCallback(
    (id: string, toStage: FulfillmentStage, note?: string) =>
      updateFulfillmentStageMutation({
        orderId: id as Id<"orders">,
        toStage,
        note,
      }),
    [updateFulfillmentStageMutation],
  );
  const createInvoice = useCallback(
    (orderId: string, mode: InvoiceRequirementMode, value?: number) =>
      createInvoiceMutation({
        orderId: orderId as Id<"orders">,
        depositRequirementMode: mode,
        depositRequirementValue: mode === "none" ? undefined : value,
      }),
    [createInvoiceMutation],
  );
  const issueInvoice = useCallback(
    (invoiceId: string) => issueInvoiceMutation({ invoiceId: invoiceId as Id<"invoices"> }),
    [issueInvoiceMutation],
  );
  const voidInvoice = useCallback(
    (invoiceId: string) => voidInvoiceMutation({ invoiceId: invoiceId as Id<"invoices"> }),
    [voidInvoiceMutation],
  );
  const recordCredit = useCallback(
    (invoiceId: string, amount: number, note?: string) =>
      recordCreditMutation({
        invoiceId: invoiceId as Id<"invoices">,
        amount,
        note,
      }),
    [recordCreditMutation],
  );
  const allocateDeposit = useCallback(
    (invoiceId: string, amount: number) =>
      allocateDepositMutation({
        invoiceId: invoiceId as Id<"invoices">,
        amount,
      }),
    [allocateDepositMutation],
  );
  const releaseAllocation = useCallback(
    (allocationId: string) =>
      releaseAllocationMutation({
        allocationId: allocationId as Id<"invoiceDepositAllocations">,
      }),
    [releaseAllocationMutation],
  );
  const reverseAllocation = useCallback(
    (allocationId: string) =>
      reverseAllocationMutation({
        allocationId: allocationId as Id<"invoiceDepositAllocations">,
      }),
    [reverseAllocationMutation],
  );
  const reverseTransaction = useCallback(
    (transactionId: string, note?: string) =>
      reverseTransactionMutation({
        transactionId: transactionId as Id<"depositTransactions">,
        note,
      }),
    [reverseTransactionMutation],
  );

  return useMemo(
    () => ({
      createBatch,
      linkCatalog,
      unlinkCatalog,
      archiveBatch,
      assignOrderItem,
      updateShipmentStage,
      updateFulfillmentStage,
      createInvoice,
      issueInvoice,
      voidInvoice,
      recordCredit,
      allocateDeposit,
      releaseAllocation,
      reverseAllocation,
      reverseTransaction,
    }),
    [
      allocateDeposit,
      archiveBatch,
      assignOrderItem,
      createBatch,
      createInvoice,
      issueInvoice,
      linkCatalog,
      recordCredit,
      releaseAllocation,
      reverseAllocation,
      reverseTransaction,
      unlinkCatalog,
      updateFulfillmentStage,
      updateShipmentStage,
      voidInvoice,
    ],
  );
}
