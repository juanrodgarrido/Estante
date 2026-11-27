"use client";

import { useState, useTransition } from "react";
import { setReviewAction } from "@/server/shelf/actions";
import { REVIEW_MAX_LENGTH } from "@/types/review";
import { ReviewFields } from "./review-fields";

/** Formulario para escribir o editar la reseña de un libro leído. */
export function ReviewEditor({
  bookId,
  initial,
  onDone,
}: {
  bookId: string;
  initial?: { text: string; hasSpoilers: boolean };
  onDone: () => void;
}) {
  const [value, setValue] = useState({ text: initial?.text ?? "", hasSpoilers: initial?.hasSpoilers ?? false });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const empty = value.text.trim().length === 0;
  const tooLong = value.text.trim().length > REVIEW_MAX_LENGTH;

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await setReviewAction({ bookId, ...value });
      if (result.ok) onDone();
      else setError(result.error);
    });
  }

  return (
    <div className="space-y-3">
      <ReviewFields {...value} onChange={setValue} disabled={pending} />
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onDone}
          disabled={pending}
          className="h-11 rounded-full border border-border bg-card text-base font-medium transition-transform active:scale-[0.97] disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={save}
          disabled={pending || empty || tooLong}
          className="h-11 rounded-full bg-primary text-base font-medium text-primary-foreground transition-transform active:scale-[0.97] disabled:opacity-50"
        >
          {pending ? "Guardando…" : "Guardar reseña"}
        </button>
      </div>
    </div>
  );
}
