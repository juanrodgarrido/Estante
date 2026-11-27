"use client";

import { useSyncExternalStore } from "react";

/** ¿Se cumple la media query? En el servidor (y en la hidratación) siempre `false`. */
export function useMediaQuery(query: string | undefined): boolean {
  return useSyncExternalStore(
    (notify) => {
      if (!query) return () => undefined;
      const list = window.matchMedia(query);
      list.addEventListener("change", notify);
      return () => list.removeEventListener("change", notify);
    },
    () => (query ? window.matchMedia(query).matches : true),
    () => !query,
  );
}
