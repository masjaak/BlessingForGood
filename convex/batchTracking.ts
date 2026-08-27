import { v } from "convex/values";
import type { Id, Doc } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { assertBatchCatalogDeadline, getBatchSummary } from "./batches";
import { requireActiveUser, requireOwnedResource, requirePermission } from "./lib/auth";
import { recordAudit } from "./lib/audit";
import { canTransitionShipment } from "./lib/shipmentTransitions";
import { fail } from "./lib/errors";
import { fulfillableQuantityForOrderItem } from "./lib/orderExceptionState";
import { positiveQuantity } from "./lib/validation";
import { notifyUser } from "./lib/notifications";
import { catalogIsOpen, getCatalogView } from "./lib/catalogView";

type DataCtx = QueryCtx | MutationCtx;

async function linkedCatalog(ctx: DataCtx, catalogId: Id<"secretCatalogs">, batchId: Id<"batches">) {
  return ctx.db
    .query("catalogBatchLinks")
    .withIndex("by_catalog_and_batch", (index) => index.eq("catalogId", catalogId).eq("batchId", batchId))
    .unique();
}

function requireEditableBatch(batch: Doc<"batches">): void {
  if (batch.isArchived) fail("BATCH_ARCHIVED");
  if (batch.currentShipmentStage) fail("BATCH_LOCKED");
}

async function assignmentForBatch(ctx: DataCtx, orderItemId: Id<"orderItems">, batchId: Id<"batches">) {
  return ctx.db
    .query("orderItemBatchAssignments")
    .withIndex("by_order_item_and_batch", (index) => index.eq("orderItemId", orderItemId).eq("batchId", batchId))
    .unique();
}

async function historyView(ctx: QueryCtx, batchId: Id<"batches">, includeNote = false) {
  const history = await ctx.db
    .query("batchStatusHistory")
    .withIndex("by_batch_and_changed_at", (index) => index.eq("batchId", batchId))
    .order("asc")
    .take(100);
  return history.map((event) => ({
    fromStage: event.fromStage || null,
    toStage: event.toStage,
    at: new Date(event.changedAt).toISOString(),
    ...(includeNote ? { note: event.note || null } : {}),
  }));
}

type AdminAssignment = {
  assignmentId: Id<"orderItemBatchAssignments">;
  orderId: Id<"orders">;
  orderCode: string | null;
  customerUserId: Id<"appUsers">;
  customerName: string;
  customerMemberCode: string | null;
  publisherName: string;
  catalogId: Id<"secretCatalogs">;
  catalogName: string;
  orderItemId: Id<"orderItems">;
  bookVariantId: Id<"bookVariants">;
  bookTitle: string;
  format: Doc<"orderItems">["formatSnapshot"];
  isbn: string;
  unitPriceAmount: number;
  supplierPriceGbpMinor: number | null;
  assignedQuantity: number;
  orderedQuantity: number;
};

type RosterItem = Pick<
  AdminAssignment,
  | "assignmentId"
  | "orderId"
  | "orderItemId"
  | "bookVariantId"
  | "bookTitle"
  | "format"
  | "isbn"
  | "assignedQuantity"
  | "orderCode"
  | "publisherName"
>;

type CustomerRoster = {
  customerUserId: Id<"appUsers">;
  customerName: string;
  customerMemberCode: string | null;
  items: RosterItem[];
};

type PurchaseSummary = Pick<
  AdminAssignment,
  "bookVariantId" | "bookTitle" | "format" | "isbn" | "unitPriceAmount" | "publisherName" | "supplierPriceGbpMinor"
> & {
  quantity: number;
  customerCount: number;
};

