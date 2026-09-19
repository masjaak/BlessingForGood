import { render, screen } from "@testing-library/react";
import { useQuery } from "convex/react";
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

vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
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
const orderDetail = {
  orderId: "order-1",
  id: "order-1",
  customerUserId: "customer-1",
  catalogId: "catalog-1",
  customerName: "A Customer",
  customerEmail: "customer@example.com",
  customerMemberCode: "BFG-0001",
  orderCode: "BFG-ORD-001",
  source: "customer_self_service",
  status: "submitted",
  currency: "IDR",
  subtotalAmount: 300000,
  totalAmount: 300000,
  cancellationPending: false,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  submittedAt: "2026-01-01T00:00:00.000Z",
  editableUntil: "2026-01-02T00:00:00.000Z",
  items: [
    {
      _id: "item-1",
      bookId: "book-1",
      bookTitleSnapshot: "A Book",
      publisherNameSnapshot: "A Publisher",
      bookVariantId: "variant-1",
      formatSnapshot: "PB",
      isbnSnapshot: "9780000000001",
      unitPriceAmountSnapshot: 150000,
      quantity: 2,
      subtotalAmount: 300000,
    },
  ],
  statusHistory: [{ status: "submitted", at: "2026-01-01T00:00:00.000Z" }],
};

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
  vi.mocked(useQuery).mockReturnValue(orderDetail as never);
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
