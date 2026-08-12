import { BrandLogo, BrandMascot } from "@/components/brand";
import { HowToOrderSteps } from "@/components/how-to-order";
import { LinkButton } from "@/components/ui";
import { SiteShell } from "@/components/site-shell";

export default function HomePage() {
  return (
    <SiteShell>
      <div className="page home-page">
        <section className="hero home-hero" aria-labelledby="home-title">
          <div className="hero-copy">
            <span className="eyebrow">Rumah buku pilihan untuk Blessfriends</span>
            <h1 id="home-title" className="display">
              Semua bisa dimulai dari satu buku yang tepat.
            </h1>
            <p className="lede">
              BFG membantu Blessfriends menemukan bacaan yang bisa menumbuhkan rasa ingin tahu, imajinasi, dan kebiasaan
              baik—sedikit demi sedikit.
            </p>
          </div>
          <div className="hero-panel" aria-label="Perjalanan buku di Blessing For Goods">
            <div className="hero-panel-top">
              <div>
                <BrandMascot className="hero-mascot" priority />
                <span className="panel-label">Perjalanan bukumu</span>
              </div>
              <span className="status-badge status-positive">Untuk Blessfriends</span>
            </div>
            <ol className="hero-sequence">
              <li>
                <span>01</span>
                <div>
                  <strong>Temukan</strong>
                  <small>Pilih Ready Stock atau katalog privat.</small>
                </div>
              </li>
              <li>
                <span>02</span>
                <div>
                  <strong>Pesan</strong>
                  <small>Pilih format, ISBN, dan jumlah dengan jelas.</small>
                </div>
              </li>
              <li>
                <span>03</span>
                <div>
                  <strong>Ikuti</strong>
                  <small>Pantau batch, invoice, pembayaran, dan pengiriman.</small>
                </div>
              </li>
            </ol>
          </div>
        </section>

        <section className="section-block discovery-section" id="book-discovery" aria-labelledby="discovery-title">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Book discovery</span>
              <h2 id="discovery-title">Mulai dari buku yang ingin kamu temukan.</h2>
            </div>
            <p>Ruang pertama untuk menjelajah: pilihan yang sudah tersedia atau katalog privat sesuai aksesmu.</p>
          </div>
          <div className="discovery-grid">
            <article className="discovery-card discovery-card-ready">
              <div>
                <span className="eyebrow">Pilihan utama</span>
                <h3>Ready Stock</h3>
                <p>Buku yang sudah tersedia untuk langsung kamu lihat dan pesan dengan alur yang jelas.</p>
              </div>
              <LinkButton href="/ready-stock">Lihat Ready Stock</LinkButton>
            </article>
            <article className="discovery-card discovery-card-secret">
              <div className="discovery-card-heading">
                <span className="discovery-lock" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none">
                    <rect x="5" y="10" width="14" height="10" rx="2" />
                    <path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v2" />
                  </svg>
                </span>
                <span className="eyebrow">Akses privat</span>
              </div>
              <div>
                <h3>Secret Catalog</h3>
                <p>Masukkan kode akses untuk membuka pilihan buku privat Blessfriends.</p>
              </div>
              <LinkButton href="/catalog" variant="secondary">
                Buka Secret Catalog
              </LinkButton>
            </article>
          </div>
        </section>

        <section className="section-block community-section" id="join-blessfriends" aria-labelledby="join-title">
          <div className="community-banner">
            <div className="community-copy">
              <span className="eyebrow">Komunitas BFG</span>
              <h2 id="join-title">Gabung Blessfriends</h2>
              <p>
                Cari rekomendasi buku bareng orang tua dan pembaca lain yang sama-sama penasaran menemukan bacaan bagus.
              </p>
              <LinkButton href="/join">Gabung sekarang</LinkButton>
            </div>
            <div className="community-art" aria-hidden="true">
              <BrandMascot variant="warm" className="community-mascot" />
            </div>
          </div>
        </section>

        <section
          className="section-block order-section home-order-section"
          id="cara-order"
          aria-labelledby="order-title"
        >
          <div className="section-heading">
            <div>
              <span className="eyebrow">How to order</span>
              <h2 id="order-title">Pesan dengan alur yang jelas.</h2>
              <p>Kenali tiga momen utamanya sebelum masuk ke panduan lengkap.</p>
            </div>
          </div>
          <HowToOrderSteps preview />
          <div className="home-order-footer">
            <span>Butuh detail dari akses sampai buku tiba?</span>
            <LinkButton href="/how-to-order" variant="quiet">
              Lihat cara memesan <span aria-hidden="true">→</span>
            </LinkButton>
          </div>
        </section>

        <section className="section-block story-section" id="bfg-story" aria-labelledby="story-title">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Mengenal BFG</span>
              <h2 id="story-title">Satu cerita, beberapa langkah kecil.</h2>
            </div>
            <p>Geser untuk bertemu dengan alasan, orang, dan teman kecil di balik BFG.</p>
          </div>
          <div className="story-scroller" aria-label="Cerita Blessing For Goods">
            <article className="story-card">
              <span className="eyebrow">Kenapa BFG ada?</span>
              <h3>Semua bisa dimulai dari satu buku.</h3>
              <p>
                Kami percaya buku yang tepat bisa menumbuhkan rasa ingin tahu, imajinasi, dan kebiasaan baik sejak
                kecil. BFG hadir untuk membantu Blessfriends menemukan bacaan yang layak dibawa pulang.
              </p>
            </article>
            <article className="story-card story-card-team">
              <span className="eyebrow">Di balik BFG</span>
              <h3>Tim kecil, banyak buku.</h3>
              <p>
                Madina, Angelina, Hany, Ayun, dan Minca ikut menjaga kurasi, pesanan, dan perjalanan setiap batch agar
                lebih mudah untuk Blessfriends.
              </p>
              <LinkButton href="/community" variant="quiet">
                Kenali komunitas →
              </LinkButton>
            </article>
            <article className="story-card story-card-logo">
              <span className="eyebrow">Logo yang tumbuh</span>
              <BrandLogo variant="primary" linkToHome={false} className="story-logo-image" />
              <h3>Buku, tunas, dan bintang.</h3>
              <p>
                Buku adalah awal cerita. Tunas kita rawat sedikit demi sedikit. Bintang mengingatkan setiap anak punya
                jalannya sendiri untuk bersinar.
              </p>
            </article>
            <article className="story-card story-card-blessy">
              <div className="story-card-blessy-top">
                <div className="story-card-blessy-copy">
                  <span className="eyebrow">Kenalan sama Blessy</span>
                  <h3>Teman kecil yang ikut tumbuh.</h3>
                </div>
                <div className="story-card-blessy-mascot">
                  <BrandMascot variant="warm" className="story-mascot" />
                </div>
              </div>
              <p>
                Setiap cerita yang dibuka membuat Blessy ikut tumbuh bersama Blessfriends—lewat buku, imajinasi, dan
                pengalaman baru.
              </p>
            </article>
            <article className="story-card story-card-closing">
              <span className="eyebrow">Untuk perjalananmu</span>
              <h3>Satu buku. Satu cerita. Satu langkah kecil untuk tumbuh.</h3>
              <p>Selamat datang di rumah buku pilihan BFG.</p>
            </article>
          </div>
        </section>
      </div>
    </SiteShell>
  );
}
