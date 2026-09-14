"use client";

import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  Button,
  Card,
  ConfirmationDialog,
  EmptyState,
  ErrorState,
  LinkButton,
  LoadingRegion,
  Money,
  PageHeader,
  Skeleton,
  SkeletonText,
} from "@/components/ui";
import { productErrorMessage } from "@/domain/prototype/errors";
import { CartLineCard, type CartLine, type PendingAction } from "./cart-line";
import styles from "./cart.module.css";

function CartSkeleton() {
  return (
    <div className={`page ${styles.page}`} aria-busy="true" aria-label="Menyiapkan keranjang">
      <PageHeader
        eyebrow="Keranjang"
        title="Keranjang"
        description="Menyiapkan buku dan status terbaru dari keranjangmu."
      />
      <LoadingRegion label="Memuat keranjang">
        {Array.from({ length: 2 }, (_, index) => (
          <Card className={`${styles.line} ${styles.skeletonLine}`} aria-hidden="true" key={index}>
            <Skeleton className={styles.skeletonCover} />
            <div className={styles.skeletonBody}>
              <SkeletonText width="72%" />
              <SkeletonText width="45%" />
              <SkeletonText width="58%" />
            </div>
          </Card>
        ))}
      </LoadingRegion>
    </div>
  );
}

function checkoutRequestKey() {
  return crypto.randomUUID();
}

