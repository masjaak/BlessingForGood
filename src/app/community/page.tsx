import { BrandMascot } from "@/components/brand";
import { Card, LinkButton } from "@/components/ui";
import { SiteShell } from "@/components/site-shell";

export default function CommunityPage() {
  return (
    <SiteShell>
      <div className="page narrow-page">
        <header className="page-header">
          <div>
            <span className="eyebrow">Komunitas Blessfriends</span>
            <h1>Menemukan buku terasa lebih hangat saat dijalani bersama.</h1>
            <p className="lede">
              BFG mempertemukan pembaca dengan buku impor pilihan melalui komunitas, katalog privat, dan alur pemesanan
              yang jelas.
            </p>
          </div>
        </header>
        <div className="content-stack">
          <Card className="accent-card communication-card">
            <BrandMascot variant="warm" className="guide-mascot" />
            <span className="card-kicker">Selamat datang</span>
            <h2>Halo, Blessfriend.</h2>
            <p>
              Kamu bisa melihat Ready Stock kapan saja. Untuk preorder privat, gunakan kode Secret Catalog yang
              dibagikan BFG.
            </p>
          </Card>
          <div className="two-column">
            <Card>
              <span className="card-kicker">Temukan</span>
              <h2>Pilihan yang terkurasi</h2>
              <p>Lihat format, ISBN, harga, dan ketersediaan sebelum menentukan buku.</p>
            </Card>
            <Card>
              <span className="card-kicker">Ikuti</span>
              <h2>Perjalanan yang transparan</h2>
              <p>Pantau pesanan, batch, pelunasan, dan pengiriman dari akunmu sendiri.</p>
            </Card>
          </div>
          <div className="actions">
            <LinkButton href="/join">Gabung Blessfriends</LinkButton>
            <LinkButton href="/how-to-order" variant="secondary">
              Pelajari cara memesan
            </LinkButton>
          </div>
        </div>
      </div>
    </SiteShell>
  );
}
