"use client";

import type { ReactNode } from "react";
import { usePrototype } from "@/domain/prototype/store";

export function PrototypeModeGuard({ children }: { children: ReactNode }) {
  const { enabled, hydrated } = usePrototype();

  if (!enabled) {
    return (
      <div className="guard-card">
        <span className="eyebrow">Prototype boundary</span>
        <h1>Prototype mode is off</h1>
        <p>
          Protected prototype flows fail closed. Run this local app with
          <code>NEXT_PUBLIC_BFG_PROTOTYPE_MODE=true</code> when you intentionally want to test them.
        </p>
      </div>
    );
  }

  if (!hydrated) return <div className="state-panel">Preparing the empty prototype workspace…</div>;
  return children;
}
