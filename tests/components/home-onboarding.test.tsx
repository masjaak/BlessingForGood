import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HomeOnboarding } from "@/components/home-onboarding";
import { ProductContext } from "@/domain/prototype/context";

vi.mock("@/components/brand", () => ({
  BrandMascot: ({ className = "" }: { className?: string }) => <span className={className} aria-hidden="true" />,
}));

const signedOutProduct = {
  hydrated: true,
  authState: "signed-out",
  membershipState: "AUTH_LOADING",
  sessionRole: null,
} as never;

function renderOnboarding(product: unknown = signedOutProduct) {
  return render(
    <ProductContext.Provider value={product as never}>
      <HomeOnboarding />
    </ProductContext.Provider>,
  );
}

describe("Homepage Blessfriend onboarding", () => {
  it("shows the Blessfriend account guidance and the existing Join Request entry", () => {
    renderOnboarding();

    expect(screen.getByRole("region", { name: "Buat account website untuk Blessfriends" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Buat account website untuk Blessfriends" })).toBeTruthy();
    expect(
      screen.getByText(
        "wajib jika ingin melihat katalog PO berjalan, memesan buku, dan check perjalanan buku baik fix di group / pembelian di website",
      ),
    ).toBeTruthy();
    expect(
      screen.queryByText("Untuk menjadi Blessfriend, bergabung ke WhatsApp Group BFG dan daftar melalui website."),
    ).toBeNull();
    expect(document.querySelector(".home-onboarding-mascot")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Daftar Blessfriend" }).getAttribute("href")).toBe("/join");
    expect(screen.getByRole("button", { name: "Tutup informasi selamat datang" })).toBeTruthy();
    const guide = screen.getByText("Cara Pesan & Cek Katalog PO", { exact: true }).closest("details");
    expect(guide).not.toBeNull();
    fireEvent.click(guide!.querySelector("summary")!);
    expect(screen.getByRole("list", { name: "Langkah cara memesan" }).querySelectorAll("li")).toHaveLength(7);
  });

  it("shows contextual onboarding for a signed-in applicant who has not applied", () => {
    renderOnboarding({
      hydrated: true,
      authState: "admission-required",
      membershipState: "NO_APPLICATION",
      sessionRole: null,
    });

    expect(screen.getByRole("region", { name: "Buat account website untuk Blessfriends" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Daftar Blessfriend" }).getAttribute("href")).toBe("/join");
  });

  it("shows accepted-request and WhatsApp guidance without another Join CTA", () => {
    renderOnboarding({
      hydrated: true,
      authState: "admission-required",
      membershipState: "PENDING",
      sessionRole: null,
    });

    expect(screen.getByRole("heading", { name: "Pendaftaranmu sudah diterima." })).toBeTruthy();
    expect(
      screen.getByText("Pastikan kamu sudah bergabung ke WhatsApp Group BFG. Admin akan memeriksa pendaftaranmu."),
    ).toBeTruthy();
    const whatsapp = screen.getByRole("link", { name: "Minta link WhatsApp Group" });
    expect(whatsapp.getAttribute("href")).toMatch(/^https:\/\/wa\.me\/6282347278881\?text=/);
    expect(whatsapp.getAttribute("target")).toBe("_blank");
    expect(whatsapp.getAttribute("rel")).toBe("noopener noreferrer");
    expect(screen.queryByRole("link", { name: "Daftar Blessfriend" })).toBeNull();
  });

  it("shows invitation activation guidance without a Join or WhatsApp CTA", () => {
    renderOnboarding({
      hydrated: true,
      authState: "admission-required",
      membershipState: "APPROVED_INVITATION_PENDING",
      sessionRole: null,
    });

    expect(screen.getByRole("heading", { name: "Pendaftaranmu sudah disetujui." })).toBeTruthy();
    expect(screen.getByText("Cek email untuk menyelesaikan aktivasi akun.")).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Daftar Blessfriend" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Minta link WhatsApp Group" })).toBeNull();
  });

  it("shows the account context to an active Customer without a registration CTA", () => {
    renderOnboarding({
      hydrated: true,
      authState: "authenticated",
      membershipState: "ACTIVE",
      sessionRole: "customer",
    });

    expect(screen.getByRole("region", { name: "Account Blessfriend" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Buka account Blessfriend" }).getAttribute("href")).toBe("/account");
    expect(screen.queryByRole("link", { name: "Daftar Blessfriend" })).toBeNull();
  });

  it("shows suspended account guidance without a registration bypass", () => {
    renderOnboarding({
      hydrated: true,
      authState: "suspended",
      membershipState: "SUSPENDED",
      sessionRole: "customer",
    });

    expect(screen.getByRole("region", { name: "Account Blessfriend" })).toBeTruthy();
    expect(screen.getByText("Akun Blessfriend ini sedang ditangguhkan.")).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Daftar Blessfriend" })).toBeNull();
  });

  it.each(["admin", "owner"] as const)("keeps %s outside Customer onboarding", (role) => {
    const { container } = renderOnboarding({
      hydrated: true,
      authState: "authenticated",
      membershipState: "ACTIVE",
      sessionRole: role,
    });

    expect(container.firstChild).toBeNull();
  });

  it("dismisses the Welcome announcement with its accessible close button", () => {
    renderOnboarding();

    fireEvent.click(screen.getByRole("button", { name: "Tutup informasi selamat datang" }));

    expect(screen.queryByRole("region", { name: "Buat account website untuk Blessfriends" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Daftar Blessfriend" })).toBeNull();
  });
});
