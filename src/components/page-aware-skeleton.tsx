"use client";

import { usePathname } from "next/navigation";
import { AdminNav } from "@/components/admin-nav";
import { Card, PageHeader, Skeleton, SkeletonTable, SkeletonText } from "@/components/ui";

type AdminSkeletonKind = "dashboard" | "table-queue" | "form-list" | "detail" | "finance" | "settings";
type CustomerSkeletonKind = "dashboard" | "list" | "detail" | "finance" | "settings" | "activity";
type Workspace = "admin" | "customer";

type SkeletonConfig = {
  kind: AdminSkeletonKind | CustomerSkeletonKind;
  eyebrow: string;
  title: string;
  description: string;
  narrow?: boolean;
};

function adminConfig(pathname: string): SkeletonConfig {
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
    };
  }
  if (pathname === "/admin/batches") {
    return {
      kind: "table-queue",
      eyebrow: "Operasi batch",
      title: "Jalankan cargo dengan catatan yang jelas.",
      description: "Hubungkan katalog, susun roster, dan catat perjalanan kiriman dalam satu alur.",
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
    };
  }
  if (pathname === "/admin/reports") {
    return {
      kind: "finance",
      eyebrow: "Reports & Analytics",
      title: "Lihat performa operasional.",
      description: "Ringkasan berbasis periode dan export.",
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

function customerConfig(pathname: string): SkeletonConfig {
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
    };
  }
  if (pathname.startsWith("/account/invoices/") || pathname === "/account/deposit") {
    return {
      kind: "finance",
      eyebrow: pathname === "/account/deposit" ? "Deposit" : "Detail invoice",
      title: pathname === "/account/deposit" ? "Saldo dan top-up" : "Detail invoice",
      description: "Saldo, pembayaran, dan riwayat akun.",
      narrow: pathname !== "/account/deposit",
    };
  }
  if (pathname === "/account/batches") {
    return {
      kind: "list",
      eyebrow: "Batch PO",
      title: "Perjalanan batch bukumu",
      description: "Status batch diperbarui untuk customer yang memiliki buku di roster.",
      narrow: true,
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
    };
  }
  return { kind: "dashboard", eyebrow: "Akun Blessfriends", title: "Akun", description: "Menyiapkan ruang akunmu." };
}

function SkeletonMetric({ className = "" }: { className?: string }) {
  return (
    <Card className={`workspace-skeleton-metric ${className}`.trim()} aria-hidden="true">
      <SkeletonText width="42%" />
      <Skeleton className="skeleton-metric-value" />
      <SkeletonText width="76%" />
    </Card>
  );
}

function SkeletonPanel({ className = "", lines = 4 }: { className?: string; lines?: number }) {
  return (
    <Card className={`workspace-skeleton-panel ${className}`.trim()} aria-hidden="true">
      <SkeletonText width="34%" />
      {Array.from({ length: lines }, (_, index) => (
        <SkeletonText key={index} width={index === lines - 1 ? "58%" : index % 2 ? "82%" : "94%"} />
      ))}
    </Card>
  );
}

function SkeletonToolbar() {
  return (
    <div className="workspace-skeleton-toolbar" aria-hidden="true">
      <Skeleton className="skeleton-field skeleton-field-wide" />
      <Skeleton className="skeleton-field" />
      <Skeleton className="skeleton-field" />
      <Skeleton className="skeleton-cta" />
    </div>
  );
}

function SkeletonTableBlock() {
  return (
    <Card className="workspace-skeleton-table-card" aria-hidden="true">
      <div className="workspace-skeleton-table-head">
        <SkeletonText width="24%" />
        <SkeletonText width="18%" />
        <SkeletonText width="16%" />
        <SkeletonText width="12%" />
      </div>
      <SkeletonTable rows={6} />
    </Card>
  );
}

function SkeletonForm() {
  return (
    <Card className="workspace-skeleton-form" aria-hidden="true">
      <SkeletonText width="38%" />
      <div className="workspace-skeleton-form-grid">
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className="skeleton-field" />
        ))}
      </div>
      <Skeleton className="skeleton-cta" />
    </Card>
  );
}

