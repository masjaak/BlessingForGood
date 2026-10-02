import { describe, expect, it } from "vitest";
import { customerInvoiceContext } from "@/lib/customer-invoice-context";

const baseInvoice = {
  invoiceId: "invoice-1",
  id: "invoice-1",
  source: "order" as const,
  manualPoEntryId: null,
  readyStockOrderId: null,
  customerUserId: "customer-1",
  customerName: "Customer",
  customerEmail: null,
  customerMemberCode: null,
  orderId: "order-1",
  orderCode: "BFG-ORD-1",
  manualPoTitle: null,
  manualPoEtaText: null,
  readyStockTitle: null,
  batchId: null,
  batchName: null,
  batchReferenceCode: null,
  batchPoDeadlineAt: null,
  batchEtaCargoMonth: null,
  invoiceNumber: "BFG-INV-1",
  status: "issued" as const,
  currency: "IDR" as const,
  subtotalAmount: 100000,
  totalAmount: 100000,
  adjustedTotalAmount: 100000,
  financialAdjustmentAmount: 0,
  depositRequirementMode: "none" as const,
  depositRequirementValue: null,
  depositRequiredAmount: 0,
  allocatedDepositAmount: 0,
  verifiedPaymentAmount: 0,
  outstandingAmount: 100000,
  minimumPaymentAmount: 1,
  overpaymentAmount: 0,
  refundObligationAmount: 0,
  refundObligationStatus: "none" as const,
  paymentStatus: "unpaid" as const,
  createdAt: "2026-10-01T00:00:00.000Z",
  updatedAt: "2026-10-01T00:00:00.000Z",
  issuedAt: "2026-10-01T00:00:00.000Z",
  voidedAt: null,
  items: [],
};

describe("customerInvoiceContext", () => {
  it("prioritizes Batch/Cargo identity, close date, and ETA for regular invoices", () => {
    const context = customerInvoiceContext({
      ...baseInvoice,
      batchId: "batch-1",
      batchName: "CARGO 2",
      batchPoDeadlineAt: Date.parse("2026-09-30T16:59:59.999Z"),
      batchEtaCargoMonth: "2027-03",
    } as never);

    expect(context).toEqual({
      label: "Batch / Cargo",
      title: "CARGO 2",
      details: ["Close PO 30 Sep 2026", "ETA Maret 2027"],
    });
  });

  it("uses Random PO title and ETA without pretending it has a Batch", () => {
    expect(
      customerInvoiceContext({
        ...baseInvoice,
        source: "manual_po",
        orderId: null,
        orderCode: null,
        manualPoEntryId: "manual-1",
        manualPoTitle: "Special Book",
        manualPoEtaText: "April 2027",
      } as never),
    ).toEqual({
      label: "PO Random",
      title: "Special Book",
      details: ["ETA April 2027"],
    });
  });

  it("uses Ready Stock title without inventing PO metadata", () => {
    expect(
      customerInvoiceContext({
        ...baseInvoice,
        source: "ready_stock",
        orderId: null,
        orderCode: null,
        readyStockOrderId: "ready-1",
        readyStockTitle: "Are We Ready for a Pet?",
      } as never),
    ).toEqual({
      label: "Ready Stock",
      title: "Are We Ready for a Pet?",
      details: [],
    });
  });
});
