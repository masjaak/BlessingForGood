"use client";

import { useAuth } from "@clerk/nextjs";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { PrototypeContext, type PrototypeContextValue } from "@/domain/prototype/context";
import { ConvexOperationsProvider } from "@/domain/prototype/operations-context";
import { createInvoiceFromOrder, appendDepositTransaction } from "@/domain/prototype/logic";
import { getStoredUnlockedCatalogId, setStoredUnlockedCatalogId } from "@/domain/prototype/session";
import type {
  BookFormat,
  CreateCatalogInput,
  CreateOrderInput,
  DepositTransactionType,
  Invoice,
  Order,
  OrderStatus,
  PrototypeState,
  SecretCatalog,
} from "@/domain/prototype/types";

type CatalogView = NonNullable<FunctionReturnType<typeof api.catalogAccess.getUnlocked>>;
type OrderView = Awaited<FunctionReturnType<typeof api.orders.submit>>;
type UnlockView = Awaited<FunctionReturnType<typeof api.catalogAccess.unlock>>;

type CatalogRecord = {
  id: string;
  name: string;
  status: string;
  closingAt: string | null;
  createdAt: string;
  books: Array<{
    id: string;
    title: string;
    publisher: string;
    variants: Array<{
      id: string;
      format: BookFormat;
      isbn: string;
      price: number;
      currency: "IDR";
      availability: "available" | "unavailable";
    }>;
  }>;
};

type OrderRecord = {
  orderId: string;
  catalogId: string;
  customerName: string;
  customerEmail?: string;
  status: OrderStatus;
  subtotalAmount: number;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
  items: Array<{
    _id: string;
    bookId: string;
    bookTitleSnapshot: string;
    publisherNameSnapshot: string;
    bookVariantId: string;
    formatSnapshot: BookFormat;
    isbnSnapshot: string;
    unitPriceAmountSnapshot: number;
    quantity: number;
    subtotalAmount: number;
  }>;
  statusHistory: Array<{ status: OrderStatus; at: string }>;
};

function asCatalog(value: CatalogView | null | undefined): SecretCatalog | undefined {
  if (!value) return undefined;
  const record = value as unknown as CatalogRecord;
  return {
    id: record.id,
    name: record.name,
    accessCodeHash: "convex-managed",
    status: record.status === "open" ? "open" : "closed",
    closingAt: record.closingAt,
    createdAt: record.createdAt,
    books: record.books,
  };
}

