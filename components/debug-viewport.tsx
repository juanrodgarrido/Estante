"use client";

// TEMPORAL: diagnóstico de viewport en iOS standalone. Borrar tras resolver lo de la barra inferior.
import { useEffect, useState } from "react";

function measure(): string[] {
  const probe = document.createElement("div");
  probe.style.cssText =
    "position:fixed;visibility:hidden;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom);padding-left:env(safe-area-inset-left);padding-right:env(safe-area-inset-right)";
  document.body.appendChild(probe);
  const cs = getComputedStyle(probe);
  const nr = document.querySelector("nav")?.getBoundingClientRect();
  const out = [
    `inner: ${window.innerWidth} x ${window.innerHeight}`,
    `screen: ${screen.width} x ${screen.height}`,
    `visualViewport: ${window.visualViewport?.width} x ${window.visualViewport?.height}`,
    `safe T/R/B/L: ${cs.paddingTop} ${cs.paddingRight} ${cs.paddingBottom} ${cs.paddingLeft}`,
    `viewport-gap: ${getComputedStyle(document.documentElement).getPropertyValue("--viewport-gap")}`,
    `nav: top ${nr?.top.toFixed(0)} bottom ${nr?.bottom.toFixed(0)} h ${nr?.height.toFixed(0)}`,
    `standalone: ${window.matchMedia("(display-mode: standalone)").matches} / ${(navigator as Navigator & { standalone?: boolean }).standalone}`,
  ];
  probe.remove();
  return out;
}

export function DebugViewport() {
  const [lines, setLines] = useState<string[]>([]);

  useEffect(() => {
    const id = setTimeout(() => setLines(measure()), 400);
    return () => clearTimeout(id);
  }, []);

  return (
    <pre className="mx-gutter mt-4 whitespace-pre-wrap rounded-lg border border-border bg-card p-3 text-[11px] leading-snug text-muted-foreground">
      {lines.join("\n") || "midiendo…"}
    </pre>
  );
}
