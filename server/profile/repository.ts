import "server-only";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/db";
import { usernameSchema } from "@/lib/validation/auth";
import type { UserSummary } from "@/types/friends";
import type { ProfileStats } from "@/types/user";
import { getUserBooks } from "@/server/shelf/repository";

type UserDoc = {
  _id: ObjectId;
  name: string;
  username?: string;
  bio?: string;
  image?: string | null;
};

export type AvatarDoc = {
  _id: ObjectId; // = id del usuario
  data: import("mongodb").Binary;
  contentType: string;
  updatedAt: Date;
};

export async function getUsersCollection() {
  return (await getDb()).collection<UserDoc>("user");
}

export async function getAvatars() {
  return (await getDb()).collection<AvatarDoc>("avatars");
}

/**
 * Datos públicos de una persona por su @usuario (minúsculas), o `null` si no existe.
 * Sin bio a propósito: la bio solo la ven los amigos (`getOtherProfile`).
 */
export async function getProfileByUsername(username: string): Promise<UserSummary | null> {
  const parsed = usernameSchema.safeParse(username.toLowerCase());
  if (!parsed.success) return null;
  const doc = await (await getUsersCollection()).findOne(
    { username: parsed.data },
    { projection: { name: 1, username: 1, image: 1 } },
  );
  if (!doc) return null;
  return {
    id: doc._id.toHexString(),
    name: doc.name,
    username: doc.username ?? parsed.data,
    image: doc.image ?? null,
  };
}

/** Bio de una persona. Solo llamar tras comprobar `areFriends`. */
export async function getBioById(userId: string): Promise<string> {
  const doc = await (await getUsersCollection()).findOne(
    { _id: new ObjectId(userId) },
    { projection: { bio: 1 } },
  );
  return doc?.bio ?? "";
}

/** Estadísticas de lectura. El "año" es el año natural en UTC. */
export async function getProfileStats(userId: string): Promise<ProfileStats> {
  const yearStart = new Date(Date.UTC(new Date().getUTCFullYear(), 0, 1));
  const [row] = await (await getUserBooks())
    .aggregate<{ readTotal: number; readThisYear: number; pagesThisYear: number; averageRating: number | null }>([
      { $match: { userId: new ObjectId(userId), status: "read" } },
      { $lookup: { from: "books", localField: "bookId", foreignField: "_id", as: "book" } },
      {
        $group: {
          _id: null,
          readTotal: { $sum: 1 },
          readThisYear: { $sum: { $cond: [{ $gte: ["$finishedAt", yearStart] }, 1, 0] } },
          pagesThisYear: {
            $sum: {
              $cond: [
                { $gte: ["$finishedAt", yearStart] },
                { $ifNull: [{ $arrayElemAt: ["$book.pageCount", 0] }, 0] },
                0,
              ],
            },
          },
          averageRating: { $avg: "$rating" },
        },
      },
    ])
    .toArray();
  return {
    readTotal: row?.readTotal ?? 0,
    readThisYear: row?.readThisYear ?? 0,
    pagesThisYear: row?.pagesThisYear ?? 0,
    averageRating: row?.averageRating ?? null,
  };
}