export const assignOrderItem = mutation({
  args: {
    orderItemId: v.id("orderItems"),
    batchId: v.id("batches"),
    assignedQuantity: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "tracking.manage");
    const quantity = positiveQuantity(args.assignedQuantity);
    const orderItem = await ctx.db.get(args.orderItemId);
    const batch = await ctx.db.get(args.batchId);
    const order = orderItem && (await ctx.db.get(orderItem.orderId));
    if (!orderItem || !order || !batch) fail("BATCH_ASSIGNMENT_INVALID");
    if (order.source === "ready_stock" || !order.catalogId) fail("READY_STOCK_NOT_BATCHED");
    requireEditableBatch(batch);
    if (order.status !== "submitted") fail("BATCH_ASSIGNMENT_INVALID", "only submitted orders can join a roster");
    if (!(await linkedCatalog(ctx, order.catalogId, args.batchId))) fail("BATCH_CATALOG_MISMATCH");
    const catalog = await ctx.db.get(order.catalogId);
    if (!catalog) fail("BATCH_CATALOG_MISMATCH");
    assertBatchCatalogDeadline(batch, catalog);
    const assignments = await ctx.db
      .query("orderItemBatchAssignments")
      .withIndex("by_order_item", (index) => index.eq("orderItemId", args.orderItemId))
      .take(200);
    const existing = assignments.find((assignment) => assignment.batchId === args.batchId);
    const assignedTotal = assignments.reduce(
      (total, assignment) => total + (assignment._id === existing?._id ? 0 : assignment.assignedQuantity),
      0,
    );
    const totalAfterUpdate = assignedTotal + quantity;
    if (totalAfterUpdate > (await fulfillableQuantityForOrderItem(ctx, orderItem))) {
      fail("BATCH_ASSIGNMENT_EXCEEDS_QUANTITY");
    }
    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        assignedQuantity: quantity,
        updatedAt: now,
        assignedByUserId: user._id,
      });
      await recordAudit(ctx, user._id, "batch.item_assignment_updated", "orderItem", args.orderItemId);
      return existing._id;
    }
    const assignmentId = await ctx.db.insert("orderItemBatchAssignments", {
      orderItemId: args.orderItemId,
      batchId: args.batchId,
      assignedQuantity: quantity,
      createdAt: now,
      updatedAt: now,
      assignedByUserId: user._id,
    });
    await notifyUser(ctx, order.customerUserId, {
      surface: "notification",
      eventType: "batch.opened",
      title: "Batch PO tersedia",
      body: `${batch.name} kini memuat buku dari pesananmu.`,
      destination: `/account/batches/${batch._id}`,
      relatedEntityType: "batch",
      relatedEntityId: String(batch._id),
    });
    await recordAudit(ctx, user._id, "batch.item_assigned", "orderItem", args.orderItemId);
    return assignmentId;
  },
});

export const unassignOrderItem = mutation({
  args: {
    orderItemId: v.id("orderItems"),
    batchId: v.id("batches"),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "tracking.manage");
    const batch = await ctx.db.get(args.batchId);
    if (!batch) fail("BATCH_NOT_FOUND");
    requireEditableBatch(batch);
    const orderItem = await ctx.db.get(args.orderItemId);
    const order = orderItem && (await ctx.db.get(orderItem.orderId));
    if (!orderItem || !order) fail("BATCH_ASSIGNMENT_INVALID");
    if (order.source === "ready_stock" || !order.catalogId) fail("READY_STOCK_NOT_BATCHED");
    const assignment = await assignmentForBatch(ctx, args.orderItemId, args.batchId);
    if (!assignment) fail("BATCH_ASSIGNMENT_NOT_FOUND");
    await ctx.db.delete(assignment._id);
    await recordAudit(ctx, user._id, "batch.item_unassigned", "orderItem", args.orderItemId, {
      batchId: String(args.batchId),
    });
    return { ok: true as const };
  },
});

