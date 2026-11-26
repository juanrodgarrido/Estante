import { z } from "zod";
import { MESSAGE_MAX_LENGTH } from "@/lib/chat-messages";

const objectId = z.string().regex(/^[a-f0-9]{24}$/, "Identificador no válido");

export const conversationIdSchema = z.object({ conversationId: objectId });

export const sendMessageSchema = z.object({
  conversationId: objectId,
  text: z
    .string()
    .trim()
    .min(1, "Escribe un mensaje")
    .max(MESSAGE_MAX_LENGTH, `El mensaje no puede pasar de ${MESSAGE_MAX_LENGTH} caracteres`),
  clientId: z.uuid("Identificador de envío no válido"),
});

/** Cursor de mensajes: `<milisegundos>_<id 24 hex>` (el mensaje más antiguo ya cargado). */
export const messagesCursorSchema = z
  .string()
  .regex(/^\d{10,15}_[a-f0-9]{24}$/, "Cursor no válido")
  .optional();

/** Petición de autorización de pusher-js (form-urlencoded). */
export const pusherAuthSchema = z.object({
  socket_id: z.string().regex(/^\d+\.\d+$/, "socket_id no válido"),
  channel_name: z.string().regex(/^private-(conversation|user)-[a-f0-9]{24}$/, "Canal no válido"),
});
