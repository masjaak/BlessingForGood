export const FULFILLMENT_STAGES = ["awaiting_payment", "awaiting_address", "packing", "shipped", "completed"] as const;

export type FulfillmentStage = (typeof FULFILLMENT_STAGES)[number];

export function canTransitionFulfillment(fromStage: FulfillmentStage | undefined, toStage: FulfillmentStage): boolean {
  const nextIndex = FULFILLMENT_STAGES.indexOf(toStage);
  if (fromStage === undefined) return nextIndex === 0;
  return nextIndex === FULFILLMENT_STAGES.indexOf(fromStage) + 1;
}
