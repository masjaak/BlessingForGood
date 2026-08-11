import { BrandMascot } from "@/components/brand";
import { Card, LinkButton } from "@/components/ui";
import { SiteShell } from "@/components/site-shell";

export default function HomePage() {
  return (
    <SiteShell>
      <div className="page">
        <section className="hero">
          <div className="hero-copy">
            <span className="eyebrow">Komunitas pembaca buku impor</span>
            <h1 className="display">Buku pilihan, dibawa pulang bersama.</h1>
            <p className="lede">
              Blessing For Goods membantu Blessfriends menemukan buku impor melalui Ready Stock dan Secret Catalog, lalu
              mengikuti pesanan sampai tiba.
            </p>
            <div className="actions">
              <LinkButton href="/ready-stock">Lihat Ready Stock</LinkButton>
              <LinkButton href="/catalog" variant="secondary">
                Buka Secret Catalog
              </LinkButton>
            </div>
            <div className="hero-support-links">
              <LinkButton href="/join" variant="quiet">
                Gabung Blessfriends
              </LinkButton>
              <LinkButton href="/how-to-order" variant="quiet">
                Cara memesan
              </LinkButton>
            </div>
          </div>
          <div className="hero-panel" aria-label="Cara memesan di Blessing For Goods">
            <div className="hero-panel-top">
              <div>
                <BrandMascot className="hero-mascot" priority />
                <span className="panel-label">Perjalanan bukumu</span>
              </div>
              <span className="status-badge status-positive">Untuk Blessfriends</span>
            </div>
            <div className="hero-sequence">
              <span>01</span>
              <strong>Temukan</strong>
              <small>Pilih Ready Stock atau katalog privat.</small>
              <span>02</span>
              <strong>Pesan</strong>
              <small>Pilih format, ISBN, dan jumlah dengan jelas.</small>
              <span>03</span>
              <strong>Ikuti</strong>
              <small>Pantau batch, invoice, pembayaran, dan pengiriman.</small>
            </div>
          </div>
        </section>

        <section className="section-block">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Mulai dari sini</span>
              <h2>Satu rumah untuk perjalanan buku pilihanmu.</h2>
            </div>
            <p>Dari katalog sampai buku diterima, setiap langkah penting tetap mudah ditemukan.</p>
          </div>
          <div className="feature-grid">
            <Card>
              <span className="card-kicker">Ready Stock</span>
              <h3>Buku yang sudah tersedia</h3>
              <p>Cari judul, format, harga, dan ketersediaan stok yang siap dipesan.</p>
              <LinkButton href="/ready-stock" variant="quiet">
                Lihat koleksi →
              </LinkButton>
            </Card>
            <Card>
              <span className="card-kicker">Secret Catalog</span>
              <h3>Preorder khusus komunitas</h3>
              <p>Gunakan kode akses untuk melihat katalog privat dan memilih format buku.</p>
              <LinkButton href="/catalog" variant="quiet">
                Masukkan kode →
              </LinkButton>
            </Card>
            <Card>
              <span className="card-kicker">Akun Blessfriends</span>
              <h3>Tidak perlu menebak status</h3>
              <p>Pesanan, tracking, invoice, deposit, dan masalah pesanan tersusun dalam satu akun.</p>
              <LinkButton href="/account" variant="quiet">
                Buka akun →
              </LinkButton>
            </Card>
          </div>
        </section>
      </div>
    </SiteShell>
  );
}
