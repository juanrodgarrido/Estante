"use client";

import { useEffect } from "react";

/**
 * Workaround para iOS en modo standalone: con `black-translucent` la ventana
 * (`innerHeight`) llega a medir la pantalla menos la safe area superior, y un
 * elemento `fixed; bottom: 0` queda ese hueco por encima del borde inferior.
 * Se mide el hueco y se publica en `--viewport-gap` (0px si no aplica).
 */
export function ViewportGap() {
  useEffect(() => {
    const root = document.documentElement;
    const probe = document.createElement("div");
    probe.style.cssText =
      "position:fixed;visibility:hidden;pointer-events:none;padding-top:env(safe-area-inset-top)";
    document.body.appendChild(probe);

    const update = () => {
      const safeTop = parseFloat(getComputedStyle(probe).paddingTop) || 0;
      const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (navigator as Navigator & { standalone?: boolean }).standalone === true;
      const portrait = window.innerHeight > window.innerWidth;
      const gap = screen.height - window.innerHeight;
      // Solo se corrige si el hueco coincide con la safe area superior.
      const apply = standalone && portrait && safeTop > 0 && Math.abs(gap - safeTop) <= 2;
      root.style.setProperty("--viewport-gap", apply ? `${gap}px` : "0px");
    };

    update();
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
      probe.remove();
    };
  }, []);

  return null;
}
