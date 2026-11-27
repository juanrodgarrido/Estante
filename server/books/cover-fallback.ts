// Cadena de respaldo para la portada de un libro cuyo registro no trae ninguna.
// Sin `server-only` ni alias `@/` a propósito: lo importa también el script
// `npm run covers:backfill` (Node sin compilar), por eso los imports llevan `.ts`.
import type { BookSource, CoverSource } from "../../types/book.ts";
import { foldText, normalizeLanguage, pickGoogleCover, pickIsbns } from "./normalize.ts";
import { openLibraryUserAgent } from "./user-agent.ts";

/** Sin portada y ya probado: no se vuelve a intentar hasta pasado este tiempo. */
export const COVER_RECHECK_MS = 30 * 24 * 60 * 60 * 1000;
/** Si alguna fuente falló (red, cuota), el siguiente intento es mucho antes. */
const RETRY_SOON_MS = 24 * 60 * 60 * 1000;

const GOOGLE_URL = "https://www.googleapis.com/books/v1/volumes";
const OPENLIBRARY_URL = "https://openlibrary.org";
const COVERS_URL = "https://covers.openlibrary.org/b";
const STEP_TIMEOUT_MS = 6000;
const MIN_BUDGET_MS = 1000;
const MAX_EDITION_ISBNS = 4;

export type FallbackStep = Extract<CoverSource, "openlibrary-isbn" | "google-edition" | "openlibrary-search">;

export type CoverQuery = {
  source: BookSource;
  sourceId: string;
  title: string;
  authors: string[];
  isbn13?: string;
  isbn10?: string;
  language?: string;
};

export type CoverLookup = {
  found: { url: string; source: FallbackStep } | null;
  /** Pasos que fallaron (red, tiempo, cuota) en vez de responder «no hay». */
  failed: FallbackStep[];
};

export type CoverLookupOptions = {
  /** Instante (ms) a partir del cual no se empieza ni se espera más. */
  deadline?: number;
  /** Se espera antes de cada petición del paso (el script lo usa para ir despacio). */
  pace?: Partial<Record<FallbackStep, () => Promise<void>>>;
  /** Pasos que no se prueban (p. ej. Google sin cuota). Cuentan como fallidos. */
  skip?: ReadonlySet<FallbackStep>;
};

class StepError extends Error {}

/** Devuelve una función que espera lo necesario para que haya `ms` entre llamadas. */
export function createPacer(ms: number): () => Promise<void> {
  let next = 0;
  return async () => {
    const wait = next - Date.now();
    next = Math.max(Date.now(), next) + ms;
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
  };
}

async function call(
  /** Paso al que pertenece la espera (`pace`): cada fuente tiene su propio ritmo. */
  step: FallbackStep,
  url: string,
  options: CoverLookupOptions,
  init: RequestInit = {},
): Promise<Response> {
  await options.pace?.[step]?.();
  const left = options.deadline === undefined ? STEP_TIMEOUT_MS : options.deadline - Date.now();
  if (left < MIN_BUDGET_MS) throw new StepError("sin tiempo");
  const headers = new Headers(init.headers);
  if (url.startsWith(OPENLIBRARY_URL) || url.startsWith(COVERS_URL)) {
    headers.set("User-Agent", openLibraryUserAgent());
  }
  try {
    return await fetch(url, {
      ...init,
      headers,
      signal: AbortSignal.timeout(Math.min(STEP_TIMEOUT_MS, left)),
      cache: "no-store",
    });
  } catch {
    throw new StepError("sin respuesta (red o tiempo agotado)");
  }
}

function sameTitle(a: string, b: string): boolean {
  const x = foldText(a);
  const y = foldText(b);
  if (!x || !y) return false;
  return x === y || x.startsWith(`${y} `) || y.startsWith(`${x} `);
}

function authorWords(authors: readonly string[]): Set<string> {
  return new Set(
    foldText(authors.join(" "))
      .split(" ")
      .filter((word) => word.length > 2),
  );
}

