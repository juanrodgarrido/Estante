import "server-only";
import { connection } from "next/server";
import { ObjectId, type Collection } from "mongodb";
import { getDb } from "@/lib/db";
import type { Book, BookSource, NormalizedBook } from "@/types/book";
import { googleBooks } from "./google";
import { openLibrary } from "./openlibrary";
import type { BookProvider } from "./types";

const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

type BookDoc = NormalizedBook & { _id: ObjectId; fetchedAt: Date };

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

  if (cached && Date.now() - cached.fetchedAt.getTime() < MAX_AGE_MS) return toBook(cached);

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
  // Los campos opcionales ausentes se quitan para no dejar datos viejos.
  const unset = Object.fromEntries(
    (["subtitle", "description", "coverUrl", "pageCount", "publishedDate", "isbn13", "isbn10", "categories", "language"] as const)
      .filter((key) => fresh[key] === undefined)
      .map((key) => [key, 1 as const]),
  );
  const saved = await books.findOneAndUpdate(
    { source, sourceId },
    {
      $set: { ...Object.fromEntries(Object.entries(fresh).filter(([, value]) => value !== undefined)), fetchedAt },
      ...(Object.keys(unset).length > 0 ? { $unset: unset } : {}),
    },
    { upsert: true, returnDocument: "after" },
  );
  return saved ? toBook(saved) : null;
}

/** Alias para la estantería (Sesión 5): garantiza que el libro está en `books`. */
export const ensureBook = getBook;
