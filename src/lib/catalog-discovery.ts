export type CustomerDiscoveryBook = {
  title: string;
  variants: ReadonlyArray<{ isbn: string }>;
};

export type AdminDiscoveryRecord = {
  title: string;
  publisher?: string | null;
  publisherName?: string | null;
  author?: string | null;
  isbn?: string | null;
  variants?: ReadonlyArray<{ isbn?: string | null }>;
};

export function normalizeDiscoveryQuery(value: string): string {
  return value.trim().toLowerCase();
}

export function normalizeIsbn(value: string): string {
  return value.replace(/[\s-]/g, "").toLowerCase();
}

function matchesText(value: string | null | undefined, query: string): boolean {
  return Boolean(value && value.toLowerCase().includes(query));
}

function matchesIsbn(value: string | null | undefined, query: string): boolean {
  return Boolean(value && normalizeIsbn(value).includes(normalizeIsbn(query)));
}

export function matchesCustomerCatalogBook(book: CustomerDiscoveryBook, query: string): boolean {
  const normalized = normalizeDiscoveryQuery(query);
  if (!normalized) return true;
  return matchesText(book.title, normalized) || book.variants.some((variant) => matchesIsbn(variant.isbn, normalized));
}

export function matchesAdminCatalogRecord(record: AdminDiscoveryRecord, query: string): boolean {
  const normalized = normalizeDiscoveryQuery(query);
  if (!normalized) return true;
  return (
    matchesText(record.title, normalized) ||
    matchesText(record.publisher, normalized) ||
    matchesText(record.publisherName, normalized) ||
    matchesText(record.author, normalized) ||
    matchesIsbn(record.isbn, normalized) ||
    Boolean(record.variants?.some((variant) => matchesIsbn(variant.isbn, normalized)))
  );
}
