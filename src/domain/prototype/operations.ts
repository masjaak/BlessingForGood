import type {
  FulfillmentStage,
  InvoicePaymentStatus,
  PaymentConfirmationStatus,
  ShipmentStage,
} from "@/domain/prototype/operations-context";

export const shipmentStageLabels: Record<ShipmentStage, string> = {
  po_closed: "PO Ditutup",
  ordered_to_supplier: "Dipesan ke pemasok",
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

export function formatCargoEta(month: string | null | undefined): string {
  if (!month) return "Belum ditentukan";
  const date = new Date(month + "-01T00:00:00.000Z");
  return Number.isNaN(date.getTime())
    ? "Belum ditentukan"
    : new Intl.DateTimeFormat("id-ID", { month: "short", year: "numeric", timeZone: "UTC" }).format(date);
}

export function invoiceStatusLabel(status: "draft" | "issued" | "void"): string {
  return { draft: "Draf", issued: "Terbit", void: "Dibatalkan" }[status];
}

export function invoicePaymentStatusLabel(status: InvoicePaymentStatus): string {
  return {
    unpaid: "Perlu dibayar",
    payment_submitted: "Menunggu verifikasi",
    partially_paid: "Dibayar sebagian",
    paid: "Lunas terverifikasi",
  }[status];
}

export function paymentConfirmationStatusLabel(status: PaymentConfirmationStatus): string {
  return {
    submitted: "Terkirim",
    under_review: "Sedang ditinjau",
    approved: "Disetujui",
    rejected: "Ditolak",
  }[status];
}
