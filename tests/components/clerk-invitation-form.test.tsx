import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuth, useUser } from "@clerk/nextjs";
import { ClerkInvitationForm } from "@/components/clerk-invitation-form";

vi.mock("@clerk/nextjs", () => ({ useAuth: vi.fn(), useUser: vi.fn() }));
vi.mock("@/components/clerk-auth-form", () => ({
  ClerkAuthForm: ({ redirectUrl }: { redirectUrl: string }) => <div data-redirect={redirectUrl}>Sign up form</div>,
}));

describe("Clerk invitation session handoff", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/sign-up?__clerk_ticket=ticket-safe");
    vi.mocked(useUser).mockReturnValue({ isLoaded: true, user: null } as never);
  });

  it("offers a supported restart instead of continuing a different signed-in account", () => {
    const signOut = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useAuth).mockReturnValue({ isLoaded: true, isSignedIn: true, signOut } as never);
    vi.mocked(useUser).mockReturnValue({
      isLoaded: true,
      user: {
        primaryEmailAddress: {
          emailAddress: "current@example.com",
          verification: { status: "verified" },
        },
      },
    } as never);

    render(<ClerkInvitationForm redirectUrl="/account" invitedEmail="target@example.com" />);
    expect(screen.getByRole("heading", { name: "Undangan ini ditujukan untuk akun lain." })).toBeTruthy();
    expect(screen.getByText("Saat ini kamu masuk sebagai: c***@example.com")).toBeTruthy();
    expect(screen.getByText("Undangan ditujukan untuk: t***@example.com")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Gunakan akun yang diundang" }));

    expect(signOut).toHaveBeenCalledWith({ redirectUrl: "/sign-up?__clerk_ticket=ticket-safe" });
    expect(screen.queryByText("Sign up form")).toBeNull();
  });

  it("does not show mismatch when the verified current email matches the invitation", () => {
    vi.mocked(useAuth).mockReturnValue({ isLoaded: true, isSignedIn: true, signOut: vi.fn() } as never);
    vi.mocked(useUser).mockReturnValue({
      isLoaded: true,
      user: {
        primaryEmailAddress: {
          emailAddress: "Target@Example.com",
          verification: { status: "verified" },
        },
      },
    } as never);

    render(<ClerkInvitationForm redirectUrl="/account" invitedEmail="target@example.com" />);

    expect(screen.getByRole("heading", { name: "Undangan cocok dengan akun BFG ini." })).toBeTruthy();
    expect(screen.queryByText("Undangan ini ditujukan untuk akun lain.")).toBeNull();
  });

  it("renders the ticket sign-up form after Clerk is signed out", () => {
    vi.mocked(useAuth).mockReturnValue({ isLoaded: true, isSignedIn: false, signOut: vi.fn() } as never);

    render(<ClerkInvitationForm redirectUrl="/account" />);
    expect(screen.getByText("Sign up form").getAttribute("data-redirect")).toBe("/account");
  });
});
