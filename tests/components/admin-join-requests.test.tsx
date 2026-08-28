import { fireEvent, render, screen } from "@testing-library/react";
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
        removedAt: null,
        removedByUserId: null,
        removedByName: null,
        removalReason: null,
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
    expect(screen.getByRole("button", { name: "Remove member" })).toBeTruthy();
    expect(useMutation).toHaveBeenCalled();
  });

  it("confirms removal and renders the historical removed state", () => {
    HTMLDialogElement.prototype.showModal = function showModal() {
      this.open = true;
    };
    vi.mocked(useProduct).mockReturnValue({ dataSource: "convex" } as never);
    vi.mocked(useQuery).mockReturnValue([
      {
        joinRequestId: "join-removed",
        name: "Removed Reader",
        email: "removed@example.com",
        contact: "+628123456789",
        city: "Jakarta",
        bookInterest: "Children Books",
        note: null,
        source: "website",
        acknowledged: true,
        status: "approved",
        invitationStatus: "accepted",
        submittedAt: "2026-08-27T00:00:00.000Z",
        reviewedAt: "2026-08-27T00:01:00.000Z",
        reviewedByUserId: null,
        reviewNote: null,
        rejectionReason: null,
        removedAt: "2026-08-27T00:02:00.000Z",
        removedByUserId: "admin-1",
        removedByName: "Admin BFG",
        removalReason: null,
        admissionStatus: "removed",
        admissionError: null,
        invitationError: null,
        createdAt: "2026-08-27T00:00:00.000Z",
        updatedAt: "2026-08-27T00:02:00.000Z",
      },
    ] as never);

    render(<AdminJoinRequestsPage />);

    expect(screen.getByText("Dihapus dari membership")).toBeTruthy();
    expect(screen.getByText("Customer bukan Blessfriend aktif.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Remove member" })).toBeNull();
    expect(screen.queryByText("Customer sudah menjadi Blessfriend.")).toBeNull();
  });

  it("opens the destructive confirmation dialog", () => {
    HTMLDialogElement.prototype.showModal = function showModal() {
      this.open = true;
    };
    vi.mocked(useProduct).mockReturnValue({ dataSource: "convex" } as never);
    vi.mocked(useQuery).mockReturnValue([
      {
        joinRequestId: "join-confirm",
        name: "Confirm Reader",
        email: "confirm@example.com",
        contact: "+628123456789",
        city: "Jakarta",
        bookInterest: "Children Books",
        note: null,
        source: "website",
        acknowledged: true,
        status: "approved",
        invitationStatus: "accepted",
        submittedAt: "2026-08-27T00:00:00.000Z",
        reviewedAt: null,
        reviewedByUserId: null,
        reviewNote: null,
        rejectionReason: null,
        removedAt: null,
        removedByUserId: null,
        removedByName: null,
        removalReason: null,
        admissionStatus: "active",
        admissionError: null,
        invitationError: null,
        createdAt: "2026-08-27T00:00:00.000Z",
        updatedAt: "2026-08-27T00:00:00.000Z",
      },
    ] as never);

    render(<AdminJoinRequestsPage />);
    fireEvent.click(screen.getByRole("button", { name: "Remove member" }));

    expect(screen.getByRole("heading", { name: "Remove member?" })).toBeTruthy();
    expect(screen.getByText(/Riwayat pesanan, tagihan, Batch, deposit, dan aktivitas tetap disimpan/)).toBeTruthy();
  });

  it("keeps approved existing identities in the canonical email activation lifecycle", () => {
    vi.mocked(useProduct).mockReturnValue({ dataSource: "convex" } as never);
    vi.mocked(useQuery).mockReturnValue([
      {
        joinRequestId: "join-existing",
        name: "Existing Reader",
        email: "existing@example.com",
        contact: "+628123456789",
        city: "Jakarta",
        bookInterest: "Children Books",
        note: null,
        source: "website",
        acknowledged: true,
        status: "approved",
        invitationStatus: "sent",
        submittedAt: "2026-08-27T00:00:00.000Z",
        reviewedAt: "2026-08-27T00:01:00.000Z",
        reviewedByUserId: null,
        reviewNote: null,
        rejectionReason: null,
        removedAt: null,
        removedByUserId: null,
        removedByName: null,
        removalReason: null,
        admissionStatus: "invitation_pending",
        admissionError: null,
        invitationError: null,
        createdAt: "2026-08-27T00:00:00.000Z",
        updatedAt: "2026-08-27T00:01:00.000Z",
      },
    ] as never);

    render(<AdminJoinRequestsPage />);

    expect(
      screen.getByText("Disetujui. Panduan aktivasi sudah dikirim ke Customer. Menunggu aktivasi selesai."),
    ).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Masuk dengan akun BFG" })).toBeNull();
    expect(screen.queryByText("Aktif")).toBeNull();
    expect(screen.queryByRole("button", { name: /kirim.*undangan/i })).toBeNull();
  });
});
