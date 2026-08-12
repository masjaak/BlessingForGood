"use client";

import { createContext } from "react";
import type {
  CreateCatalogInput,
  CreateCatalogResult,
  CreateOrderInput,
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
  | "network-error"
  | "configuration-missing";

export type ProductAuthResolutionInput = {
  clerkLoaded: boolean;
  clerkSignedIn: boolean | undefined;
  convexLoading: boolean;
  convexAuthenticated: boolean;
  appUser:
    | {
        role: ProductRole;
        status: "active" | "suspended";
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
  if (!clerkSignedIn) return "signed-out";
  if (convexLoading) return "convex-loading";
  if (!convexAuthenticated) return "convex-error";
  if (provisionError) return "network-error";
  if (admissionDenied) return "admission-required";
  if (provisioning || appUser === undefined || appUser === null) return "provisioning";
  if (appUser.status === "suspended") return "suspended";
  return "authenticated";
}

export interface ProductContextValue {
  hydrated: boolean;
  dataSource: ProductDataSource;
  sessionRole: ProductRole | null;
  userStatus: "active" | "suspended" | null;
  authState: ProductAuthState;
  catalogLoading: boolean;
  catalogsLoading: boolean;
  ordersLoading: boolean;
  retryAuth: () => void;
  state: PrototypeState;
  unlockedCatalog: SecretCatalog | undefined;
  createCatalog: (input: CreateCatalogInput) => Promise<CreateCatalogResult>;
  unlockCatalog: (accessCode: string) => Promise<SecretCatalog | undefined>;
  submitOrder: (catalogId: string, input: CreateOrderInput) => Promise<Order>;
  updateOrderStatus: (orderId: string, nextStatus: OrderStatus) => void | Promise<void>;
  closeCatalog: (catalogId: string) => void | Promise<void>;
  editOrder: (orderId: string, input: CreateOrderInput) => Promise<Order>;
}

export const ProductContext = createContext<ProductContextValue | null>(null);
