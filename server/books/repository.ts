import "server-only";
import { connection } from "next/server";
import { ObjectId, type Collection } from "mongodb";
import { getDb } from "@/lib/db";
import type { Book, BookSearchItem, BookSource, NormalizedBook } from "@/types/book";
import { googleBooks } from "./google";
import { openLibrary } from "./openlibrary";
import { coverPatch, findFallbackCover, needsCoverCheck } from "./cover-fallback";
import type { BookProvider } from "./types";

const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
/** Tiempo máximo que la ficha espera a la cadena de portadas de respaldo. */
const COVER_BUDGET_MS = 10_000;

type BookDoc = NormalizedBook & { _id: ObjectId; fetchedAt: Date; coverCheckedAt?: Date };

let indexesReady: Promise<unknown> | undefined;

async function getBooksCollection(): Promise<Collection<BookDoc>> {
  const collection = (await getDb()).collection<BookDoc>("books");
  // Los índices del plan se crean una vez por instancia (createIndex es idempotente).
  indexesReady ??= Promise.all([
    collection.createIndex({ source: 1, sourceId: 1 }, { unique: true }),
    collection.createIndex({ isbn13: 1 }),
  ]).catch((error) => {
    indexesReady = undefined;
    throw error;
  });
  await indexesReady;
  return collection;
}

function publicIdOf(source: BookSource, sourceId: string): string {
  return `${source === "google" ? "g" : "ol"}-${sourceId}`;
}

function toBook(doc: BookDoc): Book {
  const { _id, fetchedAt, ...rest } = doc;
  delete rest.coverCheckedAt; // interno: no viaja al cliente
  return {
    ...rest,
    _id: _id.toHexString(),
    publicId: publicIdOf(doc.source, doc.sourceId),
    fetchedAt: fetchedAt.toISOString(),
  };
}

function parsePublicId(
  id: string,
): { kind: "object"; objectId: ObjectId } | { kind: "source"; source: BookSource; sourceId: string } | null {
  if (/^[a-f0-9]{24}$/.test(id)) return { kind: "object", objectId: new ObjectId(id) };
  if (id.startsWith("g-")) return { kind: "source", source: "google", sourceId: id.slice(2) };
  if (id.startsWith("ol-")) return { kind: "source", source: "openlibrary", sourceId: id.slice(3) };
  return null;
}

function providerFor(source: BookSource): BookProvider {
  return source === "google" ? googleBooks : openLibrary;
}

function lookupCover(book: NormalizedBook) {
  return findFallbackCover(book, { deadline: Date.now() + COVER_BUDGET_MS });
}

/** Busca portada de respaldo para un libro ya guardado y anota el resultado. Nunca rompe la ficha. */
async function completeCover(books: Collection<BookDoc>, doc: BookDoc): Promise<BookDoc> {
  try {
    const patch = coverPatch(await lookupCover(doc));
    const updated = await books.findOneAndUpdate(
      { _id: doc._id },
      { $set: patch.set, $unset: Object.fromEntries(patch.unset.map((key) => [key, 1 as const])) },
      { returnDocument: "after" },
    );
    return updated ?? doc;
  } catch (error) {
    console.error("Portada de respaldo: no se ha podido guardar", error);
    return doc;
  }
}

/**
 * En los resultados de búsqueda, si un libro no trae portada pero ya está
 * guardado en `books` con una, usa la guardada. Solo lee la base de datos; nunca
 * llama a ninguna API y nunca rompe la búsqueda.
 */
export async function fillStoredCovers(items: BookSearchItem[]): Promise<BookSearchItem[]> {
  const missing = items.flatMap((item) => {
    const parsed = item.coverUrl ? null : parsePublicId(item.id);
    return parsed?.kind === "source" ? [parsed] : [];
  });
  if (missing.length === 0) return items;
  try {
    const books = await getBooksCollection();
    const stored = await books
      .find(
        {
          $or: missing.map(({ source, sourceId }) => ({ source, sourceId })),
          coverUrl: { $exists: true, $ne: "" },
        },
        { projection: { source: 1, sourceId: 1, coverUrl: 1 } },
      )
      .toArray();
    const covers = new Map(stored.map((doc) => [publicIdOf(doc.source, doc.sourceId), doc.coverUrl]));
    return items.map((item) => (item.coverUrl ? item : { ...item, coverUrl: covers.get(item.id) }));
  } catch (error) {
    console.error("Búsqueda de libros: no se han podido leer portadas guardadas", error);
    return items;
  }
}

