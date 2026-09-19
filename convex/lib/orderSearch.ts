function normalize(value: string): string {
  return value.normalize("NFKC").trim().toLowerCase();
}

function compact(value: string): string {
  return value.replace(/[^a-z0-9]+/g, "");
}

function fragments(value: string): string[] {
  const result = new Set<string>([value]);
  const token = compact(value);
  for (let start = 0; start < token.length; start += 1) {
    for (let end = start + 2; end <= token.length; end += 1) result.add(token.slice(start, end));
  }
  return [...result];
}

export function normalizeOrderSearchQuery(value: string): string {
  return normalize(value);
}

export function buildOrderSearchText(input: {
  orderId: string;
  orderCode?: string;
  customerName: string;
  customerEmail?: string;
  itemTitles: string[];
}): string {
  const values = [input.orderId, input.orderCode, input.customerName, input.customerEmail, ...input.itemTitles].filter(
    (value): value is string => Boolean(value?.trim()),
  );
  const searchableValues = values.flatMap((value) => {
    const normalized = normalize(value);
    const compactValue = compact(normalized);
    return [...fragments(normalized), ...(compactValue && compactValue !== normalized ? fragments(compactValue) : [])];
  });
  return [...new Set(searchableValues)].join(" ");
}
