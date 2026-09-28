"use client";

import { useSearchParams } from "next/navigation";
import { ProductContext, type ProductContextValue } from "@/domain/prototype/context";

const states = {
  "signed-out": { authState: "signed-out", membershipState: "AUTH_LOADING", sessionRole: null, userStatus: null },
  unadmitted: {
    authState: "admission-required",
    membershipState: "NO_APPLICATION",
    sessionRole: null,
    userStatus: null,
  },
  pending: { authState: "admission-required", membershipState: "PENDING", sessionRole: null, userStatus: null },
  approved: {
    authState: "admission-required",
    membershipState: "APPROVED_INVITATION_PENDING",
    sessionRole: null,
    userStatus: null,
  },
  active: { authState: "authenticated", membershipState: "ACTIVE", sessionRole: "customer", userStatus: "active" },
  suspended: { authState: "suspended", membershipState: "SUSPENDED", sessionRole: "customer", userStatus: "suspended" },
  admin: { authState: "authenticated", membershipState: "ACTIVE", sessionRole: "admin", userStatus: "active" },
  owner: { authState: "authenticated", membershipState: "ACTIVE", sessionRole: "owner", userStatus: "active" },
} as const;

type PresentationState = keyof typeof states;

// Local presentation fixture only; the route returns 404 in production.
export function PresentationProvider({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const requested = searchParams.get("state") as PresentationState | null;
  const state = requested && requested in states ? requested : "signed-out";
  const value = {
    hydrated: true,
    dataSource: "unavailable",
    catalogLoading: false,
    catalogsLoading: false,
    ordersLoading: false,
    ...states[state],
  } as unknown as ProductContextValue;

  return (
    <ProductContext.Provider value={value}>
      <div data-testid="onboarding-presentation-state" data-state={state} data-role={value.sessionRole ?? "none"}>
        {children}
      </div>
    </ProductContext.Provider>
  );
}
