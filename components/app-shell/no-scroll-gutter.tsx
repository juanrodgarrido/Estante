"use client";

import { useLayoutEffect } from "react";

/**
 * Pantallas `fixed` sin scroll de página (la sala de chat): quitan la reserva del hueco de la barra
 * de scroll de `globals.css` mientras están a la vista. Con <Activity> el efecto se desmonta al
 * ocultarse la pantalla, así que al volver a las pestañas el hueco se reserva de nuevo.
 */
export function NoScrollGutter() {
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.dataset.fullscreen = "";
    return () => {
      delete root.dataset.fullscreen;
    };
  }, []);
  return null;
}
