"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { BrandMascot } from "@/components/brand";
import { Card, LinkButton, PageHeader } from "@/components/ui";
import { SiteShell } from "@/components/site-shell";
import { useProduct } from "@/domain/prototype/store";

function LiveHelpPageHeader() {
  const content = useQuery(api.contentBlocks.getPublished, { key: "help" });
  return (
    <PageHeader
      eyebrow={content?.eyebrow || "Bantuan BFG"}
      title={content?.title || "Mulai dari informasi yang sudah kamu punya."}
      description={content?.body || "Temukan jalur cepat untuk katalog, pesanan, akun, dan bantuan dari admin BFG."}
    />
  );
}

export default function HelpPage() {
  const { dataSource } = useProduct();
  return (
    <SiteShell>
      <div className="page narrow-page">
        {dataSource === "convex" ? (
          <LiveHelpPageHeader />
        ) : (
          <PageHeader
            eyebrow="Bantuan BFG"
            title="Mulai dari informasi yang sudah kamu punya."
            description="Temukan jalur cepat untuk katalog, pesanan, akun, dan bantuan dari admin BFG."
          />
        )}
        <div className="content-stack">
          <Card className="communication-card">
            <BrandMascot variant="warm" className="guide-mascot" />
            <span className="card-kicker">Akses katalog</span>
            <h2>Kode Secret Catalog berbeda dari kata sandi akun.</h2>
            <p>Gunakan kode yang dibagikan BFG untuk membuka katalog privat yang sesuai.</p>
          </Card>
          <Card>
            <span className="card-kicker">Status pesanan</span>
            <h2>Perjalanan bukumu tersimpan di akun.</h2>
            <p>Lihat pesanan, batch, pengiriman, invoice, pembayaran, dan masalah pesanan dari halaman akunmu.</p>
          </Card>
          <Card>
            <span className="card-kicker">Butuh bantuan lain?</span>
            <h2>Hubungi admin BFG dengan detail pesananmu.</h2>
            <p>Sertakan nomor pesanan atau invoice agar admin dapat membantu lebih cepat.</p>
          </Card>
          <div className="actions">
            <LinkButton href="/how-to-order">Baca cara memesan</LinkButton>
            <LinkButton href="/" variant="secondary">
              Kembali ke beranda
            </LinkButton>
          </div>
        </div>
      </div>
    </SiteShell>
  );
}
