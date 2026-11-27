"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";
import { REVIEW_MAX_LENGTH } from "@/types/review";

/** Campo de reseña con contador y casilla de spoilers (controlado por quien lo usa). */
export function ReviewFields({
  text,
  hasSpoilers,
  onChange,
  disabled,
  className,
}: {
  text: string;
  hasSpoilers: boolean;
  onChange: (value: { text: string; hasSpoilers: boolean }) => void;
  disabled?: boolean;
  className?: string;
}) {
  const id = useId();
  const over = text.length - REVIEW_MAX_LENGTH;

  return (
    <div className={cn("space-y-3 text-left", className)}>
      <div>
        <label htmlFor={`${id}-text`} className="mb-1.5 block text-sm font-medium">
          Escribe tu reseña
        </label>
        <textarea
          id={`${id}-text`}
          value={text}
          disabled={disabled}
          rows={5}
          maxLength={REVIEW_MAX_LENGTH + 200}
          placeholder="¿Qué te ha parecido? (opcional)"
          onChange={(event) => onChange({ text: event.target.value, hasSpoilers })}
          className="block w-full resize-y rounded-xl border border-input bg-background px-3 py-2.5 text-base leading-snug outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 disabled:opacity-60"
        />
        <p
          aria-live="polite"
          className={cn("mt-1 text-right text-xs tabular-nums", over > 0 ? "text-destructive" : "text-muted-foreground")}
        >
          {over > 0 ? `Sobran ${over} ${over === 1 ? "carácter" : "caracteres"}` : `${text.length} / ${REVIEW_MAX_LENGTH}`}
        </p>
      </div>
      <label className="flex min-h-11 cursor-pointer items-center gap-3 text-base">
        <input
          type="checkbox"
          checked={hasSpoilers}
          disabled={disabled}
          onChange={(event) => onChange({ text, hasSpoilers: event.target.checked })}
          className="size-5 shrink-0 accent-primary"
        />
        Contiene spoilers
      </label>
    </div>
  );
}
