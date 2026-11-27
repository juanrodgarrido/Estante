"use client";

import { useOptimistic, useState, useTransition } from "react";
import { Check, PenLine } from "lucide-react";
import { ReviewEditor } from "@/components/reviews/review-editor";
import { cn } from "@/lib/utils";
import {
  removeFromShelfAction,
  setRatingAction,
  setShelfStatusAction,
} from "@/server/shelf/actions";
import { SHELF_LABELS, SHELF_STATUSES, type ShelfState, type ShelfStatus } from "@/types/shelf";
import { ReadingProgress } from "./reading-progress";
import { SHELF_ICONS } from "./shelf-icons";
import { StarRating } from "./star-rating";

type Change =
  | { type: "status"; status: ShelfStatus }
  | { type: "rating"; rating: number | null }
  | { type: "remove" };

type Move = Exclude<Change, { type: "rating" }>;

function reduce(state: ShelfState | null, change: Change): ShelfState | null {
  if (change.type === "remove") return null;
  if (change.type === "rating") return state ? { ...state, rating: change.rating ?? undefined } : state;
  if (state?.status === change.status) return state;
  return { status: change.status };
}

/** Selector de estantería de la ficha: añadir, mover, valorar y quitar, con cambios optimistas. */
export function ShelfControl({
  bookId,
  pageCount,
  initial,
}: {
  bookId: string;
  pageCount?: number;
  initial: ShelfState | null;
}) {
  const [state, apply] = useOptimistic(initial, reduce);
  const [error, setError] = useState<string | null>(null);
  const [editingReview, setEditingReview] = useState(false);
  /** Movimiento pendiente de confirmar: sacar de Leídos un libro con reseña la borra. */
  const [confirming, setConfirming] = useState<Move | null>(null);
  const [, startTransition] = useTransition();

  function run(change: Change, action: () => ReturnType<typeof setShelfStatusAction>) {
    setError(null);
    startTransition(async () => {
      apply(change);
      const result = await action();
      if (!result.ok) setError(result.error);
    });
  }

  /** Lanza el cambio, o pide confirmación si se perdería la reseña. */
  function move(change: Move) {
    if (state?.status === "read" && state.review && !(change.type === "status" && change.status === "read")) {
      setConfirming(change);
      return;
    }
    perform(change, false);
  }

  function perform(change: Move, discardReview: boolean) {
    setConfirming(null);
    if (change.type === "remove") {
      run(change, () => removeFromShelfAction({ bookId, discardReview }));
    } else {
      run(change, () => setShelfStatusAction({ bookId, status: change.status, discardReview }));
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-center text-sm text-muted-foreground">
        {state ? "En tu estantería" : "Añádelo a tu estantería"}
      </p>
      <div role="group" aria-label="Estantería" className="grid grid-cols-3 gap-2">
        {SHELF_STATUSES.map((status) => {
          const active = state?.status === status;
          const Icon = SHELF_ICONS[status];
          return (
            <button
              key={status}
              type="button"
              aria-pressed={active}
              onClick={() => {
                if (active) return;
                move({ type: "status", status });
              }}
              className={cn(
                "flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl border px-2 py-2 text-sm font-medium shadow-sm transition-[background-color,color,transform] active:scale-[0.97]",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground hover:bg-muted",
              )}
            >
              {active ? <Check className="size-5" aria-hidden /> : <Icon className="size-5 text-primary" aria-hidden />}
              {SHELF_LABELS[status]}
            </button>
          );
        })}
      </div>

      {state?.status === "reading" ? (
        <ReadingProgress
          bookId={bookId}
          currentPage={state.currentPage}
          pageCount={pageCount}
          className="rounded-xl border border-border bg-card p-4"
        />
      ) : null}

      {state?.status === "read" ? (
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-sm text-muted-foreground">
            {state.rating ? "Tu valoración" : "¿Qué nota le das? (opcional)"}
          </p>
          <StarRating
            value={state.rating}
            onChange={(rating) => run({ type: "rating", rating }, () => setRatingAction({ bookId, rating }))}
            className="mt-1"
          />
          {editingReview ? (
            <div className="mt-3 border-t border-border pt-3">
              <ReviewEditor bookId={bookId} initial={state.review} onDone={() => setEditingReview(false)} />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setEditingReview(true)}
              className="mx-auto mt-1 flex h-11 items-center gap-2 rounded-full px-4 text-sm font-medium text-primary hover:bg-muted"
            >
              <PenLine className="size-4" aria-hidden />
              {state.review ? "Editar reseña" : "Escribir reseña"}
            </button>
          )}
        </div>
      ) : null}

      {confirming ? (
        <div role="alertdialog" aria-label="Confirmar" className="space-y-2 rounded-xl border border-destructive/40 bg-card p-4 text-center">
          <p className="text-base">
            {confirming.type === "remove"
              ? "Al quitarlo de tu estantería perderás tu nota y tu reseña."
              : "Al sacarlo de Leídos perderás tu nota y tu reseña."}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setConfirming(null)}
              className="h-11 rounded-full border border-border bg-card text-base font-medium active:scale-[0.97]"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => perform(confirming, true)}
              className="h-11 rounded-full bg-destructive text-base font-medium text-white active:scale-[0.97]"
            >
              Continuar
            </button>
          </div>
        </div>
      ) : null}

      {state ? (
        <button
          type="button"
          onClick={() => move({ type: "remove" })}
          className="mx-auto flex h-11 items-center rounded-full px-4 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
        >
          Quitar de mi estantería
        </button>
      ) : null}

      {error ? (
        <p role="alert" className="text-center text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
