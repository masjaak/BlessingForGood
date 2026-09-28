"use client";

import type { ReactNode } from "react";
import { ConvexProvider, ConvexReactClient } from "convex/react";

const client = new ConvexReactClient("http://127.0.0.1:3210");

export function LocalPresentationConvexProvider({ children }: { children: ReactNode }) {
  return <ConvexProvider client={client}>{children}</ConvexProvider>;
}
