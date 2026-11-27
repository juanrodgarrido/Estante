// Busca portada de respaldo para los libros de `books` que no tienen. Uso: npm run covers:backfill
// Se puede lanzar varias veces: se saltan los que ya tienen portada o se intentaron hace menos de 30 días.
import { MongoClient } from "mongodb";
import {
  COVER_RECHECK_MS,
  coverPatch,
  createPacer,
  findFallbackCover,
  type FallbackStep,
} from "../server/books/cover-fallback.ts";

// Open Library limita las portadas por ISBN a unas 100 peticiones cada 5 minutos por IP.
const PACE_MS: Record<FallbackStep, number> = {
  "openlibrary-isbn": 3200,
  "openlibrary-search": 1200,
  "google-edition": 400,
};
// Tres fallos seguidos de una fuente (cuota, caída): se deja de usar en esta pasada.
const MAX_CONSECUTIVE_FAILURES = 3;

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("Falta la variable de entorno MONGODB_URI (¿.env.local?).");
  process.exit(1);
}

const client = new MongoClient(uri);
const found: Record<string, number> = {};
let processed = 0;
let stillMissing = 0;
let retrySoon = 0;
let interrupted = false;
process.on("SIGINT", () => {
  interrupted = true;
  console.log("\nInterrumpido: termino el libro en curso y muestro el resumen…");
});

try {
  await client.connect();
  const books = client.db(process.env.MONGODB_DB ?? "estante").collection("books");
  const missing = await books
    .find({
      $and: [
        { $or: [{ coverUrl: { $exists: false } }, { coverUrl: null }, { coverUrl: "" }] },
        { $or: [{ coverCheckedAt: { $exists: false } }, { coverCheckedAt: { $lt: new Date(Date.now() - COVER_RECHECK_MS) } }] },
      ],
    })
    .project({ source: 1, sourceId: 1, title: 1, authors: 1, isbn13: 1, isbn10: 1, language: 1 })
    .toArray();
  console.log(`${missing.length} libros sin portada pendientes de buscar.`);

  const pace = Object.fromEntries(
    (Object.keys(PACE_MS) as FallbackStep[]).map((step) => [step, createPacer(PACE_MS[step])]),
  );
  const skip = new Set<FallbackStep>();
  const failures: Partial<Record<FallbackStep, number>> = {};

  for (const [index, doc] of missing.entries()) {
    if (interrupted) break;
    const lookup = await findFallbackCover(
      {
        source: doc.source,
        sourceId: doc.sourceId,
        title: doc.title,
        authors: doc.authors ?? [],
        isbn13: doc.isbn13,
        isbn10: doc.isbn10,
        language: doc.language,
      },
      { pace, skip },
    );
    for (const step of Object.keys(PACE_MS) as FallbackStep[]) {
      if (skip.has(step)) continue;
      failures[step] = lookup.failed.includes(step) ? (failures[step] ?? 0) + 1 : 0;
      if ((failures[step] ?? 0) >= MAX_CONSECUTIVE_FAILURES) {
        skip.add(step);
        console.warn(`  ! «${step}» falla de forma repetida: se omite el resto de esta pasada.`);
      }
    }

    const patch = coverPatch(lookup);
    await books.updateOne(
      { _id: doc._id },
      { $set: patch.set, $unset: Object.fromEntries(patch.unset.map((key) => [key, 1])) },
    );
    processed++;
    if (lookup.found) {
      found[lookup.found.source] = (found[lookup.found.source] ?? 0) + 1;
    } else {
      stillMissing++;
      if (lookup.failed.length > 0) retrySoon++;
    }
    const result = lookup.found ? `portada de ${lookup.found.source}` : "sin portada";
    console.log(`[${index + 1}/${missing.length}] ${doc.title} — ${result}`);
  }

  const total = Object.values(found).reduce((sum, n) => sum + n, 0);
  console.log(`\nResumen: ${processed} libros revisados.`);
  console.log(`  Portadas encontradas: ${total}`);
  for (const [source, n] of Object.entries(found)) console.log(`    ${source}: ${n}`);
  console.log(`  Siguen sin portada: ${stillMissing}`);
  if (retrySoon > 0) console.log(`    (${retrySoon} con alguna fuente caída: se reintentarán en un día)`);
  if (interrupted) console.log("  Quedaron libros sin revisar: vuelve a lanzar el script.");
} finally {
  await client.close();
}
