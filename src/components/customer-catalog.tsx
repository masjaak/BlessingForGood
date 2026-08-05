"use client";

import { useMemo, useState } from "react";
import { BrandMascot } from "@/components/brand";
import { formatIdr } from "@/domain/prototype/logic";
import { usePrototype } from "@/domain/prototype/store";
import type { Order } from "@/domain/prototype/types";
import { Button, Card, Field, LinkButton, Money, PageHeader } from "@/components/ui";

export function CustomerCatalog() {
  const { unlockedCatalog: catalog, unlockCatalog, submitOrder } = usePrototype();
  const [accessCode, setAccessCode] = useState("");
  const [accessError, setAccessError] = useState("");
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submittedOrder, setSubmittedOrder] = useState<Order | null>(null);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedItems = useMemo(() => {
    if (!catalog) return [];
    return catalog.books.flatMap((book) => {
      const variantId =
        selectedVariants[book.id] || book.variants.find((variant) => variant.availability === "available")?.id;
      const quantity = variantId ? quantities[variantId] || 0 : 0;
      return variantId && quantity > 0 ? [{ variantId, quantity }] : [];
    });
  }, [catalog, quantities, selectedVariants]);

  const total = catalog
    ? selectedItems.reduce((sum, item) => {
        const variant = catalog.books
          .flatMap((book) => book.variants)
          .find((candidate) => candidate.id === item.variantId);
        return sum + (variant?.price || 0) * item.quantity;
      }, 0)
    : 0;

  async function handleUnlock(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAccessError("");
    setIsUnlocking(true);
    try {
      const unlocked = await unlockCatalog(accessCode);
      if (!unlocked) setAccessError("Kode belum cocok, katalog sudah ditutup, atau akses belum tersedia.");
    } catch (error) {
      setAccessError(error instanceof Error ? error.message : "Catalog access failed");
    } finally {
      setIsUnlocking(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!catalog) return;
    setSubmitError("");
    setIsSubmitting(true);
    try {
      const order = await submitOrder(catalog.id, { customerName, customerEmail, items: selectedItems });
      setSubmittedOrder(order);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Order could not be recorded");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (submittedOrder) {
    const whatsappText = encodeURIComponent(
      `Halo, saya ${submittedOrder.customerName}. Order ${submittedOrder.id} sudah tercatat.`,
    );
    return (
      <div className="content-stack">
        <PageHeader
          eyebrow="Order recorded"
          title="Your preorder is in the book."
          description="The prototype recorded the order locally. WhatsApp remains a communication handoff, not the data source."
        />
        <Card className="success-banner success-card">
          <BrandMascot variant="success" className="success-mascot" />
          <strong>{submittedOrder.id}</strong>
          <p>
            Total {formatIdr(submittedOrder.total)} · {submittedOrder.items.length} selected line
          </p>
          <div className="actions">
            <a
              className="button button-primary"
              href={`https://wa.me/?text=${whatsappText}`}
              target="_blank"
              rel="noreferrer"
            >
              Continue in WhatsApp ↗
            </a>
            <LinkButton href="/account/orders" variant="secondary">
              View order status
            </LinkButton>
          </div>
        </Card>
      </div>
    );
  }

  if (!catalog) {
    return (
      <div className="catalog-access">
        <Card className="form-card">
          <PageHeader
            eyebrow="Private catalog"
            title="Enter your access code."
            description="Secret catalogs are separate from account passwords. This prototype checks a catalog-specific hash."
          />
          <form onSubmit={handleUnlock} className="form-card">
            <Field label="Catalog access code" hint="Use the code shared with you by the community.">
              <input
                className="input"
                value={accessCode}
                onChange={(event) => setAccessCode(event.target.value)}
                autoComplete="off"
                required
              />
            </Field>
            {accessError ? (
              <p className="error-text" role="alert">
                {accessError}
              </p>
            ) : null}
            <Button type="submit" disabled={isUnlocking}>
              {isUnlocking ? "Checking access…" : "Unlock catalog"}
            </Button>
          </form>
        </Card>
        <Card className="accent-card">
          <BrandMascot className="catalog-access-mascot" />
          <span className="card-kicker">No catalog data yet</span>
          <h2>A clean start.</h2>
          <p>An admin must create an open catalog in the prototype before a customer can browse it.</p>
          <LinkButton href="/admin/catalogs" variant="quiet">
            Open admin setup →
          </LinkButton>
        </Card>
      </div>
    );
  }

  return (
    <div className="content-stack">
      <PageHeader
        eyebrow="Unlocked catalog"
        title={catalog.name}
        description={
          catalog.closingAt
            ? `Open until ${new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(new Date(catalog.closingAt))}.`
            : "This catalog is currently open."
        }
      />
      <div className="catalog-grid">
        <div className="book-list">
          {catalog.books.map((book) => {
            const selectedVariantId = selectedVariants[book.id] || book.variants[0]?.id;
            const selectedQuantity = selectedVariantId ? quantities[selectedVariantId] || 0 : 0;
            return (
              <Card className="book-card" key={book.id}>
                <div className="book-meta">
                  <div>
                    <span className="card-kicker">{book.publisher}</span>
                    <h2>{book.title}</h2>
                  </div>
                  <span className="subtle">Choose one format</span>
                </div>
                <div className="variant-list" role="radiogroup" aria-label={`Format for ${book.title}`}>
                  {book.variants.map((variant) => (
                    <label className="variant-option" key={variant.id}>
                      <input
                        type="radio"
                        name={book.id}
                        value={variant.id}
                        checked={selectedVariantId === variant.id}
                        onChange={() => setSelectedVariants((current) => ({ ...current, [book.id]: variant.id }))}
                        disabled={variant.availability !== "available"}
                      />
                      <strong>{variant.format}</strong>
                      <span>
                        <Money amount={variant.price} />
                      </span>
                      <small>{variant.isbn}</small>
                    </label>
                  ))}
                </div>
                <div className="quantity-row">
                  <span>Quantity</span>
                  <div className="quantity-control">
                    <button
                      type="button"
                      aria-label={`Decrease quantity for ${book.title}`}
                      onClick={() =>
                        selectedVariantId &&
                        setQuantities((current) => ({
                          ...current,
                          [selectedVariantId]: Math.max(0, selectedQuantity - 1),
                        }))
                      }
                    >
                      −
                    </button>
                    <output aria-label={`Quantity for ${book.title}`}>{selectedQuantity}</output>
                    <button
                      type="button"
                      aria-label={`Increase quantity for ${book.title}`}
                      onClick={() =>
                        selectedVariantId &&
                        setQuantities((current) => ({ ...current, [selectedVariantId]: selectedQuantity + 1 }))
                      }
                    >
                      +
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
        <Card className="order-summary">
          <div>
            <span className="card-kicker">Preorder review</span>
            <h2>Make it yours.</h2>
          </div>
          <div className="summary-line">
            <span>Selected items</span>
            <strong>{selectedItems.reduce((sum, item) => sum + item.quantity, 0)}</strong>
          </div>
          <div className="summary-total">
            <span>Total</span>
            <Money amount={total} />
          </div>
          <form onSubmit={handleSubmit} className="form-card">
            <Field label="Your name">
              <input
                className="input"
                value={customerName}
                onChange={(event) => setCustomerName(event.target.value)}
                required
              />
            </Field>
            <Field label="Email (optional)">
              <input
                className="input"
                type="email"
                value={customerEmail}
                onChange={(event) => setCustomerEmail(event.target.value)}
              />
            </Field>
            {submitError ? (
              <p className="error-text" role="alert">
                {submitError}
              </p>
            ) : null}
            <Button type="submit" disabled={isSubmitting || selectedItems.length === 0}>
              {isSubmitting ? "Recording…" : "Record preorder"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
