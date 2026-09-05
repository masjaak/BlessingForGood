import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { requireOwner } from "./lib/auth";
import { recordAudit } from "./lib/audit";
import { fail } from "./lib/errors";

const MAX_UAT_ROWS = 2000;

export type ImpactRow = {
  key: string;
  label: string;
  count: number;
  amount?: number;
};

export type UatImpact = {
  entityType: "catalog" | "batch" | "invoice" | "order";
  entityId: string;
  entityName: string;
  reference?: string | null;
  status: string;
  safe: boolean;
  blocker: string | null;
  delete: ImpactRow[];
  detach: ImpactRow[];
  preserve: ImpactRow[];
};

type DataCtx = QueryCtx | MutationCtx;

function row(key: string, label: string, count: number, amount?: number): ImpactRow {
  return amount === undefined ? { key, label, count } : { key, label, count, amount };
}

function blockerMessage(blockers: string[]): string | null {
  return blockers.length ? blockers.join("; ") : null;
}

async function capped<T>(rowsPromise: Promise<T[]>, label: string, blockers: string[]): Promise<T[]> {
  const rows = await rowsPromise;
  if (rows.length > MAX_UAT_ROWS) {
    blockers.push(`${label} melebihi batas pembersihan aman (${MAX_UAT_ROWS})`);
    return rows.slice(0, MAX_UAT_ROWS);
  }
  return rows;
}

async function relatedNotifications(
  ctx: DataCtx,
  relatedEntityType: string,
  relatedEntityId: string,
  blockers: string[],
) {
  return capped(
    ctx.db
      .query("notifications")
      .withIndex("by_related_entity", (index) =>
        index.eq("relatedEntityType", relatedEntityType).eq("relatedEntityId", relatedEntityId),
      )
      .take(MAX_UAT_ROWS + 1),
    `${relatedEntityType} notifications`,
    blockers,
  );
}

async function relatedAudits(ctx: DataCtx, targetType: string, targetId: string, blockers: string[]) {
  return capped(
    ctx.db
      .query("auditEvents")
      .withIndex("by_target", (index) => index.eq("targetType", targetType).eq("targetId", targetId))
      .take(MAX_UAT_ROWS + 1),
    `${targetType} audit events`,
    blockers,
  );
}

