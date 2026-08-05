import { BrandMascot } from "@/components/brand";
import { LinkButton, Card } from "@/components/ui";
import { SiteShell } from "@/components/site-shell";

export default function CommunityPage() {
  return (
    <SiteShell>
      <div className="page narrow-page">
        <header className="page-header">
          <div>
            <span className="eyebrow">The Blessfriends guide</span>
            <h1>Books are better when the journey is shared.</h1>
            <p className="lede">
              Blessing For Goods is built around a community of readers who discover imported books together.
            </p>
          </div>
        </header>
        <div className="content-stack">
          <Card className="accent-card">
            <BrandMascot variant="warm" className="guide-mascot" />
            <span className="card-kicker">Community foundation</span>
            <h2>Welcome, Blessfriend.</h2>
            <p>
              This prototype keeps the public experience clear: understand the community, learn the order rhythm, then
              enter a catalog when you have its access code.
            </p>
          </Card>
          <div className="two-column">
            <Card>
              <span className="card-kicker">01 · Context</span>
              <h2>Find your way in</h2>
              <p>
                Public information stays open and useful. Private catalog access is a separate step for invited buyers.
              </p>
            </Card>
            <Card>
              <span className="card-kicker">02 · Clarity</span>
              <h2>Keep the details together</h2>
              <p>
                Each book format can carry its own ISBN, price, availability, and quantity. The order keeps a snapshot
                of what was selected.
              </p>
            </Card>
          </div>
          <div className="actions">
            <LinkButton href="/how-to-order">How to order</LinkButton>
            <LinkButton href="/catalog" variant="secondary">
              Enter a catalog
            </LinkButton>
          </div>
        </div>
      </div>
    </SiteShell>
  );
}
