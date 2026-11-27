import Link from "next/link";
import { Star } from "lucide-react";
import { BookCover } from "@/components/books/book-cover";
import type { ShelfEntry } from "@/types/shelf";

/** Fila horizontal de portadas con título de sección y enlace «Ver todos». */
export function CoverRow({
  id,
  title,
  entries,
  total,
  href,
  emptyText,
}: {
  id: string;
  title: string;
  entries: ShelfEntry[];
  total: number;
  href: string;
  /** Mensaje cuando no hay libros. */
  emptyText: string;
}) {
  return (
    <section aria-labelledby={id} className="pb-6">
      <div className="mb-3 flex min-h-11 items-center justify-between gap-3 px-gutter">
        <h2 id={id} className="font-display text-xl font-semibold">
          {title}
        </h2>
        {entries.length > 0 ? (
          <Link href={href} className="flex min-h-11 items-center text-sm font-medium text-primary">
            Ver todos ({total})
          </Link>
        ) : null}
      </div>
      {entries.length === 0 ? (
        <p className="mx-gutter rounded-xl border border-dashed border-border p-5 text-center text-base text-muted-foreground">
          {emptyText}
        </p>
      ) : (
      <ul className="flex snap-x gap-4 overflow-x-auto overscroll-x-contain px-gutter pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {entries.map((entry) => (
          <li key={entry.bookId} className="w-24 shrink-0 snap-start">
            <Link href={`/libro/${entry.publicId}`} aria-label={entry.title} className="block active:opacity-80">
              <BookCover title={entry.title} author={entry.authors[0]} coverUrl={entry.coverUrl} sizes="96px" className="w-full" />
              {entry.status === "read" && entry.rating ? (
                <p className="mt-2 flex items-center justify-center gap-1 text-xs text-muted-foreground">
                  <Star className="size-3.5 fill-primary text-primary" aria-hidden />
                  {entry.rating}
                </p>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
      )}
    </section>
  );
}
