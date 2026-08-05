import { Card, EmptyState, LinkButton, PageHeader } from "@/components/ui";
import { SiteShell } from "@/components/site-shell";

export default function ReadyStockPage() {
  return (
    <SiteShell>
      <div className="page narrow-page">
        <PageHeader
          eyebrow="Ready stock foundation"
          title="A separate source, the same clear record."
          description="Ready-stock orders are reserved in the prototype domain, but no catalog or inventory records are seeded."
        />
        <Card>
          <EmptyState
            title="No ready stock available"
            description="This intentional empty state contains no invented titles, quantities, prices, or sales claims."
            action={
              <LinkButton href="/community" variant="secondary">
                Read the community guide
              </LinkButton>
            }
          />
        </Card>
      </div>
    </SiteShell>
  );
}
