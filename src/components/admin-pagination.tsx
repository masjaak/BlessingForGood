"use client";

import { BFGSelect } from "@/components/bfg-select";
import { Button } from "@/components/ui";
import type { AdminCursorPagination } from "@/domain/prototype/pagination";

type PageState = Pick<
  AdminCursorPagination,
  "pageNumber" | "pageSize" | "canGoPrevious" | "next" | "previous" | "setPageSize"
> & {
  rowCount: number;
  isDone: boolean;
  continueCursor: string;
};

export function AdminPagination({
  pageNumber,
  pageSize,
  canGoPrevious,
  rowCount,
  isDone,
  continueCursor,
  next,
  previous,
  setPageSize,
}: PageState) {
  if (!rowCount && !canGoPrevious && isDone) return null;
  const firstRow = rowCount ? (pageNumber - 1) * pageSize + 1 : 0;
  const lastRow = rowCount ? firstRow + rowCount - 1 : 0;
  return (
    <div className="admin-pagination" aria-label="Paginasi">
      <span className="subtle">
        {rowCount ? `Menampilkan ${firstRow}–${lastRow}` : "Tidak ada item pada halaman ini"}
      </span>
      <div className="admin-pagination-controls">
        <Button type="button" variant="secondary" size="compact" disabled={!canGoPrevious} onClick={previous}>
          Sebelumnya
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="compact"
          disabled={isDone || !continueCursor}
          onClick={() => next(continueCursor)}
        >
          Berikutnya
        </Button>
        <label className="admin-pagination-size">
          <span className="subtle">Tampilkan</span>
          <BFGSelect
            aria-label="Jumlah per halaman"
            className="select"
            value={String(pageSize)}
            onChange={(event) => setPageSize(Number(event.target.value))}
          >
            <option value="10">10</option>
            <option value="25">25</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </BFGSelect>
          <span className="subtle">per halaman</span>
        </label>
      </div>
    </div>
  );
}
