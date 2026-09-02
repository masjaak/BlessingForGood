"use client";

import { useAuth } from "@clerk/nextjs";
import { useAction, useConvexAuth, useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { BFG_MEMBERSHIP_CORRELATION_KEY } from "@/config/clerk";
import {
  getConvexErrorCode,
  ProductContext,
  resolveProductMembershipState,
  resolveProductAuthState,
  type ProductContextValue,
} from "@/domain/prototype/context";
import { ConvexOperationsProvider } from "@/domain/prototype/operations-context";
import {
  getCatalogAttemptKey,
  getStoredCatalogSession,
  getStoredUnlockedCatalogId,
  roleCanAccess,
  setStoredCatalogSession,
  setStoredUnlockedCatalogId,
  type StoredCatalogSession,
} from "@/domain/prototype/session";
import { normalizeCatalogStatus } from "@/domain/prototype/logic";
import type {
  BookFormat,
  CatalogAccessOption,
  CreateCatalogInput,
  CreateCatalogResult,
  CreateOrderInput,
  Order,
  OrderStatus,
  PrototypeState,
  SecretCatalog,
} from "@/domain/prototype/types";
import { useConvexRetry } from "@/providers/convex-provider";

type CatalogView = NonNullable<FunctionReturnType<typeof api.catalogAccess.getUnlocked>>;
export type OrderView = Awaited<FunctionReturnType<typeof api.orders.submit>>;
type CatalogRecord = {
  id: string;
  name: string;
  status: string;
  closingAt: string | null;
  estimatedArrivalMonth?: string | null;
  createdAt: string;
  titleCount?: number;
  books: Array<{
    id: string;
    title: string;
    publisher: string;
    author?: string | null;
    description?: string | null;
    coverImageUrl?: string | null;
    coverPresentation?: { zoom: number; x: number; y: number } | null;
    gallery?: Array<{ mediaId: string; displayOrder: number; altText: string; url: string }>;
    externalPreview?: { label: string; url: string } | null;
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
  customerUserId: string;
  catalogId: string | null;
  customerName: string;
  customerEmail?: string;
  customerMemberCode?: string | null;
  orderCode?: string | null;
  source?: "customer_self_service" | "admin_assisted" | "ready_stock";
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
    status: normalizeCatalogStatus(record.status),
    closingAt: record.closingAt,
    estimatedArrivalMonth: record.estimatedArrivalMonth,
    createdAt: record.createdAt,
    titleCount: record.titleCount,
    books: record.books,
  };
}

export function asOrder(value: OrderView | null | undefined): Order | undefined {
  if (!value) return undefined;
  const record = value as unknown as OrderRecord;
  return {
    id: record.orderId,
    orderCode: record.orderCode || undefined,
    customerUserId: record.customerUserId,
    catalogId: record.catalogId,
    customerName: record.customerName,
    customerEmail: record.customerEmail || null,
    customerMemberCode: record.customerMemberCode || null,
    source:
      record.source === "admin_assisted"
        ? "admin_assisted"
        : record.source === "ready_stock"
          ? "ready_stock"
          : "preorder",
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

export function ConvexProductProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/";
  const [unlockedCatalogId, setUnlockedCatalogId] = useState<string | null>(null);
  const [catalogSession, setCatalogSession] = useState<StoredCatalogSession | null>(null);
  const [provisioning, setProvisioning] = useState(false);
  const [provisionError, setProvisionError] = useState(false);
  const [admissionDenied, setAdmissionDenied] = useState(false);
  const provisioningSessionRef = useRef<string | null>(null);
  const reconciledSessionRef = useRef<string | null>(null);

  const { isLoaded, isSignedIn, sessionId, userId } = useAuth();
  const authSessionKey = sessionId || userId || "signed-in";
  const { isLoading: convexAuthLoading, isAuthenticated } = useConvexAuth();
  const retryConvexAuth = useConvexRetry();

  const ensureCurrentUser = useAction(api.userProvisioning.ensureCurrentUser);
  const createBundle = useMutation(api.secretCatalogs.createBundle);
  const openCatalog = useMutation(api.secretCatalogs.open);
  const closeCatalogMutation = useMutation(api.secretCatalogs.close);
  const unlock = useMutation(api.catalogAccess.unlock);
  const submit = useMutation(api.orders.submit);
  const edit = useMutation(api.orders.edit);
  const updateStatus = useMutation(api.orders.updateStatus);

  const me = useQuery(api.users.current, isAuthenticated ? {} : "skip");
  const myJoinRequests = useQuery(
    api.joinRequests.mine,
    isAuthenticated && me?.role !== "admin" && me?.role !== "owner" ? {} : "skip",
  );
  const activeUser = me?.status === "active" && isAuthenticated;
  const adminWorkspace = pathname.startsWith("/admin");
  const isAdmin = activeUser && adminWorkspace && roleCanAccess(me?.role || null, "admin");
  const isCustomer = activeUser && !adminWorkspace && roleCanAccess(me?.role || null, "customer");
  const customerProfile = useQuery(api.customerProfiles.getMine, isCustomer ? {} : "skip");
  const customerProfileDisplayName = customerProfile === undefined ? undefined : (customerProfile?.displayName ?? null);
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
    catalogSession
      ? {
          catalogId: catalogSession.catalogId as Id<"secretCatalogs">,
          sessionToken: catalogSession.sessionToken,
        }
      : isCustomer && unlockedCatalogId
        ? { catalogId: unlockedCatalogId as Id<"secretCatalogs"> }
        : "skip",
  );
  const sessionCatalogs = useQuery(
    api.catalogAccess.listForSession,
    catalogSession ? { sessionToken: catalogSession.sessionToken } : "skip",
  );
  const customerOrders = useQuery(
    api.orders.listMine,
    isCustomer ? { paginationOpts: { numItems: 50, cursor: null } } : "skip",
  );

  useEffect(() => {
    queueMicrotask(() => {
      setCatalogSession(getStoredCatalogSession());
      setUnlockedCatalogId(getStoredUnlockedCatalogId());
    });
  }, []);

  useEffect(() => {
    if (
      !isLoaded ||
      !isSignedIn ||
      convexAuthLoading ||
      !isAuthenticated ||
      me === undefined ||
      reconciledSessionRef.current === authSessionKey ||
      provisioningSessionRef.current === authSessionKey ||
      admissionDenied ||
      provisionError
    )
      return;
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      provisioningSessionRef.current = authSessionKey;
      setProvisioning(true);
      setProvisionError(false);
      const storedCorrelationId = window.sessionStorage
        .getItem(BFG_MEMBERSHIP_CORRELATION_KEY)
        ?.match(/^[A-Za-z0-9_-]{1,80}$/)?.[0];
      const correlationId = storedCorrelationId || globalThis.crypto?.randomUUID?.() || `bootstrap-${Date.now()}`;
      void ensureCurrentUser({ correlationId })
        .then(() => {
          if (active) reconciledSessionRef.current = authSessionKey;
        })
        .catch((reason) => {
          if (!active) return;
          if (getConvexErrorCode(reason) === "ADMISSION_REQUIRED" || String(reason).includes("ADMISSION_REQUIRED")) {
            setAdmissionDenied(true);
          } else setProvisionError(true);
        })
        .finally(() => {
          if (provisioningSessionRef.current === authSessionKey) {
            provisioningSessionRef.current = null;
            if (active) setProvisioning(false);
          }
        });
    });
    return () => {
      active = false;
    };
  }, [
    admissionDenied,
    convexAuthLoading,
    ensureCurrentUser,
    isAuthenticated,
    isLoaded,
    isSignedIn,
    me,
    provisionError,
    authSessionKey,
  ]);

  useEffect(() => {
    reconciledSessionRef.current = null;
    queueMicrotask(() => {
      setAdmissionDenied(false);
      setProvisionError(false);
    });
  }, [authSessionKey, isSignedIn]);

  const catalogs = useMemo(
    () =>
      isAdmin
        ? pageOf(adminCatalogs)
            .map((catalog) => asCatalog(catalog as CatalogView))
            .filter(Boolean)
        : [asCatalog(unlocked as CatalogView | null | undefined)].filter(Boolean),
    [adminCatalogs, isAdmin, unlocked],
  ) as SecretCatalog[];
  const catalogOptions = useMemo<CatalogAccessOption[]>(() => {
    const sessionOptions = (sessionCatalogs || []).map((option) => ({
      id: option.id,
      name: option.name,
      status: normalizeCatalogStatus(option.status),
      closingAt: option.closingAt,
      estimatedArrivalMonth: option.estimatedArrivalMonth,
      titleCount: option.titleCount,
    }));
    if (sessionOptions.length) return sessionOptions;
    const current = asCatalog(unlocked as CatalogView | null | undefined);
    return current
      ? [
          {
            id: current.id,
            name: current.name,
            status: current.status,
            closingAt: current.closingAt,
            estimatedArrivalMonth: current.estimatedArrivalMonth,
            titleCount: current.titleCount,
          },
        ]
      : [];
  }, [sessionCatalogs, unlocked]);
  const orders = useMemo(
    () =>
      (isAdmin ? pageOf(adminOrders) : pageOf(customerOrders))
        .map((order) => asOrder(order as OrderView))
        .filter(Boolean),
    [adminOrders, customerOrders, isAdmin],
  ) as Order[];
  const state = useMemo<PrototypeState>(() => ({ catalogs, orders, invoices: [] }), [catalogs, orders]);

  const createCatalog = useCallback(
    async (input: CreateCatalogInput) => {
      const bundle = await createBundle({
        name: input.name,
        publisherName: input.publisher,
        bookTitle: input.title,
        accessCode: input.accessCode,
        accessCodeExpiresAt: input.accessCodeExpiresAt ? Date.parse(input.accessCodeExpiresAt) : undefined,
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
      return { catalog, accessCode: bundle.accessCode } satisfies CreateCatalogResult;
    },
    [createBundle, openCatalog],
  );

  const unlockCatalog = useCallback(
    async (accessCode: string) => {
      const result = await unlock({
        accessCode,
        attemptKey: getCatalogAttemptKey(),
      });
      if ("errorCode" in result) throw new Error(result.errorCode);
      const catalog = asCatalog(result.catalog as CatalogView);
      if (catalog) {
        setUnlockedCatalogId(catalog.id);
        if (result.sessionToken) {
          const session = {
            catalogId: result.catalogId,
            sessionToken: result.sessionToken,
            expiresAt: result.expiresAt,
          } satisfies StoredCatalogSession;
          setCatalogSession(session);
          setStoredCatalogSession(session);
        } else {
          setStoredUnlockedCatalogId(catalog.id);
        }
      }
      return catalog;
    },
    [unlock],
  );

  const selectCatalog = useCallback(
    (catalogId: string) => {
      if (catalogSession) {
        const nextSession = { ...catalogSession, catalogId };
        setCatalogSession(nextSession);
        setStoredCatalogSession(nextSession);
        return;
      }
      setUnlockedCatalogId(catalogId);
      setStoredUnlockedCatalogId(catalogId);
    },
    [catalogSession],
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

  const authState = resolveProductAuthState({
    clerkLoaded: isLoaded,
    clerkSignedIn: isSignedIn,
    convexLoading: convexAuthLoading,
    convexAuthenticated: isAuthenticated,
    appUser: me,
    provisioning,
    admissionDenied,
    provisionError,
  });
  const membershipState = resolveProductMembershipState({
    clerkLoaded: isLoaded,
    clerkSignedIn: isSignedIn,
    convexLoading: convexAuthLoading,
    appUser: me,
    provisioning,
    requests: myJoinRequests,
  });
  const retryAuth = useCallback(() => {
    setProvisionError(false);
    retryConvexAuth();
  }, [retryConvexAuth]);
  const catalogLoading = Boolean(
    unlocked === undefined && (catalogSession !== null || (isCustomer && unlockedCatalogId !== null)),
  );
  const catalogsLoading = Boolean(isAdmin && adminCatalogs === undefined);
  const ordersLoading = Boolean((isCustomer && customerOrders === undefined) || (isAdmin && adminOrders === undefined));

  const value = useMemo<ProductContextValue>(
    () => ({
      hydrated:
        isLoaded &&
        (isSignedIn === false || (isSignedIn === true && ((me !== undefined && me !== null) || provisionError))),
      dataSource: "convex",
      sessionRole: me?.role || null,
      userStatus: me?.status || null,
      customerProfileDisplayName,
      authState,
      membershipState,
      catalogLoading,
      catalogsLoading,
      ordersLoading,
      retryAuth,
      state,
      unlockedCatalog: asCatalog(unlocked as CatalogView | null | undefined),
      catalogOptions,
      selectCatalog,
      createCatalog,
      unlockCatalog,
      submitOrder,
      updateOrderStatus,
      closeCatalog,
      editOrder,
    }),
    [
      closeCatalog,
      createCatalog,
      catalogOptions,
      customerProfileDisplayName,
      editOrder,
      authState,
      catalogLoading,
      catalogsLoading,
      me,
      membershipState,
      isLoaded,
      isSignedIn,
      ordersLoading,
      provisionError,
      retryAuth,
      state,
      selectCatalog,
      submitOrder,
      unlockCatalog,
      unlocked,
      updateOrderStatus,
    ],
  );

  return (
    <ProductContext.Provider value={value}>
      <ConvexOperationsProvider enabled role={me?.role || null} active={authState === "authenticated"}>
        {children}
      </ConvexOperationsProvider>
    </ProductContext.Provider>
  );
}
