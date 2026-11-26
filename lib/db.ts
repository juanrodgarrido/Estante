import "server-only";
import { MongoClient, type Db } from "mongodb";

// Un único cliente reutilizado. En desarrollo se guarda en `globalThis` para
// sobrevivir al hot reload; en serverless, cada instancia reutiliza el suyo.
const globalForMongo = globalThis as unknown as {
  _mongoClient?: Promise<MongoClient>;
};

function getClient(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("Falta la variable de entorno MONGODB_URI");
  }
  globalForMongo._mongoClient ??= new MongoClient(uri).connect();
  return globalForMongo._mongoClient;
}

export async function getDb(): Promise<Db> {
  const client = await getClient();
  return client.db(process.env.MONGODB_DB ?? "estante");
}
