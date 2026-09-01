"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { BookCover } from "@/components/book-cover";
import { BFGSelect } from "@/components/bfg-select";
import {
  Card,
  EmptyState,
  Field,
  LoadingRegion,
  Money,
  PageHeader,
  Skeleton,
  SkeletonCard,
  StatusBadge,
} from "@/components/ui";
import { useProduct } from "@/domain/prototype/store";
import type { BookFormat } from "@/domain/prototype/types";
import type { PublicReadyStockList } from "@/lib/seo";

type Sort = "newest" | "title" | "price";

function ReadyStockResults({ initialResult }: { initialResult?: PublicReadyStockList }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [publisherId, setPublisherId] = useState("");
  const [format, setFormat] = useState<BookFormat | "">("");
  const [sort, setSort] = useState<Sort>("newest");
  const liveResult = useQuery(api.readyStock.list, {
    search: search || undefined,
    category: category || undefined,
    publisherId: publisherId ? (publisherId as Id<"publishers">) : undefined,
    format: format || undefined,
    sort,
  });
  const useInitialResult = !search && !category && !publisherId && !format && sort === "newest";
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
            placeholder="Judul, penerbit, atau ISBN"
          />
        </Field>
        {result.filters.categories.length ? (
          <Field label="Kategori">
            <BFGSelect value={category} onChange={(event) => setCategory(event.target.value)}>
              <option value="">Semua kategori</option>
              {result.filters.categories.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </BFGSelect>
          </Field>
        ) : null}
        {result.filters.publishers.length ? (
          <Field label="Penerbit">
            <BFGSelect value={publisherId} onChange={(event) => setPublisherId(event.target.value)}>
              <option value="">Semua penerbit</option>
              {result.filters.publishers.map((publisher) => (
                <option value={publisher.id} key={publisher.id}>
                  {publisher.name}
                </option>
              ))}
            </BFGSelect>
          </Field>
        ) : null}
        {result.filters.formats.length ? (
          <Field label="Format">
            <BFGSelect
              className="select"
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
          {result.items.map((book) => (
            <Link className="ready-stock-card" href={`/ready-stock/${book.slug}`} key={book.bookId}>
              <BookCover
                title={book.title}
                publisher={book.publisher.name}
                format={book.variants[0]?.format}
                src={book.coverImageUrl || undefined}
                alt={`Cover ${book.title}${book.author ? ` by ${book.author}` : ""}`}
              />
              <div className="ready-stock-copy">
                <StatusBadge tone="positive">Ready Stock · {book.totalStock} tersedia</StatusBadge>
                <h2>{book.title}</h2>
                <p>{book.author || book.publisher.name}</p>
                <strong className="money">
                  <Money amount={book.minPrice} />
                  {book.maxPrice !== book.minPrice ? " – " : ""}
                  {book.maxPrice !== book.minPrice ? <Money amount={book.maxPrice} /> : null}
                </strong>
                <span className="subtle">{book.variants.map((variant) => variant.format).join(" · ")}</span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState
          title="Ready Stock belum tersedia."
          description={
            search || category || publisherId || format
              ? "Tidak ada buku yang cocok dengan pencarian atau filter ini."
              : "Katalog publik akan tampil di sini saat stok tersedia."
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
        description="Temukan judul, format, harga, dan stok yang dapat dipesan langsung melalui BFG."
      />
      {dataSource === "convex" ? (
        <ReadyStockResults initialResult={initialResult} />
      ) : (
        <EmptyState
          title="Ready Stock belum tersedia."
          description="Belum ada buku Ready Stock yang dapat ditampilkan."
        />
      )}
    </div>
  );
}
