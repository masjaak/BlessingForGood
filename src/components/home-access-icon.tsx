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

/** Tabler Icons v3.46.0 outline paths, MIT-licensed: https://github.com/tabler/tabler-icons */
export function HomeAccessIcon({ kind }: { kind: HomeAccessIconKind }) {
  return (
    <span className="discovery-card-icon" aria-hidden="true">
      {kind === "community" ? (
        <svg {...commonSvgProps}>
          <path d="M3 20l1.3 -3.9c-2.324 -3.437 -1.426 -7.872 2.1 -10.374c3.526 -2.501 8.59 -2.296 11.845 .48c3.255 2.777 3.695 7.266 1.029 10.501c-2.666 3.235 -7.615 4.215 -11.574 2.293l-4.7 1" />
        </svg>
      ) : kind === "private" ? (
        <svg {...commonSvgProps}>
          <path d="M5 13a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2v6a2 2 0 0 1 -2 2h-10a2 2 0 0 1 -2 -2v-6" />
          <path d="M11 16a1 1 0 1 0 2 0a1 1 0 0 0 -2 0" />
          <path d="M8 11v-4a4 4 0 1 1 8 0v4" />
        </svg>
      ) : kind === "ready" ? (
        <svg {...commonSvgProps}>
          <path d="M19 4v16h-12a2 2 0 0 1 -2 -2v-12a2 2 0 0 1 2 -2h12" />
          <path d="M19 16h-12a2 2 0 0 0 -2 2" />
          <path d="M9 8h6" />
        </svg>
      ) : (
        <svg {...commonSvgProps}>
          <path d="M8 7a4 4 0 1 0 8 0a4 4 0 0 0 -8 0" />
          <path d="M6 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2" />
        </svg>
      )}
    </span>
  );
}