/**
 * Devuelve el libro, usando la colección `books` como caché: si hay copia de
 * menos de 30 días no se llama a la API; si no, se pide al proveedor y se hace
 * upsert por source+sourceId. Si la API falla y hay una copia caducada, se usa
 * esa. `null` si el libro no existe.
 *
 * `id` es el id público (`g-…`, `ol-…`) o el `_id` de Mongo (24 hex). La
 * Sesión 5 lo usa también para guardar el libro al añadirlo a la estantería.
 */
export async function getBook(id: string): Promise<Book | null> {
  // Usa la hora actual y la base de datos: siempre en tiempo de petición.
  await connection();
  const parsed = parsePublicId(id);
  if (!parsed) return null;

  const books = await getBooksCollection();
  const cached =
    parsed.kind === "object"
      ? await books.findOne({ _id: parsed.objectId })
      : await books.findOne({ source: parsed.source, sourceId: parsed.sourceId });

  if (cached && Date.now() - cached.fetchedAt.getTime() < MAX_AGE_MS) {
    // Un libro guardado sin portada lo intenta en la siguiente apertura, sin esperar a los 30 días.
    return toBook(needsCoverCheck(cached) ? await completeCover(books, cached) : cached);
  }

  const source = cached?.source ?? (parsed.kind === "source" ? parsed.source : null);
  const sourceId = cached?.sourceId ?? (parsed.kind === "source" ? parsed.sourceId : null);
  if (!source || !sourceId) return null;

  const provider = providerFor(source);
  let fresh: NormalizedBook | null;
  try {
    if (!provider.isEnabled()) throw new Error("Proveedor no disponible");
    fresh = await provider.getById(sourceId);
  } catch (error) {
    if (cached) return toBook(cached);
    throw error;
  }
  if (!fresh) return null;

  const fetchedAt = new Date();
  // Si el proveedor ya no trae portada pero teníamos una (quizá de respaldo), se conserva.
  const merged: NormalizedBook & { coverCheckedAt?: Date } =
    !fresh.coverUrl && cached?.coverUrl ? { ...fresh, coverUrl: cached.coverUrl, coverSource: cached.coverSource } : fresh;
  const unsetKeys: string[] = [];
  if (merged.coverUrl) {
    unsetKeys.push("coverCheckedAt");
  } else if (needsCoverCheck({ coverCheckedAt: cached?.coverCheckedAt })) {
    const patch = coverPatch(await lookupCover(merged));
    Object.assign(merged, patch.set);
    unsetKeys.push(...patch.unset);
  }
  // Los campos opcionales ausentes se quitan para no dejar datos viejos.
  const optional = ["subtitle", "description", "coverUrl", "coverSource", "pageCount", "publishedDate", "isbn13", "isbn10", "categories", "language"] as const;
  const unset = Object.fromEntries(
    [...optional.filter((key) => merged[key] === undefined), ...unsetKeys.filter((key) => !(key in merged))].map(
      (key) => [key, 1 as const],
    ),
  );
  const saved = await books.findOneAndUpdate(
    { source, sourceId },
    {
      $set: { ...Object.fromEntries(Object.entries(merged).filter(([, value]) => value !== undefined)), fetchedAt },
      ...(Object.keys(unset).length > 0 ? { $unset: unset } : {}),
    },
    { upsert: true, returnDocument: "after" },
  );
  return saved ? toBook(saved) : null;
}

/** Alias para la estantería (Sesión 5): garantiza que el libro está en `books`. */
export const ensureBook = getBook;
