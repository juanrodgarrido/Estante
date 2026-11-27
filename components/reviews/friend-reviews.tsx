"use client";

import { useState } from "react";
import Link from "next/link";
import { Star } from "lucide-react";
import { Avatar } from "@/components/profile/avatar";
import { cn } from "@/lib/utils";
import type { FriendReview } from "@/types/review";

const DATE = new Intl.DateTimeFormat("es", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Madrid" });
const LONG_TEXT = 280;

function Stars({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={`${value} de 5 estrellas`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          aria-hidden
          className={cn("size-4", star <= value ? "fill-primary text-primary" : "text-muted-foreground/40")}
        />
      ))}
    </span>
  );
}

function ReviewText({ text, hasSpoilers }: { text: string; hasSpoilers: boolean }) {
  const [revealed, setRevealed] = useState(!hasSpoilers);
  const [expanded, setExpanded] = useState(false);
  const long = text.length > LONG_TEXT || text.split("\n").length > 5;

  return (
    <div className="mt-2">
      {hasSpoilers && !revealed ? (
        <div className="relative">
          <p aria-hidden className="line-clamp-3 select-none whitespace-pre-line break-words text-base blur-sm">
            {text}
          </p>
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-center">
            <span className="text-xs font-medium">Contiene spoilers</span>
            <button
              type="button"
              onClick={() => setRevealed(true)}
              className="flex h-11 items-center rounded-full border border-border bg-card px-4 text-sm font-medium shadow-sm active:scale-[0.97]"
            >
              Mostrar
            </button>
          </div>
        </div>
      ) : (
        <>
          <p
            className={cn(
              "whitespace-pre-line text-pretty break-words text-base leading-relaxed",
              long && !expanded && "line-clamp-5",
            )}
          >
            {text}
          </p>
          {long ? (
            <button
              type="button"
              aria-expanded={expanded}
              onClick={() => setExpanded((value) => !value)}
              className="flex h-11 items-center text-sm font-medium text-primary"
            >
              {expanded ? "Leer menos" : "Leer más"}
            </button>
          ) : null}
        </>
      )}
    </div>
  );
}

/** «Lo que opinan tus amigos»: la lista ya llega filtrada por amistad desde el servidor. */
export function FriendReviews({ reviews }: { reviews: FriendReview[] }) {
  if (reviews.length === 0) return null;
  return (
    <section aria-labelledby="opinan-amigos" className="mt-8">
      <h3 id="opinan-amigos" className="font-display mb-2 text-xl font-semibold">
        Lo que opinan tus amigos
      </h3>
      <ul className="space-y-3">
        {reviews.map((item) => (
          <li key={item.user.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-3">
              <Link href={`/u/${item.user.username}`} aria-label={`Perfil de ${item.user.name}`} className="shrink-0">
                <Avatar name={item.user.name} image={item.user.image} size={40} />
              </Link>
              <div className="min-w-0 flex-1">
                <Link href={`/u/${item.user.username}`} className="block truncate font-semibold">
                  {item.user.name}
                </Link>
                <div className="flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
                  {item.rating ? <Stars value={item.rating} /> : null}
                  <time dateTime={item.date}>{DATE.format(new Date(item.date))}</time>
                </div>
              </div>
            </div>
            {item.review ? <ReviewText text={item.review.text} hasSpoilers={item.review.hasSpoilers} /> : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
