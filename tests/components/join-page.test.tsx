import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
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
    expect(screen.getByText("Tim BFG akan mengabari setelah proses review selesai.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Kirim permintaan" })).toBeNull();
  });
});
