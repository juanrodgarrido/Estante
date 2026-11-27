import type { Metadata } from "next";
import { MessageCircle } from "lucide-react";
import { CHAT_LIST_PANE, ChatListPane } from "@/components/chat/chat-list-pane";

export const metadata: Metadata = { title: "Chat" };

export default function ChatPage() {
  return (
    <>
      <div className={`flex flex-1 flex-col ${CHAT_LIST_PANE}`}>
        <ChatListPane />
      </div>
      {/* Pantallas grandes: la lista queda a la izquierda y aquí aún no hay conversación abierta. */}
      <div className="fixed inset-y-0 right-0 left-[var(--chat-left)] hidden flex-col items-center justify-center gap-3 px-gutter text-center text-muted-foreground md:flex">
        <MessageCircle className="size-10" aria-hidden />
        <p className="text-pretty">Elige una conversación para empezar a hablar.</p>
      </div>
    </>
  );
}
