import "server-only";
import { MongoClient, type Db } from "mongodb";

// Un único cliente reutilizado. En desarrollo se guarda en `globalThis` para
// sobrevivir al hot reload; en serverless, cada instancia reutiliza el suyo.
// El driver conecta de forma perezosa en la primera operación.
const globalForMongo = globalThis as unknown as {
  _mongoClient?: MongoClient;
};

export function getMongoClient(): MongoClient {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("Falta la variable de entorno MONGODB_URI");
  }
  globalForMongo._mongoClient ??= new MongoClient(uri);
  return globalForMongo._mongoClient;
}

/** `Db` síncrono (lo necesita el adaptador de Better Auth). */
export function getDbSync(): Db {
  return getMongoClient().db(process.env.MONGODB_DB ?? "estante");
}

export async function getDb(): Promise<Db> {
  await getMongoClient().connect();
  return getDbSync();
}
