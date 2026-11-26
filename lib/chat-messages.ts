import type { ChatMessage } from "@/types/chat";

export const MESSAGE_MAX_LENGTH = 2000;

/** Mensaje en pantalla: los que aún no ha confirmado el servidor llevan `status`. */
export type LocalMessage = ChatMessage & { status?: "sending" | "failed"; error?: string };

function byDate(a: ChatMessage, b: ChatMessage) {
  return a.createdAt === b.createdAt ? a.id.localeCompare(b.id) : a.createdAt.localeCompare(b.createdAt);
}

/**
 * Añade mensajes confirmados sin duplicar: casa por `id` y por `clientId` (así la
 * respuesta del envío y el evento de Pusher del mismo mensaje se quedan en uno).
 * Los confirmados van por fecha y los pendientes o fallidos, al final.
 */
export function mergeMessages(list: LocalMessage[], incoming: ChatMessage[]): LocalMessage[] {
  if (incoming.length === 0) return list;
  const ids = new Set(incoming.map((message) => message.id));
  const clientIds = new Set(incoming.map((message) => message.clientId));
  const rest = list.filter((message) => !ids.has(message.id) && !clientIds.has(message.clientId));
  const confirmed = [...rest.filter((message) => !message.status), ...incoming].sort(byDate);
  return [...confirmed, ...rest.filter((message) => message.status)];
}

/** uuid v4; `crypto.randomUUID` solo existe en contextos seguros. */
export function newClientId(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
