import "server-only";
import { z } from "zod";
import type { BookSearchItem, NormalizedBook } from "@/types/book";
import {
  cleanCategories,
  htmlToText,
  normalizeLanguage,
  pickGoogleCover,
  pickIsbns,
  yearFrom,
} from "./normalize";
import { ProviderError, type BookProvider, type ProviderSearchResult, type SearchOptions } from "./types";

const BASE_URL = "https://www.googleapis.com/books/v1/volumes";
const PAGE_SIZE = 20;
const TIMEOUT_MS = 6000;

const volumeSchema = z.object({
  id: z.string(),
  volumeInfo: z
    .object({
      title: z.string().optional(),
      subtitle: z.string().optional(),
      authors: z.array(z.string()).optional(),
      description: z.string().optional(),
      publishedDate: z.string().optional(),
      pageCount: z.number().optional(),
      categories: z.array(z.string()).optional(),
      language: z.string().optional(),
      industryIdentifiers: z.array(z.object({ identifier: z.string().optional() })).optional(),
      imageLinks: z
        .object({
          extraLarge: z.string().optional(),
          large: z.string().optional(),
          medium: z.string().optional(),
          small: z.string().optional(),
          thumbnail: z.string().optional(),
          smallThumbnail: z.string().optional(),
        })
        .optional(),
    })
    .optional(),
});

const searchSchema = z.object({
  totalItems: z.number().optional(),
  items: z.array(volumeSchema).optional(),
});

type Volume = z.infer<typeof volumeSchema>;

function apiKey(): string | undefined {
  return process.env.GOOGLE_BOOKS_API_KEY?.trim() || undefined;
}

function toNormalized(volume: Volume): NormalizedBook | null {
  const info = volume.volumeInfo;
  if (!info?.title) return null;
  return {
    source: "google",
    sourceId: volume.id,
    title: info.title,
    subtitle: info.subtitle || undefined,
    authors: info.authors ?? [],
    description: htmlToText(info.description),
    coverUrl: pickGoogleCover(info.imageLinks),
    coverSource: info.imageLinks ? "google" : undefined,
    pageCount: info.pageCount && info.pageCount > 0 ? info.pageCount : undefined,
    publishedDate: info.publishedDate || undefined,
    ...pickIsbns(info.industryIdentifiers?.map((entry) => entry.identifier)),
    categories: cleanCategories(info.categories),
    language: normalizeLanguage(info.language),
  };
}

function toItem(book: NormalizedBook): BookSearchItem {
  return {
    id: `g-${book.sourceId}`,
    title: book.title,
    authors: book.authors,
    year: yearFrom(book.publishedDate),
    coverUrl: book.coverUrl,
    language: book.language,
  };
}

async function request(url: URL): Promise<Response> {
  const key = apiKey();
  if (key) url.searchParams.set("key", key);
  try {
    return await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS), cache: "no-store" });
  } catch {
    throw new ProviderError("google", "sin respuesta (red o tiempo agotado)");
  }
}

async function searchOnce(query: string, page: number, langRestrict?: string): Promise<ProviderSearchResult> {
  const url = new URL(BASE_URL);
  url.searchParams.set("q", query);
  url.searchParams.set("printType", "books");
  url.searchParams.set("maxResults", String(PAGE_SIZE));
  url.searchParams.set("startIndex", String(page * PAGE_SIZE));
  url.searchParams.set("projection", "full");
  if (langRestrict) url.searchParams.set("langRestrict", langRestrict);

  const response = await request(url);
  if (!response.ok) throw new ProviderError("google", `HTTP ${response.status}`);
  const parsed = searchSchema.safeParse(await response.json().catch(() => null));
  if (!parsed.success) throw new ProviderError("google", "respuesta no válida");

  const raw = parsed.data.items ?? [];
  const items = raw.flatMap((volume) => {
    const book = toNormalized(volume);
    return book ? [toItem(book)] : [];
  });
  const total = parsed.data.totalItems ?? 0;
  return { items, hasMore: raw.length === PAGE_SIZE && (page + 1) * PAGE_SIZE < total };
}

export const googleBooks: BookProvider = {
  name: "google",
  isEnabled: () => apiKey() !== undefined,

  async search(query: string, { page, preferSpanish }: SearchOptions) {
    if (preferSpanish) {
      const spanish = await searchOnce(query, page, "es");
      if (spanish.items.length > 0 || page > 0) return spanish;
    }
    return searchOnce(query, page);
  },

  async getById(sourceId: string) {
    const response = await request(new URL(`${BASE_URL}/${encodeURIComponent(sourceId)}`));
    if (response.status === 404) return null;
    if (!response.ok) throw new ProviderError("google", `HTTP ${response.status}`);
    const parsed = volumeSchema.safeParse(await response.json().catch(() => null));
    if (!parsed.success) throw new ProviderError("google", "respuesta no válida");
    return toNormalized(parsed.data);
  },
};
