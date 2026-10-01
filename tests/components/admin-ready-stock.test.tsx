import type { ReactNode } from "react";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getFunctionName } from "convex/server";
import { useAction, useMutation, useQuery } from "convex/react";
import { AdminReadyStock } from "@/components/admin-ready-stock";
import { uploadBfgFile } from "@/lib/upload-file";

vi.mock("@/lib/upload-file", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/upload-file")>()),
  uploadBfgFile: vi.fn().mockResolvedValue("storage-upload"),
}));

vi.mock("convex/react", () => ({ useQuery: vi.fn(), useMutation: vi.fn(), useAction: vi.fn() }));
vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({ getToken: vi.fn(), sessionClaims: null }),
}));
vi.mock("@/components/product-access-guard", () => ({
  ProductAccessGuard: ({ children }: { children: ReactNode }) => children,
}));
vi.mock("@/components/site-shell", () => ({ SiteShell: ({ children }: { children: ReactNode }) => children }));
vi.mock("@/components/admin-nav", () => ({ AdminNav: () => <nav aria-label="Admin navigation" /> }));

const listing = {
  listingId: "listing-1",
  slug: "real-ready-book",
  title: "Real Ready Book",
  description: "Foto asli dan deskripsi Ready Stock.",
  priceAmount: 195000,
  format: "PB",
  quantity: 3,
  reservedQuantity: 1,
  availableQuantity: 2,
  status: "published",
  coverImageUrl: "https://example.com/cover.webp",
  gallery: [],
  createdAt: 1,
  updatedAt: 1,
};

const paidOrder = {
  orderId: "ready-order-1",
  listingId: "listing-1",
  invoiceId: "invoice-1",
  customerUserId: "customer-1",
  customerName: "Mulia Kah",
  customerEmail: "mulia@example.com",
  customerMemberCode: "BFG-0001",
  title: "Real Ready Book",
  format: "PB",
  unitPriceAmount: 195000,
  quantity: 1,
  totalAmount: 195000,
  operationalStatus: "paid",
  timeline: [],
  invoiceNumber: "BFG-INV-260930-0001",
  invoiceStatus: "issued",
  paymentStatus: "paid",
  outstandingAmount: 0,
  shippingAddress: {
    recipientName: "Mulia Kah",
    recipientPhone: "0812",
    addressLine1: "Jl Test",
    addressLine2: null,
    city: "Semarang",
    province: "Jawa Tengah",
    postalCode: "50100",
  },
  createdAt: 1,
  updatedAt: 1,
};

