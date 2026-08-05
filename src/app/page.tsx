import { LinkButton, Card } from "@/components/ui";
import { SiteShell } from "@/components/site-shell";

export default function HomePage() {
  return (
    <SiteShell>
      <div className="page">
        <section className="hero">
          <div className="hero-copy">
            <span className="eyebrow">Blessing For Goods · Prototype v0.1</span>
            <h1 className="display">Books worth bringing home, together.</h1>
            <p className="lede">
              Blessing For Goods is a community-led imported bookstore for Blessfriends. Browse the public guide, unlock
              a private catalog, and place a preorder with a clear next step.
            </p>
            <div className="actions">
              <LinkButton href="/catalog">Unlock a catalog</LinkButton>
              <LinkButton href="/community" variant="secondary">
                Meet the community
              </LinkButton>
            </div>
            <p className="microcopy">Prototype boundary: this workspace starts empty and records no business data.</p>
          </div>
          <div className="hero-panel" aria-label="Prototype focus">
            <div className="hero-panel-top">
              <span className="panel-label">The first slice</span>
              <span className="status-badge status-positive">Ready to explore</span>
            </div>
            <div className="hero-sequence">
              <span>01</span>
              <strong>Unlock</strong>
              <small>Use a catalog access code.</small>
              <span>02</span>
              <strong>Choose</strong>
              <small>Select a format and quantity.</small>
              <span>03</span>
              <strong>Follow through</strong>
              <small>Review the preorder and its status.</small>
            </div>
          </div>
        </section>

        <section className="section-block">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Start here</span>
              <h2>A calmer path from curiosity to order.</h2>
            </div>
            <p>Everything visible here is a foundation for the functional prototype, not a production promise.</p>
          </div>
          <div className="feature-grid">
            <Card>
              <span className="card-kicker">Community</span>
              <h3>Know the rhythm</h3>
              <p>Read the community guide and ordering principles before entering a catalog.</p>
              <LinkButton href="/community" variant="quiet">
                Read the guide →
              </LinkButton>
            </Card>
            <Card>
              <span className="card-kicker">Catalog</span>
              <h3>See the right details</h3>
              <p>Format, ISBN, quantity, and price stay together when a preorder is reviewed.</p>
              <LinkButton href="/catalog" variant="quiet">
                Open access →
              </LinkButton>
            </Card>
            <Card>
              <span className="card-kicker">Operations</span>
              <h3>Stay in the loop</h3>
              <p>Once an order exists, its operational stage is visible in one timeline.</p>
              <LinkButton href="/account/orders" variant="quiet">
                View orders →
              </LinkButton>
            </Card>
          </div>
        </section>
      </div>
    </SiteShell>
  );
}