export const moveOrderItem = mutation({
  args: {
    orderItemId: v.id("orderItems"),
    fromBatchId: v.id("batches"),
    toBatchId: v.id("batches"),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "tracking.manage");
    if (args.fromBatchId === args.toBatchId) fail("BATCH_ASSIGNMENT_INVALID", "source and target batch must differ");
    const orderItem = await ctx.db.get(args.orderItemId);
    const order = orderItem && (await ctx.db.get(orderItem.orderId));
    const fromBatch = await ctx.db.get(args.fromBatchId);
    const toBatch = await ctx.db.get(args.toBatchId);
    if (!orderItem || !order || !fromBatch || !toBatch) fail("BATCH_ASSIGNMENT_INVALID");
    if (order.source === "ready_stock" || !order.catalogId) fail("READY_STOCK_NOT_BATCHED");
    requireEditableBatch(fromBatch);
    requireEditableBatch(toBatch);
    if (order.status !== "submitted") fail("BATCH_ASSIGNMENT_INVALID", "only submitted orders can join a roster");
    if (
      !(await linkedCatalog(ctx, order.catalogId, args.fromBatchId)) ||
      !(await linkedCatalog(ctx, order.catalogId, args.toBatchId))
    ) {
      fail("BATCH_CATALOG_MISMATCH");
    }
    const catalog = await ctx.db.get(order.catalogId);
    if (!catalog) fail("BATCH_CATALOG_MISMATCH");
    assertBatchCatalogDeadline(fromBatch, catalog);
    assertBatchCatalogDeadline(toBatch, catalog);
    const source = await assignmentForBatch(ctx, args.orderItemId, args.fromBatchId);
    if (!source) fail("BATCH_ASSIGNMENT_NOT_FOUND");
    if (await assignmentForBatch(ctx, args.orderItemId, args.toBatchId)) {
      fail("BATCH_ASSIGNMENT_DUPLICATE");
    }
    const assignments = await ctx.db
      .query("orderItemBatchAssignments")
      .withIndex("by_order_item", (index) => index.eq("orderItemId", args.orderItemId))
      .take(200);
    const assignedTotal = assignments.reduce(
      (total, assignment) => total + (assignment._id === source._id ? 0 : assignment.assignedQuantity),
      0,
    );
    if (assignedTotal + source.assignedQuantity > orderItem.quantity) fail("BATCH_ASSIGNMENT_EXCEEDS_QUANTITY");
    const now = Date.now();
    await ctx.db.delete(source._id);
    const assignmentId = await ctx.db.insert("orderItemBatchAssignments", {
      orderItemId: args.orderItemId,
      batchId: args.toBatchId,
      assignedQuantity: source.assignedQuantity,
      createdAt: source.createdAt,
      updatedAt: now,
      assignedByUserId: user._id,
    });
    await recordAudit(ctx, user._id, "batch.item_moved", "orderItem", args.orderItemId, {
      fromBatchId: String(args.fromBatchId),
      toBatchId: String(args.toBatchId),
    });
    return assignmentId;
  },
});

export const updateShipmentStage = mutation({
  args: {
    batchId: v.id("batches"),
    toStage: v.union(
      v.literal("po_closed"),
      v.literal("ordered_to_supplier"),
      v.literal("shipped_internationally"),
      v.literal("customs"),
      v.literal("to_indonesia_warehouse"),
      v.literal("at_store"),
    ),
    allowSkip: v.optional(v.boolean()),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "tracking.manage");
    const batch = await ctx.db.get(args.batchId);
    if (!batch) fail("BATCH_NOT_FOUND");
    if (batch.isArchived) fail("BATCH_ARCHIVED");
    const assignments = await ctx.db
      .query("orderItemBatchAssignments")
      .withIndex("by_batch", (index) => index.eq("batchId", args.batchId))
      .take(200);
    if (args.toStage === "po_closed" && assignments.length === 0) {
      fail("BATCH_ROSTER_REQUIRED");
    }
    if (!canTransitionShipment(batch.currentShipmentStage, args.toStage, args.allowSkip === true)) {
      fail("INVALID_SHIPMENT_TRANSITION");
    }
    const now = Date.now();
    await ctx.db.patch(args.batchId, { currentShipmentStage: args.toStage, updatedAt: now });
    await ctx.db.insert("batchStatusHistory", {
      batchId: args.batchId,
      fromStage: batch.currentShipmentStage,
      toStage: args.toStage,
      changedAt: now,
      changedByUserId: user._id,
      note: args.note?.trim() || undefined,
    });
    const recipients = new Set<Id<"appUsers">>();
    for (const assignment of assignments) {
      const item = await ctx.db.get(assignment.orderItemId);
      const order = item ? await ctx.db.get(item.orderId) : null;
      if (order) recipients.add(order.customerUserId);
    }
    await Promise.all(
      [...recipients].map((recipientUserId) =>
        notifyUser(ctx, recipientUserId, {
          surface: "notification",
          eventType: "batch.status_changed",
          title: "Status batch diperbarui",
          body: `${batch.name} masuk tahap ${args.toStage.replaceAll("_", " ")}.`,
          destination: `/account/batches/${batch._id}`,
          relatedEntityType: "batch",
          relatedEntityId: String(batch._id),
        }),
      ),
    );
    await recordAudit(ctx, user._id, "tracking.shipment_stage_changed", "batch", args.batchId, { stage: args.toStage });
    return getBatchSummary(ctx, args.batchId);
  },
});

