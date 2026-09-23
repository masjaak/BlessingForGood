"use client";

import { BFGSelect } from "@/components/bfg-select";
import { Button } from "@/components/ui";

type CatalogPaginationProps = {
  pageNumber: number;
  pageSize: 25 | 50 | 100;
  resultCount: number;
  resultText?: string;
  pageCount?: number;
  hidePageCount?: boolean;
  canGoPrevious?: boolean;
  canGoNext?: boolean;
  noun: string;
  onPageNumberChange: (page: number) => void;
  onPageSizeChange: (pageSize: 25 | 50 | 100) => void;
  loading?: boolean;
};

export function CatalogResultToolbar({
  pageNumber,
  pageSize,
  resultCount,
  resultText,
  noun,
  loading = false,
  onPageSizeChange,
}: Pick<
  CatalogPaginationProps,
  "pageNumber" | "pageSize" | "resultCount" | "resultText" | "noun" | "loading" | "onPageSizeChange"
> &
  Partial<Pick<CatalogPaginationProps, "onPageNumberChange">>) {
  const first = resultCount ? (pageNumber - 1) * pageSize + 1 : 0;
  const last = Math.min(pageNumber * pageSize, resultCount);

  return (
    <div className="catalog-result-toolbar">
      <p className="catalog-result-count" role="status" aria-live="polite">
        {loading
          ? "Memuat hasil…"
          : (resultText ?? (resultCount ? `Menampilkan ${first}–${last} dari ${resultCount} ${noun}` : `0 ${noun}`))}
      </p>
      <label className="catalog-page-size">
        <span>Tampilkan</span>
        <BFGSelect
          aria-label={`${noun} per halaman`}
          className="select"
          value={String(pageSize)}
          onChange={(event) => onPageSizeChange(Number(event.target.value) as 25 | 50 | 100)}
        >
          <option value="25">25</option>
          <option value="50">50</option>
          <option value="100">100</option>
        </BFGSelect>
        <span>per halaman</span>
      </label>
    </div>
  );
}

export function CatalogPageNavigation({
  pageNumber,
  pageSize,
  resultCount,
  pageCount: suppliedPageCount,
  hidePageCount = false,
  canGoPrevious: suppliedCanGoPrevious,
  canGoNext: suppliedCanGoNext,
  noun,
  loading = false,
  onPageNumberChange,
}: CatalogPaginationProps) {
  const pageCount = suppliedPageCount ?? Math.ceil(resultCount / pageSize);
  const canGoPrevious = suppliedCanGoPrevious ?? pageNumber > 1;
  const canGoNext = suppliedCanGoNext ?? pageNumber < pageCount;
  if (pageCount <= 1 && !canGoPrevious && !canGoNext && !loading) return null;

  return (
    <nav className="catalog-page-navigation" aria-label={`Navigasi halaman ${noun}`}>
      <Button
        type="button"
        variant="secondary"
        disabled={loading || !canGoPrevious}
        onClick={() => onPageNumberChange(pageNumber - 1)}
      >
        ← Sebelumnya
      </Button>
      <span aria-live="polite" role={loading ? "status" : undefined}>
        {loading ? "Memuat halaman…" : `Halaman ${pageNumber}${hidePageCount ? "" : ` dari ${pageCount}`}`}
      </span>
      <Button
        type="button"
        variant="secondary"
        disabled={loading || !canGoNext}
        onClick={() => onPageNumberChange(pageNumber + 1)}
      >
        Berikutnya →
      </Button>
    </nav>
  );
}
