export function prototypeErrorMessage(reason: unknown, fallback: string): string {
  const message = reason instanceof Error ? reason.message : "";
  if (message.includes("ACCESS_CODE_INVALID") || message.includes("ACCESS_CODE_EXPIRED")) {
    return "Kode belum cocok, katalog sudah ditutup, atau akses belum tersedia.";
  }
  if (message.includes("CATALOG_NOT_OPEN") || message.includes("CATALOG_CLOSED")) {
    return "Katalog ini sudah ditutup.";
  }
  if (message.includes("BOOK_VARIANT_UNAVAILABLE")) return "Format yang dipilih sudah tidak tersedia.";
  if (message.includes("ORDER_LOCKED")) return "Order sudah terkunci setelah katalog ditutup.";
  if (message.includes("ORDER_EMPTY")) return "Pilih minimal satu buku sebelum mengirim preorder.";
  if (message.includes("SESSION") || message.includes("PREVIEW_MODE_DISABLED")) {
    return "Preview session tidak tersedia. Muat ulang halaman dan coba lagi.";
  }
  return message && !message.includes("[CONVEX") ? message : fallback;
}