export const getMine = query({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "tracking.read.own");
    const order = await ctx.db.get(args.orderId);
    if (!order) fail("ORDER_NOT_FOUND");
    await requireOwnedResource(ctx, order.customerUserId, "ORDER_ACCESS_DENIED");
    if (order.source === "ready_stock" || !order.catalogId) return { orderId: order._id, batches: [] };
    const items = await ctx.db
      .query("orderItems")
      .withIndex("by_order", (index) => index.eq("orderId", order._id))
      .take(200);
    const sections = new Map<
      string,
      {
        batchId: Id<"batches">;
        assignments: Array<{
          orderItemId: Id<"orderItems">;
          bookTitle: string;
          format: Doc<"orderItems">["formatSnapshot"];
          quantity: number;
        }>;
      }
    >();
    for (const item of items) {
      const assignments = await ctx.db
        .query("orderItemBatchAssignments")
        .withIndex("by_order_item", (index) => index.eq("orderItemId", item._id))
        .take(200);
      for (const assignment of assignments) {
        const section = sections.get(assignment.batchId) || { batchId: assignment.batchId, assignments: [] };
        section.assignments.push({
          orderItemId: item._id,
          bookTitle: item.bookTitleSnapshot,
          format: item.formatSnapshot,
          quantity: assignment.assignedQuantity,
        });
        sections.set(assignment.batchId, section);
      }
    }
    const batches = await Promise.all(
      Array.from(sections.values()).map(async (section) => {
        const batch = await ctx.db.get(section.batchId);
        if (!batch) return null;
        return {
          batchId: batch._id,
          name: batch.name,
          referenceCode: batch.referenceCode || null,
          currentShipmentStage: batch.currentShipmentStage || null,
          poDeadlineAt: batch.poDeadlineAt ?? null,
          etaCargoMonth: batch.etaCargoMonth ?? null,
          updatedAt: new Date(batch.updatedAt).toISOString(),
          assignments: section.assignments,
          history: await historyView(ctx, batch._id),
        };
      }),
    );
    return { orderId: order._id, batches: batches.filter((batch) => batch !== null) };
  },
});

