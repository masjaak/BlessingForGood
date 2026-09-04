import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminInvoicesPage from "@/app/admin/invoices/page";
import AdminDepositsPage from "@/app/admin/deposits/page";
import { useQuery, useMutation } from "convex/react";
import { getFunctionName } from "convex/server";
import { useOperations } from "@/domain/prototype/operations-context";

vi.mock("convex/react", () => ({
  useMutation: vi.fn(),
  useQuery: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => ({ get: () => null }),
}));

vi.mock("@/domain/prototype/operations-context", () => ({
  useOperations: vi.fn(),
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

const invoiceRows = [
  {
    customerUserId: "customer-a",
    customerName: "Customer A",
    customerMemberCode: "BFG-A",
    batchId: "batch-x",
    batchName: "Thunder",
    currentShipmentStage: "po_closed",
    bookCount: 2,
    orderCount: 1,
    totalAmount: 100000,
    invoiceId: null,
    invoiceStatus: null,
    eligible: true,
    eligibilityReason: null,
  },
  {
    customerUserId: "customer-b",
    customerName: "Customer B",
    customerMemberCode: "BFG-B",
    batchId: "batch-y",
    batchName: "September Cargo",
    currentShipmentStage: "po_closed",
    bookCount: 1,
    orderCount: 1,
    totalAmount: 50000,
    invoiceId: "invoice-b",
    invoiceStatus: "issued",
    eligible: false,
    eligibilityReason: "customer × batch invoice already exists",
  },
];

const customers = [
  { customerUserId: "customer-a", displayName: "Customer A", memberCode: "BFG-A", email: "a@example.com" },
  { customerUserId: "customer-b", displayName: "Customer B", memberCode: "BFG-B", email: "b@example.com" },
  {
    customerUserId: "customer-mulia",
    displayName: "Mulia Raya",
    memberCode: "mulia-raya-5484",
    email: "mulia@example.com",
  },
  {
    customerUserId: "customer-madina",
    displayName: "Madina7754",
    memberCode: "madina-7754",
    email: "madina@example.com",
  },
  { customerUserId: "customer-elly", displayName: "Elly", memberCode: "elly-0192", email: "elly@example.com" },
];

const batches = [
  {
    batchId: "batch-x",
    name: "Thunder",
    referenceCode: "BFG-BAT-X",
    isArchived: false,
    currentShipmentStage: "po_closed",
  },
  {
    batchId: "batch-y",
    name: "September Cargo",
    referenceCode: "BFG-BAT-Y",
    isArchived: false,
    currentShipmentStage: "po_closed",
  },
];

const historyRows = [
  {
    transactionId: "transaction-1",
    direction: "in",
    amount: 100000,
    createdAt: "2026-09-03T10:00:00.000Z",
    customerUserId: "customer-a",
    customerName: "Customer A",
    customerMemberCode: "BFG-A",
    source: "Top-up disetujui",
    description: "Verified top-up",
    topUpReference: "BANK-001",
    invoiceNumber: null,
    orderCode: null,
    batchName: null,
    actorName: "Admin",
  },
  {
    transactionId: "transaction-2",
    direction: "out",
    amount: 50000,
    createdAt: "2026-09-02T10:00:00.000Z",
    customerUserId: "customer-a",
    customerName: "Customer A",
    customerMemberCode: "BFG-A",
    source: "Alokasi ke invoice",
    description: "invoice deposit allocation",
    invoiceNumber: "BFG-INV-001",
    orderCode: "BFG-ORD-001",
    batchName: "Thunder",
    actorName: "Admin",
  },
];

function setupQueryMocks() {
  vi.mocked(useQuery).mockImplementation((query, args?) => {
    if (args === "skip") return null as never;
    if (args && typeof args === "object" && "direction" in args) {
      return { page: historyRows, isDone: true, continueCursor: "" } as never;
    }
    if (args && typeof args === "object" && "batchId" in args) {
      return { page: invoiceRows, isDone: true, continueCursor: "" } as never;
    }
    if (args && typeof args === "object" && "paginationOpts" in args && args.paginationOpts.numItems === 25) {
      return { page: invoiceRows, isDone: true, continueCursor: "" } as never;
    }
    if (args && typeof args === "object" && "paginationOpts" in args && args.paginationOpts.numItems === 100) {
      if (getFunctionName(query as never).endsWith(":listEligibleCustomers")) {
        const search = typeof args.search === "string" ? args.search.trim().toLowerCase() : "";
        const page = search
          ? customers.filter(
              (customer) =>
                customer.displayName.toLowerCase().includes(search) ||
                (customer.memberCode || "").toLowerCase().includes(search),
            )
          : customers;
        return { page, isDone: true, continueCursor: "" } as never;
      }
      return { page: batches, isDone: true, continueCursor: "" } as never;
    }
    return [] as never;
  });
  vi.mocked(useMutation).mockReturnValue(vi.fn() as never);
}

describe("Admin finance polish", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupQueryMocks();
    vi.mocked(useOperations).mockReturnValue({
      adminInvoiceList: { page: [], isDone: true, continueCursor: "" },
    } as never);
  });

  it("applies Customer and Batch filters through the queue query and resets pagination", async () => {
    render(<AdminInvoicesPage />);

    const customerFilter = screen.getByRole("combobox", { name: "Pelanggan" });
    fireEvent.click(customerFilter);
    fireEvent.click(screen.getByRole("option", { name: "Customer A · BFG-A" }));
    const batchFilter = screen.getByRole("combobox", { name: "Batch / Cargo" });
    fireEvent.click(batchFilter);
    fireEvent.click(screen.getByRole("option", { name: "BFG-BAT-X · Thunder" }));

    await waitFor(() => {
      const queueCalls = vi
        .mocked(useQuery)
        .mock.calls.map((call) => call[1])
        .filter((args): args is { customerUserId: string; batchId: string } =>
          Boolean(args && typeof args === "object" && "customerUserId" in args && "batchId" in args),
        );
      expect(queueCalls.at(-1)).toMatchObject({ customerUserId: "customer-a", batchId: "batch-x" });
    });

    fireEvent.click(screen.getByRole("button", { name: "Reset filter" }));
    await waitFor(() => {
      const queueCalls = vi.mocked(useQuery).mock.calls.map((call) => call[1]);
      expect(queueCalls).toContainEqual(expect.objectContaining({ customerUserId: undefined, batchId: undefined }));
    });
    expect(screen.getByText("Customer A")).toBeTruthy();
  });

  it("keeps invoice status and action regions framed and visually ranked", () => {
    render(<AdminInvoicesPage />);
    const rows = screen.getAllByTestId("invoice-issue-row");
    const eligibleRow = rows[0];
    const issuedRow = rows[1];

    expect(eligibleRow.querySelector(".invoice-issue-main")).toBeTruthy();
    expect(eligibleRow.querySelector(".invoice-issue-status")).toBeTruthy();
    expect(eligibleRow.querySelector(".invoice-issue-action")).toBeTruthy();
    expect(
      within(eligibleRow).getByRole("button", { name: "Terbitkan invoice" }).classList.contains("button-primary"),
    ).toBe(true);
    expect(within(issuedRow).getByRole("link", { name: "Buka invoice" }).classList.contains("button-secondary")).toBe(
      true,
    );
    expect(within(issuedRow).getByText("Sudah terbit")).toBeTruthy();
  });

  it("separates invoice deposit controls, the bulk CTA, and the invoice list", () => {
    render(<AdminInvoicesPage />);

    expect(screen.getByRole("combobox", { name: "Syarat deposit" }).closest(".invoice-issue-requirement")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Terbitkan invoice terpilih" }).closest(".invoice-issue-bulk-actions"),
    ).toBeTruthy();
    expect(screen.getAllByTestId("invoice-issue-row")[0].closest(".invoice-issue-list")).toBeTruthy();
  });

  it("renders canonical deposit history with direction, source, and related references", () => {
    render(<AdminDepositsPage />);

    expect(screen.getByText("Riwayat deposit")).toBeTruthy();
    expect(screen.getByText("Masuk")).toBeTruthy();
    expect(screen.getByText("Keluar")).toBeTruthy();
    expect(screen.getByText("Top-up disetujui")).toBeTruthy();
    expect(screen.getByText(/BANK-001/)).toBeTruthy();
    expect(screen.getByText("Alokasi ke invoice")).toBeTruthy();
    expect(screen.getByText(/BFG-INV-001/)).toBeTruthy();
    expect(screen.getByText(/BFG-ORD-001/)).toBeTruthy();
    expect(screen.getByText(/Thunder/)).toBeTruthy();
    expect(screen.getByRole("combobox", { name: "Arah riwayat deposit" })).toBeTruthy();
  });

  it("applies Customer and direction filters through the history query", async () => {
    render(<AdminDepositsPage />);

    fireEvent.click(screen.getByRole("combobox", { name: "Pelanggan riwayat deposit" }));
    fireEvent.click(screen.getByRole("option", { name: "Customer B · BFG-B" }));
    fireEvent.click(screen.getByRole("combobox", { name: "Arah riwayat deposit" }));
    fireEvent.click(screen.getByRole("option", { name: "Keluar" }));

    await waitFor(() => {
      const historyCalls = vi
        .mocked(useQuery)
        .mock.calls.map((call) => call[1])
        .filter((args): args is { customerUserId: string; direction: "out" } =>
          Boolean(args && typeof args === "object" && "direction" in args && "customerUserId" in args),
        );
      expect(historyCalls.at(-1)).toMatchObject({ customerUserId: "customer-b", direction: "out" });
    });
  });

  it("separates the manual adjustment action from the reason field", () => {
    render(<AdminDepositsPage />);
    const form = screen.getByRole("button", { name: "Catat penyesuaian" }).closest("form");
    expect(form?.classList.contains("deposit-adjustment-form")).toBe(true);
    expect(form?.querySelector(".deposit-adjustment-actions")).toBeTruthy();
  });

  it("searches the Deposit Customer selector by name and shows an intentional empty state", async () => {
    render(<AdminDepositsPage />);

    const selector = screen.getByRole("combobox", { name: "Pelanggan" });
    fireEvent.click(selector);
    const search = screen.getByRole("searchbox", { name: "Cari pelanggan" });
    fireEvent.change(search, { target: { value: "mUlIa" } });

    await waitFor(() => expect(screen.getByRole("option", { name: "Mulia Raya · mulia-raya-5484" })).toBeTruthy());
    fireEvent.click(screen.getByRole("option", { name: "Mulia Raya · mulia-raya-5484" }));
    expect(selector.textContent).toContain("Mulia Raya · mulia-raya-5484");

    fireEvent.click(selector);
    fireEvent.change(screen.getByRole("searchbox", { name: "Cari pelanggan" }), {
      target: { value: "does-not-exist" },
    });
    await waitFor(() => expect(screen.getByText("Tidak ada pelanggan yang cocok.")).toBeTruthy());
  });

  it("searches the canonical Customer member-code suffix, not only names", async () => {
    render(<AdminDepositsPage />);

    fireEvent.click(screen.getByRole("combobox", { name: "Pelanggan" }));
    const search = screen.getByRole("searchbox", { name: "Cari pelanggan" });
    fireEvent.change(search, { target: { value: "5484" } });

    await waitFor(() => {
      expect(screen.getByRole("option", { name: "Mulia Raya · mulia-raya-5484" })).toBeTruthy();
      expect(screen.queryByRole("option", { name: "Madina7754 · madina-7754" })).toBeNull();
    });
  });

  it("keeps the Deposit Customer selector open and focused through sequential search", async () => {
    render(<AdminDepositsPage />);

    const selector = screen.getByRole("combobox", { name: "Pelanggan" });
    fireEvent.click(selector);
    let search = screen.getByRole("searchbox", { name: "Cari pelanggan" });

    for (const value of ["m", "ma", "mad"]) {
      fireEvent.change(search, { target: { value } });
      await waitFor(() => expect(screen.getByRole("listbox", { name: "Pelanggan" })).toBeTruthy());
      search = screen.getByRole("searchbox", { name: "Cari pelanggan" });
      expect(document.activeElement).toBe(search);
      expect(screen.getByRole("option", { name: "Madina7754 · madina-7754" })).toBeTruthy();
    }

    fireEvent.click(screen.getByRole("option", { name: "Madina7754 · madina-7754" }));
    expect(screen.queryByRole("listbox", { name: "Pelanggan" })).toBeNull();
    expect(selector.textContent).toContain("Madina7754 · madina-7754");
  });
});