export function CustomerCart() {
  const router = useRouter();
  const cart = useQuery(api.carts.getMine, {});
  const reconcile = useMutation(api.carts.reconcile);
  const updateQuantity = useMutation(api.carts.updateQuantity);
  const removeItem = useMutation(api.carts.removeItem);
  const clear = useMutation(api.carts.clear);
  const acknowledge = useMutation(api.carts.acknowledgeCurrentLineState);
  const submitCart = useMutation(api.orders.submitCart);
  const reconcileStarted = useRef(false);
  const [reconcileAttempt, setReconcileAttempt] = useState(0);
  const [reconcileReady, setReconcileReady] = useState(false);
  const [reconcileError, setReconcileError] = useState("");
  const [actionError, setActionError] = useState("");
  const [pending, setPending] = useState<PendingAction>(null);
  const [clearOpen, setClearOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const checkoutRequestKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (cart === undefined) return;
    if (!cart.lines.length) return;
    if (reconcileStarted.current) return;
    reconcileStarted.current = true;
    void reconcile({})
      .then(() => setReconcileReady(true))
      .catch((reason) => {
        reconcileStarted.current = false;
        setReconcileError(productErrorMessage(reason, "Keranjang belum dapat disinkronkan. Coba lagi."));
      });
  }, [cart, reconcile, reconcileAttempt]);

  if (cart === undefined) return <CartSkeleton />;
  const ready = cart.lines.length === 0 || reconcileReady;
  if (!ready && !reconcileError) return <CartSkeleton />;
  if (reconcileError) {
    return (
      <div className={`page ${styles.page}`}>
        <PageHeader
          eyebrow="Keranjang"
          title="Keranjang"
          description="Periksa kembali status buku sebelum mengelolanya."
        />
        <ErrorState
          title="Status keranjang belum siap."
          description={reconcileError}
          action={
            <Button
              onClick={() => {
                setReconcileError("");
                setReconcileReady(false);
                setReconcileAttempt((attempt) => attempt + 1);
              }}
            >
              Coba lagi
            </Button>
          }
        />
      </div>
    );
  }

  if (!cart.lines.length) {
    return (
      <div className={`page ${styles.page}`}>
        <PageHeader eyebrow="Keranjang" title="Keranjang" description="Kelola pilihan buku dari satu Secret Catalog." />
        <EmptyState
          title="Keranjangmu masih kosong"
          description="Buku yang kamu pilih dari Secret Catalog akan muncul di sini."
          mascotVariant={false}
          action={<LinkButton href="/catalog">Lihat Katalog</LinkButton>}
        />
      </div>
    );
  }

  const activeLines = cart.lines.filter((line) => line.checkoutEligible);
  const retainedLines = cart.lines.filter((line) => !line.checkoutEligible);

  async function changeQuantity(line: CartLine, quantity: number) {
    if (quantity < 1 || pending !== null) return;
    setActionError("");
    setPending(`quantity-${line.id}`);
    try {
      await updateQuantity({ cartItemId: line.id as Id<"cartItems">, quantity });
    } catch (reason) {
      setActionError(productErrorMessage(reason, "Jumlah buku belum dapat diperbarui. Coba lagi."));
    } finally {
      setPending(null);
    }
  }

  async function removeLine(line: CartLine) {
    if (pending !== null) return;
    setActionError("");
    setPending(`remove-${line.id}`);
    try {
      await removeItem({ cartItemId: line.id as Id<"cartItems"> });
    } catch (reason) {
      setActionError(productErrorMessage(reason, "Buku belum dapat dihapus dari keranjang. Coba lagi."));
    } finally {
      setPending(null);
    }
  }

  async function acknowledgeLine(line: CartLine) {
    if (pending !== null) return;
    setActionError("");
    setPending(`ack-${line.id}`);
    try {
      await acknowledge({ cartItemId: line.id as Id<"cartItems"> });
    } catch (reason) {
      setActionError(productErrorMessage(reason, "Status buku belum dapat disetujui. Coba lagi."));
    } finally {
      setPending(null);
    }
  }

  async function clearCart() {
    if (pending !== null) return;
    setActionError("");
    setPending("clear");
    try {
      await clear({});
      setClearOpen(false);
    } catch (reason) {
      setActionError(productErrorMessage(reason, "Keranjang belum dapat dikosongkan. Coba lagi."));
    } finally {
      setPending(null);
    }
  }

  async function checkout() {
    if (!cart || pending !== null || activeLines.length !== cart.lines.length) return;
    setActionError("");
    setPending("checkout");
    const requestKey = checkoutRequestKeyRef.current || (checkoutRequestKeyRef.current = checkoutRequestKey());
    try {
      const order = await submitCart({ requestKey });
      setCheckoutOpen(false);
      router.push(`/account/orders/${order.orderId}`);
    } catch (reason) {
      setCheckoutOpen(false);
      setActionError(productErrorMessage(reason, "Pesanan belum berhasil dibuat. Periksa keranjang dan coba lagi."));
    } finally {
      setPending(null);
    }
  }

  return (
    <div className={`page ${styles.page}`}>
      <PageHeader
        eyebrow="Keranjang"
        title="Keranjang"
        description="Periksa buku yang masih bisa dipesan dan kelola baris yang perlu perhatian."
        actions={
          <LinkButton href="/catalog" variant="secondary">
            Lihat Katalog
          </LinkButton>
        }
      />
      <div className={styles.context} aria-label="Konteks katalog keranjang">
        <div>
          <span className="card-kicker">SECRET CATALOG</span>
          <strong>{cart.catalog?.name || "Katalog tersimpan"}</strong>
        </div>
        <p>Satu keranjang hanya menyimpan pilihan dari satu katalog.</p>
      </div>
      {actionError ? (
        <p className={styles.error} role="alert">
          {actionError}
        </p>
      ) : null}
      <div className={styles.layout}>
        <div className={styles.sections}>
          <Card className={styles.sectionCard}>
            <div className={styles.sectionHeading}>
              <div>
                <span className="card-kicker">AKTIF</span>
                <h2 id="cart-active-heading">Buku yang bisa dipesan</h2>
              </div>
              <span className={styles.count}>{cart.activeLineCount} pilihan</span>
            </div>
            {activeLines.length ? (
              <div className={styles.lineList} aria-labelledby="cart-active-heading">
                {activeLines.map((line) => (
                  <CartLineCard
                    key={line.id}
                    line={line}
                    pending={pending}
                    onAcknowledge={(value) => void acknowledgeLine(value)}
                    onQuantityChange={(value, quantity) => void changeQuantity(value, quantity)}
                    onRemove={(value) => void removeLine(value)}
                  />
                ))}
              </div>
            ) : (
              <div className={styles.sectionEmpty}>
                <p>Belum ada buku yang bisa dipesan saat ini.</p>
              </div>
            )}
          </Card>
          {retainedLines.length ? (
            <Card className={styles.sectionCard}>
              <div className={styles.sectionHeading}>
                <div>
                  <span className="card-kicker">PERLU PERHATIAN</span>
                  <h2 id="cart-retained-heading">Belum bisa dipesan</h2>
                </div>
                <span className={styles.count}>{retainedLines.length} pilihan</span>
              </div>
              <div className={styles.lineList} aria-labelledby="cart-retained-heading">
                {retainedLines.map((line) => (
                  <CartLineCard
                    key={line.id}
                    line={line}
                    pending={pending}
                    onAcknowledge={(value) => void acknowledgeLine(value)}
                    onQuantityChange={(value, quantity) => void changeQuantity(value, quantity)}
                    onRemove={(value) => void removeLine(value)}
                  />
                ))}
              </div>
            </Card>
          ) : null}
        </div>
        <aside>
          <Card className={styles.summary}>
            <div>
              <span className="card-kicker">RINGKASAN</span>
              <h2>Keranjangmu</h2>
            </div>
            <div className={styles.summaryRows}>
              <div>
                <span>Buku aktif</span>
                <strong>{cart.activeQuantity}</strong>
              </div>
              <div>
                <span>Subtotal aktif</span>
                <strong>
                  <Money amount={cart.estimatedSubtotalAmount} />
                </strong>
              </div>
            </div>
            <p className={styles.summaryNote}>
              {activeLines.length === cart.lines.length
                ? "Semua buku siap dibuat menjadi satu pesanan."
                : "Selesaikan buku yang perlu perhatian sebelum membuat pesanan."}
            </p>
            {activeLines.length === cart.lines.length ? (
              <Button
                disabled={pending !== null}
                loading={pending === "checkout"}
                loadingLabel="Membuat pesanan…"
                onClick={() => setCheckoutOpen(true)}
                type="button"
              >
                Buat pesanan
              </Button>
            ) : null}
            <Button
              disabled={pending !== null}
              loading={pending === "clear"}
              loadingLabel="Mengosongkan…"
              onClick={() => setClearOpen(true)}
              type="button"
              variant="danger"
            >
              Kosongkan keranjang
            </Button>
          </Card>
        </aside>
      </div>
      <ConfirmationDialog
        open={checkoutOpen}
        title="Buat pesanan dari keranjang?"
        description={`Semua ${cart.activeQuantity} buku aktif akan dibuat menjadi satu pesanan dengan harga terbaru dari katalog.`}
        confirmLabel={pending === "checkout" ? "Membuat pesanan…" : "Buat pesanan"}
        disabled={pending !== null}
        onCancel={() => {
          if (pending === null) setCheckoutOpen(false);
        }}
        onConfirm={() => void checkout()}
      />
      <ConfirmationDialog
        open={clearOpen}
        title="Kosongkan semua isi keranjang?"
        description="Semua buku aktif dan buku yang perlu perhatian akan dihapus dari keranjang. Tindakan ini tidak membuat pesanan."
        confirmLabel={pending === "clear" ? "Mengosongkan…" : "Kosongkan keranjang"}
        danger
        disabled={pending !== null}
        onCancel={() => {
          if (pending === null) setClearOpen(false);
        }}
        onConfirm={() => void clearCart()}
      />
    </div>
  );
}
