"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { useMemo, type ReactNode } from "react";

export function ConvexProviderBoundary({ url, children }: { url: string; children: ReactNode }) {
  const client = useMemo(() => new ConvexReactClient(url), [url]);
  return <ConvexProvider client={client}>{children}</ConvexProvider>;
}
