"use client";

import { createContext } from "react";
import type {
  CreateCatalogInput,
  CreateCatalogResult,
  CreateOrderInput,
  CatalogAccessOption,
  Order,
  OrderStatus,
  PrototypeState,
  SecretCatalog,
} from "@/domain/prototype/types";
import type { ProductRole } from "@/domain/prototype/session";

export type ProductDataSource = "convex" | "unavailable";
export type ProductAuthState =
  | "loading"
  | "signed-out"
  | "convex-loading"
  | "convex-error"
  | "provisioning"
  | "authenticated"
  | "admission-required"
  | "suspended"
  | "removed"
  | "network-error"
  | "configuration-missing";

export type ProductMembershipState =
  | "AUTH_LOADING"
  | "MEMBERSHIP_RECONCILING"
  | "NO_APPLICATION"
  | "PENDING"
  | "APPROVED_INVITATION_PENDING"
  | "ACTIVE"
  | "SUSPENDED"
  | "REMOVED";

type MembershipRequestState = {
  status: "submitted" | "under_review" | "approved" | "rejected";
  admissionStatus?: "pending" | "invitation_pending" | "invitation_failed" | "active" | "removed" | "rejected";
};

export type ProductMembershipResolutionInput = {
  clerkLoaded: boolean;
  clerkSignedIn: boolean | undefined;
  convexLoading: boolean;
  appUser:
    | {
        status: "active" | "suspended" | "removed";
      }
    | null
    | undefined;
  provisioning: boolean;
  requests: MembershipRequestState[] | undefined;
};

export function resolveProductMembershipState({
  clerkLoaded,
  clerkSignedIn,
  convexLoading,
  appUser,
  provisioning,
  requests,
}: ProductMembershipResolutionInput): ProductMembershipState {
  if (!clerkLoaded || clerkSignedIn === undefined || convexLoading) return "AUTH_LOADING";
  if (!clerkSignedIn) return "AUTH_LOADING";
  if (appUser?.status === "suspended") return "SUSPENDED";
  if (appUser?.status === "active") return "ACTIVE";
  if (appUser?.status === "removed") return "REMOVED";
  if (provisioning || appUser === undefined || requests === undefined) return "MEMBERSHIP_RECONCILING";
  const latest = requests.find((request) => request.admissionStatus !== "removed");
  if (latest?.status === "approved") return "APPROVED_INVITATION_PENDING";
  if (latest?.status === "submitted" || latest?.status === "under_review") return "PENDING";
  return "NO_APPLICATION";
}

export function getConvexErrorCode(reason: unknown): string | null {
  if (typeof reason !== "object" || reason === null) return null;
  const data = (reason as { data?: unknown }).data;
  if (typeof data !== "object" || data === null) return null;
  const code = (data as { code?: unknown }).code;
  return typeof code === "string" ? code : null;
}

export type ProductAuthResolutionInput = {
  clerkLoaded: boolean;
  clerkSignedIn: boolean | undefined;
  convexLoading: boolean;
  convexAuthenticated: boolean;
  appUser:
    | {
        role: ProductRole;
        status: "active" | "suspended" | "removed";
      }
    | null
    | undefined;
  provisioning: boolean;
  admissionDenied: boolean;
  provisionError: boolean;
};

export function resolveProductAuthState({
  clerkLoaded,
  clerkSignedIn,
  convexLoading,
  convexAuthenticated,
  appUser,
  provisioning,
  admissionDenied,
  provisionError,
}: ProductAuthResolutionInput): ProductAuthState {
  if (!clerkLoaded) return "loading";
  if (clerkSignedIn === undefined) return "loading";
  if (!clerkSignedIn) return "signed-out";
  if (convexLoading) return "convex-loading";
  if (!convexAuthenticated) return "convex-error";
  if (provisionError) return "network-error";
  if (appUser?.status === "suspended") return "suspended";
  if (appUser?.status === "removed") return "removed";
  if (appUser?.status === "active") return "authenticated";
  if (admissionDenied) return "admission-required";
  if (provisioning || appUser === undefined || appUser === null) return "provisioning";
  return "authenticated";
}

export function isProductIdentityAuthenticated(authState: ProductAuthState) {
  return Boolean(authState && !["loading", "signed-out", "configuration-missing"].includes(authState));
}

export interface ProductContextValue {
  hydrated: boolean;
  dataSource: ProductDataSource;
  sessionRole: ProductRole | null;
  userStatus: "active" | "suspended" | "removed" | null;
  authState: ProductAuthState;
  membershipState: ProductMembershipState;
  catalogLoading: boolean;
  catalogsLoading: boolean;
  ordersLoading: boolean;
  retryAuth: () => void;
  state: PrototypeState;
  unlockedCatalog: SecretCatalog | undefined;
  catalogOptions: CatalogAccessOption[];
  selectCatalog: (catalogId: string) => void;
  createCatalog: (input: CreateCatalogInput) => Promise<CreateCatalogResult>;
  unlockCatalog: (accessCode: string) => Promise<SecretCatalog | undefined>;
  submitOrder: (catalogId: string, input: CreateOrderInput) => Promise<Order>;
  updateOrderStatus: (orderId: string, nextStatus: OrderStatus) => void | Promise<void>;
  closeCatalog: (catalogId: string) => void | Promise<void>;
  editOrder: (orderId: string, input: CreateOrderInput) => Promise<Order>;
}

export const ProductContext = createContext<ProductContextValue | null>(null);
