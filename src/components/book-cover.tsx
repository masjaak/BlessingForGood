"use client";

import { useState } from "react";

function supportedCoverSource(src?: string): string | undefined {
  if (!src) return undefined;
  if (src.startsWith("/") && !src.startsWith("//") && !src.startsWith("/\\")) return src;
  if (src.startsWith("blob:")) return src;

  try {
    const url = new URL(src);
    if (url.protocol !== "https:" || url.username || url.password) return undefined;
    if (url.hostname.endsWith(".convex.cloud") && url.pathname.startsWith("/api/storage/")) return src;
    if (url.hostname === "media.blessingforgood.com" || url.hostname === "pub-726660f62a4443c99263aff51b169a30.r2.dev")
      return src;
    // Legacy presigned GET URLs when R2_PUBLIC_BASE_URL was not configured.
    if (
      /^[a-f0-9]{32}\.r2\.cloudflarestorage\.com$/.test(url.hostname) &&
      url.pathname.startsWith("/bfg-public-media/")
    )
      return src;
  } catch {
    return undefined;
  }
  return undefined;
}

export function BookCover({
  title,
  publisher,
  format,
  src,
  alt,
}: {
  title: string;
  publisher: string;
  format?: string;
  src?: string;
  alt?: string;
}) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const imageSource = supportedCoverSource(src);
  const showImage = Boolean(imageSource) && failedSource !== imageSource;

  return (
    <div className={`book-cover${showImage ? "" : " is-empty"}`}>
      {showImage ? (
        // Convex and public R2 images are served from explicit trusted HTTPS hosts.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className="book-cover-image"
          src={imageSource}
          alt={alt || `${title} cover`}
          loading="lazy"
          decoding="async"
          onError={() => setFailedSource(imageSource ?? null)}
        />
      ) : (
        <div className="book-cover-fallback" role="img" aria-label={`Cover placeholder for ${title}`}>
          <span className="book-cover-format">{format || "Buku"}</span>
          <strong>{title}</strong>
          <span>{publisher}</span>
        </div>
      )}
    </div>
  );
}
