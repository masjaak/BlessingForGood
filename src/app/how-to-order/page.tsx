"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { BrandMascot } from "@/components/brand";
import { HowToOrderSteps } from "@/components/how-to-order";
import { Card, LinkButton } from "@/components/ui";
import { SiteShell } from "@/components/site-shell";

export default function HowToOrderPage() {
  const content = useQuery(api.contentBlocks.getPublished, { key: "how_to_order" });
  return (
    <SiteShell>
      <div className="page how-to-order-page">
        <header className="page-header">
          <div>
            <span className="eyebrow">{content?.eyebrow || "Cara memesan"}</span>
            <h1>{content?.title || "Dari memilih buku sampai tiba di tanganmu."}</h1>
            <p className="lede">
              {content?.body ||
                "Setiap tahap penting tercatat agar kamu tahu apa yang sedang berjalan dan apa yang perlu dilakukan."}
            </p>
          </div>
        </header>
        <HowToOrderSteps />
        <Card className="notice-card communication-card">
          <BrandMascot variant="warm" className="guide-mascot" />
          <span className="card-kicker">Butuh bantuan?</span>
          <h2>BFG tetap mendampingi lewat WhatsApp.</h2>
          <p>Website menjadi catatan utama pesananmu; WhatsApp tetap tersedia untuk konfirmasi dan bantuan.</p>
        </Card>
        <div className="actions">
          <LinkButton href="/catalog">Buka Secret Catalog</LinkButton>
          <LinkButton href="/ready-stock" variant="secondary">
            Lihat Ready Stock
          </LinkButton>
        </div>
      </div>
    </SiteShell>
  );
}
