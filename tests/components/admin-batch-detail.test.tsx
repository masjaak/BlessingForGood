import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminBatchDetailPage from "@/app/admin/batches/[batchId]/page";
import { useOperations } from "@/domain/prototype/operations-context";
import { useProduct } from "@/domain/prototype/store";

vi.mock("next/navigation", () => ({
  useParams: vi.fn(() => ({ batchId: "batch-1" })),
  useRouter: vi.fn(() => ({ push: vi.fn() })),
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

vi.mock("@/components/admin-nav", () => ({
  AdminNav: () => <nav aria-label="Admin navigation" />,
}));

type CatalogLinkFixture = {
  catalogId: string;
  catalogName: string;
  closingAt: number | null;
  createdAt: string;
  eligibleOrderItemCount: number;
  eligibleCustomerCount: number;
  eligibleQuantity: number;
  publisherCount: number;
};

const batch = {
  batchId: "batch-1",
  id: "batch-1",
  name: "September Procurement",
  referenceCode: "BFG-BAT-001",
  description: "September cycle",
  poDeadlineAt: Date.parse("2026-09-01T12:00:00.000Z"),
  etaCargoMonth: null,
  currentShipmentStage: null,
  rosterLocked: false,
  isArchived: false,
  assignmentCount: 0,
  assignedQuantity: 0,
  customerCount: 0,
  createdAt: "2026-08-27T00:00:00.000Z",
  updatedAt: "2026-08-27T00:00:00.000Z",
  catalogLinks: [] as CatalogLinkFixture[],
  assignments: [],
  customerRoster: [],
  purchaseSummary: [],
  history: [],
};

const rosterItem = {
  orderId: "order-1",
  orderCode: "BFG-ORD-001",
  customerUserId: "customer-1",
  customerName: "A Customer",
  customerMemberCode: "BFG-1234",
  catalogId: "catalog-1",
  catalogName: "September Catalog",
  orderItemId: "order-item-1",
  bookVariantId: "variant-1",
  bookTitle: "A Book",
  publisherName: "A Publisher",
  format: "PB",
  isbn: "9780000000001",
  unitPriceAmount: 150000,
  orderedQuantity: 2,
  assignedQuantity: 0,
  assignedToBatchQuantity: 0,
  remainingQuantity: 2,
  assignmentState: "Belum masuk Batch",
};

function setup(currentBatch = batch) {
  const linkCatalog = vi.fn().mockResolvedValue({});
  const assignOrderItem = vi.fn().mockResolvedValue({});
  const updateShipmentStage = vi.fn().mockResolvedValue({});
  vi.mocked(useProduct).mockReturnValue({
    dataSource: "convex",
    state: {
      catalogs: [
        {
          id: "catalog-1",
          name: "September Catalog",
          closingAt: "2026-09-01T12:00:00.000Z",
        },
      ],
    },
  } as never);
  vi.mocked(useOperations).mockReturnValue({
    batchList: { page: [] },
    currentBatch,
    currentBatchUnassigned: [rosterItem],
    updateBatch: vi.fn().mockResolvedValue({}),
    linkCatalog,
    unlinkCatalog: vi.fn().mockResolvedValue({}),
    archiveBatch: vi.fn().mockResolvedValue({}),
    removeBatch: vi.fn().mockResolvedValue({}),
    updateEtaCargoMonth: vi.fn().mockResolvedValue({}),
    assignOrderItem,
    unassignOrderItem: vi.fn().mockResolvedValue({}),
    moveOrderItem: vi.fn().mockResolvedValue({}),
    updateShipmentStage,
  } as never);
  return { linkCatalog, assignOrderItem, updateShipmentStage };
}

describe("Admin Batch Detail rendered workflow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    HTMLDialogElement.prototype.showModal = function showModal() {
      this.setAttribute("open", "");
    };
  });

  it("exposes Catalog, Roster, assignment, and derived summary controls in workflow order", () => {
    setup();

    const { container } = render(<AdminBatchDetailPage />);
    const cards = [...container.querySelectorAll(".admin-content > .card")];

    expect(cards.map((card) => Number((card as HTMLElement).style.order))).toEqual([1, 6, 7, 2, 4, 4, 5, 3, 8]);
    expect(screen.getByText(/Hubungkan Catalog untuk menetapkan siklus procurement penerima/)).toBeTruthy();
    expect(screen.getByText(/A Customer/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Masukkan ke Batch" })).toBeTruthy();
    expect(screen.getByText("Ringkasan akan muncul setelah item Roster dimasukkan ke Batch.")).toBeTruthy();
    const deadlineInput = screen.getByText("Deadline PO").closest("label")?.querySelector("input");
    expect(deadlineInput?.getAttribute("type")).toBe("date");
    expect((deadlineInput as HTMLInputElement | null)?.value).toBe("2026-09-01");
  });

  it("frames the Catalog unlink operation with the existing secondary button variant", () => {
    setup({
      ...batch,
      catalogLinks: [
        {
          catalogId: "catalog-1",
          catalogName: "September Catalog",
          closingAt: Date.parse("2026-09-01T12:00:00.000Z"),
          createdAt: "2026-08-27T00:00:00.000Z",
          eligibleOrderItemCount: 0,
          eligibleCustomerCount: 0,
          eligibleQuantity: 0,
          publisherCount: 0,
        },
      ],
    });

    render(<AdminBatchDetailPage />);

    expect(screen.getByRole("button", { name: "Lepas tautan" }).classList.contains("button-secondary")).toBe(true);
  });

  it("persists Catalog linking and roster assignment through the rendered controls", async () => {
    const { linkCatalog, assignOrderItem } = setup();

    render(<AdminBatchDetailPage />);
    fireEvent.click(screen.getByRole("combobox", { name: "Katalog yang akan ditautkan" }));
    fireEvent.click(screen.getByRole("option", { name: /September Catalog/ }));
    fireEvent.click(screen.getByRole("button", { name: "Hubungkan Catalog" }));

    await waitFor(() => expect(linkCatalog).toHaveBeenCalledWith("batch-1", "catalog-1"));
    fireEvent.click(screen.getByRole("button", { name: "Masukkan ke Batch" }));
    await waitFor(() => expect(assignOrderItem).toHaveBeenCalledWith("order-item-1", "batch-1", 2));
  });

  it("confirms the first shipment transition before locking the PO", async () => {
    const { updateShipmentStage } = setup();

    render(<AdminBatchDetailPage />);
    fireEvent.click(screen.getByRole("button", { name: "Lanjut ke PO Ditutup" }));

    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Kunci PO?" })).toBeTruthy();
    expect(screen.getByText(/assignment, tautan Catalog, dan data procurement utama tidak dapat diubah/i)).toBeTruthy();
    expect(updateShipmentStage).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Kunci PO" }));
    await waitFor(() => expect(updateShipmentStage).toHaveBeenCalledWith("batch-1", "po_closed"));
  });
});