function asOrder(value: OrderView | null | undefined): Order | undefined {
  if (!value) return undefined;
  const record = value as unknown as OrderRecord;
  return {
    id: record.orderId,
    catalogId: record.catalogId,
    customerName: record.customerName,
    customerEmail: record.customerEmail || null,
    source: "preorder",
    items: record.items.map((item) => ({
      id: item._id,
      bookId: item.bookId,
      bookTitle: item.bookTitleSnapshot,
      publisher: item.publisherNameSnapshot,
      variantId: item.bookVariantId,
      format: item.formatSnapshot,
      isbn: item.isbnSnapshot,
      unitPrice: item.unitPriceAmountSnapshot,
      quantity: item.quantity,
      subtotal: item.subtotalAmount,
    })),
    total: record.totalAmount,
    depositRequirement: { kind: "unset" },
    status: record.status,
    statusHistory: record.statusHistory.map((event) => ({ status: event.status, at: event.at })),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function pageOf<T>(value: { page: T[] } | undefined): T[] {
  return value?.page || [];
}

export function ConvexPrototypeProvider({
  children,
  enabled,
  previewDemo,
}: {
  children: ReactNode;
  enabled: boolean;
  previewDemo: boolean;
}) {
  const [unlockedCatalogId, setUnlockedCatalogId] = useState<string | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [provisioning, setProvisioning] = useState(false);
  const [provisionError, setProvisionError] = useState(false);

  const { isLoaded, isSignedIn } = useAuth();
  const { isLoading: convexAuthLoading, isAuthenticated } = useConvexAuth();

  const ensureCurrentUser = useMutation(api.users.ensureCurrentUser);
  const createBundle = useMutation(api.secretCatalogs.createBundle);
  const openCatalog = useMutation(api.secretCatalogs.open);
  const closeCatalogMutation = useMutation(api.secretCatalogs.close);
  const unlock = useMutation(api.catalogAccess.unlock);
  const submit = useMutation(api.orders.submit);
  const edit = useMutation(api.orders.edit);
  const updateStatus = useMutation(api.orders.updateStatus);

  const me = useQuery(api.users.current, enabled && isSignedIn && isAuthenticated ? {} : "skip");
  const activeUser = me?.status === "active" && isAuthenticated;
  const isAdmin = activeUser && (me?.role === "admin" || me?.role === "owner");
  const isCustomer = activeUser && me?.role === "customer";
  const adminCatalogs = useQuery(
    api.secretCatalogs.list,
    isAdmin ? { paginationOpts: { numItems: 50, cursor: null } } : "skip",
  );
  const adminOrders = useQuery(
    api.orders.listForAdmin,
    isAdmin ? { paginationOpts: { numItems: 50, cursor: null } } : "skip",
  );
  const unlocked = useQuery(
    api.catalogAccess.getUnlocked,
    isCustomer && unlockedCatalogId ? { catalogId: unlockedCatalogId as Id<"secretCatalogs"> } : "skip",
  );
  const customerOrders = useQuery(
    api.orders.listMine,
    isCustomer ? { paginationOpts: { numItems: 50, cursor: null } } : "skip",
  );

  useEffect(() => {
    if (!enabled) return;
    queueMicrotask(() => {
      setUnlockedCatalogId(getStoredUnlockedCatalogId());
    });
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !isLoaded || !isSignedIn || convexAuthLoading || !isAuthenticated || me !== null || provisioning)
      return;
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      setProvisioning(true);
      setProvisionError(false);
      void ensureCurrentUser({})
        .catch(() => {
          if (active) setProvisionError(true);
        })
        .finally(() => {
          if (active) setProvisioning(false);
        });
    });
    return () => {
      active = false;
    };
  }, [convexAuthLoading, enabled, ensureCurrentUser, isAuthenticated, isLoaded, isSignedIn, me, provisioning]);

  const catalogs = useMemo(
    () =>
      isAdmin
        ? pageOf(adminCatalogs)
            .map((catalog) => asCatalog(catalog as CatalogView))
            .filter(Boolean)
        : [asCatalog(unlocked as CatalogView | null | undefined)].filter(Boolean),
    [adminCatalogs, isAdmin, unlocked],
  ) as SecretCatalog[];
  const orders = useMemo(
    () =>
      (isAdmin ? pageOf(adminOrders) : pageOf(customerOrders))
        .map((order) => asOrder(order as OrderView))
        .filter(Boolean),
    [adminOrders, customerOrders, isAdmin],
  ) as Order[];
  const state = useMemo<PrototypeState>(() => ({ catalogs, orders, invoices }), [catalogs, invoices, orders]);

  const createCatalog = useCallback(
    async (input: CreateCatalogInput) => {
      const bundle = await createBundle({
        name: input.name,
        publisherName: input.publisher,
        bookTitle: input.title,
        accessCode: input.accessCode,
        closesAt: input.closingAt ? Date.parse(input.closingAt) : undefined,
        variants: input.variants.map((variant) => ({
          format: variant.format,
          isbn: variant.isbn,
          priceAmount: variant.price,
        })),
      });
      const opened = await openCatalog({ catalogId: bundle.catalogId });
      const catalog = asCatalog(opened as CatalogView);
      if (!catalog) throw new Error("catalog creation failed");
      return catalog;
    },
    [createBundle, openCatalog],
  );

  const unlockCatalog = useCallback(
    async (accessCode: string) => {
      const result = await unlock({ accessCode });
      const catalog = asCatalog((result as UnlockView).catalog as CatalogView);
      if (catalog) {
        setUnlockedCatalogId(catalog.id);
        setStoredUnlockedCatalogId(catalog.id);
      }
      return catalog;
    },
    [unlock],
  );

  const submitOrder = useCallback(
    async (catalogId: string, input: CreateOrderInput) => {
      const result = await submit({
        catalogId: catalogId as Id<"secretCatalogs">,
        customerName: input.customerName,
        customerEmail: input.customerEmail?.trim() || undefined,
        items: input.items.map((item) => ({
          variantId: item.variantId as Id<"bookVariants">,
          quantity: item.quantity,
        })),
      });
      const order = asOrder(result);
      if (!order) throw new Error("order submission failed");
      return order;
    },
    [submit],
  );

  const editOrder = useCallback(
    async (orderId: string, input: CreateOrderInput) => {
      const result = await edit({
        orderId: orderId as Id<"orders">,
        customerName: input.customerName,
        customerEmail: input.customerEmail?.trim() || undefined,
        items: input.items.map((item) => ({
          variantId: item.variantId as Id<"bookVariants">,
          quantity: item.quantity,
        })),
      });
      const order = asOrder(result);
      if (!order) throw new Error("order update failed");
      return order;
    },
    [edit],
  );

  const updateOrderStatus = useCallback(
    async (orderId: string, nextStatus: OrderStatus) => {
      if (nextStatus !== "cancelled" && nextStatus !== "completed") {
        throw new Error("This Convex phase supports only cancelled and completed order status updates.");
      }
      await updateStatus({ orderId: orderId as Id<"orders">, status: nextStatus });
    },
    [updateStatus],
  );

  const closeCatalog = useCallback(
    async (catalogId: string) => {
      await closeCatalogMutation({ catalogId: catalogId as Id<"secretCatalogs"> });
    },
    [closeCatalogMutation],
  );

  const createInvoice = useCallback(
    (orderId: string, requirement: Parameters<typeof createInvoiceFromOrder>[1]) => {
      const order = orders.find((candidate) => candidate.id === orderId);
      if (!order) throw new Error("order not found");
      if (invoices.some((invoice) => invoice.orderId === orderId)) throw new Error("invoice already exists");
      const invoice = createInvoiceFromOrder(order, requirement);
      setInvoices((current) => [invoice, ...current]);
      return invoice;
    },
    [invoices, orders],
  );

  const recordDeposit = useCallback(
    (invoiceId: string, type: DepositTransactionType, amount: number, note: string) => {
      const invoice = invoices.find((candidate) => candidate.id === invoiceId);
      if (!invoice) throw new Error("invoice not found");
      const updated = appendDepositTransaction(invoice, type, amount, note);
      setInvoices((current) => current.map((candidate) => (candidate.id === invoiceId ? updated : candidate)));
      return updated;
    },
    [invoices],
  );

  const authState = !enabled
    ? "configuration-missing"
    : !isLoaded
      ? "loading"
      : !isSignedIn
        ? "signed-out"
        : convexAuthLoading || !isAuthenticated
          ? "convex-loading"
          : provisionError
            ? "network-error"
            : provisioning || me === null || me === undefined
              ? "provisioning"
              : me.status === "suspended"
                ? "suspended"
                : "authenticated";

  const value = useMemo<PrototypeContextValue>(
    () => ({
      enabled,
      previewDemo,
      hydrated: enabled && isLoaded && (!isSignedIn || (me !== undefined && me !== null) || provisionError),
      dataSource: "convex",
      sessionRole: me?.role || null,
      userStatus: me?.status || null,
      authState,
      state,
      unlockedCatalog: asCatalog(unlocked as CatalogView | null | undefined),
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
      editOrder,
      enabled,
      authState,
      me,
      previewDemo,
      recordDeposit,
      isLoaded,
      isSignedIn,
      provisionError,
      state,
      submitOrder,
      unlockCatalog,
      unlocked,
      updateOrderStatus,
    ],
  );

  return (
    <PrototypeContext.Provider value={value}>
      <ConvexOperationsProvider enabled={enabled} role={me?.role || null} active={authState === "authenticated"}>
        {previewDemo ? (
          <aside className="prototype-preview-banner" role="status">
            <strong>Prototype Preview</strong>
            <span>Data is stored in the BFG Preview environment.</span>
          </aside>
        ) : null}
        {children}
      </ConvexOperationsProvider>
    </PrototypeContext.Provider>
  );
}
