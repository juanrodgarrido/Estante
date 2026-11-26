import "server-only";
import { ObjectId, type Collection } from "mongodb";
import { getDb } from "@/lib/db";
import { areFriends, listFriendIds, pairKeyOf } from "@/server/friends/repository";
import type { UserSummary } from "@/types/friends";
import type { ChatMessage, ConversationListItem, MessagesPage } from "@/types/chat";

export type ConversationDoc = {
  _id: ObjectId;
  /** Ordenados de menor a mayor. */
  participantIds: [ObjectId, ObjectId];
  /** `<idMenor>_<idMayor>`: una sola conversación por pareja. */
  pairKey: string;
  lastMessage?: { text: string; senderId: ObjectId; createdAt: Date };
  /** Última lectura de cada participante, por id de usuario. */
  lastReadAt: Record<string, Date>;
  createdAt: Date;
  updatedAt: Date;
};

export type MessageDoc = {
  _id: ObjectId;
  conversationId: ObjectId;
  senderId: ObjectId;
  text: string;
  /** uuid del cliente: hace idempotente el reintento de un envío. */
  clientId: string;
  createdAt: Date;
};

export const MESSAGES_PAGE_SIZE = 30;

let conversationIndexes: Promise<unknown> | undefined;
let messageIndexes: Promise<unknown> | undefined;

export async function getConversations(): Promise<Collection<ConversationDoc>> {
  const collection = (await getDb()).collection<ConversationDoc>("conversations");
  conversationIndexes ??= Promise.all([
    collection.createIndex({ pairKey: 1 }, { unique: true }),
    collection.createIndex({ participantIds: 1, "lastMessage.createdAt": -1 }),
  ]).catch((error) => {
    conversationIndexes = undefined;
    throw error;
  });
  await conversationIndexes;
  return collection;
}

export async function getMessages(): Promise<Collection<MessageDoc>> {
  const collection = (await getDb()).collection<MessageDoc>("messages");
  messageIndexes ??= Promise.all([
    collection.createIndex({ conversationId: 1, createdAt: -1, _id: -1 }),
    collection.createIndex({ conversationId: 1, clientId: 1 }, { unique: true }),
  ]).catch((error) => {
    messageIndexes = undefined;
    throw error;
  });
  await messageIndexes;
  return collection;
}

export function toChatMessage(doc: MessageDoc): ChatMessage {
  return {
    id: doc._id.toHexString(),
    conversationId: doc.conversationId.toHexString(),
    senderId: doc.senderId.toHexString(),
    text: doc.text,
    createdAt: doc.createdAt.toISOString(),
    clientId: doc.clientId,
  };
}

/**
 * Puerta de acceso a una conversación: solo si soy participante **y** sigo siendo
 * amigo de la otra persona. La usan la página, la API, las acciones y la
 * autorización de Pusher; si devuelve `null`, no hay acceso.
 */
export async function getConversationAccess(
  me: string,
  conversationId: string,
): Promise<{ conversation: ConversationDoc; otherId: string } | null> {
  if (!ObjectId.isValid(conversationId) || !ObjectId.isValid(me)) return null;
  const meId = new ObjectId(me);
  const conversation = await (await getConversations()).findOne({
    _id: new ObjectId(conversationId),
    participantIds: meId,
  });
  if (!conversation) return null;
  const other = conversation.participantIds.find((id) => !id.equals(meId));
  if (!other) return null;
  const otherId = other.toHexString();
  if (!(await areFriends(me, otherId))) return null;
  return { conversation, otherId };
}

/** Devuelve el id de la conversación con `other`, creándola si no existe. No comprueba la amistad. */
export async function findOrCreateConversation(me: string, other: string): Promise<string> {
  const ids = [new ObjectId(me), new ObjectId(other)].sort((a, b) =>
    a.toHexString().localeCompare(b.toHexString()),
  ) as [ObjectId, ObjectId];
  const pairKey = pairKeyOf(me, other);
  const now = new Date();
  const conversations = await getConversations();
  try {
    const doc = await conversations.findOneAndUpdate(
      { pairKey },
      {
        $setOnInsert: {
          participantIds: ids,
          pairKey,
          lastReadAt: {},
          createdAt: now,
          updatedAt: now,
        },
      },
      { upsert: true, returnDocument: "after", projection: { _id: 1 } },
    );
    if (doc) return doc._id.toHexString();
  } catch (error) {
    // Carrera: las dos personas la abren a la vez y el índice único frena a una.
    if ((error as { code?: number }).code !== 11000) throw error;
  }
  const existing = await conversations.findOne({ pairKey }, { projection: { _id: 1 } });
  if (!existing) throw new Error("No se ha podido crear la conversación");
  return existing._id.toHexString();
}

