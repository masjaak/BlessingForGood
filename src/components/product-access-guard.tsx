"use client";

import { UserButton } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { PageAwareSkeleton } from "@/components/page-aware-skeleton";
import { Button, ErrorState, LinkButton } from "@/components/ui";
import { roleCanAccess } from "@/domain/prototype/session";
import { useProduct } from "@/domain/prototype/store";

export function ProductAccessGuard({
  children,
  requiredRole,
  signedOutContent,
}: {
  children: ReactNode;
  requiredRole?: "admin" | "customer" | "owner";
  signedOutContent?: ReactNode;
}) {
  const { hydrated, dataSource, sessionRole, userStatus, authState, retryAuth } = useProduct();
  const pathname = usePathname() || "/";

  if (dataSource === "unavailable" || authState === "configuration-missing") {
    return (
      <div className="guard-card">
        <span className="eyebrow">Layanan belum tersedia</span>
        <h1>BFG belum terhubung ke layanan data</h1>
        <p>Silakan coba lagi setelah konfigurasi layanan selesai.</p>
      </div>
    );
  }
  if (authState === "signed-out") {
    return (
      signedOutContent || (
        <div className="guard-card">
          <span className="eyebrow">Akun Blessfriend</span>
          <h1>Masuk lewat Akun untuk melihat bagian ini.</h1>
          <p>Pesanan, invoice, dan aktivitasmu hanya tampil setelah kamu masuk.</p>
          <a className="button button-primary" href="/account">
            Ke Akun
          </a>
        </div>
      )
    );
  }
  if (authState === "admission-required") {
    return (
      <div className="guard-card">
        <span className="eyebrow">Akun belum aktif</span>
        <h1>Akun ini belum menjadi Blessfriend.</h1>
        <p>Untuk membuka Buku Saya, Tagihan, dan Akun, kirim permintaan bergabung terlebih dahulu.</p>
        <div className="actions">
          <LinkButton href="/join">Gabung Blessfriends</LinkButton>
          <UserButton />
        </div>
      </div>
    );
  }
  if (authState === "suspended" || userStatus === "suspended") {
    return (
      <div className="guard-card">
        <span className="eyebrow">Akun ditangguhkan</span>
        <h1>Akses akun tidak tersedia</h1>
        <p>Hubungi admin BFG jika kamu membutuhkan bantuan.</p>
        <UserButton />
      </div>
    );
  }
  if (authState === "convex-error" || authState === "network-error") {
    return (
      <ErrorState
        title="Sesi BFG belum siap."
        description="Kami belum dapat mengonfirmasi sesi akunmu. Coba lagi sebentar lagi."
        action={<Button onClick={retryAuth}>Coba lagi</Button>}
      />
    );
  }
  if (!hydrated || authState === "loading" || authState === "convex-loading" || authState === "provisioning") {
    return <PageAwareSkeleton workspace={pathname.startsWith("/admin") ? "admin" : "customer"} pathname={pathname} />;
  }
  const allowed = !requiredRole || roleCanAccess(sessionRole, requiredRole);
  if (!allowed) {
    return (
      <div className="guard-card">
        <span className="eyebrow">Akses ditolak</span>
        <h1>Halaman ini tidak tersedia untuk akunmu</h1>
        <p>Peran akun BFG-mu tidak memiliki izin untuk membuka halaman ini.</p>
      </div>
    );
  }
  return children;
}
