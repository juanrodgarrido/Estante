"use client";

import { useEffect, useEffectEvent, type RefObject } from "react";

/**
 * Ajusta un contenedor `fixed` al viewport visual. En iOS el teclado no encoge la
 * ventana: solo el viewport visual, y Safari desplaza la página para enseñar el
 * campo. Siguiendo su alto y su desplazamiento, el campo de texto queda siempre
 * justo encima del teclado. Marca `data-keyboard="open"` mientras el teclado está
 * abierto (la safe area inferior queda tapada y sobra su margen).
 */
export function useVisualViewport(ref: RefObject<HTMLElement | null>, onResize?: () => void) {
  const resized = useEffectEvent(() => onResize?.());
  useEffect(() => {
    const viewport = window.visualViewport;
    const element = ref.current;
    if (!viewport || !element) return;

    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        element.style.height = `${viewport.height}px`;
        element.style.transform = `translateY(${viewport.offsetTop}px)`;
        element.dataset.keyboard = window.innerHeight - viewport.height > 150 ? "open" : "closed";
        resized();
      });
    };

    update();
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    return () => {
      cancelAnimationFrame(frame);
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
    };
  }, [ref]);
}
