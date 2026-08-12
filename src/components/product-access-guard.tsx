"use client";

import { SignInButton, UserButton } from "@clerk/nextjs";
import type { ReactNode } from "react";
import { useProduct } from "@/domain/prototype/store";

export function ProductAccessGuard({
  children,
  requiredRole,
}: {
  children: ReactNode;
  requiredRole?: "admin" | "customer" | "owner";
}) {
  const { hydrated, dataSource, sessionRole, userStatus, authState } = useProduct();

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
      <div className="guard-card">
        <span className="eyebrow">Perlu masuk</span>
        <h1>Masuk untuk melanjutkan</h1>
        <p>Gunakan akun Blessfriends yang sudah diundang.</p>
        <SignInButton mode="redirect" withSignUp={false}>
          Masuk
        </SignInButton>
      </div>
    );
  }
  if (authState === "admission-required") {
    return (
      <div className="guard-card">
        <span className="eyebrow">Undangan diperlukan</span>
        <h1>Akses BFG belum dikonfirmasi</h1>
        <p>Akun hanya dapat digunakan setelah permintaan Blessfriends disetujui dan undangan diterima.</p>
        <UserButton />
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
  if (authState === "network-error") {
    return <div className="state-panel">Akses BFG belum dapat dikonfirmasi. Silakan coba lagi.</div>;
  }
  if (!hydrated || authState === "loading" || authState === "convex-loading" || authState === "provisioning") {
    return <div className="state-panel">Menyiapkan akun BFG…</div>;
  }
  const allowed =
    !requiredRole ||
    (requiredRole === "admin" && (sessionRole === "admin" || sessionRole === "owner")) ||
    (requiredRole === "owner" && sessionRole === "owner") ||
    (requiredRole === "customer" && sessionRole === "customer");
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
