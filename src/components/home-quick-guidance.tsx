import { LinkButton } from "@/components/ui";

export function HomeQuickGuidance() {
  return (
    <section className="section-block home-quick-guidance" aria-labelledby="home-quick-guidance-title">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Panduan singkat</span>
          <h2 id="home-quick-guidance-title">Sebelum mulai pesan</h2>
        </div>
      </div>
      <div className="home-quick-guidance-list">
        <details className="home-guidance-disclosure">
          <summary>
            <span>
              <strong>Cara pesan di BFG</strong>
              <small>Pahami alur pemesanan, invoice, pembayaran, dan tracking buku.</small>
            </span>
            <span className="home-guidance-summary-icon" aria-hidden="true">
              +
            </span>
          </summary>
          <div className="home-guidance-disclosure-content">
            <LinkButton href="/how-to-order" variant="secondary">
              Lihat cara pesan
            </LinkButton>
          </div>
        </details>
        <details className="home-guidance-disclosure">
          <summary>
            <span>
              <strong>Lihat PO yang sedang berjalan</strong>
              <small>Secret Catalog berisi pilihan buku dari PO yang sedang dibuka.</small>
            </span>
            <span className="home-guidance-summary-icon" aria-hidden="true">
              +
            </span>
          </summary>
          <div className="home-guidance-disclosure-content">
            <p>Access code dibagikan melalui WhatsApp Group BFG.</p>
            <LinkButton href="/catalog" variant="secondary">
              Buka Secret Catalog
            </LinkButton>
          </div>
        </details>
      </div>
    </section>
  );
}
