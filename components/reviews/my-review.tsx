"use client";

import { useState, useTransition } from "react";
import { PenLine, Trash2 } from "lucide-react";
import { deleteReviewAction } from "@/server/shelf/actions";
import type { Review } from "@/types/review";
import { ReviewEditor } from "./review-editor";

/** «Tu reseña» en la ficha del libro, con edición y borrado. */
export function MyReview({ bookId, review }: { bookId: string; review: Review }) {
  const [mode, setMode] = useState<"view" | "edit" | "confirm">("view");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function remove() {
    setError(null);
    startTransition(async () => {
      const result = await deleteReviewAction({ bookId });
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <section aria-labelledby="tu-resena" className="mt-8">
      <h3 id="tu-resena" className="font-display mb-2 text-xl font-semibold">
        Tu reseña
      </h3>
      {mode === "edit" ? (
        <ReviewEditor bookId={bookId} initial={review} onDone={() => setMode("view")} />
      ) : (
        <div className="rounded-xl border border-border bg-card p-4">
          {review.hasSpoilers ? (
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Contiene spoilers</p>
          ) : null}
          <p className="whitespace-pre-line text-pretty break-words text-base leading-relaxed">{review.text}</p>
          {mode === "confirm" ? (
            <div className="mt-3 space-y-2">
              <p className="text-sm text-muted-foreground">¿Borrar tu reseña? Tu nota se mantiene.</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMode("view")}
                  disabled={pending}
                  className="h-11 rounded-full border border-border bg-card text-base font-medium active:scale-[0.97]"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={remove}
                  disabled={pending}
                  className="h-11 rounded-full bg-destructive text-base font-medium text-white active:scale-[0.97] disabled:opacity-50"
                >
                  {pending ? "Borrando…" : "Borrar"}
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => setMode("edit")}
                className="flex h-11 items-center gap-2 rounded-full border border-border bg-secondary px-5 text-sm font-medium text-secondary-foreground transition-transform active:scale-[0.97]"
              >
                <PenLine className="size-4" aria-hidden />
                Editar
              </button>
              <button
                type="button"
                onClick={() => setMode("confirm")}
                className="flex h-11 items-center gap-2 rounded-full border border-destructive/40 px-5 text-sm font-medium text-destructive transition-[background-color,transform] hover:bg-destructive/10 active:scale-[0.97]"
              >
                <Trash2 className="size-4" aria-hidden />
                Borrar
              </button>
            </div>
          )}
          {error ? (
            <p role="alert" className="mt-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </div>
      )}
    </section>
  );
}
