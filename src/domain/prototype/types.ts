export const BOOK_FORMATS = ["BB", "PB", "HB"] as const;

export type BookFormat = (typeof BOOK_FORMATS)[number];
export type CatalogStatus = "open" | "closed";
export type Availability = "available" | "unavailable";
export type OrderSource = "preorder" | "ready_stock";
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
  variants: BookVariant[];
}

export interface SecretCatalog {
  id: string;
  name: string;
  accessCodeHash: string;
  status: CatalogStatus;
  closingAt: string | null;
  books: Book[];
  createdAt: string;
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
  catalogId: string;
  customerName: string;
  customerEmail: string | null;
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
  accessCode: string;
  closingAt: string | null;
  publisher: string;
  title: string;
  variants: Array<{
    format: BookFormat;
    isbn: string;
    price: number;
  }>;
}

export interface CreateOrderInput {
  customerName: string;
  customerEmail?: string;
  items: Array<{ variantId: string; quantity: number }>;
}
