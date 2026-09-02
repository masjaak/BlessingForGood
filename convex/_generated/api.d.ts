/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auditEvents from "../auditEvents.js";
import type * as batchTracking from "../batchTracking.js";
import type * as batches from "../batches.js";
import type * as bookVariants from "../bookVariants.js";
import type * as books from "../books.js";
import type * as bulkImport from "../bulkImport.js";
import type * as catalogAccess from "../catalogAccess.js";
import type * as catalogItems from "../catalogItems.js";
import type * as contentBlocks from "../contentBlocks.js";
import type * as customerAddresses from "../customerAddresses.js";
import type * as customerProfiles from "../customerProfiles.js";
import type * as depositAccounts from "../depositAccounts.js";
import type * as depositTopUps from "../depositTopUps.js";
import type * as depositTransactions from "../depositTransactions.js";
import type * as http from "../http.js";
import type * as invoiceDepositAllocations from "../invoiceDepositAllocations.js";
import type * as invoices from "../invoices.js";
import type * as joinRequestInvitationState from "../joinRequestInvitationState.js";
import type * as joinRequestInvitations from "../joinRequestInvitations.js";
import type * as joinRequests from "../joinRequests.js";
import type * as lib_accessCodes from "../lib/accessCodes.js";
import type * as lib_audit from "../lib/audit.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_auth_config from "../lib/auth_config.js";
import type * as lib_batchNumbers from "../lib/batchNumbers.js";
import type * as lib_bulkImport from "../lib/bulkImport.js";
import type * as lib_cancellationEligibility from "../lib/cancellationEligibility.js";
import type * as lib_catalogOrdering from "../lib/catalogOrdering.js";
import type * as lib_catalogView from "../lib/catalogView.js";
import type * as lib_crypto from "../lib/crypto.js";
import type * as lib_depositLedger from "../lib/depositLedger.js";
import type * as lib_errors from "../lib/errors.js";
import type * as lib_fulfillmentTransitions from "../lib/fulfillmentTransitions.js";
import type * as lib_invoiceCalculations from "../lib/invoiceCalculations.js";
import type * as lib_invoiceNumbers from "../lib/invoiceNumbers.js";
import type * as lib_invoiceProjection from "../lib/invoiceProjection.js";
import type * as lib_memberCodes from "../lib/memberCodes.js";
import type * as lib_notifications from "../lib/notifications.js";
import type * as lib_orderCodes from "../lib/orderCodes.js";
import type * as lib_orderExceptionState from "../lib/orderExceptionState.js";
import type * as lib_orderExceptionViews from "../lib/orderExceptionViews.js";
import type * as lib_previewCapability from "../lib/previewCapability.js";
import type * as lib_productDomain from "../lib/productDomain.js";
import type * as lib_rateLimit from "../lib/rateLimit.js";
import type * as lib_readyStockReservations from "../lib/readyStockReservations.js";
import type * as lib_sessions from "../lib/sessions.js";
import type * as lib_shipmentTransitions from "../lib/shipmentTransitions.js";
import type * as lib_storage from "../lib/storage.js";
import type * as lib_validation from "../lib/validation.js";
import type * as notifications from "../notifications.js";
import type * as orderExceptions from "../orderExceptions.js";
import type * as orderFulfillment from "../orderFulfillment.js";
import type * as orders from "../orders.js";
import type * as paymentConfirmations from "../paymentConfirmations.js";
import type * as prototypeSessions from "../prototypeSessions.js";
import type * as publishers from "../publishers.js";
import type * as readyStock from "../readyStock.js";
import type * as refunds from "../refunds.js";
import type * as reports from "../reports.js";
import type * as secretCatalogs from "../secretCatalogs.js";
import type * as settings from "../settings.js";
import type * as uploads from "../uploads.js";
import type * as userProvisioning from "../userProvisioning.js";
import type * as users from "../users.js";
import type * as validators from "../validators.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auditEvents: typeof auditEvents;
  batchTracking: typeof batchTracking;
  batches: typeof batches;
  bookVariants: typeof bookVariants;
  books: typeof books;
  bulkImport: typeof bulkImport;
  catalogAccess: typeof catalogAccess;
  catalogItems: typeof catalogItems;
  contentBlocks: typeof contentBlocks;
  customerAddresses: typeof customerAddresses;
  customerProfiles: typeof customerProfiles;
  depositAccounts: typeof depositAccounts;
  depositTopUps: typeof depositTopUps;
  depositTransactions: typeof depositTransactions;
  http: typeof http;
  invoiceDepositAllocations: typeof invoiceDepositAllocations;
  invoices: typeof invoices;
  joinRequestInvitationState: typeof joinRequestInvitationState;
  joinRequestInvitations: typeof joinRequestInvitations;
  joinRequests: typeof joinRequests;
  "lib/accessCodes": typeof lib_accessCodes;
  "lib/audit": typeof lib_audit;
  "lib/auth": typeof lib_auth;
  "lib/auth_config": typeof lib_auth_config;
  "lib/batchNumbers": typeof lib_batchNumbers;
  "lib/bulkImport": typeof lib_bulkImport;
  "lib/cancellationEligibility": typeof lib_cancellationEligibility;
  "lib/catalogOrdering": typeof lib_catalogOrdering;
  "lib/catalogView": typeof lib_catalogView;
  "lib/crypto": typeof lib_crypto;
  "lib/depositLedger": typeof lib_depositLedger;
  "lib/errors": typeof lib_errors;
  "lib/fulfillmentTransitions": typeof lib_fulfillmentTransitions;
  "lib/invoiceCalculations": typeof lib_invoiceCalculations;
  "lib/invoiceNumbers": typeof lib_invoiceNumbers;
  "lib/invoiceProjection": typeof lib_invoiceProjection;
  "lib/memberCodes": typeof lib_memberCodes;
  "lib/notifications": typeof lib_notifications;
  "lib/orderCodes": typeof lib_orderCodes;
  "lib/orderExceptionState": typeof lib_orderExceptionState;
  "lib/orderExceptionViews": typeof lib_orderExceptionViews;
  "lib/previewCapability": typeof lib_previewCapability;
  "lib/productDomain": typeof lib_productDomain;
  "lib/rateLimit": typeof lib_rateLimit;
  "lib/readyStockReservations": typeof lib_readyStockReservations;
  "lib/sessions": typeof lib_sessions;
  "lib/shipmentTransitions": typeof lib_shipmentTransitions;
  "lib/storage": typeof lib_storage;
  "lib/validation": typeof lib_validation;
  notifications: typeof notifications;
  orderExceptions: typeof orderExceptions;
  orderFulfillment: typeof orderFulfillment;
  orders: typeof orders;
  paymentConfirmations: typeof paymentConfirmations;
  prototypeSessions: typeof prototypeSessions;
  publishers: typeof publishers;
  readyStock: typeof readyStock;
  refunds: typeof refunds;
  reports: typeof reports;
  secretCatalogs: typeof secretCatalogs;
  settings: typeof settings;
  uploads: typeof uploads;
  userProvisioning: typeof userProvisioning;
  users: typeof users;
  validators: typeof validators;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  rateLimiter: import("@convex-dev/rate-limiter/_generated/component.js").ComponentApi<"rateLimiter">;
};
