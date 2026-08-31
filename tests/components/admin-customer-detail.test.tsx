import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AdminCustomerDetailPage from "@/app/admin/customers/[customerId]/page";
import { useQuery } from "convex/react";
import { useProduct } from "@/domain/prototype/store";
import { useOperations } from "@/domain/prototype/operations-context";

vi.mock("next/navigation", () => ({
  useParams: vi.fn(() => ({ customerId: "customer-1" })),
}));

vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
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
      .mockReturnValueOnce([] as never)
      .mockReturnValueOnce([] as never)
      .mockReturnValueOnce([] as never);

    render(<AdminCustomerDetailPage />);

    expect(screen.getAllByRole("link", { name: /^Buat invoice$/ }).map((link) => link.getAttribute("href"))).toContain(
      "/admin/invoices?customerId=customer-1",
    );
    expect(screen.getByRole("link", { name: "Kelola deposit" }).getAttribute("href")).toBe(
      "/admin/deposits?customerId=customer-1",
    );
    expect(screen.getAllByRole("link", { name: /^Buat invoice$/ }).map((link) => link.getAttribute("href"))).toContain(
      "/admin/invoices?customerId=customer-1",
    );
  });
});
