import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import {
  allocationStatusValidator,
  bookFormatValidator,
  bookPublicationStatusValidator,
  depositRequirementModeValidator,
  depositTransactionTypeValidator,
  fulfillmentStageValidator,
  invoicePaymentStatusValidator,
  invoiceStatusValidator,
  joinRequestInvitationStatusValidator,
  joinRequestBookInterestValidator,
  joinRequestStatusValidator,
  orderExceptionEventTypeValidator,
  orderExceptionResolutionValidator,
  orderExceptionStatusValidator,
  orderExceptionTypeValidator,
  orderSourceValidator,
  paymentConfirmationStatusValidator,
  readyStockReservationStatusValidator,
  refundObligationStatusValidator,
  refundObligationLifecycleValidator,
  refundPayoutStatusValidator,
  shipmentStageValidator,
} from "./validators";

const bookFormat = bookFormatValidator;
const legacySessionRole = v.union(v.literal("customer"), v.literal("admin"));
const role = v.union(v.literal("owner"), v.literal("admin"), v.literal("customer"));
const userStatus = v.union(v.literal("active"), v.literal("suspended"));
const catalogStatus = v.union(v.literal("draft"), v.literal("open"), v.literal("closed"), v.literal("archived"));
const orderStatus = v.union(v.literal("submitted"), v.literal("cancelled"), v.literal("completed"));
const uploadPurpose = v.union(
  v.literal("book-cover"),
  v.literal("book-gallery"),
  v.literal("payment-proof"),
  v.literal("deposit-proof"),
);

