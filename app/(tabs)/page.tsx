import { BookOpen } from "lucide-react";
import { ScreenHeader } from "@/components/app-shell/screen-header";
import { EmptyState } from "@/components/empty-state";
import { DebugViewport } from "@/components/debug-viewport";

export default function InicioPage() {
  return (
    <>
      <ScreenHeader eyebrow="Tu rincón de lectura" title="Inicio" />
      <EmptyState
        icon={BookOpen}
        title="Aún no estás leyendo nada"
        description="Cuando empieces un libro aparecerá aquí con tu progreso, junto a lo que lean tus amistades."
        action={{ href: "/buscar", label: "Buscar un libro" }}
      />
      <DebugViewport />
    </>
  );
}
