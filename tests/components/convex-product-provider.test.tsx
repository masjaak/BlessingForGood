import { render, waitFor } from "@testing-library/react";
import { useAuth } from "@clerk/nextjs";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { getFunctionName } from "convex/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProductContext } from "@/domain/prototype/context";
import { ConvexProductProvider } from "@/domain/prototype/convex-store";
import { useConvexRetry } from "@/providers/convex-provider";

const ensureCurrentUser = vi.fn();
const queryValues = new Map<string, unknown>();

vi.mock("@clerk/nextjs", () => ({ useAuth: vi.fn() }));
vi.mock("convex/react", () => ({
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
    queryValues.clear();
    queryValues.set("users:current", null);
    queryValues.set("joinRequests:mine", [{ status: "approved" }]);
    ensureCurrentUser.mockReset().mockResolvedValue({ role: "customer", status: "active" });
    vi.mocked(useAuth).mockReturnValue({ isLoaded: true, isSignedIn: true, sessionId: "session-b" } as never);
    vi.mocked(useConvexAuth).mockReturnValue({ isLoading: false, isAuthenticated: true } as never);
    vi.mocked(useConvexRetry).mockReturnValue(vi.fn());
    vi.mocked(useMutation).mockImplementation(((reference: unknown) =>
      getFunctionName(reference as never) === "users:ensureCurrentUser" ? ensureCurrentUser : vi.fn()) as never);
    vi.mocked(useQuery).mockImplementation(((reference: unknown, args?: unknown) => {
      if (args === "skip") return undefined;
      return queryValues.get(getFunctionName(reference as never));
    }) as never);
  });

  it("invokes ensureCurrentUser from the authenticated provider when the appUser is absent", async () => {
    const { rerender } = render(
      <ConvexProductProvider>
        <Probe />
      </ConvexProductProvider>,
    );

    await waitFor(() => expect(ensureCurrentUser).toHaveBeenCalledOnce());
    expect(ensureCurrentUser.mock.calls[0][0]).toEqual({ correlationId: expect.any(String) });

    queryValues.set("users:current", { role: "customer", status: "active" });
    rerender(
      <ConvexProductProvider>
        <Probe />
      </ConvexProductProvider>,
    );
    expect(document.querySelector("output")?.dataset.membershipState).toBe("ACTIVE");
  });
});
