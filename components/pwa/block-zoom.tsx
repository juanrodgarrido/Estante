"use client";

import { useEffect } from "react";

/**
 * Safari de iOS ignora `user-scalable=no` desde iOS 10 (accesibilidad), así que el
 * zoom con dos dedos hay que cancelarlo a mano: Safari lanza los eventos propios
 * `gesturestart/change/end` al empezar un pellizco y `preventDefault()` los frena.
 */
export function BlockZoom() {
  useEffect(() => {
    const cancel = (event: Event) => event.preventDefault();
    const events = ["gesturestart", "gesturechange", "gestureend"] as const;
    for (const name of events) document.addEventListener(name, cancel, { passive: false });
    return () => {
      for (const name of events) document.removeEventListener(name, cancel);
    };
  }, []);

  return null;
}
