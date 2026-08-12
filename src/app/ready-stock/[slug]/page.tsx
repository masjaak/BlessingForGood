"use client";

import { useParams } from "next/navigation";
import { ReadyStockDetail } from "@/components/ready-stock-detail";
import { BackButton } from "@/components/back-button";
import { SiteShell } from "@/components/site-shell";

export default function ReadyStockDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  return (
    <SiteShell>
      <div className="route-with-back">
        <BackButton fallback="/ready-stock" />
        <ReadyStockDetail slug={slug} />
      </div>
    </SiteShell>
  );
}
