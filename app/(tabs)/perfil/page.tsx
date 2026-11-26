import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Library, Settings, Users } from "lucide-react";
import { ScreenHeader } from "@/components/app-shell/screen-header";
import { EmptyState } from "@/components/empty-state";
import { ShelfTabs } from "@/components/shelf/shelf-tabs";
import { getCurrentUser } from "@/server/auth";
import { listShelf } from "@/server/shelf/repository";
import type { ShelfStatus } from "@/types/shelf";

export const metadata: Metadata = { title: "Perfil" };

const iconLink =
  "flex size-11 items-center justify-center rounded-full transition-colors hover:bg-muted active:scale-95";

const TAB_PARAM: Record<string, ShelfStatus> = { leyendo: "reading", pendientes: "want", leidos: "read" };

async function Shelf({ searchParams }: { searchParams: Promise<{ estante?: string | string[] }> }) {
  const user = await getCurrentUser();
  const { estante } = await searchParams;
  const initialTab = (typeof estante === "string" && TAB_PARAM[estante]) || "reading";
  const entries = await listShelf(user.id);
  if (entries.length === 0) {
    return (
      <EmptyState
        icon={Library}
        title="Tu estantería está vacía"
        description="Aquí verás tus libros leídos, los que estás leyendo y los pendientes, con tus estadísticas."
        action={{ href: "/buscar", label: "Añadir mi primer libro" }}
      />
    );
  }
  return <ShelfTabs key={initialTab} entries={entries} initialTab={initialTab} />;
}

export default function PerfilPage({ searchParams }: { searchParams: Promise<{ estante?: string | string[] }> }) {
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
      <Suspense fallback={<div aria-hidden className="mx-gutter h-11 animate-pulse rounded-full bg-muted" />}>
        <Shelf searchParams={searchParams} />
      </Suspense>
    </>
  );
}
