import { Compass } from "lucide-react";
import { EmptyState } from "@/components/empty-state";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center pt-safe pb-safe">
      <EmptyState
        icon={Compass}
        title="Página no encontrada"
        description="Lo que buscas no existe o ya no está disponible."
        action={{ href: "/", label: "Volver al inicio" }}
      />
    </main>
  );
}
