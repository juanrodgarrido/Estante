import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { getCurrentUser } from "@/server/auth";
import { countShelf, listShelf } from "@/server/shelf/repository";
import { CoverRow } from "./cover-row";
import { ReadingCard } from "./reading-card";

const ROW_LIMIT = 12;

/** Inicio: «Leyendo ahora» con progreso, y filas de Pendientes y Leídos recientes. */
export async function ReadingNow() {
  const user = await getCurrentUser();
  const [counts, reading, want, read] = await Promise.all([
    countShelf(user.id),
    listShelf(user.id, "reading"),
    listShelf(user.id, "want", ROW_LIMIT),
    listShelf(user.id, "read", ROW_LIMIT),
  ]);

  return (
    <>
      <section aria-labelledby="leyendo-ahora" className="px-gutter pb-6">
        <h2 id="leyendo-ahora" className="font-display mb-3 text-xl font-semibold">
          Leyendo ahora
        </h2>
        {reading.length > 0 ? (
          <ul className="space-y-4">
            {reading.map((entry) => (
              <ReadingCard key={entry.bookId} entry={entry} />
            ))}
          </ul>
        ) : (
          <div className="rounded-xl border border-dashed border-border p-5 text-center">
            <p className="text-base text-muted-foreground">No estás leyendo nada ahora mismo.</p>
            <Link href="/buscar" className={`${buttonVariants({ variant: "secondary" })} mt-3`}>
              Buscar un libro
            </Link>
          </div>
        )}
      </section>

      <CoverRow
        id="pendientes"
        title="Pendientes"
        entries={want}
        total={counts.want}
        href="/perfil?estante=pendientes"
        emptyText="De momento no hay nada. Guarda aquí los libros que quieras leer."
      />
      <CoverRow
        id="leidos"
        title="Leídos recientemente"
        entries={read}
        total={counts.read}
        href="/perfil?estante=leidos"
        emptyText="De momento no hay nada. Aquí aparecerán los libros que termines."
      />
    </>
  );
}

export function ReadingNowSkeleton() {
  return (
    <div aria-hidden className="animate-pulse px-gutter pb-6">
      <div className="mb-3 h-6 w-36 rounded bg-muted" />
      <div className="h-48 rounded-xl bg-muted" />
    </div>
  );
}
