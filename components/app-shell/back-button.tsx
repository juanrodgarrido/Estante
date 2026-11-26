"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

/** Vuelve a la pantalla anterior (Inicio, Buscar, Perfil…); sin historial, va a `fallbackHref`. */
export function BackButton({ fallbackHref }: { fallbackHref: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      aria-label="Volver"
      onClick={() => (window.history.length > 1 ? router.back() : router.push(fallbackHref))}
      className="-ml-3 flex size-11 shrink-0 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted active:scale-95"
    >
      <ChevronLeft className="size-6" aria-hidden />
    </button>
  );
}
