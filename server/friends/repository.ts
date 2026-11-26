import "server-only";
import { cache } from "react";
import { ObjectId, type Collection } from "mongodb";
import { getDb } from "@/lib/db";
import type { Relation, UserSearchResult, UserSummary } from "@/types/friends";

export type FriendshipDoc = {
  _id: ObjectId;
  requesterId: ObjectId;
  addresseeId: ObjectId;
  status: "pending" | "accepted";
  /** `<idMenor>_<idMayor>`: un único documento por pareja, sea cual sea quién la pidió. */
  pairKey: string;
  createdAt: Date;
  respondedAt?: Date;
};

let indexesReady: Promise<unknown> | undefined;

export async function getFriendships(): Promise<Collection<FriendshipDoc>> {
  const collection = (await getDb()).collection<FriendshipDoc>("friendships");
  indexesReady ??= Promise.all([
    collection.createIndex({ pairKey: 1 }, { unique: true }),
    collection.createIndex({ requesterId: 1, addresseeId: 1 }, { unique: true }),
    collection.createIndex({ addresseeId: 1, status: 1 }),
  ]).catch((error) => {
    indexesReady = undefined;
    throw error;
  });
  await indexesReady;
  return collection;
}

export function pairKeyOf(a: string, b: string): string {
  return a < b ? `${a}_${b}` : `${b}_${a}`;
}

/**
 * ¿Son amigos aceptados? Es la puerta de privacidad: cualquier consulta de
 * perfil, estantería, estadísticas o actividad ajenas debe pasar por aquí.
 */
export const areFriends = cache(async (userA: string, userB: string): Promise<boolean> => {
  if (userA === userB) return false;
  const doc = await (await getFriendships()).findOne(
    { pairKey: pairKeyOf(userA, userB), status: "accepted" },
    { projection: { _id: 1 } },
  );
  return doc !== null;
});

function relationOf(doc: FriendshipDoc | null | undefined, me: string): Relation {
  if (!doc) return "none";
  if (doc.status === "accepted") return "friends";
  return doc.requesterId.toHexString() === me ? "outgoing" : "incoming";
}

export async function getRelation(me: string, other: string): Promise<Relation> {
  if (me === other) return "none";
  const doc = await (await getFriendships()).findOne({ pairKey: pairKeyOf(me, other) });
  return relationOf(doc, me);
}

/** Relación con varias personas en una sola consulta. */
export async function getRelations(me: string, ids: string[]): Promise<Map<string, Relation>> {
  const result = new Map<string, Relation>(ids.map((id) => [id, "none"]));
  if (ids.length === 0) return result;
  const docs = await (await getFriendships())
    .find({ pairKey: { $in: ids.map((id) => pairKeyOf(me, id)) } })
    .toArray();
  for (const doc of docs) {
    const other = doc.requesterId.toHexString() === me ? doc.addresseeId : doc.requesterId;
    result.set(other.toHexString(), relationOf(doc, me));
  }
  return result;
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

/** Personas de las amistades que cumplen el filtro, con la otra parte ya resuelta. */
async function listOthers(me: string, match: Record<string, unknown>, otherField: "requesterId" | "addresseeId") {
  const rows = await (await getFriendships())
    .aggregate<{ user: UserRef }>([
      { $match: match },
      { $sort: { respondedAt: -1, createdAt: -1 } },
      { $lookup: { from: "user", localField: otherField, foreignField: "_id", as: "user" } },
      { $unwind: "$user" },
      { $project: { "user._id": 1, "user.name": 1, "user.username": 1, "user.image": 1 } },
    ])
    .toArray();
  return rows.map((row) => summary(row.user));
}

export async function listFriends(me: string): Promise<UserSummary[]> {
  const id = new ObjectId(me);
  const rows = await (await getFriendships())
    .aggregate<{ user: UserRef }>([
      { $match: { status: "accepted", $or: [{ requesterId: id }, { addresseeId: id }] } },
      { $addFields: { otherId: { $cond: [{ $eq: ["$requesterId", id] }, "$addresseeId", "$requesterId"] } } },
      { $lookup: { from: "user", localField: "otherId", foreignField: "_id", as: "user" } },
      { $unwind: "$user" },
      { $project: { "user._id": 1, "user.name": 1, "user.username": 1, "user.image": 1 } },
      { $sort: { "user.name": 1 } },
    ])
    .toArray();
  return rows.map((row) => summary(row.user));
}

/** Solicitudes que me han enviado y siguen pendientes. */
export function listIncoming(me: string): Promise<UserSummary[]> {
  return listOthers(me, { addresseeId: new ObjectId(me), status: "pending" }, "requesterId");
}

/** Solicitudes que he enviado y siguen pendientes. */
export function listOutgoing(me: string): Promise<UserSummary[]> {
  return listOthers(me, { requesterId: new ObjectId(me), status: "pending" }, "addresseeId");
}

export async function countPendingIncoming(me: string): Promise<number> {
  return (await getFriendships()).countDocuments({ addresseeId: new ObjectId(me), status: "pending" });
}

/** Ids de mis amigos aceptados. */
export async function listFriendIds(me: string): Promise<ObjectId[]> {
  const id = new ObjectId(me);
  const docs = await (await getFriendships())
    .find(
      { status: "accepted", $or: [{ requesterId: id }, { addresseeId: id }] },
      { projection: { requesterId: 1, addresseeId: 1 } },
    )
    .toArray();
  return docs.map((doc) => (doc.requesterId.equals(id) ? doc.addresseeId : doc.requesterId));
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Busca por @usuario (prefijo) o nombre (contiene). Máx. 20, sin incluirme. */
export async function searchUsers(me: string, query: string): Promise<UserSearchResult[]> {
  const escaped = escapeRegex(query);
  const docs = await (await getDb())
    .collection<UserRef>("user")
    .find(
      {
        _id: { $ne: new ObjectId(me) },
        $or: [
          { username: { $regex: `^${escaped}`, $options: "i" } },
          { name: { $regex: escaped, $options: "i" } },
        ],
      },
      { projection: { name: 1, username: 1, image: 1 } },
    )
    .sort({ username: 1 })
    .limit(20)
    .toArray();

  const users = docs.filter((doc) => doc.username).map(summary);
  const relations = await getRelations(me, users.map((user) => user.id));
  return users.map((user) => ({ ...user, relation: relations.get(user.id) ?? "none" }));
}
