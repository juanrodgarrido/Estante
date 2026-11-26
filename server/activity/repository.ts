import "server-only";
import { ObjectId, type Collection } from "mongodb";
import { getDb } from "@/lib/db";
import { listFriendIds } from "@/server/friends/repository";
import type { ActivityItem, ActivityPage, ActivityType } from "@/types/friends";

export type ActivityDoc = {
  _id: ObjectId;
  userId: ObjectId;
  bookId: ObjectId;
  type: ActivityType;
  rating?: number;
  createdAt: Date;
};

/** Ventana en la que cambiar la nota de un libro recién terminado no crea otra entrada. */
const MERGE_WINDOW_MS = 15 * 60 * 1000;

let indexesReady: Promise<unknown> | undefined;

export async function getActivities(): Promise<Collection<ActivityDoc>> {
  const collection = (await getDb()).collection<ActivityDoc>("activities");
  indexesReady ??= collection.createIndex({ userId: 1, createdAt: -1 }).catch((error) => {
    indexesReady = undefined;
    throw error;
  });
  await indexesReady;
  return collection;
}

/**
 * Registra un cambio de estantería. Nunca lanza: la actividad es secundaria y no
 * debe romper la acción principal.
 */
export async function recordActivity(
  userId: string,
  bookId: string,
  type: ActivityType,
  rating?: number,
): Promise<void> {
  try {
    const activities = await getActivities();
    const user = new ObjectId(userId);
    const book = new ObjectId(bookId);
    const now = new Date();

    if (type === "rated") {
      const last = await activities.findOne({ userId: user, bookId: book }, { sort: { createdAt: -1 } });
      if (last && last.type !== "started" && now.getTime() - last.createdAt.getTime() < MERGE_WINDOW_MS) {
        await activities.updateOne({ _id: last._id }, { $set: { rating: rating } });
        return;
      }
    }

    await activities.insertOne({
      _id: new ObjectId(),
      userId: user,
      bookId: book,
      type,
      ...(rating !== undefined ? { rating } : {}),
      createdAt: now,
    });
  } catch (error) {
    console.error("recordActivity", error);
  }
}

/** Quita la valoración: borra los «valoró» del libro y la nota de «terminó». */
export async function clearRatingActivity(userId: string, bookId: string): Promise<void> {
  try {
    const activities = await getActivities();
    const filter = { userId: new ObjectId(userId), bookId: new ObjectId(bookId) };
    await Promise.all([
      activities.deleteMany({ ...filter, type: "rated" }),
      activities.updateMany({ ...filter, type: "finished" }, { $unset: { rating: 1 } }),
    ]);
  } catch (error) {
    console.error("clearRatingActivity", error);
  }
}

/** Al quitar un libro de la estantería desaparece su actividad. */
export async function clearActivity(userId: string, bookId: string): Promise<void> {
  try {
    await (await getActivities()).deleteMany({
      userId: new ObjectId(userId),
      bookId: new ObjectId(bookId),
    });
  } catch (error) {
    console.error("clearActivity", error);
  }
}

type Row = ActivityDoc & {
  user: { _id: ObjectId; name: string; username?: string; image?: string | null };
  book: {
    source: "google" | "openlibrary";
    sourceId: string;
    title: string;
    authors: string[];
    coverUrl?: string;
  };
};

function parseCursor(cursor: string): { createdAt: Date; id: ObjectId } {
  const [ms, id] = cursor.split("_");
  return { createdAt: new Date(Number(ms)), id: new ObjectId(id) };
}

/**
 * Últimos cambios de estantería de mis amigos aceptados. Los amigos se calculan
 * en cada consulta, así que al eliminar una amistad su actividad deja de verse.
 */
export async function listFriendActivity(me: string, cursor?: string, limit = 10): Promise<ActivityPage> {
  const friendIds = await listFriendIds(me);
  if (friendIds.length === 0) return { items: [], nextCursor: null };

  const match: Record<string, unknown> = { userId: { $in: friendIds } };
  if (cursor) {
    const { createdAt, id } = parseCursor(cursor);
    match.$or = [{ createdAt: { $lt: createdAt } }, { createdAt, _id: { $lt: id } }];
  }

  const rows = await (await getActivities())
    .aggregate<Row>([
      { $match: match },
      { $sort: { createdAt: -1, _id: -1 } },
      { $limit: limit + 1 },
      { $lookup: { from: "user", localField: "userId", foreignField: "_id", as: "user" } },
      { $lookup: { from: "books", localField: "bookId", foreignField: "_id", as: "book" } },
      { $unwind: "$user" },
      { $unwind: "$book" },
    ])
    .toArray();

  const page = rows.slice(0, limit);
  const last = rows.length > limit ? rows[limit - 1] : null;

  const items: ActivityItem[] = page.map((row) => ({
    id: row._id.toHexString(),
    type: row.type,
    rating: row.rating,
    createdAt: row.createdAt.toISOString(),
    user: {
      id: row.user._id.toHexString(),
      name: row.user.name,
      username: row.user.username ?? "",
      image: row.user.image ?? null,
    },
    book: {
      publicId: `${row.book.source === "google" ? "g" : "ol"}-${row.book.sourceId}`,
      title: row.book.title,
      author: row.book.authors[0],
      coverUrl: row.book.coverUrl,
    },
  }));

  return {
    items,
    nextCursor: last ? `${last.createdAt.getTime()}_${last._id.toHexString()}` : null,
  };
}
