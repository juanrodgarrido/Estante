import Link from "next/link";
import { Suspense } from "react";
import { MessageCircle, SquarePen } from "lucide-react";
import { ScreenHeader } from "@/components/app-shell/screen-header";
import { EmptyState } from "@/components/empty-state";
import { RowsSkeleton } from "@/components/ui/skeletons";
import { getCurrentUser } from "@/server/auth";
import { listConversations } from "@/server/chat/repository";
import { ConversationList } from "./conversation-list";
import { LiveRefresh } from "./live-refresh";

/** Desde md la lista es un panel fijo entre la barra lateral y la conversación. */
export const CHAT_LIST_PANE =
  "md:fixed md:inset-y-0 md:left-[calc(var(--safe-left)+var(--rail-w))] md:z-30 md:w-chatlist md:overflow-y-auto md:overscroll-contain md:border-r md:border-border";

async function Conversations({ media }: { media?: string }) {
  const me = await getCurrentUser();
  const items = await listConversations(me.id);
  return (
    <>
      <LiveRefresh userId={me.id} media={media} />
      {items.length === 0 ? (
        <EmptyState
          icon={MessageCircle}
          title="Sin conversaciones todavía"
          description="Habla de libros con tus amistades: empieza una conversación con cualquiera de ellas."
          action={{ href: "/chat/nueva", label: "Nueva conversación" }}
        />
      ) : (
        <ConversationList items={items} me={me.id} />
      )}
    </>
  );
}

/** Cabecera + lista de conversaciones (pantalla `/chat` y panel izquierdo del chat en pantallas grandes). */
export function ChatListPane({ media }: { media?: string }) {
  return (
    <>
      <ScreenHeader
        title="Chat"
        action={
          <Link
            href="/chat/nueva"
            aria-label="Nueva conversación"
            className="-mr-2 flex size-11 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted active:scale-95"
          >
            <SquarePen className="size-[1.375rem]" aria-hidden />
          </Link>
        }
      />
      <Suspense fallback={<RowsSkeleton />}>
        <Conversations media={media} />
      </Suspense>
    </>
  );
}