type UserRef = { _id: ObjectId; name: string; username?: string; image?: string | null };

function summary(user: UserRef): UserSummary {
  return {
    id: user._id.toHexString(),
    name: user.name,
    username: user.username ?? "",
    image: user.image ?? null,
  };
}

/** Datos mínimos de la otra persona de la conversación. */
export async function getUserSummary(userId: string): Promise<UserSummary | null> {
  const doc = await (await getDb())
    .collection<UserRef>("user")
    .findOne({ _id: new ObjectId(userId) }, { projection: { name: 1, username: 1, image: 1 } });
  return doc ? summary(doc) : null;
}

/** ¿El último mensaje es de la otra persona y posterior a mi última lectura? */
function isUnread(conversation: Pick<ConversationDoc, "lastMessage" | "lastReadAt">, me: string): boolean {
  const last = conversation.lastMessage;
  if (!last || last.senderId.toHexString() === me) return false;
  const read = conversation.lastReadAt?.[me];
  return !read || last.createdAt > read;
}

/** Mis conversaciones con mensajes y con amigos actuales, de la más reciente a la más antigua. */
export async function listConversations(me: string): Promise<ConversationListItem[]> {
  const meId = new ObjectId(me);
  const friendIds = await listFriendIds(me);
  if (friendIds.length === 0) return [];

  const rows = await (await getConversations())
    .aggregate<ConversationDoc & { otherId: ObjectId; other: UserRef }>([
      { $match: { participantIds: meId, lastMessage: { $exists: true } } },
      { $addFields: { otherId: { $first: { $filter: { input: "$participantIds", cond: { $ne: ["$$this", meId] } } } } } },
      { $match: { otherId: { $in: friendIds } } },
      { $sort: { "lastMessage.createdAt": -1 } },
      { $limit: 100 },
      { $lookup: { from: "user", localField: "otherId", foreignField: "_id", as: "other" } },
      { $unwind: "$other" },
      { $project: { lastMessage: 1, lastReadAt: 1, "other._id": 1, "other.name": 1, "other.username": 1, "other.image": 1 } },
    ])
    .toArray();

  return rows.flatMap((row) =>
    row.lastMessage
      ? [
          {
            id: row._id.toHexString(),
            other: summary(row.other),
            lastMessage: {
              text: row.lastMessage.text,
              senderId: row.lastMessage.senderId.toHexString(),
              createdAt: row.lastMessage.createdAt.toISOString(),
            },
            unread: isUnread(row, me),
          },
        ]
      : [],
  );
}

/** Página de mensajes anteriores a `cursor` (o los últimos), de más antiguo a más reciente. */
export async function listMessages(conversationId: string, cursor?: string): Promise<MessagesPage> {
  const filter: Record<string, unknown> = { conversationId: new ObjectId(conversationId) };
  if (cursor) {
    const [ms, id] = cursor.split("_");
    const date = new Date(Number(ms));
    const _id = new ObjectId(id);
    filter.$or = [{ createdAt: { $lt: date } }, { createdAt: date, _id: { $lt: _id } }];
  }
  const docs = await (await getMessages())
    .find(filter)
    .sort({ createdAt: -1, _id: -1 })
    .limit(MESSAGES_PAGE_SIZE + 1)
    .toArray();

  const hasMore = docs.length > MESSAGES_PAGE_SIZE;
  const page = docs.slice(0, MESSAGES_PAGE_SIZE);
  const oldest = page.at(-1);
  return {
    messages: page.reverse().map(toChatMessage),
    nextCursor: hasMore && oldest ? `${oldest.createdAt.getTime()}_${oldest._id.toHexString()}` : null,
  };
}

/** Total de mensajes sin leer (de la otra persona y posteriores a mi última lectura) en conversaciones con amigos. */
export async function countUnread(me: string): Promise<number> {
  const meId = new ObjectId(me);
  const friendIds = await listFriendIds(me);
  if (friendIds.length === 0) return 0;

  const candidates = await (await getConversations())
    .find(
      { participantIds: meId, "lastMessage.senderId": { $in: friendIds } },
      { projection: { lastMessage: 1, lastReadAt: 1 } },
    )
    .toArray();
  const unread = candidates.filter((conversation) => isUnread(conversation, me));
  if (unread.length === 0) return 0;

  const [row] = await (await getMessages())
    .aggregate<{ total: number }>([
      {
        $match: {
          $or: unread.map((conversation) => {
            const read = conversation.lastReadAt?.[me];
            return {
              conversationId: conversation._id,
              senderId: { $ne: meId },
              ...(read ? { createdAt: { $gt: read } } : {}),
            };
          }),
        },
      },
      { $count: "total" },
    ])
    .toArray();
  return row?.total ?? 0;
}