/** Sin autores en alguna de las dos partes no se puede descartar. */
function sameAuthor(known: ReadonlySet<string>, other: readonly string[] | undefined): boolean {
  if (known.size === 0 || !other?.length) return true;
  return [...authorWords(other)].some((word) => known.has(word));
}

/** Portada de Open Library por ISBN: 404 si no hay (`default=false`), así que basta un HEAD. */
async function isbnCover(isbn: string, options: CoverLookupOptions): Promise<string | null> {
  const url = `${COVERS_URL}/isbn/${isbn}-L.jpg?default=false`;
  const response = await call("openlibrary-isbn", url, options, { method: "HEAD" });
  if (response.status === 404) return null;
  if (!response.ok) throw new StepError(`HTTP ${response.status}`);
  return response.headers.get("content-type")?.startsWith("image/") ? url : null;
}

/** a) Open Library por ISBN del propio libro (isbn13 y luego isbn10). */
async function byIsbn(query: CoverQuery, options: CoverLookupOptions): Promise<string | null> {
  for (const isbn of [query.isbn13, query.isbn10]) {
    const url = isbn ? await isbnCover(isbn, options) : null;
    if (url) return url;
  }
  return null;
}

type GoogleVolume = {
  id?: string;
  volumeInfo?: {
    title?: string;
    authors?: string[];
    language?: string;
    industryIdentifiers?: { identifier?: string }[];
    imageLinks?: Parameters<typeof pickGoogleCover>[0];
  };
};

/**
 * b) Otras ediciones en Google Books (mismo título y autor, mejor si del mismo
 * idioma): solo se usa su portada. Si la edición no la trae en Google, se prueba
 * su ISBN en Open Library (a menudo otra edición sí la tiene allí).
 */
async function byGoogleEdition(query: CoverQuery, options: CoverLookupOptions): Promise<string | null> {
  const key = process.env.GOOGLE_BOOKS_API_KEY?.trim();
  if (!key) return null;
  const author = query.authors[0];
  const params = new URLSearchParams({
    q: `intitle:"${query.title.replace(/"/g, " ")}"${author ? ` inauthor:"${author.replace(/"/g, " ")}"` : ""}`,
    printType: "books",
    maxResults: "20",
    fields: "items(id,volumeInfo(title,authors,language,industryIdentifiers,imageLinks))",
    key,
  });
  const response = await call("google-edition", `${GOOGLE_URL}?${params}`, options);
  if (!response.ok) throw new StepError(`HTTP ${response.status}`);
  const data = (await response.json().catch(() => null)) as { items?: GoogleVolume[] } | null;
  if (!data || (data.items !== undefined && !Array.isArray(data.items))) throw new StepError("respuesta no válida");

  const known = authorWords(query.authors);
  const candidates = (data.items ?? [])
    .filter((volume) => !(query.source === "google" && volume.id === query.sourceId))
    .flatMap((volume) => {
      const info = volume.volumeInfo;
      if (!info?.title || !sameTitle(info.title, query.title) || !sameAuthor(known, info.authors)) return [];
      return [
        {
          cover: pickGoogleCover(info.imageLinks),
          isbns: pickIsbns(info.industryIdentifiers?.map((entry) => entry.identifier)),
          sameLanguage: !!query.language && normalizeLanguage(info.language) === query.language,
        },
      ];
    })
    .sort((a, b) => Number(b.sameLanguage) - Number(a.sameLanguage));

  const withCover = candidates.find((candidate) => candidate.cover);
  if (withCover?.cover) return withCover.cover;
  const own = new Set([query.isbn13, query.isbn10]);
  const isbns = candidates
    .flatMap(({ isbns: { isbn13, isbn10 } }) => [isbn13, isbn10])
    .filter((isbn): isbn is string => !!isbn && !own.has(isbn));
  for (const isbn of [...new Set(isbns)].slice(0, MAX_EDITION_ISBNS)) {
    const url = await isbnCover(isbn, options);
    if (url) return url;
  }
  return null;
}

