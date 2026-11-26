import type { Metadata } from "next";
import { Search } from "lucide-react";
import { ScreenHeader } from "@/components/app-shell/screen-header";
import { EmptyState } from "@/components/empty-state";

export const metadata: Metadata = { title: "Buscar" };

export default function BuscarPage() {
  return (
    <>
      <ScreenHeader title="Buscar" />
      <EmptyState
        icon={Search}
        title="Encuentra tu próxima lectura"
        description="Busca por título, autor o ISBN y añade libros a tu estantería."
      />
    </>
  );
}
