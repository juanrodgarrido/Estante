"use client";

import { useState } from "react";
import Link from "next/link";
import { BookMarked, BookOpen, CheckCheck, Star } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { BookCover } from "@/components/books/book-cover";
import { EmptyState } from "@/components/empty-state";
import { percentOf } from "@/lib/shelf";
import { cn } from "@/lib/utils";
import type { ShelfEntry, ShelfStatus } from "@/types/shelf";

const TABS: { status: ShelfStatus; label: string; icon: LucideIcon; empty: string; emptyOther: string }[] = [
  {
    status: "reading",
    label: "Leyendo",
    icon: BookOpen,
    empty: "No estás leyendo ningún libro ahora mismo.",
    emptyOther: "no está leyendo ningún libro ahora mismo.",
  },
  {
    status: "want",
    label: "Pendientes",
    icon: BookMarked,
    empty: "Guarda aquí los libros que quieres leer.",
    emptyOther: "no tiene libros pendientes.",
  },
  {
    status: "read",
    label: "Leídos",
    icon: CheckCheck,
    empty: "Los libros que termines aparecerán aquí.",
    emptyOther: "aún no ha terminado ningún libro.",
  },
];

type ShelfTabsProps = {
  entries: ShelfEntry[];
  initialTab?: ShelfStatus;
  /** Estantería de otra persona: textos en tercera persona y sin acciones de edición. */
  ownerName?: string;
};

/** Las tres estanterías en pestañas, con contador y cuadrícula de portadas. */
export function ShelfTabs({ entries, initialTab = "reading", ownerName }: ShelfTabsProps) {
  const [active, setActive] = useState<ShelfStatus>(initialTab);
  const tab = TABS.find((item) => item.status === active) ?? TABS[0];
  const visible = entries.filter((entry) => entry.status === active);
  const readOnly = ownerName !== undefined;

  return (
    <section aria-label={readOnly ? `Estantería de ${ownerName}` : "Mi estantería"}>
      <div role="tablist" className="mx-gutter grid grid-cols-3 gap-1 rounded-full bg-muted p-1">
        {TABS.map((item) => {
          const count = entries.filter((entry) => entry.status === item.status).length;
          const selected = item.status === active;
          return (
            <button
              key={item.status}
              role="tab"
              type="button"
              id={`tab-${item.status}`}
              aria-selected={selected}
              aria-controls="shelf-panel"
              onClick={() => setActive(item.status)}
              className={cn(
                "flex h-11 items-center justify-center gap-1.5 rounded-full text-sm font-medium transition-[background-color,color,transform] active:scale-[0.97]",
                selected ? "bg-card text-foreground shadow-sm" : "text-muted-foreground",
              )}
            >
              {item.label}
              <span className={cn("tabular-nums", selected ? "text-primary" : "text-muted-foreground/70")}>{count}</span>
            </button>
          );
        })}
      </div>

      <div id="shelf-panel" role="tabpanel" aria-labelledby={`tab-${active}`} className="mt-5 pb-6">
        {visible.length === 0 ? (
          <EmptyState
            icon={tab.icon}
            title={`Sin libros en «${tab.label}»`}
            description={readOnly ? `${ownerName} ${tab.emptyOther}` : tab.empty}
            action={readOnly ? undefined : { href: "/buscar", label: "Buscar un libro" }}
            className="py-10"
          />
        ) : (
          <ul className="grid grid-cols-3 gap-x-4 gap-y-6 px-gutter">
            {visible.map((entry) => {
              const percent = percentOf(entry.currentPage, entry.pageCount);
              return (
                <li key={entry.bookId}>
                  <Link href={`/libro/${entry.publicId}`} className="block active:opacity-80" aria-label={entry.title}>
                    <BookCover
                      title={entry.title}
                      author={entry.authors[0]}
                      coverUrl={entry.coverUrl}
                      sizes="(min-width: 640px) 180px, 33vw"
                      className="w-full"
                    />
                    {entry.status === "reading" && percent !== null ? (
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
                        <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
                      </div>
                    ) : null}
                    {entry.status === "read" && entry.rating ? (
                      <p className="mt-2 flex items-center justify-center gap-1 text-xs text-muted-foreground">
                        <Star className="size-3.5 fill-primary text-primary" aria-hidden />
                        {entry.rating}
                      </p>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
