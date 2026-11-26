import type { Metadata } from "next";
import { BookMarked } from "lucide-react";
import { ScreenHeader } from "@/components/app-shell/screen-header";
import { EmptyState } from "@/components/empty-state";

export const metadata: Metadata = { title: "Libro" };

export default function LibroPage() {
  return (
    <>
      <ScreenHeader title="Libro" backHref="/buscar" />
      <EmptyState
        icon={BookMarked}
        title="Ficha del libro"
        description="Portada, sinopsis y el botón para añadirlo a tu estantería llegarán aquí."
      />
    </>
  );
}
