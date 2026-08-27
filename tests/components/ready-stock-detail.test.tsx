import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useMutation } from "convex/react";
import { ReadyStockOrderAction } from "@/components/ready-stock-detail";
import { useProduct } from "@/domain/prototype/store";

vi.mock("convex/react", () => ({
  useMutation: vi.fn(),
}));

vi.mock("@/domain/prototype/store", () => ({
  useProduct: vi.fn(),
}));

const book = {
  bookId: "book-1",
  slug: "ready-book",
  title: "Ready Book",
  author: "A. Writer",
  description: "A customer-facing description.",
  publisher: { id: "publisher-1", name: "Publisher" },
  coverImageUrl: null,
  coverPresentation: null,
  gallery: [],
  externalPreview: null,
  variants: [
    {
      id: "variant-1",
      format: "PB" as const,
      isbn: "9780000000010",
      priceAmount: 125000,
      currency: "IDR" as const,
      stockQuantity: 3,
    },
  ],
} as never;

describe("Ready Stock checkout role boundary", () => {
  it.each(["admin", "owner"] as const)("does not offer Customer checkout to %s", (role) => {
    vi.mocked(useMutation).mockReturnValue(vi.fn() as never);
    vi.mocked(useProduct).mockReturnValue({ authState: "authenticated", sessionRole: role } as never);

    render(<ReadyStockOrderAction book={book} />);

    expect(screen.queryByRole("button", { name: "Pesan Ready Stock" })).toBeNull();
    expect(screen.getByRole("link", { name: "Buka Pesanan Admin" })).toBeTruthy();
  });

  it("offers checkout to an active Customer identity", () => {
    vi.mocked(useMutation).mockReturnValue(vi.fn() as never);
    vi.mocked(useProduct).mockReturnValue({ authState: "authenticated", sessionRole: "customer" } as never);

    render(<ReadyStockOrderAction book={book} />);

    expect(screen.getByRole("button", { name: "Pesan Ready Stock" })).toBeTruthy();
  });

  it.each(["loading", "convex-loading", "provisioning"] as const)(
    "does not classify %s as signed out while the session resolves",
    (authState) => {
      vi.mocked(useMutation).mockReturnValue(vi.fn() as never);
      vi.mocked(useProduct).mockReturnValue({ authState, sessionRole: null } as never);

      render(<ReadyStockOrderAction book={book} />);

      expect(screen.getByText("Menyiapkan akun BFG…")).toBeTruthy();
      expect(screen.queryByRole("link", { name: "Masuk untuk memesan" })).toBeNull();
    },
  );

  it("directs a resolved signed-in non-member to Join instead of sign-in", () => {
    vi.mocked(useMutation).mockReturnValue(vi.fn() as never);
    vi.mocked(useProduct).mockReturnValue({ authState: "admission-required", sessionRole: null } as never);

    render(<ReadyStockOrderAction book={book} />);

    expect(screen.getByRole("link", { name: "Gabung Blessfriends" }).getAttribute("href")).toBe("/join");
    expect(screen.queryByRole("link", { name: "Masuk untuk memesan" })).toBeNull();
  });

  it("offers auth retry for a terminal Convex session error", () => {
    const retryAuth = vi.fn();
    vi.mocked(useMutation).mockReturnValue(vi.fn() as never);
    vi.mocked(useProduct).mockReturnValue({ authState: "convex-error", sessionRole: null, retryAuth } as never);

    render(<ReadyStockOrderAction book={book} />);

    fireEvent.click(screen.getByRole("button", { name: "Coba lagi" }));
    expect(retryAuth).toHaveBeenCalledOnce();
  });
});
