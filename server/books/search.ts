import "server-only";
import { cacheLife } from "next/cache";
import type { BookSearchItem, BookSearchPage } from "@/types/book";
import { googleBooks } from "./google";
import { SPANISH_STOPWORDS, isSpanishQuery } from "./language";
import { openLibrary } from "./openlibrary";
import type { BookProvider, ProviderSearchResult } from "./types";

function fold(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\(.*?\)/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** 0: el título es la búsqueda; 1: empieza por ella; 2: el resto. */
function matchRank(title: string, query: string): number {
  const t = fold(title);
  const q = fold(query);
  if (!q) return 2;
  if (t === q) return 0;
  return t.startsWith(`${q} `) ? 1 : 2;
}

/**
 * Quita duplicados por id y reordena sin alterar el orden relativo del
 * proveedor: antes los libros en español (si la búsqueda lo está) y, dentro de
 * cada grupo, los títulos que coinciden con lo buscado.
 */
function arrange(items: BookSearchItem[], query: string, preferSpanish: boolean): BookSearchItem[] {
  const unique = [...new Map(items.map((item) => [item.id, item])).values()];
  const queryWords = fold(query)
    .split(" ")
    .filter((word) => word.length > 2 && !SPANISH_STOPWORDS.has(word));
  // El idioma solo desempata entre títulos que comparten alguna palabra con la
  // búsqueda: un libro en español sin relación no debe adelantar al correcto.
  const related = (title: string) => {
    if (queryWords.length === 0) return true;
    const words = new Set(fold(title).split(" "));
    return queryWords.some((word) => words.has(word));
  };
  const language = (item: BookSearchItem) =>
    preferSpanish && item.language !== "es" && related(item.title) ? 1 : 0;
  return unique
    .map((item, index) => ({ item, index }))
    .sort(
      (a, b) =>
        language(a.item) - language(b.item) ||
        matchRank(a.item.title, query) - matchRank(b.item.title, query) ||
        a.index - b.index,
    )
    .map(({ item }) => item);
}

async function tryProvider(
  provider: BookProvider,
  query: string,
  page: number,
  preferSpanish: boolean,
): Promise<ProviderSearchResult | null> {
  if (!provider.isEnabled()) return null;
  try {
    return await provider.search(query, { page, preferSpanish });
  } catch (error) {
    console.error("Búsqueda de libros: proveedor con error", error);
    return null;
  }
}

/**
 * Busca libros: Google Books y, si falla, se agota la cuota, no está
 * configurado o no devuelve nada, Open Library. Se cachea en la caché remota
 * de Next (compartida entre instancias) para no gastar cuota con búsquedas
 * repetidas. Los errores se lanzan, así que nunca se cachean.
 */
export async function searchBooks(query: string, page: number): Promise<BookSearchPage> {
  "use cache: remote";

  const preferSpanish = isSpanishQuery(query);

  const google = await tryProvider(googleBooks, query, page, preferSpanish);
  if (google && google.items.length > 0) {
    cacheLife("days");
    return {
      items: arrange(google.items, query, preferSpanish),
      hasMore: google.hasMore,
      provider: "google",
    };
  }

  // Si Google respondió bien pero vacío, "sin resultados" también vale en el respaldo.
  const fallback = await tryProvider(openLibrary, query, page, preferSpanish);
  if (!fallback) {
    if (google) {
      cacheLife("hours");
      return { items: [], hasMore: false, provider: "google" };
    }
    throw new Error("Ningún proveedor de libros ha respondido");
  }
  // Resultado del respaldo: vida corta para volver a probar con Google pronto.
  cacheLife("hours");
  return {
    items: arrange(fallback.items, query, preferSpanish),
    hasMore: fallback.hasMore,
    provider: "openlibrary",
  };
}
