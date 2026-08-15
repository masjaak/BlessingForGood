"use client";

import Image from "next/image";
import { useState } from "react";

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
  const [imageFailed, setImageFailed] = useState(false);
  const localSource = src?.startsWith("/") ? src : undefined;
  const storageSource = /^https:\/\/[^/]+\.convex\.cloud\/api\/storage\//.test(src || "") ? src : undefined;
  const previewSource = src?.startsWith("blob:") ? src : undefined;

  return (
    <div className="book-cover">
      {(storageSource || previewSource) && !imageFailed ? (
        // Convex returns short-lived signed storage URLs whose hostname is deployment-specific.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={storageSource || previewSource} alt={alt || `${title} cover`} onError={() => setImageFailed(true)} />
      ) : localSource && !imageFailed ? (
        <Image
          src={localSource}
          alt={alt || `${title} cover`}
          fill
          sizes="(max-width: 640px) 96px, 132px"
          onError={() => setImageFailed(true)}
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
