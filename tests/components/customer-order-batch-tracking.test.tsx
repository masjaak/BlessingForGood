import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CustomerOrderDetailPage from "@/app/account/orders/[orderId]/page";
import { useOperations } from "@/domain/prototype/operations-context";
import { useProduct } from "@/domain/prototype/store";

vi.mock("next/navigation", () => ({
  useParams: vi.fn(() => ({ orderId: "order-1" })),
}));

vi.mock("@/domain/prototype/operations-context", () => ({
  useOperations: vi.fn(),
}));

vi.mock("@/domain/prototype/store", () => ({
  useProduct: vi.fn(),
}));

vi.mock("@/components/product-access-guard", () => ({
  ProductAccessGuard: ({ children }: { children: import("react").ReactNode }) => children,
}));

vi.mock("@/components/site-shell", () => ({
  SiteShell: ({ children }: { children: import("react").ReactNode }) => <main>{children}</main>,
}));

vi.mock("@/components/back-button", () => ({
  BackButton: () => null,
}));

vi.mock("@/components/customer-order-exceptions", () => ({
  CustomerOrderExceptions: () => null,
}));

const order = {
  id: "order-1",
  orderCode: "BFG-ORD-001",
  customerName: "A Customer",
  total: 300000,
  status: "submitted",
  items: [{ id: "item-1", quantity: 2, bookTitle: "A Book", format: "PB", subtotal: 300000 }],
};

const fulfillment = { currentStage: null, history: [] };

function setup(batches: unknown[]) {
  vi.mocked(useProduct).mockReturnValue({
    dataSource: "convex",
    ordersLoading: false,
    state: { orders: [order] },
  } as never);
  vi.mocked(useOperations).mockReturnValue({
    currentCustomerTracking: { batches },
    currentCustomerFulfillment: fulfillment,
    customerInvoiceList: { page: [] },
  } as never);
}

describe("Customer Order Batch tracking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("explains the canonical unassigned state", () => {
    setup([]);

    render(<CustomerOrderDetailPage />);

    expect(screen.getByRole("heading", { name: "Belum masuk Batch" })).toBeTruthy();
    expect(
      screen.getByText(
        "Pesananmu sudah tercatat. Perjalanan Batch akan muncul setelah Admin memasukkan item ini ke siklus PO/cargo.",
      ),
    ).toBeTruthy();
  });

  it("renders the assigned Batch projection with stage, ETA, and timeline", () => {
    setup([
      {
        batchId: "batch-1",
        name: "September Procurement",
        referenceCode: "BFG-BAT-001",
        currentShipmentStage: "shipped_internationally",
        etaCargoMonth: "2026-12",
        updatedAt: "2026-08-27T00:00:00.000Z",
        assignments: [{ quantity: 2, bookTitle: "A Book", format: "PB" }],
        history: [
          { toStage: "po_closed", at: "2026-08-25T00:00:00.000Z" },
          { toStage: "shipped_internationally", at: "2026-08-27T00:00:00.000Z" },
        ],
      },
    ]);

    render(<CustomerOrderDetailPage />);

    expect(screen.getByRole("heading", { name: "Perjalanan buku dari luar negeri" })).toBeTruthy();
    expect(screen.getByText("September Procurement")).toBeTruthy();
    expect(screen.getByText("BFG-BAT-001")).toBeTruthy();
    expect(screen.getByText(/Tahap saat ini: Dikirim dari Luar Negeri/)).toBeTruthy();
    expect(screen.getByText(/Estimasi tiba:/)).toBeTruthy();
    expect(screen.getByText("PO Ditutup")).toBeTruthy();
  });
});
