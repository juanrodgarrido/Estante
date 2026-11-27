export type BookSource = "google" | "openlibrary";

/**
 * De dónde viene `coverUrl`: del propio registro (`google`, `openlibrary`) o de
 * la cadena de respaldo (`server/books/cover-fallback.ts`).
 */
export type CoverSource = BookSource | "openlibrary-isbn" | "google-edition" | "openlibrary-search";

/** Libro normalizado, igual que el modelo `books` del plan (sin `_id` ni `fetchedAt`). */
export type NormalizedBook = {
  source: BookSource;
  sourceId: string;
  title: string;
  subtitle?: string;
  authors: string[];
  description?: string;
  coverUrl?: string;
  coverSource?: CoverSource;
  pageCount?: number;
  publishedDate?: string;
  isbn13?: string;
  isbn10?: string;
  categories?: string[];
  language?: string;
};

/** Libro tal como sale del servidor: `_id` y `fetchedAt` serializables. */
export type Book = NormalizedBook & {
  _id: string;
  /** Id público para la URL: `g-<id>` o `ol-<id>`. */
  publicId: string;
  fetchedAt: string;
};

export type BookSearchItem = {
  /** Id público para la URL: `g-<id>` o `ol-<id>`. */
  id: string;
  title: string;
  authors: string[];
  year?: string;
  coverUrl?: string;
  language?: string;
};

export type BookSearchPage = {
  items: BookSearchItem[];
  hasMore: boolean;
  provider: BookSource;
};
