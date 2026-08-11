import { describe, expect, it } from "vitest";
import { customerActivity, outstandingRefundObligation } from "@/domain/customer-activity";

describe("customer activity projection", () => {
  it("combines canonical records in reverse chronology and respects the limit", () => {
    const activity = customerActivity(
      [
        {
          id: "order-1",
          items: [{ bookTitle: "Book A" }],
          statusHistory: [{ status: "submitted", at: "2026-01-01T00:00:00.000Z" }],
        },
      ] as never,
      [
        {
          invoiceId: "invoice-1",
          invoiceNumber: "INV-1",
          paymentStatus: "paid",
          updatedAt: "2026-01-03T00:00:00.000Z",
        },
      ] as never,
      [{ transactionId: "tx-1", availableDelta: 1000, createdAt: "2026-01-02T00:00:00.000Z" }] as never,
      [],
      2,
    );

    expect(activity.map((item) => item.id)).toEqual(["invoice-invoice-1-2026-01-03T00:00:00.000Z", "deposit-tx-1"]);
  });

  it("projects customer-safe exception history without actor or internal notes", () => {
    const [activity] = customerActivity([], [], [], [
      {
        exceptionId: "exception-1",
        orderId: "order-1",
        item: { bookTitle: "Book A" },
        history: [{ eventType: "resolved", toStatus: "resolved", at: "2026-01-04T00:00:00.000Z", actorUserId: null }],
      },
    ] as never);

    expect(activity).toMatchObject({
      title: "Masalah pesanan selesai",
      detail: "Book A",
      href: "/account/orders/order-1",
    });
    expect(activity).not.toHaveProperty("actorUserId");
  });

  it("returns an intentional zero-data result", () => {
    expect(customerActivity([], [], [], [])).toEqual([]);
  });

  it("counts only unsettled refund obligations", () => {
    expect(
      outstandingRefundObligation([
        { refundObligationStatus: "refund_due", refundObligationAmount: 100_000 },
        { refundObligationStatus: "settled", refundObligationAmount: 80_000 },
        { refundObligationStatus: "none", refundObligationAmount: 0 },
      ] as never),
    ).toBe(100_000);
  });
});
