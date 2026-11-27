import "server-only";
import { ObjectId, type Collection } from "mongodb";
import { getDb } from "@/lib/db";
import type { ShelfEntry, ShelfState, ShelfStatus } from "@/types/shelf";

export type UserBookDoc = {
  _id: ObjectId;
  userId: ObjectId;
  bookId: ObjectId;
  status: ShelfStatus;
  rating?: number;
  currentPage?: number;
  startedAt?: Date;
  finishedAt?: Date;
  /** Solo puede existir con `status: "read"`. */
  review?: { text: string; hasSpoilers: boolean; createdAt: Date; updatedAt: Date };
  createdAt: Date;
  updatedAt: Date;
};

let indexesReady: Promise<unknown> | undefined;

export async function getUserBooks(): Promise<Collection<UserBookDoc>> {
  const collection = (await getDb()).collection<UserBookDoc>("userBooks");
  indexesReady ??= Promise.all([
    collection.createIndex({ userId: 1, bookId: 1 }, { unique: true }),
    collection.createIndex({ userId: 1, status: 1, updatedAt: -1 }),
  ]).catch((error) => {
    indexesReady = undefined;
    throw error;
  });
  await indexesReady;
  return collection;
}

/** Estado del libro en la estantería del usuario, o `null` si no está. */
export async function getShelfState(userId: string, bookId: string): Promise<ShelfState | null> {
  const doc = await (await getUserBooks()).findOne({
    userId: new ObjectId(userId),
    bookId: new ObjectId(bookId),
  });
  if (!doc) return null;
  return {
    status: doc.status,
    rating: doc.rating,
    currentPage: doc.currentPage,
    review: doc.review
      ? {
          text: doc.review.text,
          hasSpoilers: doc.review.hasSpoilers,
          createdAt: doc.review.createdAt.toISOString(),
          updatedAt: doc.review.updatedAt.toISOString(),
        }
      : undefined,
  };
}

/** Libros del usuario (todos o de un estado), por última actualización. */
/** Número de libros del usuario en cada estado. */
export async function countShelf(userId: string): Promise<Record<ShelfStatus, number>> {
  const rows = await (await getUserBooks())
    .aggregate<{ _id: ShelfStatus; count: number }>([
      { $match: { userId: new ObjectId(userId) } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ])
    .toArray();
  const counts: Record<ShelfStatus, number> = { read: 0, reading: 0, want: 0 };
  for (const row of rows) counts[row._id] = row.count;
  return counts;
}

export async function listShelf(userId: string, status?: ShelfStatus, limit?: number): Promise<ShelfEntry[]> {
  const docs = await (await getUserBooks())
    .aggregate<
      UserBookDoc & {
        book: {
          source: "google" | "openlibrary";
          sourceId: string;
          title: string;
          authors: string[];
          coverUrl?: string;
          pageCount?: number;
        };
      }
    >([
      { $match: { userId: new ObjectId(userId), ...(status ? { status } : {}) } },
      { $sort: { updatedAt: -1 } },
      ...(limit ? [{ $limit: limit }] : []),
      { $lookup: { from: "books", localField: "bookId", foreignField: "_id", as: "book" } },
      { $unwind: "$book" },
    ])
    .toArray();

  return docs.map((doc) => ({
    bookId: doc.bookId.toHexString(),
    publicId: `${doc.book.source === "google" ? "g" : "ol"}-${doc.book.sourceId}`,
    title: doc.book.title,
    authors: doc.book.authors,
    coverUrl: doc.book.coverUrl,
    pageCount: doc.book.pageCount,
    status: doc.status,
    rating: doc.rating,
    currentPage: doc.currentPage,
    hasReview: doc.review !== undefined,
    startedAt: doc.startedAt?.toISOString(),
    finishedAt: doc.finishedAt?.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  }));
}
