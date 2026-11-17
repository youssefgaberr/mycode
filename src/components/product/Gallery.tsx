"use client";

import { useState } from "react";
import { ProductImage } from "./ProductImage";

type Item = { kind: "image"; src: string } | { kind: "video"; id: string };

/** Accessible image + video gallery: thumbnails are buttons, arrow keys move between them. */
export function Gallery({ title, images, videos }: { title: string; images: string[]; videos: { id: string }[] }) {
  const items: Item[] = [
    ...images.map((src) => ({ kind: "image" as const, src })),
    ...videos.map((v) => ({ kind: "video" as const, id: v.id })),
  ];
  const [index, setIndex] = useState(0);
  const current = items[index];

  if (items.length === 0) {
    return <div className="aspect-square rounded-2xl bg-surface-2" aria-hidden />;
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const next = (index + (e.key === "ArrowRight" ? 1 : -1) + items.length) % items.length;
    setIndex(next);
    (e.currentTarget.parentElement?.children[next] as HTMLElement | undefined)?.focus();
  };

  return (
    <div>
      <div className="relative aspect-square overflow-hidden rounded-2xl border border-border bg-surface-2">
        {current.kind === "image" ? (
          <ProductImage
            src={current.src}
            alt={`${title} — image ${index + 1} of ${images.length}`}
            sizes="(min-width: 1024px) 50vw, 100vw"
            priority={index === 0}
          />
        ) : (
          <video
            key={current.id}
            className="absolute inset-0 size-full bg-black object-contain"
            controls
            playsInline
            preload="metadata"
            poster={images[0]}
            aria-label={`${title} video`}
          >
            <source src={`/api/video/${current.id}`} type="video/mp4" />
            Your browser can&apos;t play this video.
          </video>
        )}
      </div>
      {items.length > 1 && (
        <div role="group" aria-label="Product media" className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {items.map((item, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIndex(i)}
              onKeyDown={onKeyDown}
              aria-label={item.kind === "image" ? `Show image ${i + 1}` : "Play product video"}
              aria-pressed={i === index}
              className={`relative size-16 shrink-0 overflow-hidden rounded-lg border-2 bg-surface-2 sm:size-20 ${
                i === index ? "border-brand" : "border-transparent"
              }`}
            >
              {item.kind === "image" ? (
                <ProductImage src={item.src} alt="" sizes="80px" />
              ) : (
                <span className="absolute inset-0 flex items-center justify-center bg-black/70 text-xs font-bold text-white">
                  ▶ Video
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
