import { v } from "convex/values";

export const bookFormatValidator = v.union(v.literal("BB"), v.literal("PB"), v.literal("HB"));
export const bookPublicationStatusValidator = v.union(
  v.literal("draft"),
  v.literal("published"),
  v.literal("special"),
  v.literal("archived"),
);
export const bookSortValidator = v.union(v.literal("newest"), v.literal("title"), v.literal("price"));
export const shipmentStageValidator = v.union(
  v.literal("po_closed"),
  v.literal("ordered_to_supplier"),
  v.literal("shipped_internationally"),
  v.literal("customs"),
  v.literal("to_indonesia_warehouse"),
  v.literal("at_store"),
);
export const fulfillmentStageValidator = v.union(
  v.literal("awaiting_payment"),
  v.literal("awaiting_address"),
  v.literal("packing"),
  v.literal("shipped"),
  v.literal("completed"),
);
export const invoiceStatusValidator = v.union(v.literal("draft"), v.literal("issued"), v.literal("void"));
export const invoicePaymentStatusValidator = v.union(
  v.literal("unpaid"),
  v.literal("payment_submitted"),
  v.literal("partially_paid"),
  v.literal("paid"),
);
export const paymentConfirmationStatusValidator = v.union(
  v.literal("submitted"),
  v.literal("under_review"),
  v.literal("approved"),
  v.literal("rejected"),
);
export const joinRequestStatusValidator = v.union(
  v.literal("submitted"),
  v.literal("under_review"),
  v.literal("approved"),
  v.literal("rejected"),
);
export const joinRequestInvitationStatusValidator = v.union(
  v.literal("not_ready"),
  v.literal("ready"),
  v.literal("pending"),
  v.literal("sent"),
  v.literal("accepted"),
  v.literal("failed"),
);
export const joinRequestOnboardingPathValidator = v.union(v.literal("sign_in"), v.literal("sign_up"));
export const joinRequestBookInterestValidator = v.union(
  v.literal("Children & Picture Books"),
  v.literal("Middle Grade"),
  v.literal("Young Adult"),
  v.literal("Fiction & Novel"),
  v.literal("Non-fiction"),
  v.literal("Art & Design"),
  v.literal("Architecture & Interiors"),
  v.literal("Photography"),
  v.literal("Fashion"),
  v.literal("Food & Cookbooks"),
  v.literal("Travel"),
  v.literal("Biography & Memoir"),
  v.literal("Comics & Graphic Novels"),
  v.literal("Collector & Special Editions"),
  v.literal("Other"),
  v.literal("Children Books"),
  v.literal("Collector Books"),
  v.literal("Novel"),
);
export const orderSourceValidator = v.union(
  v.literal("customer_self_service"),
  v.literal("admin_assisted"),
  v.literal("ready_stock"),
);
export const depositRequirementModeValidator = v.union(v.literal("none"), v.literal("fixed"), v.literal("percentage"));
export const depositTransactionTypeValidator = v.union(
  v.literal("credit"),
  v.literal("reservation"),
  v.literal("release"),
  v.literal("debit"),
  v.literal("reversal"),
);
export const allocationStatusValidator = v.union(v.literal("active"), v.literal("released"), v.literal("reversed"));
export const orderExceptionTypeValidator = v.union(
  v.literal("out_of_stock"),
  v.literal("defect"),
  v.literal("customer_cancellation"),
  v.literal("admin_cancellation"),
);
export const orderExceptionStatusValidator = v.union(
  v.literal("opened"),
  v.literal("under_review"),
  v.literal("resolution_selected"),
  v.literal("resolved"),
  v.literal("rejected"),
);
export const orderExceptionResolutionValidator = v.union(
  v.literal("remove_item"),
  v.literal("deposit_release"),
  v.literal("refund_required"),
  v.literal("replacement"),
  v.literal("no_action"),
);
export const refundObligationStatusValidator = v.union(
  v.literal("none"),
  v.literal("credit_due"),
  v.literal("refund_due"),
  v.literal("settled"),
);
export const orderExceptionEventTypeValidator = v.union(
  v.literal("opened"),
  v.literal("review_started"),
  v.literal("resolution_selected"),
  v.literal("approved"),
  v.literal("rejected"),
  v.literal("resolved"),
  v.literal("financial_adjustment_created"),
  v.literal("deposit_allocation_released"),
);
export const readyStockReservationStatusValidator = v.union(
  v.literal("active"),
  v.literal("released"),
  v.literal("fulfilled"),
);
export const refundObligationLifecycleValidator = v.union(
  v.literal("pending"),
  v.literal("partially_paid"),
  v.literal("paid"),
);
export const refundPayoutStatusValidator = v.union(
  v.literal("pending"),
  v.literal("processing"),
  v.literal("paid"),
  v.literal("failed"),
);
export const roleValidator = v.union(v.literal("owner"), v.literal("admin"), v.literal("customer"));
export const userStatusValidator = v.union(v.literal("active"), v.literal("suspended"), v.literal("removed"));
export const paginationValidator = v.object({
  numItems: v.number(),
  cursor: v.union(v.string(), v.null()),
});

export function assertSafeInteger(value: number, message: string): void {
  if (!Number.isSafeInteger(value)) throw new Error(message);
}
