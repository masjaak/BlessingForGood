import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuth, useSignUp } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { ClerkInvitationAcceptance } from "@/components/clerk-invitation-acceptance";
import { useProduct } from "@/domain/prototype/store";

vi.mock("@clerk/nextjs", () => ({ useAuth: vi.fn(), useSignUp: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: vi.fn() }));
vi.mock("@/domain/prototype/store", () => ({ useProduct: vi.fn() }));
vi.mock("@/components/clerk-invitation-form", () => ({
  ClerkInvitationForm: () => <div>Undangan ini ditujukan untuk email lain.</div>,
}));

describe("BFG application invitation acceptance", () => {
  const router = { push: vi.fn(), replace: vi.fn() };
  let productState: { authState: string; sessionRole: string | null };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({ isLoaded: true, isSignedIn: false } as never);
    vi.mocked(useRouter).mockReturnValue(router as never);
    productState = { authState: "provisioning", sessionRole: null };
    vi.mocked(useProduct).mockImplementation(() => productState as never);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("consumes the ticket and finalizes a complete invitation to Account", async () => {
    const signUp = {
      status: "complete",
      ticket: vi.fn().mockResolvedValue({ error: null }),
      password: vi.fn(),
      finalize: vi.fn().mockResolvedValue({ error: null }),
    };
    vi.mocked(useSignUp).mockReturnValue({ signUp } as never);

    const view = render(<ClerkInvitationAcceptance ticket="ticket-safe" />);

    await waitFor(() => expect(signUp.ticket).toHaveBeenCalledWith({ ticket: "ticket-safe" }));
    await waitFor(() => expect(signUp.finalize).toHaveBeenCalledOnce());
    expect(signUp.finalize).toHaveBeenCalledWith();
    expect(router.replace).not.toHaveBeenCalled();

    productState = { authState: "authenticated", sessionRole: "customer" };
    view.rerender(<ClerkInvitationAcceptance ticket="ticket-safe" />);
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/account"));
  });

  it("keeps the ticket out of the UI and shows a safe invalid-invitation error", async () => {
    const signUp = {
      status: "missing_requirements",
      ticket: vi.fn().mockResolvedValue({ error: new Error("opaque provider details") }),
      password: vi.fn(),
      finalize: vi.fn(),
    };
    vi.mocked(useSignUp).mockReturnValue({ signUp } as never);

    render(<ClerkInvitationAcceptance ticket="ticket-safe" />);

    await waitFor(() => expect(screen.getByText("Undangan tidak valid atau sudah kedaluwarsa.")).toBeTruthy());
    expect(screen.queryByText("ticket-safe")).toBeNull();
    expect(screen.queryByText("opaque provider details")).toBeNull();
    expect(signUp.finalize).not.toHaveBeenCalled();
  });

  it("completes the required username and password fields after ticket handoff", async () => {
    const signUp = {
      status: "missing_requirements",
      ticket: vi.fn().mockResolvedValue({ error: null }),
      password: vi.fn().mockImplementation(() => {
        signUp.status = "complete";
        return Promise.resolve({ error: null });
      }),
      finalize: vi.fn().mockResolvedValue({ error: null }),
    };
    vi.mocked(useSignUp).mockReturnValue({ signUp } as never);

    render(<ClerkInvitationAcceptance ticket="ticket-safe" />);
    await waitFor(() => expect(screen.getByRole("heading", { name: "Terima undangan BFG" })).toBeTruthy());

    fireEvent.change(screen.getByLabelText("Username"), { target: { value: "reader" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "safe-password" } });
    fireEvent.click(screen.getByRole("button", { name: "Aktifkan akun" }));

    await waitFor(() =>
      expect(signUp.password).toHaveBeenCalledWith({ username: "reader", password: "safe-password" }),
    );
    await waitFor(() => expect(signUp.finalize).toHaveBeenCalledOnce());
  });

  it("does not discard the ticket when no ticket is present", () => {
    const signUp = {
      status: "missing_requirements",
      ticket: vi.fn(),
      password: vi.fn(),
      finalize: vi.fn(),
    };
    vi.mocked(useSignUp).mockReturnValue({ signUp } as never);

    render(<ClerkInvitationAcceptance />);

    expect(screen.getByRole("heading", { name: "Undangan tidak tersedia." })).toBeTruthy();
    expect(signUp.ticket).not.toHaveBeenCalled();
  });

  it("preserves the explicit account-switch guard for an existing session", () => {
    const signUp = {
      status: "missing_requirements",
      ticket: vi.fn(),
      password: vi.fn(),
      finalize: vi.fn(),
    };
    vi.mocked(useAuth).mockReturnValue({ isLoaded: true, isSignedIn: true } as never);
    vi.mocked(useSignUp).mockReturnValue({ signUp } as never);

    render(<ClerkInvitationAcceptance ticket="ticket-safe" />);

    expect(screen.getByText("Undangan ini ditujukan untuk email lain.")).toBeTruthy();
    expect(signUp.ticket).not.toHaveBeenCalled();
  });

  it("settles a hanging ticket request into safe recovery instead of an infinite spinner", async () => {
    vi.useFakeTimers();
    const signUp = {
      status: "missing_requirements",
      ticket: vi.fn(() => new Promise<never>(() => undefined)),
      password: vi.fn(),
      finalize: vi.fn(),
    };
    vi.mocked(useSignUp).mockReturnValue({ signUp } as never);

    render(<ClerkInvitationAcceptance ticket="ticket-safe" />);
    await act(async () => {
      await Promise.resolve();
      vi.advanceTimersByTime(15_000);
    });

    expect(screen.getByRole("heading", { name: "Aktivasi belum selesai." })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Coba lagi" })).toBeTruthy();
  });
});
