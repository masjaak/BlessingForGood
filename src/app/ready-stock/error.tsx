"use client";

import { Button, ErrorState } from "@/components/ui";

export default function ReadyStockError({ reset }: { reset: () => void }) {
  return (
    <ErrorState
      title="Ready Stock tidak dapat dimuat."
      description="Coba lagi atau kembali ke beranda."
      action={<Button onClick={reset}>Coba lagi</Button>}
    />
  );
}
