import type { Metadata } from "next";
import { Users } from "lucide-react";
import { ScreenHeader } from "@/components/app-shell/screen-header";
import { EmptyState } from "@/components/empty-state";

export const metadata: Metadata = { title: "Amistades" };

export default function AmigosPage() {
  return (
    <>
      <ScreenHeader title="Amistades" backHref="/perfil" />
      <EmptyState
        icon={Users}
        title="Aún no tienes amistades"
        description="Busca a alguien por su @usuario para ver su estantería y chatear sobre libros."
      />
    </>
  );
}
