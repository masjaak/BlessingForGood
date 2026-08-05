import { BrandMascot } from "@/components/brand";
import { LinkButton, Card } from "@/components/ui";
import { SiteShell } from "@/components/site-shell";

const steps = [
  ["01", "Get access", "Use the code for the private catalog you were invited to."],
  ["02", "Choose a format", "Review the title, ISBN, price, and availability before selecting quantity."],
  ["03", "Review the preorder", "Check your details and total before recording the order."],
  [
    "04",
    "Stay connected",
    "The website records the order; WhatsApp remains the handoff for confirmation and follow-up.",
  ],
];

export default function HowToOrderPage() {
  return (
    <SiteShell>
      <div className="page narrow-page">
        <header className="page-header">
          <div>
            <span className="eyebrow">How to order</span>
            <h1>A clear flow, one decision at a time.</h1>
            <p className="lede">
              This foundation explains the confirmed high-level order rhythm without inventing unresolved refund,
              payment, or cancellation rules.
            </p>
          </div>
        </header>
        <div className="step-list">
          {steps.map(([number, title, description]) => (
            <Card key={number} className="step-card">
              <span className="step-number">{number}</span>
              <div>
                <h2>{title}</h2>
                <p>{description}</p>
              </div>
            </Card>
          ))}
        </div>
        <Card className="notice-card communication-card">
          <BrandMascot variant="warm" className="guide-mascot" />
          <span className="card-kicker">Prototype note</span>
          <h2>Rules that are not final stay visible as gaps.</h2>
          <p>Deposit requirements, refund behavior, and production account rules are deliberately not guessed here.</p>
        </Card>
        <div className="actions">
          <LinkButton href="/catalog">Enter a secret catalog</LinkButton>
          <LinkButton href="/" variant="secondary">
            Back home
          </LinkButton>
        </div>
      </div>
    </SiteShell>
  );
}
