"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertCircle, BookX, Loader2, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/empty-state";
import type { BookSearchItem, BookSearchPage } from "@/types/book";
import { SearchResultRow, SearchResultSkeleton } from "./search-result-row";

const DEBOUNCE_MS = 350;
const MIN_LENGTH = 2;

type Status = "idle" | "loading" | "done" | "error";

async function fetchPage(query: string, page: number, signal: AbortSignal): Promise<BookSearchPage> {
  const response = await fetch(`/api/books/search?${new URLSearchParams({ q: query, page: String(page) })}`, {
    signal,
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? "No hemos podido buscar libros.");
  }
  return response.json();
}

type Outcome = {
  key: string;
  items: BookSearchItem[];
  hasMore: boolean;
  page: number;
  error?: string;
};

export function SearchScreen() {
  const initialQuery = useSearchParams().get("q") ?? "";
  const [input, setInput] = useState(initialQuery);
  const [query, setQuery] = useState(initialQuery.trim());
  const [retry, setRetry] = useState(0);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<AbortController | null>(null);

  // El estado se deriva: sin resultado para la búsqueda actual significa "cargando".
  const key = `${query}|${retry}`;
  const searching = query.length >= MIN_LENGTH;
  const current = outcome?.key === key ? outcome : null;
  const status: Status = !searching ? "idle" : !current ? "loading" : current.error ? "error" : "done";
  const items = current?.items ?? [];
  const hasMore = current?.hasMore ?? false;
  const errorMessage = current?.error ?? "";

  // Debounce del texto escrito
  useEffect(() => {
    const timer = setTimeout(() => setQuery(input.trim()), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [input]);

  // Mantiene ?q= para que "volver" desde la ficha conserve la búsqueda
  useEffect(() => {
    const url = query ? `/buscar?${new URLSearchParams({ q: query })}` : "/buscar";
    window.history.replaceState(window.history.state, "", url);
  }, [query]);

  // Búsqueda nueva (primera página); cancela la anterior
  useEffect(() => {
    if (query.length < MIN_LENGTH) return;
    const controller = new AbortController();
    controllerRef.current = controller;
    fetchPage(query, 0, controller.signal)
      .then((result) => setOutcome({ key, items: result.items, hasMore: result.hasMore, page: 0 }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        const message = error instanceof Error ? error.message : "No hemos podido buscar libros.";
        setOutcome({ key, items: [], hasMore: false, page: 0, error: message });
      });
    return () => controller.abort();
  }, [query, key]);

  async function loadMore() {
    const controller = controllerRef.current;
    if (loadingMore || !current || !hasMore || !controller || controller.signal.aborted) return;
    setLoadingMore(true);
    try {
      const result = await fetchPage(query, current.page + 1, controller.signal);
      const known = new Set(current.items.map((item) => item.id));
      setOutcome({
        key,
        items: [...current.items, ...result.items.filter((item) => !known.has(item.id))],
        hasMore: result.hasMore,
        page: current.page + 1,
      });
    } catch {
      // Se mantiene «Cargar más» para poder reintentar
    } finally {
      setLoadingMore(false);
    }
  }

  // Scroll infinito: al acercarse el final de la lista se carga la siguiente página
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadMore();
      },
      { rootMargin: "400px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  });

  return (
    <div className="flex flex-1 flex-col">
      <div className="sticky top-[calc(var(--safe-top)+var(--header-h))] z-20 bg-background/85 px-gutter pb-3 backdrop-blur-xl">
        <form role="search" onSubmit={(event) => { event.preventDefault(); setQuery(input.trim()); }} className="relative">
          <Search aria-hidden className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Título, autor o ISBN"
            aria-label="Buscar libros"
            enterKeyHint="search"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            maxLength={200}
            className="pl-12 pr-12 [&::-webkit-search-cancel-button]:hidden"
          />
          {input ? (
            <button
              type="button"
              aria-label="Borrar búsqueda"
              onClick={() => setInput("")}
              className="absolute right-0 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground active:bg-muted"
            >
              <X className="size-5" aria-hidden />
            </button>
          ) : null}
        </form>
      </div>

      {status === "idle" ? (
        <EmptyState
          icon={Search}
          title="Encuentra tu próxima lectura"
          description="Busca por título, autor o ISBN y añade libros a tu estantería."
        />
      ) : null}

      {status === "loading" ? <SearchResultSkeleton /> : null}

      {status === "error" ? (
        <EmptyState
          icon={AlertCircle}
          title="No hemos podido buscar"
          description={errorMessage}
          className="gap-0"
        />
      ) : null}
      {status === "error" ? (
        <div className="flex justify-center">
          <Button onClick={() => setRetry((count) => count + 1)}>Reintentar</Button>
        </div>
      ) : null}

      {status === "done" && items.length === 0 ? (
        <EmptyState
          icon={BookX}
          title="Sin resultados"
          description={`No hemos encontrado nada para «${query}». Prueba con otro título o con el nombre del autor.`}
        />
      ) : null}

      {status === "done" && items.length > 0 ? (
        <>
          <ul aria-live="polite">
            {items.map((book) => (
              <SearchResultRow key={book.id} book={book} />
            ))}
          </ul>
          {hasMore ? (
            <div ref={sentinelRef} className="flex justify-center px-gutter py-6">
              <Button variant="outline" onClick={() => void loadMore()} disabled={loadingMore}>
                {loadingMore ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
                {loadingMore ? "Cargando…" : "Cargar más"}
              </Button>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
