"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

type BookCoverProps = {
  title: string;
  author?: string;
  coverUrl?: string;
  size?: "sm" | "lg";
  className?: string;
};

const TONES = [
  "bg-primary text-primary-foreground",
  "bg-secondary text-secondary-foreground",
  "bg-accent text-accent-foreground",
  "bg-muted-foreground/80 text-background",
];

function toneFor(title: string): string {
  let hash = 0;
  for (const char of title) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return TONES[hash % TONES.length];
}

/** Portada 2:3 con `next/image`; si no hay imagen (o falla), una cubierta tipográfica. */
export function BookCover({ title, author, coverUrl, size = "sm", className }: BookCoverProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const showImage = coverUrl && failedUrl !== coverUrl;
  const large = size === "lg";

  return (
    <div
      className={cn(
        "relative aspect-[2/3] shrink-0 overflow-hidden rounded-cover bg-muted shadow-md ring-1 ring-foreground/10",
        large ? "w-48 shadow-xl" : "w-16",
        className,
      )}
    >
      {showImage ? (
        <Image
          src={coverUrl}
          alt={`Portada de ${title}`}
          fill
          sizes={large ? "192px" : "64px"}
          priority={large}
          className="object-cover"
          onError={() => setFailedUrl(coverUrl)}
        />
      ) : (
        <div
          role="img"
          aria-label={`Sin portada: ${title}`}
          className={cn(
            "flex size-full flex-col justify-between text-center",
            toneFor(title),
            large ? "p-5" : "p-1.5",
          )}
        >
          <span aria-hidden className="mx-auto h-px w-1/2 bg-current opacity-40" />
          <span
            aria-hidden
            className={cn(
              "font-display font-semibold leading-tight text-balance",
              large ? "line-clamp-5 text-xl" : "line-clamp-4 text-[0.6rem]",
            )}
          >
            {title}
          </span>
          <span aria-hidden className="space-y-1">
            <span className="mx-auto block h-px w-1/2 bg-current opacity-40" />
            {author ? (
              <span className={cn("block truncate opacity-80", large ? "text-xs" : "text-[0.5rem]")}>{author}</span>
            ) : null}
          </span>
        </div>
      )}
      {/* Lomo sutil a la izquierda */}
      <span aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-1.5 bg-gradient-to-r from-foreground/15 to-transparent" />
    </div>
  );
}
