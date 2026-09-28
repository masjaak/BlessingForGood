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
      <HomeOnboarding tutorialVideoUrl={null} />
    </ProductContext.Provider>,
  );
}

describe("Homepage Blessfriend onboarding", () => {
  it("welcomes signed-out visitors, explains both requirements, and links to the existing flows", () => {
    renderOnboarding();

    expect(screen.getByRole("region", { name: "Selamat datang di Blessing For Good" })).toBeTruthy();
    expect(screen.getByText(/mengakses Secret Catalog BFG, ada dua langkah/)).toBeTruthy();
    expect(screen.getByText(/bergabung ke WhatsApp Group BFG dan mendaftar sebagai Blessfriend/)).toBeTruthy();
    expect(
      screen.getByText(/WhatsApp digunakan untuk update buku, informasi PO, dan akses Secret Catalog/),
    ).toBeTruthy();
    expect(document.querySelector(".home-onboarding-mascot")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Gabung Blessfriends" }).getAttribute("href")).toBe("/join");
    expect(screen.getByRole("link", { name: "Pelajari cara pesan" }).getAttribute("href")).toBe("/how-to-order");
    expect(screen.getByRole("button", { name: "Tutup informasi selamat datang" })).toBeTruthy();
  });

  it("shows contextual onboarding for a signed-in applicant who has not applied", () => {
    renderOnboarding({
      hydrated: true,
      authState: "admission-required",
      membershipState: "NO_APPLICATION",
      sessionRole: null,
    });

    expect(screen.getByRole("region", { name: "Selamat datang di Blessing For Good" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Gabung Blessfriends" }).getAttribute("href")).toBe("/join");
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
    expect(screen.queryByRole("link", { name: "Gabung Blessfriends" })).toBeNull();
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
    expect(screen.queryByRole("link", { name: "Gabung Blessfriends" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Minta link WhatsApp Group" })).toBeNull();
  });

  it("does not show onboarding content to an active Customer", () => {
    const { container } = renderOnboarding({
      hydrated: true,
      authState: "authenticated",
      membershipState: "ACTIVE",
      sessionRole: "customer",
    });

    expect(container.querySelector(".home-onboarding-how-to")).toBeTruthy();
    expect(screen.queryByRole("region", { name: "Selamat datang di Blessing For Good" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Gabung Blessfriends" })).toBeNull();
  });

  it("does not offer re-registration to suspended Customers", () => {
    const { container } = renderOnboarding({
      hydrated: true,
      authState: "suspended",
      membershipState: "SUSPENDED",
      sessionRole: "customer",
    });

    expect(container.firstChild).toBeNull();
    expect(screen.queryByRole("link", { name: "Gabung Blessfriends" })).toBeNull();
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

    expect(screen.queryByRole("region", { name: "Selamat datang di Blessing For Good" })).toBeNull();
  });
});
