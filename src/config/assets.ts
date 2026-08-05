export type AssetStatus = "missing";

export interface AssetReference {
  status: AssetStatus;
  expectedPaths: readonly string[];
  notes: string;
}

export const assetReferences = {
  logo: {
    status: "missing",
    expectedPaths: ["/brand/logos/"],
    notes: "No official logo file is present in the canonical GitHub repository.",
  },
  mascot: {
    status: "missing",
    expectedPaths: ["/brand/mascot/"],
    notes: "No mascot file is present in the canonical GitHub repository.",
  },
  mobileMockups: {
    status: "missing",
    expectedPaths: ["/mockups/mobile/"],
    notes: "No mobile mockup file is present in the canonical GitHub repository.",
  },
  adminMockups: {
    status: "missing",
    expectedPaths: ["/mockups/admin/"],
    notes: "No admin mockup file is present in the canonical GitHub repository.",
  },
} as const satisfies Record<string, AssetReference>;
