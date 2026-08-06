import type { FulfillmentStage, ShipmentStage } from "@/domain/prototype/operations-context";

export const shipmentStageLabels: Record<ShipmentStage, string> = {
  po_closed: "PO Ditutup",
  ordered_to_supplier: "Dipesan ke Supplier",
  shipped_internationally: "Dikirim dari Luar Negeri",
  customs: "Pemeriksaan Bea Cukai",
  to_indonesia_warehouse: "Menuju Gudang Indonesia",
  at_store: "Sampai di Toko",
};

export const fulfillmentStageLabels: Record<FulfillmentStage, string> = {
  awaiting_payment: "Menunggu Pelunasan",
  awaiting_address: "Menunggu Alamat",
  packing: "Sedang Dikemas",
  shipped: "Sudah Dikirim",
  completed: "Selesai",
};

export const shipmentStages = Object.keys(shipmentStageLabels) as ShipmentStage[];
export const fulfillmentStages = Object.keys(fulfillmentStageLabels) as FulfillmentStage[];

export function invoiceStatusLabel(status: "draft" | "issued" | "void"): string {
  return { draft: "Draft", issued: "Issued", void: "Void" }[status];
}
