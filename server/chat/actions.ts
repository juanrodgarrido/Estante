"use server";

import { redirect } from "next/navigation";
import { ObjectId } from "mongodb";
import { allowRequest } from "@/lib/rate-limit";
import { conversationIdSchema, sendMessageSchema } from "@/lib/validation/chat";
import { targetUserSchema } from "@/lib/validation/friends";
import { getCurrentUser } from "@/server/auth";
import { areFriends } from "@/server/friends/repository";
import { conversationChannel, publish, userChannel } from "@/server/realtime/pusher";
import type { ChatMessage } from "@/types/chat";
import {
  findOrCreateConversation,
  getConversationAccess,
  getConversations,
  getMessages,
  toChatMessage,
  type MessageDoc,
} from "./repository";

export type SendMessageResult = { ok: true; message: ChatMessage } | { ok: false; error: string };
export type ChatActionResult = { ok: true } | { ok: false; error: string };

const NO_ACCESS = "No puedes escribir en esta conversación.";
const GENERIC_ERROR = "No se ha podido enviar. Inténtalo de nuevo.";

export async function sendMessageAction(input: unknown): Promise<SendMessageResult> {
  const me = await getCurrentUser();
  const parsed = sendMessageSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos no válidos" };
  const { conversationId, text, clientId } = parsed.data;
  if (!(await allowRequest(`message:${me.id}`, 30, 60))) {
    return { ok: false, error: "Estás enviando demasiados mensajes. Espera un momento." };
  }

  let message: ChatMessage;
  let otherId: string;
  try {
    const access = await getConversationAccess(me.id, conversationId);
    if (!access) return { ok: false, error: NO_ACCESS };
    otherId = access.otherId;

    const messages = await getMessages();
    const doc: MessageDoc = {
      _id: new ObjectId(),
      conversationId: new ObjectId(conversationId),
      senderId: new ObjectId(me.id),
      text,
      clientId,
      createdAt: new Date(),
    };
    try {
      await messages.insertOne(doc);
    } catch (error) {
      // Reintento de un envío que sí llegó: se devuelve el mensaje ya guardado.
      if ((error as { code?: number }).code !== 11000) throw error;
      const existing = await messages.findOne({ conversationId: doc.conversationId, clientId });
      if (!existing || !existing.senderId.equals(doc.senderId)) throw error;
      return { ok: true, message: toChatMessage(existing) };
    }

    await (await getConversations()).updateOne(
      { _id: doc.conversationId },
      {
        $set: {
          lastMessage: { text, senderId: doc.senderId, createdAt: doc.createdAt },
          updatedAt: doc.createdAt,
        },
        // Lo que escribo yo cuenta como leído por mí.
        $max: { [`lastReadAt.${me.id}`]: doc.createdAt },
      },
    );
    message = toChatMessage(doc);
  } catch (error) {
    console.error("sendMessageAction", error);
    return { ok: false, error: GENERIC_ERROR };
  }

  await publish([
    { channel: conversationChannel(conversationId), event: "message", data: message },
    { channel: userChannel(otherId), event: "unread-changed", data: { conversationId } },
    { channel: userChannel(me.id), event: "unread-changed", data: { conversationId } },
  ]);
  return { ok: true, message };
}

/** Marca como leída la conversación hasta ahora mismo. */
export async function markConversationReadAction(input: unknown): Promise<ChatActionResult> {
  const me = await getCurrentUser();
  const parsed = conversationIdSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Datos no válidos" };
  const { conversationId } = parsed.data;

  try {
    const access = await getConversationAccess(me.id, conversationId);
    if (!access) return { ok: false, error: NO_ACCESS };
    await (await getConversations()).updateOne(
      { _id: access.conversation._id },
      { $max: { [`lastReadAt.${me.id}`]: new Date() } },
    );
  } catch (error) {
    console.error("markConversationReadAction", error);
    return { ok: false, error: "No se ha podido marcar como leída." };
  }

  await publish([{ channel: userChannel(me.id), event: "unread-changed", data: { conversationId } }]);
  return { ok: true };
}

/** Abre (o crea) la conversación con un amigo y navega a ella. Se usa desde un `<form>`. */
export async function openConversationAction(formData: FormData): Promise<void> {
  const me = await getCurrentUser();
  const parsed = targetUserSchema.safeParse({ userId: formData.get("userId") });
  if (!parsed.success || parsed.data.userId === me.id) redirect("/chat");
  const { userId } = parsed.data;

  if (!(await areFriends(me.id, userId))) redirect("/chat");
  const conversationId = await findOrCreateConversation(me.id, userId);
  redirect(`/chat/${conversationId}`);
}
