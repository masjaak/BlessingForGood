type HomeAccessIconKind = "community" | "private" | "ready" | "account";

const commonSvgProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export function HomeAccessIcon({ kind }: { kind: HomeAccessIconKind }) {
  return (
    <span className="discovery-card-icon" aria-hidden="true">
      {kind === "community" ? (
        <svg {...commonSvgProps}>
          <path d="M7 17.5 4.5 20l.6-3.4A7 7 0 1 1 19 14a6.9 6.9 0 0 1-6.8 5.5A7.2 7.2 0 0 1 7 17.5Z" />
          <path d="M8.5 10.5h7M8.5 13.5h4.5" />
        </svg>
      ) : kind === "private" ? (
        <svg {...commonSvgProps}>
          <rect x="5.5" y="10" width="13" height="10" rx="2.4" />
          <path d="M8.5 10V7.4a3.5 3.5 0 1 1 7 0V10M12 14v2.6" />
        </svg>
      ) : kind === "ready" ? (
        <svg {...commonSvgProps}>
          <path d="M5 5.5h5.2a2.8 2.8 0 0 1 1.8.7 2.8 2.8 0 0 1 1.8-.7H19v13h-5.2a2.8 2.8 0 0 0-1.8.7 2.8 2.8 0 0 0-1.8-.7H5v-13Z" />
          <path d="M12 6.2v13M15.2 10.2l1.3 1.3 2.3-2.6" />
        </svg>
      ) : (
        <svg {...commonSvgProps}>
          <circle cx="12" cy="8" r="3.4" />
          <path d="M5.5 19.5a6.5 6.5 0 0 1 13 0" />
        </svg>
      )}
    </span>
  );
}
