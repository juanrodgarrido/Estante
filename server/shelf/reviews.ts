import "server-only";
import { ObjectId } from "mongodb";
import { listFriendIds } from "@/server/friends/repository";
import type { FriendReview } from "@/types/review";
import { getUserBooks } from "./repository";

type Row = {
  rating?: number;
  review?: { text: string; hasSpoilers: boolean; updatedAt: Date };
  updatedAt: Date;
  sortDate: Date;
  user: { _id: ObjectId; name: string; username?: string; image?: string | null };
};

/**
 * Notas y reseñas de mis amigos aceptados sobre un libro que han leído, de la más
 * reciente a la más antigua. Los amigos se calculan en cada consulta (como en la
 * actividad): quien no es amigo no aparece nunca, ni siquiera conociendo el libro.
 */
export async function listFriendReviews(me: string, bookId: string, limit = 50): Promise<FriendReview[]> {
  const friendIds = await listFriendIds(me);
  if (friendIds.length === 0) return [];

  const rows = await (await getUserBooks())
    .aggregate<Row>([
      {
        $match: {
          userId: { $in: friendIds },
          bookId: new ObjectId(bookId),
          status: "read",
          $or: [{ review: { $exists: true } }, { rating: { $exists: true } }],
        },
      },
      { $addFields: { sortDate: { $ifNull: ["$review.updatedAt", "$updatedAt"] } } },
      { $sort: { sortDate: -1, _id: -1 } },
      { $limit: limit },
      { $lookup: { from: "user", localField: "userId", foreignField: "_id", as: "user" } },
      { $unwind: "$user" },
    ])
    .toArray();

  return rows.map((row) => ({
    user: {
      id: row.user._id.toHexString(),
      name: row.user.name,
      username: row.user.username ?? "",
      image: row.user.image ?? null,
    },
    rating: row.rating,
    review: row.review ? { text: row.review.text, hasSpoilers: row.review.hasSpoilers } : undefined,
    date: row.sortDate.toISOString(),
  }));
}
