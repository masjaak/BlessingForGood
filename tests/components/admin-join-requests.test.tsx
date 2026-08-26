import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useMutation, useQuery } from "convex/react";
import AdminJoinRequestsPage from "@/app/admin/join-requests/page";
import { useProduct } from "@/domain/prototype/store";

vi.mock("convex/react", () => ({
  useMutation: vi.fn(() => vi.fn()),
  useQuery: vi.fn(),
}));

vi.mock("@/domain/prototype/store", () => ({
  useProduct: vi.fn(),
}));

vi.mock("@/components/product-access-guard", () => ({
  ProductAccessGuard: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("@/components/site-shell", () => ({
  SiteShell: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("@/components/admin-nav", () => ({
  AdminNav: () => <nav aria-label="Admin navigation" />,
}));

describe("Admin Join Request admission projection", () => {
  it("shows Active and hides stale invitation recovery once the Customer is active", () => {
    vi.mocked(useProduct).mockReturnValue({ dataSource: "convex" } as never);
    vi.mocked(useQuery).mockReturnValue([
      {
        joinRequestId: "join-1",
        name: "Accepted Reader",
        email: "accepted@example.com",
        contact: "+628123456789",
        city: "Jakarta",
        bookInterest: "Children Books",
        note: null,
        source: "website",
        acknowledged: true,
        status: "approved",
        invitationStatus: "pending",
        submittedAt: "2026-08-27T00:00:00.000Z",
        reviewedAt: "2026-08-27T00:01:00.000Z",
        reviewedByUserId: null,
        reviewNote: null,
        rejectionReason: null,
        admissionStatus: "active",
        admissionError: "stale error",
        invitationError: "stale error",
        createdAt: "2026-08-27T00:00:00.000Z",
        updatedAt: "2026-08-27T00:01:00.000Z",
      },
    ] as never);

    render(<AdminJoinRequestsPage />);

    expect(screen.getByText("Aktif")).toBeTruthy();
    expect(screen.getByText("Customer sudah menjadi Blessfriend.")).toBeTruthy();
    expect(screen.queryByText("Disetujui. Undangan sedang diproses.")).toBeNull();
    expect(screen.queryByRole("button", { name: /undangan/i })).toBeNull();
    expect(screen.queryByRole("button", { name: "Coba lagi" })).toBeNull();
    expect(useMutation).toHaveBeenCalled();
  });
});
