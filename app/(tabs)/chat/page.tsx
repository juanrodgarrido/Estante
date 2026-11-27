import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { MessageCircle, SquarePen } from "lucide-react";
import { ScreenHeader } from "@/components/app-shell/screen-header";
import { ConversationList } from "@/components/chat/conversation-list";
import { LiveRefresh } from "@/components/chat/live-refresh";
import { EmptyState } from "@/components/empty-state";
import { RowsSkeleton } from "@/components/ui/skeletons";
import { getCurrentUser } from "@/server/auth";
import { listConversations } from "@/server/chat/repository";

export const metadata: Metadata = { title: "Chat" };

async function Conversations() {
  const me = await getCurrentUser();
  const items = await listConversations(me.id);
  return (
    <>
      <LiveRefresh userId={me.id} />
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

export default function ChatPage() {
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
        <Conversations />
      </Suspense>
    </>
  );
}
