"use client";

import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";

export default function LibroError({ unstable_retry }: { error: Error; unstable_retry: () => void }) {
  return (
    <>
      <EmptyState
        icon={AlertCircle}
        title="No hemos podido cargar el libro"
        description="Puede ser un fallo momentáneo de la fuente de datos. Inténtalo de nuevo."
      />
      <div className="flex justify-center">
        <Button onClick={() => unstable_retry()}>Reintentar</Button>
      </div>
    </>
  );
}
