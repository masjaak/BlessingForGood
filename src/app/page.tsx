import Link from "next/link";
import { BrandLogo, BrandMascot } from "@/components/brand";
import { HomeOnboarding } from "@/components/home-onboarding";
import { HowToOrderSteps } from "@/components/how-to-order";
import { JsonLd } from "@/components/json-ld";
import { LinkButton } from "@/components/ui";
import { SiteShell } from "@/components/site-shell";
import { WHATSAPP_CONTACT_URL } from "@/domain/whatsapp-handoff";
import { createHomepageStructuredData } from "@/lib/seo";

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

export default function HomePage() {
  return (
    <SiteShell>
      <JsonLd data={createHomepageStructuredData()} />
      <div className="page home-page">
        <section className="hero home-hero" aria-labelledby="home-title">
          <div className="hero-copy">
            <span className="eyebrow">official website blessing for good</span>
            <h1 id="home-title" className="display">
              SPECIALIST CHILDREN &amp; COLLECTOR BOOKS 📚
            </h1>
            <p className="lede">kami mengkurasi buku-buku children books, novel books dan collector special edition</p>
            <div className="home-hero-actions" aria-label="Akses buku">
              <LinkButton href="/ready-stock" size="large">
                Lihat Ready Stock
              </LinkButton>
              <LinkButton href="/catalog" variant="secondary">
                Buka Secret Catalog <span aria-hidden="true">→</span>
              </LinkButton>
            </div>
            <aside className="home-hero-entry-note" aria-label="Cara mulai bersama BFG">
              <span className="eyebrow">Baru di BFG?</span>
              <p>
                WhatsApp sebagai media utama kami, website sebagai tempat untuk belanja para Blessfriends menjadi
                pengalaman yang menyenangkan
              </p>
              <Link href="/how-to-order">pelajari ketentuan PO buku di kami</Link>
            </aside>
          </div>
          <div className="home-journey" aria-labelledby="journey-title">
            <h2 id="journey-title" className="eyebrow">
              cara pembelian di Blessing for good
            </h2>
            <ol className="hero-sequence">
              <li>
                <span className="hero-step-number">01</span>
                <div>
                  <strong>gabung ke whatsapp group</strong>
                  <small>
                    agar kami lebih mudah reachout customer, kami mewajibkan customer kami bergabung di WA group
                  </small>
                </div>
              </li>
              <li>
                <span className="hero-step-number">02</span>
                <div>
                  <strong>buat account di website kami</strong>
                  <small>untuk memantau pesanan buku, check buku PO berjalan &amp; melakukan pemesanan</small>
                </div>
              </li>
              <li>
                <span className="hero-step-number">03</span>
                <div>
                  <strong>pilih buku yang ingin dibeli</strong>
                  <small>bisa melakukan pembelian via website / fix langsung di WA group kami</small>
                </div>
              </li>
            </ol>
          </div>
        </section>

        <section className="section-block discovery-section" id="akses-buku">
          <div className="home-access-grid">
            <article
              className="discovery-card discovery-card-whatsapp"
              id="join-whatsapp"
              data-testid="join-whatsapp"
              aria-labelledby="join-title"
            >
              <div className="community-copy">
                <span className="eyebrow">GABUNG WHATSAPP GROUP</span>
                <h3 id="join-title">BLESSING FOR GOOD</h3>
                <p>
                  wajib join sebelum daftar account website, kami akan menurunkan kurasi buku2 kami disana setiap hari
                </p>
                <LinkButton href={WHATSAPP_CONTACT_URL} target="_blank" rel="noopener noreferrer">
                  Minta link WhatsApp Group
                </LinkButton>
              </div>
              <div className="community-art" aria-hidden="true">
                <BrandMascot variant="warm" className="community-mascot" />
              </div>
            </article>

            <article className="discovery-card discovery-card-secret" data-testid="secret-catalog">
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
                <p>katalog buku PO berjalan, akses code secret akan diberikan di whatsapp group</p>
              </div>
              <LinkButton href="/catalog" variant="secondary">
                Buka Secret Catalog
              </LinkButton>
            </article>

            <article className="discovery-card discovery-card-ready" data-testid="ready-stock">
              <div>
                <h3>Ready Stock</h3>
                <p>
                  buku yang readystock di blessing for good, bisa langsung di checkout setelah bergabung menjadi
                  Blessfriends
                </p>
              </div>
              <LinkButton href="/ready-stock">Lihat Ready Stock</LinkButton>
            </article>

            <HomeOnboarding tutorialVideoUrl={configuredVideoUrl()} />
          </div>
        </section>

        <section
          className="section-block order-section home-order-section"
          id="cara-order"
          aria-labelledby="order-title"
        >
          <div className="section-heading">
            <div>
              <span className="eyebrow">Cara memesan</span>
              <h2 id="order-title">Pesan dengan alur yang jelas.</h2>
              <p>Kenali tiga momen utamanya sebelum masuk ke panduan lengkap.</p>
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
