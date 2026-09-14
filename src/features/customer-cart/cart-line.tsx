"use client";

import type { FunctionReturnType } from "convex/server";
import { api } from "../../../convex/_generated/api";
import { BookCover } from "@/components/book-cover";
import { Button, Card, IconButton, Money, StatusBadge } from "@/components/ui";
import styles from "./cart.module.css";

export type Cart = NonNullable<FunctionReturnType<typeof api.carts.getMine>>;
export type CartLine = Cart["lines"][number];
export type PendingAction = string | null;

const availabilityLabels: Record<CartLine["availability"], string> = {
  active: "Bisa dipesan",
  catalog_closed: "Katalog sudah ditutup",
  catalog_item_unavailable: "Buku sedang tidak tersedia",
  variant_unavailable: "Format ini sedang tidak tersedia",
  book_unavailable: "Buku sedang tidak tersedia",
  publisher_unavailable: "Penerbit sedang tidak tersedia",
  po_closed: "PO sudah ditutup",
  removed: "Buku ini sudah tidak tersedia di katalog",
};

function MinusIcon() {
  return (
    <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12h14" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </svg>
  );
}

function RemoveIcon() {
  return (
    <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M5 7h14M9 7V4h6v3m-8 0 1 13h8l1-13M10 11v6m4-6v6"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function statusFor(line: CartLine) {
  if (line.priceChanged) return { label: "Harga berubah", tone: "warning" as const };
  if (line.reconciliationState === "available_pending_acknowledgement") {
    return { label: "Tersedia lagi", tone: "warning" as const };
  }
  if (line.checkoutEligible) return { label: "Bisa dipesan", tone: "positive" as const };
  return { label: availabilityLabels[line.availability], tone: "neutral" as const };
}

function QuantityControl({
  line,
  pending,
  onChange,
}: {
  line: CartLine;
  pending: boolean;
  onChange: (quantity: number) => void;
}) {
  const title = line.title || "buku ini";
  if (!line.checkoutEligible) {
    return (
      <div className={styles.quantity}>
        <span>Jumlah</span>
        <output className={styles.staticQuantity}>{line.quantity}</output>
      </div>
    );
  }
  return (
    <div className={styles.quantity}>
      <span>Jumlah</span>
      <div className={styles.quantityControl} aria-label={`Jumlah ${title}`}>
        <IconButton
          aria-label={`Kurangi jumlah ${title}`}
          disabled={pending || line.quantity <= 1}
          onClick={() => onChange(line.quantity - 1)}
          size="compact"
          type="button"
          variant="tertiary"
        >
          <MinusIcon />
        </IconButton>
        <output aria-live="polite">{line.quantity}</output>
        <IconButton
          aria-label={`Tambah jumlah ${title}`}
          disabled={pending}
          onClick={() => onChange(line.quantity + 1)}
          size="compact"
          type="button"
          variant="tertiary"
        >
          <PlusIcon />
        </IconButton>
      </div>
    </div>
  );
}

export function CartLineCard({
  line,
  pending,
  onAcknowledge,
  onQuantityChange,
  onRemove,
}: {
  line: CartLine;
  pending: PendingAction;
  onAcknowledge: (line: CartLine) => void;
  onQuantityChange: (line: CartLine, quantity: number) => void;
  onRemove: (line: CartLine) => void;
}) {
  const title = line.title || "Buku ini sudah tidak tersedia";
  const publisher = line.publisherName || "Detail penerbit tidak tersedia";
  const format = line.format || "Format tidak tersedia";
  const status = statusFor(line);
  const acknowledgeable =
    line.requiresAcknowledgement &&
    line.availability === "active" &&
    line.currentUnitPriceAmount !== null &&
    (line.priceChanged || line.reconciliationState === "available_pending_acknowledgement");
  const currentPrice = line.currentUnitPriceAmount ?? line.observedUnitPriceAmount;

  return (
    <Card className={`${styles.line} ${line.checkoutEligible ? "" : styles.lineInactive}`}>
      <div className={styles.cover}>
        <BookCover title={title} publisher={publisher} format={format} src={line.coverImageUrl || undefined} />
      </div>
      <div className={styles.body}>
        <div className={styles.lineHeading}>
          <div>
            <h3>{title}</h3>
            <p className={styles.meta}>
              {format} · {publisher}
              {line.isbn ? ` · ISBN ${line.isbn}` : ""}
            </p>
          </div>
          <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
        </div>
        <div className={styles.priceRow}>
          {line.priceChanged ? (
            <div className={`${styles.price} ${styles.oldPrice}`}>
              <span className={styles.priceLabel}>Harga sebelumnya</span>
              <strong>
                <Money amount={line.observedUnitPriceAmount} />
              </strong>
            </div>
          ) : null}
          <div className={styles.price}>
            <span className={styles.priceLabel}>{line.priceChanged ? "Harga sekarang" : "Harga per buku"}</span>
            <strong>
              <Money amount={currentPrice} />
            </strong>
          </div>
          {line.checkoutEligible ? (
            <div className={styles.subtotal}>
              <span className={styles.priceLabel}>Subtotal</span>
              <strong>
                <Money amount={line.subtotalAmount} />
              </strong>
            </div>
          ) : null}
        </div>
        {acknowledgeable ? (
          <div className={styles.ack}>
            <p>
              {line.priceChanged
                ? "Harga terbaru belum digunakan di keranjang aktif. Periksa perubahan ini sebelum menyetujuinya."
                : "Buku ini tersedia lagi. Setujui untuk mengaktifkan kembali pilihanmu."}
            </p>
            <Button
              disabled={pending !== null}
              loading={pending === `ack-${line.id}`}
              loadingLabel="Memperbarui…"
              onClick={() => onAcknowledge(line)}
              size="compact"
              type="button"
            >
              {line.priceChanged ? "Gunakan harga terbaru" : "Aktifkan lagi"}
            </Button>
          </div>
        ) : null}
        {!line.checkoutEligible ? (
          <p className={styles.meta}>Belum masuk subtotal aktif sampai status ini selesai.</p>
        ) : null}
      </div>
      <div className={styles.actions}>
        <QuantityControl
          line={line}
          pending={pending !== null}
          onChange={(quantity) => onQuantityChange(line, quantity)}
        />
        <IconButton
          aria-label={`Hapus ${title} dari keranjang`}
          className={styles.removeButton}
          disabled={pending !== null}
          loading={pending === `remove-${line.id}`}
          loadingLabel="Menghapus…"
          onClick={() => onRemove(line)}
          type="button"
          variant="danger"
        >
          <RemoveIcon />
        </IconButton>
      </div>
    </Card>
  );
}