export default defineSchema({
  // Retained only for isolated legacy tests/local fallback. Active Preview never reads or writes this table.
  prototypeSessions: defineTable({
    tokenDigest: v.string(),
    role: legacySessionRole,
    createdAt: v.number(),
    expiresAt: v.number(),
    lastSeenAt: v.optional(v.number()),
    revokedAt: v.optional(v.number()),
    failedAdminAttempts: v.optional(v.number()),
    adminLockedUntil: v.optional(v.number()),
  })
    .index("by_token_digest", ["tokenDigest"])
    .index("by_expiration", ["expiresAt"]),

  appUsers: defineTable({
    clerkUserId: v.string(),
    role,
    status: userStatus,
    emailSnapshot: v.optional(v.string()),
    displayNameSnapshot: v.optional(v.string()),
    imageUrlSnapshot: v.optional(v.string()),
    memberCode: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
    lastSeenAt: v.number(),
    suspendedAt: v.optional(v.number()),
    suspendedByUserId: v.optional(v.id("appUsers")),
  })
    .index("by_clerk_user_id", ["clerkUserId"])
    .index("by_role", ["role"])
    .index("by_status", ["status"])
    .index("by_role_and_status", ["role", "status"])
    .index("by_member_code", ["memberCode"])
    .index("by_created_at", ["createdAt"]),

  uploadClaims: defineTable({
    storageId: v.id("_storage"),
    ownerUserId: v.id("appUsers"),
    purpose: uploadPurpose,
    createdAt: v.number(),
  })
    .index("by_storage_id", ["storageId"])
    .index("by_owner_and_created_at", ["ownerUserId", "createdAt"]),

  staffInvitations: defineTable({
    email: v.string(),
    normalizedEmail: v.string(),
    role: v.literal("admin"),
    status: v.union(v.literal("pending"), v.literal("claimed"), v.literal("revoked")),
    createdAt: v.number(),
    updatedAt: v.number(),
    createdByUserId: v.id("appUsers"),
    claimedAt: v.optional(v.number()),
    claimedByUserId: v.optional(v.id("appUsers")),
    revokedAt: v.optional(v.number()),
  })
    .index("by_normalized_email", ["normalizedEmail"])
    .index("by_status_and_created_at", ["status", "createdAt"]),

  customerProfiles: defineTable({
    userId: v.id("appUsers"),
    displayName: v.string(),
    phone: v.optional(v.string()),
    whatsappNumber: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user_id", ["userId"]),

  joinRequests: defineTable({
    name: v.string(),
    email: v.string(),
    normalizedEmail: v.string(),
    applicantClerkUserId: v.optional(v.string()),
    applicantEmailSnapshot: v.optional(v.string()),
    contact: v.string(),
    normalizedContact: v.string(),
    city: v.optional(v.string()),
    bookInterest: v.optional(joinRequestBookInterestValidator),
    note: v.optional(v.string()),
    source: v.string(),
    acknowledged: v.boolean(),
    status: joinRequestStatusValidator,
    invitationStatus: joinRequestInvitationStatusValidator,
    submittedAt: v.number(),
    reviewedAt: v.optional(v.number()),
    reviewedByUserId: v.optional(v.id("appUsers")),
    reviewNote: v.optional(v.string()),
    rejectionReason: v.optional(v.string()),
    admissionError: v.optional(v.string()),
    admittedAppUserId: v.optional(v.id("appUsers")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_status_and_submitted_at", ["status", "submittedAt"])
    .index("by_submitted_at", ["submittedAt"])
    .index("by_normalized_email", ["normalizedEmail"])
    .index("by_normalized_contact", ["normalizedContact"])
    .index("by_applicant_clerk_user_id", ["applicantClerkUserId"]),

  customerAddresses: defineTable({
    userId: v.id("appUsers"),
    label: v.string(),
    recipientName: v.string(),
    phone: v.string(),
    addressLine1: v.string(),
    addressLine2: v.optional(v.string()),
    city: v.string(),
    province: v.string(),
    postalCode: v.string(),
    isDefault: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user_id", ["userId"])
    .index("by_user_id_and_default", ["userId", "isDefault"])
    .index("by_user_id_and_created_at", ["userId", "createdAt"]),

  auditEvents: defineTable({
    actorUserId: v.id("appUsers"),
    action: v.string(),
    targetType: v.string(),
    targetId: v.string(),
    createdAt: v.number(),
    safeMetadata: v.optional(v.record(v.string(), v.string())),
  })
    .index("by_actor_user_id", ["actorUserId"])
    .index("by_target", ["targetType", "targetId"])
    .index("by_created_at", ["createdAt"]),

  notifications: defineTable({
    recipientUserId: v.id("appUsers"),
    surface: v.union(v.literal("notification"), v.literal("inbox")),
    audience: v.optional(v.union(v.literal("admin"), v.literal("customer"))),
    eventType: v.string(),
    title: v.string(),
    body: v.string(),
    destination: v.string(),
    relatedEntityType: v.optional(v.string()),
    relatedEntityId: v.optional(v.string()),
    createdAt: v.number(),
    readAt: v.optional(v.number()),
  })
    .index("by_recipient_surface_created_at", ["recipientUserId", "surface", "createdAt"])
    .index("by_recipient_surface_read_at", ["recipientUserId", "surface", "readAt"]),

  contentBlocks: defineTable({
    key: v.union(v.literal("community"), v.literal("how_to_order"), v.literal("help")),
    eyebrow: v.string(),
    title: v.string(),
    body: v.string(),
    status: v.union(v.literal("draft"), v.literal("published")),
    createdAt: v.number(),
    updatedAt: v.number(),
    updatedByUserId: v.id("appUsers"),
    publishedAt: v.optional(v.number()),
  }).index("by_key", ["key"]),

  appSettings: defineTable({
    key: v.literal("primary"),
    storeName: v.string(),
    whatsappNumber: v.string(),
    paymentInstructions: v.string(),
    supportEmail: v.optional(v.string()),
    socialContact: v.optional(v.string()),
    bankName: v.optional(v.string()),
    bankAccountNumber: v.optional(v.string()),
    bankAccountName: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
    updatedByUserId: v.id("appUsers"),
  }).index("by_key", ["key"]),

  publishers: defineTable({
    name: v.string(),
    slug: v.string(),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
    createdByUserId: v.id("appUsers"),
  })
    .index("by_slug", ["slug"])
    .index("by_active", ["isActive"])
    .index("by_created_at", ["createdAt"]),

  books: defineTable({
    publisherId: v.id("publishers"),
    title: v.string(),
    slug: v.string(),
    author: v.optional(v.string()),
    description: v.optional(v.string()),
    categories: v.array(v.string()),
    coverImageUrl: v.optional(v.string()),
    coverStorageId: v.optional(v.id("_storage")),
    coverPresentation: v.optional(
      v.object({
        zoom: v.number(),
        x: v.number(),
        y: v.number(),
      }),
    ),
    externalPreviewLabel: v.optional(v.string()),
    externalPreviewUrl: v.optional(v.string()),
    publicationStatus: bookPublicationStatusValidator,
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
    createdByUserId: v.id("appUsers"),
  })
    .index("by_slug", ["slug"])
    .index("by_publication_status", ["publicationStatus"])
    .index("by_created_at", ["createdAt"])
    .index("by_cover_storage_id", ["coverStorageId"]),

  bookMedia: defineTable({
    bookId: v.id("books"),
    storageId: v.id("_storage"),
    displayOrder: v.number(),
    altText: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
    createdByUserId: v.id("appUsers"),
  })
    .index("by_book_and_order", ["bookId", "displayOrder"])
    .index("by_storage_id", ["storageId"]),

  bookVariants: defineTable({
    bookId: v.id("books"),
    format: bookFormat,
    isbn: v.string(),
    priceAmount: v.number(),
    supplierPriceGbpMinor: v.optional(v.number()),
    currency: v.literal("IDR"),
    isAvailable: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_book", ["bookId"])
    .index("by_isbn", ["isbn"])
    .index("by_book_and_format", ["bookId", "format"]),

  readyStockInventory: defineTable({
    bookVariantId: v.id("bookVariants"),
    quantity: v.number(),
    reservedQuantity: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
    updatedByUserId: v.id("appUsers"),
  }).index("by_book_variant_id", ["bookVariantId"]),

  readyStockReservations: defineTable({
    orderId: v.id("orders"),
    orderItemId: v.id("orderItems"),
    bookVariantId: v.id("bookVariants"),
    quantity: v.number(),
    status: readyStockReservationStatusValidator,
    createdAt: v.number(),
    updatedAt: v.number(),
    releasedAt: v.optional(v.number()),
    fulfilledAt: v.optional(v.number()),
    changedByUserId: v.id("appUsers"),
  })
    .index("by_order", ["orderId"])
    .index("by_order_item", ["orderItemId"])
    .index("by_variant", ["bookVariantId"])
    .index("by_status", ["status"]),

  secretCatalogs: defineTable({
    name: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
    status: catalogStatus,
    opensAt: v.optional(v.number()),
    closesAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
    createdByUserId: v.id("appUsers"),
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
    appUserId: v.id("appUsers"),
    catalogId: v.id("secretCatalogs"),
    grantedAt: v.number(),
    expiresAt: v.number(),
    revokedAt: v.optional(v.number()),
  })
    .index("by_app_user_id", ["appUserId"])
    .index("by_app_user_id_and_catalog_id", ["appUserId", "catalogId"])
    .index("by_catalog", ["catalogId"])
    .index("by_expiration", ["expiresAt"]),

  catalogAccessSessions: defineTable({
    catalogId: v.id("secretCatalogs"),
    accessCodeId: v.id("catalogAccessCodes"),
    sessionDigest: v.string(),
    createdAt: v.number(),
    expiresAt: v.number(),
    revokedAt: v.optional(v.number()),
  })
    .index("by_session_digest", ["sessionDigest"])
    .index("by_catalog", ["catalogId"])
    .index("by_expiration", ["expiresAt"]),

  catalogAccessAnonymousAttempts: defineTable({
    subjectDigest: v.string(),
    windowStartedAt: v.number(),
    failedCount: v.number(),
    lockedUntil: v.optional(v.number()),
    updatedAt: v.number(),
  }).index("by_subject_digest", ["subjectDigest"]),

  catalogAccessAttempts: defineTable({
    appUserId: v.id("appUsers"),
    windowStartedAt: v.number(),
    failedCount: v.number(),
    lockedUntil: v.optional(v.number()),
    updatedAt: v.number(),
  }).index("by_app_user_id", ["appUserId"]),

  orders: defineTable({
    customerUserId: v.id("appUsers"),
    catalogId: v.optional(v.id("secretCatalogs")),
    source: v.optional(orderSourceValidator),
    assistedSubmissionKey: v.optional(v.string()),
    orderCode: v.optional(v.string()),
    customerName: v.string(),
    customerEmail: v.optional(v.string()),
    status: orderStatus,
    currency: v.literal("IDR"),
    subtotalAmount: v.number(),
    totalAmount: v.number(),
    currentFulfillmentStage: v.optional(fulfillmentStageValidator),
    fulfillmentUpdatedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
    submittedAt: v.number(),
    editableUntil: v.number(),
    cancelledAt: v.optional(v.number()),
  })
    .index("by_customer_user_id", ["customerUserId"])
    .index("by_catalog", ["catalogId"])
    .index("by_status", ["status"])
    .index("by_catalog_and_status", ["catalogId", "status"])
    .index("by_customer_user_id_and_created_at", ["customerUserId", "createdAt"])
    .index("by_assisted_submission_key", ["assistedSubmissionKey"])
    .index("by_created_at", ["createdAt"]),

  orderReferenceCounters: defineTable({
    key: v.literal("primary"),
    nextNumber: v.number(),
    updatedAt: v.number(),
  }).index("by_key", ["key"]),

  invoiceReferenceCounters: defineTable({
    datePart: v.string(),
    nextNumber: v.number(),
    updatedAt: v.number(),
  }).index("by_date_part", ["datePart"]),

  batchReferenceCounters: defineTable({
    datePart: v.string(),
    nextNumber: v.number(),
    updatedAt: v.number(),
  }).index("by_date_part", ["datePart"]),

  orderItems: defineTable({
    orderId: v.id("orders"),
    catalogItemId: v.optional(v.id("catalogItems")),
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
    changedByUserId: v.id("appUsers"),
    note: v.optional(v.string()),
  })
    .index("by_order", ["orderId"])
    .index("by_order_and_changed_at", ["orderId", "changedAt"]),

  orderExceptions: defineTable({
    orderId: v.id("orders"),
    orderItemId: v.id("orderItems"),
    customerUserId: v.id("appUsers"),
    type: orderExceptionTypeValidator,
    status: orderExceptionStatusValidator,
    reasonCode: v.optional(v.string()),
    reason: v.string(),
    affectedQuantity: v.number(),
    internalNote: v.optional(v.string()),
    customerNote: v.optional(v.string()),
    resolution: v.optional(orderExceptionResolutionValidator),
    recoverableRefundAmount: v.optional(v.number()),
    replacementReference: v.optional(v.string()),
    refundObligationId: v.optional(v.id("refundObligations")),
    rejectionReason: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
    createdByUserId: v.id("appUsers"),
    reviewedAt: v.optional(v.number()),
    reviewedByUserId: v.optional(v.id("appUsers")),
    resolutionSelectedAt: v.optional(v.number()),
    resolvedAt: v.optional(v.number()),
    rejectedAt: v.optional(v.number()),
  })
    .index("by_status_and_created_at", ["status", "createdAt"])
    .index("by_customer_user_id_and_created_at", ["customerUserId", "createdAt"])
    .index("by_order", ["orderId"])
    .index("by_order_item", ["orderItemId"])
    .index("by_type_and_created_at", ["type", "createdAt"])
    .index("by_created_at", ["createdAt"]),

  orderExceptionEvents: defineTable({
    exceptionId: v.id("orderExceptions"),
    orderId: v.id("orders"),
    orderItemId: v.id("orderItems"),
    eventType: orderExceptionEventTypeValidator,
    fromStatus: v.optional(orderExceptionStatusValidator),
    toStatus: v.optional(orderExceptionStatusValidator),
    note: v.optional(v.string()),
    actorUserId: v.id("appUsers"),
    createdAt: v.number(),
  })
    .index("by_exception_and_created_at", ["exceptionId", "createdAt"])
    .index("by_order", ["orderId"])
    .index("by_order_item", ["orderItemId"]),

  orderExceptionFinancialAdjustments: defineTable({
    exceptionId: v.id("orderExceptions"),
    orderId: v.id("orders"),
    orderItemId: v.id("orderItems"),
    customerUserId: v.id("appUsers"),
    invoiceId: v.optional(v.id("invoices")),
    affectedQuantity: v.number(),
    originalItemValueAmount: v.number(),
    invoiceAdjustmentAmount: v.number(),
    depositAmountBefore: v.number(),
    depositReleaseAmount: v.number(),
    depositAmountAfter: v.number(),
    externalPaymentAmount: v.number(),
    adjustedInvoiceTotalAmount: v.optional(v.number()),
    refundObligationAmount: v.number(),
    refundObligationStatus: refundObligationStatusValidator,
    refundObligationId: v.optional(v.id("refundObligations")),
    createdAt: v.number(),
    createdByUserId: v.id("appUsers"),
  })
    .index("by_exception", ["exceptionId"])
    .index("by_order", ["orderId"])
    .index("by_invoice", ["invoiceId"])
    .index("by_order_item", ["orderItemId"]),

  batches: defineTable({
    name: v.string(),
    referenceCode: v.optional(v.string()),
    description: v.optional(v.string()),
    poDeadlineAt: v.optional(v.number()),
    etaCargoMonth: v.optional(v.string()),
    currentShipmentStage: v.optional(shipmentStageValidator),
    createdAt: v.number(),
    updatedAt: v.number(),
    createdByUserId: v.id("appUsers"),
    isArchived: v.boolean(),
  })
    .index("by_reference_code", ["referenceCode"])
    .index("by_current_stage", ["currentShipmentStage"])
    .index("by_created_at", ["createdAt"])
    .index("by_archived", ["isArchived"]),

  catalogBatchLinks: defineTable({
    catalogId: v.id("secretCatalogs"),
    batchId: v.id("batches"),
    createdAt: v.number(),
    createdByUserId: v.id("appUsers"),
  })
    .index("by_catalog", ["catalogId"])
    .index("by_batch", ["batchId"])
    .index("by_catalog_and_batch", ["catalogId", "batchId"]),

  orderItemBatchAssignments: defineTable({
    orderItemId: v.id("orderItems"),
    batchId: v.id("batches"),
    assignedQuantity: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
    assignedByUserId: v.id("appUsers"),
  })
    .index("by_order_item", ["orderItemId"])
    .index("by_batch", ["batchId"])
    .index("by_order_item_and_batch", ["orderItemId", "batchId"]),

  batchStatusHistory: defineTable({
    batchId: v.id("batches"),
    fromStage: v.optional(shipmentStageValidator),
    toStage: shipmentStageValidator,
    changedAt: v.number(),
    changedByUserId: v.id("appUsers"),
    note: v.optional(v.string()),
  })
    .index("by_batch", ["batchId"])
    .index("by_batch_and_changed_at", ["batchId", "changedAt"])
    .index("by_stage", ["toStage"]),

  orderFulfillmentHistory: defineTable({
    orderId: v.id("orders"),
    fromStage: v.optional(fulfillmentStageValidator),
    toStage: fulfillmentStageValidator,
    changedAt: v.number(),
    changedByUserId: v.id("appUsers"),
    note: v.optional(v.string()),
  })
    .index("by_order", ["orderId"])
    .index("by_order_and_changed_at", ["orderId", "changedAt"])
    .index("by_stage", ["toStage"]),

  invoices: defineTable({
    orderId: v.id("orders"),
    customerUserId: v.id("appUsers"),
    invoiceNumber: v.string(),
    status: invoiceStatusValidator,
    currency: v.literal("IDR"),
    subtotalAmount: v.number(),
    totalAmount: v.number(),
    adjustedTotalAmount: v.number(),
    financialAdjustmentAmount: v.number(),
    depositRequirementMode: depositRequirementModeValidator,
    depositRequirementValue: v.optional(v.number()),
    depositRequiredAmount: v.number(),
    allocatedDepositAmount: v.number(),
    verifiedPaymentAmount: v.number(),
    outstandingAmount: v.number(),
    overpaymentAmount: v.number(),
    refundObligationAmount: v.number(),
    refundObligationStatus: refundObligationStatusValidator,
    paymentStatus: invoicePaymentStatusValidator,
    createdAt: v.number(),
    updatedAt: v.number(),
    issuedAt: v.optional(v.number()),
    voidedAt: v.optional(v.number()),
    createdByUserId: v.id("appUsers"),
  })
    .index("by_order", ["orderId"])
    .index("by_customer_user_id", ["customerUserId"])
    .index("by_status", ["status"])
    .index("by_invoice_number", ["invoiceNumber"])
    .index("by_customer_user_id_and_created_at", ["customerUserId", "createdAt"])
    .index("by_created_at", ["createdAt"]),

  paymentConfirmations: defineTable({
    invoiceId: v.id("invoices"),
    customerUserId: v.id("appUsers"),
    amount: v.number(),
    paymentMethod: v.string(),
    transferReference: v.optional(v.string()),
    paidAt: v.number(),
    proofReference: v.optional(v.string()),
    proofStorageId: v.optional(v.id("_storage")),
    proofContentType: v.optional(v.string()),
    customerNote: v.optional(v.string()),
    status: paymentConfirmationStatusValidator,
    submittedAt: v.number(),
    reviewedAt: v.optional(v.number()),
    reviewedByUserId: v.optional(v.id("appUsers")),
    reviewNote: v.optional(v.string()),
    rejectionReason: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_invoice", ["invoiceId"])
    .index("by_customer_user_id_and_created_at", ["customerUserId", "createdAt"])
    .index("by_status_and_created_at", ["status", "createdAt"])
    .index("by_created_at", ["createdAt"]),

  depositTopUps: defineTable({
    customerUserId: v.id("appUsers"),
    amount: v.number(),
    bankReference: v.optional(v.string()),
    proofStorageId: v.id("_storage"),
    proofContentType: v.string(),
    status: v.union(v.literal("submitted"), v.literal("under_review"), v.literal("approved"), v.literal("rejected")),
    customerNote: v.optional(v.string()),
    reviewNote: v.optional(v.string()),
    rejectionReason: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
    reviewedAt: v.optional(v.number()),
    reviewedByUserId: v.optional(v.id("appUsers")),
    depositTransactionId: v.optional(v.id("depositTransactions")),
  })
    .index("by_customer_and_created_at", ["customerUserId", "createdAt"])
    .index("by_status_and_created_at", ["status", "createdAt"]),

  invoiceItems: defineTable({
    invoiceId: v.id("invoices"),
    orderItemId: v.id("orderItems"),
    descriptionSnapshot: v.string(),
    bookTitleSnapshot: v.string(),
    publisherNameSnapshot: v.string(),
    formatSnapshot: bookFormat,
    isbnSnapshot: v.string(),
    quantity: v.number(),
    unitPriceAmountSnapshot: v.number(),
    subtotalAmount: v.number(),
    createdAt: v.number(),
  })
    .index("by_invoice", ["invoiceId"])
    .index("by_order_item", ["orderItemId"]),

  refundObligations: defineTable({
    customerUserId: v.id("appUsers"),
    orderId: v.optional(v.id("orders")),
    invoiceId: v.optional(v.id("invoices")),
    exceptionId: v.optional(v.id("orderExceptions")),
    sourceAdjustmentId: v.optional(v.id("orderExceptionFinancialAdjustments")),
    depositAccountId: v.optional(v.id("depositAccounts")),
    reason: v.union(v.literal("cancellation"), v.literal("defect"), v.literal("deposit_refund")),
    amount: v.number(),
    paidAmount: v.number(),
    reservedAmount: v.number(),
    status: refundObligationLifecycleValidator,
    note: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
    createdByUserId: v.id("appUsers"),
  })
    .index("by_customer_user_id_and_created_at", ["customerUserId", "createdAt"])
    .index("by_invoice", ["invoiceId"])
    .index("by_exception", ["exceptionId"])
    .index("by_status_and_created_at", ["status", "createdAt"])
    .index("by_deposit_account", ["depositAccountId"]),

  refundPayouts: defineTable({
    refundObligationId: v.id("refundObligations"),
    customerUserId: v.id("appUsers"),
    reservationTransactionId: v.optional(v.id("depositTransactions")),
    amount: v.number(),
    paymentMethod: v.optional(v.string()),
    referenceNote: v.optional(v.string()),
    status: refundPayoutStatusValidator,
    failureReason: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
    startedAt: v.optional(v.number()),
    processedAt: v.optional(v.number()),
    processedByUserId: v.optional(v.id("appUsers")),
    createdByUserId: v.id("appUsers"),
  })
    .index("by_obligation", ["refundObligationId"])
    .index("by_customer_user_id_and_created_at", ["customerUserId", "createdAt"])
    .index("by_status_and_created_at", ["status", "createdAt"]),

  depositAccounts: defineTable({
    userId: v.id("appUsers"),
    currency: v.literal("IDR"),
    availableAmount: v.number(),
    reservedAmount: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user_id", ["userId"])
    .index("by_user_id_and_currency", ["userId", "currency"]),

  depositTransactions: defineTable({
    accountId: v.id("depositAccounts"),
    type: depositTransactionTypeValidator,
    amount: v.number(),
    availableDelta: v.number(),
    reservedDelta: v.number(),
    invoiceId: v.optional(v.id("invoices")),
    referenceTransactionId: v.optional(v.id("depositTransactions")),
    reversedByTransactionId: v.optional(v.id("depositTransactions")),
    refundObligationId: v.optional(v.id("refundObligations")),
    note: v.optional(v.string()),
    createdAt: v.number(),
    createdByUserId: v.id("appUsers"),
  })
    .index("by_account", ["accountId"])
    .index("by_account_and_created_at", ["accountId", "createdAt"])
    .index("by_invoice", ["invoiceId"])
    .index("by_reference_transaction", ["referenceTransactionId"]),

  invoiceDepositAllocations: defineTable({
    invoiceId: v.id("invoices"),
    accountId: v.id("depositAccounts"),
    reservationTransactionId: v.id("depositTransactions"),
    amount: v.number(),
    status: allocationStatusValidator,
    createdAt: v.number(),
    releasedAt: v.optional(v.number()),
    releasedByTransactionId: v.optional(v.id("depositTransactions")),
    createdByUserId: v.id("appUsers"),
  })
    .index("by_invoice", ["invoiceId"])
    .index("by_account", ["accountId"])
    .index("by_reservation_transaction", ["reservationTransactionId"])
    .index("by_invoice_and_status", ["invoiceId", "status"]),
});
