"use client";

import { Button } from "@/components/ui";

export default function ReadyStockError({ reset }: { reset: () => void }) {
  return (
    <div className="state-panel" role="alert">
      <p>Ready Stock tidak dapat dimuat.</p>
      <Button onClick={reset}>Coba lagi</Button>
    </div>
  );
}
