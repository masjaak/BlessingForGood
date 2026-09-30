"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../convex/_generated/api";
import { BookCover } from "@/components/book-cover";
import { BFGSelect } from "@/components/bfg-select";
import { Card, EmptyState, Field, LoadingRegion, Money, PageHeader, Skeleton, SkeletonCard, StatusBadge } from "@/components/ui";
import { useProduct } from "@/domain/prototype/store";
import type { BookFormat } from "@/domain/prototype/types";
import type { PublicReadyStockList } from "@/lib/seo";

type Sort = "newest" | "title" | "price";

function ReadyStockResults({ initialResult }: { initialResult?: PublicReadyStockList }) {
  const [search, setSearch] = useState("");
  const [format, setFormat] = useState<BookFormat | "">("");
  const [sort, setSort] = useState<Sort>("newest");
  const liveResult = useQuery(api.readyStockManual.list, {
    search: search || undefined,
    format: format || undefined,
    sort,
  });
  const useInitialResult = !search && !format && sort === "newest";
  const result = liveResult === undefined && useInitialResult ? initialResult : liveResult;

  if (result === undefined) {
    return (
      <LoadingRegion label="Memuat Ready Stock">
        <Card className="skeleton-card">
          <Skeleton className="skeleton-control" />
          <Skeleton className="skeleton-control" />
          <Skeleton className="skeleton-control" />
        </Card>
        <SkeletonCard variant="book" />
        <SkeletonCard variant="book" />
      </LoadingRegion>
    );
  }

  return (
    <>
      <Card className="ready-stock-controls">
        <Field label="Cari buku">
          <input
            className="input"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari judul Ready Stock"
          />
        </Field>
        {result.filters.formats.length ? (
          <Field label="Format">
            <BFGSelect
              value={format}
              onChange={(event) => setFormat(event.target.value as BookFormat | "")}
            >
              <option value="">Semua format</option>
              {result.filters.formats.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </BFGSelect>
          </Field>
        ) : null}
        <Field label="Urutkan">
          <BFGSelect name="sort" value={sort} onChange={(event) => setSort(event.target.value as Sort)}>
            <option value="newest">Terbaru</option>
            <option value="title">Judul</option>
            <option value="price">Harga</option>
          </BFGSelect>
        </Field>
      </Card>

      {result.items.length ? (
        <div className="ready-stock-grid" aria-live="polite">
          {result.items.map((item) => (
            <Link className="ready-stock-card" href={`/ready-stock/${item.slug}`} key={item.listingId}>
              <BookCover
                title={item.title}
                publisher="Ready Stock BFG"
                format={item.format}
                src={item.coverUrl || undefined}
                alt={`Foto Ready Stock ${item.title}`}
              />
              <div className="ready-stock-copy">
                <StatusBadge tone="positive">Ready Stock · {item.availableQuantity} tersedia</StatusBadge>
                <h2>{item.title}</h2>
                <strong className="money">
                  <Money amount={item.priceAmount} />
                </strong>
                <span className="subtle">{item.format}</span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState
          title="Ready Stock belum tersedia."
          description={
            search || format
              ? "Tidak ada buku yang cocok dengan pencarian atau filter ini."
              : "Etalase Ready Stock akan tampil di sini setelah Admin menerbitkan stok."
          }
        />
      )}
    </>
  );
}

export function ReadyStockCatalog({ initialResult }: { initialResult?: PublicReadyStockList }) {
  const { dataSource } = useProduct();
  return (
    <div className="page ready-stock-page">
      <PageHeader
        eyebrow="Ready Stock"
        title="Buku yang tersedia sekarang."
        description="Lihat foto asli, harga, format, dan stok yang bisa langsung kamu checkout."
      />
      {dataSource === "convex" ? (
        <ReadyStockResults initialResult={initialResult} />
      ) : (
        <EmptyState
          title="Ready Stock belum tersedia."
          description="Belum ada Ready Stock yang dapat ditampilkan."
        />
      )}
    </div>
  );
}
