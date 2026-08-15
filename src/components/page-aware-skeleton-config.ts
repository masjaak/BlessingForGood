export type AdminSkeletonKind = "dashboard" | "table-queue" | "form-list" | "detail" | "finance" | "settings";
export type CustomerSkeletonKind = "dashboard" | "list" | "detail" | "finance" | "settings" | "activity";
export type Workspace = "admin" | "customer";
export type SkeletonVariant =
  | "batch"
  | "catalog-list"
  | "card-list"
  | "customer-card-list"
  | "deposit"
  | "financial-list"
  | "orders"
  | "ready-stock"
  | "report";

export type SkeletonConfig = {
  kind: AdminSkeletonKind | CustomerSkeletonKind;
  eyebrow: string;
  title: string;
  description: string;
  narrow?: boolean;
  variant?: SkeletonVariant;
};

export function adminConfig(pathname: string): SkeletonConfig {
  if (pathname === "/admin") {
    return {
      kind: "dashboard",
      eyebrow: "Operasional BFG",
      title: "Pekerjaan penting hari ini.",
      description: "Antrian utama dari pesanan, batch, pembayaran, invoice, dan penanganan masalah.",
    };
  }
  if (pathname === "/admin/books") {
    return {
      kind: "form-list",
      eyebrow: "Book Master",
      title: "Kelola buku dan Ready Stock",
      description: "Metadata buku dipakai ulang; katalog rahasia dan Ready Stock hanya mengatur konteksnya.",
    };
  }
  if (pathname.startsWith("/admin/books/")) {
    return {
      kind: "detail",
      eyebrow: "Book Master",
      title: "Detail buku",
      description: "Metadata, cover, variant, dan status publikasi.",
    };
  }
  if (pathname === "/admin/catalogs") {
    return {
      kind: "form-list",
      eyebrow: "Operasional katalog",
      title: "Kelola Secret Catalog dengan akses yang aman.",
      description:
        "Akses katalog tetap terpisah dari kata sandi akun dan hanya diberikan melalui kode serta grant yang sah.",
      variant: "catalog-list",
    };
  }
  if (pathname.startsWith("/admin/catalogs/")) {
    return {
      kind: "detail",
      eyebrow: "Secret Catalog",
      title: "Detail katalog",
      description: "Lifecycle, buku, dan Access Management.",
    };
  }
  if (pathname === "/admin/ready-stock") {
    return {
      kind: "table-queue",
      eyebrow: "Ready Stock",
      title: "Pantau stok siap proses.",
      description: "On hand, reserved, dan available dalam satu antrian operasional.",
      variant: "ready-stock",
    };
  }
  if (pathname === "/admin/batches") {
    return {
      kind: "table-queue",
      eyebrow: "Operasi batch",
      title: "Jalankan cargo dengan catatan yang jelas.",
      description: "Hubungkan katalog, susun roster, dan catat perjalanan kiriman dalam satu alur.",
      variant: "batch",
    };
  }
  if (pathname.startsWith("/admin/batches/")) {
    return {
      kind: "detail",
      eyebrow: "Batch operations",
      title: "Detail operasi batch",
      description: "Status, roster, dan tindakan batch.",
    };
  }
  if (pathname === "/admin/orders") {
    return {
      kind: "table-queue",
      eyebrow: "Order operations",
      title: "See the preorder, then move its stage.",
      description: "Status transitions, assisted orders, and batch links use the canonical order pipeline.",
      variant: "orders",
    };
  }
  if (pathname.startsWith("/admin/orders/")) {
    return {
      kind: "detail",
      eyebrow: "Order operations",
      title: "Detail pesanan",
      description: "Tracking, fulfillment, batch, dan exception.",
    };
  }
  if (pathname === "/admin/customers") {
    return {
      kind: "table-queue",
      eyebrow: "Operasional customer",
      title: "Customer aktif",
      description: "Buka customer untuk melihat profil dan riwayat operasional.",
    };
  }
  if (pathname === "/admin/join-requests" || pathname === "/admin/exceptions") {
    const isJoinRequests = pathname.endsWith("join-requests");
    return {
      kind: "table-queue",
      eyebrow: isJoinRequests ? "Admission" : "Exception operations",
      title: isJoinRequests ? "Tinjau permintaan join." : "Tangani masalah pesanan.",
      description: isJoinRequests
        ? "Permintaan nyata tetap melalui review dan audit."
        : "Exception item-level tetap terhubung ke order dan invoice asal.",
      variant: "card-list",
    };
  }
  if (pathname.startsWith("/admin/customers/")) {
    return {
      kind: "detail",
      eyebrow: "Detail customer",
      title: "Detail customer",
      description: "Profil, alamat, pesanan, invoice, dan masalah customer.",
    };
  }
  if (pathname === "/admin/invoices") {
    return {
      kind: "finance",
      eyebrow: "Invoice and deposit operations",
      title: "Make the money state explicit.",
      description: "Invoice, deposit, allocation, release, dan reversal tetap terpisah.",
      variant: "financial-list",
    };
  }
  if (pathname.startsWith("/admin/invoices/")) {
    return {
      kind: "detail",
      eyebrow: "Invoice operations",
      title: "Detail invoice",
      description: "Invoice, account, allocation, dan ledger.",
    };
  }
  if (["/admin/payments", "/admin/deposits", "/admin/refunds"].includes(pathname)) {
    return {
      kind: "finance",
      eyebrow: "Operasi pembayaran",
      title: "Tinjau status keuangan.",
      description: "Antrian, bukti, dan riwayat tetap terbaca tanpa nilai palsu.",
      variant: "card-list",
    };
  }
  if (pathname === "/admin/reports") {
    return {
      kind: "finance",
      eyebrow: "Reports & Analytics",
      title: "Lihat performa operasional.",
      description: "Ringkasan berbasis periode dan export.",
      variant: "report",
    };
  }
  if (pathname === "/admin/notifications" || pathname === "/admin/inbox") {
    return {
      kind: "table-queue",
      eyebrow: "Pusat aktivitas",
      title: pathname.endsWith("inbox") ? "Inbox" : "Notifikasi",
      description: pathname.endsWith("inbox")
        ? "Pesan operasional yang perlu ditindaklanjuti."
        : "Pembaruan sistem untuk workspace Admin.",
      variant: "card-list",
    };
  }
  if (pathname === "/admin/audit") {
    return {
      kind: "table-queue",
      eyebrow: "System audit",
      title: "Activity Log",
      description: "Peristiwa operasional yang dapat ditelusuri kembali ke aktor dan record asal.",
      variant: "card-list",
    };
  }
  if (pathname === "/admin/settings" || pathname === "/admin/users" || pathname === "/admin/content") {
    return {
      kind: "settings",
      eyebrow: "Workspace BFG",
      title: "Pengaturan workspace.",
      description: "Kontrol operasional yang aman dan terstruktur.",
    };
  }
  return {
    kind: "table-queue",
    eyebrow: "Operasional BFG",
    title: "Memuat workspace.",
    description: "Menyiapkan antrian kerja.",
  };
}

