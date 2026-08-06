"use client";

import { useMutation } from "convex/react";
import { useCallback, useMemo } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import type { FulfillmentStage, InvoiceRequirementMode, ShipmentStage } from "@/domain/prototype/operations-context";

function requireToken(sessionToken: string | null): string {
  if (!sessionToken) throw new Error("Preview session is not ready");
  return sessionToken;
}

export function useOperationsMutations(sessionToken: string | null) {
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
    (input: { name: string; referenceCode?: string; description?: string }) =>
      createBatchMutation({ sessionToken: requireToken(sessionToken), ...input }),
    [createBatchMutation, sessionToken],
  );
  const linkCatalog = useCallback(
    (id: string, catalogId: string) =>
      linkCatalogMutation({
        sessionToken: requireToken(sessionToken),
        batchId: id as Id<"batches">,
        catalogId: catalogId as Id<"secretCatalogs">,
      }),
    [linkCatalogMutation, sessionToken],
  );
  const unlinkCatalog = useCallback(
    (id: string, catalogId: string) =>
      unlinkCatalogMutation({
        sessionToken: requireToken(sessionToken),
        batchId: id as Id<"batches">,
        catalogId: catalogId as Id<"secretCatalogs">,
      }),
    [sessionToken, unlinkCatalogMutation],
  );
  const archiveBatch = useCallback(
    (id: string) => archiveBatchMutation({ sessionToken: requireToken(sessionToken), batchId: id as Id<"batches"> }),
    [archiveBatchMutation, sessionToken],
  );
  const assignOrderItem = useCallback(
    (orderItemId: string, id: string, assignedQuantity: number) =>
      assignOrderItemMutation({
        sessionToken: requireToken(sessionToken),
        orderItemId: orderItemId as Id<"orderItems">,
        batchId: id as Id<"batches">,
        assignedQuantity,
      }),
    [assignOrderItemMutation, sessionToken],
  );
  const updateShipmentStage = useCallback(
    (id: string, toStage: ShipmentStage, allowSkip = false, note?: string) =>
      updateShipmentStageMutation({
        sessionToken: requireToken(sessionToken),
        batchId: id as Id<"batches">,
        toStage,
        allowSkip,
        note,
      }),
    [sessionToken, updateShipmentStageMutation],
  );
  const updateFulfillmentStage = useCallback(
    (id: string, toStage: FulfillmentStage, note?: string) =>
      updateFulfillmentStageMutation({
        sessionToken: requireToken(sessionToken),
        orderId: id as Id<"orders">,
        toStage,
        note,
      }),
    [sessionToken, updateFulfillmentStageMutation],
  );
  const createInvoice = useCallback(
    (orderId: string, mode: InvoiceRequirementMode, value?: number) =>
      createInvoiceMutation({
        sessionToken: requireToken(sessionToken),
        orderId: orderId as Id<"orders">,
        depositRequirementMode: mode,
        depositRequirementValue: mode === "none" ? undefined : value,
      }),
    [createInvoiceMutation, sessionToken],
  );
  const issueInvoice = useCallback(
    (invoiceId: string) =>
      issueInvoiceMutation({ sessionToken: requireToken(sessionToken), invoiceId: invoiceId as Id<"invoices"> }),
    [issueInvoiceMutation, sessionToken],
  );
  const voidInvoice = useCallback(
    (invoiceId: string) =>
      voidInvoiceMutation({ sessionToken: requireToken(sessionToken), invoiceId: invoiceId as Id<"invoices"> }),
    [sessionToken, voidInvoiceMutation],
  );
  const recordCredit = useCallback(
    (invoiceId: string, amount: number, note?: string) =>
      recordCreditMutation({
        sessionToken: requireToken(sessionToken),
        invoiceId: invoiceId as Id<"invoices">,
        amount,
        note,
      }),
    [recordCreditMutation, sessionToken],
  );
  const allocateDeposit = useCallback(
    (invoiceId: string, amount: number) =>
      allocateDepositMutation({
        sessionToken: requireToken(sessionToken),
        invoiceId: invoiceId as Id<"invoices">,
        amount,
      }),
    [allocateDepositMutation, sessionToken],
  );
  const releaseAllocation = useCallback(
    (allocationId: string) =>
      releaseAllocationMutation({
        sessionToken: requireToken(sessionToken),
        allocationId: allocationId as Id<"invoiceDepositAllocations">,
      }),
    [releaseAllocationMutation, sessionToken],
  );
  const reverseAllocation = useCallback(
    (allocationId: string) =>
      reverseAllocationMutation({
        sessionToken: requireToken(sessionToken),
        allocationId: allocationId as Id<"invoiceDepositAllocations">,
      }),
    [reverseAllocationMutation, sessionToken],
  );
  const reverseTransaction = useCallback(
    (transactionId: string, note?: string) =>
      reverseTransactionMutation({
        sessionToken: requireToken(sessionToken),
        transactionId: transactionId as Id<"depositTransactions">,
        note,
      }),
    [reverseTransactionMutation, sessionToken],
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
