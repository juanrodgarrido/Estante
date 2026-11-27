"use client";

import { useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { BookCover } from "@/components/books/book-cover";
import { ReviewFields } from "@/components/reviews/review-fields";
import { setShelfStatusAction } from "@/server/shelf/actions";
import { REVIEW_MAX_LENGTH } from "@/types/review";
import type { ShelfEntry } from "@/types/shelf";
import { ReadingProgress } from "./reading-progress";
import { StarRating } from "./star-rating";

/** Tarjeta de «Leyendo ahora»: progreso, página rápida y paso a Leídos (con nota opcional). */
export function ReadingCard({ entry }: { entry: ShelfEntry }) {
  const [finished, setFinished] = useOptimistic(false, (_: boolean, next: boolean) => next);
  const [finishing, setFinishing] = useState(false);
  const [rating, setRating] = useState<number | null>(null);
  const [review, setReview] = useState({ text: "", hasSpoilers: false });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (finished) return null;

  const reviewText = review.text.trim();
  const tooLong = reviewText.length > REVIEW_MAX_LENGTH;

  function save() {
    setError(null);
    startTransition(async () => {
      setFinished(true);
      const result = await setShelfStatusAction({
        bookId: entry.bookId,
        status: "read",
        ...(rating ? { rating } : {}),
        ...(reviewText ? { review: { text: reviewText, hasSpoilers: review.hasSpoilers } } : {}),
      });
      if (!result.ok) setError(result.error);
    });
  }

  const href = `/libro/${entry.publicId}`;

  return (
    <li className="rounded-xl border border-border bg-card p-4">
      <div className="flex gap-4">
        <Link href={href} aria-label={`Abrir ${entry.title}`} className="shrink-0">
          <BookCover title={entry.title} author={entry.authors[0]} coverUrl={entry.coverUrl} />
        </Link>
        <div className="min-w-0 flex-1">
          <Link href={href} className="font-display line-clamp-2 text-lg font-semibold leading-snug">
            {entry.title}
          </Link>
          {entry.authors.length > 0 ? (
            <p className="mt-0.5 truncate text-sm text-muted-foreground">{entry.authors.join(", ")}</p>
          ) : null}
        </div>
      </div>

      <ReadingProgress
        bookId={entry.bookId}
        currentPage={entry.currentPage}
        pageCount={entry.pageCount}
        className="mt-4"
        onReachEnd={() => setFinishing(true)}
      />

      {finishing ? (
        <div className="mt-4 rounded-xl bg-secondary/60 p-4 text-center">
          <p className="font-display text-lg font-semibold">¡Libro terminado!</p>
          <p className="text-sm text-muted-foreground">¿Qué nota le das? (opcional)</p>
          <StarRating value={rating ?? undefined} onChange={setRating} className="mt-1" />
          <ReviewFields {...review} onChange={setReview} disabled={pending} className="mt-2" />
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setFinishing(false)}
              className="h-11 rounded-full border border-border bg-card text-base font-medium transition-transform active:scale-[0.97]"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={pending || tooLong}
              onClick={save}
              className="h-11 rounded-full bg-primary text-base font-medium text-primary-foreground transition-transform active:scale-[0.97] disabled:opacity-50"
            >
              Guardar en Leídos
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setFinishing(true)}
          className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-full bg-secondary text-base font-medium text-secondary-foreground transition-transform active:scale-[0.97]"
        >
          <Check className="size-5" aria-hidden />
          Lo he terminado
        </button>
      )}

      {error ? (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </li>
  );
}
