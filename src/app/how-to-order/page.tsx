import { BrandMascot } from "@/components/brand";
import { HowToOrderPageHeading } from "@/components/how-to-order-page-heading";
import { HowToOrderSteps, HowToOrderVideoGuide } from "@/components/how-to-order";
import { Card, LinkButton } from "@/components/ui";
import { SiteShell } from "@/components/site-shell";

function configuredVideoUrl() {
  const value = process.env.BFG_TUTORIAL_VIDEO_URL?.trim();
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export default function HowToOrderPage() {
  return (
    <SiteShell>
      <div className="page how-to-order-page">
        <HowToOrderPageHeading />
        <HowToOrderSteps />
        <Card className="notice-card how-to-order-policy-note">
          <span className="card-kicker">Jika ada OOS atau defect</span>
          <p>
            Jika ada buku OOS atau ditemukan defect setelah proses pengecekan BFG, Admin akan menginformasikan
            penyelesaian dan refund yang berlaku sesuai kondisi pesanan.
          </p>
        </Card>
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
        <HowToOrderVideoGuide url={configuredVideoUrl()} />
      </div>
    </SiteShell>
  );
}
