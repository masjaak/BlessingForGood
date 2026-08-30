"use client";

import { useCallback, useState } from "react";

export const ADMIN_PAGE_SIZES = [10, 25, 50, 100] as const;
export type AdminPageSize = (typeof ADMIN_PAGE_SIZES)[number];

export function useAdminCursorPagination() {
  const [pageSize, setPageSizeState] = useState<AdminPageSize>(25);
  const [cursor, setCursor] = useState<string | null>(null);
  const [cursorHistory, setCursorHistory] = useState<Array<string | null>>([]);

  const reset = useCallback(() => {
    setCursor(null);
    setCursorHistory([]);
  }, []);

  const setPageSize = useCallback(
    (nextPageSize: number) => {
      if (!ADMIN_PAGE_SIZES.includes(nextPageSize as AdminPageSize)) return;
      setPageSizeState(nextPageSize as AdminPageSize);
      reset();
    },
    [reset],
  );

  const next = useCallback(
    (nextCursor: string) => {
      setCursorHistory((history) => [...history, cursor]);
      setCursor(nextCursor);
    },
    [cursor],
  );

  const previous = useCallback(() => {
    if (!cursorHistory.length) return;
    setCursorHistory(cursorHistory.slice(0, -1));
    setCursor(cursorHistory[cursorHistory.length - 1] ?? null);
  }, [cursorHistory]);

  return {
    pageSize,
    cursor,
    pageNumber: cursorHistory.length + 1,
    canGoPrevious: cursorHistory.length > 0,
    next,
    previous,
    reset,
    setPageSize,
  };
}

export type AdminCursorPagination = ReturnType<typeof useAdminCursorPagination>;
