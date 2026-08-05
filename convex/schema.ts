import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const bookFormat = v.union(v.literal("BB"), v.literal("PB"), v.literal("HB"));
const sessionRole = v.union(v.literal("customer"), v.literal("admin"));
const catalogStatus = v.union(v.literal("draft"), v.literal("open"), v.literal("closed"), v.literal("archived"));
const orderStatus = v.union(v.literal("submitted"), v.literal("cancelled"), v.literal("completed"));

export default defineSchema({
  prototypeSessions: defineTable({
    tokenDigest: v.string(),
    role: sessionRole,
    createdAt: v.number(),
    expiresAt: v.number(),
    lastSeenAt: v.optional(v.number()),
    revokedAt: v.optional(v.number()),
    failedAdminAttempts: v.optional(v.number()),
    adminLockedUntil: v.optional(v.number()),
  })
    .index("by_token_digest", ["tokenDigest"])
    .index("by_expiration", ["expiresAt"]),

  publishers: defineTable({
    name: v.string(),
    slug: v.string(),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
    createdBySessionId: v.id("prototypeSessions"),
  })
    .index("by_slug", ["slug"])
    .index("by_active", ["isActive"])
    .index("by_created_at", ["createdAt"]),

  books: defineTable({
    publisherId: v.id("publishers"),
    title: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
    coverImageUrl: v.optional(v.string()),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
    createdBySessionId: v.id("prototypeSessions"),
  })
    .index("by_publisher", ["publisherId"])
    .index("by_publisher_and_slug", ["publisherId", "slug"])
    .index("by_active", ["isActive"])
    .index("by_created_at", ["createdAt"]),

  bookVariants: defineTable({
    bookId: v.id("books"),
    format: bookFormat,
    isbn: v.string(),
    priceAmount: v.number(),
    currency: v.literal("IDR"),
    isAvailable: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_book", ["bookId"])
    .index("by_isbn", ["isbn"])
    .index("by_book_and_format", ["bookId", "format"]),

  secretCatalogs: defineTable({
    name: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
    status: catalogStatus,
    opensAt: v.optional(v.number()),
    closesAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
    createdBySessionId: v.id("prototypeSessions"),
  })
    .index("by_slug", ["slug"])
    .index("by_status", ["status"])
    .index("by_closes_at", ["closesAt"])
    .index("by_created_at", ["createdAt"]),

  catalogAccessCodes: defineTable({
    catalogId: v.id("secretCatalogs"),
    codeDigest: v.string(),
    lookupDigest: v.string(),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
    expiresAt: v.optional(v.number()),
  })
    .index("by_catalog", ["catalogId"])
    .index("by_catalog_and_active", ["catalogId", "isActive"])
    .index("by_lookup_digest", ["lookupDigest"])
    .index("by_expiration", ["expiresAt"]),

  catalogItems: defineTable({
    catalogId: v.id("secretCatalogs"),
    bookVariantId: v.id("bookVariants"),
    priceOverrideAmount: v.optional(v.number()),
    isAvailable: v.boolean(),
    sortOrder: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_catalog", ["catalogId"])
    .index("by_variant", ["bookVariantId"])
    .index("by_catalog_and_variant", ["catalogId", "bookVariantId"]),

  catalogAccessGrants: defineTable({
    sessionId: v.id("prototypeSessions"),
    catalogId: v.id("secretCatalogs"),
    grantedAt: v.number(),
    expiresAt: v.number(),
    revokedAt: v.optional(v.number()),
  })
    .index("by_session", ["sessionId"])
    .index("by_session_and_catalog", ["sessionId", "catalogId"])
    .index("by_expiration", ["expiresAt"]),

  orders: defineTable({
    sessionId: v.id("prototypeSessions"),
    catalogId: v.id("secretCatalogs"),
    customerName: v.string(),
    customerEmail: v.optional(v.string()),
    status: orderStatus,
    currency: v.literal("IDR"),
    subtotalAmount: v.number(),
    totalAmount: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
    submittedAt: v.number(),
    editableUntil: v.number(),
    cancelledAt: v.optional(v.number()),
  })
    .index("by_session", ["sessionId"])
    .index("by_catalog", ["catalogId"])
    .index("by_status", ["status"])
    .index("by_catalog_and_status", ["catalogId", "status"])
    .index("by_session_and_created_at", ["sessionId", "createdAt"])
    .index("by_created_at", ["createdAt"]),

  orderItems: defineTable({
    orderId: v.id("orders"),
    catalogItemId: v.id("catalogItems"),
    bookId: v.id("books"),
    bookVariantId: v.id("bookVariants"),
    bookTitleSnapshot: v.string(),
    publisherNameSnapshot: v.string(),
    formatSnapshot: bookFormat,
    isbnSnapshot: v.string(),
    unitPriceAmountSnapshot: v.number(),
    currencySnapshot: v.literal("IDR"),
    quantity: v.number(),
    subtotalAmount: v.number(),
    createdAt: v.number(),
  })
    .index("by_order", ["orderId"])
    .index("by_book", ["bookId"])
    .index("by_variant", ["bookVariantId"]),

  orderStatusHistory: defineTable({
    orderId: v.id("orders"),
    fromStatus: v.optional(orderStatus),
    toStatus: orderStatus,
    changedAt: v.number(),
    changedBySessionId: v.id("prototypeSessions"),
    note: v.optional(v.string()),
  })
    .index("by_order", ["orderId"])
    .index("by_order_and_changed_at", ["orderId", "changedAt"]),
});