function unique<T>(rows: T[], key: (value: T) => string): T[] {
  const seen = new Set<string>();
  return rows.filter((value) => {
    const id = key(value);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

type CatalogPlan = {
  catalog: Doc<"secretCatalogs">;
  items: Doc<"catalogItems">[];
  codes: Doc<"catalogAccessCodes">[];
  grants: Doc<"catalogAccessGrants">[];
  sessions: Doc<"catalogAccessSessions">[];
  links: Doc<"catalogBatchLinks">[];
  orders: Doc<"orders">[];
  orderItemsToDetach: Doc<"orderItems">[];
  assignmentsToDelete: Doc<"orderItemBatchAssignments">[];
  accessPeriod: Doc<"catalogAccessPeriods"> | null;
  accessPeriodSessions: Doc<"catalogAccessSessions">[];
  accessPeriodSiblings: Doc<"secretCatalogs">[];
  notifications: Doc<"notifications">[];
  auditEvents: Doc<"auditEvents">[];
  blockers: string[];
};

async function catalogPlan(ctx: DataCtx, catalogId: Id<"secretCatalogs">): Promise<CatalogPlan | null> {
  const catalog = await ctx.db.get(catalogId);
  if (!catalog) return null;
  const blockers: string[] = [];
  const [items, codes, grants, sessions, links, orders, notifications, auditEvents] = await Promise.all([
    capped(
      ctx.db
        .query("catalogItems")
        .withIndex("by_catalog", (index) => index.eq("catalogId", catalogId))
        .take(MAX_UAT_ROWS + 1),
      "catalog items",
      blockers,
    ),
    capped(
      ctx.db
        .query("catalogAccessCodes")
        .withIndex("by_catalog", (index) => index.eq("catalogId", catalogId))
        .take(MAX_UAT_ROWS + 1),
      "catalog access codes",
      blockers,
    ),
    capped(
      ctx.db
        .query("catalogAccessGrants")
        .withIndex("by_catalog", (index) => index.eq("catalogId", catalogId))
        .take(MAX_UAT_ROWS + 1),
      "catalog access grants",
      blockers,
    ),
    capped(
      ctx.db
        .query("catalogAccessSessions")
        .withIndex("by_catalog", (index) => index.eq("catalogId", catalogId))
        .take(MAX_UAT_ROWS + 1),
      "catalog access sessions",
      blockers,
    ),
    capped(
      ctx.db
        .query("catalogBatchLinks")
        .withIndex("by_catalog", (index) => index.eq("catalogId", catalogId))
        .take(MAX_UAT_ROWS + 1),
      "catalog batch links",
      blockers,
    ),
    capped(
      ctx.db
        .query("orders")
        .withIndex("by_catalog", (index) => index.eq("catalogId", catalogId))
        .take(MAX_UAT_ROWS + 1),
      "catalog orders",
      blockers,
    ),
    relatedNotifications(ctx, "catalog", String(catalogId), blockers),
    relatedAudits(ctx, "catalog", String(catalogId), blockers),
  ]);

  const batchIds = new Set<Id<"batches">>();
  for (const link of links) {
    batchIds.add(link.batchId);
    if (!(await ctx.db.get(link.batchId))) blockers.push("ditemukan relasi Batch yang sudah tidak memiliki root");
  }

  const catalogItemIds = new Set(items.map((item) => item._id));
  const orderItemsToDetach: Doc<"orderItems">[] = [];
  const assignmentsToDelete: Doc<"orderItemBatchAssignments">[] = [];
  const catalogOrderItems = (
    await Promise.all(
      [...catalogItemIds].map((catalogItemId) =>
        capped(
          ctx.db
            .query("orderItems")
            .withIndex("by_catalog_item", (index) => index.eq("catalogItemId", catalogItemId))
            .take(MAX_UAT_ROWS + 1),
          "catalog order items",
          blockers,
        ),
      ),
    )
  ).flat();
  for (const item of unique(catalogOrderItems, (orderItem) => String(orderItem._id))) {
    const order = await ctx.db.get(item.orderId);
    if (!order) {
      blockers.push("ditemukan Order Item Catalog tanpa root Order");
      continue;
    }
    orderItemsToDetach.push(item);
    const assignments = await capped(
      ctx.db
        .query("orderItemBatchAssignments")
        .withIndex("by_order_item", (index) => index.eq("orderItemId", item._id))
        .take(MAX_UAT_ROWS + 1),
      "catalog order assignments",
      blockers,
    );
    assignmentsToDelete.push(...assignments.filter((assignment) => batchIds.has(assignment.batchId)));
  }

  const accessPeriod = catalog.accessPeriodId ? await ctx.db.get(catalog.accessPeriodId) : null;
  if (catalog.accessPeriodId && !accessPeriod) blockers.push("ditemukan access period yang tidak memiliki root");
  const accessPeriodSiblings = accessPeriod
    ? await capped(
        ctx.db
          .query("secretCatalogs")
          .withIndex("by_access_period", (index) => index.eq("accessPeriodId", accessPeriod._id))
          .take(MAX_UAT_ROWS + 1),
        "shared catalog access period references",
        blockers,
      ).then((rows) => rows.filter((row) => row._id !== catalogId))
    : [];
  const accessPeriodSessions = accessPeriod
    ? await capped(
        ctx.db
          .query("catalogAccessSessions")
          .withIndex("by_access_period", (index) => index.eq("accessPeriodId", accessPeriod._id))
          .take(MAX_UAT_ROWS + 1),
        "catalog access period sessions",
        blockers,
      )
    : [];
  if (accessPeriod && accessPeriod.anchorCatalogId === catalogId && accessPeriodSiblings.length === 0) {
    const externalSessions = accessPeriodSessions.filter((session) => session.catalogId !== catalogId);
    if (externalSessions.length) blockers.push("access period masih memiliki session dari Catalog lain");
  }

  return {
    catalog,
    items,
    codes,
    grants,
    sessions,
    links,
    orders,
    orderItemsToDetach: unique(orderItemsToDetach, (item) => String(item._id)),
    assignmentsToDelete: unique(assignmentsToDelete, (assignment) => String(assignment._id)),
    accessPeriod,
    accessPeriodSessions,
    accessPeriodSiblings,
    notifications,
    auditEvents,
    blockers,
  };
}

function catalogImpact(plan: CatalogPlan): UatImpact {
  const periodIsShared = plan.accessPeriodSiblings.length > 0;
  const deleteRows = [
    row("catalog", "Catalog", 1),
    row("catalogItems", "produk katalog", plan.items.length),
    row("catalogAccessCodes", "kode akses katalog", plan.codes.length),
    row("catalogAccessGrants", "akses customer", plan.grants.length),
    row("catalogAccessSessions", "session akses", plan.sessions.length),
    row("orderItemBatchAssignments", "penugasan turunan Catalog", plan.assignmentsToDelete.length),
    row("notifications", "notifikasi terkait", plan.notifications.length),
    row("auditEvents", "riwayat audit operasional", plan.auditEvents.length),
  ];
  if (plan.accessPeriod && !periodIsShared) deleteRows.push(row("catalogAccessPeriods", "access period", 1));
  return {
    entityType: "catalog",
    entityId: String(plan.catalog._id),
    entityName: plan.catalog.name,
    status: plan.catalog.status,
    safe: plan.blockers.length === 0,
    blocker: blockerMessage(plan.blockers),
    delete: deleteRows,
    detach: [
      row("orders", "pesanan yang dilepas dari Catalog", plan.orders.length),
      row("orderItems", "referensi item pesanan", plan.orderItemsToDetach.length),
      row("catalogBatchLinks", "relasi Batch", plan.links.length),
      ...(periodIsShared ? [row("catalogAccessPeriods", "access period yang dipindahkan ke Catalog lain", 1)] : []),
    ],
    preserve: [
      row("batches", "root Batch bersama", new Set(plan.links.map((link) => String(link.batchId))).size),
      row("orders", "root Order bersama", plan.orders.length),
      row("customers", "Customer", new Set(plan.orders.map((order) => String(order.customerUserId))).size),
      row(
        "bookVariants",
        "referensi Book Variant (Book Master tidak disentuh)",
        new Set(plan.items.map((item) => String(item.bookVariantId))).size,
      ),
    ],
  };
}

type BatchPlan = {
  batch: Doc<"batches">;
  links: Doc<"catalogBatchLinks">[];
  assignments: Doc<"orderItemBatchAssignments">[];
  history: Doc<"batchStatusHistory">[];
  invoices: Doc<"invoices">[];
  notifications: Doc<"notifications">[];
  auditEvents: Doc<"auditEvents">[];
  blockers: string[];
};

async function batchPlan(ctx: DataCtx, batchId: Id<"batches">): Promise<BatchPlan | null> {
  const batch = await ctx.db.get(batchId);
  if (!batch) return null;
  const blockers: string[] = [];
  const [links, assignments, history, invoices, notifications, rootAuditEvents] = await Promise.all([
    capped(
      ctx.db
        .query("catalogBatchLinks")
        .withIndex("by_batch", (index) => index.eq("batchId", batchId))
        .take(MAX_UAT_ROWS + 1),
      "batch catalog links",
      blockers,
    ),
    capped(
      ctx.db
        .query("orderItemBatchAssignments")
        .withIndex("by_batch", (index) => index.eq("batchId", batchId))
        .take(MAX_UAT_ROWS + 1),
      "batch assignments",
      blockers,
    ),
    capped(
      ctx.db
        .query("batchStatusHistory")
        .withIndex("by_batch", (index) => index.eq("batchId", batchId))
        .take(MAX_UAT_ROWS + 1),
      "batch status history",
      blockers,
    ),
    capped(
      ctx.db
        .query("invoices")
        .withIndex("by_batch", (index) => index.eq("batchId", batchId))
        .take(MAX_UAT_ROWS + 1),
      "batch invoices",
      blockers,
    ),
    relatedNotifications(ctx, "batch", String(batchId), blockers),
    relatedAudits(ctx, "batch", String(batchId), blockers),
  ]);
  for (const link of links)
    if (!(await ctx.db.get(link.catalogId))) blockers.push("ditemukan relasi Catalog yang sudah tidak memiliki root");
  for (const assignment of assignments) {
    const item = await ctx.db.get(assignment.orderItemId);
    const order = item ? await ctx.db.get(item.orderId) : null;
    if (!item || !order) blockers.push("ditemukan assignment Batch tanpa Order atau Order Item");
  }
  for (const invoice of invoices) {
    if (!(await ctx.db.get(invoice.orderId))) blockers.push("ditemukan Invoice Batch tanpa Order");
    if (!(await ctx.db.get(invoice.customerUserId))) blockers.push("ditemukan Invoice Batch tanpa Customer");
  }
  const assignmentAuditEvents = (
    await Promise.all(
      assignments.map((assignment) => relatedAudits(ctx, "orderItem", String(assignment.orderItemId), blockers)),
    )
  )
    .flat()
    .filter(
      (event) =>
        event.safeMetadata?.batchId === String(batchId) ||
        event.safeMetadata?.fromBatchId === String(batchId) ||
        event.safeMetadata?.toBatchId === String(batchId),
    );
  return {
    batch,
    links,
    assignments,
    history,
    invoices,
    notifications,
    auditEvents: unique([...rootAuditEvents, ...assignmentAuditEvents], (event) => String(event._id)),
    blockers,
  };
}

function batchImpact(plan: BatchPlan): UatImpact {
  return {
    entityType: "batch",
    entityId: String(plan.batch._id),
    entityName: plan.batch.name,
    status: plan.batch.isArchived ? "archived" : plan.batch.currentShipmentStage || "open",
    safe: plan.blockers.length === 0,
    blocker: blockerMessage(plan.blockers),
    delete: [
      row("batch", "Batch", 1),
      row("orderItemBatchAssignments", "roster / penugasan", plan.assignments.length),
      row("batchStatusHistory", "riwayat shipment", plan.history.length),
      row("notifications", "notifikasi terkait", plan.notifications.length),
      row("auditEvents", "riwayat audit operasional", plan.auditEvents.length),
    ],
    detach: [
      row("catalogBatchLinks", "relasi Catalog", plan.links.length),
      row("invoices", "Invoice yang dilepas dari Batch", plan.invoices.length),
    ],
    preserve: [
      row("catalogs", "root Catalog", new Set(plan.links.map((link) => String(link.catalogId))).size),
      row("orders", "root Order", plan.assignments.length),
      row("customers", "Customer", new Set(plan.invoices.map((invoice) => String(invoice.customerUserId))).size),
      row("invoices", "Invoice", plan.invoices.length),
    ],
  };
}

type OrderCandidatePlan = {
  batch: Doc<"batches">;
  customerUserId: Id<"appUsers">;
  customer: Doc<"appUsers"> | null;
  customerName: string;
  assignments: Doc<"orderItemBatchAssignments">[];
  orders: Doc<"orders">[];
  orderItems: Doc<"orderItems">[];
  sharedOrders: Doc<"orders">[];
  sharedOrderItems: Doc<"orderItems">[];
  exclusiveOrders: Doc<"orders">[];
  exclusiveOrderItems: Doc<"orderItems">[];
  exclusiveAssignments: Doc<"orderItemBatchAssignments">[];
  detachedAssignments: Doc<"orderItemBatchAssignments">[];
  statusHistory: Doc<"orderStatusHistory">[];
  fulfillmentHistory: Doc<"orderFulfillmentHistory">[];
  notifications: Doc<"notifications">[];
  auditEvents: Doc<"auditEvents">[];
  totalAmount: number;
  blockers: string[];
};

async function orderCandidatePlan(
  ctx: DataCtx,
  customerUserId: Id<"appUsers">,
  batchId: Id<"batches">,
): Promise<OrderCandidatePlan | null> {
  const batch = await ctx.db.get(batchId);
  if (!batch) return null;
  const blockers: string[] = [];
  if (batch.isArchived || !batch.currentShipmentStage) {
    blockers.push("Batch kandidat tidak lagi tersedia di antrian invoice aktif");
  }
  const candidateAssignments = await capped(
    ctx.db
      .query("orderItemBatchAssignments")
      .withIndex("by_batch", (index) => index.eq("batchId", batchId))
      .take(MAX_UAT_ROWS + 1),
    "candidate Batch assignments",
    blockers,
  );
  const assignments: Doc<"orderItemBatchAssignments">[] = [];
  const ordersById = new Map<string, Doc<"orders">>();
  let totalAmount = 0;
  for (const assignment of candidateAssignments) {
    const item = await ctx.db.get(assignment.orderItemId);
    const order = item ? await ctx.db.get(item.orderId) : null;
    if (!item || !order) {
      blockers.push("ditemukan assignment kandidat tanpa Order atau Order Item");
      continue;
    }
    if (order.customerUserId !== customerUserId || order.status === "cancelled" || assignment.assignedQuantity <= 0) {
      continue;
    }
    assignments.push(assignment);
    ordersById.set(String(order._id), order);
    const subtotal = item.unitPriceAmountSnapshot * assignment.assignedQuantity;
    if (
      !Number.isSafeInteger(item.unitPriceAmountSnapshot) ||
      item.unitPriceAmountSnapshot < 0 ||
      !Number.isSafeInteger(assignment.assignedQuantity) ||
      !Number.isSafeInteger(subtotal)
    ) {
      blockers.push("snapshot Order Item kandidat tidak valid");
    } else {
      totalAmount += subtotal;
      if (!Number.isSafeInteger(totalAmount)) blockers.push("total kandidat tidak valid");
    }
  }
  if (!assignments.length) return null;

  const orders = [...ordersById.values()];
  const orderItems: Doc<"orderItems">[] = [];
  const sharedOrders: Doc<"orders">[] = [];
  const sharedOrderItems: Doc<"orderItems">[] = [];
  const exclusiveOrders: Doc<"orders">[] = [];
  const exclusiveOrderItems: Doc<"orderItems">[] = [];
  const exclusiveAssignments: Doc<"orderItemBatchAssignments">[] = [];
  const detachedAssignments: Doc<"orderItemBatchAssignments">[] = [];
  const statusHistory: Doc<"orderStatusHistory">[] = [];
  const fulfillmentHistory: Doc<"orderFulfillmentHistory">[] = [];
  const notifications: Doc<"notifications">[] = [];
  const auditEvents: Doc<"auditEvents">[] = [];
  const candidateItemIds = new Set(assignments.map((assignment) => String(assignment.orderItemId)));

  for (const order of orders) {
    if (order.status !== "submitted") blockers.push("Order kandidat tidak lagi berstatus submitted");
    if (order.source === "ready_stock" || !order.catalogId) {
      blockers.push("Order kandidat bukan Order Catalog yang aman untuk purge");
    }
    const allItems = await capped(
      ctx.db
        .query("orderItems")
        .withIndex("by_order", (index) => index.eq("orderId", order._id))
        .take(MAX_UAT_ROWS + 1),
      "candidate Order Items",
      blockers,
    );
    const orderInvoices = await ctx.db
      .query("invoices")
      .withIndex("by_order", (index) => index.eq("orderId", order._id))
      .take(MAX_UAT_ROWS + 1);
    if (orderInvoices.length) blockers.push("Order kandidat sudah memiliki riwayat Invoice");
    const itemAssignments = new Map<string, Doc<"orderItemBatchAssignments">[]>();
    for (const item of allItems) {
      orderItems.push(item);
      const itemRows = await capped(
        ctx.db
          .query("orderItemBatchAssignments")
          .withIndex("by_order_item", (index) => index.eq("orderItemId", item._id))
          .take(MAX_UAT_ROWS + 1),
        "candidate item assignments",
        blockers,
      );
      itemAssignments.set(String(item._id), itemRows);
      const invoices = unique(
        (
          await Promise.all(
            (
              await ctx.db
                .query("invoiceItems")
                .withIndex("by_order_item", (index) => index.eq("orderItemId", item._id))
                .take(MAX_UAT_ROWS + 1)
            ).map((invoiceItem) => ctx.db.get(invoiceItem.invoiceId)),
          )
        ).filter((invoice): invoice is Doc<"invoices"> => Boolean(invoice)),
        (invoice) => String(invoice._id),
      );
      if (invoices.length) blockers.push("Order Item kandidat sudah memiliki riwayat Invoice");
    }
    const orderExceptions = await ctx.db
      .query("orderExceptions")
      .withIndex("by_order", (index) => index.eq("orderId", order._id))
      .take(MAX_UAT_ROWS + 1);
    const adjustments = await ctx.db
      .query("orderExceptionFinancialAdjustments")
      .withIndex("by_order", (index) => index.eq("orderId", order._id))
      .take(MAX_UAT_ROWS + 1);
    const exceptionEvents = await ctx.db
      .query("orderExceptionEvents")
      .withIndex("by_order", (index) => index.eq("orderId", order._id))
      .take(MAX_UAT_ROWS + 1);
    const refundObligations = await capped(
      ctx.db
        .query("refundObligations")
        .withIndex("by_customer_user_id_and_created_at", (index) => index.eq("customerUserId", order.customerUserId))
        .take(MAX_UAT_ROWS + 1),
      "candidate refund obligations",
      blockers,
    );
    const orderRefundObligations = refundObligations.filter((obligation) => obligation.orderId === order._id);
    const reservations = await ctx.db
      .query("readyStockReservations")
      .withIndex("by_order", (index) => index.eq("orderId", order._id))
      .take(MAX_UAT_ROWS + 1);
    if (
      orderExceptions.length ||
      adjustments.length ||
      exceptionEvents.length ||
      orderRefundObligations.length ||
      reservations.length
    ) {
      blockers.push("Order kandidat memiliki consequence finansial atau fulfillment");
    }

    const isExclusive =
      allItems.length > 0 &&
      allItems.every((item) => {
        const rows = itemAssignments.get(String(item._id)) || [];
        return rows.length > 0 && rows.every((assignment) => assignment.batchId === batchId);
      });
    const allItemIds = new Set(allItems.map((item) => String(item._id)));
    const orderTargetAssignments = assignments.filter((assignment) => allItemIds.has(String(assignment.orderItemId)));
    if (isExclusive) {
      exclusiveOrders.push(order);
      exclusiveOrderItems.push(...allItems);
      for (const item of allItems) exclusiveAssignments.push(...(itemAssignments.get(String(item._id)) || []));
      statusHistory.push(
        ...(await capped(
          ctx.db
            .query("orderStatusHistory")
            .withIndex("by_order", (index) => index.eq("orderId", order._id))
            .take(MAX_UAT_ROWS + 1),
          "candidate Order history",
          blockers,
        )),
      );
      fulfillmentHistory.push(
        ...(await capped(
          ctx.db
            .query("orderFulfillmentHistory")
            .withIndex("by_order", (index) => index.eq("orderId", order._id))
            .take(MAX_UAT_ROWS + 1),
          "candidate fulfillment history",
          blockers,
        )),
      );
      notifications.push(...(await relatedNotifications(ctx, "order", String(order._id), blockers)));
      auditEvents.push(...(await relatedAudits(ctx, "order", String(order._id), blockers)));
      for (const item of allItems) {
        notifications.push(...(await relatedNotifications(ctx, "orderItem", String(item._id), blockers)));
        auditEvents.push(...(await relatedAudits(ctx, "orderItem", String(item._id), blockers)));
      }
    } else {
      sharedOrders.push(order);
      sharedOrderItems.push(...allItems.filter((item) => candidateItemIds.has(String(item._id))));
      detachedAssignments.push(...orderTargetAssignments);
    }
  }

  const customer = await ctx.db.get(customerUserId);
  const customerName =
    orders[0]?.customerName || customer?.displayNameSnapshot || customer?.emailSnapshot || "Customer BFG";
  return {
    batch,
    customerUserId,
    customer,
    customerName,
    assignments,
    orders,
    orderItems: unique(orderItems, (item) => String(item._id)),
    sharedOrders: unique(sharedOrders, (order) => String(order._id)),
    sharedOrderItems: unique(sharedOrderItems, (item) => String(item._id)),
    exclusiveOrders: unique(exclusiveOrders, (order) => String(order._id)),
    exclusiveOrderItems: unique(exclusiveOrderItems, (item) => String(item._id)),
    exclusiveAssignments: unique(exclusiveAssignments, (assignment) => String(assignment._id)),
    detachedAssignments: unique(detachedAssignments, (assignment) => String(assignment._id)),
    statusHistory: unique(statusHistory, (event) => String(event._id)),
    fulfillmentHistory: unique(fulfillmentHistory, (event) => String(event._id)),
    notifications: unique(notifications, (notice) => String(notice._id)),
    auditEvents: unique(auditEvents, (event) => String(event._id)),
    totalAmount,
    blockers,
  };
}

function orderCandidateImpact(plan: OrderCandidatePlan): UatImpact {
  const bookIds = new Set(plan.orderItems.map((item) => String(item.bookId)));
  const orderReferences = plan.orders
    .map((order) => order.orderCode)
    .filter(Boolean)
    .join(", ");
  return {
    entityType: "order",
    entityId: `${String(plan.customerUserId)}:${String(plan.batch._id)}`,
    entityName: `${plan.customerName} · ${plan.batch.name}`,
    reference: orderReferences || null,
    status: plan.orders.every((order) => order.status === "submitted") ? "submitted" : "mixed",
    safe: plan.blockers.length === 0,
    blocker: blockerMessage(plan.blockers),
    delete: [
      row("candidate", "kandidat tagihan", 1, plan.totalAmount),
      row("orders", "root Order eksklusif", plan.exclusiveOrders.length),
      row("orderItems", "Order Item", plan.exclusiveOrderItems.length),
      row("orderItemBatchAssignments", "assignment", plan.exclusiveAssignments.length),
      row("orderStatusHistory", "riwayat Order", plan.statusHistory.length),
      row("orderFulfillmentHistory", "riwayat fulfillment", plan.fulfillmentHistory.length),
      row("notifications", "notifikasi terkait Order", plan.notifications.length),
      row("auditEvents", "riwayat audit Order", plan.auditEvents.length),
    ],
    detach: [row("orderItemBatchAssignments", "assignment dari Order shared", plan.detachedAssignments.length)],
    preserve: [
      row("customers", "Customer", plan.customer ? 1 : 0),
      row("books", "Book Master", bookIds.size),
      row("batches", "Batch root", 1),
      row("orders", "Order shared", plan.sharedOrders.length),
      row("orderItems", "Order Item shared", plan.sharedOrderItems.length),
    ],
  };
}

type InvoicePlan = {
  invoice: Doc<"invoices">;
  order: Doc<"orders"> | null;
  customer: Doc<"appUsers"> | null;
  items: Doc<"invoiceItems">[];
  payments: Doc<"paymentConfirmations">[];
  allocations: Doc<"invoiceDepositAllocations">[];
  obligations: Doc<"refundObligations">[];
  payouts: Doc<"refundPayouts">[];
  depositTransactions: Doc<"depositTransactions">[];
  topUps: Doc<"depositTopUps">[];
  proofStorageIds: Id<"_storage">[];
  account: Doc<"depositAccounts"> | null;
  adjustmentRows: Doc<"orderExceptionFinancialAdjustments">[];
  notifications: Doc<"notifications">[];
  auditEvents: Doc<"auditEvents">[];
  blockers: string[];
};

async function invoicePlan(ctx: DataCtx, invoiceId: Id<"invoices">): Promise<InvoicePlan | null> {
  const invoice = await ctx.db.get(invoiceId);
  if (!invoice) return null;
  const blockers: string[] = [];
  const [order, customerRecord, items, payments, allocations, obligations, adjustmentRows, notifications, rootAuditEvents] = await Promise.all(
    [
      ctx.db.get(invoice.orderId),
      ctx.db.get(invoice.customerUserId),
      capped(
        ctx.db
          .query("invoiceItems")
          .withIndex("by_invoice", (index) => index.eq("invoiceId", invoiceId))
          .take(MAX_UAT_ROWS + 1),
        "Invoice items",
        blockers,
      ),
      capped(
        ctx.db
          .query("paymentConfirmations")
          .withIndex("by_invoice", (index) => index.eq("invoiceId", invoiceId))
          .take(MAX_UAT_ROWS + 1),
        "payment confirmations",
        blockers,
      ),
      capped(
        ctx.db
          .query("invoiceDepositAllocations")
          .withIndex("by_invoice", (index) => index.eq("invoiceId", invoiceId))
          .take(MAX_UAT_ROWS + 1),
        "deposit allocations",
        blockers,
      ),
      capped(
        ctx.db
          .query("refundObligations")
          .withIndex("by_invoice", (index) => index.eq("invoiceId", invoiceId))
          .take(MAX_UAT_ROWS + 1),
        "refund obligations",
        blockers,
      ),
      capped(
        ctx.db
          .query("orderExceptionFinancialAdjustments")
          .withIndex("by_invoice", (index) => index.eq("invoiceId", invoiceId))
          .take(MAX_UAT_ROWS + 1),
        "financial adjustments",
        blockers,
      ),
      relatedNotifications(ctx, "invoice", String(invoiceId), blockers),
      relatedAudits(ctx, "invoice", String(invoiceId), blockers),
    ],
  );
  const customer = customerRecord?.role === "customer" ? customerRecord : null;
  if (!order) blockers.push("Invoice Order root tidak ditemukan");
  if (
    invoice.financialAdjustmentAmount !== 0 ||
    invoice.adjustedTotalAmount !== invoice.totalAmount ||
    adjustmentRows.length
  ) {
    blockers.push("Invoice memiliki financial adjustment yang belum memiliki jalur purge UAT deterministik");
  }
  for (const item of items) {
    const orderItem = await ctx.db.get(item.orderItemId);
    if (!orderItem || orderItem.orderId !== invoice.orderId)
      blockers.push("InvoiceItem tidak terhubung ke Order Invoice");
  }
  for (const payment of payments) {
    if (payment.customerUserId !== invoice.customerUserId)
      blockers.push("Payment memiliki Customer berbeda dari Invoice");
  }
  for (const allocation of allocations) {
    if (allocation.invoiceId !== invoiceId) blockers.push("Deposit allocation memiliki Invoice berbeda");
  }
  for (const obligation of obligations) {
    if (
      obligation.customerUserId !== invoice.customerUserId ||
      obligation.exceptionId ||
      obligation.sourceAdjustmentId ||
      (obligation.orderId && obligation.orderId !== invoice.orderId)
    ) {
      blockers.push("Refund consequence memiliki relasi shared/exception yang tidak aman untuk purge otomatis");
    }
  }
  for (const obligation of obligations) {
    const [exceptions, adjustments] = await Promise.all([
      ctx.db
        .query("orderExceptions")
        .withIndex("by_refund_obligation", (index) => index.eq("refundObligationId", obligation._id))
        .take(2),
      ctx.db
        .query("orderExceptionFinancialAdjustments")
        .withIndex("by_refund_obligation", (index) => index.eq("refundObligationId", obligation._id))
        .take(2),
    ]);
    if (exceptions.length || adjustments.length) {
      blockers.push("Refund consequence masih direferensikan oleh exception finansial");
    }
  }
  if (invoice.refundObligationAmount > 0 && obligations.length === 0) {
    blockers.push("Invoice memiliki saldo refund tetapi refund consequence tidak ditemukan");
  }

  const payoutRows: Doc<"refundPayouts">[] = [];
  for (const obligation of obligations) {
    payoutRows.push(
      ...(await capped(
        ctx.db
          .query("refundPayouts")
          .withIndex("by_obligation", (index) => index.eq("refundObligationId", obligation._id))
          .take(MAX_UAT_ROWS + 1),
        "refund payouts",
        blockers,
      )),
    );
  }
  const payouts = unique(payoutRows, (payout) => String(payout._id));
  for (const payout of payouts) {
    if (payout.customerUserId !== invoice.customerUserId) {
      blockers.push("Refund payout memiliki Customer shared yang berbeda");
    }
  }
  const transactionMap = new Map<string, Doc<"depositTransactions">>();
  const explicitTransactionIds = new Set<string>();
  const addTransaction = (transaction: Doc<"depositTransactions"> | null, explicit = false) => {
    if (!transaction || transactionMap.has(String(transaction._id))) return;
    if (transaction.invoiceId && transaction.invoiceId !== invoiceId) {
      blockers.push("Deposit transaction memiliki Invoice shared yang berbeda");
    }
    if (
      transaction.refundObligationId &&
      !obligations.some((obligation) => obligation._id === transaction.refundObligationId)
    ) {
      blockers.push("Deposit transaction memiliki Refund obligation shared yang berbeda");
    }
    if (
      !explicit &&
      transaction.invoiceId !== invoiceId &&
      (!transaction.refundObligationId || !obligations.some((obligation) => obligation._id === transaction.refundObligationId))
    ) {
      blockers.push("Deposit transaction tidak dapat diatribusikan secara eksklusif ke Invoice UAT");
    }
    transactionMap.set(String(transaction._id), transaction);
  };
  for (const transaction of await capped(
    ctx.db
      .query("depositTransactions")
      .withIndex("by_invoice", (index) => index.eq("invoiceId", invoiceId))
      .take(MAX_UAT_ROWS + 1),
    "Invoice deposit transactions",
    blockers,
  ))
    addTransaction(transaction);
  for (const allocation of allocations) {
    const reservation = await ctx.db.get(allocation.reservationTransactionId);
    if (!reservation || reservation.type !== "reservation")
      blockers.push("Deposit allocation reservation tidak ditemukan");
    if (reservation && allocation.accountId !== reservation.accountId) {
      blockers.push("Deposit allocation dan reservation memakai account yang berbeda");
    }
    if (reservation) {
      explicitTransactionIds.add(String(reservation._id));
      addTransaction(reservation, true);
    }
    if (allocation.releasedByTransactionId) {
      const release = await ctx.db.get(allocation.releasedByTransactionId);
      if (!release) blockers.push("Deposit allocation release transaction tidak ditemukan");
      if (release) {
        explicitTransactionIds.add(String(release._id));
        addTransaction(release, true);
      }
    }
  }
  for (const payout of payouts) {
    if (!payout.reservationTransactionId) continue;
    const reservation = await ctx.db.get(payout.reservationTransactionId);
    if (!reservation) blockers.push("Refund payout reservation transaction tidak ditemukan");
    if (reservation) {
      explicitTransactionIds.add(String(reservation._id));
      addTransaction(reservation, true);
    }
  }
  for (const obligation of obligations) {
    for (const transaction of await capped(
      ctx.db
        .query("depositTransactions")
        .withIndex("by_refund_obligation", (index) => index.eq("refundObligationId", obligation._id))
        .take(MAX_UAT_ROWS + 1),
      "Refund deposit transactions",
      blockers,
    ))
      addTransaction(transaction);
  }
  for (let changed = true; changed;) {
    changed = false;
    const current = [...transactionMap.values()];
    for (const transaction of current) {
      if (transaction.referenceTransactionId) {
        const parent = await ctx.db.get(transaction.referenceTransactionId);
        if (!parent) blockers.push("Deposit transaction reference parent tidak ditemukan");
        const before = transactionMap.size;
        addTransaction(parent, explicitTransactionIds.has(String(transaction.referenceTransactionId)));
        changed ||= transactionMap.size !== before;
      }
      if (transaction.reversedByTransactionId) {
        const reversal = await ctx.db.get(transaction.reversedByTransactionId);
        if (!reversal) blockers.push("Deposit transaction reversal tidak ditemukan");
        const before = transactionMap.size;
        addTransaction(reversal, explicitTransactionIds.has(String(transaction.reversedByTransactionId)));
        changed ||= transactionMap.size !== before;
      }
      const children = await capped(
        ctx.db
          .query("depositTransactions")
          .withIndex("by_reference_transaction", (index) => index.eq("referenceTransactionId", transaction._id))
          .take(MAX_UAT_ROWS + 1),
        "linked deposit reversals",
        blockers,
      );
      for (const child of children) {
        const before = transactionMap.size;
        addTransaction(child);
        changed ||= transactionMap.size !== before;
      }
    }
  }
  const depositTransactions = [...transactionMap.values()];
  const account = await ctx.db
    .query("depositAccounts")
    .withIndex("by_user_id_and_currency", (index) => index.eq("userId", invoice.customerUserId).eq("currency", "IDR"))
    .unique();
  if (depositTransactions.length && !account) blockers.push("Deposit account root tidak ditemukan");
  if (obligations.some((obligation) => obligation.depositAccountId) && !account) {
    blockers.push("Refund consequence Deposit account root tidak ditemukan");
  }
  if (account && allocations.some((allocation) => allocation.accountId !== account._id)) {
    blockers.push("Deposit allocation memiliki Customer account shared yang berbeda");
  }
  if (account && obligations.some((obligation) => obligation.depositAccountId && obligation.depositAccountId !== account._id)) {
    blockers.push("Refund consequence memiliki Deposit account shared yang berbeda");
  }
  const accountIds = new Set(depositTransactions.map((transaction) => String(transaction.accountId)));
  if (accountIds.size > 1 || (account && accountIds.size === 1 && !accountIds.has(String(account._id)))) {
    blockers.push("Deposit consequences melibatkan lebih dari satu Customer account");
  }

  const topUps: Doc<"depositTopUps">[] = [];
  for (const transaction of depositTransactions) {
    topUps.push(
      ...(await capped(
        ctx.db
          .query("depositTopUps")
          .withIndex("by_deposit_transaction", (index) => index.eq("depositTransactionId", transaction._id))
          .take(MAX_UAT_ROWS + 1),
        "deposit top-ups",
        blockers,
      )),
    );
  }
  const uniqueTopUps = unique(topUps, (topUp) => String(topUp._id));
  if (uniqueTopUps.some((topUp) => topUp.customerUserId !== invoice.customerUserId)) {
    blockers.push("Deposit top-up proof memiliki Customer shared yang berbeda");
  }

  const proofStorageIds = unique(
    [
      ...payments.flatMap((payment) => (payment.proofStorageId ? [payment.proofStorageId] : [])),
      ...uniqueTopUps.map((topUp) => topUp.proofStorageId),
    ],
    String,
  );
  for (const storageId of proofStorageIds) {
    const [otherPayments, otherTopUps, otherBooks, otherMedia] = await Promise.all([
      capped(
        ctx.db
          .query("paymentConfirmations")
          .withIndex("by_proof_storage_id", (index) => index.eq("proofStorageId", storageId))
          .take(MAX_UAT_ROWS + 1),
        "payment proof references",
        blockers,
      ),
      capped(
        ctx.db
          .query("depositTopUps")
          .withIndex("by_proof_storage_id", (index) => index.eq("proofStorageId", storageId))
          .take(MAX_UAT_ROWS + 1),
        "deposit proof references",
        blockers,
      ),
      capped(
        ctx.db
          .query("books")
          .withIndex("by_cover_storage_id", (index) => index.eq("coverStorageId", storageId))
          .take(2),
        "book cover references",
        blockers,
      ),
      capped(
        ctx.db
          .query("bookMedia")
          .withIndex("by_storage_id", (index) => index.eq("storageId", storageId))
          .take(2),
        "book media references",
        blockers,
      ),
    ]);
    if (
      otherPayments.some((payment) => !payments.some((target) => target._id === payment._id)) ||
      otherTopUps.some((topUp) => !uniqueTopUps.some((target) => target._id === topUp._id)) ||
      otherBooks.length ||
      otherMedia.length
    ) {
      blockers.push("payment proof storage dipakai oleh record lain");
    }
  }

  const financialTransactionRows = account
    ? await capped(
        ctx.db
          .query("depositTransactions")
          .withIndex("by_account", (index) => index.eq("accountId", account._id))
          .take(MAX_UAT_ROWS + 1),
        "Customer deposit ledger",
        blockers,
      )
    : [];
  if (account) {
    const currentAvailable = financialTransactionRows.reduce((sum, transaction) => sum + transaction.availableDelta, 0);
    const currentReserved = financialTransactionRows.reduce((sum, transaction) => sum + transaction.reservedDelta, 0);
    if (currentAvailable !== account.availableAmount || currentReserved !== account.reservedAmount) {
      blockers.push("Customer deposit ledger tidak sama dengan projection account");
    }
    const targetIds = new Set(depositTransactions.map((transaction) => String(transaction._id)));
    const targetAvailable = depositTransactions.reduce((sum, transaction) => sum + transaction.availableDelta, 0);
    const targetReserved = depositTransactions.reduce((sum, transaction) => sum + transaction.reservedDelta, 0);
    const remainingAvailable = financialTransactionRows
      .filter((transaction) => !targetIds.has(String(transaction._id)))
      .reduce((sum, transaction) => sum + transaction.availableDelta, 0);
    const remainingReserved = financialTransactionRows
      .filter((transaction) => !targetIds.has(String(transaction._id)))
      .reduce((sum, transaction) => sum + transaction.reservedDelta, 0);
    if (
      account.availableAmount - targetAvailable !== remainingAvailable ||
      account.reservedAmount - targetReserved !== remainingReserved
    ) {
      blockers.push("reconciliation Customer balance tidak deterministik");
    }
  }

  const paymentNotifications = (
    await Promise.all(
      payments.map((payment) => relatedNotifications(ctx, "paymentConfirmation", String(payment._id), blockers)),
    )
  ).flat();
  const refundNotifications = (
    await Promise.all(
      obligations.map((obligation) => relatedNotifications(ctx, "refundObligation", String(obligation._id), blockers)),
    )
  ).flat();
  const payoutNotifications = (
    await Promise.all(payouts.map((payout) => relatedNotifications(ctx, "refundPayout", String(payout._id), blockers)))
  ).flat();
  const transactionNotifications = (
    await Promise.all(
      depositTransactions.map((transaction) =>
        relatedNotifications(ctx, "depositTransaction", String(transaction._id), blockers),
      ),
    )
  ).flat();
  const childAuditEvents = (
    await Promise.all([
      ...payments.map((payment) => relatedAudits(ctx, "payment_confirmation", String(payment._id), blockers)),
      ...topUps.map((topUp) => relatedAudits(ctx, "depositTopUp", String(topUp._id), blockers)),
      ...obligations.map((obligation) => relatedAudits(ctx, "refundObligation", String(obligation._id), blockers)),
      ...payouts.map((payout) => relatedAudits(ctx, "refundPayout", String(payout._id), blockers)),
      ...depositTransactions.map((transaction) =>
        relatedAudits(ctx, "depositTransaction", String(transaction._id), blockers),
      ),
    ])
  ).flat();

  return {
    invoice,
    order,
    customer,
    items,
    payments,
    allocations,
    obligations,
    payouts,
    depositTransactions,
    topUps: uniqueTopUps,
    proofStorageIds,
    account,
    adjustmentRows,
    notifications: unique(
      [
        ...notifications,
        ...paymentNotifications,
        ...refundNotifications,
        ...payoutNotifications,
        ...transactionNotifications,
      ],
      (notice) => String(notice._id),
    ),
    auditEvents: unique([...rootAuditEvents, ...childAuditEvents], (event) => String(event._id)),
    blockers,
  };
}

function invoiceImpact(plan: InvoicePlan): UatImpact {
  const depositAmount = plan.depositTransactions.reduce((sum, transaction) => sum + transaction.amount, 0);
  const paymentAmount = plan.payments.reduce((sum, payment) => sum + payment.amount, 0);
  const allocationAmount = plan.allocations.reduce((sum, allocation) => sum + allocation.amount, 0);
  const refundAmount = plan.obligations.reduce((sum, obligation) => sum + obligation.amount, 0);
  return {
    entityType: "invoice",
    entityId: String(plan.invoice._id),
    entityName: plan.invoice.invoiceNumber,
    status: plan.invoice.status,
    safe: plan.blockers.length === 0,
    blocker: blockerMessage(plan.blockers),
    delete: [
      row("invoice", "Invoice", 1),
      row("invoiceItems", "Invoice items", plan.items.length),
      row("paymentConfirmations", "Payment", plan.payments.length, paymentAmount),
      row("invoiceDepositAllocations", "Deposit allocation", plan.allocations.length, allocationAmount),
      row("depositTransactions", "Deposit ledger rows", plan.depositTransactions.length, depositAmount),
      row("refundPayouts", "Refund payout", plan.payouts.length),
      row("refundObligations", "Refund consequence", plan.obligations.length, refundAmount),
      row("depositTopUps", "Deposit top-up", plan.topUps.length),
      row("notifications", "notifikasi terkait", plan.notifications.length),
      row("auditEvents", "riwayat audit operasional", plan.auditEvents.length),
    ],
    detach: [],
    preserve: [
      row("orders", "Order root", plan.order ? 1 : 0),
      row("customers", "Customer root", plan.customer ? 1 : 0),
      row("depositAccounts", "Customer deposit account", plan.account ? 1 : 0),
    ],
  };
}

function requireConfirmation(confirmedUatCleanup: boolean, confirmationKeyword: string, expected: string) {
  if (!confirmedUatCleanup || confirmationKeyword !== expected) {
    fail("VALIDATION_FAILED", "konfirmasi UAT dan kata kunci harus cocok");
  }
}

function requirePlanSafe(
  plan: { blockers: string[] } | null,
  notFoundCode: "CATALOG_NOT_FOUND" | "BATCH_NOT_FOUND" | "INVOICE_NOT_FOUND" | "UAT_CANDIDATE_NOT_FOUND",
) {
  if (!plan) fail(notFoundCode);
  if (plan.blockers.length) {
    fail(
      "UAT_PURGE_UNSAFE_RELATION",
      `Data UAT belum dapat dihapus karena ditemukan relasi yang belum bisa dibersihkan otomatis: ${plan.blockers.join("; ")}`,
    );
  }
}

async function deleteRelatedNotifications(ctx: MutationCtx, notifications: Doc<"notifications">[]) {
  for (const notification of notifications) await ctx.db.delete(notification._id);
}

async function deleteRelatedAudits(ctx: MutationCtx, auditEvents: Doc<"auditEvents">[]) {
  for (const auditEvent of auditEvents) await ctx.db.delete(auditEvent._id);
}

export const getCatalogImpact = query({
  args: { catalogId: v.id("secretCatalogs") },
  handler: async (ctx, args) => {
    await requireOwner(ctx);
    const plan = await catalogPlan(ctx, args.catalogId);
    return plan ? catalogImpact(plan) : null;
  },
});

export const purgeCatalog = mutation({
  args: {
    catalogId: v.id("secretCatalogs"),
    confirmedUatCleanup: v.boolean(),
    confirmationKeyword: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireOwner(ctx);
    requireConfirmation(args.confirmedUatCleanup, args.confirmationKeyword, "HAPUS KATALOG");
    const plan = await catalogPlan(ctx, args.catalogId);
    requirePlanSafe(plan, "CATALOG_NOT_FOUND");
    if (!plan) fail("CATALOG_NOT_FOUND");
    const periodIsShared = plan.accessPeriodSiblings.length > 0;
    if (plan.accessPeriod && periodIsShared && plan.accessPeriod.anchorCatalogId === plan.catalog._id) {
      await ctx.db.patch(plan.accessPeriod._id, {
        anchorCatalogId: plan.accessPeriodSiblings[0]._id,
        updatedAt: Date.now(),
      });
    }
    for (const order of plan.orders) await ctx.db.patch(order._id, { catalogId: undefined });
    for (const item of plan.orderItemsToDetach) await ctx.db.patch(item._id, { catalogItemId: undefined });
    for (const assignment of plan.assignmentsToDelete) await ctx.db.delete(assignment._id);
    for (const link of plan.links) await ctx.db.delete(link._id);
    for (const item of plan.items) await ctx.db.delete(item._id);
    for (const code of plan.codes) await ctx.db.delete(code._id);
    for (const grant of plan.grants) await ctx.db.delete(grant._id);
    for (const session of plan.sessions) await ctx.db.delete(session._id);
    if (plan.accessPeriod && !periodIsShared) await ctx.db.delete(plan.accessPeriod._id);
    await deleteRelatedNotifications(ctx, plan.notifications);
    await deleteRelatedAudits(ctx, plan.auditEvents);
    await ctx.db.delete(plan.catalog._id);
    const auditEventId = await recordAudit(ctx, user._id, "UAT_PURGE", "catalog", String(plan.catalog._id), {
      entityName: plan.catalog.name,
      deletedItems: String(plan.items.length),
      detachedOrders: String(plan.orders.length),
      detachedBatchLinks: String(plan.links.length),
    });
    return { removed: true as const, auditEventId };
  },
});

export const getBatchImpact = query({
  args: { batchId: v.id("batches") },
  handler: async (ctx, args) => {
    await requireOwner(ctx);
    const plan = await batchPlan(ctx, args.batchId);
    return plan ? batchImpact(plan) : null;
  },
});

export const purgeBatch = mutation({
  args: {
    batchId: v.id("batches"),
    confirmedUatCleanup: v.boolean(),
    confirmationKeyword: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireOwner(ctx);
    requireConfirmation(args.confirmedUatCleanup, args.confirmationKeyword, "HAPUS BATCH");
    const plan = await batchPlan(ctx, args.batchId);
    requirePlanSafe(plan, "BATCH_NOT_FOUND");
    if (!plan) fail("BATCH_NOT_FOUND");
    for (const invoice of plan.invoices) await ctx.db.patch(invoice._id, { batchId: undefined, updatedAt: Date.now() });
    for (const assignment of plan.assignments) await ctx.db.delete(assignment._id);
    for (const link of plan.links) await ctx.db.delete(link._id);
    for (const history of plan.history) await ctx.db.delete(history._id);
    await deleteRelatedNotifications(ctx, plan.notifications);
    await deleteRelatedAudits(ctx, plan.auditEvents);
    await ctx.db.delete(plan.batch._id);
    const auditEventId = await recordAudit(ctx, user._id, "UAT_PURGE", "batch", String(plan.batch._id), {
      entityName: plan.batch.name,
      deletedAssignments: String(plan.assignments.length),
      detachedCatalogLinks: String(plan.links.length),
      detachedInvoices: String(plan.invoices.length),
    });
    return { removed: true as const, auditEventId };
  },
});

export const getOrderCandidateImpact = query({
  args: {
    customerUserId: v.id("appUsers"),
    batchId: v.id("batches"),
  },
  handler: async (ctx, args) => {
    await requireOwner(ctx);
    const plan = await orderCandidatePlan(ctx, args.customerUserId, args.batchId);
    return plan ? orderCandidateImpact(plan) : null;
  },
});

export const purgeOrderCandidate = mutation({
  args: {
    customerUserId: v.id("appUsers"),
    batchId: v.id("batches"),
    confirmedUatCleanup: v.boolean(),
    confirmationKeyword: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireOwner(ctx);
    requireConfirmation(args.confirmedUatCleanup, args.confirmationKeyword, "HAPUS PESANAN");
    const plan = await orderCandidatePlan(ctx, args.customerUserId, args.batchId);
    requirePlanSafe(plan, "UAT_CANDIDATE_NOT_FOUND");
    if (!plan) fail("UAT_CANDIDATE_NOT_FOUND");

    for (const assignment of plan.detachedAssignments) await ctx.db.delete(assignment._id);
    for (const assignment of plan.exclusiveAssignments) await ctx.db.delete(assignment._id);
    for (const item of plan.exclusiveOrderItems) await ctx.db.delete(item._id);
    for (const history of plan.statusHistory) await ctx.db.delete(history._id);
    for (const history of plan.fulfillmentHistory) await ctx.db.delete(history._id);
    await deleteRelatedNotifications(ctx, plan.notifications);
    await deleteRelatedAudits(ctx, plan.auditEvents);
    for (const order of plan.exclusiveOrders) await ctx.db.delete(order._id);
    const auditEventId = await recordAudit(
      ctx,
      user._id,
      "UAT_PURGE",
      "order_candidate",
      `${args.customerUserId}:${args.batchId}`,
      {
        customerUserId: String(args.customerUserId),
        batchId: String(args.batchId),
        entityName: `${plan.customerName} · ${plan.batch.name}`,
        deletedOrders: String(plan.exclusiveOrders.length),
        detachedAssignments: String(plan.detachedAssignments.length),
      },
    );
    return { removed: true as const, auditEventId };
  },
});

async function deleteInvoiceProofs(ctx: MutationCtx, plan: InvoicePlan) {
  for (const storageId of plan.proofStorageIds) {
    const [payments, topUps, books, media] = await Promise.all([
      ctx.db
        .query("paymentConfirmations")
        .withIndex("by_proof_storage_id", (index) => index.eq("proofStorageId", storageId))
        .take(2),
      ctx.db
        .query("depositTopUps")
        .withIndex("by_proof_storage_id", (index) => index.eq("proofStorageId", storageId))
        .take(2),
      ctx.db
        .query("books")
        .withIndex("by_cover_storage_id", (index) => index.eq("coverStorageId", storageId))
        .take(2),
      ctx.db
        .query("bookMedia")
        .withIndex("by_storage_id", (index) => index.eq("storageId", storageId))
        .take(2),
    ]);
    if (payments.length || topUps.length || books.length || media.length) {
      fail("UAT_PURGE_UNSAFE_RELATION", "payment proof storage masih memiliki referensi aktif");
    }
    const claim = await ctx.db
      .query("uploadClaims")
      .withIndex("by_storage_id", (index) => index.eq("storageId", storageId))
      .unique();
    if (claim && claim.purpose !== "payment-proof" && claim.purpose !== "deposit-proof") {
      fail("UAT_PURGE_UNSAFE_RELATION", "proof storage memiliki upload claim dengan ownership berbeda");
    }
    if (claim && claim.ownerUserId !== plan.invoice.customerUserId) {
      fail("UAT_PURGE_UNSAFE_RELATION", "proof storage memiliki uploader owner yang berbeda");
    }
    if (claim) await ctx.db.delete(claim._id);
    await ctx.storage.delete(storageId);
  }
}

export const getInvoiceImpact = query({
  args: { invoiceId: v.id("invoices") },
  handler: async (ctx, args) => {
    await requireOwner(ctx);
    const plan = await invoicePlan(ctx, args.invoiceId);
    return plan ? invoiceImpact(plan) : null;
  },
});

export const purgeInvoice = mutation({
  args: {
    invoiceId: v.id("invoices"),
    confirmedUatCleanup: v.boolean(),
    confirmationKeyword: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireOwner(ctx);
    requireConfirmation(args.confirmedUatCleanup, args.confirmationKeyword, "HAPUS INVOICE");
    const plan = await invoicePlan(ctx, args.invoiceId);
    requirePlanSafe(plan, "INVOICE_NOT_FOUND");
    if (!plan) fail("INVOICE_NOT_FOUND");

    const transactionIds = new Set(plan.depositTransactions.map((transaction) => String(transaction._id)));
    if (plan.account) {
      const availableDelta = plan.depositTransactions.reduce((sum, transaction) => sum + transaction.availableDelta, 0);
      const reservedDelta = plan.depositTransactions.reduce((sum, transaction) => sum + transaction.reservedDelta, 0);
      await ctx.db.patch(plan.account._id, {
        availableAmount: plan.account.availableAmount - availableDelta,
        reservedAmount: plan.account.reservedAmount - reservedDelta,
        updatedAt: Date.now(),
      });
    }
    for (const topUp of plan.topUps) await ctx.db.delete(topUp._id);
    for (const payout of plan.payouts) await ctx.db.delete(payout._id);
    for (const obligation of plan.obligations) await ctx.db.delete(obligation._id);
    for (const allocation of plan.allocations) await ctx.db.delete(allocation._id);
    for (const transaction of plan.depositTransactions) await ctx.db.delete(transaction._id);
    for (const payment of plan.payments) await ctx.db.delete(payment._id);
    for (const item of plan.items) await ctx.db.delete(item._id);
    await deleteRelatedNotifications(ctx, plan.notifications);
    await deleteRelatedAudits(ctx, plan.auditEvents);
    await deleteInvoiceProofs(ctx, plan);
    await ctx.db.delete(plan.invoice._id);
    const auditEventId = await recordAudit(ctx, user._id, "UAT_PURGE", "invoice", String(plan.invoice._id), {
      entityName: plan.invoice.invoiceNumber,
      deletedItems: String(plan.items.length),
      deletedPayments: String(plan.payments.length),
      deletedDepositTransactions: String(transactionIds.size),
      deletedRefundConsequences: String(plan.obligations.length),
    });
    return { removed: true as const, auditEventId };
  },
});
