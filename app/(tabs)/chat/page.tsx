import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { MessageCircle, SquarePen } from "lucide-react";
import { ScreenHeader } from "@/components/app-shell/screen-header";
import { ConversationList } from "@/components/chat/conversation-list";
import { LiveRefresh } from "@/components/chat/live-refresh";
import { EmptyState } from "@/components/empty-state";
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

function ListSkeleton() {
  return (
    <ul aria-hidden className="space-y-3 px-gutter pt-2">
      {Array.from({ length: 4 }, (_, index) => (
        <li key={index} className="flex items-center gap-3 py-2">
          <span className="size-12 shrink-0 animate-pulse rounded-full bg-muted" />
          <span className="flex-1 space-y-2">
            <span className="block h-4 w-1/3 animate-pulse rounded bg-muted" />
            <span className="block h-3.5 w-2/3 animate-pulse rounded bg-muted" />
          </span>
        </li>
      ))}
    </ul>
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
      <Suspense fallback={<ListSkeleton />}>
        <Conversations />
      </Suspense>
    </>
  );
}
