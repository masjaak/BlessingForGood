import type { ReactNode } from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getFunctionName } from "convex/server";
import { useMutation, useQuery } from "convex/react";
import { useOperations } from "@/domain/prototype/operations-context";
import AdminInvoicesPage from "@/app/admin/invoices/page";

vi.mock("convex/react", () => ({ useQuery: vi.fn(), useMutation: vi.fn() }));
vi.mock("next/navigation", () => ({
  useSearchParams: () => ({ get: () => null }),
}));
vi.mock("@/domain/prototype/operations-context", () => ({ useOperations: vi.fn() }));
vi.mock("@/components/admin-nav", () => ({ AdminNav: () => <nav /> }));
vi.mock("@/components/product-access-guard", () => ({
  ProductAccessGuard: ({ children }: { children: ReactNode }) => children,
}));
vi.mock("@/components/site-shell", () => ({
  SiteShell: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}));

const candidate = (id: string, eligible: boolean, outstandingAmount: number) => ({
  invoiceId: id,
  invoiceNumber: `BFG-INV-261013-${id}`,
  customerName: `Customer ${id}`,
  memberCode: `BF-${id}`,
  batchName: "Cargo 2",
  depositRequiredAmount: 75000,
  outstandingAmount,
  canSend: eligible,
  reason: eligible ? null : "Pengingat sudah dikirim. Tunggu 24 jam sebelum mengirim lagi.",
  lastSentAt: eligible ? null : Date.now() - 1000,
  nextAllowedAt: eligible ? null : Date.now() + 86000000,
});

const reminderList = {
  page: [candidate("0001", true, 200000), candidate("0002", true, 150000), candidate("0003", false, 125000)],
  isDone: true,
  continueCursor: "",
};

describe("BFG-TCK-003 bulk settlement reminder UI", () => {
  const send = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    send.mockResolvedValue({ sent: true });
    vi.mocked(useOperations).mockReturnValue({
      adminInvoiceList: { page: [], isDone: true, continueCursor: "" },
      sessionRole: "admin",
    } as never);
    vi.mocked(useQuery).mockImplementation((query, ..._args) => {
      const name = getFunctionName(query as never);
      if (name.endsWith("invoiceReminders:listForAdmin")) return reminderList as never;
      if (name.endsWith("invoices:listReadyForIssuance")) {
        return { page: [], isDone: true, continueCursor: "" } as never;
      }
      if (name.endsWith("orders:listEligibleCustomers") || name.endsWith("batches:listForAdmin")) {
        return { page: [], isDone: true, continueCursor: "" } as never;
      }
      return undefined as never;
    });
    vi.mocked(useMutation).mockImplementation((mutation) => {
      const name = getFunctionName(mutation as never);
      if (name.endsWith("invoiceReminders:send")) return send as never;
      return vi.fn() as never;
    });
    HTMLDialogElement.prototype.showModal = function () {
      this.open = true;
    };
  });

  it("puts the reminder workflow first and separates it from invoice issuance", () => {
    render(<AdminInvoicesPage />);
    const reminderTab = screen.getByRole("tab", { name: /Pengingat Pelunasan/ });
    const issuanceTab = screen.getByRole("tab", { name: /Penerbitan Invoice/ });
    expect(reminderTab.getAttribute("aria-selected")).toBe("true");
    expect(issuanceTab.getAttribute("aria-selected")).toBe("false");
    expect(screen.getByRole("heading", { name: "Pengingat pelunasan massal" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Antrian invoice siap terbit" })).toBeNull();
    fireEvent.click(issuanceTab);
    expect(issuanceTab.getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("heading", { name: "Antrian invoice siap terbit" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Pengingat pelunasan massal" })).toBeNull();
    fireEvent.click(reminderTab);
    expect(screen.getByRole("heading", { name: "Pengingat pelunasan massal" })).toBeTruthy();
  });

  it("selects eligible invoices only and confirms each individual reminder", async () => {
    render(<AdminInvoicesPage />);
    const all = screen.getByRole("checkbox", { name: "Pilih semua invoice eligible pada halaman ini" });
    fireEvent.click(all);
    expect(all).toHaveProperty("checked", true);
    const blocked = screen.getByRole("checkbox", {
      name: /Pilih pengingat BFG-INV-261013-0003/,
    });
    expect(blocked).toHaveProperty("disabled", true);
    expect(blocked).toHaveProperty("checked", false);
    expect(screen.getByText(/2 dipilih/)).toBeTruthy();
    expect(screen.getByText(/350.000/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Ingatkan Pelunasan Terpilih" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(/Kirim 2 notifikasi internal/)).toBeTruthy();
    fireEvent.click(within(dialog).getByRole("button", { name: "Kirim 2 pengingat" }));
    await waitFor(() => expect(send).toHaveBeenCalledTimes(2));
    expect(send.mock.calls.map((call) => call[0])).toEqual([{ invoiceId: "0001" }, { invoiceId: "0002" }]);
    expect(screen.getByText("2 pengingat berhasil dikirim.")).toBeTruthy();
  });

  it("keeps only failed eligible invoices selected for safe retry", async () => {
    send.mockRejectedValueOnce(new Error("Temporary failure"));
    render(<AdminInvoicesPage />);
    fireEvent.click(screen.getByRole("checkbox", { name: "Pilih semua invoice eligible pada halaman ini" }));
    fireEvent.click(screen.getByRole("button", { name: "Ingatkan Pelunasan Terpilih" }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Kirim 2 pengingat" }));
    await waitFor(() => expect(send).toHaveBeenCalledTimes(2));
    expect(screen.getByText(/1 pengingat berhasil dikirim, 1 gagal/)).toBeTruthy();
    expect(screen.getByRole("checkbox", { name: /Pilih pengingat BFG-INV-261013-0001/ })).toHaveProperty(
      "checked",
      true,
    );
    expect(screen.getByRole("checkbox", { name: /Pilih pengingat BFG-INV-261013-0002/ })).toHaveProperty(
      "checked",
      false,
    );
  });

  it("requires explicit selection before enabling bulk reminders", () => {
    render(<AdminInvoicesPage />);
    expect(screen.getByRole("button", { name: "Ingatkan Pelunasan Terpilih" })).toHaveProperty("disabled", true);
    expect(screen.getAllByTestId("settlement-reminder-row")).toHaveLength(3);
  });
});
