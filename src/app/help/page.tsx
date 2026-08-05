import { Card, LinkButton, PageHeader } from "@/components/ui";
import { SiteShell } from "@/components/site-shell";

export default function HelpPage() {
  return (
    <SiteShell>
      <div className="page narrow-page">
        <PageHeader
          eyebrow="Help foundation"
          title="Start with the detail you already have."
          description="This prototype keeps help concise while production support content is still being shaped."
        />
        <div className="content-stack">
          <Card>
            <span className="card-kicker">Access</span>
            <h2>Catalog access is separate.</h2>
            <p>A catalog access code unlocks one private catalog. It is not a customer account password.</p>
          </Card>
          <Card>
            <span className="card-kicker">Order record</span>
            <h2>The website keeps the order.</h2>
            <p>
              WhatsApp is available for confirmation and follow-up, while the recorded order and its status stay in the
              website flow.
            </p>
          </Card>
          <Card>
            <span className="card-kicker">Still in review</span>
            <h2>Some rules are intentionally not guessed.</h2>
            <p>
              Refund behavior, final account policy, and production payment handling require approved product decisions
              before they become customer promises.
            </p>
          </Card>
          <div className="actions">
            <LinkButton href="/how-to-order">Read how to order</LinkButton>
            <LinkButton href="/" variant="secondary">
              Back home
            </LinkButton>
          </div>
        </div>
      </div>
    </SiteShell>
  );
}