type SearchDoc = { title?: string; author_name?: string[]; cover_i?: number; language?: string[] };

/** c) Búsqueda en Open Library por título y autor: `cover_i` del resultado que coincida. */
async function byOpenLibrarySearch(query: CoverQuery, options: CoverLookupOptions): Promise<string | null> {
  const params = new URLSearchParams({
    title: query.title,
    limit: "10",
    fields: "title,author_name,cover_i,language",
  });
  if (query.authors[0]) params.set("author", query.authors[0]);
  const response = await call("openlibrary-search", `${OPENLIBRARY_URL}/search.json?${params}`, options, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new StepError(`HTTP ${response.status}`);
  const data = (await response.json().catch(() => null)) as { docs?: SearchDoc[] } | null;
  if (!data || !Array.isArray(data.docs)) throw new StepError("respuesta no válida");

  const known = authorWords(query.authors);
  const matches = data.docs.filter(
    (doc) =>
      doc.cover_i &&
      doc.cover_i > 0 &&
      doc.title &&
      sameTitle(doc.title, query.title) &&
      sameAuthor(known, doc.author_name),
  );
  const sameLanguage = (doc: SearchDoc) =>
    !!query.language && (doc.language ?? []).some((code) => normalizeLanguage(code) === query.language);
  const best = matches.find(sameLanguage) ?? matches[0];
  return best?.cover_i ? `${COVERS_URL}/id/${best.cover_i}-L.jpg` : null;
}

const STEPS: ReadonlyArray<[FallbackStep, (query: CoverQuery, options: CoverLookupOptions) => Promise<string | null>]> = [
  ["openlibrary-isbn", byIsbn],
  ["google-edition", byGoogleEdition],
  ["openlibrary-search", byOpenLibrarySearch],
];

/**
 * Prueba las fuentes en orden y se queda con la primera portada que funcione.
 * Nunca lanza: una fuente que falla o tarda se anota en `failed` y se pasa a la
 * siguiente.
 */
export async function findFallbackCover(
  query: CoverQuery,
  options: CoverLookupOptions = {},
): Promise<CoverLookup> {
  const failed: FallbackStep[] = [];
  for (const [step, run] of STEPS) {
    if (options.skip?.has(step)) {
      failed.push(step);
      continue;
    }
    try {
      const url = await run(query, options);
      if (url) return { found: { url, source: step }, failed };
    } catch {
      failed.push(step);
    }
  }
  return { found: null, failed };
}

/** ¿Hay que (volver a) buscar portada? Sin portada y sin intento en los últimos 30 días. */
export function needsCoverCheck(
  book: { coverUrl?: string | null; coverCheckedAt?: Date | null },
  now = Date.now(),
): boolean {
  if (book.coverUrl) return false;
  return !book.coverCheckedAt || now - book.coverCheckedAt.getTime() >= COVER_RECHECK_MS;
}

/**
 * Campos de `books` que hay que escribir tras buscar. Con portada: `coverUrl` y
 * `coverSource`. Sin ella: `coverCheckedAt`; si alguna fuente falló en vez de
 * responder «no hay», la fecha se adelanta para que el reintento llegue en un
 * día y no en treinta.
 */
export function coverPatch(lookup: CoverLookup, now = new Date()): {
  set: Record<string, unknown>;
  unset: string[];
} {
  if (lookup.found) {
    return { set: { coverUrl: lookup.found.url, coverSource: lookup.found.source }, unset: ["coverCheckedAt"] };
  }
  const checkedAt = lookup.failed.length > 0 ? new Date(now.getTime() - (COVER_RECHECK_MS - RETRY_SOON_MS)) : now;
  return { set: { coverCheckedAt: checkedAt }, unset: ["coverSource"] };
}
