import { render, waitFor } from "@testing-library/react";
import { useAuth } from "@clerk/nextjs";
import { useAction, useConvexAuth, useMutation, useQuery } from "convex/react";
import { getFunctionName } from "convex/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BFG_MEMBERSHIP_CORRELATION_KEY } from "@/config/clerk";
import { ProductContext } from "@/domain/prototype/context";
import { ConvexProductProvider } from "@/domain/prototype/convex-store";
import { useConvexRetry } from "@/providers/convex-provider";

const ensureCurrentUser = vi.fn();
const queryValues = new Map<string, unknown>();

vi.mock("@clerk/nextjs", () => ({ useAuth: vi.fn() }));
vi.mock("convex/react", () => ({
  useAction: vi.fn(),
  useConvexAuth: vi.fn(),
  useMutation: vi.fn(),
  useQuery: vi.fn(),
}));
vi.mock("next/navigation", () => ({ usePathname: vi.fn(() => "/account") }));
vi.mock("@/providers/convex-provider", () => ({ useConvexRetry: vi.fn() }));
vi.mock("@/domain/prototype/operations-context", () => ({
  ConvexOperationsProvider: ({ children }: { children: React.ReactNode }) => children,
}));

function Probe() {
  return (
    <ProductContext.Consumer>
      {(value) => <output data-auth-state={value?.authState} data-membership-state={value?.membershipState} />}
    </ProductContext.Consumer>
  );
}

describe("authenticated customer bootstrap caller", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    queryValues.clear();
    queryValues.set("users:current", null);
    queryValues.set("joinRequests:mine", [{ status: "approved" }]);
    ensureCurrentUser.mockReset().mockResolvedValue({ role: "customer", status: "active" });
    vi.mocked(useAuth).mockReturnValue({ isLoaded: true, isSignedIn: true, sessionId: "session-b" } as never);
    vi.mocked(useConvexAuth).mockReturnValue({ isLoading: false, isAuthenticated: true } as never);
    vi.mocked(useConvexRetry).mockReturnValue(vi.fn());
    vi.mocked(useAction).mockImplementation(((reference: unknown) =>
      getFunctionName(reference as never) === "userProvisioning:ensureCurrentUser"
        ? ensureCurrentUser
        : vi.fn()) as never);
    vi.mocked(useMutation).mockImplementation((() => vi.fn()) as never);
    vi.mocked(useQuery).mockImplementation(((reference: unknown, args?: unknown) => {
      if (args === "skip") return undefined;
      return queryValues.get(getFunctionName(reference as never));
    }) as never);
  });

  it("invokes ensureCurrentUser from the authenticated provider when the appUser is absent", async () => {
    window.sessionStorage.setItem(BFG_MEMBERSHIP_CORRELATION_KEY, "invite-trace-123");
    const { rerender } = render(
      <ConvexProductProvider>
        <Probe />
      </ConvexProductProvider>,
    );

    await waitFor(() => expect(ensureCurrentUser).toHaveBeenCalledOnce());
    expect(ensureCurrentUser.mock.calls[0][0]).toEqual({ correlationId: "invite-trace-123" });

    queryValues.set("users:current", { role: "customer", status: "active" });
    rerender(
      <ConvexProductProvider>
        <Probe />
      </ConvexProductProvider>,
    );
    expect(document.querySelector("output")?.dataset.membershipState).toBe("ACTIVE");
  });

  it("starts bootstrap for a new Clerk identity while the prior session is still pending", async () => {
    let resolveFirst!: (value: unknown) => void;
    const firstBootstrap = new Promise((resolve) => {
      resolveFirst = resolve;
    });
    ensureCurrentUser
      .mockReset()
      .mockImplementationOnce(() => firstBootstrap)
      .mockResolvedValueOnce({ role: "customer", status: "active" });

    let clerkAuth = { isLoaded: true, isSignedIn: true, sessionId: "session-a", userId: "user-a" };
    vi.mocked(useAuth).mockImplementation(() => clerkAuth as never);
    const { rerender } = render(
      <ConvexProductProvider>
        <Probe />
      </ConvexProductProvider>,
    );

    await waitFor(() => expect(ensureCurrentUser).toHaveBeenCalledOnce());

    clerkAuth = { isLoaded: true, isSignedIn: true, sessionId: "session-b", userId: "user-b" };
    rerender(
      <ConvexProductProvider>
        <Probe />
      </ConvexProductProvider>,
    );
    await waitFor(() => expect(ensureCurrentUser).toHaveBeenCalledTimes(2));

    resolveFirst({ role: "customer", status: "active" });
  });
});
