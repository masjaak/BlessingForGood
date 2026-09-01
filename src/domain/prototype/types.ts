export const BOOK_FORMATS = [
  "BB",
  "PB",
  "HB",
  "Cards",
  "Pack",
  "Slipcase HB",
  "Slipcase PB",
  "Boxset PB",
  "Boxset HB",
] as const;

export type BookFormat = (typeof BOOK_FORMATS)[number];
export type CatalogStatus = "draft" | "open" | "closed" | "archived";
export type Availability = "available" | "unavailable";
export type OrderSource = "preorder" | "ready_stock" | "admin_assisted";
export type DepositRequirement =
  { kind: "fixed"; amount: number } | { kind: "percentage"; value: number } | { kind: "unset" };

export type InvoiceStatus = "issued" | "settled";
export type DepositTransactionType = "credit" | "debit" | "reservation" | "release" | "reversal" | "adjustment";

export type OrderStatus =
  | "submitted"
  | "po_closed"
  | "ordered_to_supplier"
  | "shipped_internationally"
  | "customs"
  | "to_indonesia_warehouse"
  | "at_store"
  | "awaiting_payment"
  | "awaiting_address"
  | "packing"
  | "shipped"
  | "completed"
  | "cancelled";

export interface BookVariant {
  id: string;
  format: BookFormat;
  isbn: string;
  price: number;
  currency: "IDR";
  availability: Availability;
}

export interface Book {
  id: string;
  title: string;
  publisher: string;
  author?: string | null;
  description?: string | null;
  coverImageUrl?: string | null;
  coverPresentation?: { zoom: number; x: number; y: number } | null;
  gallery?: Array<{ mediaId: string; displayOrder: number; altText: string; url: string }>;
  externalPreview?: { label: string; url: string } | null;
  variants: BookVariant[];
}

export interface SecretCatalog {
  id: string;
  name: string;
  accessCodeHash: string;
  status: CatalogStatus;
  closingAt: string | null;
  estimatedArrivalMonth?: string | null;
  books: Book[];
  titleCount?: number;
  createdAt: string;
}

export interface CatalogAccessOption {
  id: string;
  name: string;
  status: CatalogStatus;
  closingAt: string | null;
  estimatedArrivalMonth?: string | null;
  titleCount?: number;
}

export type Catalog = SecretCatalog;

export interface OrderItem {
  id: string;
  bookId: string;
  bookTitle: string;
  publisher: string;
  variantId: string;
  format: BookFormat;
  isbn: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
}

export interface OrderStatusEvent {
  status: OrderStatus;
  at: string;
}

export interface Order {
  id: string;
  orderCode?: string;
  customerUserId?: string;
  catalogId: string | null;
  customerName: string;
  customerEmail: string | null;
  customerMemberCode?: string | null;
  source: OrderSource;
  items: OrderItem[];
  total: number;
  depositRequirement: DepositRequirement;
  status: OrderStatus;
  statusHistory: OrderStatusEvent[];
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface DepositTransaction {
  id: string;
  type: DepositTransactionType;
  amount: number;
  note: string;
  createdAt: string;
}

export interface Invoice {
  id: string;
  orderId: string;
  customerName: string;
  items: InvoiceItem[];
  total: number;
  depositRequirement: DepositRequirement;
  transactions: DepositTransaction[];
  status: InvoiceStatus;
  createdAt: string;
  updatedAt: string;
}

export interface PrototypeState {
  catalogs: SecretCatalog[];
  orders: Order[];
  invoices: Invoice[];
}

export interface CreateCatalogInput {
  name: string;
  accessCode?: string;
  accessCodeExpiresAt?: string | null;
  closingAt: string | null;
  publisher: string;
  title: string;
  variants: Array<{
    format: BookFormat;
    isbn: string;
    price: number;
  }>;
}

export interface CreateCatalogResult {
  catalog: SecretCatalog;
  accessCode: string;
}

export interface CreateOrderInput {
  customerName: string;
  customerEmail?: string;
  items: Array<{ variantId: string; quantity: number }>;
}
