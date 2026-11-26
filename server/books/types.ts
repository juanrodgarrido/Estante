import type { BookSearchItem, BookSource, NormalizedBook } from "@/types/book";

export type SearchOptions = {
  page: number;
  preferSpanish: boolean;
};

export type ProviderSearchResult = {
  items: BookSearchItem[];
  hasMore: boolean;
};

export interface BookProvider {
  readonly name: BookSource;
  /** Falso si falta configuración (p. ej. la API key de Google). */
  isEnabled(): boolean;
  search(query: string, options: SearchOptions): Promise<ProviderSearchResult>;
  /** `null` si el proveedor confirma que el libro no existe. */
  getById(sourceId: string): Promise<NormalizedBook | null>;
}

/** Fallo del proveedor (red, cuota, 5xx, respuesta rara): activa el respaldo. */
export class ProviderError extends Error {
  constructor(
    readonly provider: BookSource,
    message: string,
  ) {
    super(`[${provider}] ${message}`);
    this.name = "ProviderError";
  }
}
