import { getConvexErrorCode } from "@/domain/prototype/context";

export function productErrorMessage(reason: unknown, fallback: string): string {
  const message = reason instanceof Error ? reason.message : "";
  const code = getConvexErrorCode(reason);
  if (code === "JOIN_REQUEST_ALREADY_APPROVED" || message.includes("JOIN_REQUEST_ALREADY_APPROVED")) {
    return "Email ini sudah pernah disetujui. Jika sudah menerima undangan, masuk dengan akun tersebut.";
  }
  if (code === "JOIN_REQUEST_DUPLICATE" || message.includes("JOIN_REQUEST_DUPLICATE")) {
    return "Permintaan untuk email atau nomor ini masih menunggu tinjauan.";
  }
  if (code === "JOIN_REQUEST_INVALID_STATE" || message.includes("JOIN_REQUEST_INVALID_STATE")) {
    return "Akun BFG-mu sudah terdaftar. Masuk untuk melanjutkan.";
  }
  if (code === "JOIN_REQUEST_ACKNOWLEDGEMENT_REQUIRED" || message.includes("JOIN_REQUEST_ACKNOWLEDGEMENT_REQUIRED")) {
    return "Centang persetujuan sebelum mengirim permintaan.";
  }
  if (code === "JOIN_REQUEST_EMAIL_INVALID" || message.includes("JOIN_REQUEST_EMAIL_INVALID")) {
    return "Masukkan alamat email yang valid.";
  }
  if (message.includes("contact is invalid")) return "Masukkan nomor WhatsApp atau telepon yang valid.";
  if (message.includes("name is invalid")) return "Masukkan nama yang valid.";
  if (message.includes("area is invalid")) return "Masukkan area domisili yang valid.";
  if (message.includes("note is invalid")) return "Catatan terlalu panjang.";
  if (message.includes("ACCESS_CODE_INVALID") || message.includes("ACCESS_CODE_EXPIRED")) {
    return "Kode belum cocok, katalog sudah ditutup, atau akses belum tersedia.";
  }
  if (message.includes("ACCESS_CODE_RATE_LIMITED")) return "Terlalu banyak percobaan. Coba lagi dalam beberapa menit.";
  if (message.includes("RATE_LIMITED")) return "Terlalu banyak permintaan. Coba lagi sebentar.";
  if (message.includes("CATALOG_NOT_OPEN") || message.includes("CATALOG_CLOSED")) {
    return "Katalog ini sudah ditutup.";
  }
  if (message.includes("BOOK_VARIANT_UNAVAILABLE")) return "Format yang dipilih sudah tidak tersedia.";
  if (code === "READY_STOCK_UNAVAILABLE" || message.includes("READY_STOCK_UNAVAILABLE")) {
    if (message.includes("Jumlah melebihi stok")) return "Jumlah melebihi stok.";
    return "Stok baru saja habis.";
  }
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
  return fallback;
}
