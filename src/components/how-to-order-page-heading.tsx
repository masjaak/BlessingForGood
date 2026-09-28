"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { isValidBackendUrl } from "@/lib/environment";

type PublishedContent = { eyebrow: string; title: string; body: string } | null | undefined;

function Heading({ content }: { content: PublishedContent }) {
  return (
    <header className="page-header">
      <div>
        <span className="eyebrow">{content?.eyebrow || "Ketentuan order di BFG"}</span>
        <h1>{content?.title || "Dari memilih buku sampai tiba di tanganmu."}</h1>
        <p className="lede">
          {content?.body || "Harap baca ketentuan order agar Blessfriends memahami proses pembelian di BFG."}
        </p>
      </div>
    </header>
  );
}

function PublishedHeading() {
  const content = useQuery(api.contentBlocks.getPublished, { key: "how_to_order" });
  return <Heading content={content} />;
}

export function HowToOrderPageHeading() {
  return isValidBackendUrl(process.env.NEXT_PUBLIC_CONVEX_URL) ? <PublishedHeading /> : <Heading content={null} />;
}
