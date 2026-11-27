"use client";

import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";

export function ErrorScreen({ retry }: { retry: () => void }) {
  return (
    <>
      <EmptyState
        icon={AlertCircle}
        title="Algo ha fallado"
        description="No hemos podido cargar esta pantalla. Puede ser un fallo momentáneo; inténtalo de nuevo."
      />
      <div className="flex justify-center pb-10">
        <Button onClick={retry}>Reintentar</Button>
      </div>
    </>
  );
}
