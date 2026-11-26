"use server";

import { revalidatePath } from "next/cache";
import { ObjectId } from "mongodb";
import { targetUserSchema } from "@/lib/validation/friends";
import { getCurrentUser } from "@/server/auth";
import { getUsersCollection } from "@/server/profile/repository";
import type { Relation } from "@/types/friends";
import { getFriendships, pairKeyOf } from "./repository";

export type FriendActionResult = { ok: true; relation: Relation } | { ok: false; error: string };

const GENERIC_ERROR = "No se ha podido completar la acción. Inténtalo de nuevo.";

function refresh() {
  revalidatePath("/", "layout");
}

function parseTarget(input: unknown, meId: string): { ok: true; userId: string } | { ok: false; error: string } {
  const parsed = targetUserSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos no válidos" };
  if (parsed.data.userId === meId) return { ok: false, error: "No puedes hacerlo contigo mismo" };
  return { ok: true, userId: parsed.data.userId };
}

/** Acepta la solicitud pendiente que `requesterId` envió a `addresseeId`. */
async function acceptPending(requesterId: ObjectId, addresseeId: ObjectId) {
  const result = await (await getFriendships()).updateOne(
    { requesterId, addresseeId, status: "pending" },
    { $set: { status: "accepted", respondedAt: new Date() } },
  );
  return result.matchedCount > 0;
}

export async function sendFriendRequestAction(input: unknown): Promise<FriendActionResult> {
  const me = await getCurrentUser();
  const target = parseTarget(input, me.id);
  if (!target.ok) return target;

  try {
    const meId = new ObjectId(me.id);
    const otherId = new ObjectId(target.userId);

    const exists = await (await getUsersCollection()).findOne({ _id: otherId }, { projection: { _id: 1 } });
    if (!exists) return { ok: false, error: "Esa persona no existe" };

    const friendships = await getFriendships();
    const pairKey = pairKeyOf(me.id, target.userId);
    const existing = await friendships.findOne({ pairKey });

    if (existing) {
      // La otra persona ya me la había enviado: se acepta directamente.
      if (existing.status === "pending" && existing.requesterId.equals(otherId)) {
        await acceptPending(otherId, meId);
        refresh();
        return { ok: true, relation: "friends" };
      }
      refresh();
      return { ok: true, relation: existing.status === "accepted" ? "friends" : "outgoing" };
    }

    try {
      await friendships.insertOne({
        _id: new ObjectId(),
        requesterId: meId,
        addresseeId: otherId,
        status: "pending",
        pairKey,
        createdAt: new Date(),
      });
    } catch (error) {
      // Carrera: las dos personas envían a la vez y el índice único de `pairKey` frena a una.
      if ((error as { code?: number }).code !== 11000) throw error;
      const raced = await friendships.findOne({ pairKey });
      if (raced?.status === "pending" && raced.requesterId.equals(otherId)) {
        await acceptPending(otherId, meId);
        refresh();
        return { ok: true, relation: "friends" };
      }
      refresh();
      return { ok: true, relation: raced?.status === "accepted" ? "friends" : "outgoing" };
    }
  } catch (error) {
    console.error("sendFriendRequestAction", error);
    return { ok: false, error: GENERIC_ERROR };
  }
  refresh();
  return { ok: true, relation: "outgoing" };
}

export async function acceptFriendRequestAction(input: unknown): Promise<FriendActionResult> {
  const me = await getCurrentUser();
  const target = parseTarget(input, me.id);
  if (!target.ok) return target;

  try {
    const accepted = await acceptPending(new ObjectId(target.userId), new ObjectId(me.id));
    if (!accepted) return { ok: false, error: "Esa solicitud ya no existe" };
  } catch (error) {
    console.error("acceptFriendRequestAction", error);
    return { ok: false, error: GENERIC_ERROR };
  }
  refresh();
  return { ok: true, relation: "friends" };
}

/** Rechazar una solicitud recibida (yo soy el destinatario). */
export async function declineFriendRequestAction(input: unknown): Promise<FriendActionResult> {
  const me = await getCurrentUser();
  const target = parseTarget(input, me.id);
  if (!target.ok) return target;

  try {
    await (await getFriendships()).deleteOne({
      requesterId: new ObjectId(target.userId),
      addresseeId: new ObjectId(me.id),
      status: "pending",
    });
  } catch (error) {
    console.error("declineFriendRequestAction", error);
    return { ok: false, error: GENERIC_ERROR };
  }
  refresh();
  return { ok: true, relation: "none" };
}

/** Cancelar una solicitud enviada (yo soy quien la envió). */
export async function cancelFriendRequestAction(input: unknown): Promise<FriendActionResult> {
  const me = await getCurrentUser();
  const target = parseTarget(input, me.id);
  if (!target.ok) return target;

  try {
    await (await getFriendships()).deleteOne({
      requesterId: new ObjectId(me.id),
      addresseeId: new ObjectId(target.userId),
      status: "pending",
    });
  } catch (error) {
    console.error("cancelFriendRequestAction", error);
    return { ok: false, error: GENERIC_ERROR };
  }
  refresh();
  return { ok: true, relation: "none" };
}

export async function removeFriendAction(input: unknown): Promise<FriendActionResult> {
  const me = await getCurrentUser();
  const target = parseTarget(input, me.id);
  if (!target.ok) return target;

  try {
    await (await getFriendships()).deleteOne({
      pairKey: pairKeyOf(me.id, target.userId),
      status: "accepted",
    });
  } catch (error) {
    console.error("removeFriendAction", error);
    return { ok: false, error: GENERIC_ERROR };
  }
  refresh();
  return { ok: true, relation: "none" };
}
