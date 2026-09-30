import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AdminCustomerDetailPage from "@/app/admin/customers/[customerId]/page";
import { useMutation, useQuery } from "convex/react";
import { useProduct } from "@/domain/prototype/store";
import { useOperations } from "@/domain/prototype/operations-context";

vi.mock("next/navigation", () => ({
  useParams: vi.fn(() => ({ customerId: "customer-1" })),
}));

vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(() => vi.fn()),
}));

vi.mock("@/domain/prototype/store", () => ({
  useProduct: vi.fn(),
}));

vi.mock("@/domain/prototype/operations-context", () => ({
  useOperations: vi.fn(),
  invoicePaymentStatusLabel: (status: string) => status,
}));

vi.mock("@/components/product-access-guard", () => ({
  ProductAccessGuard: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("@/components/site-shell", () => ({
  SiteShell: ({ children }: { children: React.ReactNode }) => <main>{children}</main>,
}));

vi.mock("@/components/admin-nav", () => ({
  AdminNav: () => <nav aria-label="Admin navigation" />,
}));

describe("Admin customer detail actions", () => {
  it("keeps invoice and deposit workflows reachable from the customer context", () => {
    vi.mocked(useProduct).mockReturnValue({
      dataSource: "convex",
      state: {
        orders: [
          {
            id: "order-1",
            customerUserId: "customer-1",
            customerName: "A Customer",
            total: 12000,
            status: "submitted",
          },
        ],
      },
    } as never);
    vi.mocked(useOperations).mockReturnValue({ adminInvoiceList: { page: [] } } as never);
    vi.mocked(useQuery)
      .mockReturnValueOnce({ displayNameSnapshot: "A Customer", memberCode: "a-customer-1234" } as never)
      .mockReturnValueOnce({ displayName: "A Customer" } as never)
      .mockReturnValueOnce([] as never)
      .mockReturnValueOnce({ page: [], isDone: true, continueCursor: "" } as never)
      .mockReturnValueOnce({ page: [], isDone: true, continueCursor: "" } as never)
      .mockReturnValueOnce([] as never);

    render(<AdminCustomerDetailPage />);

    const summaryGrid = document.querySelector(".customer-detail-summary-grid");
    expect(summaryGrid).toBeTruthy();
    expect(summaryGrid?.querySelectorAll(":scope > .card")).toHaveLength(2);

    expect(screen.getByRole("link", { name: "Buat invoice reguler" }).getAttribute("href")).toBe(
      "/admin/invoices?customerId=customer-1",
    );
    expect(screen.getByRole("link", { name: "Kelola deposit" }).getAttribute("href")).toBe(
      "/admin/deposits?customerId=customer-1",
    );
    expect(screen.queryByRole("link", { name: /^Buat invoice$/ })).toBeNull();
    expect(screen.getByRole("button", { name: "Edit nama customer" })).toBeTruthy();
  });

  it("lets Admin correct the Customer display name from the detail page", async () => {
    const updateName = vi.fn().mockResolvedValue({ displayName: "Nama Baru" });
    vi.mocked(useProduct).mockReturnValue({
      dataSource: "convex",
      state: { orders: [] },
    } as never);
    vi.mocked(useOperations).mockReturnValue({ adminInvoiceList: { page: [] } } as never);
    vi.mocked(useMutation).mockReturnValue(updateName as never);
    vi.mocked(useQuery)
      .mockReturnValueOnce({ displayNameSnapshot: "Nama Lama", memberCode: "BFG-0001" } as never)
      .mockReturnValueOnce({ displayName: "Nama Lama" } as never)
      .mockReturnValueOnce([] as never)
      .mockReturnValueOnce({ page: [], isDone: true, continueCursor: "" } as never)
      .mockReturnValueOnce({ page: [], isDone: true, continueCursor: "" } as never)
      .mockReturnValueOnce([] as never);

    render(<AdminCustomerDetailPage />);

    fireEvent.click(screen.getByRole("button", { name: "Edit nama customer" }));
    const input = screen.getByLabelText("Nama customer");
    fireEvent.change(input, { target: { value: "Nama Baru" } });
    fireEvent.click(screen.getByRole("button", { name: "Simpan nama" }));

    await waitFor(() =>
      expect(updateName).toHaveBeenCalledWith({
        userId: "customer-1",
        displayName: "Nama Baru",
      }),
    );
    expect(screen.getByText("Nama customer berhasil diperbarui.")).toBeTruthy();
  });
});
