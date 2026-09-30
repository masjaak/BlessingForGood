import type { ReactNode } from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getFunctionName } from "convex/server";
import { useAction, useMutation, useQuery } from "convex/react";
import { useAuth } from "@clerk/nextjs";
import { AdminReadyStock } from "@/components/admin-ready-stock";

vi.mock("convex/react", () => ({ useQuery: vi.fn(), useMutation: vi.fn(), useAction: vi.fn() }));
vi.mock("@clerk/nextjs", () => ({ useAuth: vi.fn() }));
vi.mock("@/components/product-access-guard", () => ({
  ProductAccessGuard: ({ children }: { children: ReactNode }) => children,
}));
vi.mock("@/components/site-shell", () => ({ SiteShell: ({ children }: { children: ReactNode }) => children }));
vi.mock("@/components/admin-nav", () => ({ AdminNav: () => <nav aria-label="Admin navigation" /> }));

const listing = {
  listingId: "listing-1",
  id: "listing-1",
  slug: "carry-me",
  title: "Carry Me!",
  priceAmount: 195000,
  format: "PB",
  quantity: 3,
  reservedQuantity: 1,
  availableQuantity: 2,
  status: "draft",
  coverUrl: null,
  gallery: [],
  createdAt: 1,
  updatedAt: 1,
};

const purchase = {
  purchaseId: "purchase-1",
  listingId: "listing-1",
  customerUserId: "customer-1",
  customerName: "Mulia Kah",
  customerEmail: "mulia@example.com",
  memberCode: "BFG-0001",
  invoiceId: "invoice-1",
  invoiceNumber: "BFG-INV-1",
  invoiceStatus: "issued",
  paymentStatus: "paid",
  title: "Carry Me!",
  format: "PB",
  unitPriceAmount: 195000,
  quantity: 1,
  subtotalAmount: 195000,
  status: "active",
  fulfillmentStage: null,
  operationalStatus: "payment_success",
  packedAt: null,
  shippedAt: null,
  deliveredAt: null,
  createdAt: 1,
  updatedAt: 1,
};

describe("Admin standalone Ready Stock", () => {
  const create = vi.fn();
  const update = vi.fn();
  const setPublicationStatus = vi.fn();
  const setFulfillmentStage = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({ getToken: vi.fn(), sessionClaims: {} } as never);
    vi.mocked(useQuery).mockImplementation(((reference: unknown) => {
      const name = getFunctionName(reference as never);
      if (name.endsWith(":listForAdmin")) return [listing] as never;
      if (name.endsWith(":listPurchasesForAdmin")) return [purchase] as never;
      throw new Error(`Unexpected query ${name}`);
    }) as never);
    vi.mocked(useMutation).mockImplementation((reference) => {
      const name = getFunctionName(reference as never);
      if (name.endsWith(":create")) return create as never;
      if (name.endsWith(":update")) return update as never;
      if (name.endsWith(":setPublicationStatus")) return setPublicationStatus as never;
      if (name.endsWith(":setFulfillmentStage")) return setFulfillmentStage as never;
      return vi.fn() as never;
    });
    vi.mocked(useAction).mockReturnValue(vi.fn() as never);
    create.mockResolvedValue({ ...listing, listingId: "listing-new" });
    update.mockResolvedValue(listing);
    setPublicationStatus.mockResolvedValue({ status: "published" });
    setFulfillmentStage.mockResolvedValue({});
  });

  it("uses a manual etalase instead of Master Buku columns", () => {
    render(<AdminReadyStock />);

    expect(screen.getByRole("heading", { name: "Etalase stok nyata." })).toBeTruthy();
    expect(screen.getByText("Master Buku tidak digunakan")).toBeTruthy();

    const table = screen.getByRole("table", { name: "Etalase Ready Stock manual" });
    expect(within(table).getByRole("columnheader", { name: "Cover / Judul" })).toBeTruthy();
    expect(within(table).getByRole("columnheader", { name: "Harga" })).toBeTruthy();
    expect(within(table).getByRole("columnheader", { name: "QTY" })).toBeTruthy();
    expect(within(table).queryByRole("columnheader", { name: "Harga Master" })).toBeNull();
    expect(table.textContent).toContain("195.000");
    expect(table.textContent).toContain("Carry Me!");
  });

  it("creates a standalone Ready Stock draft from title, price, format, and quantity", async () => {
    render(<AdminReadyStock />);

    fireEvent.change(screen.getByLabelText("Judul"), { target: { value: "Are We Ready For A Pet?" } });
    fireEvent.change(screen.getByLabelText("Harga"), { target: { value: "225000" } });
    fireEvent.change(screen.getByLabelText("QTY tersedia"), { target: { value: "4" } });
    fireEvent.click(screen.getByRole("button", { name: "Buat Ready Stock" }));

    await waitFor(() =>
      expect(create).toHaveBeenCalledWith({
        title: "Are We Ready For A Pet?",
        priceAmount: 225000,
        format: "PB",
        quantity: 4,
        status: "draft",
      }),
    );
  });

  it("exposes photo management and publishes only through the standalone listing action", async () => {
    render(<AdminReadyStock />);

    fireEvent.click(screen.getByRole("button", { name: "Kelola foto" }));
    expect(screen.getByText("Foto etalase")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Maksimal 8 gambar" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Terbitkan" }));
    await waitFor(() =>
      expect(setPublicationStatus).toHaveBeenCalledWith({
        listingId: "listing-1",
        status: "published",
      }),
    );
  });

  it("lets Admin move a paid checkout into packing from the same Ready Stock section", async () => {
    render(<AdminReadyStock />);

    expect(screen.getByText("Pembayaran berhasil")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Mulai kemas" }));

    await waitFor(() =>
      expect(setFulfillmentStage).toHaveBeenCalledWith({
        purchaseId: "purchase-1",
        stage: "packing",
      }),
    );
  });
});
