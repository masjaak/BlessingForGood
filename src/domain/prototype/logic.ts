import type {
  BookFormat,
  CatalogStatus,
  CreateCatalogInput,
  CreateOrderInput,
  DepositRequirement,
  DepositTransaction,
  DepositTransactionType,
  Invoice,
  Order,
  OrderItem,
  OrderStatus,
  PrototypeState,
  SecretCatalog,
} from "@/domain/prototype/types";
import { calendarDateKey } from "@/lib/calendar-date";

export const catalogStatusLabels: Record<CatalogStatus, string> = {
  draft: "Draf",
  open: "Terbuka",
  closed: "Ditutup",
  archived: "Diarsipkan",
};

export function normalizeCatalogStatus(value: string): CatalogStatus {
  if (value === "draft" || value === "open" || value === "closed" || value === "archived") return value;
  return "closed";
}

export const orderStatusLabels: Record<OrderStatus, string> = {
  submitted: "Pesanan masuk",
  po_closed: "PO Ditutup",
  ordered_to_supplier: "Dipesan ke pemasok",
  shipped_internationally: "Dikirim dari Luar Negeri",
  customs: "Pemeriksaan Bea Cukai",
  to_indonesia_warehouse: "Menuju Gudang Indonesia",
  at_store: "Sampai di Toko",
  awaiting_payment: "Menunggu Pelunasan",
  awaiting_address: "Menunggu Alamat",
  packing: "Sedang Dikemas",
  shipped: "Sudah Dikirim",
  completed: "Selesai",
  cancelled: "Dibatalkan",
};

const allowedTransitions: Record<OrderStatus, OrderStatus[]> = {
  submitted: ["po_closed", "cancelled"],
  po_closed: ["ordered_to_supplier"],
  ordered_to_supplier: ["shipped_internationally"],
  shipped_internationally: ["customs"],
  customs: ["to_indonesia_warehouse"],
  to_indonesia_warehouse: ["at_store"],
  at_store: ["awaiting_payment", "awaiting_address"],
  awaiting_payment: ["awaiting_address", "packing"],
  awaiting_address: ["packing"],
  packing: ["shipped"],
  shipped: ["completed"],
  completed: [],
  cancelled: [],
};

function createId(prefix: string): string {
  if (globalThis.crypto?.randomUUID) return `${prefix}-${globalThis.crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function requireText(value: string, label: string): string {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${label} is required`);
  return normalized;
}

export function emptyPrototypeState(): PrototypeState {
  return { catalogs: [], orders: [], invoices: [] };
}