async function batchMineView(ctx: QueryCtx, batchId: Id<"batches">, userId: Id<"appUsers">) {
  const batch = await ctx.db.get(batchId);
  if (!batch) return null;
  const links = await ctx.db
    .query("catalogBatchLinks")
    .withIndex("by_batch", (index) => index.eq("batchId", batchId))
    .take(200);
  const availableItems = [];
  for (const link of links) {
    const grants = await ctx.db
      .query("catalogAccessGrants")
      .withIndex("by_app_user_id_and_catalog_id", (index) =>
        index.eq("appUserId", userId).eq("catalogId", link.catalogId),
      )
      .take(50);
    const grant = grants.find((candidate) => !candidate.revokedAt && candidate.expiresAt > Date.now());
    if (!grant || !(await catalogIsOpen(ctx, link.catalogId))) {
      continue;
    }
    const catalog = await getCatalogView(ctx, link.catalogId);
    for (const book of catalog.books) {
      availableItems.push({
        catalogId: catalog.id,
        catalogName: catalog.name,
        bookId: book.id,
        title: book.title,
        publisher: book.publisher,
        variants: book.variants.map((variant) => ({
          format: variant.format,
          price: variant.price,
        })),
      });
    }
  }
  const assignments = await ctx.db
    .query("orderItemBatchAssignments")
    .withIndex("by_batch", (index) => index.eq("batchId", batchId))
    .take(200);
  const owned = (
    await Promise.all(
      assignments.map(async (assignment) => {
        const item = await ctx.db.get(assignment.orderItemId);
        const order = item ? await ctx.db.get(item.orderId) : null;
        return item && order?.customerUserId === userId
          ? {
              assignmentId: assignment._id,
              title: item.bookTitleSnapshot,
              format: item.formatSnapshot,
              quantity: assignment.assignedQuantity,
            }
          : null;
      }),
    )
  ).filter((item) => item !== null);
  if (!owned.length && !availableItems.length) return null;
  return {
    batchId: batch._id,
    name: batch.name,
    referenceCode: batch.referenceCode ?? null,
    description: batch.description ?? null,
    poDeadlineAt: batch.poDeadlineAt ?? null,
    etaCargoMonth: batch.etaCargoMonth ?? null,
    currentShipmentStage: batch.currentShipmentStage ?? null,
    updatedAt: batch.updatedAt,
    items: owned,
    availableItems,
    history: await historyView(ctx, batch._id),
  };
}

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireActiveUser(ctx);
    const assignments = await ctx.db.query("orderItemBatchAssignments").take(500);
    const batchIds = new Set(assignments.map((item) => item.batchId));
    const grants = await ctx.db
      .query("catalogAccessGrants")
      .withIndex("by_app_user_id", (index) => index.eq("appUserId", user._id))
      .take(200);
    for (const grant of grants) {
      if (grant.revokedAt || grant.expiresAt <= Date.now() || !(await catalogIsOpen(ctx, grant.catalogId))) continue;
      const links = await ctx.db
        .query("catalogBatchLinks")
        .withIndex("by_catalog", (index) => index.eq("catalogId", grant.catalogId))
        .take(200);
      for (const link of links) batchIds.add(link.batchId);
    }
    return (await Promise.all([...batchIds].map((batchId) => batchMineView(ctx, batchId, user._id)))).filter(
      (batch) => batch !== null,
    );
  },
});

export const getBatchMine = query({
  args: { batchId: v.id("batches") },
  handler: async (ctx, args) => {
    const user = await requireActiveUser(ctx);
    return batchMineView(ctx, args.batchId, user._id);
  },
});

export const getForOrderAdmin = query({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "tracking.read.all");
    const order = await ctx.db.get(args.orderId);
    if (!order) fail("ORDER_NOT_FOUND");
    if (order.source === "ready_stock" || !order.catalogId) return { orderId: order._id, items: [] };
    const items = await ctx.db
      .query("orderItems")
      .withIndex("by_order", (index) => index.eq("orderId", order._id))
      .take(200);
    return {
      orderId: order._id,
      items: await Promise.all(
        items.map(async (item) => {
          const assignments = await ctx.db
            .query("orderItemBatchAssignments")
            .withIndex("by_order_item", (index) => index.eq("orderItemId", item._id))
            .take(200);
          return {
            orderItemId: item._id,
            bookTitle: item.bookTitleSnapshot,
            format: item.formatSnapshot,
            orderedQuantity: item.quantity,
            assignments: await Promise.all(
              assignments.map(async (assignment) => {
                const batch = await ctx.db.get(assignment.batchId);
                return {
                  assignmentId: assignment._id,
                  batchId: assignment.batchId,
                  batchName: batch?.name || "Unknown batch",
                  currentShipmentStage: batch?.currentShipmentStage || null,
                  etaCargoMonth: batch?.etaCargoMonth || null,
                  assignedQuantity: assignment.assignedQuantity,
                };
              }),
            ),
          };
        }),
      ),
    };
  },
});

