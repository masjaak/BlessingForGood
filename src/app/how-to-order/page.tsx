import { BrandMascot } from "@/components/brand";
import { Card, LinkButton } from "@/components/ui";
import { SiteShell } from "@/components/site-shell";

const steps = [
  ["01", "Pilih jalur belanja", "Cari buku yang tersedia di Ready Stock atau buka Secret Catalog dengan kode akses."],
  ["02", "Pilih buku dan format", "Periksa format, ISBN, harga, ketersediaan, lalu tentukan jumlah."],
  ["03", "Catat pesanan", "Tinjau detail pesanan. BFG menyimpan pilihan dan harga saat pesanan dibuat."],
  [
    "04",
    "Ikuti prosesnya",
    "Pantau batch, perjalanan kiriman, fulfillment, invoice, deposit, dan pembayaran dari akunmu.",
  ],
  [
    "05",
    "Selesaikan bila perlu",
    "Kirim konfirmasi pembayaran atau ajukan pembatalan saat sistem mengizinkan untuk ditinjau admin.",
  ],
];

export default function HowToOrderPage() {
  return (
    <SiteShell>
      <div className="page narrow-page">
        <header className="page-header">
          <div>
            <span className="eyebrow">Cara memesan</span>
            <h1>Dari memilih buku sampai tiba di tanganmu.</h1>
            <p className="lede">
              Setiap tahap penting tercatat agar kamu tahu apa yang sedang berjalan dan apa yang perlu dilakukan.
            </p>
          </div>
        </header>
        <div className="step-list">
          {steps.map(([number, title, description]) => (
            <Card key={number} className="step-card">
              <span className="step-number">{number}</span>
              <div>
                <h2>{title}</h2>
                <p>{description}</p>
              </div>
            </Card>
          ))}
        </div>
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
