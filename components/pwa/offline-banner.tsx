"use client";

import { useOffline } from "next/offline";
import { WifiOff } from "lucide-react";

export function OfflineBanner() {
  const isOffline = useOffline();
  if (!isOffline) return null;
  return (
    <div
      role="status"
      className="fixed inset-x-0 top-0 z-50 flex items-center justify-center gap-2 bg-foreground px-gutter pb-2 pt-[calc(var(--safe-top)+0.5rem)] text-sm font-medium text-background animate-in fade-in slide-in-from-top-2"
    >
      <WifiOff className="size-4 shrink-0" aria-hidden />
      Sin conexión. Lo pendiente se enviará al volver.
    </div>
  );
}
