"use client";

import { useState } from "react";

export type ProductGalleryImage = {
  mediaId: string;
  url: string;
  altText: string;
  displayOrder: number;
};

export function ProductGallery({ title, images }: { title: string; images: ProductGalleryImage[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  if (!images.length) return <p className="subtle product-gallery-empty">Belum ada gambar tambahan.</p>;

  const currentIndex = Math.min(activeIndex, images.length - 1);
  const current = images[currentIndex];
  return (
    <section className="product-gallery" aria-label={`Galeri produk ${title}`}>
      <div className="product-gallery-stage">
        {/* Signed Convex URLs are deployment-specific, so this stays on the existing safe image boundary. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={current.url} alt={current.altText || `${title} gambar produk`} />
      </div>
      {images.length > 1 ? (
        <div className="product-gallery-controls">
          <button
            aria-label="Gambar galeri sebelumnya"
            className="button button-secondary button-size-compact"
            disabled={currentIndex === 0}
            onClick={() => setActiveIndex((index) => Math.max(0, index - 1))}
            type="button"
          >
            ←
          </button>
          <div className="product-gallery-thumbnails" role="list" aria-label="Pilih gambar galeri">
            {images.map((image, index) => (
              <button
                aria-label={`Tampilkan gambar ${index + 1}`}
                aria-pressed={index === currentIndex}
                className={`product-gallery-thumbnail${index === currentIndex ? " is-active" : ""}`}
                key={image.mediaId}
                onClick={() => setActiveIndex(index)}
                type="button"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.url} alt="" role="presentation" />
              </button>
            ))}
          </div>
          <button
            aria-label="Gambar galeri berikutnya"
            className="button button-secondary button-size-compact"
            disabled={currentIndex === images.length - 1}
            onClick={() => setActiveIndex((index) => Math.min(images.length - 1, index + 1))}
            type="button"
          >
            →
          </button>
        </div>
      ) : null}
    </section>
  );
}
