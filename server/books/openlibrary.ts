import "server-only";
import { z } from "zod";
import type { BookSearchItem, NormalizedBook } from "@/types/book";
import { cleanCategories, htmlToText, normalizeLanguage, pickIsbns, yearFrom } from "./normalize";
import { openLibraryUserAgent } from "./user-agent";
import { ProviderError, type BookProvider, type ProviderSearchResult, type SearchOptions } from "./types";

const BASE_URL = "https://openlibrary.org";
const COVERS_URL = "https://covers.openlibrary.org/b/id";
const PAGE_SIZE = 20;
const TIMEOUT_MS = 12000;
const ENRICH_TIMEOUT_MS = 7000;
const SEARCH_FIELDS =
  "key,title,subtitle,author_name,first_publish_year,cover_i,language,number_of_pages_median,isbn,subject";

const docSchema = z.object({
  key: z.string(),
  title: z.string().optional(),
  subtitle: z.string().optional(),
  author_name: z.array(z.string()).optional(),
  first_publish_year: z.number().optional(),
  cover_i: z.number().optional(),
  language: z.array(z.string()).optional(),
  number_of_pages_median: z.number().optional(),
  isbn: z.array(z.string()).optional(),
  subject: z.array(z.string()).optional(),
});

const searchSchema = z.object({
  numFound: z.number().optional(),
  docs: z.array(docSchema).default([]),
});

const workSchema = z.object({
  title: z.string().optional(),
  subtitle: z.string().optional(),
  description: z.union([z.string(), z.object({ value: z.string() })]).optional(),
  covers: z.array(z.number()).optional(),
  subjects: z.array(z.string()).optional(),
  first_publish_date: z.string().optional(),
  authors: z.array(z.object({ author: z.object({ key: z.string() }).optional() })).optional(),
});

const authorSchema = z.object({ name: z.string().optional() });

type Doc = z.infer<typeof docSchema>;

async function getJson(path: string, timeoutMs = TIMEOUT_MS): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      headers: { "User-Agent": openLibraryUserAgent(), Accept: "application/json" },
      signal: AbortSignal.timeout(timeoutMs),
      cache: "no-store",
    });
  } catch {
    throw new ProviderError("openlibrary", "sin respuesta (red o tiempo agotado)");
  }
  if (response.status === 404) return null;
  if (!response.ok) throw new ProviderError("openlibrary", `HTTP ${response.status}`);
  return response.json().catch(() => {
    throw new ProviderError("openlibrary", "respuesta no válida");
  });
}

/** `/works/OL123W` → `OL123W` */
function workId(key: string): string {
  return key.replace(/^\/works\//, "");
}

function coverUrl(coverId: number | undefined, size: "M" | "L"): string | undefined {
  return coverId && coverId > 0 ? `${COVERS_URL}/${coverId}-${size}.jpg` : undefined;
}

function docLanguage(doc: Doc): string | undefined {
  // `language` lista todos los idiomas de las ediciones: solo es fiable si es uno.
  const codes = [...new Set(doc.language ?? [])];
  return codes.length === 1 ? normalizeLanguage(codes[0]) : undefined;
}

function toItem(doc: Doc): BookSearchItem | null {
  if (!doc.title || !doc.key.startsWith("/works/")) return null;
  return {
    id: `ol-${workId(doc.key)}`,
    title: doc.title.replace(/\s+/g, " ").trim(),
    authors: doc.author_name ?? [],
    year: doc.first_publish_year ? String(doc.first_publish_year) : undefined,
    coverUrl: coverUrl(doc.cover_i, "M"),
    language: docLanguage(doc),
  };
}

export const openLibrary: BookProvider = {
  name: "openlibrary",
  isEnabled: () => true,

  async search(query: string, { page }: SearchOptions): Promise<ProviderSearchResult> {
    const params = new URLSearchParams({
      q: query,
      page: String(page + 1),
      limit: String(PAGE_SIZE),
      fields: SEARCH_FIELDS,
    });
    const parsed = searchSchema.safeParse(await getJson(`/search.json?${params}`));
    if (!parsed.success) throw new ProviderError("openlibrary", "respuesta no válida");

    const items = parsed.data.docs.flatMap((doc) => {
      const item = toItem(doc);
      return item ? [item] : [];
    });
    const total = parsed.data.numFound ?? 0;
    return { items, hasMore: parsed.data.docs.length === PAGE_SIZE && (page + 1) * PAGE_SIZE < total };
  },

  async getById(sourceId: string): Promise<NormalizedBook | null> {
    // El registro de la obra es imprescindible; la búsqueda por clave (autores,
    // páginas, ISBN) es un extra y Open Library a veces tarda mucho en ella.
    const enrichment = getJson(
      `/search.json?${new URLSearchParams({ q: `key:/works/${sourceId}`, fields: SEARCH_FIELDS, limit: "1" })}`,
      ENRICH_TIMEOUT_MS,
    ).catch(() => null);
    const workRaw = await getJson(`/works/${encodeURIComponent(sourceId)}.json`);
    if (workRaw === null) return null;
    const work = workSchema.safeParse(workRaw);
    if (!work.success) throw new ProviderError("openlibrary", "respuesta no válida");
    const doc = searchSchema.safeParse(await enrichment).data?.docs[0];

    const title = work.data.title ?? doc?.title;
    if (!title) return null;
    const description =
      typeof work.data.description === "string" ? work.data.description : work.data.description?.value;

    let authors = doc?.author_name ?? [];
    if (authors.length === 0) {
      // Sin enriquecimiento: los nombres se piden a los registros de autor de la obra.
      const keys = (work.data.authors ?? []).flatMap((entry) => (entry.author?.key ? [entry.author.key] : [])).slice(0, 3);
      const names = await Promise.all(
        keys.map(async (key) => {
          const raw = await getJson(`${key}.json`, ENRICH_TIMEOUT_MS).catch(() => null);
          return authorSchema.safeParse(raw).data?.name;
        }),
      );
      authors = names.filter((name): name is string => Boolean(name));
    }

    return {
      source: "openlibrary",
      sourceId,
      title: title.replace(/\s+/g, " ").trim(),
      subtitle: work.data.subtitle ?? doc?.subtitle ?? undefined,
      authors,
      description: htmlToText(description),
      coverUrl: coverUrl(doc?.cover_i ?? work.data.covers?.find((c) => c > 0), "L"),
      coverSource: doc?.cover_i || work.data.covers?.some((c) => c > 0) ? "openlibrary" : undefined,
      pageCount: doc?.number_of_pages_median && doc.number_of_pages_median > 0 ? doc.number_of_pages_median : undefined,
      publishedDate: doc?.first_publish_year ? String(doc.first_publish_year) : yearFrom(work.data.first_publish_date),
      ...pickIsbns(doc?.isbn),
      categories: cleanCategories(doc?.subject ?? work.data.subjects),
      language: doc ? docLanguage(doc) : undefined,
    };
  },
};
