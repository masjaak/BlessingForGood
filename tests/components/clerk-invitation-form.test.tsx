import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuth } from "@clerk/nextjs";
import { ClerkInvitationForm } from "@/components/clerk-invitation-form";

vi.mock("@clerk/nextjs", () => ({ useAuth: vi.fn() }));
vi.mock("@/components/clerk-auth-form", () => ({
  ClerkAuthForm: ({ redirectUrl }: { redirectUrl: string }) => <div data-redirect={redirectUrl}>Sign up form</div>,
}));

describe("Clerk invitation session handoff", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/sign-up?__clerk_ticket=ticket-safe");
  });

  it("offers a supported restart instead of continuing a different signed-in account", () => {
    const signOut = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useAuth).mockReturnValue({ isLoaded: true, isSignedIn: true, signOut } as never);

    render(<ClerkInvitationForm redirectUrl="/account" />);
    expect(screen.getByRole("heading", { name: "Undangan ini ditujukan untuk email lain." })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Gunakan akun yang diundang" }));

    expect(signOut).toHaveBeenCalledWith({ redirectUrl: "/sign-up?__clerk_ticket=ticket-safe" });
    expect(screen.queryByText("Sign up form")).toBeNull();
  });

  it("renders the ticket sign-up form after Clerk is signed out", () => {
    vi.mocked(useAuth).mockReturnValue({ isLoaded: true, isSignedIn: false, signOut: vi.fn() } as never);

    render(<ClerkInvitationForm redirectUrl="/account" />);
    expect(screen.getByText("Sign up form").getAttribute("data-redirect")).toBe("/account");
  });
});
