import { BrandLogo, BrandMascot } from "@/components/brand";
import { Card, LinkButton } from "@/components/ui";
import { SiteShell } from "@/components/site-shell";

const orderSteps = [
  ["Temukan bukunya", "Lihat Ready Stock atau katalog privat yang sudah kamu buka."],
  ["Pilih yang tersedia", "Bandingkan format, ISBN, harga, dan pilihan yang masih bisa dipesan."],
  ["Kirim pesanan", "Isi detail yang diperlukan, lalu kirim pesanan dari akunmu."],
  ["BFG proses dalam batch", "Kami merapikan pesanan dan mengabarkan tahap berikutnya."],
  ["Pantau perjalanannya", "Lihat pembaruan pesanan, tracking, invoice, dan pembayaran."],
  ["Buku sampai", "Setelah proses selesai, buku pilihanmu melanjutkan perjalanan ke rumah."],
];

export default function HomePage() {
  return (
    <SiteShell>
      <div className="page home-page">
        <section className="hero" aria-labelledby="home-title">
          <div className="hero-copy">
            <span className="eyebrow">Mengenal lebih dekat Blessing For Goods</span>
            <h1 id="home-title" className="display">
              Semua bisa dimulai dari satu buku yang tepat.
            </h1>
            <p className="lede">
              BFG membantu Blessfriends menemukan bacaan yang bisa menumbuhkan rasa ingin tahu, imajinasi, dan kebiasaan
              baik—sedikit demi sedikit.
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
              <LinkButton href="#cara-order" variant="quiet">
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

        <section className="section-block quick-path-section" aria-labelledby="quick-path-title">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Mulai dari sini</span>
              <h2 id="quick-path-title">Kenalan dulu, lalu pilih langkahmu.</h2>
            </div>
            <p>Tiga pintu kecil untuk memahami BFG dan mulai ikut dalam perjalanan buku pilihan.</p>
          </div>
          <div className="quick-path-grid">
            <a className="quick-path-card" href="#bfg-story">
              <span className="quick-path-number">01</span>
              <h3>Kenalan dengan BFG</h3>
              <p>Cerita singkat tentang kami, logo, dan Blessy.</p>
              <span className="quick-path-action">
                Kenalan <span aria-hidden="true">→</span>
              </span>
            </a>
            <a className="quick-path-card" href="#cara-order">
              <span className="quick-path-number">02</span>
              <h3>Cara order</h3>
              <p>Dari pilih buku sampai pesanan tiba.</p>
              <span className="quick-path-action">
                Lihat caranya <span aria-hidden="true">→</span>
              </span>
            </a>
            <a className="quick-path-card" href="#join-blessfriends">
              <span className="quick-path-number">03</span>
              <h3>Join Blessfriends</h3>
              <p>Isi data singkat lalu lanjut ke komunitas.</p>
              <span className="quick-path-action">
                Gabung <span aria-hidden="true">→</span>
              </span>
            </a>
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
              <div className="story-card-visual">
                <BrandMascot variant="warm" className="story-mascot" />
              </div>
              <span className="eyebrow">Kenalan sama Blessy</span>
              <h3>Teman kecil yang ikut tumbuh.</h3>
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

        <section className="section-block order-section" id="cara-order" aria-labelledby="order-title">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Bagaimana cara order?</span>
              <h2 id="order-title">Dari pilih buku sampai buku tiba.</h2>
            </div>
            <LinkButton href="/how-to-order" variant="quiet">
              Lihat panduan lengkap →
            </LinkButton>
          </div>
          <div className="order-steps">
            {orderSteps.map(([title, description], index) => (
              <div className="order-step" key={title}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <h3>{title}</h3>
                  <p>{description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="section-block join-section" id="join-blessfriends" aria-labelledby="join-title">
          <Card className="join-home-card">
            <div>
              <span className="eyebrow">Join Blessfriends</span>
              <h2 id="join-title">Mau ikut menemukan buku bersama?</h2>
              <p>
                Isi data singkat, ceritakan minat bukumu, lalu lanjutkan ke komunitas setelah permintaanmu diterima.
              </p>
            </div>
            <LinkButton href="/join">Gabung Blessfriends</LinkButton>
          </Card>
        </section>
      </div>
    </SiteShell>
  );
}
