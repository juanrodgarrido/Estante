import type { Metadata } from "next";
import { WifiOff } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { RetryButton } from "@/components/pwa/retry-button";

export const metadata: Metadata = { title: "Sin conexión" };

export default function OfflinePage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center pt-safe pb-safe">
      <EmptyState
        icon={WifiOff}
        title="Sin conexión"
        description="No hay internet ahora mismo. Tu estantería volverá en cuanto recuperes la conexión."
      />
      <RetryButton />
    </main>
  );
}
