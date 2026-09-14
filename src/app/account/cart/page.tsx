"use client";

import { EmptyState, LinkButton } from "@/components/ui";
import { ProductAccessGuard } from "@/components/product-access-guard";
import { SiteShell } from "@/components/site-shell";
import { CustomerCart } from "@/features/customer-cart/customer-cart";

function SignedOutCart() {
  return (
    <div className="page narrow-page account-gate-page">
      <EmptyState
        eyebrow="Keranjang"
        title="Masuk untuk melihat keranjangmu."
        description="Keranjang hanya tersedia untuk Blessfriend aktif dan mengikuti akunmu."
        mascotVariant={false}
        primaryAction={<LinkButton href="/sign-in?redirect_url=/account/cart">Masuk</LinkButton>}
        secondaryAction={
          <LinkButton href="/join" variant="secondary">
            Gabung Blessfriends
          </LinkButton>
        }
      />
    </div>
  );
}

export default function CustomerCartPage() {
  return (
    <SiteShell>
      <ProductAccessGuard requiredRole="customer" signedOutContent={<SignedOutCart />}>
        <CustomerCart />
      </ProductAccessGuard>
    </SiteShell>
  );
}
