"use client";

import { useCallback, useContext, useMemo, type ReactNode } from "react";
import { ConvexProductProvider } from "@/domain/prototype/convex-store";
import { ProductContext, type ProductContextValue } from "@/domain/prototype/context";
import { UnavailableOperationsProvider } from "@/domain/prototype/operations-context";
import { emptyPrototypeState } from "@/domain/prototype/logic";
import { isValidBackendUrl } from "@/lib/environment";
import { ConvexProviderBoundary } from "@/providers/convex-provider";

function UnavailableProductProvider({ children }: { children: ReactNode }) {
  const unavailable = useCallback(async () => {
    throw new Error("BFG belum terhubung ke layanan data.");
  }, []);
  const retryAuth = useCallback(() => undefined, []);
  const value = useMemo<ProductContextValue>(
    () => ({
      hydrated: true,
      dataSource: "unavailable",
      sessionRole: null,
      userStatus: null,
      authState: "configuration-missing",
      catalogLoading: false,
      catalogsLoading: false,
      ordersLoading: false,
      retryAuth,
      state: emptyPrototypeState(),
      unlockedCatalog: undefined,
      createCatalog: unavailable,
      unlockCatalog: unavailable,
      submitOrder: unavailable,
      updateOrderStatus: unavailable,
      closeCatalog: unavailable,
      editOrder: unavailable,
    }),
    [retryAuth, unavailable],
  );

  return (
    <ProductContext.Provider value={value}>
      <UnavailableOperationsProvider>{children}</UnavailableOperationsProvider>
    </ProductContext.Provider>
  );
}

export function ProductProvider({ children }: { children: ReactNode }) {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!isValidBackendUrl(convexUrl)) return <UnavailableProductProvider>{children}</UnavailableProductProvider>;

  return (
    <ConvexProviderBoundary url={convexUrl}>
      <ConvexProductProvider>{children}</ConvexProductProvider>
    </ConvexProviderBoundary>
  );
}

export function useProduct(): ProductContextValue {
  const value = useContext(ProductContext);
  if (!value) throw new Error("useProduct must be used inside ProductProvider");
  return value;
}