describe("Admin standalone Ready Stock", () => {
  const create = vi.fn();
  const update = vi.fn();
  const updateStage = vi.fn();
  const attachCover = vi.fn();
  const attachGallery = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    create.mockResolvedValue({ listingId: "listing-new", slug: "new-item" });
    update.mockResolvedValue({});
    updateStage.mockResolvedValue({});
    vi.mocked(useAction).mockImplementation(
      (reference) =>
        (getFunctionName(reference as never).endsWith("attachCover") ? attachCover : attachGallery) as never,
    );
    vi.mocked(useQuery).mockImplementation((...args: Parameters<typeof useQuery>) => {
      const [reference] = args;
      const name = getFunctionName(reference as never);
      if (name.endsWith("readyStockListings:listForAdmin")) return [listing] as never;
      if (name.endsWith("readyStockOrders:listForAdmin")) return [paidOrder] as never;
      if (name.endsWith("readyStockListings:getForAdmin")) return listing as never;
      throw new Error(`Unexpected query: ${name}`);
    });
    vi.mocked(useMutation).mockImplementation((reference) => {
      const name = getFunctionName(reference as never);
      if (name.endsWith("readyStockListings:create")) return create as never;
      if (name.endsWith("readyStockListings:update")) return update as never;
      if (name.endsWith("readyStockOrders:updateStage")) return updateStage as never;
      return vi.fn() as never;
    });
  });

  it("shows a manual storefront table with no Master price dependency", () => {
    const { container } = render(<AdminReadyStock />);
    const table = screen.getByRole("table", { name: "Etalase Ready Stock manual" });
    expect(within(table).getByRole("columnheader", { name: "Judul" })).toBeTruthy();
    expect(within(table).getByRole("columnheader", { name: "Harga" })).toBeTruthy();
    expect(within(table).queryByRole("columnheader", { name: "Harga Master" })).toBeNull();
    expect(table.textContent).toContain("Real Ready Book");
    expect(table.textContent).toContain("195.000");
    expect(container.querySelectorAll("tbody > tr > td")).toHaveLength(8);
  });

  it("creates a manual draft from title price format and quantity", async () => {
    render(<AdminReadyStock />);
    fireEvent.click(screen.getByRole("button", { name: "Tambah Ready Stock" }));

    const fields = screen.getByText("Tambah ke etalase Ready Stock").closest(".card") as HTMLElement;
    fireEvent.change(within(fields).getByLabelText("Judul"), { target: { value: "New Real Book" } });
    fireEvent.change(within(fields).getByLabelText("Deskripsi"), {
      target: { value: "Deskripsi singkat untuk etalase." },
    });
    fireEvent.change(within(fields).getByLabelText("Harga"), { target: { value: "225000" } });
    fireEvent.change(within(fields).getByLabelText("Qty tersedia"), { target: { value: "4" } });
    await act(async () => fireEvent.click(within(fields).getByRole("button", { name: "Buat draf Ready Stock" })));

    expect(create).toHaveBeenCalledWith({
      title: "New Real Book",
      description: "Deskripsi singkat untuk etalase.",
      priceAmount: 225000,
      format: "PB",
      quantity: 4,
    });
  });

  it("opens the product editor with cover and max-eight gallery controls", () => {
    render(<AdminReadyStock />);
    fireEvent.click(screen.getByRole("button", { name: "Kelola" }));
    expect(screen.getByText("Data ini berdiri sendiri dan tidak mengubah Master Buku.")).toBeTruthy();
    expect(screen.getByDisplayValue("Foto asli dan deskripsi Ready Stock.")).toBeTruthy();
    expect(screen.getByText("0/8")).toBeTruthy();
    expect(screen.getByLabelText("Pilih file cover")).toBeTruthy();
    expect(screen.getByLabelText("Pilih gambar isi Ready Stock")).toBeTruthy();
  });

  it("advances a paid order into packing from the Ready Stock workspace", async () => {
    render(<AdminReadyStock />);
    fireEvent.click(screen.getByRole("button", { name: "Mulai kemas" }));

    await waitFor(() =>
      expect(updateStage).toHaveBeenCalledWith({
        orderId: "ready-order-1",
        stage: "packing",
      }),
    );
    expect(await screen.findByText("Status diperbarui: Paket sedang dikemas Blessy.")).toBeTruthy();
  });

  it("edits standalone price quantity and publication status", async () => {
    render(<AdminReadyStock />);
    fireEvent.click(screen.getByRole("button", { name: "Kelola" }));
    const editor = screen.getByText("Data ini berdiri sendiri dan tidak mengubah Master Buku.").closest(".card")!;
    fireEvent.change(within(editor as HTMLElement).getByLabelText("Deskripsi"), {
      target: { value: "Deskripsi Ready Stock diperbarui." },
    });
    fireEvent.change(within(editor as HTMLElement).getByLabelText("Harga"), { target: { value: "210000" } });
    fireEvent.change(within(editor as HTMLElement).getByLabelText(/Qty tersedia/), { target: { value: "5" } });
    await act(async () => fireEvent.click(within(editor as HTMLElement).getByRole("button", { name: "Simpan data" })));
    expect(update).toHaveBeenCalledWith({
      listingId: "listing-1",
      title: "Real Ready Book",
      description: "Deskripsi Ready Stock diperbarui.",
      priceAmount: 210000,
      format: "PB",
      quantity: 5,
      status: "published",
    });
    expect(screen.getByRole("status").textContent).toContain("berhasil diperbarui");
  });

  it("uploads cover and gallery through the existing guarded upload boundary", async () => {
    render(<AdminReadyStock />);
    fireEvent.click(screen.getByRole("button", { name: "Kelola" }));
    const file = new File(["component fixture"], "photo.webp", { type: "image/webp" });
    fireEvent.change(screen.getByLabelText("Pilih file cover"), { target: { files: [file] } });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Simpan cover" })));
    expect(uploadBfgFile).toHaveBeenCalledWith(file, "book-cover", expect.any(Function), null);
    expect(attachCover).toHaveBeenCalledWith({
      listingId: "listing-1",
      storageId: "storage-upload",
      fileName: "photo.webp",
      mimeType: "image/webp",
    });
    fireEvent.change(screen.getByLabelText("Pilih gambar isi Ready Stock"), { target: { files: [file] } });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Upload gambar isi" })));
    expect(attachGallery).toHaveBeenCalledWith({
      listingId: "listing-1",
      storageId: "storage-upload",
      fileName: "photo.webp",
      mimeType: "image/webp",
      altText: "Real Ready Book",
    });
  });

  it("sends storefront and order search filters to their separate queries", () => {
    render(<AdminReadyStock />);
    fireEvent.change(screen.getByLabelText("Cari Ready Stock"), { target: { value: "photo" } });
    fireEvent.change(screen.getByLabelText("Cari pesanan"), { target: { value: "BFG-0001" } });
    const calls = vi.mocked(useQuery).mock.calls.map(([ref, args]) => ({ name: getFunctionName(ref as never), args }));
    expect(calls).toContainEqual({
      name: "readyStockListings:listForAdmin",
      args: { search: "photo", status: undefined },
    });
    expect(calls).toContainEqual({
      name: "readyStockOrders:listForAdmin",
      args: { search: "BFG-0001", status: undefined },
    });
    expect(screen.queryByRole("button", { name: "Tandai sampai" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Tandai dikirim" })).toBeNull();
  });
});
