const CANONICAL_INVOICE_REFERENCE = /^BFG-INV-\d{6}-[0-9A-Z]{4}$/;

export function invoiceReference(value: string): string {
  const reference = value.trim().toUpperCase();
  return CANONICAL_INVOICE_REFERENCE.test(reference) ? reference : "Referensi invoice lama";
}
