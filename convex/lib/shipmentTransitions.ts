export const SHIPMENT_STAGES = [
  "po_closed",
  "ordered_to_supplier",
  "shipped_internationally",
  "customs",
  "to_indonesia_warehouse",
  "at_store",
] as const;

export type ShipmentStage = (typeof SHIPMENT_STAGES)[number];

export function canTransitionShipment(
  fromStage: ShipmentStage | undefined,
  toStage: ShipmentStage,
  allowSkip = false,
): boolean {
  const nextIndex = SHIPMENT_STAGES.indexOf(toStage);
  if (fromStage === undefined) return nextIndex === 0;
  const currentIndex = SHIPMENT_STAGES.indexOf(fromStage);
  return nextIndex > currentIndex && (allowSkip || nextIndex === currentIndex + 1);
}