export async function hashAccessCode(accessCode: string): Promise<string> {
  const normalized = requireText(accessCode, "access code");
  if (!globalThis.crypto?.subtle) throw new Error("secure hashing is unavailable");
  const bytes = new TextEncoder().encode(normalized);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function createCatalogFromInput(input: CreateCatalogInput, now = new Date()): Promise<SecretCatalog> {
  const name = requireText(input.name, "catalog name");
  const publisher = requireText(input.publisher, "publisher");
  const title = requireText(input.title, "book title");
  if (!input.variants.length) throw new Error("at least one book format is required");

  const formats = new Set<BookFormat>();
  const variants = input.variants.map((variant) => {
    if (formats.has(variant.format)) throw new Error("book formats must be unique");
    if (!Number.isInteger(variant.price) || variant.price < 0) throw new Error("price must be an integer");
    formats.add(variant.format);
    return {
      id: createId("variant"),
      format: variant.format,
      isbn: requireText(variant.isbn, "ISBN"),
      price: variant.price,
      currency: "IDR" as const,
      availability: "available" as const,
    };
  });

  if (!input.accessCode) throw new Error("access code is required for local catalog logic");
  return {
    id: createId("catalog"),
    name,
    accessCodeHash: await hashAccessCode(input.accessCode),
    status: "open",
    closingAt: input.closingAt,
    books: [{ id: createId("book"), title, publisher, variants }],
    createdAt: now.toISOString(),
  };
}

export function isCatalogOpen(catalog: SecretCatalog, now = new Date()): boolean {
  return catalog.status === "open" && (!catalog.closingAt || now < new Date(catalog.closingAt));
}

export function catalogDeadlineLabel(
  closingAt: number | string | Date | null,
  status: CatalogStatus = "open",
  now = new Date(),
): string {
  if (status !== "open") return "Pemesanan ditutup";
  if (!closingAt) return "Pemesanan terbuka";
  const today = Date.parse(`${calendarDateKey(now)}T00:00:00.000Z`);
  const deadline = Date.parse(`${calendarDateKey(closingAt)}T00:00:00.000Z`);
  const remainingDays = Math.round((deadline - today) / 86_400_000);
  if (remainingDays < 0) return "Pemesanan ditutup";
  if (remainingDays === 0) return "Ditutup hari ini";
  if (remainingDays === 1) return "Besok ditutup";
  return `${remainingDays} hari lagi`;
}

export async function unlockCatalog(catalogs: SecretCatalog[], accessCode: string): Promise<SecretCatalog | undefined> {
  const accessCodeHash = await hashAccessCode(accessCode);
  return catalogs.find((catalog) => catalog.accessCodeHash === accessCodeHash && isCatalogOpen(catalog));
}

export function calculateOrderTotal(items: OrderItem[]): number {
  return items.reduce((total, item) => total + item.subtotal, 0);
}

export async function createOrder(catalog: SecretCatalog, input: CreateOrderInput, now = new Date()): Promise<Order> {
  if (!isCatalogOpen(catalog, now)) throw new Error("catalog is closed");
  const customerName = requireText(input.customerName, "customer name");
  const catalogBooks = new Map(
    catalog.books.flatMap((book) => book.variants.map((variant) => [variant.id, { book, variant }])),
  );
  const items = input.items.map(({ variantId, quantity }) => {
    const selected = catalogBooks.get(variantId);
    if (!selected) throw new Error("selected format is unavailable");
    if (!Number.isInteger(quantity) || quantity < 1) throw new Error("quantity must be positive");
    const { book, variant } = selected;
    return {
      id: createId("item"),
      bookId: book.id,
      bookTitle: book.title,
      publisher: book.publisher,
      variantId: variant.id,
      format: variant.format,
      isbn: variant.isbn,
      unitPrice: variant.price,
      quantity,
      subtotal: variant.price * quantity,
    };
  });
  if (!items.length) throw new Error("at least one item is required");

  const timestamp = now.toISOString();
  return {
    id: createId("order"),
    catalogId: catalog.id,
    customerName,
    customerEmail: input.customerEmail?.trim() || null,
    source: "preorder",
    items,
    total: calculateOrderTotal(items),
    depositRequirement: { kind: "unset" },
    status: "submitted",
    statusHistory: [{ status: "submitted", at: timestamp }],
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export async function editOrder(
  catalog: SecretCatalog,
  order: Order,
  input: CreateOrderInput,
  now = new Date(),
): Promise<Order> {
  if (order.catalogId !== catalog.id || order.status !== "submitted" || !isCatalogOpen(catalog, now)) {
    throw new Error("order is locked");
  }
  const replacement = await createOrder(catalog, input, now);
  return {
    ...replacement,
    id: order.id,
    createdAt: order.createdAt,
    statusHistory: order.statusHistory,
  };
}

export function canTransitionOrderStatus(from: OrderStatus, to: OrderStatus): boolean {
  return allowedTransitions[from].includes(to);
}

export function nextOrderStatuses(status: OrderStatus): OrderStatus[] {
  return allowedTransitions[status];
}

export function transitionOrderStatus(order: Order, nextStatus: OrderStatus, now = new Date()): Order {
  if (!canTransitionOrderStatus(order.status, nextStatus)) throw new Error("invalid order transition");
  const at = now.toISOString();
  return {
    ...order,
    status: nextStatus,
    updatedAt: at,
    statusHistory: [...order.statusHistory, { status: nextStatus, at }],
  };
}

function validateDepositRequirement(requirement: DepositRequirement): void {
  if (requirement.kind === "fixed" && (!Number.isInteger(requirement.amount) || requirement.amount < 0)) {
    throw new Error("fixed deposit must be a non-negative integer");
  }
  if (
    requirement.kind === "percentage" &&
    (!Number.isInteger(requirement.value) || requirement.value < 0 || requirement.value > 100)
  ) {
    throw new Error("percentage deposit must be between 0 and 100");
  }
}

export function calculateDepositRequired(total: number, requirement: DepositRequirement): number {
  validateDepositRequirement(requirement);
  if (requirement.kind === "fixed") return requirement.amount;
  if (requirement.kind === "percentage") return Math.round((total * requirement.value) / 100);
  return 0;
}

export function createInvoiceFromOrder(
  order: Order,
  depositRequirement: DepositRequirement,
  now = new Date(),
): Invoice {
  validateDepositRequirement(depositRequirement);
  const timestamp = now.toISOString();
  return {
    id: createId("invoice"),
    orderId: order.id,
    customerName: order.customerName,
    items: order.items.map((item) => ({
      id: createId("invoice-item"),
      description: `${item.bookTitle} · ${item.format} · ${item.isbn}`,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      subtotal: item.subtotal,
    })),
    total: order.total,
    depositRequirement,
    transactions: [],
    status: "issued",
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

const ledgerEffects: Record<DepositTransactionType, 1 | -1> = {
  credit: 1,
  debit: -1,
  reservation: -1,
  release: 1,
  reversal: -1,
  adjustment: 1,
};

export function calculateLedgerBalance(transactions: DepositTransaction[]): number {
  return transactions.reduce(
    (balance, transaction) => balance + ledgerEffects[transaction.type] * transaction.amount,
    0,
  );
}

export function appendDepositTransaction(
  invoice: Invoice,
  type: DepositTransactionType,
  amount: number,
  note: string,
  now = new Date(),
): Invoice {
  if (!Number.isInteger(amount) || amount <= 0) throw new Error("deposit amount must be a positive integer");
  const normalizedNote = requireText(note, "deposit note");
  const createdAt = now.toISOString();
  const transaction: DepositTransaction = { id: createId("deposit"), type, amount, note: normalizedNote, createdAt };
  return { ...invoice, transactions: [...invoice.transactions, transaction], updatedAt: createdAt };
}

export function formatIdr(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}