export const getForAdmin = query({
  args: { batchId: v.id("batches") },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "tracking.read.all");
    const summary = await getBatchSummary(ctx, args.batchId);
    const assignments = await ctx.db
      .query("orderItemBatchAssignments")
      .withIndex("by_batch", (index) => index.eq("batchId", args.batchId))
      .take(200);
    const loaded = (
      await Promise.all(
        assignments.map(async (assignment) => {
          const orderItem = await ctx.db.get(assignment.orderItemId);
          const order = orderItem && (await ctx.db.get(orderItem.orderId));
          if (!orderItem || !order) return null;
          return { assignment, orderItem, order };
        }),
      )
    ).filter((item): item is NonNullable<typeof item> => item !== null);
    const catalogIds = [
      ...new Set(loaded.map(({ order }) => order.catalogId).filter((id): id is Id<"secretCatalogs"> => Boolean(id))),
    ];
    const catalogs = await Promise.all(catalogIds.map((catalogId) => ctx.db.get(catalogId)));
    const catalogNames = new Map(
      catalogIds.map((catalogId, index) => [catalogId, catalogs[index]?.name || "Unknown catalog"]),
    );
    const customerIds = [...new Set(loaded.map(({ order }) => order.customerUserId))];
    const customers = await Promise.all(customerIds.map((customerId) => ctx.db.get(customerId)));
    const customerCodes = new Map(
      customerIds.map((customerId, index) => [customerId, customers[index]?.memberCode || null]),
    );
    const variantIds = [...new Set(loaded.map(({ orderItem }) => orderItem.bookVariantId))];
    const variants = await Promise.all(variantIds.map((variantId) => ctx.db.get(variantId)));
    const variantById = new Map(variantIds.map((variantId, index) => [variantId, variants[index]]));
    const assignedItems: AdminAssignment[] = loaded.flatMap(({ assignment, orderItem, order }) => {
      if (!order.catalogId || order.source === "ready_stock") return [];
      return [
        {
          assignmentId: assignment._id,
          orderId: order._id,
          orderCode: order.orderCode || null,
          customerUserId: order.customerUserId,
          customerName: order.customerName,
          customerMemberCode: customerCodes.get(order.customerUserId) || null,
          publisherName: orderItem.publisherNameSnapshot,
          catalogId: order.catalogId,
          catalogName: catalogNames.get(order.catalogId) || "Unknown catalog",
          orderItemId: orderItem._id,
          bookVariantId: orderItem.bookVariantId,
          bookTitle: orderItem.bookTitleSnapshot,
          format: orderItem.formatSnapshot,
          isbn: orderItem.isbnSnapshot,
          unitPriceAmount: orderItem.unitPriceAmountSnapshot,
          supplierPriceGbpMinor: variantById.get(orderItem.bookVariantId)?.supplierPriceGbpMinor ?? null,
          assignedQuantity: assignment.assignedQuantity,
          orderedQuantity: orderItem.quantity,
        },
      ];
    });
    const customerGroups = new Map<string, CustomerRoster>();
    const purchaseGroups = new Map<string, PurchaseSummary & { customers: Set<string> }>();
    for (const item of assignedItems) {
      const customerKey = String(item.customerUserId);
      const customer = customerGroups.get(customerKey) || {
        customerUserId: item.customerUserId,
        customerName: item.customerName,
        customerMemberCode: item.customerMemberCode,
        items: [],
      };
      customer.items.push({
        assignmentId: item.assignmentId,
        orderId: item.orderId,
        orderItemId: item.orderItemId,
        bookVariantId: item.bookVariantId,
        bookTitle: item.bookTitle,
        format: item.format,
        isbn: item.isbn,
        assignedQuantity: item.assignedQuantity,
        orderCode: item.orderCode,
        publisherName: item.publisherName,
      });
      customerGroups.set(customerKey, customer);
      const purchaseKey = String(item.bookVariantId);
      const purchase = purchaseGroups.get(purchaseKey) || {
        bookVariantId: item.bookVariantId,
        bookTitle: item.bookTitle,
        format: item.format,
        isbn: item.isbn,
        publisherName: item.publisherName,
        unitPriceAmount: item.unitPriceAmount,
        supplierPriceGbpMinor: item.supplierPriceGbpMinor,
        quantity: 0,
        customerCount: 0,
        customers: new Set<string>(),
      };
      purchase.quantity += item.assignedQuantity;
      purchase.customers.add(customerKey);
      purchase.customerCount = purchase.customers.size;
      purchaseGroups.set(purchaseKey, purchase);
    }
    return {
      ...summary,
      assignments: assignedItems,
      customerRoster: [...customerGroups.values()],
      purchaseSummary: [...purchaseGroups.values()]
        .sort(
          (left, right) =>
            left.publisherName.localeCompare(right.publisherName) ||
            left.bookTitle.localeCompare(right.bookTitle) ||
            left.format.localeCompare(right.format) ||
            left.isbn.localeCompare(right.isbn),
        )
        .map((purchase) => ({
          bookVariantId: purchase.bookVariantId,
          bookTitle: purchase.bookTitle,
          format: purchase.format,
          isbn: purchase.isbn,
          publisherName: purchase.publisherName,
          unitPriceAmount: purchase.unitPriceAmount,
          supplierPriceGbpMinor: purchase.supplierPriceGbpMinor,
          quantity: purchase.quantity,
          customerCount: purchase.customers.size,
        })),
      history: await historyView(ctx, args.batchId, true),
    };
  },
});

