import { getConvexErrorCode } from "@/domain/prototype/context";

export function productErrorMessage(reason: unknown, fallback: string): string {
  const message = reason instanceof Error ? reason.message : "";
  const code = getConvexErrorCode(reason);
  if (message.includes("ACCESS_CODE_INVALID") || message.includes("ACCESS_CODE_EXPIRED")) {
    return "Kode belum cocok, katalog sudah ditutup, atau akses belum tersedia.";
  }
  if (message.includes("ACCESS_CODE_RATE_LIMITED")) return "Terlalu banyak percobaan. Coba lagi dalam beberapa menit.";
  if (message.includes("CATALOG_NOT_OPEN") || message.includes("CATALOG_CLOSED")) {
    return "Katalog ini sudah ditutup.";
  }
  if (message.includes("BOOK_VARIANT_UNAVAILABLE")) return "Format yang dipilih sudah tidak tersedia.";
  if (message.includes("ORDER_LOCKED")) return "Pesanan sudah terkunci setelah katalog ditutup.";
  if (message.includes("ORDER_EMPTY")) return "Pilih minimal satu buku sebelum mengirim preorder.";
  if (code === "INVOICE_INVALID_STATE" || message.includes("INVOICE_INVALID_STATE")) {
    if (message.includes("release or reverse")) return "Lepaskan atau balikkan pembayaran sebelum membatalkan invoice.";
    if (message.includes("resolve payment")) return "Selesaikan konfirmasi pembayaran sebelum membatalkan invoice.";
    return "Invoice belum berada pada keadaan yang dapat dibatalkan.";
  }
  if (code === "INVOICE_VOID" || message.includes("INVOICE_VOID")) return "Invoice ini sudah dibatalkan.";
  if (code === "DEPOSIT_BALANCE_INSUFFICIENT" || message.includes("DEPOSIT_BALANCE_INSUFFICIENT")) {
    return "Saldo deposit yang tersedia belum mencukupi.";
  }
  if (code === "DEPOSIT_ALLOCATION_EXCEEDS_OUTSTANDING" || message.includes("DEPOSIT_ALLOCATION_EXCEEDS_OUTSTANDING")) {
    return "Alokasi tidak boleh melebihi sisa tagihan invoice.";
  }
  if (code === "DEPOSIT_ACCOUNT_NOT_FOUND" || message.includes("DEPOSIT_ACCOUNT_NOT_FOUND")) {
    return "Akun deposit pelanggan belum tersedia.";
  }
  if (code === "DEPOSIT_AMOUNT_INVALID" || message.includes("DEPOSIT_AMOUNT_INVALID")) {
    return "Masukkan nominal deposit IDR yang valid.";
  }
  if (message.includes("SESSION")) return "Sesi tidak tersedia. Muat ulang halaman dan coba lagi.";
  return message && !message.includes("[CONVEX") ? message : fallback;
}
