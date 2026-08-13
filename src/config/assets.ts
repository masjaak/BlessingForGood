export type AssetStatus = "confirmed" | "candidate" | "unmapped" | "missing";

export interface AssetReference {
  status: AssetStatus;
  expectedPaths: readonly string[];
  notes: string;
}

export const brandAssets = {
  logos: {
    primary: {
      src: "/brand/logos/Logo-1",
      alt: "Blessing For Goods",
      width: 4000,
      height: 4000,
    },
    admin: {
      src: "/brand/logos/Logo-1",
      alt: "Blessing For Goods operational mark",
      width: 4000,
      height: 4000,
    },
    symbol: {
      src: "/brand/logos/Logo-2.png",
      alt: "Blessing For Goods symbol",
      width: 4000,
      height: 4000,
    },
  },
  mascots: {
    default: {
      src: "/brand/mascot/Mascott-1.png",
      alt: "Blessing For Goods mascot",
      width: 5000,
      height: 5000,
    },
    success: {
      src: "/brand/mascot/Mascott-3.png",
      alt: "Blessing For Goods mascot celebrating",
      width: 5000,
      height: 5000,
    },
    warm: {
      src: "/brand/mascot/Mascott-4.png",
      alt: "Blessing For Goods mascot with hearts",
      width: 5000,
      height: 5000,
    },
  },
} as const;

export const assetReferences = {
  logo: {
    status: "confirmed",
    expectedPaths: [
      "/brand/logos/Logo-1",
      "/brand/logos/Logo-2.png",
      "/brand/logos/Logo-3.png",
      "/brand/logos/Logo-4.png",
    ],
    notes: "Logo-1 is the approved multicolor primary for customer and operational workspaces; Logo-2 is the symbol.",
  },
  mascot: {
    status: "confirmed",
    expectedPaths: [
      "/brand/mascot/Mascott-1.png",
      "/brand/mascot/Mascott-2.png",
      "/brand/mascot/Mascott-3.png",
      "/brand/mascot/Mascott-4.png",
    ],
    notes:
      "Four readable RGBA PNG mascot candidates were copied exactly; runtime roles use the default, success, and warm expressions.",
  },
  mobileMockups: {
    status: "confirmed",
    expectedPaths: ["/mockups/mobile/"],
    notes: "Eight RGB mobile reference mockups were copied exactly and mapped in context/mockups/.",
  },
  adminMockups: {
    status: "confirmed",
    expectedPaths: ["/mockups/admin/"],
    notes: "Ten RGB admin reference mockups were copied exactly and mapped in context/mockups/.",
  },
} as const satisfies Record<string, AssetReference>;