export function customerConfig(pathname: string): SkeletonConfig {
  if (pathname === "/account") {
    return {
      kind: "dashboard",
      eyebrow: "Akun Blessfriends",
      title: "Semua yang perlu kamu ikuti, dalam satu tempat.",
      description: "Menyiapkan ringkasan pesanan, invoice, deposit, dan aktivitasmu.",
    };
  }
  if (pathname === "/account/orders") {
    return {
      kind: "list",
      eyebrow: "Pesanan saya",
      title: "Ikuti langkah berikutnya dengan mudah.",
      description: "Setiap pesanan menyimpan status dan perjalanan terbaru khusus untuk akunmu.",
      narrow: true,
      variant: "customer-card-list",
    };
  }
  if (pathname.startsWith("/account/orders/")) {
    return {
      kind: "detail",
      eyebrow: "Tracking pesanan",
      title: "Detail pesanan",
      description: "Status, timeline, dan catatan pengiriman.",
      narrow: true,
    };
  }
  if (pathname === "/account/invoices") {
    return {
      kind: "finance",
      eyebrow: "Invoice & deposit",
      title: "Lihat jumlah yang perlu diselesaikan.",
      description: "Invoice, pembayaran, dan sisa tagihan dari catatan BFG terbaru.",
      narrow: true,
      variant: "customer-card-list",
    };
  }
  if (pathname.startsWith("/account/invoices/") || pathname === "/account/deposit") {
    return {
      kind: "finance",
      eyebrow: pathname === "/account/deposit" ? "Deposit" : "Detail invoice",
      title: pathname === "/account/deposit" ? "Saldo dan top-up" : "Detail invoice",
      description: "Saldo, pembayaran, dan riwayat akun.",
      narrow: pathname !== "/account/deposit",
      variant: pathname === "/account/deposit" ? "deposit" : undefined,
    };
  }
  if (pathname === "/account/batches") {
    return {
      kind: "list",
      eyebrow: "Batch PO",
      title: "Perjalanan batch bukumu",
      description: "Status batch diperbarui untuk customer yang memiliki buku di roster.",
      narrow: true,
      variant: "customer-card-list",
    };
  }
  if (pathname.startsWith("/account/batches/")) {
    return {
      kind: "detail",
      eyebrow: "Batch PO",
      title: "Detail batch",
      description: "Roster dan perjalanan konsolidasi buku.",
      narrow: true,
    };
  }
  if (pathname === "/account/profile" || pathname === "/account/addresses") {
    return {
      kind: "settings",
      eyebrow: "Akun",
      title: pathname.endsWith("profile") ? "Profil Blessfriend" : "Alamat pengiriman",
      description: "Informasi akun yang aman dan mudah diperbarui.",
      narrow: true,
    };
  }
  if (pathname === "/account/notifications" || pathname === "/account/inbox") {
    return {
      kind: "activity",
      eyebrow: "Akun Blessfriends",
      title: pathname.endsWith("inbox") ? "Inbox" : "Notifikasi",
      description: pathname.endsWith("inbox")
        ? "Pesan operasional dari BFG untuk akunmu."
        : "Pembaruan pesanan, batch, tagihan, dan pembayaranmu.",
      narrow: true,
      variant: "customer-card-list",
    };
  }
  return { kind: "dashboard", eyebrow: "Akun Blessfriends", title: "Akun", description: "Menyiapkan ruang akunmu." };
}

export function skeletonName(workspace: Workspace, kind: SkeletonConfig["kind"]) {
  return `${workspace.toUpperCase()}_${kind.replace("-", "_").toUpperCase()}_SKELETON`;
}
