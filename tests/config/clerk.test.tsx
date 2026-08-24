import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ClerkAuthForm } from "@/components/clerk-auth-form";
import { bfgClerkLocalization } from "@/config/clerk";

vi.mock("@clerk/nextjs", () => ({
  SignIn: ({ transferable }: { transferable?: boolean }) => (
    <div data-testid="sign-in" data-transferable={String(transferable)} />
  ),
  SignUp: () => <div data-testid="sign-up" />,
}));

describe("BFG Clerk configuration", () => {
  it("does not transfer an unknown OAuth identity into opaque sign-up", () => {
    render(<ClerkAuthForm mode="sign-in" />);
    expect(screen.getByTestId("sign-in").getAttribute("data-transferable")).toBe("false");
  });

  it("localizes the unregistered-account guidance", () => {
    expect(bfgClerkLocalization.formFieldLabel__emailAddress_username).toBe("Email atau username");
    expect(bfgClerkLocalization.formFieldAction__forgotPassword).toBe("Lupa password?");
    expect(bfgClerkLocalization.unstable__errors.external_account_not_found).toContain(
      "Akun ini belum terdaftar sebagai Blessfriend.",
    );
  });
});
