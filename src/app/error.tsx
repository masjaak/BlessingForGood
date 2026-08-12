"use client";

import { Button, ErrorState } from "@/components/ui";

export default function AppError({ reset }: { reset: () => void }) {
  return (
    <main className="page">
      <ErrorState
        title="BFG belum dapat memuat bagian ini."
        description="Coba lagi atau kembali ke beranda. Data operasional tetap berada di Convex."
        action={<Button onClick={reset}>Coba lagi</Button>}
      />
    </main>
  );
}
