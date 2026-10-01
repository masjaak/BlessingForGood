type TimelineStep = {
  key: string;
  label: string;
  state: "complete" | "current" | "upcoming";
};

export function ReadyStockTimeline({
  title,
  steps,
  className = "",
}: {
  title: string;
  steps: TimelineStep[];
  className?: string;
}) {
  return (
    <ol className={`ready-stock-timeline ${className}`} aria-label={`Timeline ${title}`}>
      {steps.map((step) => (
        <li
          className={`ready-stock-timeline-step is-${step.state}`}
          key={step.key}
          aria-current={step.state === "current" ? "step" : undefined}
        >
          <span className="ready-stock-timeline-marker" aria-hidden="true" />
          <div>
            <strong>{step.label}</strong>
            <span className="subtle">
              {step.state === "complete" ? "Selesai" : step.state === "current" ? "Sekarang" : "Berikutnya"}
            </span>
          </div>
        </li>
      ))}
    </ol>
  );
}
