import type { ReactNode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuth } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import JoinPage from "@/app/join/page";
import { useProduct } from "@/domain/prototype/store";

vi.mock("@clerk/nextjs", () => ({ useAuth: vi.fn() }));
vi.mock("convex/react", () => ({ useMutation: vi.fn(), useQuery: vi.fn() }));
vi.mock("@/components/brand", () => ({ BrandMascot: () => null }));
vi.mock("@/components/site-shell", () => ({ SiteShell: ({ children }: { children: ReactNode }) => children }));
vi.mock("@/domain/prototype/store", () => ({ useProduct: vi.fn() }));

beforeEach(() => {
  vi.mocked(useAuth).mockReturnValue({ isLoaded: true, isSignedIn: true } as never);
  vi.mocked(useProduct).mockReturnValue({
    dataSource: "convex",
    authState: "admission-required",
    retryAuth: vi.fn(),
  } as never);
  vi.mocked(useMutation).mockReturnValue(vi.fn() as never);
  vi.mocked(useQuery).mockReturnValue([] as never);
});

describe("Join Blessfriends admission entry", () => {
  it("keeps a signed-in non-member on the real Join form", () => {
    render(<JoinPage />);

    expect(screen.getByRole("heading", { name: "Ceritakan cara terbaik untuk menghubungimu." })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Kirim permintaan" })).toBeTruthy();
  });

  it("shows a pending request instead of another submit button", () => {
    vi.mocked(useQuery).mockReturnValue([{ status: "submitted", admissionStatus: "pending" }] as never);

    render(<JoinPage />);

    expect(screen.getByRole("heading", { name: "Permintaanmu sedang ditinjau." })).toBeTruthy();
    expect(screen.getByText("Tim BFG akan mengabari setelah proses peninjauan selesai.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Kirim permintaan" })).toBeNull();
  });

  it("submits the public form while signed out and accepts expanded interests", async () => {
    vi.mocked(useAuth).mockReturnValue({ isLoaded: true, isSignedIn: false } as never);
    const submit = vi.fn().mockResolvedValue({ whatsappGroupUrl: null });
    vi.mocked(useMutation).mockReturnValue(submit as never);

    render(<JoinPage />);
    const textboxes = screen.getAllByRole("textbox");
    fireEvent.change(textboxes[0], { target: { value: "Signed Out Reader" } });
    fireEvent.change(textboxes[1], { target: { value: "signed-out@example.com" } });
    fireEvent.change(textboxes[2], { target: { value: "+62 811 2222 3333" } });
    fireEvent.change(textboxes[3], { target: { value: "Jakarta" } });
    fireEvent.click(screen.getByRole("combobox"));
    fireEvent.click(screen.getByRole("option", { name: "Photography" }));
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Kirim permintaan" }));

    await waitFor(() => expect(screen.getByRole("heading", { name: "Permintaanmu sudah dikirim." })).toBeTruthy());
    expect(submit).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "signed-out@example.com",
        bookInterest: "Photography",
        acknowledged: true,
      }),
    );
  });

  it("shows a precise duplicate state instead of the generic join error", async () => {
    const submit = vi.fn().mockRejectedValue(new Error("JOIN_REQUEST_DUPLICATE"));
    vi.mocked(useMutation).mockReturnValue(submit as never);
    render(<JoinPage />);
    const textboxes = screen.getAllByRole("textbox");
    fireEvent.change(textboxes[0], { target: { value: "Pending Reader" } });
    fireEvent.change(textboxes[1], { target: { value: "pending@example.com" } });
    fireEvent.change(textboxes[2], { target: { value: "+62 811 2222 3334" } });
    fireEvent.change(textboxes[3], { target: { value: "Jakarta" } });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Kirim permintaan" }));

    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toContain("Permintaan untuk email ini masih menunggu tinjauan."),
    );
  });
});