export const listUnassignedForAdmin = query({
  args: { batchId: v.id("batches") },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "tracking.read.all");
    const batch = await ctx.db.get(args.batchId);
    if (!batch) fail("BATCH_NOT_FOUND");
    const links = await ctx.db
      .query("catalogBatchLinks")
      .withIndex("by_batch", (index) => index.eq("batchId", args.batchId))
      .take(200);
    const catalogIds = new Set(links.map((link) => String(link.catalogId)));
    const catalogNames = new Map(
      await Promise.all(
        links.map(async (link) => {
          const catalog = await ctx.db.get(link.catalogId);
          return [String(link.catalogId), catalog?.name || "Unknown catalog"] as const;
        }),
      ),
    );
    // ponytail: bounded 200-order/item scan; add a roster index when BFG volume exceeds this ceiling.
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_status", (index) => index.eq("status", "submitted"))
      .order("desc")
      .take(200);
    const result = [];
    for (const order of orders) {
      if (order.source === "ready_stock" || !order.catalogId || !catalogIds.has(String(order.catalogId))) continue;
      const customer = await ctx.db.get(order.customerUserId);
      const items = await ctx.db
        .query("orderItems")
        .withIndex("by_order", (index) => index.eq("orderId", order._id))
        .take(200);
      for (const item of items) {
        const assignments = await ctx.db
          .query("orderItemBatchAssignments")
          .withIndex("by_order_item", (index) => index.eq("orderItemId", item._id))
          .take(200);
        const assignedQuantity = assignments.reduce((total, assignment) => total + assignment.assignedQuantity, 0);
        const assignedToBatchQuantity =
          assignments.find((assignment) => assignment.batchId === args.batchId)?.assignedQuantity || 0;
        const fulfillableQuantity = await fulfillableQuantityForOrderItem(ctx, item);
        if (assignedQuantity < fulfillableQuantity) {
          result.push({
            orderId: order._id,
            orderCode: order.orderCode || null,
            customerUserId: order.customerUserId,
            customerName: order.customerName,
            customerMemberCode: customer?.memberCode || null,
            catalogId: order.catalogId,
            catalogName: catalogNames.get(String(order.catalogId)) || "Unknown catalog",
            orderItemId: item._id,
            bookVariantId: item.bookVariantId,
            bookTitle: item.bookTitleSnapshot,
            publisherName: item.publisherNameSnapshot,
            format: item.formatSnapshot,
            isbn: item.isbnSnapshot,
            unitPriceAmount: item.unitPriceAmountSnapshot,
            orderedQuantity: item.quantity,
            assignedQuantity,
            assignedToBatchQuantity,
            remainingQuantity: fulfillableQuantity - assignedQuantity,
            assignmentState:
              assignedToBatchQuantity > 0
                ? "Sebagian masuk Batch ini"
                : assignedQuantity > 0
                  ? "Sebagian masuk Batch lain"
                  : "Belum masuk Batch",
          });
        }
        if (result.length >= 200) return result;
      }
    }
    return result;
  },
});
