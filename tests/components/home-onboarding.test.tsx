import { render, screen } from "@testing-library/react";
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

function renderOnboarding(
  product: unknown = signedOutProduct,
  props: { whatsappGroupUrl?: string | null; tutorialVideoUrl?: string | null } = {},
) {
  return render(
    <ProductContext.Provider value={product as never}>
      <HomeOnboarding whatsappGroupUrl="https://chat.whatsapp.com/bfg-group" tutorialVideoUrl={null} {...props} />
    </ProductContext.Provider>,
  );
}

describe("Homepage social entry onboarding", () => {
  it("explains both entry steps and opens the configured WhatsApp/tutorial links safely", () => {
    renderOnboarding(signedOutProduct, {
      tutorialVideoUrl: "https://drive.google.com/file/d/bfg-tutorial/view",
    });

    expect(screen.getByRole("heading", { name: "Mulai dari komunitas BFG." })).toBeTruthy();
    expect(screen.getByText("Gabung grup WhatsApp BFG")).toBeTruthy();
    expect(screen.getByText("Daftar sebagai Blessfriend di website")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Gabung Grup WhatsApp" })).toMatchObject({
      href: "https://chat.whatsapp.com/bfg-group",
      target: "_blank",
      rel: "noopener noreferrer",
    });
    expect(screen.getByRole("link", { name: "Daftar sebagai Blessfriend" }).getAttribute("href")).toBe("/join");
    expect(screen.getByRole("link", { name: "Tonton Video Cara Pesan ↗" })).toMatchObject({
      href: "https://drive.google.com/file/d/bfg-tutorial/view",
      target: "_blank",
      rel: "noopener noreferrer",
    });
  });

  it("does not prompt pending or active customers to submit a duplicate join request", () => {
    const pendingProduct = {
      hydrated: true,
      authState: "admission-required",
      membershipState: "PENDING",
      sessionRole: null,
    } as never;
    const { unmount } = renderOnboarding(pendingProduct);
    expect(screen.getByRole("heading", { name: "Permintaanmu sedang ditinjau." })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Daftar sebagai Blessfriend" })).toBeNull();
    unmount();

    const activeProduct = {
      hydrated: true,
      authState: "authenticated",
      membershipState: "ACTIVE",
      sessionRole: "customer",
    } as never;
    renderOnboarding(activeProduct, { whatsappGroupUrl: null });
    expect(screen.getByRole("heading", { name: "Lanjutkan perjalanan bukumu." })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Daftar sebagai Blessfriend" })).toBeNull();
  });

  it("does not show customer onboarding actions to Admin", () => {
    const adminProduct = {
      hydrated: true,
      authState: "authenticated",
      membershipState: "ACTIVE",
      sessionRole: "admin",
    } as never;

    const { container } = renderOnboarding(adminProduct);
    expect(container.firstChild).toBeNull();
  });
});
