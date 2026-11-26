"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

/** Cinco estrellas táctiles (44 px). Tocar la estrella ya marcada quita la nota. */
export function StarRating({
  value,
  onChange,
  className,
}: {
  value?: number;
  onChange: (rating: number | null) => void;
  className?: string;
}) {
  return (
    <div role="group" aria-label="Valoración" className={cn("flex justify-center", className)}>
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = (value ?? 0) >= star;
        return (
          <button
            key={star}
            type="button"
            aria-label={`${star} ${star === 1 ? "estrella" : "estrellas"}`}
            aria-pressed={value === star}
            onClick={() => onChange(value === star ? null : star)}
            className="flex size-11 items-center justify-center transition-transform active:scale-90"
          >
            <Star
              className={cn("size-7", filled ? "fill-primary text-primary" : "text-muted-foreground/50")}
              aria-hidden
            />
          </button>
        );
      })}
    </div>
  );
}
