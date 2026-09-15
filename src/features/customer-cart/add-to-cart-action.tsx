"use client";

import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button, LinkButton } from "@/components/ui";
import { type ProductAuthState } from "@/domain/prototype/context";
import { productErrorMessage } from "@/domain/prototype/errors";
import type { ProductRole } from "@/domain/prototype/session";
import { useState } from "react";

type AddToCartActionProps = {
  catalogItemId: string;
  quantity: number;
  authState: ProductAuthState;
  sessionRole: ProductRole | null;
  returnTo: string;
};

function signInHref(returnTo: string) {
  return `/sign-in?redirect_url=${encodeURIComponent(returnTo)}`;
}

export function AddToCartAction({ catalogItemId, quantity, authState, sessionRole, returnTo }: AddToCartActionProps) {
  const addItem = useMutation(api.carts.addItem);
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<"success" | "error" | null>(null);
  const [error, setError] = useState("");
  const validQuantity = Number.isSafeInteger(quantity) && quantity >= 1;

  if (authState === "signed-out") {
    return (
      <div className="catalog-member-note">
        <LinkButton
          href={signInHref(returnTo)}
          variant="secondary"
          size="compact"
          disabled={!validQuantity}
          aria-label="Masuk untuk menambahkan buku ke keranjang"
        >
          Tambahkan ke keranjang
        </LinkButton>
      </div>
    );
  }

  if (authState !== "authenticated" || sessionRole !== "customer") return null;

  async function add() {
    if (!validQuantity || pending) return;
    setPending(true);
    setFeedback(null);
    setError("");
    try {
      await addItem({ catalogItemId: catalogItemId as Id<"catalogItems">, quantity });
      setFeedback("success");
    } catch (reason) {
      setFeedback("error");
      setError(productErrorMessage(reason, "Buku belum dapat ditambahkan ke keranjang. Coba lagi."));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="catalog-member-note">
      <Button
        type="button"
        variant="secondary"
        size="compact"
        onClick={add}
        loading={pending}
        loadingLabel="Menambahkan…"
        disabled={!validQuantity}
      >
        Tambahkan ke keranjang
      </Button>
      {feedback === "success" ? (
        <p role="status">
          Ditambahkan ke keranjang.{" "}
          <LinkButton href="/account/cart" variant="tertiary" size="compact">
            Lihat keranjang
          </LinkButton>
        </p>
      ) : null}
      {feedback === "error" ? (
        <p className="error-text" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
