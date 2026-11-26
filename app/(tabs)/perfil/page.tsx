import type { Metadata } from "next";
import Link from "next/link";
import { Library, Settings, Users } from "lucide-react";
import { ScreenHeader } from "@/components/app-shell/screen-header";
import { EmptyState } from "@/components/empty-state";

export const metadata: Metadata = { title: "Perfil" };

const iconLink =
  "flex size-11 items-center justify-center rounded-full transition-colors hover:bg-muted active:scale-95";

export default function PerfilPage() {
  return (
    <>
      <ScreenHeader
        title="Perfil"
        action={
          <>
            <Link href="/amigos" aria-label="Amistades" className={iconLink}>
              <Users className="size-5" aria-hidden />
            </Link>
            <Link href="/ajustes" aria-label="Ajustes" className={iconLink}>
              <Settings className="size-5" aria-hidden />
            </Link>
          </>
        }
      />
      <EmptyState
        icon={Library}
        title="Tu estantería está vacía"
        description="Aquí verás tus libros leídos, los que estás leyendo y los pendientes, con tus estadísticas."
        action={{ href: "/buscar", label: "Añadir mi primer libro" }}
      />
    </>
  );
}
