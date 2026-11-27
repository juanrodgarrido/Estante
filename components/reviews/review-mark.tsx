import { MessageSquareText } from "lucide-react";

/** Marca pequeña en la esquina superior derecha de una portada: el libro tiene reseña. Va dentro de un contenedor `relative`. */
export function ReviewMark() {
  return (
    <span
      role="img"
      aria-label="Con reseña"
      style={{ position: "absolute", top: 4, right: 4 }}
      className="flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm ring-1 ring-black/20"
    >
      <MessageSquareText className="size-3.5" aria-hidden />
    </span>
  );
}
