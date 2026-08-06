/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as batchTracking from "../batchTracking.js";
import type * as batches from "../batches.js";
import type * as bookVariants from "../bookVariants.js";
import type * as books from "../books.js";
import type * as catalogAccess from "../catalogAccess.js";
import type * as catalogItems from "../catalogItems.js";
import type * as lib_accessCodes from "../lib/accessCodes.js";
import type * as lib_catalogView from "../lib/catalogView.js";
import type * as lib_crypto from "../lib/crypto.js";
import type * as lib_depositLedger from "../lib/depositLedger.js";
import type * as lib_errors from "../lib/errors.js";
import type * as lib_fulfillmentTransitions from "../lib/fulfillmentTransitions.js";
import type * as lib_invoiceCalculations from "../lib/invoiceCalculations.js";
import type * as lib_invoiceNumbers from "../lib/invoiceNumbers.js";
import type * as lib_previewCapability from "../lib/previewCapability.js";
import type * as lib_sessions from "../lib/sessions.js";
import type * as lib_shipmentTransitions from "../lib/shipmentTransitions.js";
import type * as lib_validation from "../lib/validation.js";
import type * as orderFulfillment from "../orderFulfillment.js";
import type * as orders from "../orders.js";
import type * as prototypeSessions from "../prototypeSessions.js";
import type * as publishers from "../publishers.js";
import type * as secretCatalogs from "../secretCatalogs.js";
import type * as validators from "../validators.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  batchTracking: typeof batchTracking;
  batches: typeof batches;
  bookVariants: typeof bookVariants;
  books: typeof books;
  catalogAccess: typeof catalogAccess;
  catalogItems: typeof catalogItems;
  "lib/accessCodes": typeof lib_accessCodes;
  "lib/catalogView": typeof lib_catalogView;
  "lib/crypto": typeof lib_crypto;
  "lib/depositLedger": typeof lib_depositLedger;
  "lib/errors": typeof lib_errors;
  "lib/fulfillmentTransitions": typeof lib_fulfillmentTransitions;
  "lib/invoiceCalculations": typeof lib_invoiceCalculations;
  "lib/invoiceNumbers": typeof lib_invoiceNumbers;
  "lib/previewCapability": typeof lib_previewCapability;
  "lib/sessions": typeof lib_sessions;
  "lib/shipmentTransitions": typeof lib_shipmentTransitions;
  "lib/validation": typeof lib_validation;
  orderFulfillment: typeof orderFulfillment;
  orders: typeof orders;
  prototypeSessions: typeof prototypeSessions;
  publishers: typeof publishers;
  secretCatalogs: typeof secretCatalogs;
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

export declare const components: {};
