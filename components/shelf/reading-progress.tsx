"use client";

import { useOptimistic, useState, useTransition } from "react";
import { setProgressAction } from "@/server/shelf/actions";
import { cn } from "@/lib/utils";
import { percentOf } from "@/lib/shelf";

type ReadingProgressProps = {
  bookId: string;
  currentPage?: number;
  pageCount?: number;
  className?: string;
  /** Se llama tras guardar la última página del libro. */
  onReachEnd?: () => void;
};

/** Barra de progreso y formulario para actualizar la página actual (optimista). */
export function ReadingProgress({ bookId, currentPage, pageCount, className, onReachEnd }: ReadingProgressProps) {
  const [optimisticPage, setOptimisticPage] = useOptimistic(currentPage);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const percent = percentOf(optimisticPage, pageCount);

  function submit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const page = Number(draft);
    if (draft.trim() === "" || !Number.isInteger(page) || page < 0) {
      setError("Escribe un número de página válido");
      return;
    }
    if (pageCount && page > pageCount) {
      setError(`Este libro tiene ${pageCount} páginas`);
      return;
    }
    setError(null);
    startTransition(async () => {
      setOptimisticPage(page);
      setDraft("");
      const result = await setProgressAction({ bookId, currentPage: page });
      if (!result.ok) setError(result.error);
      else if (pageCount && page >= pageCount) onReachEnd?.();
    });
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div>
        <div className="flex items-baseline justify-between text-sm text-muted-foreground">
          <span>
            {percent === 100 ? "¡Has llegado al final!" : `Página ${optimisticPage ?? 0}${pageCount ? ` de ${pageCount}` : ""}`}
          </span>
          {percent !== null ? <span className="font-medium text-foreground">{percent} %</span> : null}
        </div>
        {percent !== null ? (
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            aria-label="Progreso de lectura"
            className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted"
          >
            <div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${percent}%` }} />
          </div>
        ) : null}
      </div>
      <form onSubmit={submit} className="flex gap-2">
        <input
          type="number"
          inputMode="numeric"
          min={0}
          max={pageCount}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Página actual"
          aria-label="Página actual"
          className="h-11 min-w-0 flex-1 rounded-full border border-border bg-card px-4 text-base outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        />
        <button
          type="submit"
          disabled={pending || draft.trim() === ""}
          className="h-11 shrink-0 rounded-full bg-secondary px-5 text-base font-medium text-secondary-foreground transition-transform active:scale-[0.97] disabled:opacity-50"
        >
          Guardar
        </button>
      </form>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