function AdminSkeletonContent({ kind }: { kind: AdminSkeletonKind }) {
  if (kind === "dashboard") {
    return (
      <>
        <div className="workspace-skeleton-metric-grid workspace-skeleton-metric-grid-primary">
          {Array.from({ length: 4 }, (_, index) => (
            <SkeletonMetric key={index} />
          ))}
        </div>
        <div className="workspace-skeleton-panel-grid">
          <SkeletonPanel lines={6} />
          <SkeletonPanel lines={6} />
        </div>
        <div className="workspace-skeleton-metric-grid workspace-skeleton-metric-grid-secondary">
          {Array.from({ length: 3 }, (_, index) => (
            <SkeletonMetric key={index} />
          ))}
        </div>
      </>
    );
  }
  if (kind === "table-queue") {
    return (
      <>
        <SkeletonToolbar />
        <SkeletonTableBlock />
      </>
    );
  }
  if (kind === "form-list") {
    return (
      <>
        <div className="workspace-skeleton-two-column">
          <SkeletonForm />
          <SkeletonPanel lines={6} />
        </div>
        <SkeletonTableBlock />
      </>
    );
  }
  if (kind === "detail") {
    return (
      <>
        <Card className="workspace-skeleton-detail-summary" aria-hidden="true">
          {Array.from({ length: 4 }, (_, index) => (
            <SkeletonPanel key={index} lines={2} />
          ))}
        </Card>
        <div className="workspace-skeleton-two-column">
          <SkeletonPanel lines={7} />
          <SkeletonPanel lines={7} />
        </div>
      </>
    );
  }
  if (kind === "finance") {
    return (
      <>
        <div className="workspace-skeleton-metric-grid workspace-skeleton-metric-grid-finance">
          {Array.from({ length: 4 }, (_, index) => (
            <SkeletonMetric key={index} />
          ))}
        </div>
        <div className="workspace-skeleton-two-column workspace-skeleton-finance-grid">
          <SkeletonTableBlock />
          <SkeletonPanel lines={7} />
        </div>
      </>
    );
  }
  return (
    <>
      <div className="workspace-skeleton-settings-grid">
        <SkeletonForm />
        <SkeletonForm />
        <SkeletonPanel lines={5} />
        <SkeletonPanel lines={5} />
      </div>
      <SkeletonPanel lines={4} />
    </>
  );
}

function CustomerSkeletonContent({ kind }: { kind: CustomerSkeletonKind }) {
  if (kind === "dashboard") {
    return (
      <>
        <div className="workspace-skeleton-metric-grid workspace-skeleton-customer-metrics">
          {Array.from({ length: 4 }, (_, index) => (
            <SkeletonMetric key={index} />
          ))}
        </div>
        <div className="workspace-skeleton-panel-grid">
          <SkeletonPanel lines={4} />
          <SkeletonPanel lines={5} />
        </div>
      </>
    );
  }
  if (kind === "list") {
    return (
      <>
        <SkeletonToolbar />
        <div className="workspace-skeleton-customer-list">
          {Array.from({ length: 4 }, (_, index) => (
            <Card className="workspace-skeleton-customer-row" aria-hidden="true" key={index}>
              <Skeleton className="skeleton-cover-small" />
              <div>
                <SkeletonText width="72%" />
                <SkeletonText width="48%" />
                <SkeletonText width="62%" />
              </div>
              <Skeleton className="skeleton-status" />
            </Card>
          ))}
        </div>
      </>
    );
  }
  if (kind === "detail") {
    return (
      <>
        <SkeletonPanel lines={5} />
        <SkeletonPanel lines={7} />
        <SkeletonPanel lines={3} />
      </>
    );
  }
  if (kind === "finance") {
    return (
      <>
        <SkeletonPanel className="workspace-skeleton-finance-hero" lines={4} />
        <SkeletonPanel lines={3} />
        <SkeletonPanel lines={5} />
      </>
    );
  }
  if (kind === "settings") {
    return <SkeletonForm />;
  }
  return (
    <div className="workspace-skeleton-customer-list">
      <SkeletonPanel lines={4} />
      <SkeletonPanel lines={4} />
    </div>
  );
}

function skeletonName(workspace: Workspace, kind: SkeletonConfig["kind"]) {
  return `${workspace.toUpperCase()}_${kind.replace("-", "_").toUpperCase()}_SKELETON`;
}

export function PageAwareSkeleton({ workspace, pathname: pathnameProp }: { workspace: Workspace; pathname?: string }) {
  const routePathname = usePathname() || "/";
  const pathname = pathnameProp || routePathname;
  const config = workspace === "admin" ? adminConfig(pathname) : customerConfig(pathname);
  return (
    <div
      className={`${workspace === "admin" ? "admin-page " : ""}page workspace-skeleton ${workspace}-workspace-skeleton${config.narrow ? " narrow-page" : ""}`}
      data-skeleton={skeletonName(workspace, config.kind)}
      aria-busy="true"
      aria-label="Menyiapkan ruang kerja BFG"
    >
      {workspace === "admin" ? (
        <>
          <PageHeader
            eyebrow={config.eyebrow}
            title={config.title}
            description={config.description}
            actions={<Skeleton className="skeleton-cta" />}
          />
          <div className="admin-workspace">
            <AdminNav preview />
            <div className="admin-content admin-operational-content">
              <AdminSkeletonContent kind={config.kind as AdminSkeletonKind} />
            </div>
          </div>
        </>
      ) : (
        <>
          <PageHeader eyebrow={config.eyebrow} title={config.title} description={config.description} />
          <div className="customer-skeleton-content">
            <CustomerSkeletonContent kind={config.kind as CustomerSkeletonKind} />
          </div>
        </>
      )}
    </div>
  );
}
