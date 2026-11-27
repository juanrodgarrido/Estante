// Crea los índices del plan en MongoDB (idempotente). Uso: npm run db:indexes
// Las especificaciones deben coincidir con las que crean al vuelo los repositorios de server/.
import { MongoClient, type CreateIndexesOptions, type IndexSpecification } from "mongodb";

type Spec = [collection: string, keys: IndexSpecification, options?: CreateIndexesOptions];

const specs: Spec[] = [
  ["books", { source: 1, sourceId: 1 }, { unique: true }],
  ["books", { isbn13: 1 }],
  ["userBooks", { userId: 1, bookId: 1 }, { unique: true }],
  ["userBooks", { userId: 1, status: 1, updatedAt: -1 }],
  ["friendships", { pairKey: 1 }, { unique: true }],
  ["friendships", { requesterId: 1, addresseeId: 1 }, { unique: true }],
  ["friendships", { addresseeId: 1, status: 1 }],
  ["activities", { userId: 1, createdAt: -1 }],
  ["conversations", { pairKey: 1 }, { unique: true }],
  ["conversations", { participantIds: 1, "lastMessage.createdAt": -1 }],
  ["messages", { conversationId: 1, createdAt: -1, _id: -1 }],
  ["messages", { conversationId: 1, clientId: 1 }, { unique: true }],
  // Better Auth ya crea los suyos (email, token, userId); este es el de la búsqueda de personas.
  ["user", { username: 1 }, { unique: true, sparse: true }],
];

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("Falta la variable de entorno MONGODB_URI (¿.env.local?).");
  process.exit(1);
}

const client = new MongoClient(uri);
let failed = false;
try {
  await client.connect();
  const db = client.db(process.env.MONGODB_DB ?? "estante");
  for (const [name, keys, options] of specs) {
    const label = `${name} ${JSON.stringify(keys)}`;
    try {
      const collection = db.collection(name);
      const existing = await collection.listIndexes().toArray().catch(() => []);
      const created = await collection.createIndex(keys, options);
      const existed = existing.some((index) => index.name === created);
      console.log(`${existed ? "ya existía" : "creado    "}  ${label}`);
    } catch (error) {
      failed = true;
      console.error(`ERROR      ${label}: ${error instanceof Error ? error.message : error}`);
    }
  }
} finally {
  await client.close();
}
process.exit(failed ? 1 : 0);
