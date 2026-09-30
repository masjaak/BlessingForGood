import type { Doc } from "../_generated/dataModel";

export function effectiveReadyStockPrice(
  variant: Pick<Doc<"bookVariants">, "priceAmount">,
  inventory: Pick<Doc<"readyStockInventory">, "priceOverrideAmount"> | null,
) {
  return inventory?.priceOverrideAmount ?? variant.priceAmount;
}
