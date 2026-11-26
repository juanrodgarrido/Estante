"use client";

import { useOptimistic, useState, useTransition } from "react";
import { Check } from "lucide-react";
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
  const [, startTransition] = useTransition();

  function run(change: Change, action: () => ReturnType<typeof setShelfStatusAction>) {
    setError(null);
    startTransition(async () => {
      apply(change);
      const result = await action();
      if (!result.ok) setError(result.error);
    });
  }

  const finish = () => run({ type: "status", status: "read" }, () => setShelfStatusAction({ bookId, status: "read" }));

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
                run({ type: "status", status }, () => setShelfStatusAction({ bookId, status }));
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
        <div className="space-y-3 rounded-xl border border-border bg-card p-4">
          <ReadingProgress bookId={bookId} currentPage={state.currentPage} pageCount={pageCount} onReachEnd={finish} />
          <button
            type="button"
            onClick={finish}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-secondary text-base font-medium text-secondary-foreground transition-transform active:scale-[0.97]"
          >
            <Check className="size-5" aria-hidden />
            Lo he terminado
          </button>
        </div>
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
        </div>
      ) : null}

      {state ? (
        <button
          type="button"
          onClick={() => run({ type: "remove" }, () => removeFromShelfAction({ bookId }))}
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
