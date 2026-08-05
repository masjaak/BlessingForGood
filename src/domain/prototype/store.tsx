"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { isPreviewDemoMode, isPrototypeMode } from "@/lib/environment";
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
  Invoice,
  Order,
  OrderStatus,
  PrototypeState,
  SecretCatalog,
} from "@/domain/prototype/types";

const STORAGE_KEY = "bfg-prototype-state-v0.1";

interface PrototypeContextValue {
  enabled: boolean;
  previewDemo: boolean;
  hydrated: boolean;
  state: PrototypeState;
  unlockedCatalog: SecretCatalog | undefined;
  createCatalog: (input: CreateCatalogInput) => Promise<SecretCatalog>;
  unlockCatalog: (accessCode: string) => Promise<SecretCatalog | undefined>;
  submitOrder: (catalogId: string, input: CreateOrderInput) => Promise<Order>;
  updateOrderStatus: (orderId: string, nextStatus: OrderStatus) => void;
  closeCatalog: (catalogId: string) => void;
  createInvoice: (orderId: string, requirement: Parameters<typeof createInvoiceFromOrder>[1]) => Invoice;
  recordDeposit: (invoiceId: string, type: DepositTransactionType, amount: number, note: string) => Invoice;
  editOrder: (orderId: string, input: CreateOrderInput) => Promise<Order>;
}

const PrototypeContext = createContext<PrototypeContextValue | null>(null);

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
    if (enabled && hydrated) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [enabled, hydrated, state]);

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
      enabled,
      previewDemo,
      hydrated,
      createInvoice,
      recordDeposit,
      editOrder,
      state,
      submitOrder,
      unlockCatalog,
      unlockedCatalogId,
      updateOrderStatus,
    ],
  );

  return (
    <PrototypeContext.Provider value={value}>
      {previewDemo ? (
        <aside className="prototype-preview-banner" role="status">
          <strong>Prototype Preview</strong>
          <span>Data is stored only in this browser.</span>
        </aside>
      ) : null}
      {children}
    </PrototypeContext.Provider>
  );
}

export function usePrototype(): PrototypeContextValue {
  const value = useContext(PrototypeContext);
  if (!value) throw new Error("usePrototype must be used inside PrototypeProvider");
  return value;
}
