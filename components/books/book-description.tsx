"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

const COLLAPSE_AFTER = 420;

/** Descripción en texto plano (ya saneada en el servidor), con «Leer más» si es larga. */
export function BookDescription({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const long = text.length > COLLAPSE_AFTER;

  return (
    <div>
      <div className={cn("space-y-3 text-base leading-relaxed", long && !expanded && "line-clamp-6")}>
        {text.split(/\n{2,}/).map((paragraph, index) => (
          <p key={index} className="whitespace-pre-line text-pretty">
            {paragraph}
          </p>
        ))}
      </div>
      {long ? (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          className="mt-1 flex min-h-11 items-center font-medium text-primary"
        >
          {expanded ? "Leer menos" : "Leer más"}
        </button>
      ) : null}
    </div>
  );
}
