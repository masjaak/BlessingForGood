import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuth, useSignIn, useSignUp, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { ClerkInvitationAcceptance } from "@/components/clerk-invitation-acceptance";
import { useProduct } from "@/domain/prototype/store";

vi.mock("@clerk/nextjs", () => ({ useAuth: vi.fn(), useSignIn: vi.fn(), useSignUp: vi.fn(), useUser: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: vi.fn() }));
vi.mock("@/domain/prototype/store", () => ({ useProduct: vi.fn() }));
vi.mock("@/components/clerk-invitation-form", () => ({
  normalizeInvitationEmail: (value: string | null | undefined) => value?.trim().toLowerCase() || null,
  maskInvitationEmail: (value: string | null) => value,
  ClerkInvitationForm: ({ authMode, invitedEmail }: { authMode?: string; invitedEmail?: string | null }) => (
    <div data-auth-mode={authMode || "sign-up"} data-invited-email={invitedEmail || ""}>
      Invitation account recovery
    </div>
  ),
}));

describe("BFG application invitation acceptance", () => {
  const router = { push: vi.fn(), replace: vi.fn() };
  let productState: { authState: string; sessionRole: string | null };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({ isLoaded: true, isSignedIn: false } as never);
    vi.mocked(useSignIn).mockReturnValue({
      signIn: {
        status: "needs_first_factor",
        identifier: null,
        ticket: vi.fn().mockResolvedValue({ error: null }),
        finalize: vi.fn().mockResolvedValue({ error: null }),
      },
    } as never);
    vi.mocked(useUser).mockReturnValue({ isLoaded: true, user: null } as never);
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
    vi.mocked(useUser).mockReturnValue({
      isLoaded: true,
      user: {
        primaryEmailAddress: {
          emailAddress: "customer@example.com",
          verification: { status: "verified" },
        },
      },
    } as never);
    vi.mocked(useAuth).mockReturnValue({
      isLoaded: true,
      isSignedIn: true,
      sessionId: "session-b",
      userId: "user-b",
    } as never);
    view.rerender(<ClerkInvitationAcceptance ticket="ticket-safe" />);
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/account"));
  });

  it("uses the same BFG invitation route for an existing Clerk identity", async () => {
    const signUp = {
      status: "missing_requirements",
      ticket: vi.fn(),
      password: vi.fn(),
      finalize: vi.fn(),
    };
    vi.mocked(useSignUp).mockReturnValue({ signUp } as never);

    render(<ClerkInvitationAcceptance ticket="ticket-safe" clerkStatus="sign_in" />);

    await waitFor(() => expect(screen.getByText("Invitation account recovery")).toBeTruthy());
    expect(screen.getByText("Invitation account recovery").getAttribute("data-auth-mode")).toBe("sign-in");
    expect(signUp.ticket).not.toHaveBeenCalled();
  });

  it("consumes an existing-identity ticket before resuming BFG activation", async () => {
    const signIn = {
      status: "complete",
      identifier: "customer@example.com",
      ticket: vi.fn().mockResolvedValue({ error: null }),
      finalize: vi.fn().mockResolvedValue({ error: null }),
    };
    vi.mocked(useSignIn).mockReturnValue({ signIn } as never);
    vi.mocked(useSignUp).mockReturnValue({ signUp: { status: "missing_requirements" } } as never);

    const view = render(<ClerkInvitationAcceptance ticket="ticket-safe" clerkStatus="sign_in" />);

    await waitFor(() => expect(signIn.ticket).toHaveBeenCalledWith({ ticket: "ticket-safe" }));
    await waitFor(() => expect(signIn.finalize).toHaveBeenCalledOnce());

    vi.mocked(useAuth).mockReturnValue({
      isLoaded: true,
      isSignedIn: true,
      sessionId: "session-b",
      userId: "user-b",
    } as never);
    vi.mocked(useUser).mockReturnValue({
      isLoaded: true,
      user: {
        primaryEmailAddress: {
          emailAddress: "customer@example.com",
          verification: { status: "verified" },
        },
      },
    } as never);
    vi.mocked(useProduct).mockReturnValue({ authState: "authenticated", sessionRole: "customer" } as never);
    view.rerender(<ClerkInvitationAcceptance ticket="ticket-safe" clerkStatus="sign_in" />);

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/account"));
  });

  it("resumes the same invitation after an existing identity signs in", async () => {
    let signedIn = false;
    vi.mocked(useAuth).mockImplementation(
      () =>
        ({
          isLoaded: true,
          isSignedIn: signedIn,
          sessionId: signedIn ? "session-b" : null,
          userId: signedIn ? "user-b" : null,
        }) as never,
    );
    const signUp = {
      status: "missing_requirements",
      emailAddress: "customer@example.com",
      ticket: vi.fn().mockResolvedValue({ error: { code: "form_identifier_exists" } }),
      password: vi.fn(),
      finalize: vi.fn(),
    };
    vi.mocked(useSignUp).mockReturnValue({ signUp } as never);

    const view = render(<ClerkInvitationAcceptance ticket="ticket-safe" />);
    await waitFor(() => expect(screen.getByText("Invitation account recovery")).toBeTruthy());
    expect(screen.getByText("Invitation account recovery").getAttribute("data-auth-mode")).toBe("sign-in");

    signedIn = true;
    vi.mocked(useUser).mockReturnValue({
      isLoaded: true,
      user: {
        primaryEmailAddress: {
          emailAddress: "customer@example.com",
          verification: { status: "verified" },
        },
      },
    } as never);
    productState = { authState: "authenticated", sessionRole: "customer" };
    view.rerender(<ClerkInvitationAcceptance ticket="ticket-safe" />);

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/account"));
  });

  it("continues an already authenticated correct session without another login form", async () => {
    vi.mocked(useAuth).mockReturnValue({
      isLoaded: true,
      isSignedIn: true,
      sessionId: "session-b",
      userId: "user-b",
    } as never);
    vi.mocked(useUser).mockReturnValue({
      isLoaded: true,
      user: {
        primaryEmailAddress: {
          emailAddress: "customer@example.com",
          verification: { status: "verified" },
        },
      },
    } as never);
    vi.mocked(useSignUp).mockReturnValue({ signUp: { status: "missing_requirements" } } as never);
    productState = { authState: "authenticated", sessionRole: "customer" };

    render(<ClerkInvitationAcceptance ticket="ticket-safe" clerkStatus="complete" />);

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/account"));
    expect(screen.queryByText("Invitation account recovery")).toBeNull();
  });

  it("does not redirect a different signed-in account from a sign-in ticket", async () => {
    vi.mocked(useAuth).mockReturnValue({
      isLoaded: true,
      isSignedIn: true,
      sessionId: "session-a",
      userId: "user-a",
    } as never);
    vi.mocked(useUser).mockReturnValue({
      isLoaded: true,
      user: {
        primaryEmailAddress: {
          emailAddress: "other@example.com",
          verification: { status: "verified" },
        },
      },
    } as never);
    vi.mocked(useSignUp).mockReturnValue({ signUp: { status: "missing_requirements" } } as never);
    vi.mocked(useSignIn).mockReturnValue({
      signIn: {
        status: "needs_first_factor",
        identifier: "invite@example.com",
        ticket: vi.fn().mockResolvedValue({ error: null }),
        finalize: vi.fn(),
      },
    } as never);
    productState = { authState: "authenticated", sessionRole: "customer" };

    render(<ClerkInvitationAcceptance ticket="ticket-safe" clerkStatus="sign_in" />);

    await waitFor(() => expect(screen.getByText("Invitation account recovery")).toBeTruthy());
    expect(router.replace).not.toHaveBeenCalled();
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
      missingFields: ["username", "password"],
      ticket: vi.fn().mockResolvedValue({ error: null }),
      password: vi.fn().mockImplementation(() => {
        signUp.status = "complete";
        return Promise.resolve({ error: null });
      }),
      finalize: vi.fn().mockResolvedValue({ error: null }),
    };
    vi.mocked(useSignUp).mockReturnValue({ signUp } as never);

    render(<ClerkInvitationAcceptance ticket="ticket-safe" />);
    await waitFor(() => expect(screen.getByRole("heading", { name: "Lengkapi akun" })).toBeTruthy());

    fireEvent.change(screen.getByLabelText("Username"), { target: { value: "reader" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "safe-password" } });
    fireEvent.click(screen.getByRole("button", { name: "Simpan dan lanjutkan" }));

    await waitFor(() =>
      expect(signUp.password).toHaveBeenCalledWith({ username: "reader", password: "safe-password" }),
    );
    await waitFor(() => expect(signUp.finalize).toHaveBeenCalledOnce());
  });

  it("keeps the invitation form usable for a Clerk username validation error", async () => {
    let attempts = 0;
    const invitationLogs = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const signUp = {
      status: "missing_requirements",
      missingFields: ["username", "password"],
      ticket: vi.fn().mockResolvedValue({ error: null }),
      password: vi.fn().mockImplementation(() => {
        attempts += 1;
        if (attempts === 1) {
          return Promise.resolve({
            error: {
              code: "form_identifier_exists",
              longMessage: "This username is already taken.",
            },
          });
        }
        signUp.status = "complete";
        return Promise.resolve({ error: null });
      }),
      finalize: vi.fn().mockResolvedValue({ error: null }),
    };
    vi.mocked(useSignUp).mockReturnValue({ signUp } as never);

    render(<ClerkInvitationAcceptance ticket="ticket-safe" />);
    await waitFor(() => expect(screen.getByRole("heading", { name: "Lengkapi akun" })).toBeTruthy());

    const passwordInput = screen.getByLabelText("Password");
    expect(passwordInput.getAttribute("type")).toBe("password");
    expect(passwordInput.getAttribute("autocomplete")).toBe("new-password");
    fireEvent.change(screen.getByLabelText("Username"), { target: { value: "reader" } });
    fireEvent.change(passwordInput, { target: { value: "safe-password" } });
    fireEvent.click(screen.getByRole("button", { name: "Simpan dan lanjutkan" }));

    await waitFor(() => expect(screen.getByText("Username ini sudah digunakan. Pilih username lain.")).toBeTruthy());
    expect(screen.getByRole("heading", { name: "Lengkapi akun" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Aktivasi belum selesai." })).toBeNull();

    fireEvent.change(screen.getByLabelText("Username"), { target: { value: "reader-new" } });
    fireEvent.click(screen.getByRole("button", { name: "Simpan dan lanjutkan" }));
    await waitFor(() => expect(signUp.password).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(signUp.finalize).toHaveBeenCalledOnce());
    expect(JSON.stringify(invitationLogs.mock.calls)).not.toContain("safe-password");
    invitationLogs.mockRestore();
  });

  it("renders the next Clerk requirement instead of finalizing early", async () => {
    const signUp = {
      status: "missing_requirements",
      missingFields: ["username", "password"],
      ticket: vi.fn().mockResolvedValue({ error: null }),
      password: vi.fn().mockImplementation(() => {
        signUp.missingFields = ["first_name"];
        return Promise.resolve({ error: null });
      }),
      finalize: vi.fn(),
    };
    vi.mocked(useSignUp).mockReturnValue({ signUp } as never);

    render(<ClerkInvitationAcceptance ticket="ticket-safe" />);
    await waitFor(() => expect(screen.getByRole("heading", { name: "Lengkapi akun" })).toBeTruthy());

    fireEvent.change(screen.getByLabelText("Username"), { target: { value: "reader" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "safe-password" } });
    fireEvent.click(screen.getByRole("button", { name: "Simpan dan lanjutkan" }));

    await waitFor(() => expect(screen.getByLabelText("Nama depan")).toBeTruthy());
    expect(screen.queryByLabelText("Password")).toBeNull();
    expect(signUp.finalize).not.toHaveBeenCalled();
  });

  it("keeps a technical Clerk update failure retryable on the same invitation", async () => {
    const signUp = {
      status: "missing_requirements",
      missingFields: ["username", "password"],
      ticket: vi.fn().mockResolvedValue({ error: null }),
      password: vi
        .fn()
        .mockRejectedValueOnce(new Error("network failure"))
        .mockImplementation(() => {
          signUp.status = "complete";
          return Promise.resolve({ error: null });
        }),
      finalize: vi.fn().mockResolvedValue({ error: null }),
    };
    vi.mocked(useSignUp).mockReturnValue({ signUp } as never);

    render(<ClerkInvitationAcceptance ticket="ticket-safe" />);
    await waitFor(() => expect(screen.getByRole("heading", { name: "Lengkapi akun" })).toBeTruthy());

    fireEvent.change(screen.getByLabelText("Username"), { target: { value: "reader" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "safe-password" } });
    fireEvent.click(screen.getByRole("button", { name: "Simpan dan lanjutkan" }));

    await waitFor(() =>
      expect(screen.getByText("Data belum dapat disimpan. Periksa koneksi lalu coba lagi.")).toBeTruthy(),
    );
    expect(screen.getByRole("heading", { name: "Lengkapi akun" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Aktivasi belum selesai." })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Simpan dan lanjutkan" }));
    await waitFor(() => expect(signUp.password).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(signUp.finalize).toHaveBeenCalledOnce());
  });

  it("renders and submits only the fields reported by Clerk", async () => {
    const signUp = {
      status: "missing_requirements",
      missingFields: ["first_name", "last_name", "legal_accepted"],
      unverifiedFields: [],
      ticket: vi.fn().mockResolvedValue({ error: null }),
      update: vi.fn().mockImplementation(() => {
        signUp.status = "complete";
        return Promise.resolve({ error: null });
      }),
      password: vi.fn(),
      finalize: vi.fn().mockResolvedValue({ error: null }),
    };
    vi.mocked(useSignUp).mockReturnValue({ signUp } as never);

    render(<ClerkInvitationAcceptance ticket="ticket-safe" />);
    await waitFor(() => expect(screen.getByRole("heading", { name: "Lengkapi akun" })).toBeTruthy());

    expect(screen.getByLabelText("Nama depan")).toBeTruthy();
    expect(screen.getByLabelText("Nama belakang")).toBeTruthy();
    expect(screen.getByRole("checkbox")).toBeTruthy();
    expect(screen.queryByLabelText("Username")).toBeNull();
    expect(screen.queryByLabelText("Password")).toBeNull();

    fireEvent.change(screen.getByLabelText("Nama depan"), { target: { value: "Ari" } });
    fireEvent.change(screen.getByLabelText("Nama belakang"), { target: { value: "Budi" } });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Simpan dan lanjutkan" }));

    await waitFor(() =>
      expect(signUp.update).toHaveBeenCalledWith({
        firstName: "Ari",
        lastName: "Budi",
        legalAccepted: true,
      }),
    );
    await waitFor(() => expect(signUp.finalize).toHaveBeenCalledOnce());
  });

  it("handles Clerk email verification before finalization", async () => {
    const signUp = {
      status: "missing_requirements",
      missingFields: [],
      unverifiedFields: ["email_address"],
      ticket: vi.fn().mockResolvedValue({ error: null }),
      update: vi.fn(),
      password: vi.fn(),
      verifications: {
        emailAddress: { supportedStrategies: ["email_code"] },
        sendEmailCode: vi.fn().mockResolvedValue({ error: null }),
        verifyEmailCode: vi.fn().mockImplementation(() => {
          signUp.status = "complete";
          signUp.unverifiedFields = [];
          return Promise.resolve({ error: null });
        }),
      },
      finalize: vi.fn().mockResolvedValue({ error: null }),
    };
    vi.mocked(useSignUp).mockReturnValue({ signUp } as never);

    render(<ClerkInvitationAcceptance ticket="ticket-safe" />);
    await waitFor(() => expect(screen.getByRole("heading", { name: "Verifikasi akun" })).toBeTruthy());

    fireEvent.click(screen.getByRole("button", { name: "Kirim kode verifikasi" }));
    await waitFor(() => expect(signUp.verifications.sendEmailCode).toHaveBeenCalledOnce());

    fireEvent.change(screen.getByLabelText("Kode verifikasi"), { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: "Verifikasi kode" }));

    await waitFor(() => expect(signUp.verifications.verifyEmailCode).toHaveBeenCalledWith({ code: "123456" }));
    await waitFor(() => expect(signUp.finalize).toHaveBeenCalledOnce());
  });

  it("handles a Clerk email-link verification before finalization", async () => {
    let releaseLink!: (result: { error: null }) => void;
    const signUp = {
      status: "missing_requirements",
      missingFields: [],
      unverifiedFields: ["email_address"],
      ticket: vi.fn().mockResolvedValue({ error: null }),
      update: vi.fn(),
      password: vi.fn(),
      verifications: {
        emailAddress: { supportedStrategies: ["email_link"] },
        sendEmailLink: vi.fn().mockResolvedValue({ error: null }),
        waitForEmailLinkVerification: vi.fn(
          () =>
            new Promise<{ error: null }>((resolve) => {
              releaseLink = resolve;
            }),
        ),
      },
      finalize: vi.fn().mockResolvedValue({ error: null }),
    };
    vi.mocked(useSignUp).mockReturnValue({ signUp } as never);

    render(<ClerkInvitationAcceptance ticket="ticket-safe" />);
    await waitFor(() => expect(screen.getByRole("heading", { name: "Verifikasi akun" })).toBeTruthy());

    fireEvent.click(screen.getByRole("button", { name: "Kirim tautan verifikasi" }));
    await waitFor(() =>
      expect(signUp.verifications.sendEmailLink).toHaveBeenCalledWith({ verificationUrl: window.location.href }),
    );
    await waitFor(() => expect(signUp.verifications.waitForEmailLinkVerification).toHaveBeenCalledOnce());

    signUp.status = "complete";
    signUp.unverifiedFields = [];
    await act(async () => releaseLink({ error: null }));

    await waitFor(() => expect(signUp.finalize).toHaveBeenCalledOnce());
  });

  it("waits for the Clerk sign-up resource before starting the ticket", async () => {
    const signUp = {
      status: "complete",
      ticket: vi.fn().mockResolvedValue({ error: null }),
      password: vi.fn(),
      finalize: vi.fn().mockResolvedValue({ error: null }),
    };
    const state: { currentSignUp?: typeof signUp } = {};
    vi.mocked(useSignUp).mockImplementation(() => ({ signUp: state.currentSignUp }) as never);

    const view = render(<ClerkInvitationAcceptance ticket="ticket-safe" />);
    expect(signUp.ticket).not.toHaveBeenCalled();

    state.currentSignUp = signUp;
    view.rerender(<ClerkInvitationAcceptance ticket="ticket-safe" />);

    await waitFor(() => expect(signUp.ticket).toHaveBeenCalledWith({ ticket: "ticket-safe" }));
    await waitFor(() => expect(signUp.finalize).toHaveBeenCalledOnce());
  });

  it("keeps the ticket flow alive when Clerk activates the session during handoff", async () => {
    let releaseTicket!: (result: { error: null }) => void;
    let isSignedIn = false;
    const signUp = {
      status: "complete",
      missingFields: [],
      unverifiedFields: [],
      ticket: vi.fn(
        () =>
          new Promise<{ error: null }>((resolve) => {
            releaseTicket = resolve;
          }),
      ),
      password: vi.fn(),
      finalize: vi.fn().mockResolvedValue({ error: null }),
    };
    vi.mocked(useAuth).mockImplementation(
      () => ({ isLoaded: true, isSignedIn, sessionId: isSignedIn ? "session-b" : null, userId: "user-b" }) as never,
    );
    vi.mocked(useSignUp).mockReturnValue({ signUp } as never);

    const view = render(<ClerkInvitationAcceptance ticket="ticket-safe" />);
    await waitFor(() => expect(signUp.ticket).toHaveBeenCalledWith({ ticket: "ticket-safe" }));

    isSignedIn = true;
    view.rerender(<ClerkInvitationAcceptance ticket="ticket-safe" />);
    await act(async () => releaseTicket({ error: null }));

    await waitFor(() => expect(signUp.finalize).toHaveBeenCalledOnce());
  });

  it("continues the ticket orchestration after Clerk refreshes its signup resource", async () => {
    let releaseTicket!: (result: { error: null }) => void;
    const firstSignUp = {
      status: "missing_requirements",
      missingFields: ["username", "password"],
      ticket: vi.fn(
        () =>
          new Promise<{ error: null }>((resolve) => {
            releaseTicket = resolve;
          }),
      ),
      password: vi.fn(),
      finalize: vi.fn(),
    };
    const refreshedSignUp = {
      status: "missing_requirements",
      missingFields: ["username", "password"],
      ticket: vi.fn(),
      password: vi.fn(),
      finalize: vi.fn(),
    };
    let currentSignUp = firstSignUp;
    vi.mocked(useSignUp).mockImplementation(() => ({ signUp: currentSignUp }) as never);

    const view = render(<ClerkInvitationAcceptance ticket="ticket-safe" />);

    await waitFor(() => expect(firstSignUp.ticket).toHaveBeenCalledWith({ ticket: "ticket-safe" }));
    currentSignUp = refreshedSignUp;
    view.rerender(<ClerkInvitationAcceptance ticket="ticket-safe" />);
    await act(async () => releaseTicket({ error: null }));

    await waitFor(() => expect(screen.getByRole("heading", { name: "Lengkapi akun" })).toBeTruthy());
  });

  it("does not discard the ticket when no ticket is present", () => {
    const signUp = {
      status: "missing_requirements",
      missingFields: ["username", "password"],
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
      status: "complete",
      existingSession: { sessionId: "session-b" },
      createdUserId: "user-b",
      emailAddress: "invite-b@example.com",
      ticket: vi.fn().mockResolvedValue({ error: null }),
      password: vi.fn(),
      finalize: vi.fn(),
    };
    vi.mocked(useAuth).mockReturnValue({
      isLoaded: true,
      isSignedIn: true,
      sessionId: "session-a",
      userId: "user-a",
    } as never);
    vi.mocked(useUser).mockReturnValue({
      isLoaded: true,
      user: {
        primaryEmailAddress: {
          emailAddress: "invite-a@example.com",
          verification: { status: "verified" },
        },
      },
    } as never);
    vi.mocked(useSignUp).mockReturnValue({ signUp } as never);

    render(<ClerkInvitationAcceptance ticket="ticket-safe" />);

    return waitFor(() => expect(screen.getByText("Invitation account recovery")).toBeTruthy()).then(() =>
      expect(signUp.ticket).toHaveBeenCalledWith({ ticket: "ticket-safe" }),
    );
  });

  it("continues a different-session invitation when the verified email matches", async () => {
    const signUp = {
      status: "complete",
      emailAddress: "customer@example.com",
      ticket: vi.fn().mockResolvedValue({ error: null }),
      password: vi.fn(),
      finalize: vi.fn(),
    };
    vi.mocked(useAuth).mockReturnValue({
      isLoaded: true,
      isSignedIn: true,
      sessionId: "session-current",
      userId: "user-current",
    } as never);
    vi.mocked(useUser).mockReturnValue({
      isLoaded: true,
      user: {
        primaryEmailAddress: {
          emailAddress: "Customer@Example.com",
          verification: { status: "verified" },
        },
      },
    } as never);
    vi.mocked(useSignUp).mockReturnValue({ signUp } as never);
    const view = render(<ClerkInvitationAcceptance ticket="ticket-safe" />);

    await waitFor(() => expect(signUp.ticket).toHaveBeenCalledWith({ ticket: "ticket-safe" }));
    expect(screen.queryByText("Invitation account recovery")).toBeNull();
    expect(screen.getByText("Mengaktifkan akun BFG…")).toBeTruthy();

    productState = { authState: "authenticated", sessionRole: "customer" };
    view.rerender(<ClerkInvitationAcceptance ticket="ticket-safe" />);
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/account"));
  });

  it("continues a completed invitation for the same active Clerk session", async () => {
    const signUp = {
      status: "complete",
      createdUserId: "user-b",
      existingSession: { sessionId: "session-b" },
      missingFields: [],
      unverifiedFields: [],
      ticket: vi.fn(),
      password: vi.fn(),
      finalize: vi.fn(),
    };
    vi.mocked(useAuth).mockReturnValue({
      isLoaded: true,
      isSignedIn: true,
      sessionId: "session-b",
      userId: "user-b",
    } as never);
    vi.mocked(useUser).mockReturnValue({
      isLoaded: true,
      user: {
        primaryEmailAddress: {
          emailAddress: "customer@example.com",
          verification: { status: "verified" },
        },
      },
    } as never);
    vi.mocked(useSignUp).mockReturnValue({ signUp } as never);

    const view = render(<ClerkInvitationAcceptance ticket="ticket-safe" />);
    await waitFor(() => expect(screen.queryByText("Undangan ini ditujukan untuk email lain.")).toBeNull());

    productState = { authState: "authenticated", sessionRole: "customer" };
    view.rerender(<ClerkInvitationAcceptance ticket="ticket-safe" />);
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/account"));
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
