import { BrandLogo, BrandMascot } from "@/components/brand";
import { HomeQuickGuidance } from "@/components/home-quick-guidance";
import { HomeOnboarding } from "@/components/home-onboarding";
import { HowToOrderSteps } from "@/components/how-to-order";
import { JsonLd } from "@/components/json-ld";
import { LinkButton } from "@/components/ui";
import { SiteShell } from "@/components/site-shell";
import { WHATSAPP_CONTACT_URL } from "@/domain/whatsapp-handoff";
import { createHomepageStructuredData } from "@/lib/seo";

export default function HomePage() {
  return (
    <SiteShell>
      <JsonLd data={createHomepageStructuredData()} />
      <div className="page home-page">
        <section className="hero home-hero" aria-labelledby="home-title">
          <div className="hero-copy">
            <span className="eyebrow">Official website Blessing For Good</span>
            <h1 id="home-title" className="display">
              Specialist Children &amp; Collector Books
            </h1>
            <p className="lede">
              Kami mengkurasi children books, novel books, dan collector special edition pilihan untuk Blessfriends.
            </p>
            <div className="home-hero-actions" aria-label="Akses buku">
              <LinkButton href="/ready-stock" size="large">
                Lihat Ready Stock
              </LinkButton>
              <LinkButton href="/catalog" variant="secondary">
                Buka Secret Catalog <span aria-hidden="true">→</span>
              </LinkButton>
            </div>
          </div>
          <div className="home-journey" aria-labelledby="journey-title">
            <h2 id="journey-title" className="eyebrow">
              Perjalanan bukumu
            </h2>
            <ol className="hero-sequence">
              <li>
                <span className="hero-step-number">01</span>
                <div>
                  <strong>Temukan</strong>
                  <small>Pilih Ready Stock atau katalog pilihan.</small>
                </div>
              </li>
              <li>
                <span className="hero-step-number">02</span>
                <div>
                  <strong>Pesan</strong>
                  <small>Pilih buku, format, dan jumlah.</small>
                </div>
              </li>
              <li>
                <span className="hero-step-number">03</span>
                <div>
                  <strong>Ikuti</strong>
                  <small>Pantau tagihan sampai pengiriman.</small>
                </div>
              </li>
            </ol>
          </div>
        </section>

        <section className="section-block home-channel-section" aria-labelledby="home-channel-title">
          <aside className="home-hero-entry-note" aria-label="Informasi WhatsApp dan website BFG">
            <h2 id="home-channel-title">WhatsApp jadi ruang utama komunitas Blessfriends.</h2>
            <p>
              Dapatkan kurasi buku, informasi PO, dan update terbaru melalui WhatsApp Group BFG. Website digunakan untuk
              belanja, melihat pesanan, tagihan, dan tracking buku.
            </p>
            <a href="/how-to-order">Pelajari ketentuan PO buku di BFG →</a>
          </aside>
        </section>

        <section
          className="section-block order-section home-order-section"
          id="cara-order"
          aria-labelledby="order-title"
        >
          <div className="section-heading">
            <div>
              <span className="eyebrow">Cara pembelian</span>
              <h2 id="order-title">Cara Pembelian di Blessing For Good</h2>
            </div>
          </div>
          <HowToOrderSteps preview />
          <div className="home-order-footer">
            <span>Butuh detail dari akses sampai buku tiba?</span>
            <LinkButton href="/how-to-order" variant="tertiary">
              Lihat cara memesan <span aria-hidden="true">→</span>
            </LinkButton>
          </div>
        </section>

        <section className="section-block community-section" id="join-whatsapp" aria-labelledby="join-title">
          <div className="community-banner">
            <div className="community-copy">
              <span className="eyebrow">Komunitas BFG</span>
              <h2 id="join-title">Gabung WhatsApp Group Blessing For Good</h2>
              <p>
                Wajib bergabung sebelum menyelesaikan pendaftaran Blessfriend. Di WhatsApp Group BFG kami membagikan
                kurasi buku, informasi PO, dan update terbaru.
              </p>
              <LinkButton href={WHATSAPP_CONTACT_URL} target="_blank" rel="noopener noreferrer">
                Minta link WhatsApp Group
              </LinkButton>
            </div>
            <div className="community-art" aria-hidden="true">
              <BrandMascot variant="warm" className="community-mascot" />
            </div>
          </div>
        </section>

        <section className="section-block discovery-section" id="akses-buku" aria-labelledby="discovery-title">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Akses &amp; belanja</span>
              <h2 id="discovery-title">Akses buku untuk Blessfriends</h2>
            </div>
            <p>Pilih katalog sesuai aksesmu, lalu gunakan account Blessfriend untuk mengelola pesanan.</p>
          </div>
          <div className="home-access-grid">
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
                <p>
                  Katalog buku dari PO yang sedang berjalan. Access code Secret Catalog dibagikan melalui WhatsApp Group
                  BFG.
                </p>
              </div>
              <LinkButton href="/catalog" variant="secondary">
                Buka Secret Catalog
              </LinkButton>
            </article>

            <HomeOnboarding />

            <article className="discovery-card discovery-card-ready">
              <div>
                <h3>Ready Stock</h3>
                <p>Buku Ready Stock tersedia untuk dipesan langsung oleh Blessfriends melalui website.</p>
              </div>
              <LinkButton href="/ready-stock">Lihat Ready Stock</LinkButton>
            </article>
          </div>
        </section>

        <HomeQuickGuidance />

        <section className="section-block story-section" id="bfg-story" aria-labelledby="story-title">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Mengenal BFG</span>
              <h2 id="story-title">Satu cerita, beberapa langkah kecil.</h2>
            </div>
            <p>Geser untuk bertemu dengan alasan, orang, dan teman kecil di balik BFG.</p>
          </div>
          <div className="story-scroller" aria-label="Cerita Blessing For Good">
            <article className="story-card story-card-opening">
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
              <LinkButton href="/community" variant="tertiary">
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
