"use client";

import { useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { ConvexPrototypeProvider } from "@/domain/prototype/convex-store";
import { PrototypeContext, type PrototypeContextValue } from "@/domain/prototype/context";
import { LocalOperationsProvider } from "@/domain/prototype/operations-context";
import { isPreviewDemoMode, isPrototypeMode, shouldUseConvex } from "@/lib/environment";
import {
  appendDepositTransaction,
  createCatalogFromInput,
  createInvoiceFromOrder,
  createOrder,
  editOrder as editOrderInState,
  emptyPrototypeState,
  transitionOrderStatus,
  unlockCatalog as unlockCatalogInState,
} from "@/domain/prototype/logic";
import type {
  CreateCatalogInput,
  CreateOrderInput,
  DepositTransactionType,
  OrderStatus,
  PrototypeState,
} from "@/domain/prototype/types";
import { ConvexProviderBoundary } from "@/providers/convex-provider";

const STORAGE_KEY = "bfg-prototype-state-v0.1";

function isPrototypeState(
  value: unknown,
): value is Pick<PrototypeState, "catalogs" | "orders"> & Partial<Pick<PrototypeState, "invoices">> {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<PrototypeState>;
  return (
    Array.isArray(candidate.catalogs) &&
    Array.isArray(candidate.orders) &&
    (candidate.invoices === undefined || Array.isArray(candidate.invoices))
  );
}

function LocalPrototypeProvider({
  children,
  enabled,
  previewDemo,
  dataSource,
}: {
  children: ReactNode;
  enabled: boolean;
  previewDemo: boolean;
  dataSource: "local" | "unavailable";
}) {
  const [state, setState] = useState<PrototypeState>(emptyPrototypeState);
  const [hydrated, setHydrated] = useState(!enabled);
  const [unlockedCatalogId, setUnlockedCatalogId] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      try {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed: unknown = JSON.parse(stored);
          if (isPrototypeState(parsed)) setState({ ...parsed, invoices: parsed.invoices || [] });
        }
      } catch {
        setState(emptyPrototypeState());
      } finally {
        setHydrated(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  useEffect(() => {
    if (enabled && hydrated && dataSource === "local") window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [dataSource, enabled, hydrated, state]);

  const createCatalog = useCallback(async (input: CreateCatalogInput) => {
    const catalog = await createCatalogFromInput(input);
    setState((current) => ({ ...current, catalogs: [catalog, ...current.catalogs] }));
    return catalog;
  }, []);

  const unlockCatalog = useCallback(
    async (accessCode: string) => {
      const catalog = await unlockCatalogInState(state.catalogs, accessCode);
      if (catalog) setUnlockedCatalogId(catalog.id);
      return catalog;
    },
    [state.catalogs],
  );

  const submitOrder = useCallback(
    async (catalogId: string, input: CreateOrderInput) => {
      const catalog = state.catalogs.find((candidate) => candidate.id === catalogId);
      if (!catalog) throw new Error("catalog not found");
      const order = await createOrder(catalog, input);
      setState((current) => ({ ...current, orders: [order, ...current.orders] }));
      return order;
    },
    [state.catalogs],
  );

  const editOrder = useCallback(
    async (orderId: string, input: CreateOrderInput) => {
      const order = state.orders.find((candidate) => candidate.id === orderId);
      const catalog = order && state.catalogs.find((candidate) => candidate.id === order.catalogId);
      if (!order || !catalog) throw new Error("order not found");
      const updated = await editOrderInState(catalog, order, input);
      setState((current) => ({
        ...current,
        orders: current.orders.map((candidate) => (candidate.id === orderId ? updated : candidate)),
      }));
      return updated;
    },
    [state.catalogs, state.orders],
  );

  const updateOrderStatus = useCallback((orderId: string, nextStatus: OrderStatus) => {
    setState((current) => ({
      ...current,
      orders: current.orders.map((order) => (order.id === orderId ? transitionOrderStatus(order, nextStatus) : order)),
    }));
  }, []);

  const closeCatalog = useCallback((catalogId: string) => {
    setState((current) => ({
      ...current,
      catalogs: current.catalogs.map((catalog) =>
        catalog.id === catalogId ? { ...catalog, status: "closed" } : catalog,
      ),
    }));
  }, []);

  const createInvoice = useCallback(
    (orderId: string, requirement: Parameters<typeof createInvoiceFromOrder>[1]) => {
      const order = state.orders.find((candidate) => candidate.id === orderId);
      if (!order) throw new Error("order not found");
      if (state.invoices.some((invoice) => invoice.orderId === orderId)) throw new Error("invoice already exists");
      const invoice = createInvoiceFromOrder(order, requirement);
      setState((current) => ({
        ...current,
        invoices: [invoice, ...current.invoices],
        orders: current.orders.map((candidate) =>
          candidate.id === orderId ? { ...candidate, depositRequirement: requirement } : candidate,
        ),
      }));
      return invoice;
    },
    [state.invoices, state.orders],
  );

  const recordDeposit = useCallback(
    (invoiceId: string, type: DepositTransactionType, amount: number, note: string) => {
      const invoice = state.invoices.find((candidate) => candidate.id === invoiceId);
      if (!invoice) throw new Error("invoice not found");
      const updated = appendDepositTransaction(invoice, type, amount, note);
      setState((current) => ({
        ...current,
        invoices: current.invoices.map((candidate) => (candidate.id === invoiceId ? updated : candidate)),
      }));
      return updated;
    },
    [state.invoices],
  );

  const value = useMemo<PrototypeContextValue>(
    () => ({
      enabled,
      previewDemo,
      hydrated,
      dataSource,
      sessionRole: enabled ? "admin" : null,
      userStatus: enabled ? "active" : null,
      authState: enabled ? "authenticated" : "configuration-missing",
      state,
      unlockedCatalog: state.catalogs.find((catalog) => catalog.id === unlockedCatalogId),
      createCatalog,
      unlockCatalog,
      submitOrder,
      updateOrderStatus,
      closeCatalog,
      createInvoice,
      recordDeposit,
      editOrder,
    }),
    [
      closeCatalog,
      createCatalog,
      createInvoice,
      dataSource,
      editOrder,
      enabled,
      hydrated,
      previewDemo,
      recordDeposit,
      state,
      submitOrder,
      unlockCatalog,
      unlockedCatalogId,
      updateOrderStatus,
    ],
  );

  return (
    <PrototypeContext.Provider value={value}>
      <LocalOperationsProvider enabled={enabled} dataSource={dataSource}>
        {previewDemo && dataSource === "local" ? (
          <aside className="prototype-preview-banner" role="status">
            <strong>Prototype Preview</strong>
            <span>Data is stored only in this browser.</span>
          </aside>
        ) : null}
        {children}
      </LocalOperationsProvider>
    </PrototypeContext.Provider>
  );
}

function hasValidConvexUrl(value: string | undefined): value is string {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export function PrototypeProvider({
  children,
  previewEnvironment = false,
}: {
  children: ReactNode;
  previewEnvironment?: boolean;
}) {
  const runtimeEnvironment = {
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_BFG_PROTOTYPE_MODE: process.env.NEXT_PUBLIC_BFG_PROTOTYPE_MODE,
    NEXT_PUBLIC_BFG_PREVIEW_DEMO_MODE: process.env.NEXT_PUBLIC_BFG_PREVIEW_DEMO_MODE,
  };
  const previewDemo = isPreviewDemoMode(runtimeEnvironment, previewEnvironment);
  const enabled = isPrototypeMode(runtimeEnvironment, previewEnvironment);
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  const useConvex = shouldUseConvex(runtimeEnvironment, previewEnvironment, hasValidConvexUrl(convexUrl));

  if (useConvex && hasValidConvexUrl(convexUrl)) {
    return (
      <ConvexProviderBoundary url={convexUrl}>
        <ConvexPrototypeProvider enabled={useConvex} previewDemo={previewDemo}>
          {children}
        </ConvexPrototypeProvider>
      </ConvexProviderBoundary>
    );
  }

  return (
    <LocalPrototypeProvider
      enabled={enabled && !previewDemo && !previewEnvironment}
      previewDemo={previewDemo}
      dataSource={enabled && !previewDemo && !previewEnvironment ? "local" : "unavailable"}
    >
      {children}
    </LocalPrototypeProvider>
  );
}

export function usePrototype(): PrototypeContextValue {
  const value = useContext(PrototypeContext);
  if (!value) throw new Error("usePrototype must be used inside PrototypeProvider");
  return value;
}
