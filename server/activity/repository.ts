import "server-only";
import { ObjectId, type Collection } from "mongodb";
import { getDb } from "@/lib/db";
import { listFriendIds } from "@/server/friends/repository";
import { getUserBooks } from "@/server/shelf/repository";
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
      const last = await activities.findOne(
        { userId: user, bookId: book, type: { $in: ["finished", "rated"] } },
        { sort: { createdAt: -1 } },
      );
      if (last && now.getTime() - last.createdAt.getTime() < MERGE_WINDOW_MS) {
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

/**
 * Registra «reseñó». El texto no se guarda en la actividad (se lee de la reseña al
 * pintar), así que editarla en los 15 minutos siguientes no crea otra entrada y
 * ya queda reflejada en la existente.
 */
export async function recordReviewActivity(userId: string, bookId: string): Promise<void> {
  try {
    const activities = await getActivities();
    const user = new ObjectId(userId);
    const book = new ObjectId(bookId);
    const now = new Date();
    const last = await activities.findOne({ userId: user, bookId: book, type: "reviewed" }, { sort: { createdAt: -1 } });
    if (last && now.getTime() - last.createdAt.getTime() < MERGE_WINDOW_MS) return;
    await activities.insertOne({ _id: new ObjectId(), userId: user, bookId: book, type: "reviewed", createdAt: now });
  } catch (error) {
    console.error("recordReviewActivity", error);
  }
}

/** Borrar la reseña (o sacar el libro de Leídos) borra su actividad. */
export async function clearReviewActivity(userId: string, bookId: string): Promise<void> {
  try {
    await (await getActivities()).deleteMany({
      userId: new ObjectId(userId),
      bookId: new ObjectId(bookId),
      type: "reviewed",
    });
  } catch (error) {
    console.error("clearReviewActivity", error);
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

  // «Reseñó»: el extracto sale de la reseña actual (nunca si tiene spoilers).
  const reviewed = page.filter((row) => row.type === "reviewed");
  const reviews = new Map<string, { text: string; hasSpoilers: boolean }>();
  if (reviewed.length > 0) {
    const docs = await (await getUserBooks())
      .find(
        {
          status: "read",
          review: { $exists: true },
          $or: reviewed.map((row) => ({ userId: row.userId, bookId: row.bookId })),
        },
        { projection: { userId: 1, bookId: 1, review: 1 } },
      )
      .toArray();
    for (const doc of docs) {
      if (doc.review) reviews.set(`${doc.userId.toHexString()}_${doc.bookId.toHexString()}`, doc.review);
    }
  }

  const items: ActivityItem[] = page.flatMap((row): ActivityItem[] => {
    let excerpt: string | undefined;
    if (row.type === "reviewed") {
      const review = reviews.get(`${row.userId.toHexString()}_${row.bookId.toHexString()}`);
      if (!review) return []; // reseña ya borrada: no hay nada que enseñar
      if (!review.hasSpoilers) excerpt = excerptOf(review.text);
    }
    return [toItem(row, excerpt)];
  });

  return {
    items,
    nextCursor: last ? `${last.createdAt.getTime()}_${last._id.toHexString()}` : null,
  };
}

const EXCERPT_LENGTH = 160;

function excerptOf(text: string): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > EXCERPT_LENGTH ? `${flat.slice(0, EXCERPT_LENGTH).trimEnd()}…` : flat;
}

function toItem(row: Row, excerpt?: string): ActivityItem {
  return {
    id: row._id.toHexString(),
    type: row.type,
    rating: row.rating,
    ...(excerpt ? { excerpt } : {}),
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
  };
}
