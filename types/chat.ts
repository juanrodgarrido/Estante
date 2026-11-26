import type { UserSummary } from "./friends";

/** Mensaje tal como llega al cliente (fechas en ISO). */
export type ChatMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  createdAt: string;
  /** Id que generó el cliente al enviarlo: sirve para casar el envío optimista con la respuesta. */
  clientId: string;
};

export type MessagesPage = {
  /** De más antiguo a más reciente. */
  messages: ChatMessage[];
  /** Cursor para pedir los anteriores, o `null` si no hay más. */
  nextCursor: string | null;
};

export type ConversationListItem = {
  id: string;
  other: UserSummary;
  lastMessage: { text: string; senderId: string; createdAt: string };
  unread: boolean;
};

/** Datos de la conversación abierta que necesita la sala. */
export type ConversationView = {
  id: string;
  me: string;
  other: UserSummary;
  initial: MessagesPage;
};
