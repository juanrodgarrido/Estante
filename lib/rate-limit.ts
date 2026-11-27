import "server-only";
import { getDb } from "@/lib/db";

let ttlIndex: Promise<unknown> | undefined;

/**
 * Límite de uso por clave (p. ej. `search:<userId>`) en ventanas fijas, guardado en MongoDB
 * (la memoria no se comparte entre instancias de Vercel). Devuelve `true` si aún se puede.
 * Si la base de datos falla, deja pasar: el límite es un freno de abuso, no una puerta.
 */
export async function allowRequest(key: string, max: number, windowSeconds: number): Promise<boolean> {
  try {
    const db = await getDb();
    const collection = db.collection<{ _id: string; count: number; expiresAt: Date }>("rateLimits");
    ttlIndex ??= collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }).catch((error) => {
      ttlIndex = undefined;
      throw error;
    });
    await ttlIndex;
    const windowMs = windowSeconds * 1000;
    const bucket = Math.floor(Date.now() / windowMs);
    const doc = await collection.findOneAndUpdate(
      { _id: `${key}:${bucket}` },
      { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date((bucket + 1) * windowMs + windowMs) } },
      { upsert: true, returnDocument: "after" },
    );
    return (doc?.count ?? 1) <= max;
  } catch (error) {
    console.error("rate-limit", error);
    return true;
  }
}
